# Gym Tracker

A lightweight gym tracking app built with Svelte 5 and Tailwind CSS.

## Features

- Track exercises with weight, reps, and notes
- View exercise history grouped by date
- Calculate estimated 1-rep max (1RM) using Brzycki formula
- Manage active/inactive exercises
- Export/Import workout data as JSON
- Responsive mobile-first design
- Local storage persistence

## Tech Stack

- **Svelte 5** - Modern reactive UI framework with runes
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide Svelte** - Icon library

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
- All data stored in browser localStorage

## License

MIT
