/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import React, { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import {
  AppView,
  GhostnoteSettings,
  OllamaVerificationResult,
  ServerProviderStatus,
  StoryEntry,
  StoryLength,
  StoryStyle,
} from './types/ghostnote';
import { STARTER_ARCHIVE_ENTRIES } from './data/starterArchive';
import { useLocalStorage } from './hooks/useLocalStorage';
import {
  fetchServerProviderStatus,
  verifyOllamaConnection,
} from './services/aiProvider';
import {
  auth,
  db,
  OperationType,
  handleFirestoreError,
  sanitizeValidId,
  syncUserAccountInFirestore,
  updateUserSettingsInFirestore,
  saveStoryEntryToFirestore,
  deleteStoryEntryFromFirestore,
  syncBatchEntriesToFirestore,
  firestoreDocToStoryEntry,
} from './lib/firebase';
import { Navbar } from './components/Navbar';
import { WorkspaceView } from './components/WorkspaceView';
import { ArchiveView } from './components/ArchiveView';
import { SettingsView } from './components/SettingsView';
import { CustomCursor } from './components/CustomCursor';
import { AmbientAtmosphere } from './components/AmbientAtmosphere';
import { AuthModal } from './components/AuthModal';

const LazyGhostRelicScene = lazy(() => import('./components/GhostRelicScene'));

const DEFAULT_SETTINGS: GhostnoteSettings = {
  providerMode: 'sample',
  ollamaEndpoint: 'http://127.0.0.1:11434',
  ollamaModel: 'llama3.2',
  reducedMotion: false,
  scanlinesEnabled: true,
  lowEffectsMode: false,
};

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('landing');
  const [localEntries, setLocalEntries] = useLocalStorage<StoryEntry[]>(
    'ghostnote_archive_v1',
    STARTER_ARCHIVE_ENTRIES
  );
  const [settings, setSettings] = useLocalStorage<GhostnoteSettings>(
    'ghostnote_settings_v1',
    DEFAULT_SETTINGS
  );

  // Firebase Auth & Per-User Cloud Database State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [cloudEntries, setCloudEntries] = useState<StoryEntry[] | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);

  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const localEntriesRef = useRef(localEntries);
  useEffect(() => {
    localEntriesRef.current = localEntries;
  }, [localEntries]);

  const [serverStatus, setServerStatus] = useState<ServerProviderStatus>({
    defaultOllamaEndpoint: 'http://127.0.0.1:11434',
    defaultOllamaModel: 'llama3.2',
    cloudGeminiConfigured: false,
    cloudModelName: 'gemini-3.8-flash',
  });

  const [ollamaVerification, setOllamaVerification] =
    useState<OllamaVerificationResult | null>(null);
  const [isVerifyingOllama, setIsVerifyingOllama] = useState(false);

  const [workspaceDraft, setWorkspaceDraft] = useState<{
    note: string;
    style: StoryStyle;
    length: StoryLength;
    title?: string;
    story?: string;
    providerMode?: 'ollama' | 'sample' | 'gemini';
    providerLabel?: string;
    isSample?: boolean;
  } | null>(null);

  const cloudVaultReadyRef = useRef(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setSettings((prev) => ({ ...prev, reducedMotion: true }));
    }
  }, [setSettings]);

  useEffect(() => {
    let mounted = true;
    fetchServerProviderStatus().then((status) => {
      if (!mounted) return;
      setServerStatus(status);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Track Firebase Authentication State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthReady(true);
      if (!user || !user.emailVerified) {
        cloudVaultReadyRef.current = false;
        setCloudEntries(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync User Profile + Attach Real-Time Per-User Entries Listener when authenticated & verified
  useEffect(() => {
    if (!authReady || !currentUser || !currentUser.emailVerified) {
      cloudVaultReadyRef.current = false;
      return;
    }

    let isCancelled = false;
    const uid = sanitizeValidId(currentUser.uid);
    const entriesPath = `users/${uid}/entries`;
    let unsubscribeSnapshot: (() => void) | null = null;
    let initialSeedAttempted = false;

    const initUserCloudVault = async () => {
      try {
        const remoteSettings = await syncUserAccountInFirestore(
          currentUser,
          settingsRef.current
        );
        if (!isCancelled && remoteSettings) {
          setSettings((prev) => ({ ...prev, ...remoteSettings }));
        }

        if (isCancelled) return;
        cloudVaultReadyRef.current = true;

        const entriesQuery = query(
          collection(db, 'users', uid, 'entries'),
          where('userId', '==', uid)
        );

        unsubscribeSnapshot = onSnapshot(
          entriesQuery,
          (snapshot) => {
            if (isCancelled) return;
            const docs: StoryEntry[] = snapshot.docs.map((docSnap) =>
              firestoreDocToStoryEntry(docSnap.data() as Record<string, unknown>)
            );

            // If user's cloud archive is brand new & empty, seed their current local entries once
            if (
              docs.length === 0 &&
              !initialSeedAttempted &&
              localEntriesRef.current.length > 0
            ) {
              initialSeedAttempted = true;
              syncBatchEntriesToFirestore(
                currentUser,
                localEntriesRef.current,
                settingsRef.current
              ).catch((err) => console.error('Initial cloud seed error:', err));
              return;
            }

            setCloudEntries(docs);
          },
          (error) => {
            if (isCancelled || !auth.currentUser) return;
            handleFirestoreError(error, OperationType.LIST, entriesPath);
          }
        );
      } catch (err) {
        if (!isCancelled) {
          console.error('Failed to initialize user cloud vault:', err);
        }
      }
    };

    initUserCloudVault();

    return () => {
      isCancelled = true;
      cloudVaultReadyRef.current = false;
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, [authReady, currentUser, setSettings]);

  // Debounced sync of user settings to Firestore
  useEffect(() => {
    if (!cloudVaultReadyRef.current || !auth.currentUser || !auth.currentUser.emailVerified) {
      return;
    }
    const timer = window.setTimeout(() => {
      if (auth.currentUser && auth.currentUser.emailVerified) {
        updateUserSettingsInFirestore(auth.currentUser, settings).catch((err) =>
          console.error('Settings cloud sync error:', err)
        );
      }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [settings]);

  const handleUserUpdated = useCallback(async () => {
    const refreshed = auth.currentUser;
    setCurrentUser(refreshed ? ({ ...refreshed } as User) : null);
    if (refreshed && refreshed.emailVerified) {
      await syncUserAccountInFirestore(refreshed, settingsRef.current);
    }
  }, []);

  const handleUpdateSettings = useCallback(
    (updater: GhostnoteSettings | ((prev: GhostnoteSettings) => GhostnoteSettings)) => {
      setSettings(updater);
    },
    [setSettings]
  );

  const handleVerifyOllama = useCallback(
    async (endpoint: string, model: string) => {
      setIsVerifyingOllama(true);
      try {
        const res = await verifyOllamaConnection(endpoint, model);
        setOllamaVerification(res);
      } finally {
        setIsVerifyingOllama(false);
      }
    },
    []
  );

  // Active entries: use per-user Firestore cloud entries when signed in & verified, otherwise localStorage
  const activeEntries =
    currentUser && currentUser.emailVerified && cloudEntries !== null
      ? cloudEntries
      : localEntries;

  const handleSaveEntry = useCallback(
    (newEntryData: Omit<StoryEntry, 'id' | 'createdAt'>) => {
      const created: StoryEntry = {
        ...newEntryData,
        id: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: new Date().toISOString(),
      };
      setLocalEntries((prev) => [created, ...prev]);

      if (auth.currentUser && auth.currentUser.emailVerified) {
        saveStoryEntryToFirestore(auth.currentUser, created).catch((err) =>
          console.error('Failed to save story entry to Firestore:', err)
        );
      }
    },
    [setLocalEntries]
  );

  const handleDeleteEntry = useCallback(
    (id: string) => {
      setLocalEntries((prev) => prev.filter((item) => item.id !== id));

      if (auth.currentUser && auth.currentUser.emailVerified) {
        deleteStoryEntryFromFirestore(auth.currentUser, id).catch((err) =>
          console.error('Failed to delete story entry from Firestore:', err)
        );
      }
    },
    [setLocalEntries]
  );

  const handleRestoreStarters = useCallback(() => {
    setLocalEntries((prev) => {
      const existingIds = new Set(prev.map((e) => e.id));
      const missingStarters = STARTER_ARCHIVE_ENTRIES.filter(
        (s) => !existingIds.has(s.id)
      );
      return [...missingStarters, ...prev];
    });

    if (auth.currentUser && auth.currentUser.emailVerified) {
      syncBatchEntriesToFirestore(
        auth.currentUser,
        STARTER_ARCHIVE_ENTRIES,
        settingsRef.current
      ).catch((err) => console.error('Failed to restore starter entries in cloud:', err));
    }
  }, [setLocalEntries]);

  const handleImportEntries = useCallback(
    (imported: StoryEntry[]) => {
      const sanitizedImported = imported.map((item, idx) => ({
        ...item,
        id: sanitizeValidId(item.id || `imported-${Date.now()}-${idx}`),
      }));

      setLocalEntries((prev) => {
        const existingIds = new Set(prev.map((e) => e.id));
        const deduplicated = sanitizedImported.filter((imp) => !existingIds.has(imp.id));
        return [...deduplicated, ...prev];
      });

      if (auth.currentUser && auth.currentUser.emailVerified) {
        syncBatchEntriesToFirestore(
          auth.currentUser,
          sanitizedImported,
          settingsRef.current
        ).catch((err) => console.error('Failed to import entries to cloud:', err));
      }
    },
    [setLocalEntries]
  );

  const handleSyncLocalToCloud = useCallback(async () => {
    if (!auth.currentUser || !auth.currentUser.emailVerified) return;
    setIsSyncingCloud(true);
    try {
      await syncBatchEntriesToFirestore(
        auth.currentUser,
        localEntriesRef.current,
        settingsRef.current
      );
    } finally {
      setIsSyncingCloud(false);
    }
  }, []);

  const handleClearAllArchive = useCallback(() => {
    const entriesToRemove = [...activeEntries];
    setLocalEntries([]);
    if (auth.currentUser && auth.currentUser.emailVerified) {
      const user = auth.currentUser;
      Promise.all(
        entriesToRemove.map((e) => deleteStoryEntryFromFirestore(user, e.id))
      ).catch((err) => console.error('Failed to clear cloud entries:', err));
    }
  }, [activeEntries, setLocalEntries]);

  const handleLoadIntoWorkspace = useCallback((entry: StoryEntry) => {
    setWorkspaceDraft({
      note: entry.originalNote,
      style: entry.style,
      length: entry.length,
      title: entry.title,
      story: entry.story,
      providerMode: entry.providerMode,
      providerLabel: entry.providerLabel,
      isSample: entry.isSample,
    });
    setActiveView('workspace');
  }, []);

  const handleClearInitialDraft = useCallback(() => {
    setWorkspaceDraft(null);
  }, []);

  const providerStatusLabel = (() => {
    if (settings.providerMode === 'ollama') {
      return ollamaVerification?.verified
        ? `Verified Local Ollama (${settings.ollamaModel})`
        : `Local Ollama (${settings.ollamaModel} · Unverified)`;
    }
    if (settings.providerMode === 'gemini') {
      return 'Cloud Inference (Google Gemini)';
    }
    return 'Sample Mode (Offline Demo)';
  })();

  const isLowEffects = Boolean(settings.lowEffectsMode);

  return (
    <div
      className={`min-h-screen flex flex-col bg-[#0D0E11] text-[#E5E7EB] ghost-grain ${
        settings.scanlinesEnabled && !isLowEffects ? 'ghost-scanlines' : ''
      }`}
    >
      {/* Desktop-only subtle spectral cursor follower */}
      <CustomCursor disabled={settings.reducedMotion || isLowEffects} />

      {/* Reference-themed background (Ronin backdrop, diagonal ash-silver slash, and ravens) */}
      {activeView !== 'landing' && (
        <AmbientAtmosphere
          reducedMotion={settings.reducedMotion}
          lowEffectsMode={isLowEffects}
        />
      )}

      <Navbar
        activeView={activeView}
        onNavigate={setActiveView}
        archiveCount={activeEntries.length}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        cloudEntryCount={cloudEntries?.length ?? 0}
        isSyncingCloud={isSyncingCloud}
        onSyncLocalToCloud={handleSyncLocalToCloud}
        onUserUpdated={handleUserUpdated}
      />

      <div className="flex-1 relative z-10">
        {activeView === 'landing' && (
          <Suspense
            fallback={
              <div className="w-full min-h-[calc(100vh-65px)] flex flex-col items-center justify-center bg-[#0D0E11] space-y-4">
                <div className="w-12 h-12 rounded-full border-2 border-[#DC2626]/30 border-t-[#EF4444] animate-spin" />
                <p className="text-xs font-mono-tabular uppercase tracking-widest text-[#9CA3AF]">
                  Initializing GHOSTNOTE Sanctuary...
                </p>
              </div>
            }
          >
            <LazyGhostRelicScene
              reducedMotion={settings.reducedMotion}
              lowEffectsMode={isLowEffects}
              onToggleReducedMotion={() =>
                handleUpdateSettings((prev) => ({
                  ...prev,
                  reducedMotion: !prev.reducedMotion,
                }))
              }
              onToggleLowEffects={() =>
                handleUpdateSettings((prev) => ({
                  ...prev,
                  lowEffectsMode: !prev.lowEffectsMode,
                }))
              }
              onEnterArchive={() => setActiveView('archive')}
              onOpenWorkspace={() => setActiveView('workspace')}
              onOpenSettings={() => setActiveView('settings')}
              archiveCount={activeEntries.length}
              providerStatusLabel={providerStatusLabel}
            />
          </Suspense>
        )}

        {activeView === 'workspace' && (
          <WorkspaceView
            settings={settings}
            ollamaVerified={Boolean(ollamaVerification?.verified)}
            initialDraft={workspaceDraft}
            onClearInitialDraft={handleClearInitialDraft}
            onSaveEntry={handleSaveEntry}
            onOpenSettings={() => setActiveView('settings')}
            onOpenArchive={() => setActiveView('archive')}
          />
        )}

        {activeView === 'archive' && (
          <ArchiveView
            entries={activeEntries}
            onDeleteEntry={handleDeleteEntry}
            onRestoreStarters={handleRestoreStarters}
            onImportEntries={handleImportEntries}
            onLoadIntoWorkspace={handleLoadIntoWorkspace}
            onNavigateWorkspace={() => setActiveView('workspace')}
          />
        )}

        {activeView === 'settings' && (
          <SettingsView
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            ollamaVerification={ollamaVerification}
            isVerifyingOllama={isVerifyingOllama}
            onVerifyOllama={handleVerifyOllama}
            serverStatus={serverStatus}
            archiveCount={activeEntries.length}
            onClearAllArchive={handleClearAllArchive}
            onRestoreStarterArchive={handleRestoreStarters}
            currentUser={currentUser}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            isSyncingCloud={isSyncingCloud}
            onSyncLocalToCloud={handleSyncLocalToCloud}
          />
        )}
      </div>

      {/* Quiet Editorial Footer on interior pages */}
      {activeView !== 'landing' && (
        <footer className="relative z-10 border-t border-white/10 bg-[#090A0D]/90 py-6 px-6 text-xs text-[#9CA3AF]">
          <div className="max-w-[1360px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-monolith text-sm text-white tracking-widest">
                GHOSTNOTE
              </span>
              <span aria-hidden="true">·</span>
              <span>Some memories refuse to stay buried.</span>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="hover:text-white transition-colors"
              >
                {currentUser
                  ? `Cloud Vault: ${currentUser.email}`
                  : 'Sign In / Cloud Vault'}
              </button>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => setActiveView('settings')}
                className="hover:text-white transition-colors"
              >
                Privacy & Deployment Notice
              </button>
              <span aria-hidden="true">·</span>
              <span>MIT License</span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
