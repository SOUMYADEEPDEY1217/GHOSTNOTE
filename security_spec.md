# GHOSTNOTE Security Specification (Phase 0: Payload-First Security TDD)

## 1. Data Invariants

1. **Default-Deny Catch-All**: Any path not explicitly matched under `/users/{userId}`, `/users/{userId}/private/{docId}`, or `/users/{userId}/entries/{entryId}` is unconditionally denied (`allow read, write: if false;`).
2. **Verified Identity Gate**: Every read and write operation requires an authenticated user with a verified email token (`request.auth != null && request.auth.token.email_verified == true`) whose `request.auth.uid` strictly matches `{userId}`.
3. **PII Isolation (Split Collection)**: `/users/{userId}` stores only non-PII profile and preference fields. Email PII is strictly isolated inside `/users/{userId}/private/info` and must match `request.auth.token.email`.
4. **Master Gate Relational Sync**:
   - Creating `/users/{userId}/private/info` requires that the parent `/users/{userId}` document exists after the atomic batch (`getAfter(/databases/$(database)/documents/users/$(userId)).data.uid == request.auth.uid`).
   - Creating, reading (`get`), updating, or deleting `/users/{userId}/entries/{entryId}` requires that the parent `/users/{userId}` document exists and is owned by `request.auth.uid` (`get(/databases/$(database)/documents/users/$(userId)).data.uid == request.auth.uid`).
5. **Strict Schema & Volumetric Bounds**: Every string field enforces exact `minLength`, `maxLength`, and enum/regex constraints from `firebase-blueprint.json`. No extra/shadow keys are permitted (`hasAll` + `hasOnly`).
6. **Temporal & Identity Immutability**: `createdAt` and `updatedAt` must equal `request.time` on creation; on update, `createdAt`, `uid`, `id`, and `userId` are immutable and `updatedAt` must equal `request.time`.
7. **Secure List Queries**: `allow list` on `/users/{userId}/entries/{entryId}` strictly checks `isOwner(userId) && resource.data.userId == request.auth.uid` without `get()`/`exists()` calls.

---

## 2. The "Dirty Dozen" Payloads

1. **Payload 1 (Identity Spoofing on UserProfile Create)**: Authenticated as `user_A`, attempting to create `/users/user_A` with `{ "uid": "user_B", ... }` -> `PERMISSION_DENIED`.
2. **Payload 2 (Unverified Email Token Attack)**: Authenticated as `user_A` with `email_verified: false`, attempting to create `/users/user_A` -> `PERMISSION_DENIED`.
3. **Payload 3 (Shadow Field Injection on UserProfile Create)**: Authenticated as `user_A`, attempting to create `/users/user_A` with an undeclared field `{ ..., "isAdmin": true }` -> `PERMISSION_DENIED`.
4. **Payload 4 (PII Leak / Cross-User Read on UserPrivateInfo)**: Authenticated as `user_B`, attempting `get` on `/users/user_A/private/info` -> `PERMISSION_DENIED`.
5. **Payload 5 (Orphaned Private Info Without Parent Profile)**: Authenticated as `user_A`, attempting to create `/users/user_A/private/info` without `/users/user_A` existing -> `PERMISSION_DENIED`.
6. **Payload 6 (Email Spoofing in UserPrivateInfo)**: Authenticated as `user_A` (`a@example.com`), attempting to write `email: "victim@example.com"` in `/users/user_A/private/info` -> `PERMISSION_DENIED`.
7. **Payload 7 (Orphaned StoryEntry Create Without Parent UserProfile)**: Authenticated as `user_A`, attempting to create `/users/user_A/entries/entry_1` when `/users/user_A` does not exist -> `PERMISSION_DENIED`.
8. **Payload 8 (Denial-of-Wallet Oversized Story Payload)**: Authenticated as `user_A`, attempting to create `/users/user_A/entries/entry_1` with `story` length > 25,000 chars or `originalNote` > 6,000 chars -> `PERMISSION_DENIED`.
9. **Payload 9 (ID Poisoning Attack)**: Authenticated as `user_A`, attempting to create `/users/user_A/entries/bad$id!@#` with invalid characters -> `PERMISSION_DENIED`.
10. **Payload 10 (Immutable Field Mutation on Update)**: Authenticated as `user_A`, attempting to update `userId` or `createdAt` on `/users/user_A/entries/entry_1` -> `PERMISSION_DENIED`.
11. **Payload 11 (Client-Forged Timestamp Attack)**: Authenticated as `user_A`, attempting to create `/users/user_A/entries/entry_1` with a past/future `createdAt` timestamp != `request.time` -> `PERMISSION_DENIED`.
12. **Payload 12 (Unauthorized Cross-User List Query)**: Authenticated as `user_B`, attempting to `list` `/users/user_A/entries` -> `PERMISSION_DENIED`.
