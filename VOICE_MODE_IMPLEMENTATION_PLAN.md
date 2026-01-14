# Voice Mode Implementation Plan for Mood Tracker

## 🎯 Vision

Create a conversational voice journaling experience where users can naturally narrate their day, and an AI companion helps capture their mood, activities, and thoughts with intelligent interpretation.

---

## 📋 User Requirements Summary

### Core Features
1. **Voice Input**: Speech-to-text capture of user narration
2. **Conversational AI**: AI can ask follow-up questions and interpret responses
3. **Date Intelligence**: Understand references to "today", "yesterday", etc.
4. **Multi-Action Processing**: Extract mood ratings, tags, and diary content from narration
5. **Preview with Timestamps**: Show AI interpretation before saving to diary
6. **Separate Modal**: Dedicated voice journaling interface

### Example User Flow
```
User clicks: "🎤 Voice Journal" button
→ Voice modal opens
→ User: "Today was pretty good, I'd say a 4. I went running in the morning..."
→ AI processes and shows preview:
   Date: January 14, 2026 (Today - Day 200)
   Mood: 4/5
   Tags: Running
   Diary entry: "Today was pretty good, I'd say a 4. I went running in the morning..."
   Timestamp: 2:30 PM
→ User confirms
→ Entry saved to today's log
```

---

## 🚀 Implementation Phases

### **Phase 1: Foundation - Speech-to-Text + AI Interpretation** ⭐ START HERE
> Basic working version with AI-powered interpretation

**What it does:**
- User speaks into microphone
- Real-time speech-to-text transcription
- AI analyzes transcript and extracts actions
- Shows preview of interpreted data
- User confirms and saves to diary with timestamp

**Timeline:** Start with this, can be working in a few hours

### **Phase 2: Conversational Enhancement** 🎙️ FUTURE
> Add back-and-forth dialogue capabilities

**What it adds:**
- AI asks follow-up questions
- Multi-turn conversation
- Voice responses from AI (text-to-speech)
- Real-time streaming responses
- Contextual question generation

**Timeline:** After Phase 1 is working and tested

---

## 🏗️ Phase 1 Technical Architecture

### Components to Build

#### 1. **VoiceJournalModal.tsx**
Location: `app/apps/mood-tracker/components/VoiceJournalModal.tsx`

**Purpose:** Main UI for voice journaling

**Features:**
- Microphone button (tap to start/stop)
- Real-time transcription display
- Voice level indicator (animated while recording)
- Status messages ("Listening...", "Processing...", "Ready to save")
- Preview section with interpreted data
- Confirm/Edit/Cancel actions

**State Management:**
```typescript
- isListening: boolean
- transcript: string
- isProcessing: boolean
- interpretation: InterpretedData | null
- error: string | null
```

#### 2. **useVoiceRecognition.ts**
Location: `app/apps/mood-tracker/hooks/useVoiceRecognition.ts`

**Purpose:** Handle Web Speech API integration

**Features:**
- Start/stop voice recognition
- Continuous listening with interim results
- Browser compatibility detection
- Error handling (no mic, permission denied, etc.)

**API Used:** [Web Speech API - SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)

#### 3. **AI Interpretation Service**
Location: `app/apps/mood-tracker/lib/ai-voice-service.ts`

**Purpose:** Parse voice transcript and extract structured data

**Key Function:**
```typescript
async function interpretVoiceJournal(
  transcript: string,
  context: {
    currentDate: string,
    availableTags: Tag[],
    recentEntries: DayEntry[]
  }
): Promise<InterpretedData>
```

**AI Prompt Strategy:**
```
System: You are a journaling assistant. Parse the user's voice transcript
and extract:
1. Target date (today, yesterday, specific date)
2. Mood rating (1-5 scale)
3. Activities/tags mentioned
4. Diary content

User transcript: "{transcript}"

Available tags: [{tag list}]
Current date: {date}

Respond in JSON format:
{
  "targetDate": "2026-01-14",
  "dayNumber": 200,
  "mood": 4,
  "tags": ["running", "gaming"],
  "suggestedNewTags": ["meditation"],
  "diaryContent": "Full transcript text",
  "confidence": "high"
}
```

#### 4. **Preview Component**
Location: `app/apps/mood-tracker/components/VoiceJournalPreview.tsx`

**Purpose:** Display AI interpretation for user review

**Shows:**
- 📅 Date identified
- 😊 Mood rating (with emoji scale)
- 🏷️ Tags detected (existing + new suggestions)
- 📝 Diary content
- ⏰ Timestamp for entry
- ⚠️ Confidence indicator (AI certainty)

**Actions:**
- ✅ Confirm & Save
- ✏️ Edit (opens regular day modal with pre-filled data)
- 🔄 Try Again (re-record)
- ❌ Cancel

---

## 📊 Data Structures

### InterpretedData Interface
```typescript
interface InterpretedData {
  targetDate: string;           // ISO date string
  dayNumber: number;            // Calculated day number
  mood: number | null;          // 1-5 or null if not mentioned
  existingTagIds: string[];     // Matched to existing tags
  suggestedNewTags: Array<{     // New tags to create
    name: string;
    emoji: string;
    categoryId: string;
  }>;
  diaryContent: string;         // Full transcript
  timestamp: string;            // Time of recording
  confidence: 'high' | 'medium' | 'low';
  ambiguities: string[];        // Things AI wasn't sure about
}
```

### VoiceJournalEntry (for diary)
```typescript
interface VoiceJournalEntry {
  timestamp: string;            // "2:30 PM"
  content: string;              // Transcript
  addedVia: 'voice';           // Marker for voice entries
}
```

**Diary Format:**
```
📝 **2:30 PM** (via 🎤 voice)
Today was pretty good, I'd say a 4. I went running in the morning
and played some games at night. Felt really productive.

---

📝 **8:45 PM** (via 🎤 voice)
Quick update: just finished a great workout session!
```

---

## 🎨 UI/UX Flow

### Entry Point
**Location:** Main mood tracker page

```
┌─────────────────────────────────────┐
│ Mood Tracker               [Manage] │
│                                      │
│ [Mood View] [Tag View]      2026    │
│                                      │
│           [🎤 Voice Journal]  ← NEW  │
│                                      │
│ [Year Grid Visualization]            │
└─────────────────────────────────────┘
```

### Voice Journal Modal Flow

#### Step 1: Ready State
```
╔═══════════════════════════════════════╗
║    🎤 Voice Journal - Day 200         ║
╠═══════════════════════════════════════╣
║                                       ║
║           [  🎤  ]  ← Large button    ║
║         Tap to start                  ║
║                                       ║
║  💡 Tip: Tell me about your day!      ║
║  I can understand:                    ║
║  • How you're feeling (mood 1-5)     ║
║  • What you did (activities/tags)    ║
║  • When it happened (today/yesterday)║
║                                       ║
╚═══════════════════════════════════════╝
```

#### Step 2: Listening State
```
╔═══════════════════════════════════════╗
║    🎤 Voice Journal - Day 200         ║
╠═══════════════════════════════════════╣
║                                       ║
║           [  🔴  ]  ← Pulsing red     ║
║         Listening...                  ║
║                                       ║
║  ▓▓▓░░░▓▓▓▓░░  ← Voice indicator     ║
║                                       ║
║  📝 Transcript (live):                ║
║  "Today was pretty good, I'd say a    ║
║   4. I went running in the..."        ║
║                                       ║
║           [Stop Recording]            ║
╚═══════════════════════════════════════╝
```

#### Step 3: Processing State
```
╔═══════════════════════════════════════╗
║    🎤 Voice Journal - Day 200         ║
╠═══════════════════════════════════════╣
║                                       ║
║              ⏳                        ║
║      Processing your entry...         ║
║                                       ║
║  Understanding what you said and      ║
║  extracting mood, tags, and details   ║
║                                       ║
╚═══════════════════════════════════════╝
```

#### Step 4: Preview State
```
╔═══════════════════════════════════════╗
║    🎤 Voice Journal - Preview         ║
╠═══════════════════════════════════════╣
║                                       ║
║  📅 Date: January 14, 2026 (Day 200)  ║
║  😊 Mood: 4/5  [😊😊😊😊◯]           ║
║  ⏰ Time: 2:30 PM                     ║
║                                       ║
║  🏷️ Tags:                             ║
║  [🏃 Running] [🎮 Gaming]             ║
║  + Suggested: [🧘 Meditation] [Add?]  ║
║                                       ║
║  📝 Diary Entry:                      ║
║  ┌─────────────────────────────────┐ ║
║  │ Today was pretty good, I'd say  │ ║
║  │ a 4. I went running in the      │ ║
║  │ morning and played some games   │ ║
║  │ at night. Felt really productive│ ║
║  └─────────────────────────────────┘ ║
║                                       ║
║  [✏️ Edit] [🔄 Try Again] [✅ Save]   ║
╚═══════════════════════════════════════╝
```

#### Step 5: Success State
```
╔═══════════════════════════════════════╗
║    🎤 Voice Journal - Saved!          ║
╠═══════════════════════════════════════╣
║                                       ║
║              ✅                        ║
║      Entry saved successfully!        ║
║                                       ║
║  Added to Day 200 (January 14, 2026)  ║
║                                       ║
║      [Close] [Add Another Entry]      ║
║                                       ║
╚═══════════════════════════════════════╝
```

---

## 🧠 AI Interpretation Logic

### Date Recognition Patterns

**Input Examples → Output:**
- "Today..." → Current date (Day N)
- "Yesterday..." → Current date - 1 day (Day N-1)
- "Two days ago..." → Current date - 2 days (Day N-2)
- "Monday..." → Last Monday's date
- "This morning...", "Tonight..." → Today with time context

### Mood Extraction Patterns

**Phrases → Rating:**
- "terrible", "awful", "worst" → 1
- "not great", "meh", "okay" → 2-3
- "good", "pretty good", "nice" → 4
- "amazing", "fantastic", "best day" → 5
- "I'd say a 4" → Direct number (4)
- "feeling like a 3 or 4" → Take higher (4) or ask for clarification

### Tag Matching Strategy

1. **Exact match:** "went running" → Running tag (if exists)
2. **Fuzzy match:** "did a run" → Running tag
3. **Semantic match:** "played video games" → Gaming tag
4. **New tag suggestion:** "tried meditation" → Suggest new "Meditation" tag
5. **Category inference:** "worked out" → Suggest Health category

### Content Cleaning

- Remove filler words: "um", "uh", "like", "you know"
- Fix common speech-to-text errors
- Preserve natural tone and emotion
- Format paragraphs for readability

---

## 🔧 Technical Implementation Details

### Web Speech API Setup

```typescript
// Browser compatibility check
function isVoiceSupported(): boolean {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
}

// Initialize recognition
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

recognition.continuous = true;        // Keep listening
recognition.interimResults = true;    // Show real-time results
recognition.lang = 'en-US';          // Language
recognition.maxAlternatives = 1;     // Just top result
```

### Firebase AI Integration

**Model:** Gemini 2.5 Flash (already used in game-analytics)

**Prompt Engineering:**
```typescript
const systemPrompt = `You are a helpful journaling assistant.
Parse voice transcripts and extract structured mood data.

Rules:
1. Be generous with mood ratings - if unclear, don't assume negative
2. Match activities to existing tags when possible
3. Infer dates from context (today, yesterday, etc.)
4. Preserve the user's natural voice in diary content
5. Flag ambiguities rather than guessing

Output format: JSON only, no markdown`;

const userPrompt = `
Current date: ${currentDate}
Current day number: ${dayNumber}
Available tags: ${JSON.stringify(tags)}

Transcript:
"${transcript}"

Extract mood (1-5), date reference, tags, and diary content.
`;
```

### Error Handling

**Scenarios to handle:**
1. **No microphone permission:** Show instruction to enable
2. **Speech API not supported:** Fallback to text input option
3. **Network error during AI call:** Retry with exponential backoff
4. **AI returns invalid JSON:** Use fallback parsing
5. **No speech detected:** Prompt user to try again
6. **Ambient noise:** Show "Couldn't hear clearly" message

### Performance Optimization

- **Debounce transcript updates:** Only process after 500ms pause
- **Cache AI responses:** Store common phrase interpretations
- **Lazy load modal:** Only import when user clicks voice button
- **Compress audio data:** If we decide to save recordings later

---

## 📂 File Structure

```
app/apps/mood-tracker/
├── components/
│   ├── VoiceJournalModal.tsx          ← NEW: Main voice UI
│   ├── VoiceJournalPreview.tsx        ← NEW: Preview interpreted data
│   ├── VoiceIndicator.tsx             ← NEW: Animated voice level
│   └── [existing components...]
├── hooks/
│   ├── useVoiceRecognition.ts         ← NEW: Speech API wrapper
│   ├── useVoiceJournal.ts             ← NEW: Main voice logic hook
│   └── [existing hooks...]
├── lib/
│   ├── ai-voice-service.ts            ← NEW: AI interpretation
│   ├── voice-utils.ts                 ← NEW: Date parsing, helpers
│   ├── types.ts                       ← UPDATE: Add voice types
│   └── [existing files...]
└── page.tsx                            ← UPDATE: Add voice button
```

---

## 🎯 Phase 1 Implementation Checklist

### Step 1: Setup Foundation
- [ ] Create `types.ts` additions for voice interfaces
- [ ] Create `voice-utils.ts` with date parsing helpers
- [ ] Create `ai-voice-service.ts` with Gemini integration

### Step 2: Build Core Hooks
- [ ] Implement `useVoiceRecognition.ts` hook
- [ ] Implement `useVoiceJournal.ts` orchestration hook
- [ ] Add browser compatibility detection

### Step 3: Create UI Components
- [ ] Build `VoiceIndicator.tsx` (animated voice level)
- [ ] Build `VoiceJournalPreview.tsx` (preview screen)
- [ ] Build `VoiceJournalModal.tsx` (main modal)

### Step 4: Integration
- [ ] Add voice button to mood tracker main page
- [ ] Connect modal to existing data hooks (`useMoodTracker`)
- [ ] Test full flow: speak → process → preview → save

### Step 5: Polish
- [ ] Add loading states and error messages
- [ ] Add keyboard shortcuts (Escape to close, etc.)
- [ ] Add accessibility labels
- [ ] Test in Chrome, Edge, Safari

### Step 6: Testing Scenarios
- [ ] Test: "Today was good" → Creates today entry
- [ ] Test: "Yesterday I went running" → Creates yesterday entry
- [ ] Test: "Feeling like a 4, did yoga" → Mood + new tag
- [ ] Test: Multiple sentences with mixed topics
- [ ] Test: Error recovery (bad audio, no AI response)

---

## 🔮 Phase 2 Preview (Conversational Mode)

### How It Will Work

**Conversation Flow:**
```
AI: "Hey! Want to tell me about your day?"

User: "Yeah, it was pretty good."

AI: "Great! On a scale of 1-5, how would you rate it?"

User: "Probably a 4."

AI: "Nice! What made it a good day?"

User: "I went for a run this morning and finished a project."

AI: "Awesome! Did you do anything else memorable?"

User: "Not really, just relaxed in the evening."

AI: "Got it! Let me summarize:
     • Mood: 4/5
     • Activities: Running, Project work, Relaxing
     • Sounds like a productive and balanced day!

     Should I save this to today's entry?"

User: "Yes!"

AI: "Saved! See you next time! 👋"
```

### Technical Additions Needed
- Text-to-speech API for AI voice responses
- Streaming AI responses (Firebase AI supports this)
- Conversation state management
- Dynamic question generation based on missing info
- Intent recognition (user confirms, denies, wants to add more)

### UI Changes
- Split screen: AI questions on top, user transcript below
- Conversation history visible
- "AI is typing..." indicator
- Voice response from AI (optional, can be text-only)

---

## 🚧 Known Limitations & Mitigations

### Limitation 1: Browser Support
**Issue:** Web Speech API only works well in Chrome/Edge
**Mitigation:**
- Detect browser and show compatibility message
- Offer fallback text input mode
- Consider adding recording + server-side STT for Safari/Firefox later

### Limitation 2: Background Noise
**Issue:** May pick up ambient sounds and misinterpret
**Mitigation:**
- Add confidence score from AI
- Let user review and edit before saving
- Show "low confidence" warning if needed

### Limitation 3: Tag Matching Accuracy
**Issue:** AI might not perfectly match activities to tags
**Mitigation:**
- Show both matched tags AND suggestions separately
- Let user add/remove tags in preview
- Learn from corrections over time (future enhancement)

### Limitation 4: Date Ambiguity
**Issue:** "Monday" could mean last Monday or next Monday
**Mitigation:**
- Always default to past dates (journaling is retrospective)
- Show date clearly in preview
- Let user change date before saving

### Limitation 5: Privacy
**Issue:** Voice data sent to Google servers
**Mitigation:**
- Clear privacy notice when first using feature
- Don't save audio recordings (only transcript)
- Option to disable voice mode entirely in settings

---

## 💡 Future Enhancements (Post-Phase 2)

1. **Multi-language support** - Detect and support other languages
2. **Voice commands** - "Show me last week", "Navigate to yesterday"
3. **Emotion detection** - Analyze tone/pitch for mood inference
4. **Audio journaling** - Option to save voice recordings alongside text
5. **Shareable voice notes** - Export as audio files
6. **AI insights** - "You seem happier when you run!" patterns
7. **Reminders via voice** - "Remind me to journal tonight"
8. **Voice search** - "Find entries where I went hiking"

---

## 📊 Success Metrics

How we'll know this is working well:

1. **Usage Rate:** % of users who try voice mode within first week
2. **Completion Rate:** % of voice sessions that result in saved entries
3. **Accuracy:** % of AI interpretations that are accepted without edits
4. **Adoption:** % of entries created via voice vs manual (target: 30%+)
5. **Error Rate:** % of sessions that fail due to technical issues (target: <5%)

---

## 🎬 Next Steps

### Immediate (Phase 1 Implementation)

1. **Get approval on this plan** ✅
2. **Set up development environment**
   - Ensure Firebase AI is configured
   - Test Web Speech API in browser console
3. **Start with smallest working version:**
   - Simple modal with record button
   - Basic speech-to-text (no AI yet)
   - Display transcript
4. **Add AI interpretation layer:**
   - Connect to Gemini
   - Parse transcript
   - Show preview
5. **Connect to existing data layer:**
   - Save to mood tracker
   - Update UI
6. **Polish and test**

### Questions Before Starting?

- Any specific phrases or use cases you want to prioritize?
- Do you want to support any language besides English initially?
- Should we add a "Help" or tutorial for first-time users?
- Any privacy concerns we should address upfront?

---

**Ready to start building Phase 1?** Let me know if you want to adjust anything in this plan, or we can dive straight into implementation! 🚀
