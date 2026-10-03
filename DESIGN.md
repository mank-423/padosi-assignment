# DESIGN

## Technology choices

**NestJS instead of Express.** I come from backend development and started using NestJS recently. I chose it because it gives structure from the first line of code. Modules, controllers, services and dependency injection give each feature (auth, OTP, mail, profile, tasks) its own clear home. Express is flexible, but I would have to invent and enforce my own folder layout, validation and error conventions, and that is where a codebase gets messy as the scope grows. NestJS also ships with validation pipes, guards and exception filters, and its dependency injection made the services easy to unit-test with stubs. The cost is more boilerplate and a steeper learning curve than a small Express app, which I accepted for maintainability.

**Expo for the mobile app.** I have built apps with Expo before. It adds a toolchain on top of React Native, including things this app doesn't need, but the gain in development speed is worth it. Expo Go runs the app on a real phone straight away with no emulator, which matters because my laptop struggles with Android emulators. EAS Build produces the APK in the cloud, so no local Android SDK is needed either. For a one-week assignment, fast feedback on a real device mattered more than a smaller app.

## Architecture

One repo, two apps (Monorepo works for this assignment, but I would love seperate repos for production).

- **Backend (NestJS, Prisma, PostgreSQL).** One module per concern: `auth`, `otp`, `mail`, `users` (profile), `tasks`, plus a global exception filter so every error has the shape `{ statusCode, error, message }`. DTOs with `class-validator` validate every input.
- **Data model.** `users`, `otp_codes`, `profiles`, `categories`, `tasks`, `user_tasks` (a user's picks, with an optional note and the date requested).
- **Auth.** bcrypt for passwords. The OTP is 6 digits, valid 10 minutes, single use, 5 wrong attempts, 30-second resend cooldown, and only a keyed hash (HMAC-SHA256) is stored. Login is for verified users only and returns a JWT.
- **Mobile.** Navigation is driven by auth state (`signedOut`, `needsProfile`, `ready`), so the first-login profile appears exactly once. TanStack Query handles loading, error and empty states. The JWT is kept in `expo-secure-store`, so users stay logged in across restarts, and an axios interceptor signs out on any 401.
- **Hosting.** Render free tier with a hosted PostgreSQL database. Email goes through Resend from a verified domain.

## Main trade-offs

- **Resend HTTP API instead of SMTP.** Render's free tier blocks SMTP ports. Mail sits behind `MailService`, so switching to SMTP is a one-file change.
- **Keyed HMAC for OTPs, not bcrypt.** A code has only a million values, so a plain hash is easy to reverse. A keyed hash fixes that and stays fast. The attempt limit is the main defence.
- **One access token, no refresh token.** Simple for this scope, but logout only clears the token on the device, and a stolen token works until it expires (7 days).
- **Per-task selection endpoints** (add or update with a note, remove). They keep the request date and notes, but saving a category sends several non-atomic requests. A bulk replace endpoint still exists.
- **Client-side search** over about 20 tasks. The API also supports `search` and `categoryId` for when the catalogue grows.
- **Business name is optional**, because many users are households and forcing a value would produce fake data.
- **Tests use in-memory stubs**, not a real database. They are fast and cover the risky logic (OTP, login, registration, task selection), but not real SQL.
- **Cold starts.** The free tier sleeps, so the app uses a 45-second timeout and retry screens, and the README explains how to wake the server.

## What I left out

Password reset, per-IP rate limiting on login, refresh tokens and server-side logout, an iOS build, end-to-end tests and CI, offline support.

## With another week

1. Rate limiting on login and OTP routes, and a Docker Compose file for one-command setup.
2. Refresh tokens with revocation, and password reset.
3. Single transactional task saving, with server-side search and pagination.
4. Integration tests on a real PostgreSQL, and Maestro end-to-end tests.
5. Queue-based email with retries, error tracking, and a paid instance to remove cold starts.