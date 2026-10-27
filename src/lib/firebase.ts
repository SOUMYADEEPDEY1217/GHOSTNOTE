import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import rawAppletConfig from '../../firebase-applet-config.json';
import {
  AIProviderMode,
  GhostnoteSettings,
  StoryEntry,
  StoryLength,
  StoryStyle,
} from '../types/ghostnote';

/**
 * Supports both AI Studio's provisioned firebase-applet-config.json and
 * optional VITE_FIREBASE_* environment variables when deployed to Vercel.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || rawAppletConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || rawAppletConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || rawAppletConfig.projectId,
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || rawAppletConfig.storageBucket,
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || rawAppletConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || rawAppletConfig.appId,
  firestoreDatabaseId:
    import.meta.env.VITE_FIREBASE_DATABASE_ID || rawAppletConfig.firestoreDatabaseId,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;
export const FIRESTORE_DATABASE_ID = firebaseConfig.firestoreDatabaseId;

/**
 * Validate Connection to Firestore on boot
 */
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Defensive Sanitization Helpers matching firebase-blueprint.json & firestore.rules
 */
const ID_REGEX = /^[a-zA-Z0-9_\-]+$/;

export function sanitizeValidId(rawId: string): string {
  const cleaned = rawId.replace(/[^a-zA-Z0-9_\-]/g, '-').slice(0, 128);
  if (!cleaned || !ID_REGEX.test(cleaned)) {
    return `id-${Date.now()}`;
  }
  return cleaned;
}

function getAuthProviderId(user: User): 'google.com' | 'password' {
  const primary = user.providerData?.[0]?.providerId;
  if (primary === 'google.com') return 'google.com';
  return 'password';
}

function sanitizeDisplayName(user: User): string {
  const fallback = user.email ? user.email.split('@')[0] : 'Archivist';
  const raw = (user.displayName || fallback || 'Archivist').trim();
  return raw.slice(0, 100) || 'Archivist';
}

function sanitizePhotoURL(user: User): string {
  const raw = (user.photoURL || '').trim();
  return raw.slice(0, 500);
}

function sanitizeProviderMode(mode?: string): AIProviderMode {
  if (mode === 'ollama' || mode === 'gemini' || mode === 'sample') {
    return mode;
  }
  return 'sample';
}

function sanitizeStyle(style?: string): StoryStyle {
  if (
    style === 'Psychological Horror' ||
    style === 'Haunted Terminal' ||
    style === 'Urban Legend' ||
    style === 'Bittersweet Remembrance'
  ) {
    return style;
  }
  return 'Psychological Horror';
}

function sanitizeLength(length?: string): StoryLength {
  if (length === 'Short' || length === 'Medium' || length === 'Long') {
    return length;
  }
  return 'Medium';
}

/**
 * Ensures the authenticated & verified user's profile (/users/{uid})
 * and isolated PII record (/users/{uid}/private/info) exist and are up to date.
 * Returns any saved user preferences from Firestore if the profile already existed.
 */
export async function syncUserAccountInFirestore(
  user: User,
  currentSettings: GhostnoteSettings
): Promise<Partial<GhostnoteSettings> | null> {
  if (!user.emailVerified) {
    return null;
  }

  const uid = sanitizeValidId(user.uid);
  const userDocPath = `users/${uid}`;
  const privateDocPath = `users/${uid}/private/info`;
  const userRef = doc(db, 'users', uid);
  const privateRef = doc(db, 'users', uid, 'private', 'info');

  let existingSnap;
  try {
    existingSnap = await getDoc(userRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userDocPath);
  }

  let privateExists = false;
  if (existingSnap.exists()) {
    try {
      const privateSnap = await getDoc(privateRef);
      privateExists = privateSnap.exists();
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, privateDocPath);
    }
  }

  const batch = writeBatch(db);
  const now = serverTimestamp();

  const displayName = sanitizeDisplayName(user);
  const photoURL = sanitizePhotoURL(user);
  const authProvider = getAuthProviderId(user);
  const providerMode = sanitizeProviderMode(currentSettings.providerMode);
  const ollamaEndpoint = (
    currentSettings.ollamaEndpoint?.trim() || 'http://127.0.0.1:11434'
  ).slice(0, 200);
  const ollamaModel = (currentSettings.ollamaModel?.trim() || 'llama3.2').slice(0, 100);
  const reducedMotion = Boolean(currentSettings.reducedMotion);
  const scanlinesEnabled = Boolean(currentSettings.scanlinesEnabled);
  const lowEffectsMode = Boolean(currentSettings.lowEffectsMode);

  let loadedSettings: Partial<GhostnoteSettings> | null = null;

  if (!existingSnap.exists()) {
    batch.set(userRef, {
      uid,
      displayName,
      photoURL,
      authProvider,
      providerMode,
      ollamaEndpoint,
      ollamaModel,
      reducedMotion,
      scanlinesEnabled,
      lowEffectsMode,
      createdAt: now,
      updatedAt: now,
    });
  } else {
    const existingData = existingSnap.data();
    loadedSettings = {
      providerMode: sanitizeProviderMode(existingData.providerMode),
      ollamaEndpoint:
        typeof existingData.ollamaEndpoint === 'string' &&
        existingData.ollamaEndpoint.trim().length > 0
          ? existingData.ollamaEndpoint.trim()
          : ollamaEndpoint,
      ollamaModel:
        typeof existingData.ollamaModel === 'string' &&
        existingData.ollamaModel.trim().length > 0
          ? existingData.ollamaModel.trim()
          : ollamaModel,
      reducedMotion:
        typeof existingData.reducedMotion === 'boolean'
          ? existingData.reducedMotion
          : reducedMotion,
      scanlinesEnabled:
        typeof existingData.scanlinesEnabled === 'boolean'
          ? existingData.scanlinesEnabled
          : scanlinesEnabled,
      lowEffectsMode:
        typeof existingData.lowEffectsMode === 'boolean'
          ? existingData.lowEffectsMode
          : lowEffectsMode,
    };

    batch.update(userRef, {
      displayName,
      photoURL,
      authProvider,
      updatedAt: now,
    });
  }

  if (user.email && user.email.length >= 3 && user.email.length <= 254) {
    if (!privateExists) {
      batch.set(privateRef, {
        uid,
        email: user.email,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      batch.update(privateRef, {
        email: user.email,
        updatedAt: now,
      });
    }
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userDocPath);
  }

  return loadedSettings;
}

/**
 * Persists user preference changes to /users/{uid}
 */
export async function updateUserSettingsInFirestore(
  user: User,
  settings: GhostnoteSettings
): Promise<void> {
  if (!user.emailVerified) return;

  const uid = sanitizeValidId(user.uid);
  const userDocPath = `users/${uid}`;
  const userRef = doc(db, 'users', uid);

  let existingSnap;
  try {
    existingSnap = await getDoc(userRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userDocPath);
  }

  const batch = writeBatch(db);
  const now = serverTimestamp();

  const payload = {
    displayName: sanitizeDisplayName(user),
    photoURL: sanitizePhotoURL(user),
    authProvider: getAuthProviderId(user),
    providerMode: sanitizeProviderMode(settings.providerMode),
    ollamaEndpoint: (settings.ollamaEndpoint?.trim() || 'http://127.0.0.1:11434').slice(
      0,
      200
    ),
    ollamaModel: (settings.ollamaModel?.trim() || 'llama3.2').slice(0, 100),
    reducedMotion: Boolean(settings.reducedMotion),
    scanlinesEnabled: Boolean(settings.scanlinesEnabled),
    lowEffectsMode: Boolean(settings.lowEffectsMode),
    updatedAt: now,
  };

  if (!existingSnap.exists()) {
    batch.set(userRef, {
      uid,
      ...payload,
      createdAt: now,
    });
  } else {
    batch.update(userRef, payload);
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userDocPath);
  }
}

/**
 * Saves a single StoryEntry to /users/{uid}/entries/{entryId}
 */
export async function saveStoryEntryToFirestore(
  user: User,
  entry: StoryEntry
): Promise<void> {
  if (!user.emailVerified) return;

  const uid = sanitizeValidId(user.uid);
  const entryId = sanitizeValidId(entry.id);
  const entryPath = `users/${uid}/entries/${entryId}`;
  const entryRef = doc(db, 'users', uid, 'entries', entryId);

  let existingEntrySnap;
  try {
    existingEntrySnap = await getDoc(entryRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, entryPath);
  }

  const now = serverTimestamp();
  const sanitizedFields = {
    title: (entry.title?.trim() || 'Untitled Apparition').slice(0, 160),
    originalNote: (entry.originalNote?.trim() || 'Archival fragment.').slice(0, 6000),
    story: (entry.story?.trim() || 'Empty manuscript.').slice(0, 25000),
    style: sanitizeStyle(entry.style),
    length: sanitizeLength(entry.length),
    wordCount: Math.max(1, Math.min(10000, Math.round(entry.wordCount || 1))),
    providerMode: sanitizeProviderMode(entry.providerMode),
    providerLabel: (entry.providerLabel?.trim() || 'Sample Mode').slice(0, 120),
    isSample: Boolean(entry.isSample),
    updatedAt: now,
  };

  const batch = writeBatch(db);
  if (!existingEntrySnap.exists()) {
    batch.set(entryRef, {
      id: entryId,
      userId: uid,
      ...sanitizedFields,
      clientCreatedAt: (entry.createdAt?.trim() || new Date().toISOString()).slice(0, 64),
      createdAt: now,
    });
  } else {
    batch.update(entryRef, sanitizedFields);
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(
      error,
      existingEntrySnap.exists() ? OperationType.UPDATE : OperationType.CREATE,
      entryPath
    );
  }
}

/**
 * Syncs multiple StoryEntry items into the user's Firestore subcollection
 */
export async function syncBatchEntriesToFirestore(
  user: User,
  entries: StoryEntry[],
  settings: GhostnoteSettings
): Promise<number> {
  if (!user.emailVerified || entries.length === 0) return 0;

  await syncUserAccountInFirestore(user, settings);

  let syncedCount = 0;
  for (const entry of entries) {
    await saveStoryEntryToFirestore(user, entry);
    syncedCount += 1;
  }
  return syncedCount;
}

/**
 * Deletes a single StoryEntry from /users/{uid}/entries/{entryId}
 */
export async function deleteStoryEntryFromFirestore(
  user: User,
  rawEntryId: string
): Promise<void> {
  if (!user.emailVerified) return;

  const uid = sanitizeValidId(user.uid);
  const entryId = sanitizeValidId(rawEntryId);
  const entryPath = `users/${uid}/entries/${entryId}`;
  const entryRef = doc(db, 'users', uid, 'entries', entryId);

  try {
    await deleteDoc(entryRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, entryPath);
  }
}

/**
 * Converts a Firestore document snapshot data into a StoryEntry
 */
export function firestoreDocToStoryEntry(data: Record<string, unknown>): StoryEntry {
  let createdAtIso = new Date().toISOString();
  if (typeof data.clientCreatedAt === 'string' && data.clientCreatedAt) {
    createdAtIso = data.clientCreatedAt;
  } else if (data.createdAt instanceof Timestamp) {
    createdAtIso = data.createdAt.toDate().toISOString();
  }

  return {
    id: typeof data.id === 'string' ? data.id : `entry-${Date.now()}`,
    title: typeof data.title === 'string' ? data.title : 'Untitled Apparition',
    originalNote: typeof data.originalNote === 'string' ? data.originalNote : '',
    story: typeof data.story === 'string' ? data.story : '',
    style: sanitizeStyle(typeof data.style === 'string' ? data.style : undefined),
    length: sanitizeLength(typeof data.length === 'string' ? data.length : undefined),
    createdAt: createdAtIso,
    wordCount: typeof data.wordCount === 'number' ? data.wordCount : 100,
    providerMode: sanitizeProviderMode(
      typeof data.providerMode === 'string' ? data.providerMode : undefined
    ),
    providerLabel:
      typeof data.providerLabel === 'string' ? data.providerLabel : 'Archived Entry',
    isSample: Boolean(data.isSample),
  };
}
