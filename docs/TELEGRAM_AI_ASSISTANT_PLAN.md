# Telegram AI Assistant - Integration Plan

> **Status**: Draft
> **Created**: 2025-01-25
> **Branch**: `claude/whatsapp-integration-plan-UIVe5`

## Table of Contents

1. [Vision](#vision)
2. [Core Concepts](#core-concepts)
3. [Score System](#score-system)
4. [Conversational Day Logging](#conversational-day-logging)
5. [Multi-Action AI](#multi-action-ai)
6. [Architecture](#architecture)
7. [Capability Registry](#capability-registry)
8. [Sample Conversations](#sample-conversations)
9. [Implementation Phases](#implementation-phases)
10. [Technical Decisions](#technical-decisions)

---

## Vision

A single Telegram chat where you talk naturally throughout the day. The AI:
- Manages your tasks, mood, time, and plans
- Accumulates context as you chat (not single request/response)
- Takes multiple actions from a single message
- Tracks a unified "life score" across all activities
- Learns your patterns and provides insights

```
You: "morning! feeling groggy but determined.
     need to finish the report and call mom"

AI: ☀️ Good morning! Day 48 started.

    📝 Mood: Logged "groggy but determined"
    ✅ Tasks added:
       • Finish the report (P2)
       • Call mom (P3)

    🎯 Today's score: 0/35 possible
       Yesterday you hit 28 - let's beat it!
```

---

## Core Concepts

### 1. AI-Native, Not Command-Based

**No commands to remember.** The AI understands natural language and figures out what to do.

| Instead of... | Just say... |
|---------------|-------------|
| `/addtask Buy groceries` | "need to buy groceries" |
| `/mood 3 --tags tired,work` | "feeling meh, tired from work" |
| `/done task_id_123` | "done with the report" |
| `/summary --date today` | "how's my day looking?" |

### 2. Continuous Conversation Context

The AI remembers your conversation throughout the day. It's not stateless.

```
9:00 AM - You: "feeling anxious about presentation"
2:00 PM - You: "presentation went great!"
6:00 PM - You: "how was my day?"

AI: Great arc today! Started anxious about the presentation,
    but it went well. Your mood improved from ~2 to ~4.
    You completed 5/7 tasks including the presentation.
```

### 3. Accumulative Day Log

Every message contributes to your day's story. The AI builds a rich picture:

```typescript
interface DayContext {
  dayNumber: number;

  // Accumulated throughout the day
  moodSnapshots: MoodSnapshot[];     // Multiple check-ins
  completedTasks: Task[];
  addedTasks: Task[];
  timeEntries: TimeEntry[];

  // AI-generated summaries
  morningMood: string;
  afternoonMood: string;
  eveningMood: string;
  dayNarrative: string;              // AI writes the story

  // Scores
  currentScore: number;
  possibleScore: number;
}
```

### 4. Multi-Action Responses

One message can trigger multiple actions. AI returns a list of what it did.

```
You: "done with report, feeling relieved, also add review PR for tomorrow"

AI: 📋 Actions taken:

    1. ✅ Marked "Finish report" complete (+5 pts)
    2. 😊 Updated mood: relieved (was: anxious)
    3. 📝 Added task "Review PR" for tomorrow

    🎯 Score: 23/35 (+5 from report)
```

---

## Score System

A unified scoring system across all apps to gamify your day.

### Score Sources

| Source | Points | Description |
|--------|--------|-------------|
| **Tasks** | 1-5 pts each | Based on priority (P1=5, P2=3, P3=2, P4=1) |
| **Mood Logging** | 2 pts/check-in | Max 3 check-ins per day (6 pts) |
| **Diary Entry** | 3 pts | Writing a meaningful diary entry |
| **Time Tracking** | 1 pt/hour | Logging tracked time |
| **Streaks** | Bonus | Consecutive days active |
| **Reflection** | 5 pts | Completing weekly review |

### Daily Score Calculation

```typescript
interface DailyScore {
  date: string;
  dayNumber: number;

  // Breakdown
  taskPoints: number;           // Sum of completed task points
  moodPoints: number;           // 2 pts per check-in (max 6)
  diaryPoints: number;          // 3 pts if diary written
  timePoints: number;           // 1 pt per hour tracked
  streakBonus: number;          // Bonus for maintaining streak

  // Totals
  earned: number;
  possible: number;             // What could have been earned
  percentage: number;

  // Streak
  currentStreak: number;
  isPersonalBest: boolean;
}
```

### Score Display

```
🎯 Day 48 Score: 28/42 (67%)

   Tasks:     18/25 pts (5 completed)
   Mood:       6/6  pts (3 check-ins)
   Diary:      3/3  pts ✓
   Time:       1/8  pts (1h tracked)

   🔥 Streak: 12 days
   📈 Weekly avg: 71%
```

### Weekly/Monthly Aggregation

```typescript
interface WeeklyScore {
  weekNumber: number;
  startDate: string;
  endDate: string;

  totalEarned: number;
  totalPossible: number;
  dailyScores: DailyScore[];

  // Achievements
  perfectDays: number;          // Days with 100%
  bestDay: DailyScore;
  improvement: number;          // vs last week
}
```

---

## Conversational Day Logging

### The Problem with Traditional Mood Apps

- Log once, forget about it
- Single data point doesn't capture day's arc
- Feels like a chore

### Our Approach: Ambient Logging

You chat naturally throughout the day. The AI extracts and accumulates:

```
8:00 AM  "morning, bit tired but ready to tackle the day"
         → MoodSnapshot { time: "08:00", mood: 3, tags: [tired, determined] }

12:30 PM "lunch break, feeling good about progress on the report"
         → MoodSnapshot { time: "12:30", mood: 4, tags: [productive, satisfied] }

3:00 PM  "ugh meeting dragged on forever"
         → MoodSnapshot { time: "15:00", mood: 2, tags: [frustrated, meetings] }

7:00 PM  "nice evening walk, feeling better"
         → MoodSnapshot { time: "19:00", mood: 4, tags: [relaxed, exercise] }
```

### Mood Snapshot Structure

```typescript
interface MoodSnapshot {
  id: string;
  dayNumber: number;
  timestamp: string;            // ISO datetime
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';

  // Extracted by AI
  mood: number;                 // 1-5 scale
  tags: string[];               // Emotions, activities
  context: string;              // Brief note
  rawMessage: string;           // Original message

  // AI interpretation
  sentiment: 'positive' | 'neutral' | 'negative';
  energyLevel: 'low' | 'medium' | 'high';
}
```

### Day Entry Composition

At end of day (or on request), AI composes the full entry:

```typescript
interface ComposedDayEntry {
  dayNumber: number;
  date: string;

  // Aggregated mood
  overallMood: number;          // Weighted average
  moodArc: 'improving' | 'declining' | 'stable' | 'variable';

  // All snapshots
  snapshots: MoodSnapshot[];

  // AI-generated
  summary: string;              // "Started tired, productive midday,
                                //  frustrated by meetings, recovered
                                //  with evening walk"

  highlights: string[];         // Key moments
  tags: string[];               // Deduplicated, ranked by frequency

  // Full diary (user can edit in app)
  diaryContent: string;         // Markdown narrative
}
```

### Example Composed Entry

```markdown
## Day 48 - Tuesday, January 28

**Overall Mood: 3.5/5** (Variable day - improving trend)

### Morning
Started tired but determined. Had coffee and planned the day.

### Afternoon
Productive stretch working on the report. Felt good about progress.
Then a long meeting killed momentum - frustrated.

### Evening
Recovered with a nice walk. Ended the day feeling relaxed.

### Mood Arc
😫 → 😊 → 😤 → 😌

### Tags
#productive #tired #meetings #frustrated #exercise #relaxed

### Tasks Completed
- ✅ Finish quarterly report (+5 pts)
- ✅ Review PRs (+2 pts)
- ✅ Team standup (+1 pt)
```

---

## Multi-Action AI

### How It Works

The AI can execute multiple capabilities from a single message:

```typescript
interface AIResponse {
  message: string;              // What AI says back
  actions: ActionResult[];      // What AI did
  score: ScoreUpdate;           // Points earned
  context: ContextUpdate;       // What AI learned
}

interface ActionResult {
  capability: string;           // e.g., "tasks.add"
  success: boolean;
  result: any;                  // Created/updated entity
  points: number;               // Points earned
  summary: string;              // Human-readable summary
}
```

### Example Multi-Action Flow

**Input:**
```
"finished the report finally! feeling relieved.
 oh and add 'send invoice' for tomorrow, high priority"
```

**AI Processing:**
```typescript
// AI identifies 3 intents:
[
  { capability: "tasks.complete", params: { fuzzyMatch: "report" } },
  { capability: "mood.log", params: { mood: 4, tags: ["relieved"] } },
  { capability: "tasks.add", params: {
      text: "Send invoice",
      date: "tomorrow",
      priority: 1
    }
  }
]
```

**Output:**
```
📋 Done! Here's what I did:

1. ✅ Completed "Finish quarterly report"
   → +5 pts (P1 task)

2. 😌 Logged mood: relieved (4/5)
   → +2 pts (afternoon check-in)
   Your mood improved from this morning!

3. 📝 Added "Send invoice" for tomorrow
   → Priority 1, 5 pts possible

🎯 Score update: 27/42 → 34/42 (+7 pts!)
```

### Action Chaining

Some actions can trigger follow-up suggestions:

```
You: "done with all my tasks!"

AI: 🎉 Wow, clean sweep! All 6 tasks completed.

    Actions:
    1. ✅ Marked "Review PR" complete (+2 pts)
    2. ✅ Marked "Send email" complete (+1 pt)
    [... all tasks ...]

    🎯 Score: 42/42 (100%!) 🏆

    Since you crushed it today, want me to:
    • Pull in a task from tomorrow?
    • Log this as a highlight in your diary?
    • Just celebrate? 🎊
```

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        TELEGRAM                              │
│                     (User Interface)                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    WEBHOOK HANDLER                           │
│                  /api/telegram/webhook                       │
│                                                              │
│  • Validates request                                         │
│  • Extracts message                                          │
│  • Identifies user                                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      AI BRAIN                                │
│                  lib/ai-assistant/                           │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │  Context   │  │ Capability │  │   Claude   │            │
│  │  Builder   │→ │  Registry  │→ │    API     │            │
│  └────────────┘  └────────────┘  └────────────┘            │
│         │                              │                     │
│         ▼                              ▼                     │
│  ┌────────────┐                 ┌────────────┐              │
│  │   User     │                 │   Action   │              │
│  │  Context   │                 │  Executor  │              │
│  └────────────┘                 └────────────┘              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    APP REPOSITORIES                          │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │  Tasks   │ │   Mood   │ │   Time   │ │  Score   │       │
│  │   Repo   │ │   Repo   │ │   Repo   │ │   Repo   │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                              │
│              Firebase / localStorage                         │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
app/
├── api/
│   └── telegram/
│       ├── webhook/
│       │   └── route.ts              # Main webhook handler
│       └── admin/
│           └── route.ts              # Manual message send
│
├── apps/
│   ├── daily-tasks/
│   │   └── lib/
│   │       ├── capabilities.ts       # Task capabilities
│   │       └── ...existing...
│   │
│   ├── mood-tracker/
│   │   └── lib/
│   │       ├── capabilities.ts       # Mood capabilities
│   │       ├── snapshots.ts          # Mood snapshot logic
│   │       └── ...existing...
│   │
│   ├── time-tracker/
│   │   └── lib/
│   │       ├── capabilities.ts       # Time capabilities
│   │       └── ...existing...
│   │
│   └── telegram-settings/            # Bot configuration UI
│       ├── page.tsx
│       └── components/
│           ├── BotStatus.tsx
│           ├── ConversationLog.tsx
│           └── ScoreBoard.tsx

lib/
├── telegram/
│   ├── bot.ts                        # Telegram API client
│   ├── types.ts                      # Telegram types
│   ├── formatter.ts                  # Format responses
│   └── scheduler.ts                  # Scheduled messages
│
├── ai-assistant/
│   ├── brain.ts                      # Main orchestrator
│   ├── capability-registry.ts        # Discovers capabilities
│   ├── context-builder.ts            # Builds AI context
│   ├── action-executor.ts            # Runs capability actions
│   ├── conversation-memory.ts        # Tracks conversation
│   └── types.ts
│
├── scoring/
│   ├── calculator.ts                 # Score calculations
│   ├── streaks.ts                    # Streak tracking
│   ├── storage.ts                    # Score repository
│   └── types.ts
│
└── capabilities/
    ├── types.ts                      # Capability interfaces
    └── index.ts                      # Exports all capabilities
```

### Data Models

#### Conversation Memory

```typescript
// Stored in Firebase: conversations/{oduserId}
interface ConversationMemory {
  userId: string;

  // Recent messages (last 50)
  messages: ConversationMessage[];

  // Today's accumulated context
  todayContext: {
    dayNumber: number;
    moodSnapshots: MoodSnapshot[];
    tasksDiscussed: string[];        // Task IDs mentioned
    topicsDiscussed: string[];       // AI-extracted topics
    pendingActions: PendingAction[]; // "Should I do X?"
  };

  // Long-term patterns (AI updates periodically)
  patterns: {
    preferredCheckInTimes: string[];
    commonMoodTags: string[];
    taskCompletionRate: number;
    averageDailyScore: number;
  };

  updatedAt: string;
}

interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  actions?: ActionResult[];          // What AI did in response
}
```

#### Score Records

```typescript
// Stored in Firebase: scores/{oduserId}/daily/{date}
interface DailyScoreRecord {
  id: string;
  userId: string;
  date: string;
  dayNumber: number;

  // Point breakdown
  points: {
    tasks: number;
    mood: number;
    diary: number;
    time: number;
    bonus: number;
  };

  earned: number;
  possible: number;

  // Streak info
  streakDay: number;
  isPersonalBest: boolean;

  createdAt: string;
  updatedAt: string;
}

// Stored in Firebase: scores/{userId}/streaks
interface StreakRecord {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  streakStartDate: string;
}
```

---

## Capability Registry

### Capability Interface

```typescript
interface Capability {
  // Identity
  name: string;                       // e.g., "tasks.add"
  app: string;                        // e.g., "daily-tasks"

  // For AI understanding
  description: string;                // What it does
  examples: string[];                 // Example phrases that trigger it

  // Parameters
  parameters: z.ZodSchema;            // Zod schema for validation

  // Execution
  execute: (
    params: any,
    userId: string,
    context: ExecutionContext
  ) => Promise<ActionResult>;

  // Scoring
  points?: number | ((result: any) => number);
}
```

### Task Capabilities

```typescript
// app/apps/daily-tasks/lib/capabilities.ts

export const taskCapabilities: Capability[] = [
  {
    name: "tasks.add",
    app: "daily-tasks",
    description: "Add a new task to the todo list",
    examples: [
      "add buy groceries",
      "remind me to call mom",
      "I need to finish the report",
      "todo: send invoice tomorrow",
    ],
    parameters: z.object({
      text: z.string().describe("Task description"),
      date: z.string().optional().describe("Date (default: today)"),
      priority: z.number().min(1).max(4).optional()
        .describe("Priority 1-4, where 1 is highest"),
      points: z.number().optional()
        .describe("Custom point value"),
    }),
    execute: async (params, userId, context) => {
      const task = await taskRepository.create({
        text: params.text,
        date: params.date || context.today,
        priority: params.priority || 3,
        points: params.points || priorityToPoints(params.priority || 3),
        userId,
      });
      return {
        capability: "tasks.add",
        success: true,
        result: task,
        points: 0,  // No points for adding, only completing
        summary: `Added "${task.text}" for ${formatDate(task.date)}`,
      };
    },
  },

  {
    name: "tasks.complete",
    app: "daily-tasks",
    description: "Mark a task as complete/done",
    examples: [
      "done with the report",
      "finished grocery shopping",
      "mark call mom as complete",
      "I did the thing",
    ],
    parameters: z.object({
      taskId: z.string().optional().describe("Exact task ID"),
      fuzzyMatch: z.string().optional().describe("Text to match task"),
    }),
    execute: async (params, userId, context) => {
      const task = params.taskId
        ? await taskRepository.getById(params.taskId)
        : await findTaskByFuzzyMatch(params.fuzzyMatch, userId, context.today);

      if (!task) {
        return {
          capability: "tasks.complete",
          success: false,
          result: null,
          points: 0,
          summary: `Couldn't find task matching "${params.fuzzyMatch}"`,
        };
      }

      const updated = await taskRepository.update(task.id, {
        completed: true,
        completedAt: new Date().toISOString(),
      });

      const points = task.points || priorityToPoints(task.priority);

      return {
        capability: "tasks.complete",
        success: true,
        result: updated,
        points,
        summary: `Completed "${task.text}" (+${points} pts)`,
      };
    },
    points: (result) => result.result?.points || 0,
  },

  {
    name: "tasks.list",
    app: "daily-tasks",
    description: "Show tasks for today or a specific date",
    examples: [
      "what's on my list?",
      "show my tasks",
      "what do I need to do today?",
      "tasks for tomorrow",
    ],
    parameters: z.object({
      date: z.string().optional().describe("Date to show (default: today)"),
      includeCompleted: z.boolean().optional().default(true),
    }),
    execute: async (params, userId, context) => {
      const date = params.date || context.today;
      const tasks = await taskRepository.getByDate(userId, date);

      return {
        capability: "tasks.list",
        success: true,
        result: tasks,
        points: 0,
        summary: `Found ${tasks.length} tasks for ${formatDate(date)}`,
      };
    },
  },

  {
    name: "tasks.reschedule",
    app: "daily-tasks",
    description: "Move a task to a different date",
    examples: [
      "move report to tomorrow",
      "reschedule call mom to friday",
      "push back the meeting prep",
    ],
    parameters: z.object({
      fuzzyMatch: z.string().describe("Task to move"),
      newDate: z.string().describe("New date"),
    }),
    execute: async (params, userId, context) => {
      const task = await findTaskByFuzzyMatch(params.fuzzyMatch, userId);
      if (!task) {
        return {
          capability: "tasks.reschedule",
          success: false,
          result: null,
          points: 0,
          summary: `Couldn't find task matching "${params.fuzzyMatch}"`,
        };
      }

      const updated = await taskRepository.update(task.id, {
        date: params.newDate,
      });

      return {
        capability: "tasks.reschedule",
        success: true,
        result: updated,
        points: 0,
        summary: `Moved "${task.text}" to ${formatDate(params.newDate)}`,
      };
    },
  },
];
```

### Mood Capabilities

```typescript
// app/apps/mood-tracker/lib/capabilities.ts

export const moodCapabilities: Capability[] = [
  {
    name: "mood.snapshot",
    app: "mood-tracker",
    description: "Log current mood/feeling (can be done multiple times per day)",
    examples: [
      "feeling anxious",
      "mood is 3/5 today",
      "I'm happy!",
      "bit tired but okay",
      "stressed about work",
    ],
    parameters: z.object({
      mood: z.number().min(1).max(5).optional()
        .describe("Mood score 1-5"),
      tags: z.array(z.string()).optional()
        .describe("Emotion/activity tags"),
      context: z.string().optional()
        .describe("Brief note about the mood"),
      rawMessage: z.string()
        .describe("Original user message"),
    }),
    execute: async (params, userId, context) => {
      const snapshot: MoodSnapshot = {
        id: generateId(),
        dayNumber: context.dayNumber,
        timestamp: new Date().toISOString(),
        timeOfDay: getTimeOfDay(),
        mood: params.mood || inferMoodFromText(params.rawMessage),
        tags: params.tags || extractTagsFromText(params.rawMessage),
        context: params.context || params.rawMessage,
        rawMessage: params.rawMessage,
        sentiment: inferSentiment(params.rawMessage),
        energyLevel: inferEnergyLevel(params.rawMessage),
      };

      await moodSnapshotRepository.create(snapshot, userId);

      // Check how many snapshots today for points
      const todaySnapshots = await moodSnapshotRepository.getByDay(
        userId,
        context.dayNumber
      );
      const points = todaySnapshots.length <= 3 ? 2 : 0; // Max 3 scoring check-ins

      return {
        capability: "mood.snapshot",
        success: true,
        result: snapshot,
        points,
        summary: `Logged mood: ${snapshot.tags.join(', ')} (${snapshot.mood}/5)`,
      };
    },
    points: 2,
  },

  {
    name: "mood.diary",
    app: "mood-tracker",
    description: "Add a longer diary/journal entry",
    examples: [
      "I want to write about my day",
      "let me journal about...",
      "diary entry: today was...",
    ],
    parameters: z.object({
      content: z.string().describe("Diary content (markdown)"),
      dayNumber: z.number().optional(),
    }),
    execute: async (params, userId, context) => {
      const dayNumber = params.dayNumber || context.dayNumber;

      // Append to existing diary or create new
      const existing = await dayEntryRepository.getByDayNumber(userId, dayNumber);

      const newContent = existing?.diaryContent
        ? `${existing.diaryContent}\n\n${params.content}`
        : params.content;

      const entry = existing
        ? await dayEntryRepository.update(existing.id, { diaryContent: newContent })
        : await dayEntryRepository.create({
            dayNumber,
            diaryContent: newContent,
            userId,
          });

      return {
        capability: "mood.diary",
        success: true,
        result: entry,
        points: 3,
        summary: "Added to diary entry",
      };
    },
    points: 3,
  },

  {
    name: "mood.history",
    app: "mood-tracker",
    description: "Review mood history and patterns",
    examples: [
      "how was my week?",
      "mood trends",
      "how have I been feeling lately?",
      "show me last week's moods",
    ],
    parameters: z.object({
      range: z.enum(['day', 'week', 'month']).default('week'),
      startDay: z.number().optional(),
    }),
    execute: async (params, userId, context) => {
      const entries = await getMoodHistory(userId, params.range, context.dayNumber);
      const analysis = analyzeMoodPatterns(entries);

      return {
        capability: "mood.history",
        success: true,
        result: { entries, analysis },
        points: 0,
        summary: `Mood analysis for past ${params.range}`,
      };
    },
  },

  {
    name: "mood.compose",
    app: "mood-tracker",
    description: "Compose full day entry from snapshots (usually end of day)",
    examples: [
      "compose my day",
      "wrap up today's mood",
      "create day summary",
    ],
    parameters: z.object({
      dayNumber: z.number().optional(),
    }),
    execute: async (params, userId, context) => {
      const dayNumber = params.dayNumber || context.dayNumber;
      const snapshots = await moodSnapshotRepository.getByDay(userId, dayNumber);

      const composed = await composesDayEntry(snapshots, userId, dayNumber);

      return {
        capability: "mood.compose",
        success: true,
        result: composed,
        points: 0,
        summary: `Composed Day ${dayNumber} entry from ${snapshots.length} check-ins`,
      };
    },
  },
];
```

### Score Capabilities

```typescript
// lib/scoring/capabilities.ts

export const scoreCapabilities: Capability[] = [
  {
    name: "score.today",
    app: "scoring",
    description: "Get today's score summary",
    examples: [
      "what's my score?",
      "how am I doing today?",
      "points?",
      "show score",
    ],
    parameters: z.object({}),
    execute: async (params, userId, context) => {
      const score = await calculateDailyScore(userId, context.today);

      return {
        capability: "score.today",
        success: true,
        result: score,
        points: 0,
        summary: `Today: ${score.earned}/${score.possible} pts (${score.percentage}%)`,
      };
    },
  },

  {
    name: "score.streak",
    app: "scoring",
    description: "Get streak information",
    examples: [
      "what's my streak?",
      "how many days in a row?",
      "streak status",
    ],
    parameters: z.object({}),
    execute: async (params, userId, context) => {
      const streak = await getStreakInfo(userId);

      return {
        capability: "score.streak",
        success: true,
        result: streak,
        points: 0,
        summary: `🔥 ${streak.current} day streak (best: ${streak.longest})`,
      };
    },
  },

  {
    name: "score.weekly",
    app: "scoring",
    description: "Get weekly score summary",
    examples: [
      "weekly score",
      "how was my week?",
      "this week's points",
    ],
    parameters: z.object({
      weekOffset: z.number().default(0).describe("0 = this week, -1 = last week"),
    }),
    execute: async (params, userId, context) => {
      const weekly = await calculateWeeklyScore(userId, params.weekOffset);

      return {
        capability: "score.weekly",
        success: true,
        result: weekly,
        points: 0,
        summary: `Week ${weekly.weekNumber}: ${weekly.totalEarned} pts, ${weekly.perfectDays} perfect days`,
      };
    },
  },
];
```

### Cross-App Capabilities

```typescript
// lib/capabilities/cross-app.ts

export const crossAppCapabilities: Capability[] = [
  {
    name: "daily.summary",
    app: "cross-app",
    description: "Get complete summary of current day across all apps",
    examples: [
      "summarize my day",
      "daily summary",
      "how's today looking?",
      "give me the rundown",
    ],
    parameters: z.object({
      date: z.string().optional(),
    }),
    execute: async (params, userId, context) => {
      const date = params.date || context.today;

      const [tasks, moodSnapshots, timeEntries, score] = await Promise.all([
        taskRepository.getByDate(userId, date),
        moodSnapshotRepository.getByDay(userId, context.dayNumber),
        timeEntryRepository.getByDate(userId, date),
        calculateDailyScore(userId, date),
      ]);

      return {
        capability: "daily.summary",
        success: true,
        result: { tasks, moodSnapshots, timeEntries, score },
        points: 0,
        summary: "Full day summary",
      };
    },
  },

  {
    name: "daily.plan",
    app: "cross-app",
    description: "Get AI help planning the day",
    examples: [
      "help me plan today",
      "what should I focus on?",
      "plan my day",
      "morning planning",
    ],
    parameters: z.object({}),
    execute: async (params, userId, context) => {
      const tasks = await taskRepository.getByDate(userId, context.today);
      const overdueTasks = await taskRepository.getIncompleteBefore(userId, context.today);
      const moodPatterns = await getMoodPatterns(userId);

      return {
        capability: "daily.plan",
        success: true,
        result: { tasks, overdueTasks, moodPatterns },
        points: 0,
        summary: "Here's your day plan",
        // AI will use this data to generate personalized recommendations
      };
    },
  },

  {
    name: "weekly.review",
    app: "cross-app",
    description: "Generate comprehensive weekly review",
    examples: [
      "weekly review",
      "review my week",
      "how did this week go?",
      "week in review",
    ],
    parameters: z.object({
      weekOffset: z.number().default(0),
    }),
    execute: async (params, userId, context) => {
      // Gather all data for the week
      const weekData = await gatherWeekData(userId, params.weekOffset);

      return {
        capability: "weekly.review",
        success: true,
        result: weekData,
        points: 5, // Bonus for doing review!
        summary: "Weekly review generated",
      };
    },
    points: 5,
  },
];
```

---

## Sample Conversations

### Morning Start

```
USER: morning! feeling a bit groggy but ready to tackle the day

AI: ☀️ Good morning! Day 48 started.

    😴 Mood logged: groggy but determined (3/5)
       Tags: #groggy #determined #morning
       +2 pts (morning check-in)

    📋 You have 5 tasks today (18 pts possible):
       ⚡ Finish quarterly report (P1, 5pts)
       ⚡ Client call at 2pm (P1, 5pts)
       • Review PRs (P2, 3pts)
       • Update documentation (P3, 2pts)
       • Clean inbox (P4, 1pt)

    🎯 Score: 2/42 • 🔥 Streak: 11 days

    Yesterday you scored 35/40 (87%) - nice!


USER: actually add "prep for client call" before the call, high priority

AI: 📝 Added "Prep for client call"
    → Priority 1, 5 pts
    → I put it before "Client call at 2pm"

    📋 Updated tasks (23 pts possible):
       ⚡ Finish quarterly report (P1)
       ⚡ Prep for client call (P1) ← NEW
       ⚡ Client call at 2pm (P1)
       • Review PRs (P2)
       • Update documentation (P3)
       • Clean inbox (P4)


USER: what should I focus on first?

AI: Looking at your day:

    🎯 Recommended focus order:

    1. Finish quarterly report (P1)
       → Big task, do it with fresh energy
       → Estimated: 1-2 hours

    2. Prep for client call (P1)
       → Do this 30min before the call
       → Estimated: 30 min

    3. Client call at 2pm (P1)
       → Blocked time

    💡 Based on your patterns, you're most productive
       before lunch. Tackle the report first!

    Want me to time-block this for you?
```

### Midday Check-in

```
USER: just finished the report, feeling good about it!

AI: 📋 Actions completed:

    1. ✅ Completed "Finish quarterly report"
       → +5 pts (P1 task done!)

    2. 😊 Mood update: feeling good, satisfied
       → +2 pts (midday check-in)
       → Improved from this morning (3 → 4)
       → Tags: #productive #satisfied

    🎯 Score: 9/47 → 16/47 (+7 pts!)

    Great progress! 3 high-priority tasks left.
    Next up: Prep for client call (in 2 hours)


USER: oh I also need to send the invoice to acme corp,
and schedule a dentist appointment sometime this week

AI: 📝 Added 2 tasks:

    1. "Send invoice to Acme Corp"
       → Today, Priority 2 (3 pts)
       → Business task, should do today

    2. "Schedule dentist appointment"
       → This week (Friday), Priority 4 (1 pt)
       → Flexible timing, moved to end of week

    📋 Today now has 7 tasks (26 pts possible)

    Want me to remind you about the invoice after your call?


USER: yes please

AI: ⏰ Got it! I'll remind you about the invoice
    after "Client call at 2pm" is marked done.

    Pending reminders:
    • After client call → Send invoice to Acme Corp
```

### Afternoon Frustration

```
USER: ugh that meeting went way too long, so frustrating

AI: 😤 I hear you. Logged the frustration.

    Mood update: frustrated (2/5)
    → Tags: #frustrated #meetings #overtime
    → This is your 3rd check-in today

    📊 Your mood today:
       Morning: 3/5 (groggy but determined)
       Midday:  4/5 (satisfied after report)
       Now:     2/5 (meeting frustration)

    You still have:
    • Send invoice to Acme Corp (2 pts)
    • Update documentation (2 pts)
    • Clean inbox (1 pt)

    Want to:
    • Push non-urgent tasks to tomorrow?
    • Take a short break and reset?
    • Just vent? I'm here to listen.


USER: move the docs update to tomorrow, I'll do the invoice and inbox

AI: 📝 Done:

    1. 📅 Moved "Update documentation" → Tomorrow

    Today's remaining (4 pts possible):
    • Send invoice to Acme Corp (3 pts)
    • Clean inbox (1 pt)

    🎯 Score: 21/43 so far

    You've got this. Small wins to end the day! 💪
```

### Evening Wrap-up

```
USER: done with everything! feeling better after a walk

AI: 🎉 Amazing finish to the day!

    📋 Actions:

    1. ✅ Completed "Send invoice to Acme Corp" (+3 pts)
    2. ✅ Completed "Clean inbox" (+1 pt)
    3. 😌 Mood logged: feeling better, refreshed
       → Tags: #relaxed #exercise #recovered
       → Great recovery from afternoon frustration!

    🎯 Day 48 Final Score: 29/43 (67%)

    📊 Day Summary:
       ✅ Tasks: 5/6 completed
       😊 Mood arc: groggy → satisfied → frustrated → relaxed
       🔥 Streak: 12 days!

    Your mood recovered nicely after that walk.
    Exercise seems to help when you're frustrated.
    (This is the 3rd time I've noticed this pattern!)

    Want me to compose your full day entry?


USER: yes please

AI: 📔 Day 48 Entry Composed:

    ─────────────────────────────
    Day 48 - Tuesday, Jan 28
    Overall: 3.5/5 (Variable → Improving)
    ─────────────────────────────

    MORNING
    Started groggy but determined. Planned to
    tackle the quarterly report first.

    MIDDAY
    Finished the report - felt satisfied!
    Good productive flow until the client call.

    AFTERNOON
    Client call went well but follow-up meeting
    dragged on. Felt frustrated by the overtime.
    Decided to push docs update to tomorrow.

    EVENING
    Recovered with a walk. Ended feeling relaxed.
    Completed invoice and inbox clearing.

    KEY MOMENTS
    • ✅ Quarterly report finished
    • ✅ Client call handled well
    • 😤 Meeting frustration
    • 😌 Walk helped reset mood

    TAGS
    #productive #meetings #frustrated #exercise #recovered
    ─────────────────────────────

    Entry saved to mood tracker.
    View/edit in app: [Mood Tracker →]


USER: nice, thanks!

AI: You're welcome! 🌙

    Quick stats before you go:

    🎯 Score: 29/43 (67%)
    🔥 Streak: 12 days
    📈 This week: 71% avg (↑5% from last week)

    Tomorrow you have:
    • Update documentation (carried over)
    • Schedule dentist appointment

    Rest well! See you tomorrow ☀️
```

### Weekly Review

```
USER: can I get a weekly review?

AI: 📊 Week 7 Review (Day 42-48)

    ═══════════════════════════════════════
    OVERVIEW
    ═══════════════════════════════════════

    🎯 Total Score: 198/280 (71%)
       ↑ 5% improvement from last week!

    ✅ Tasks Completed: 32/41 (78%)
       Best day: Wednesday (6/6, 100%)
       Carried over: 4 tasks

    😊 Average Mood: 3.4/5
       Trend: Slight improvement
       Best day: Saturday (4.2/5)
       Hardest: Thursday (2.8/5)

    ⏰ Time Tracked: 24 hours
       Deep work: 14h (58%)
       Meetings: 6h (25%)
       Admin: 4h (17%)

    ═══════════════════════════════════════
    PATTERNS & INSIGHTS
    ═══════════════════════════════════════

    📈 Mood-Productivity Correlation
       Days with 4+ tasks done: avg mood 3.8
       Days with <3 tasks done: avg mood 2.9

    🏃 Recovery Pattern
       Exercise mentioned 3 times
       Each time, mood improved by ~1.5 points
       Consider: scheduling regular walks?

    😤 Frustration Trigger
       3/4 low-mood moments involved meetings
       Thursdays seem particularly rough

    ⚡ Peak Performance
       Most productive: Tue-Wed mornings
       Consider: protect this time for deep work

    ═══════════════════════════════════════
    HIGHLIGHTS
    ═══════════════════════════════════════

    • Finished quarterly report (big win!)
    • Maintained 12-day streak
    • Mood trended upward overall
    • 2 perfect-score days

    ═══════════════════════════════════════
    NEXT WEEK SUGGESTIONS
    ═══════════════════════════════════════

    1. Block Tuesday & Wednesday mornings
    2. Add "afternoon walk" on meeting-heavy days
    3. Move non-urgent tasks away from Thursday

    +5 pts for completing weekly review! 🎉

    Want me to help plan next week?
```

### Natural Multi-Intent

```
USER: good morning, feeling energetic! add gym at 6pm,
mark yesterday's laundry as done, and what's my streak?

AI: ☀️ Good morning! Let me handle all of that:

    📋 Actions completed:

    1. 😊 Mood logged: energetic (4/5)
       → Great way to start Day 49!
       → +2 pts

    2. 📝 Added "Gym" for today at 6pm
       → Priority 3, 2 pts

    3. ✅ Marked "Do laundry" (yesterday) complete
       → +1 pt (late completion, reduced points)

    4. 🔥 Streak Status:
       → Current: 13 days!
       → Longest ever: 21 days
       → 8 more days to beat your record!

    🎯 Day 49 Score: 3/28 so far

    You have 4 tasks today. Ready to crush it?
```

---

## Implementation Phases

### Phase 1: Foundation (Core Infrastructure)
- [ ] Telegram bot creation (BotFather)
- [ ] Webhook endpoint `/api/telegram/webhook`
- [ ] Basic message handling
- [ ] Claude API integration
- [ ] Capability registry architecture
- [ ] Basic task capabilities (add, complete, list)
- [ ] Authentication linking (Telegram → Firebase user)

### Phase 2: Mood & Scoring
- [ ] Mood snapshot system
- [ ] Multiple daily check-ins
- [ ] Score calculation engine
- [ ] Streak tracking
- [ ] Basic mood capabilities
- [ ] Score capabilities

### Phase 3: Context & Memory
- [ ] Conversation memory storage
- [ ] Day context accumulation
- [ ] User patterns tracking
- [ ] Context-aware responses
- [ ] Fuzzy task matching

### Phase 4: Multi-Action & Composition
- [ ] Multi-action execution
- [ ] Day entry composition
- [ ] Cross-app capabilities
- [ ] Daily/weekly summaries

### Phase 5: Proactive Features
- [ ] Scheduled messages (morning/evening)
- [ ] Smart suggestions
- [ ] Reminders system
- [ ] Pattern-based insights

### Phase 6: Polish & UI
- [ ] Telegram settings page in app
- [ ] Conversation history view
- [ ] Score dashboard
- [ ] Rich message formatting
- [ ] Inline buttons for quick actions

---

## Technical Decisions

### Confirmed Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Messaging Platform | Telegram | Free, easy setup, rich features |
| AI Model | Claude Sonnet | Good balance of speed & capability |
| Webhook Hosting | Vercel (existing) | Already deployed, serverless |
| Data Storage | Firebase (existing) | Already integrated, real-time |
| Score Storage | Firebase | Per-user, synced |

### Open Decisions

| Decision | Options | Considerations |
|----------|---------|----------------|
| Scheduled Messages | Vercel Cron vs External | Vercel cron has limits, external adds complexity |
| Conversation Memory | Firebase vs Redis | Firebase simpler, Redis faster for real-time |
| Voice Messages | Transcribe or skip | Adds complexity, could be Phase 6+ |
| Multiple Users | Shared bot vs per-user | Shared is simpler, per-user more private |

### Environment Variables Needed

```env
# Telegram
TELEGRAM_BOT_TOKEN=xxx
TELEGRAM_WEBHOOK_SECRET=xxx

# AI
ANTHROPIC_API_KEY=xxx

# Existing
FIREBASE_* (already configured)
```

---

## Appendix: Message Formatting

### Telegram Markdown (MarkdownV2)

```typescript
// lib/telegram/formatter.ts

export function formatResponse(response: AIResponse): string {
  const parts: string[] = [];

  // Main message
  parts.push(response.message);

  // Actions taken
  if (response.actions.length > 0) {
    parts.push('\n📋 *Actions:*\n');
    response.actions.forEach((action, i) => {
      const icon = action.success ? '✅' : '❌';
      parts.push(`${i + 1}\\. ${icon} ${escapeMarkdown(action.summary)}`);
      if (action.points > 0) {
        parts.push(` \\(\\+${action.points} pts\\)`);
      }
      parts.push('\n');
    });
  }

  // Score update
  if (response.score) {
    parts.push(`\n🎯 *Score:* ${response.score.earned}/${response.score.possible}`);
    if (response.score.streak > 0) {
      parts.push(` • 🔥 ${response.score.streak} day streak`);
    }
  }

  return parts.join('');
}
```

### Emoji Reference

| Category | Emoji | Usage |
|----------|-------|-------|
| Morning | ☀️ | Morning greeting |
| Evening | 🌙 | Evening wrap-up |
| Task done | ✅ | Task completed |
| Task added | 📝 | Task created |
| High priority | ⚡ | P1 tasks |
| Mood good | 😊 | Positive mood |
| Mood neutral | 😐 | Neutral mood |
| Mood bad | 😔 | Negative mood |
| Score | 🎯 | Score display |
| Streak | 🔥 | Streak count |
| Celebration | 🎉 | Achievements |
| List | 📋 | Task lists, actions |
| Diary | 📔 | Diary entries |
| Stats | 📊 | Analytics |
| Tip | 💡 | Suggestions |

---

*This is a living document. Update as implementation progresses.*
