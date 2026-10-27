# GHOSTNOTE — Supernatural Digital Diary

> *"Some memories refuse to stay buried."*

GHOSTNOTE is a full-stack supernatural digital diary and interactive 3D web archive built for the **Ghost in the Machine** open-source AI challenge. It transforms raw notes, mysterious observations, and personal memories into literary ghost stories while prioritizing open-weight local inference (via **Ollama**), per-user **Firebase Authentication & Firestore** persistence, and honest AI provenance.

---

## Core Features

1. **Interactive 3D Sanctum (`Three.js` + Custom GLSL Shader)**
   - Procedural 3D Spectral Artifact suspended above a Ronin & ink-raven atmospheric backdrop.
   - Real-time Fresnel & displacement shaders, orbiting wireframes, drifting ash/ember particles, pointer-reactive camera parallax, and portal dive transitions.
2. **Firebase Authentication & Per-User Firestore Vault (`ghostnote-ai-6d456`)**
   - **Sign In / Sign Up**: Supports instant **Google Sign-In** (`signInWithPopup`) and **Email & Password** registration/login (`createUserWithEmailAndPassword` / `signInWithEmailAndPassword`).
   - **Isolated Per-User Database Schema**:
     - `/users/{userId}` — Stores public profile (`displayName`, `photoURL`, `authProvider`) and user preferences (`providerMode`, `ollamaEndpoint`, `ollamaModel`, `reducedMotion`, `scanlinesEnabled`, `lowEffectsMode`).
     - `/users/{userId}/private/info` — Split-collection PII isolation storing the user's verified `email`.
     - `/users/{userId}/entries/{entryId}` — Stores each user's personal supernatural story entries with real-time `onSnapshot` synchronization.
   - **Zero-Trust Security Rules (`firestore.rules`)**: Enforces verified email tokens (`request.auth.token.email_verified == true`), strict field/length validation, immutable ownership/timestamps, and relational parent checks.
3. **Story Creation Console (`Workspace`)**
   - 4 Literary Styles: `Psychological Horror`, `Haunted Terminal`, `Urban Legend`, `Bittersweet Remembrance`.
   - 3 Narrative Lengths: `Short`, `Medium`, `Long`.
   - Generate, regenerate, copy manuscript, and save directly to your personal cloud archive or browser storage.
4. **Catalog Vault (`Archive`)**
   - Search across titles, notes, and stories; filter by style/length; sort chronologically; read in full-screen manuscript modal; export/import JSON backups.
5. **Honest AI Provider Architecture**
   - **Local Ollama (Open-Weight)**: Verifies both `/api/tags` daemon reachability and `/api/generate` token inference before claiming a local connection.
   - **Sample Mode (Offline Demo)**: 100% offline synthesis clearly labeled as sample output.
   - **Cloud Inference (Google Gemini)**: Optional server-side `gemini-3.8-flash` generation.

---

## Deploying & Publishing to Vercel

This project is pre-configured for **Vercel** via `vercel.json` and `/api/index.ts`:

1. Push this repository to GitHub and import it at [https://vercel.com/new](https://vercel.com/new) (or run `npx vercel --prod`).
2. Vercel automatically runs `npm run build` (`vite build` -> `dist/`) and mounts `/api/index.ts` as Serverless Functions for `/api/providers/status`, `/api/providers/verify-ollama`, and `/api/generate`.
3. **(Optional)** Add `GEMINI_API_KEY` in **Vercel Project Settings → Environment Variables** if you wish to use Cloud Gemini in production.
4. In the [Firebase Console (`ghostnote-ai-6d456`)](https://console.firebase.google.com/project/ghostnote-ai-6d456/authentication/settings) under **Authentication → Settings → Authorized domains**, add your deployed `*.vercel.app` domain so Firebase Authentication popups are authorized.
5. If using Email/Password authentication in addition to Google Sign-In, enable **Email/Password** under **Firebase Console → Authentication → Sign-in method**.

---

## License

MIT License — see [LICENSE](./LICENSE).
