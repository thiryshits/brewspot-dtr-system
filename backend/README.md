# DTR System Backend

Express + Firebase Realtime Database API for authentication and attendance records.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example`.

3. Start the API:

```bash
npm start
```

## Required Environment Variables

- `FIREBASE_DATABASE_URL`: Firebase Realtime Database URL.
- `FIREBASE_PROJECT_ID`: Firebase project ID.
- `FIREBASE_SERVICE_ACCOUNT_PATH`: Local path to a Firebase service account JSON file.
- `FIREBASE_SERVICE_ACCOUNT_BASE64` or `FIREBASE_SERVICE_ACCOUNT_JSON`: Recommended for deployment.
- `JWT_SECRET`: Long random secret for signing login tokens.
- `ADMIN_EMAIL`: Admin login email.
- `ADMIN_PASSWORD`: Admin login password.
- `ATTENDANCE_API_KEY`: Secret key used by ESP32 devices when posting attendance.
- `CORS_ORIGIN`: Comma-separated allowed frontend origins.

## Routes

- `GET /health`: Server and database status.
- `POST /api/auth/register`: Register a staff user.
- `POST /api/auth/login`: Login staff or admin.
- `GET /api/auth/me`: Return the current authenticated user.
- `POST /api/attendance/log`: Create an attendance log. Requires either `Authorization: Bearer <token>` or `x-api-key: <ATTENDANCE_API_KEY>`.
- `GET /api/attendance/all`: List all attendance logs. Requires an admin bearer token.

## Deployment Notes

- Do not deploy the local `.env` file. Set environment variables in the hosting provider dashboard.
- Do not commit or upload `serviceAccountKey.json`.
- Use your Firebase Realtime Database URL for `FIREBASE_DATABASE_URL`.
- Set `CORS_ORIGIN` to your deployed frontend URL.
- Generate fresh values for `JWT_SECRET`, `ADMIN_PASSWORD`, and `ATTENDANCE_API_KEY` before going live.
