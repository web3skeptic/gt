# Gym Tracker

A lightweight gym tracking app built with Svelte 5 and Tailwind CSS.

## Features

- Track exercises with weight, reps, and notes
- View exercise history grouped by date
- Calculate estimated 1-rep max (1RM) using Brzycki formula
- Manage active/inactive exercises
- Export/Import workout data as JSON
- Responsive mobile-first design
- Offline-first storage in the browser (PouchDB) with live sync to a CouchDB server

## Tech Stack

- **Svelte 5** - Modern reactive UI framework with runes
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide Svelte** - Icon library
- **PouchDB** - Local database with CouchDB replication

## Data storage and sync

All data is kept in a PouchDB database inside the browser (IndexedDB), so the app works offline.
Under *Settings → Sync* you can enter the URL of a CouchDB database plus a user name and
password; from then on the app replicates continuously in both directions with that server,
and every device pointed at the same database shows the same data.

The documents use the layout of the [datum](https://github.com/vividn/datum) CLI so the same
database can be queried and edited with other tools:

| Document id | Contents |
|---|---|
| `exercise:<name>` | catalog entry: `muscles`, `hidden`, `active`, `order` |
| `gym:<time>_<exercise>_<kg>x<reps>` | one set: `exercise`, `weightKg`, `reps`, `note`, `dropset`, `mioset` |
| `weight:<time>` | one bodyweight record: `weightKg`, `note`, `source` |

Times are `{ utc, o, tz }` objects. See `src/lib/db.js` for the mapping.

The default sync URL is `<origin>/couch/organizer` when served from a website and
`http://127.0.0.1:5984/organizer` during local development (the CouchDB then needs CORS
enabled for the dev server's origin).

## Desktop app (Electron)

The same app runs as a desktop application. It stores its data in its own local database and
syncs with whatever CouchDB is entered under *Settings → Sync*; the default there is the local
instance at `http://127.0.0.1:5984/organizer`, and pointing it at a remote CouchDB works the same
way. The CouchDB must allow the origin `app://gt` in its CORS settings.

```bash
npm run electron         # build and open the desktop app
npm run electron:build   # package it (macOS .dmg/.zip into release/)
```

## Deployment to a server

`deploy/` contains what is needed to host the app and a CouchDB behind nginx on a Linux server:
`server-setup.sh` (CouchDB install), `nginx-gt-couch.conf` (locations `/gt/` and `/couch/`),
`deploy.sh` (build + upload) and `setup-replication.sh` (continuous two-way replication between a
local CouchDB and the server).

## Development

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The production build will be in the `dist` folder.

### Preview Production Build

```bash
npm run preview
```

## Deployment

This project is configured for GitHub Pages deployment.

```bash
npm run deploy
```

This will build the project and deploy it to the `gh-pages` branch.

## Project Structure

```
src/
├── components/
│   ├── common/
│   │   ├── ExerciseCard.svelte
│   │   └── SetHistory.svelte
│   ├── AddExercisePage.svelte
│   ├── ExercisePage.svelte
│   ├── HomePage.svelte
│   └── ManageExercisesPage.svelte
├── utils/
│   ├── formatters.js
│   └── initialData.js
├── App.svelte
├── main.js
└── index.css
```

## Features in Detail

### Exercise Tracking
- Add sets with weight, reps, and optional notes
- Edit existing sets with custom date/time
- Delete sets with confirmation dialog

### 1-Rep Max Calculator
- Automatic calculation using Brzycki formula
- Shows best estimated 1RM from last 30 days
- Real-time calculation as you input weight/reps

### Data Management
- Export all workout data to JSON
- Import previously exported data
- All data stored in a local PouchDB database, optionally synced with CouchDB

## License

MIT
