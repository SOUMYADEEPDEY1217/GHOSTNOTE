import React, { useState } from 'react';
import {
  X,
  LogIn,
  UserPlus,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  Mail,
  ShieldCheck,
  Database,
  RefreshCw,
  CloudUpload,
  ExternalLink,
} from 'lucide-react';
import {
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  signOut,
  User,
} from 'firebase/auth';
import {
  auth,
  googleProvider,
  FIREBASE_PROJECT_ID,
  FIRESTORE_DATABASE_ID,
} from '../lib/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  cloudEntryCount: number;
  isSyncingCloud: boolean;
  onSyncLocalToCloud: () => Promise<void>;
  onUserUpdated: () => Promise<void>;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  cloudEntryCount,
  isSyncingCloud,
  onSyncLocalToCloud,
  onUserUpdated,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [needsConsoleEnable, setNeedsConsoleEnable] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const formatFirebaseError = (err: unknown): string => {
    const code = (err as { code?: string })?.code || '';
    const message = err instanceof Error ? err.message : 'Authentication failed.';

    if (code === 'auth/operation-not-allowed') {
      setNeedsConsoleEnable(true);
      return 'Email/Password authentication is not enabled yet in your Firebase Console. Enable it in 1 click using the guide below, or sign in immediately with Google.';
    }
    if (code === 'auth/popup-closed-by-user') {
      return 'Sign-in popup was closed before completing authentication.';
    }
    if (code === 'auth/email-already-in-use') {
      return 'An account with this email already exists. Switch to Sign In.';
    }
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
      return 'Invalid email or password. Please check your credentials and try again.';
    }
    if (code === 'auth/weak-password') {
      return 'Password must be at least 6 characters long.';
    }
    if (code === 'auth/unauthorized-domain') {
      return `This domain (${window.location.hostname}) must be added to Firebase Console -> Authentication -> Settings -> Authorized domains.`;
    }
    return message;
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setStatusNotice(null);
    setNeedsConsoleEnable(false);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      setStatusNotice('Signed in with Google. Your personal Firestore archive is active.');
    } catch (err) {
      setErrorMsg(formatFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusNotice(null);
    setNeedsConsoleEnable(false);

    if (!email.trim() || !password) {
      setErrorMsg('Please enter both your email address and password.');
      return;
    }

    if (mode === 'signup' && password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const cleanName = displayName.trim() || email.trim().split('@')[0] || 'Archivist';
        await updateProfile(cred.user, { displayName: cleanName.slice(0, 100) });
        await sendEmailVerification(cred.user);
        await onUserUpdated();
        setStatusNotice(
          `Account created! A verification link has been sent to ${cred.user.email}. Verify your email to activate cloud Firestore writes.`
        );
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        setStatusNotice('Signed in successfully.');
      }
      setPassword('');
    } catch (err) {
      setErrorMsg(formatFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshVerification = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    setErrorMsg(null);
    setStatusNotice(null);
    try {
      await auth.currentUser.reload();
      await auth.currentUser.getIdToken(true);
      await onUserUpdated();
      if (auth.currentUser.emailVerified) {
        setStatusNotice('Email verified! Your personal Firestore database is now active and synced.');
      } else {
        setErrorMsg(
          'Your email is still marked as unverified. Click the verification link in your inbox, then click Refresh Status again.'
        );
      }
    } catch (err) {
      setErrorMsg(formatFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    setErrorMsg(null);
    setStatusNotice(null);
    try {
      await sendEmailVerification(auth.currentUser);
      setStatusNotice(`Verification email resent to ${auth.currentUser.email}.`);
    } catch (err) {
      setErrorMsg(formatFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    setErrorMsg(null);
    setStatusNotice(null);
    try {
      await signOut(auth);
      onClose();
    } catch (err) {
      setErrorMsg(formatFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="archive-console-panel border border-white/25 rounded-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 animate-view-enter"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/15 pb-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#F87171] font-mono-tabular">
              Firebase Authentication & User Vault
            </p>
            <h2
              id="auth-modal-title"
              className="text-2xl font-semibold text-white font-serif-editorial mt-1"
            >
              {currentUser
                ? 'Archivist Identity & Cloud Database'
                : mode === 'signin'
                ? 'Sign In to GHOSTNOTE'
                : 'Create Your Archivist Account'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close authentication modal"
            className="p-2 rounded-md text-[#9CA3AF] hover:text-white bg-[#0B0C0F] border border-white/15"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="p-3.5 rounded-lg bg-[#221215] border border-[#991B1B] text-xs text-[#FCA5A5] flex items-start gap-2.5"
          >
            <AlertTriangle className="w-4 h-4 text-[#F87171] shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {statusNotice && (
          <div
            role="status"
            className="p-3.5 rounded-lg bg-[#13221C] border border-[#10B981]/50 text-xs text-[#6EE7B7] flex items-start gap-2.5"
          >
            <CheckCircle2 className="w-4 h-4 text-[#34D399] shrink-0 mt-0.5" />
            <span>{statusNotice}</span>
          </div>
        )}

        {/* Signed-In User Account Dossier */}
        {currentUser ? (
          <div className="space-y-5">
            <div className="bg-[#0B0C0F] border border-white/15 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3.5">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User avatar'}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-full border border-[#DC2626]/60 object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#27171A] border border-[#DC2626]/60 flex items-center justify-center text-base font-bold text-[#FCA5A5] font-monolith">
                    {(currentUser.displayName || currentUser.email || 'A')
                      .slice(0, 1)
                      .toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-white truncate">
                    {currentUser.displayName || 'Archivist'}
                  </p>
                  <p className="text-xs text-[#9CA3AF] truncate font-mono-tabular">
                    {currentUser.email}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 text-xs">
                <div className="bg-[#12141A] p-2.5 rounded border border-white/10 flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-[#9CA3AF]">
                    Account Status
                  </span>
                  <span
                    className={`font-mono-tabular font-semibold ${
                      currentUser.emailVerified ? 'text-[#34D399]' : 'text-[#FBBF24]'
                    }`}
                  >
                    {currentUser.emailVerified ? 'Verified Cloud Access' : 'Pending Email Verification'}
                  </span>
                </div>
              </div>
            </div>

            {!currentUser.emailVerified && (
              <div className="p-4 rounded-xl bg-[#261B12] border border-[#F59E0B]/40 space-y-3 text-xs text-[#FDE68A]">
                <p className="leading-relaxed">
                  <strong>Zero-Trust Security Gate:</strong> To protect your cloud vault against
                  email spoofing, Firestore rules require a verified email (`email_verified == true`)
                  before cloud writes are permitted. Check your inbox for the verification link.
                </p>
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleRefreshVerification}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#991B1B] hover:bg-[#B91C1C] text-white font-semibold transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    <span>I’ve Verified My Email (Refresh Status)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0B0C0F] hover:bg-[#1A1D24] text-[#E5E7EB] border border-white/20 transition-colors cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Resend Verification Email</span>
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/15">
              {currentUser.emailVerified && (
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
                    {isSyncingCloud
                      ? 'Syncing to Cloud Vault...'
                      : 'Sync Local Entries to Cloud'}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={handleSignOut}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#FCA5A5] bg-[#221215] hover:bg-[#33161B] border border-[#991B1B] rounded-md transition-colors ml-auto cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
          /* Signed-Out Sign In / Sign Up Interface */
          <div className="space-y-5">
            {/* Mode Switcher */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#0B0C0F] border border-white/15 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setErrorMsg(null);
                  setStatusNotice(null);
                }}
                className={`flex items-center justify-center gap-2 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  mode === 'signin'
                    ? 'bg-[#991B1B] text-white'
                    : 'text-[#9CA3AF] hover:text-white'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMsg(null);
                  setStatusNotice(null);
                }}
                className={`flex items-center justify-center gap-2 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-[#991B1B] text-white'
                    : 'text-[#9CA3AF] hover:text-white'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Sign Up</span>
              </button>
            </div>

            {/* Google Sign-In Popup Button (Pre-configured by ProvisionFirebase) */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3 px-4 rounded-lg bg-white hover:bg-[#E5E7EB] text-[#0D0E11] font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-[#B91C1C]" />
              <span>
                {mode === 'signin'
                  ? 'Continue with Google (Instant Verified Vault)'
                  : 'Sign Up with Google (Instant Verified Vault)'}
              </span>
            </button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-white/15" />
              <span className="flex-shrink mx-3 text-[11px] uppercase tracking-widest text-[#9CA3AF] font-mono-tabular">
                Or with Email & Password
              </span>
              <div className="flex-grow border-t border-white/15" />
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label
                    htmlFor="auth-display-name"
                    className="block text-xs font-medium text-[#E5E7EB] mb-1.5"
                  >
                    Archivist Alias (Display Name)
                  </label>
                  <input
                    id="auth-display-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g., Dr. Eleanor Vance"
                    maxLength={100}
                    className="w-full px-3.5 py-2.5 text-sm bg-[#0B0C0F] border border-white/20 focus:border-[#EF4444] rounded-lg text-white focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="auth-email"
                  className="block text-xs font-medium text-[#E5E7EB] mb-1.5"
                >
                  Email Address
                </label>
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="archivist@example.com"
                  className="w-full px-3.5 py-2.5 text-sm bg-[#0B0C0F] border border-white/20 focus:border-[#EF4444] rounded-lg text-white focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="auth-password"
                  className="block text-xs font-medium text-[#E5E7EB] mb-1.5"
                >
                  Password
                </label>
                <input
                  id="auth-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-3.5 py-2.5 text-sm bg-[#0B0C0F] border border-white/20 focus:border-[#EF4444] rounded-lg text-white focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg bg-[#991B1B] hover:bg-[#B91C1C] border border-[#F87171]/40 text-white font-semibold text-xs uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
              >
                {loading
                  ? 'Authenticating...'
                  : mode === 'signin'
                  ? 'Sign In with Email'
                  : 'Create Account & Send Verification'}
              </button>
            </form>

            {/* Walkthrough for enabling Email/Password in Firebase Console */}
            {needsConsoleEnable && (
              <div className="p-4 rounded-xl bg-[#12141A] border border-white/20 space-y-2 text-xs text-[#D1D5DB]">
                <p className="font-semibold text-white">
                  How to Enable Email/Password in Firebase Console:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-[#9CA3AF]">
                  <li>
                    Open your Firebase project{' '}
                    <code className="text-white">{FIREBASE_PROJECT_ID}</code> in the Firebase
                    Console.
                  </li>
                  <li>
                    Navigate to <strong>Authentication → Sign-in method</strong>.
                  </li>
                  <li>
                    Click <strong>Add new provider → Email/Password</strong>, toggle{' '}
                    <strong>Enable</strong>, and click <strong>Save</strong>.
                  </li>
                </ol>
                <a
                  href={`https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/authentication/providers`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[#F87171] hover:underline pt-1 font-medium"
                >
                  <span>Open Firebase Auth Providers ({FIREBASE_PROJECT_ID})</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
