# One App - Multi Mini-App Hub

A personal app hub built with Next.js that lets you run multiple mini-applications from a single dashboard. Start with web, with architecture designed for future iOS/Android portability.

## Features

- 🎯 **Hub Dashboard** - Central launcher for all your mini-apps
- 🎮 **Game Analytics** - Track game purchases, hours played, and value metrics
- 🔧 **Easy to Extend** - Simple template system to add new mini-apps
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- 💾 **localStorage First** - Data persists in browser, easy migration to backend
- ⚡ **TypeScript** - Full type safety across the app

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Recharts** - Data visualization
- **Vercel** - Deployment with auto-deploy on push to master

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/one_app.git
cd one_app
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

Visit `http://localhost:3000` to see the app.

## Project Structure

```
one_app/
├── app/                           # Next.js App Router
│   ├── apps/                      # Mini-apps directory
│   │   └── game-analytics/        # First mini-app
│   │       ├── components/
│   │       ├── hooks/
│   │       ├── lib/
│   │       └── data/
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Hub home page
│   └── globals.css
│
├── components/                    # Shared components
│   ├── ui/                        # Reusable UI primitives
│   ├── HubCard.tsx               # App launcher card
│   ├── HubGrid.tsx               # App grid layout
│   └── Navigation.tsx            # Navigation bar
│
├── lib/                          # Shared utilities
│   ├── mini-apps.ts              # Registry of all apps
│   └── utils.ts
│
├── types/                        # Global types
│   └── mini-app.ts
│
├── docs/                         # Documentation
│   └── ADDING_MINI_APPS.md       # Guide to create new apps
│
└── scripts/
    └── create-mini-app.sh        # Template generator
```

## Game Analytics Mini-App

The first mini-app tracks your video game library with analytics:

### Features
- Add/edit/delete games
- Track price, hours played, rating
- Calculate cost-per-hour and blend scores
- View analytics dashboard
- Visualize data with charts
- Budget tracking for 2026

### Key Metrics
- **Cost Per Hour** = Price / Hours Played
- **Blend Score** = (Rating × 10) + (10 - Normalized Cost)
  - Combines quality (rating) and value (cost/hour)

### Seed Data
Click "Load 2025 Data" on the Game Analytics page to load 9 baseline games.

## Adding a New Mini-App

### Quick Start
```bash
./scripts/create-mini-app.sh my-app "My App" "Description"
```

This creates a template at `app/apps/my-app/` with:
- Basic page structure
- Storage layer template
- Type definitions
- localStorage implementation

### Full Guide
See [docs/ADDING_MINI_APPS.md](./docs/ADDING_MINI_APPS.md) for complete instructions including:
- Directory structure conventions
- Storage pattern (localStorage → API)
- Best practices
- Example implementations

## Development

### Running Locally

```bash
npm run dev       # Start dev server (localhost:3000)
npm run build     # Build for production
npm run start     # Run production build
npm run lint      # Check for linting errors
```

### Building & Deploying

The app is set up for auto-deployment to Vercel:

1. **Create a GitHub repository** (if not already done):
```bash
git remote add origin https://github.com/YOUR_USERNAME/one_app.git
git branch -M master
git push -u origin master
```

2. **Deploy to Vercel**:
   - Go to https://vercel.com/new
   - Import your GitHub repository
   - Vercel will auto-configure for Next.js
   - Deploy!

3. **Auto-Deployment**:
   - Merge to `master` branch → Automatic production deployment
   - Create PR → Automatic preview deployment

## Architecture

### Hub Model
```
/ (Home)
  └─ Hub displays all mini-apps as cards
      └─ Click card → Navigate to /apps/{app-id}
          └─ Mini-app with full functionality
```

### Data Persistence
- **Phase 1**: localStorage (current)
- **Phase 2**: API routes + Database (when ready)
- **Repository Pattern**: Swap implementation without changing components

### Mini-App Isolation
Each mini-app is completely isolated:
- Own components, hooks, utilities
- Own types and storage layer
- Can be developed independently
- Easy to extract to separate package later

## Future Mini-Apps

Some ideas for future mini-apps:

- **Task Manager** - To-do lists with categories and Pomodoro timer
- **Budget Tracker** - Expense tracking with category budgets
- **Reading List** - Track books and reading goals
- **Workout Logger** - Exercise tracking and progress
- **Recipe Book** - Personal cookbook with meal planning

Each follows the same pattern—quick to set up and integrate.

## Deployment

### Vercel (Recommended)

1. Connect GitHub repository to Vercel
2. Vercel automatically:
   - Builds on every push
   - Deploys to production on merge to `master`
   - Creates preview deployments for PRs
   - Handles SSL/HTTPS

Visit [vercel.com](https://vercel.com) to get started.

### Environment Variables

Create `.env.local` (not committed):
```
NEXT_PUBLIC_APP_NAME=Hub App
NEXT_PUBLIC_DEFAULT_BUDGET=910
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Performance

- Fast local development with Next.js Fast Refresh
- Automatic code splitting per mini-app
- Optimized production builds
- Responsive design for all screen sizes

## Troubleshooting

### Data not persisting?
1. Check browser DevTools → Application → Local Storage
2. Verify app-specific storage key
3. Clear localStorage and reload: `localStorage.clear()`

### Build errors?
```bash
npm run build     # Check for build errors
npm run lint      # Check for linting errors
```

### Port already in use?
```bash
npm run dev -- -p 3001  # Use different port
```

## Contributing

To add a new feature or mini-app:

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make changes and test locally
3. Commit with clear message: `git commit -m "Add my-feature"`
4. Push to GitHub: `git push origin feature/my-feature`
5. Create a pull request
6. Merge to `master` to auto-deploy

## License

MIT

## Author

Personal project by [Your Name]

---

**Status**: 🚀 Live and auto-deploying on Vercel

**Latest Deployment**: Check Vercel dashboard for latest deployment info
