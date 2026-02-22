GAME ANALYTICS DASHBOARD
=======================
Instructions and Baseline Data for Claude Code Implementation

---

## TASK DESCRIPTION

Build an interactive CLI tool that:
1. Tracks game purchases with price, hours played, and rating
2. Calculates cost-per-hour and blend scores (quality + value combined)
3. Generates analytics and visualizations showing:
   - Budget burn rate over time
   - Rating distribution
   - Value-quality matrix (cost/hour vs rating)
   - Blend scores (combined metric)
4. Allows adding/updating/deleting games
5. Generates an HTML dashboard with interactive charts

---

## BASELINE DATA (2025 Games)

Name: Silent Hill 2
Price: $45
Hours: 20
Rating: 10/10
Status: Completed
Notes: Masterpiece - best value by quality/hour blend

Name: Astro Bot
Price: $70
Hours: 45
Rating: 10/10
Status: Completed
Notes: Joy machine - perfect game

Name: Ghost of Yotei
Price: $70
Hours: 80
Rating: 9/10
Status: Completed
Notes: Sony first-party - excellent value

Name: Grand Theft Auto VI
Price: $45
Hours: 15
Rating: 8/10
Status: In Progress
Notes: Solid experience

Name: Dispatch
Price: $50
Hours: 20
Rating: 8/10
Status: In Progress
Notes: Sony first-party

Name: Mafia: Definitive
Price: $10
Hours: 5
Rating: 7/10
Status: Completed
Notes: Good value despite short play

Name: Dead Rest
Price: $20
Hours: 3
Rating: 7/10
Status: Completed
Notes: Short experience

Name: Claire Obscure: Expedition 33
Price: $40
Hours: 35
Rating: 8/10
Status: Not Started
Notes: Narrative-driven, tight design

Name: Kingdom Come: Deliverance 2
Price: $10
Hours: 45
Rating: 9/10
Status: In Progress
Notes: Immersive sim, grinding through medieval life

---

## KEY METRICS TO CALCULATE

Cost Per Hour = Price / Hours
Example: $45 / 20 hours = $2.25/hour

Blend Score = (Rating × 10) + (10 - Normalized Cost)
Where Normalized Cost = min(Cost Per Hour / 3.5, 1)
Baseline = $3.50/hour ($70 game / 20 hours)
Example: Silent Hill 2 = (10 × 10) + (10 - 0.64) = 109.36

Summary Stats for 2025:
- Total Spent: $310
- Game Count: 9
- Total Hours: 243
- Average Cost/Hour: $1.28
- Average Rating: 8.6/10

---

## DATA STORAGE OPTIONS

### Option 1: JSON File (Simplest)
Storage: ./games.json
Format: JSON array of game objects
Use when: Quick implementation, single user
Load/Save: Simple file I/O

### Option 2: CSV File (Human Readable)
Storage: ./games.csv
Format: Comma-separated values
Use when: Want to edit in spreadsheet, version control friendly
Columns: id,name,price,hours,rating,date_purchased,status,notes

### Option 3: SQLite Database (Most Robust)
Storage: ./games.db
Format: SQL database
Use when: Need queries, multiple operations, scalability
Tables: games (id, name, price, hours, rating, date_purchased, status, notes, created_at, updated_at)

Recommendation: Start with JSON, upgrade to CSV if you want spreadsheet compatibility

---

## FEATURES TO IMPLEMENT

### Core Features
1. Add Game
   - Input: name, price, hours, rating, status, notes
   - Save to storage
   - Auto-calculate cost/hour and blend score

2. View All Games
   - Display in table format
   - Sort by: blend score, rating, cost/hour, price
   - Show summary stats

3. Update Game
   - Modify hours, rating, status, notes
   - Recalculate metrics

4. Delete Game
   - Remove from storage

5. Generate Report
   - Console output with statistics
   - HTML dashboard export

### Analytics Features
1. Cost Per Hour Analysis
   - Show games below/above $3.50 baseline
   - Flag exceptional value

2. Rating Distribution
   - Count games by rating (10, 9, 8, 7, etc.)
   - Show average

3. Blend Score Ranking
   - Rank games by quality + value combined
   - Top performers list

4. Budget Tracking
   - Total spent vs budget ($910 for 2026)
   - Remaining budget
   - Burn rate

---

## CLI COMMANDS TO SUPPORT

game add --name "Game Name" --price 70 --hours 20 --rating 9 --status "completed"
game list [--sort=blend|rating|cost|price]
game update --id "game-id" --hours 25 --rating 8
game delete --id "game-id"
game stats
game report [--format=console|html]
game import --file games.csv
game export --file games.csv

---

## DISPLAY FORMATS

Table View (Console):
| Name | Price | Hours | Rating | $/Hour | Blend Score |
|------|-------|-------|--------|--------|-------------|
| Silent Hill 2 | $45 | 20 | 10 | $2.25 | 109.4 |

Summary Stats:
Total Spent: $310
Games: 9
Avg Hours: 27
Avg Rating: 8.6/10
Avg Cost/Hour: $1.28

---

## FILE STRUCTURE RECOMMENDATION

game-analytics/
├── games.json (data storage)
├── commands.js (CLI command handlers)
├── store.js (data persistence layer)
├── analytics.js (calculations and metrics)
├── dashboard.js (HTML export)
└── cli.js (main entry point)


passwordofthedatabase
---

## NOTES FOR IMPLEMENTATION

- Hourly rate baseline: $40 CAD (user's after-tax rate)
- Value baseline: $3.50/hour ($70 game / 20 hours)
- Quality threshold: 15+ hours of good content = solid purchase
- 2025 Budget: $310 spent
- 2026 Budget: $910 (13 games × $70)
- 2026 Planned: Indiana Jones ($70) + Phantom Liberty ($35)