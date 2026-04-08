## Environment variables

Create a local `.env` file in the project root (Vite only reads variables prefixed with `VITE_`).

### Required (Pickup API)

```bash
VITE_API_BASE_URL=https://us-central1-yau-app.cloudfunctions.net/apis
```

### Required (Coach login)

Coach portal login uses Firebase Auth + `users` collection lookup (see `docs/COACH_LOGIN_GUIDE.md`), so Firebase config is required.

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

