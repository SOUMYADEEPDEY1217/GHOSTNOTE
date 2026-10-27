import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
  Terminal,
  Cpu,
  Cloud,
  BookOpen,
  Trash2,
  Database,
  UserCheck,
  CloudUpload,
  Rocket,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  AIProviderMode,
  GhostnoteSettings,
  OllamaVerificationResult,
  ServerProviderStatus,
} from '../types/ghostnote';
import { FIREBASE_PROJECT_ID, FIRESTORE_DATABASE_ID } from '../lib/firebase';

interface SettingsViewProps {
  settings: GhostnoteSettings;
  onUpdateSettings: (updater: (prev: GhostnoteSettings) => GhostnoteSettings) => void;
  ollamaVerification: OllamaVerificationResult | null;
  isVerifyingOllama: boolean;
  onVerifyOllama: (endpoint: string, model: string) => Promise<void>;
  serverStatus: ServerProviderStatus;
  archiveCount: number;
  onClearAllArchive: () => void;
  onRestoreStarterArchive: () => void;
  currentUser: User | null;
  onOpenAuthModal: () => void;
  isSyncingCloud: boolean;
  onSyncLocalToCloud: () => Promise<void>;
}

const RECOMMENDED_OLLAMA_MODELS = ['llama3.2', 'mistral', 'gemma2', 'qwen2.5'];

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  ollamaVerification,
  isVerifyingOllama,
  onVerifyOllama,
  serverStatus,
  archiveCount,
  onClearAllArchive,
  onRestoreStarterArchive,
  currentUser,
  onOpenAuthModal,
  isSyncingCloud,
  onSyncLocalToCloud,
}) => {
  const [confirmClear, setConfirmClear] = useState(false);

  const handleModeSelect = (mode: AIProviderMode) => {
    onUpdateSettings((prev) => ({
      ...prev,
      providerMode: mode,
    }));
  };

  return (
    <main className="relative z-10 max-w-[1120px] mx-auto px-6 py-10 space-y-10 animate-view-enter">
      {/* Header */}
      <div className="pb-6 border-b border-white/15">
        <p className="text-xs uppercase tracking-widest text-[#F87171] font-mono-tabular mb-2">
          03. System Configuration, Cloud Vault & Deployment
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold text-white font-serif-editorial">
          GHOSTNOTE Provider, Firebase Vault & Privacy Settings
        </h1>
        <p className="text-sm text-[#D1D5DB] mt-2 max-w-[68ch]">
          Manage your Firebase user identity, per-user Firestore cloud database, AI inference
          provider, and Vercel production deployment settings.
        </p>
      </div>

      {/* Section 0: Firebase User Authentication & Per-User Cloud Database */}
      <section
        aria-label="Firebase User Vault and Cloud Persistence"
        className="archive-console-panel border border-white/20 rounded-2xl p-6 sm:p-8 space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/15 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-[#F87171]" />
              <h2 className="text-xl font-semibold text-white font-serif-editorial">
                Firebase Authentication & Per-User Cloud Database
              </h2>
            </div>
            <p className="text-xs text-[#9CA3AF]">
              Sign in with your account to automatically synchronize your personal profile,
              preferences, and supernatural stories across devices.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {currentUser && currentUser.emailVerified && (
              <button
                type="button"
                onClick={onSyncLocalToCloud}
                disabled={isSyncingCloud}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#27171A] hover:bg-[#3B1C21] border border-[#DC2626]/50 rounded-md transition-colors cursor-pointer"
              >
                <CloudUpload
                  className={`w-3.5 h-3.5 text-[#F87171] ${
                    isSyncingCloud ? 'animate-bounce' : ''
                  }`}
                />
                <span>
                  {isSyncingCloud ? 'Syncing Vault...' : 'Sync Entries to Cloud'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenAuthModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white bg-[#991B1B] hover:bg-[#B91C1C] border border-[#F87171]/40 rounded-md transition-colors cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>
                {currentUser ? 'Manage Account & Vault' : 'Sign In / Sign Up'}
              </span>
            </button>
          </div>
        </div>

        <div className="bg-[#0B0C0F] border border-white/15 rounded-xl p-4 space-y-1.5 text-xs">
          <span className="text-[10px] uppercase tracking-wider text-[#9CA3AF] font-mono-tabular block">
            Current Archivist Status
          </span>
          {currentUser ? (
            <>
              <p className="text-sm font-semibold text-white truncate">
                {currentUser.displayName || 'Archivist'} ({currentUser.email})
              </p>
              <p
                className={`font-mono-tabular ${
                  currentUser.emailVerified ? 'text-[#34D399]' : 'text-[#FBBF24]'
                }`}
              >
                {currentUser.emailVerified
                  ? 'Verified · Real-Time Cloud Sync Active'
                  : 'Unverified Email · Verify in Account Modal'}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-white">Guest Session (Local Storage)</p>
              <p className="text-[#9CA3AF]">
                Sign in with Google or Email/Password to persist your profile and stories in your
                personal cloud vault.
              </p>
            </>
          )}
        </div>
      </section>

      {/* Section 1: Provider Selection Cards */}
      <section aria-label="Select AI Provider" className="space-y-4">
        <h2 className="text-xl font-semibold text-white font-serif-editorial">
          1. Select Story Generation Engine
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Option A: Local Ollama */}
          <button
            type="button"
            onClick={() => handleModeSelect('ollama')}
            className={`text-left p-5 rounded-2xl border transition-all flex flex-col justify-between ${
              settings.providerMode === 'ollama'
                ? 'bg-[#26171A] border-[#DC2626] shadow-[0_0_28px_rgba(220,38,38,0.18)]'
                : 'archive-console-panel border-white/15 hover:border-white/35'
            }`}
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Cpu className="w-5 h-5 text-[#F87171]" />
                <span className="text-xs font-mono-tabular text-[#FCA5A5]">
                  {ollamaVerification?.verified ? 'Verified Local' : 'Unverified'}
                </span>
              </div>
              <h3 className="text-base font-semibold text-white">
                Local Ollama (Open-Weight)
              </h3>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Runs open-weight models (Llama 3.2, Mistral, Gemma 2) on your local hardware via
                safe server-side loopback. Zero cloud data transmission.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/10 text-xs font-mono-tabular text-[#D1D5DB]">
              Model: {settings.ollamaModel}
            </div>
          </button>

          {/* Option B: Offline Sample Mode */}
          <button
            type="button"
            onClick={() => handleModeSelect('sample')}
            className={`text-left p-5 rounded-2xl border transition-all flex flex-col justify-between ${
              settings.providerMode === 'sample'
                ? 'bg-[#26171A] border-[#DC2626] shadow-[0_0_28px_rgba(220,38,38,0.18)]'
                : 'archive-console-panel border-white/15 hover:border-white/35'
            }`}
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <BookOpen className="w-5 h-5 text-[#F87171]" />
                <span className="text-xs font-mono-tabular text-[#FCA5A5]">
                  Always Ready
                </span>
              </div>
              <h3 className="text-base font-semibold text-white">
                Sample Mode (Offline Demo)
              </h3>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Synthesizes atmospheric sample stories offline by weaving your note into curated
                supernatural templates. Clearly labeled as sample output.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/10 text-xs font-mono-tabular text-[#D1D5DB]">
              100% On-Device Synthesis
            </div>
          </button>

          {/* Option C: Optional Cloud Provider */}
          <button
            type="button"
            onClick={() => handleModeSelect('gemini')}
            className={`text-left p-5 rounded-2xl border transition-all flex flex-col justify-between ${
              settings.providerMode === 'gemini'
                ? 'bg-[#26171A] border-[#DC2626] shadow-[0_0_28px_rgba(220,38,38,0.18)]'
                : 'archive-console-panel border-white/15 hover:border-white/35'
            }`}
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Cloud className="w-5 h-5 text-[#D1D5DB]" />
                <span className="text-xs font-mono-tabular text-[#D1D5DB]">
                  {serverStatus.cloudGeminiConfigured ? 'Cloud Ready' : 'Not Configured'}
                </span>
              </div>
              <h3 className="text-base font-semibold text-white">
                Cloud Inference (Google Gemini)
              </h3>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Optional server-side cloud generation using {serverStatus.cloudModelName}.
                Labeled honestly as cloud inference; sends prompt text to Google Gemini.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/10 text-xs font-mono-tabular text-[#D1D5DB]">
              Model: {serverStatus.cloudModelName}
            </div>
          </button>
        </div>
      </section>

      {/* Section 2: Local Ollama Configuration & Verification */}
      <section
        aria-label="Ollama Local Configuration"
        className="archive-console-panel border border-white/20 rounded-2xl p-6 sm:p-8 space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/15 pb-5">
          <div>
            <h2 className="text-xl font-semibold text-white font-serif-editorial">
              2. Open-Weight Local Inference (Ollama)
            </h2>
            <p className="text-xs text-[#9CA3AF] mt-1">
              For security, endpoints are validated on the server and restricted to loopback
              addresses (`127.0.0.1`, `localhost`) or the server’s `OLLAMA_HOST`.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onVerifyOllama(settings.ollamaEndpoint, settings.ollamaModel)}
            disabled={isVerifyingOllama}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white bg-[#991B1B] hover:bg-[#B91C1C] border border-[#F87171]/40 disabled:opacity-50 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingOllama ? 'animate-spin' : ''}`} />
            <span>
              {isVerifyingOllama
                ? 'Testing Daemon & Inference...'
                : 'Verify Connection & Inference'}
            </span>
          </button>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="ollama-endpoint-input"
              className="block text-xs font-medium text-[#E5E7EB] mb-2"
            >
              Local Ollama Endpoint (Loopback Only)
            </label>
            <input
              id="ollama-endpoint-input"
              type="text"
              value={settings.ollamaEndpoint}
              onChange={(e) =>
                onUpdateSettings((prev) => ({
                  ...prev,
                  ollamaEndpoint: e.target.value,
                }))
              }
              placeholder="http://127.0.0.1:11434"
              className="w-full px-3.5 py-2.5 text-sm font-mono-tabular bg-[#0B0C0F] border border-white/20 focus:border-[#EF4444] rounded-lg text-white focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="ollama-model-input"
              className="block text-xs font-medium text-[#E5E7EB] mb-2"
            >
              Ollama Model Name
            </label>
            <input
              id="ollama-model-input"
              type="text"
              value={settings.ollamaModel}
              onChange={(e) =>
                onUpdateSettings((prev) => ({
                  ...prev,
                  ollamaModel: e.target.value,
                }))
              }
              placeholder="llama3.2"
              className="w-full px-3.5 py-2.5 text-sm font-mono-tabular bg-[#0B0C0F] border border-white/20 focus:border-[#EF4444] rounded-lg text-white focus:outline-none"
            />
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-[11px] text-[#9CA3AF]">Presets:</span>
              {RECOMMENDED_OLLAMA_MODELS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() =>
                    onUpdateSettings((prev) => ({ ...prev, ollamaModel: preset }))
                  }
                  className="text-[11px] font-mono-tabular px-2 py-0.5 rounded bg-[#0B0C0F] hover:bg-[#27171A] text-[#D1D5DB] hover:text-[#FCA5A5] border border-white/15"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live Verification Status Box */}
        {ollamaVerification && (
          <div
            role="status"
            className={`p-4 rounded-lg border text-xs space-y-2 ${
              ollamaVerification.verified
                ? 'bg-[#13221C] border-[#10B981]/50 text-[#E5E7EB]'
                : 'bg-[#221215] border-[#991B1B] text-[#FCA5A5]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold">
                {ollamaVerification.verified ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-[#34D399]" />
                    <span className="text-[#6EE7B7]">
                      Local Ollama Connection & Token Inference Verified
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-[#F87171]" />
                    <span>Local Ollama Not Connected / Unverified</span>
                  </>
                )}
              </div>
              {ollamaVerification.latencyMs !== undefined && (
                <span className="font-mono-tabular text-white">
                  {ollamaVerification.latencyMs} ms
                </span>
              )}
            </div>

            {ollamaVerification.error && <p>{ollamaVerification.error}</p>}

            <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono-tabular opacity-85">
              <span>Daemon Reachable: {ollamaVerification.connectionOk ? 'Yes' : 'No'}</span>
              <span>·</span>
              <span>Model Inference: {ollamaVerification.inferenceOk ? 'Passed' : 'Failed'}</span>
              {ollamaVerification.availableModels.length > 0 && (
                <>
                  <span>·</span>
                  <span>
                    Installed Models: {ollamaVerification.availableModels.join(', ')}
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Step-by-Step Ollama Installation & Setup Guide */}
        <div className="bg-[#0B0C0F] border border-white/15 rounded-lg p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <Terminal className="w-4 h-4 text-[#F87171]" />
            <span>How to Install & Connect Ollama Locally</span>
          </div>
          <ol className="text-xs text-[#D1D5DB] space-y-2 list-decimal list-inside leading-relaxed">
            <li>
              Install Ollama on your machine from{' '}
              <span className="font-mono-tabular text-white">https://ollama.com</span> or via
              Linux CLI:{' '}
              <code className="px-1.5 py-0.5 bg-[#181B22] text-[#FCA5A5] rounded">
                curl -fsSL https://ollama.com/install.sh | sh
              </code>
            </li>
            <li>
              Download an open-weight model in your terminal:{' '}
              <code className="px-1.5 py-0.5 bg-[#181B22] text-[#FCA5A5] rounded">
                ollama pull llama3.2
              </code>
            </li>
            <li>
              Start the local Ollama server:{' '}
              <code className="px-1.5 py-0.5 bg-[#181B22] text-[#FCA5A5] rounded">
                ollama serve
              </code>{' '}
              (listens on <code className="text-white">http://127.0.0.1:11434</code>).
            </li>
            <li>
              Run GHOSTNOTE locally (<code className="text-white">npm run dev</code>) and click{' '}
              <strong>Verify Connection & Inference</strong> above.
            </li>
          </ol>
        </div>
      </section>

      {/* Section 3: Accessibility & Atmospheric Performance Controls */}
      <section
        aria-label="Accessibility and Visual Preferences"
        className="archive-console-panel border border-white/20 rounded-2xl p-6 sm:p-8 space-y-4"
      >
        <h2 className="text-xl font-semibold text-white font-serif-editorial">
          3. Accessibility, Motion & Performance Controls
        </h2>

        <div className="divide-y divide-white/10">
          <div className="py-3.5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-white">Reduced Motion Mode</p>
              <p className="text-xs text-[#9CA3AF]">
                Pauses 3D artifact rotation, floating archive tablets, camera parallax, and portal
                dives.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.reducedMotion}
              onClick={() =>
                onUpdateSettings((prev) => ({
                  ...prev,
                  reducedMotion: !prev.reducedMotion,
                }))
              }
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                settings.reducedMotion
                  ? 'bg-[#991B1B] text-white border-[#F87171]'
                  : 'bg-[#0B0C0F] text-[#D1D5DB] border-white/20'
              }`}
            >
              {settings.reducedMotion ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          <div className="py-3.5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-white">Low-Effects Mode</p>
              <p className="text-xs text-[#9CA3AF]">
                Disables 3D drifting dust particles, custom desktop cursor, and ambient background
                ravens/glyphs for low-power hardware.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={Boolean(settings.lowEffectsMode)}
              onClick={() =>
                onUpdateSettings((prev) => ({
                  ...prev,
                  lowEffectsMode: !prev.lowEffectsMode,
                }))
              }
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                settings.lowEffectsMode
                  ? 'bg-[#991B1B] text-white border-[#F87171]'
                  : 'bg-[#0B0C0F] text-[#D1D5DB] border-white/20'
              }`}
            >
              {settings.lowEffectsMode ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          <div className="py-3.5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-white">Subtle Archival Scanlines</p>
              <p className="text-xs text-[#9CA3AF]">
                Toggles the faint horizontal CRT scanline texture across the interface.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.scanlinesEnabled}
              onClick={() =>
                onUpdateSettings((prev) => ({
                  ...prev,
                  scanlinesEnabled: !prev.scanlinesEnabled,
                }))
              }
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                settings.scanlinesEnabled
                  ? 'bg-[#991B1B] text-white border-[#F87171]'
                  : 'bg-[#0B0C0F] text-[#D1D5DB] border-white/20'
              }`}
            >
              {settings.scanlinesEnabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        </div>
      </section>

      {/* Section 4: Privacy Architecture & Storage Controls */}
      <section
        aria-label="Privacy and Local Storage Controls"
        className="archive-console-panel border border-white/20 rounded-2xl p-6 sm:p-8 space-y-5"
      >
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-[#F87171] shrink-0 mt-1" />
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-white font-serif-editorial">
              4. Privacy, Cloud Vault & Browser Storage Disclosure
            </h2>
            <p className="text-xs text-[#D1D5DB] leading-relaxed">
              When signed out, stories and settings are stored in your browser’s{' '}
              <code className="text-white">localStorage</code>. When signed in with a verified
              Firebase account, your user profile and stories are persisted in your isolated
              Firestore path (<code className="text-white">/users/&#123;uid&#125;</code>) protected
              by Zero-Trust Security Rules.
            </p>
            <ul className="text-xs text-[#9CA3AF] space-y-1.5 list-disc list-inside">
              <li>
                <strong>Local Browser Storage:</strong> Unencrypted at rest and may be cleared by
                browser cache eviction.
              </li>
              <li>
                <strong>Per-User Cloud Isolation:</strong> In Firestore, your email PII is isolated
                in <code className="text-white">/users/&#123;uid&#125;/private/info</code> and your
                stories in <code className="text-white">/users/&#123;uid&#125;/entries</code>,
                accessible strictly to your verified UID.
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-[#9CA3AF] font-mono-tabular">
            Currently displaying {archiveCount} entries in your active archive.
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onRestoreStarterArchive}
              className="px-3.5 py-2 text-xs font-medium text-white bg-[#0B0C0F] hover:bg-[#1A1D24] border border-white/20 rounded-md transition-colors"
            >
              Restore Starter Entries
            </button>

            {!confirmClear ? (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                disabled={archiveCount === 0}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#FCA5A5] bg-[#221215] hover:bg-[#33161B] border border-[#991B1B] disabled:opacity-40 rounded-md transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Local Archive</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClearAllArchive();
                    setConfirmClear(false);
                  }}
                  className="px-3 py-2 text-xs font-semibold text-white bg-[#DC2626] hover:bg-[#EF4444] rounded-md"
                >
                  Confirm Permanent Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="px-3 py-2 text-xs text-[#9CA3AF] hover:text-white"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Section 5: Vercel Deployment & Production Checklist */}
      <section
        aria-label="Vercel Deployment Checklist"
        className="archive-console-panel border border-white/20 rounded-2xl p-6 sm:p-8 space-y-4"
      >
        <div className="flex items-center gap-2.5">
          <Rocket className="w-5 h-5 text-[#F87171]" />
          <h2 className="text-xl font-semibold text-white font-serif-editorial">
            5. Ready for Vercel Deployment & Publishing
          </h2>
        </div>
        <p className="text-xs text-[#D1D5DB] leading-relaxed">
          This repository includes <code className="text-white">vercel.json</code> and serverless
          API routes (<code className="text-white">/api/index.ts</code>) so both the Vite React
          SPA and backend endpoints (<code className="text-white">/api/providers/status</code>,{' '}
          <code className="text-white">/api/providers/verify-ollama</code>,{' '}
          <code className="text-white">/api/generate</code>) deploy directly to Vercel.
        </p>
        <ol className="text-xs text-[#9CA3AF] space-y-2 list-decimal list-inside leading-relaxed">
          <li>
            Push this project to GitHub and import it into{' '}
            <span className="text-white font-mono-tabular">https://vercel.com/new</span> (or run{' '}
            <code className="px-1.5 py-0.5 bg-[#0B0C0F] text-[#FCA5A5] rounded">npx vercel --prod</code>
            ).
          </li>
          <li>
            (Optional) Add <code className="text-white">GEMINI_API_KEY</code> in Vercel Project
            Settings → Environment Variables if you want Cloud Gemini inference enabled in
            production.
          </li>
          <li>
            In Firebase Console (<code className="text-white">{FIREBASE_PROJECT_ID}</code>) →{' '}
            <strong>Authentication → Settings → Authorized domains</strong>, add your{' '}
            <code className="text-white">*.vercel.app</code> domain so Google Sign-In popups work
            on your live Vercel URL.
          </li>
        </ol>
      </section>
    </main>
  );
};
