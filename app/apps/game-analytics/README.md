# Game Analytics

A comprehensive game library tracker with detailed analytics, play session logging, and value analysis.

## Features

### Game Library Management

Track your entire game collection with rich metadata:

- **Game Details**: Name, price, hours played, personal rating (1-10)
- **Status Tracking**: Not Started (Backlog), In Progress, Completed, Wishlist, Abandoned
- **Categorization**: Platform (PC, PS5, Xbox, Switch, etc.), Genre, Purchase Source
- **Date Tracking**: Purchase date, start date, end date
- **Notes**: Personal notes and thoughts about each game

### Play Session Logging

Log individual play sessions to track your gaming habits over time:

- Record date, hours played, and optional notes for each session
- View session history per game
- Sessions automatically appear in the Timeline view
- Total logged hours are tracked alongside manual hour entries

### Three-Tab Interface

#### Games Tab
- List view of all games with key metrics
- Filter by: All, Owned, Wishlist
- Quick access to edit, log sessions, and delete
- Shows cost-per-hour and value rating at a glance

#### Timeline Tab
- Chronological view of all gaming events
- Event types:
  - **Purchases** (green) - When you bought a game
  - **Starts** (purple) - When you started playing
  - **Play Sessions** (blue) - Individual logged sessions
  - **Completions** (green) - When you finished a game
  - **Abandonments** (red) - When you stopped playing
- Grouped by month with event counts
- Displays notes from play sessions

#### Stats Tab
- Comprehensive analytics dashboard with 12+ visualizations

## Analytics & Charts

### Summary Cards
- Total games and ownership count
- Total spent and average price
- Total hours and average hours per game
- Average cost per hour
- Average rating
- Completion rate percentage

### Highlight Cards
- **Best Value**: Game with lowest cost per hour (min 5 hours played)
- **Worst Value**: Game with highest cost per hour (paid games only)
- **Most Played**: Game with most hours
- **Highest Rated**: Your top-rated game

### Charts

| Chart | Description |
|-------|-------------|
| Top Spending by Game | Horizontal bar chart of highest-priced games |
| Games by Status | Donut chart showing status distribution |
| Monthly Spending Trend | Area chart of spending over time |
| Cumulative Spending | Line chart of total spending growth |
| Hours Played by Month | Bar chart from play logs |
| Spending by Genre | Colored bar chart by genre |
| Value Analysis | Scatter plot: price vs hours, bubble size = rating |
| Rating Distribution | Histogram of your ratings |
| Spending by Platform | Pie chart by gaming platform |
| ROI Rankings | Bar chart of (rating × hours / price) |
| Hours by Genre | Radar chart of time spent per genre |
| Yearly Spending | Bar chart comparing years |
| Spending by Store | Bar chart by purchase source |

### Alerts
- **Backlog Alert**: Shows value of unplayed games
- **Wishlist Summary**: Shows count and total value of wishlist

## Metrics Explained

### Cost Per Hour
```
Cost Per Hour = Price / Hours Played
```
- **Excellent**: ≤ $1/hr
- **Good**: ≤ $3/hr
- **Fair**: ≤ $5/hr
- **Poor**: > $5/hr

### Blend Score
```
Blend Score = (Rating × 10) + (10 - Normalized Cost × 10)
```
Combines your personal rating with value to create a single score.

### ROI (Return on Investment)
```
ROI = (Rating × Hours) / Price
```
Higher is better. Free games use: Rating × Hours.

### Days to Complete
```
Days = End Date - Start Date
```
Only calculated for games with both dates set.

## Data Structure

### Game Object
```typescript
interface Game {
  id: string;
  userId: string;
  name: string;
  price: number;
  hours: number;
  rating: number;           // 1-10
  status: GameStatus;
  platform?: string;
  genre?: string;
  purchaseSource?: PurchaseSource;
  notes?: string;
  datePurchased?: string;   // YYYY-MM-DD
  startDate?: string;       // YYYY-MM-DD
  endDate?: string;         // YYYY-MM-DD
  playLogs?: PlayLog[];
  createdAt: string;
  updatedAt: string;
}
```

### Play Log Object
```typescript
interface PlayLog {
  id: string;
  date: string;    // YYYY-MM-DD
  hours: number;
  notes?: string;
}
```

### Status Types
- `Not Started` - In your backlog, not yet played
- `In Progress` - Currently playing
- `Completed` - Finished the game
- `Wishlist` - Want to buy in the future
- `Abandoned` - Stopped playing, won't finish

### Purchase Sources
- Steam, PlayStation, Xbox, Nintendo, Epic, GOG, Physical, Other

## File Structure

```
app/apps/game-analytics/
├── page.tsx                    # Main page with tabs
├── components/
│   ├── GameForm.tsx           # Add/edit game modal
│   ├── PlayLogModal.tsx       # Log play sessions
│   ├── TimelineView.tsx       # Timeline tab content
│   ├── StatsView.tsx          # Stats tab with charts
│   └── GameCharts.tsx         # Legacy charts (basic)
├── hooks/
│   ├── useGames.ts            # CRUD operations
│   └── useAnalytics.ts        # Metrics calculations
├── lib/
│   ├── types.ts               # TypeScript interfaces
│   ├── calculations.ts        # Pure metric functions
│   └── storage.ts             # localStorage/Firebase
└── data/
    └── baseline-games.ts      # Sample data
```

## Usage

### Adding a Game
1. Click "Add Game" button
2. Enter game name (required)
3. Select status
4. Fill in price, hours, rating
5. Optionally add platform, genre, source
6. Add dates if applicable
7. Click "Add Game"

### Logging Play Sessions
1. Hover over a game in the list
2. Click the clock icon
3. Enter date, hours, and optional notes
4. Click the + button to add
5. Click "Save Sessions"

### Viewing Analytics
1. Click the "Stats" tab
2. Scroll through the various charts
3. Hover over chart elements for details

### Loading Sample Data
- If your library is empty, click "Load Samples" to add example games with play logs

## Storage

- **Logged Out**: Data stored in localStorage
- **Logged In**: Data synced to Firebase Firestore

Data automatically switches between local and cloud storage based on authentication state.
