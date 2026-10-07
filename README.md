# Daymark — Smart Daily Planner

Daymark is a responsive React application with a public product landing page and an authenticated planner. The public pages use static presentation content only. Personal task documents are read from `users/{Firebase Auth UID}/tasks` after Firebase confirms the signed-in user.

## Requirements

- Node.js 20 or newer
- A Firebase project that you own for this planner (do not reuse a project containing unrelated application data)
- npm

## Run locally

1. Install packages:

   ```sh
   npm install
   ```

2. Create a Firebase project in the [Firebase Console](https://console.firebase.google.com/). Register a Web app in that project.
3. In **Authentication → Sign-in method**, enable **Email/Password**.
4. Create the project's Firestore database.
5. Copy `.env.example` to `.env.local` and fill in the Web app configuration values from **Project settings → Your apps**. These are public client configuration values, not service-account credentials.
6. Publish the included Firestore rules from the Firebase Console's **Firestore Database → Rules** page, or use the Firebase CLI:

   ```sh
   firebase deploy --only firestore:rules
   ```

7. Start the development server:

   ```sh
   npm run dev
   ```

Restart Vite after changing `.env.local`. Without Firebase configuration, the public landing page remains available and the authentication form explains that setup is required; authenticated features do not use mock data.

## Authentication and data privacy

- `/`, `/login`, `/register`, and `/forgot-password` are public while signed out.
- `/dashboard`, `/today`, `/tasks`, `/calendar`, `/habits`, `/analytics`, and `/settings` are behind an authentication guard. Firebase's initial auth state is resolved before protected content is mounted. A signed-out visit redirects to `/login`.
- Authenticated visitors to the login and registration pages are redirected to `/dashboard`.
- Registration creates an email/password Firebase Authentication account and a profile document at `users/{uid}`.
- Task reads and writes use only `users/{uid}/tasks`. Firestore listeners are mounted only within the protected planner layout, after authentication.
- `firestore.rules` allows a signed-in user to access only their own user document and descendants; all other paths are denied. Rules are the security boundary—client-side route checks are not a substitute.
- Logging out clears the in-memory task list before ending the Firebase session and returning to `/`.
- The public landing page contains illustrative, static planner mock content; it never queries Firestore or renders actual account data.

Use the Firebase Local Emulator Suite and the Firestore Rules testing library before making changes to the security rules. Do not deploy permissive development rules.

## Routes currently included

| Route | Experience |
| --- | --- |
| `/` | Public landing page (authenticated users are sent to their dashboard) |
| `/login` | Email/password login |
| `/register` | Account creation and Firestore profile |
| `/forgot-password` | Firebase password-reset email |
| `/dashboard` | Private task summary |
| `/today` | Private tasks scheduled for today |
| `/tasks` | Private task list, search, completion, and deletion |
| `/calendar` | Private tasks by selected date |
| `/habits` | Private area reserved for habit tracking |
| `/analytics` | Task-completion counts calculated from the signed-in user's tasks |
| `/settings` | Signed-in account details |

Task creation, completion, deletion, and real-time cross-device updates use Firestore. The task collection is ordered by its date field. Dates are stored as local calendar-date strings (`YYYY-MM-DD`) to avoid shifting an all-day task across time zones.

## Firestore structure

```text
users/{uid}
  name, email, photoURL, timezone, createdAt, updatedAt
  tasks/{taskId}
    title, date, startTime, priority, category, completed, createdAt, updatedAt
```

The user document and all private subcollections must be created beneath the authenticated user's UID. Never add a shared top-level tasks collection for private planner data.

## Deploy to Vercel

1. Import this repository in Vercel and select the Vite framework preset.
2. Add the same `VITE_FIREBASE_*` values from `.env.local` in the Vercel project's Environment Variables for each deployment environment.
3. Deploy. `vercel.json` rewrites application routes to the Vite entry point so protected routes work on refresh.
4. Confirm the Firebase project's authorized domains include the deployed domain under **Authentication → Settings**.

## Project scripts

- `npm run dev` — local development server
- `npm run build` — production bundle
- `npm run preview` — serve the production bundle locally

## Scope notes

This initial implementation establishes the public/private experience, Firebase email/password authentication, per-user task storage and access rules, task workflows, date-based task views, and responsive navigation. Habit management, scheduled push notifications/FCM, daily reviews, and expanded calendar/analytics features are not implemented yet; the UI does not simulate those features or claim reminders are sent.
