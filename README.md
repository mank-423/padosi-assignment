# PadosiPro: Customer Onboarding App

A native mobile app and REST API for the first customer journey: sign up, verify email with an OTP, complete a profile, and pick the tasks you want handled.

- **Mobile:** React Native (Expo), TypeScript, React Navigation, TanStack Query
- **Backend:** NestJS, Prisma, PostgreSQL, JWT auth
- **Email:** OTP codes sent through the [Resend](https://resend.com) HTTP API from `noreply@projectmayank.online`

> **Reviewing quickly?** Skip to [Try the app (APK)](#try-the-app-apk). Everything is already hosted, so you don't need to run anything locally.

---

## Demo

| | |
|---|---|
| **Screen recording** | `https://drive.google.com/file/d/1jhdOXVmcK5yVZiXgVH4-zb61rVvyCo5O/view?usp=sharing` |
| **Android APK** | `https://drive.google.com/file/d/1nugJbloBVKz8afQv0TreI3xNDREp0bON/view?usp=sharing` |
| **Hosted API** | https://padosi-assignment-ti5i.onrender.com |

### Screenshots

| Sign up | Verify email | Profile |
|---|---|---|
| ![Sign up](docs/screenshots/01-signup.png) | ![Verify email](docs/screenshots/02-verify.png) | ![Profile](docs/screenshots/03-profile.png) |

| Home | Pick tasks | Task details |
|---|---|---|
| ![Home](docs/screenshots/04-home.png) | ![Pick tasks](docs/screenshots/05-tasks.png) | ![Task details](docs/screenshots/06-task-detail.png) |

`TODO: add the screenshot files to docs/screenshots/ with these names (or edit the paths above).`

---

## Try the app (APK)

The backend is hosted on Render's **free tier**, which puts the server to sleep after a period of inactivity. The first request after that can take **30 to 60 seconds**. Wake it up before you open the app.

1. **Wake the API.** Open https://padosi-assignment-ti5i.onrender.com in a browser. Wait until the page shows `Hello World!` (this can take up to a minute).
2. **Download the APK** from the Google Drive link above.
3. **Install it** on an Android phone or emulator. You may need to allow "Install unknown apps" for your browser or file manager, and dismiss a Play Protect warning (the app is not published on the Play Store).
4. **Open the app** and sign up with an email address you can read. An OTP is sent to it.
5. Check your spam folder if the code doesn't arrive within a minute. It comes from `noreply@projectmayank.online`.

If the app shows a timeout or "can't reach the server" message, the server is still waking up. Wait a few seconds and tap **Tap to retry**.

Please use test data only.

---

## Repository structure

```
padosipro/
├── backend/            NestJS API
│   ├── prisma/         schema, migrations, seed
│   └── src/            auth, otp, mail, users (profile), tasks, common
├── mobile/             Expo app
│   └── src/            api, auth, components, screens, navigation, theme
├── docs/screenshots/   screenshots used in this README
├── README.md
└── DESIGN.md           architecture, trade-offs, next steps
```

---

## Run the backend locally

### Prerequisites

- Node.js 20 or newer, and npm
- PostgreSQL 14 or newer (Docker is the easiest way, see below)
- A [Resend](https://resend.com) API key if you want OTP emails to be delivered (see [Email delivery](#email-delivery))

### 1. Start PostgreSQL

With Docker:

```bash
docker run --name padosipro-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=padosipro \
  -p 5432:5432 -d postgres:16
```

### 2. Install and configure

```bash
cd backend
npm install
cp .env.example .env      # then edit .env
```

### 3. Environment variables

`backend/.env.example` lists every variable. Never commit a real `.env`.

| Variable | Required | Description |
|---|---|---|
| `PORT` | no | HTTP port. Default `3000`. |
| `DATABASE_URL` | yes | PostgreSQL connection string. |
| `DIRECT_URL` | yes | Direct (non-pooled) connection string used by Prisma migrations. For a local database, use the same value as `DATABASE_URL`. |
| `JWT_SECRET` | yes | Long random string used to sign access tokens. |
| `JWT_EXPIRES_IN` | no | Token lifetime. Default `7d`. |
| `OTP_TTL_MINUTES` | no | OTP validity. Default `10`. |
| `OTP_MAX_ATTEMPTS` | no | Wrong attempts allowed per code. Default `5`. |
| `OTP_RESEND_COOLDOWN_SECONDS` | no | Minimum time between codes. Default `30`. |
| `RESEND_API_KEY` | yes | Resend API key used to send OTP emails. |
| `MAIL_FROM` | yes | Sender address, e.g. `"PadosiPro <noreply@projectmayank.online>"`. The domain must be verified in Resend. |

Example for the Docker database above:

```dotenv
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/padosipro
DIRECT_URL=postgresql://postgres:postgres@localhost:5432/padosipro
JWT_SECRET=replace-with-a-long-random-string
RESEND_API_KEY=re_xxxxxxxxxxxx
MAIL_FROM="PadosiPro <noreply@projectmayank.online>"
```

### 4. Create the tables and seed the task catalogue

```bash
npx prisma migrate deploy     # applies the migrations in prisma/migrations
npx prisma db seed            # inserts the categories and 20+ tasks
```

### 5. Start the server

```bash
npm run start:dev
```

The API is now at http://localhost:3000. Opening it in a browser should show `Hello World!`.

### Run the tests

```bash
cd backend
npm test
```

The tests use in-memory stubs, so they need no database, network or `.env`. They cover OTP generation, hashing, expiry, single use, the 5-attempt limit, the resend cooldown, login rules (including unverified users), registration, and task selection.

---

## Run the mobile app locally

### Prerequisites

- Node.js 20 or newer, and npm
- One of:
  - **Expo Go** on a phone (Android or iOS), or
  - an **Android emulator** (Android Studio) or **iOS simulator** (macOS and Xcode)

### Steps

```bash
cd mobile
npm install
cp .env.example .env      # optional, see below
npx expo start
```

Then press `a` for the Android emulator, `i` for the iOS simulator, or scan the QR code with Expo Go. After changing `.env`, restart with `npx expo start -c`.

### Which backend does the app use?

The app reads `EXPO_PUBLIC_API_URL` and falls back to the hosted API, so with no `.env` it talks to https://padosi-assignment-ti5i.onrender.com.

To use a backend running on your machine, set the URL for where the app runs:

| App runs on | `EXPO_PUBLIC_API_URL` |
|---|---|
| Android emulator | `http://10.0.2.2:3000` |
| iOS simulator | `http://localhost:3000` |
| Physical phone (same Wi-Fi) | `http://<your-computer-LAN-IP>:3000` |
| Hosted backend | `https://padosi-assignment-ti5i.onrender.com` |

Release builds (the APK) must use an **HTTPS** URL, because Android blocks plain HTTP by default.

---

## Build the APK

The APK is built with [EAS Build](https://docs.expo.dev/build/introduction/). You need a free Expo account.

1. Install the CLI and log in:

   ```bash
   npm install -g eas-cli
   eas login
   ```

2. Make sure `mobile/app.json` has an Android package name, for example:

   ```json
   { "expo": { "android": { "package": "com.projectmayank.padosipro" } } }
   ```

3. Create `mobile/eas.json` so the preview profile produces an APK that points at the hosted API:

   ```json
   {
     "cli": { "version": ">= 12.0.0" },
     "build": {
       "preview": {
         "distribution": "internal",
         "android": { "buildType": "apk" },
         "env": {
           "EXPO_PUBLIC_API_URL": "https://padosi-assignment-ti5i.onrender.com"
         }
       }
     }
   }
   ```

4. Build:

   ```bash
   cd mobile
   eas build -p android --profile preview
   ```

5. When the build finishes, download the `.apk` from the link EAS prints (or from the Expo dashboard), install it on a device, and run through the full flow once before sharing it.

---

## How the app works

1. **Sign up** with email, password and confirm password (inline validation).
2. **Verify email** with the 6-digit OTP. A 30-second countdown guards the resend button, and wrong or expired codes show clear messages.
3. **Log in** (verified users only). Unverified users are sent back to verification. The session is stored in secure storage, so a logged-in user stays logged in after restarting the app.
4. **First-login profile** (name, +91 mobile number, address, optional business name), shown once.
5. **Home** shows your selected tasks, a search box, and task categories. Tap a category to see its tasks, tick the ones you need, add an optional note to each, and save.
6. **Task details** show the note and the date the task was requested.
7. **Profile** screen to view and edit your details, and **log out**.

Business name is optional because individual households have no business.

---

## API reference

Base URL: `https://padosi-assignment-ti5i.onrender.com` (or `http://localhost:3000`).
Protected routes need the header `Authorization: Bearer <accessToken>`.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/register` | no | Create an account and send an OTP. Body: `{ email, password }` |
| POST | `/auth/resend-otp` | no | Send a new OTP (30s cooldown). Body: `{ email }` |
| POST | `/auth/verify-otp` | no | Verify the email. Body: `{ email, code }`. Returns `{ accessToken, user }` |
| POST | `/auth/login` | no | Log in (verified users only). Body: `{ email, password }` |
| GET | `/profile` | yes | Returns `{ profile }`, or `{ profile: null }` if none yet |
| PUT | `/profile` | yes | Create or update the profile. Body: `{ name, mobile, address, businessName? }` |
| GET | `/categories` | yes | List categories |
| GET | `/tasks` | yes | List tasks. Optional query: `search`, `categoryId` |
| GET | `/tasks/selected` | yes | The user's selected tasks, each with `customDescription` (the note) and `createdAt` |
| POST | `/tasks/selected` | yes | Add a task or update its note. Body: `{ taskId, description? }`. Returns the full selected list |
| DELETE | `/tasks/selected/:taskId` | yes | Remove a task from the selection. Returns the full selected list |
| POST | `/tasks/select` | yes | Replace the whole selection. Body: `{ taskIds: [...] }` |

### Error format

Every error uses the same shape:

```json
{ "statusCode": 400, "error": "OTP_INVALID", "message": "Incorrect code." }
```

Common codes: `VALIDATION_ERROR`, `EMAIL_TAKEN`, `EMAIL_NOT_VERIFIED`, `INVALID_CREDENTIALS`, `ALREADY_VERIFIED`, `OTP_INVALID`, `OTP_EXPIRED`, `OTP_ATTEMPTS_EXCEEDED`, `OTP_COOLDOWN`, `OTP_SEND_FAILED`, `INVALID_TASK_ID`, `UNAUTHORIZED`.

---

## Email delivery

OTP emails are sent through the **Resend HTTP API**, not SMTP. Render's free tier blocks outbound SMTP ports, and the HTTP API works reliably there. Mail sending is isolated in `backend/src/mail/mail.service.ts`, so switching to SMTP would be a one-file change.

- **Hosted backend:** emails are sent from `noreply@projectmayank.online` (a verified Resend domain), so they can be delivered to any address.
- **Running the backend locally:** you need your own Resend API key. A domain verified on another account cannot be used with your key. Either verify a domain in your Resend account and set `MAIL_FROM` to an address on it, or set `MAIL_FROM="PadosiPro <onboarding@resend.dev>"`, which Resend only delivers to the email address of your own Resend account. Alternatively, point the mobile app at the hosted API.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| App says it can't reach the server, or times out | The Render server is asleep. Open the API URL in a browser, wait for `Hello World!`, then retry in the app. |
| No OTP email | Check spam. Wait for the 30s cooldown and tap "Resend code". On a local backend, check your Resend key and `MAIL_FROM`. |
| App works in Expo Go but not in the APK | The APK must use an HTTPS API URL. Check `EXPO_PUBLIC_API_URL` in `eas.json`. |
| Emulator can't reach a local backend | Use `http://10.0.2.2:3000` on Android emulators, not `localhost`. |
| Backend won't start | Check that `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `RESEND_API_KEY` and `MAIL_FROM` are set, and that migrations ran. |

---

## More documentation

See [DESIGN.md](DESIGN.md) for the architecture, trade-offs, what was left out, and what I would do next.