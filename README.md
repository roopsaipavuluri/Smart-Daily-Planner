# Daymark — Smart Daily Planner

Daymark is a responsive React application with a public product landing page and an authenticated planner. The public pages use static presentation content only. Personal task documents are read from `users/{Firebase Auth UID}/tasks` after Firebase confirms the signed-in user.

## Project Structure

The project is separated into a frontend and Firebase backend:

```text
Daymark / Smart Daily Planner/
│
├── frontend/
│   ├── public/
│   ├── src/
│   ├── .env.local
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.js
│
├── functions/
│   ├── index.js
│   ├── package.json
│   └── package-lock.json
│
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
├── vercel.json
├── .gitignore
└── README.md
```

## Requirements

* Node.js 20 or newer
* A Firebase project that you own for this planner (do not reuse a project containing unrelated application data)
* npm
* Firebase CLI

## Run locally

### 1. Frontend

Open a terminal and go to the frontend folder:

```powershell
cd "C:\Users\Roops\OneDrive\Desktop\Smart Daily Planner\frontend"
```

Install packages:

```powershell
npm install
```

Start the frontend:

```powershell
npm run dev
```

The frontend normally runs at:

```text
http://localhost:5173
```

If port `5173` is already in use, Vite may automatically use another port such as:

```text
http://localhost:5174
```

Use the URL displayed in the terminal.

### 2. Firebase Backend / Functions

Open a **second terminal** and go to the project root:

```powershell
cd "C:\Users\Roops\OneDrive\Desktop\Smart Daily Planner"
```

Start the Firebase Functions emulator:

```powershell
firebase emulators:start --only functions
```

Firebase Emulator UI:

```text
http://127.0.0.1:4000
```

Firebase Functions emulator:

```text
http://127.0.0.1:5001
```

The exact local Function URLs are displayed in the terminal when the emulator starts.

### Run frontend and backend together

Use two terminals:

**Terminal 1 — Frontend**

```powershell
cd "C:\Users\Roops\OneDrive\Desktop\Smart Daily Planner\frontend"
npm run dev
```

Frontend:

```text
http://localhost:5173
```

**Terminal 2 — Firebase Functions**

```powershell
cd "C:\Users\Roops\OneDrive\Desktop\Smart Daily Planner"
firebase emulators:start --only functions
```

Firebase Emulator UI:

```text
http://127.0.0.1:4000
```

## Firebase Setup

1. Create a Firebase project in the [Firebase Console](https://console.firebase.google.com/). Register a Web app in that project.
2. In **Authentication → Sign-in method**, enable **Email/Password**.
3. Create the project's Firestore database.
4. Copy `.env.example` to `.env.local` and fill in the Web app configuration values from **Project settings → Your apps**. These are public client configuration values, not service-account credentials.
5. The frontend `.env.local` file must be located inside:

```text
frontend/.env.local
```

6. Publish the included Firestore rules from the Firebase Console's **Firestore Database → Rules** page, or use the Firebase CLI:

```sh
firebase deploy --only firestore:rules
```

7. Restart Vite after changing `.env.local`.

Without Firebase configuration, the public landing page remains available and the authentication form explains that setup is required; authenticated features do not use mock data.

## Authentication and data privacy

* `/`, `/login`, `/register`, and `/forgot-password` are public while signed out.
* `/dashboard`, `/today`, `/tasks`, `/calendar`, `/habits`, `/analytics`, and `/settings` are behind an authentication guard. Firebase's initial auth state is resolved before protected content is mounted. A signed-out visit redirects to `/login`.
* Authenticated visitors to the login and registration pages are redirected to `/dashboard`.
* Registration creates an email/password Firebase Authentication account and a profile document at `users/{uid}`.
* Task reads and writes use only `users/{uid}/tasks`. Firestore listeners are mounted only within the protected planner layout, after authentication.
* `firestore.rules` allows a signed-in user to access only their own user document and descendants; all other paths are denied. Rules are the security boundary—client-side route checks are not a substitute.
* Logging out clears the in-memory task list before ending the Firebase session and returning to `/`.
* The public landing page contains illustrative, static planner mock content; it never queries Firestore or renders actual account data.

Use the Firebase Local Emulator Suite and the Firestore Rules testing library before making changes to the security rules. Do not deploy permissive development rules.

## Routes currently included

| Route              | Experience                                                            |
| ------------------ | --------------------------------------------------------------------- |
| `/`                | Public landing page (authenticated users are sent to their dashboard) |
| `/login`           | Email/password login                                                  |
| `/register`        | Account creation and Firestore profile                                |
| `/forgot-password` | Firebase password-reset email                                         |
| `/dashboard`       | Private task summary                                                  |
| `/today`           | Private tasks scheduled for today                                     |
| `/tasks`           | Private task list, search, completion, and deletion                   |
| `/calendar`        | Private tasks by selected date                                        |
| `/habits`          | Private area reserved for habit tracking                              |
| `/analytics`       | Task-completion counts calculated from the signed-in user's tasks     |
| `/settings`        | Signed-in account details                                             |

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
2. Because the frontend is located inside the `frontend` folder, set the Vercel **Root Directory** to:

```text
frontend
```

3. Use:

```text
Build Command: npm run build
Output Directory: dist
```

4. Add the same `VITE_FIREBASE_*` values from `frontend/.env.local` in the Vercel project's Environment Variables for each deployment environment.
5. Deploy. `vercel.json` rewrites application routes to the Vite entry point so protected routes work on refresh.
6. Confirm the Firebase project's authorized domains include the deployed domain under **Authentication → Settings**.

## Project scripts

### Frontend

Run the local development server:

```sh
npm run dev
```

Create a production build:

```sh
npm run build
```

Preview the production build:

```sh
npm run preview
```

### Firebase Functions

The backend is located inside:

```text
functions/
```

Install backend packages:

```sh
cd functions
npm install
```

Return to the project root:

```sh
cd ..
```

Start Firebase Functions locally:

```sh
firebase emulators:start --only functions
```

## Local Development URLs

| Service                   | Local URL               |
| ------------------------- | ----------------------- |
| Frontend                  | `http://localhost:5173` |
| Frontend alternative port | `http://localhost:5174` |
| Firebase Emulator UI      | `http://127.0.0.1:4000` |
| Firebase Functions        | `http://127.0.0.1:5001` |

The Vite port may change automatically if the default port is already being used.

## Scope notes

This initial implementation establishes the public/private experience, Firebase email/password authentication, per-user task storage and access rules, task workflows, date-based task views, and responsive navigation.

Habit management, scheduled push notifications/FCM, daily reviews, and expanded calendar/analytics features are not implemented yet; the UI does not simulate those features or claim reminders are sent.
