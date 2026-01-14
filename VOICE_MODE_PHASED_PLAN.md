# Voice Mode: Phased Implementation Plan

**Project:** Voice Journaling for Mood Tracker App
**Last Updated:** January 14, 2026
**Status:** Planning Phase

---

## 📋 Executive Summary

This document outlines a **4-phase approach** to implementing voice journaling in the Mood Tracker app. Each phase delivers working functionality that users can use immediately, while building toward a sophisticated conversational AI companion.

### Phase Overview

| Phase | Name | Duration | Complexity | User Value |
|-------|------|----------|------------|------------|
| **1** | MVP - Basic Voice Journaling | 1-2 days | Low | High ✅ |
| **2** | Enhanced UX & Intelligence | 1 day | Medium | High ✅ |
| **3** | Conversational Mode | 2-3 days | High | Medium |
| **4** | Advanced Features | Ongoing | Variable | Low-Medium |

**Recommended Approach:** Implement Phase 1 → Test with real usage → Decide on Phase 2+ based on feedback

---

## 🎯 Phase 1: MVP - Basic Voice Journaling

### Goal
Get a working voice journal feature that users can start using immediately. No frills, just core functionality.

### What Users Can Do
1. Click "Voice Journal" button
2. Record their voice while seeing a visual indicator
3. Get AI interpretation of what they said (mood, tags, content)
4. Preview and manually edit the results
5. Save to their mood tracker

### Features Included

#### ✅ UI Components
- **Voice Journal Button** on main page (above year grid)
- **Voice Modal** with states:
  - Ready state (instructions)
  - Recording state (waveform animation)
  - Processing state (loading spinner)
  - Preview state (editable interpretation)
  - Success state (confirmation)

#### ✅ Core Functionality
- **Audio Recording**: MediaRecorder API (WebM format)
- **Visual Feedback**: Simple CSS-animated waveform bars
- **AI Processing**: Single Gemini 2.5 Flash call with JSON schema
- **Date Handling**: Always defaults to "today" (simplest case)
- **Tag Matching**: Fuzzy match to existing tags
- **Preview Editing**:
  - Edit mood rating (1-5 selector)
  - Toggle existing tags on/off
  - Accept/reject suggested new tags
  - Edit diary content (plain textarea)

#### ✅ Data Storage
- Append to existing `diaryContent` as HTML
- Voice entries styled with purple tint and 🎤 icon
- Timestamp shown (e.g., "6:30 PM")
- Works with existing Tiptap editor

### Technical Implementation

#### New Files to Create

```
app/apps/mood-tracker/
├── components/
│   ├── VoiceJournalModal.tsx           # Main modal component
│   ├── VoiceJournalPreview.tsx         # Preview editor
│   └── VoiceWaveform.tsx               # Animated waveform
├── hooks/
│   ├── useVoiceRecorder.ts             # MediaRecorder wrapper
│   └── useVoiceJournal.ts              # Main orchestration hook
├── lib/
│   ├── ai-voice-service.ts             # Gemini audio processing
│   ├── voice-utils.ts                  # Helper functions
│   └── types.ts                        # UPDATE: Add voice types
└── styles/
    └── voice-journal.css                # Voice entry styling
```

#### Core Logic Flow

```typescript
// 1. User clicks "Voice Journal"
handleOpenModal()

// 2. User clicks "Start Recording"
const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
mediaRecorder.start()
setIsRecording(true)

// 3. Show waveform animation (CSS-based, fake audio levels)
<VoiceWaveform isActive={isRecording} />

// 4. User clicks "Stop"
mediaRecorder.stop()
const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })

// 5. Process with AI
setIsProcessing(true)
const interpretation = await interpretVoiceJournal(audioBlob, {
  currentDate: getTodayDate(),
  startDate: settings.startDate,
  existingTags: tags,
  categories: categories
})

// 6. Show preview
setInterpretation(interpretation)
setShowPreview(true)

// 7. User edits and saves
const edited = applyUserEdits(interpretation)
await saveToMoodTracker(edited)
```

#### AI Service (Simplified for MVP)

```typescript
// lib/ai-voice-service.ts

export async function interpretVoiceJournal(
  audioBlob: Blob,
  context: Context
): Promise<VoiceInterpretation> {

  const audioBase64 = await blobToBase64(audioBlob);

  const model = getGenerativeModel(ai, {
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: INTERPRETATION_SCHEMA
    }
  });

  const prompt = `
    Analyze this voice recording for a mood journal entry.
    Today's date: ${context.currentDate}
    Existing tags: ${context.existingTags.map(t => t.name).join(', ')}

    Extract:
    - mood (1-5 scale, or null)
    - activities (match to existing tags)
    - cleaned transcript

    BE CONSERVATIVE with new tag suggestions.
  `;

  const result = await model.generateContent([
    { inlineData: { data: audioBase64, mimeType: "audio/webm" } },
    { text: prompt }
  ]);

  return JSON.parse(result.response.text());
}
```

#### Data Integration (Simplified for MVP)

```typescript
// Save voice entry to existing day entry
async function saveVoiceJournal(interpretation: VoiceInterpretation) {
  const { dayNumber, mood, tagIds, newTagsToCreate, diaryContent } = interpretation;

  // Create any new tags first
  const createdTags = await Promise.all(
    newTagsToCreate.map(tag => createTag(tag))
  );
  const allTagIds = [...tagIds, ...createdTags.map(t => t.id)];

  // Check if day entry exists
  const existingEntry = await getByDayNumber(dayNumber);

  if (existingEntry) {
    // Append to existing
    const updatedHTML = appendVoiceEntryHTML(
      existingEntry.diaryContent,
      diaryContent,
      new Date().toISOString()
    );

    await updateEntry(existingEntry.id, {
      diaryContent: updatedHTML,
      mood: mood ?? existingEntry.mood, // Keep old mood if new one is null
      tagIds: [...new Set([...existingEntry.tagIds, ...allTagIds])] // Merge tags
    });
  } else {
    // Create new entry
    await createEntry({
      dayNumber,
      date: interpretation.date,
      mood,
      tagIds: allTagIds,
      diaryContent: formatVoiceEntryHTML(diaryContent, new Date().toISOString())
    });
  }
}
```

### What's NOT in Phase 1 (Deferred)

❌ Date parsing ("yesterday", "last Monday") - Always use "today"
❌ Real audio waveform visualization - Use CSS animation
❌ Conversation mode - Single narration only
❌ Voice playback - No audio storage
❌ Confidence indicators - Assume all interpretations are good
❌ Error recovery - Basic error messages only
❌ Real-time transcript display - Show nothing while recording

### Testing Checklist

- [ ] Click voice button → Modal opens
- [ ] Click start → Mic permission requested
- [ ] Grant permission → Recording starts, waveform shows
- [ ] Speak test phrase: "Today was good, I'd say a 4, went running"
- [ ] Click stop → Processing message shows
- [ ] Preview appears with mood=4, Running tag matched
- [ ] Edit mood to 5, toggle a tag off
- [ ] Click save → Entry appears in day's diary with timestamp
- [ ] Reload page → Entry persists
- [ ] Test with existing entry → Voice entry appends correctly
- [ ] Test in Firefox/Safari → Shows browser compatibility message

### Success Criteria

✅ Users can record voice and see it saved to their journal
✅ AI correctly extracts mood from common phrases
✅ Tag matching works for existing tags
✅ Voice entries visually distinct in Tiptap editor
✅ No crashes or data loss

### Estimated Effort

**Development:** 6-8 hours
**Testing:** 2 hours
**Total:** 1-2 days

---

## 🎨 Phase 2: Enhanced UX & Intelligence

### Goal
Polish the experience based on Phase 1 learnings. Make it smarter and more pleasant to use.

### New Features

#### ✅ Smart Date Recognition
- Parse "yesterday", "two days ago", "last Monday"
- Show date clearly in preview: "January 13 (Day 199)"
- Validate dates (reject future dates, dates before start date)
- Highlight if AI changed the date from "today"

#### ✅ Real Audio Waveform
- Use Web Audio API for actual audio analysis
- Show live volume bars while recording
- Visual feedback confirms mic is picking up voice

#### ✅ Confidence Indicators
- AI returns confidence: 'high' | 'medium' | 'low'
- Show warning badge for medium/low confidence
- Different styling for low-confidence entries in diary

#### ✅ Smart Tag Suggestions
- AI explains WHY it suggests new tags
- Confidence score shown per suggestion
- Smart category inference
- Show "unmatched activities" that couldn't be tagged

#### ✅ Better Error Handling
- Graceful mic permission denial
- Retry logic for AI failures (3 attempts with backoff)
- Save draft if user closes modal while processing
- Show helpful error messages with troubleshooting

#### ✅ Enhanced Preview
- Side-by-side: original transcript vs cleaned version
- Highlight detected keywords (mood words, activities)
- Show matched phrases for tags
- Quick actions: "Keep original transcript" toggle

#### ✅ Keyboard Shortcuts
- `Esc` to close modal
- `Space` to start/stop recording (when modal focused)
- `Enter` to save (when in preview)

### Technical Additions

#### Real Waveform Visualization

```typescript
// hooks/useAudioAnalyzer.ts
export function useAudioAnalyzer(stream: MediaStream | null) {
  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    if (!stream) return;

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);

    source.connect(analyser);
    analyser.fftSize = 256;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    function updateLevel() {
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      setAudioLevel(average / 255); // Normalize 0-1
      requestAnimationFrame(updateLevel);
    }

    updateLevel();

    return () => {
      audioContext.close();
    };
  }, [stream]);

  return audioLevel;
}
```

#### Date Parsing Logic

```typescript
// lib/voice-utils.ts

export function parseRelativeDate(
  datePhrase: string,
  currentDate: string
): string | null {
  const lower = datePhrase.toLowerCase();
  const current = new Date(currentDate);

  if (lower.includes('today') || lower.includes('tonight')) {
    return currentDate;
  }

  if (lower.includes('yesterday')) {
    return subDays(currentDate, 1);
  }

  const daysAgoMatch = lower.match(/(\d+)\s+days?\s+ago/);
  if (daysAgoMatch) {
    return subDays(currentDate, parseInt(daysAgoMatch[1]));
  }

  // "last Monday", "Monday", etc.
  const dayOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  for (let i = 0; i < dayOfWeek.length; i++) {
    if (lower.includes(dayOfWeek[i])) {
      return getPreviousDayOfWeek(currentDate, i);
    }
  }

  return null; // Let AI handle it
}

// Use in AI prompt as fallback
const detectedDate = parseRelativeDate(transcript, currentDate) || currentDate;
```

#### Enhanced JSON Schema

```typescript
const ENHANCED_SCHEMA = {
  type: "object",
  required: ["date", "dayNumber", "mood", "matchedTags", "suggestedNewTags", "cleanedContent", "confidence"],
  properties: {
    date: { type: "string" },
    dayNumber: { type: "integer" },
    dateConfidence: {
      type: "string",
      enum: ["explicit", "inferred", "assumed"],
      description: "How date was determined"
    },
    mood: { type: ["integer", "null"] },
    moodReasoning: {
      type: "string",
      description: "Why this mood was chosen"
    },
    matchedTags: {
      type: "array",
      items: {
        type: "object",
        properties: {
          tagName: { type: "string" },
          matchedPhrase: { type: "string" },
          confidence: { type: "number" }
        }
      }
    },
    suggestedNewTags: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          emoji: { type: "string" },
          categoryName: { type: "string" },
          confidence: { type: "number" },
          reason: { type: "string" }
        }
      }
    },
    cleanedContent: { type: "string" },
    originalTranscript: { type: "string" },
    unmatchedActivities: {
      type: "array",
      items: { type: "string" }
    },
    confidence: {
      type: "string",
      enum: ["high", "medium", "low"]
    },
    ambiguities: {
      type: "array",
      items: { type: "string" },
      description: "Things AI wasn't sure about"
    }
  }
};
```

### What's Still NOT Included

❌ Conversational mode
❌ Audio playback/storage
❌ Multi-entry creation
❌ Voice commands

### Testing Checklist

- [ ] Say "yesterday was great" → Correct date shown in preview
- [ ] Speak loudly vs quietly → Waveform responds appropriately
- [ ] Force low confidence (mumble/noise) → Warning shown
- [ ] AI suggests new tag → Reason and confidence displayed
- [ ] Deny mic permission → Clear error with instructions
- [ ] AI call fails → Retry happens automatically
- [ ] Close modal during processing → Draft saved, can resume
- [ ] Press Esc → Modal closes
- [ ] Keyboard shortcuts work as expected

### Success Criteria

✅ Date parsing works for common phrases
✅ Real-time audio feedback is responsive
✅ Error messages are helpful, not cryptic
✅ Tag suggestions feel intelligent and useful
✅ No user confusion about what AI detected

### Estimated Effort

**Development:** 6-8 hours
**Testing:** 2-3 hours
**Total:** 1-2 days

---

## 💬 Phase 3: Conversational Mode

### Goal
Transform from single narration to back-and-forth conversation. AI asks questions, user responds naturally.

### User Experience

**Flow:**
```
[User clicks "Voice Journal"]

AI (text): "Hey! Want to tell me about today or another day?"
User (voice): "Today"

AI (text): "Great! How was today overall?"
User (voice): "Pretty good, like a 4"

AI (text): "Nice! What made it a 4?"
User (voice): "Went running and got work done"

AI (text): "Awesome! Anything else you want to mention?"
User (voice): "Nope, that's it"

AI (text): "Got it! Here's what I captured..."
[Shows preview]
```

### New Features

#### ✅ Multi-Turn Conversation
- AI asks follow-up questions based on context
- User can speak multiple times
- Conversation history maintained in session
- AI adapts questions based on what's already known

#### ✅ Question Generation
- **Opening question** (which day?)
- **Mood question** (if not mentioned)
- **Activity question** (what did you do?)
- **Follow-up questions** (anything else?)
- **Confirmation** (is this correct?)

#### ✅ Smart Context Tracking
- Remember what user already said
- Don't ask redundant questions
- Fill in gaps intelligently
- Know when to stop asking

#### ✅ Optional Voice Responses (TTS)
- AI can speak responses (Web Speech API TTS)
- Toggle voice on/off
- Choose voice/accent
- Fallback to text if TTS unavailable

#### ✅ Interruption Handling
- User can interrupt AI
- "Skip questions" button to go straight to preview
- "I'm done" detection to end conversation

### Technical Implementation

#### Conversation State Machine

```typescript
type ConversationState =
  | { phase: 'greeting'; data: {} }
  | { phase: 'asking-date'; data: { attempts: number } }
  | { phase: 'asking-mood'; data: { date: string } }
  | { phase: 'asking-activities'; data: { date: string; mood: number } }
  | { phase: 'asking-more'; data: InterpretationData }
  | { phase: 'confirming'; data: InterpretationData }
  | { phase: 'done'; data: InterpretationData };

function getNextQuestion(state: ConversationState): string {
  switch (state.phase) {
    case 'greeting':
      return "Hey! Want to tell me about today or another day?";

    case 'asking-date':
      return state.data.attempts > 0
        ? "Sorry, I didn't catch that. Which day? Today, yesterday, or another day?"
        : "Which day do you want to journal about?";

    case 'asking-mood':
      return "How was it overall? On a scale of 1 to 5?";

    case 'asking-activities':
      return state.data.mood >= 4
        ? "Nice! What made it good?"
        : state.data.mood <= 2
        ? "I'm sorry to hear that. What happened?"
        : "What did you do?";

    case 'asking-more':
      return "Anything else you want to mention?";

    case 'confirming':
      return "Let me show you what I've captured. Does this look right?";

    case 'done':
      return "";
  }
}
```

#### AI Conversation Handler

```typescript
// lib/ai-conversation-service.ts

export async function generateConversationalResponse(
  userSpeech: string,
  conversationHistory: ConversationTurn[],
  currentData: Partial<InterpretationData>
): Promise<{
  response: string;
  updatedData: Partial<InterpretationData>;
  nextPhase: ConversationPhase;
}> {

  const prompt = `
    You are a friendly journaling companion having a conversation.

    Conversation so far:
    ${conversationHistory.map(t => `${t.speaker}: ${t.text}`).join('\n')}

    User just said: "${userSpeech}"

    Current data collected:
    ${JSON.stringify(currentData)}

    Your job:
    1. Extract any new information from what user said
    2. Update the data (date, mood, activities, etc.)
    3. Determine what to ask next (or if done)
    4. Generate a natural response

    Return JSON:
    {
      "extractedData": { /* updated fields */ },
      "nextPhase": "asking-mood" | "asking-activities" | "asking-more" | "done",
      "response": "What you say to the user next"
    }
  `;

  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text());
}
```

#### Text-to-Speech Integration

```typescript
// hooks/useTextToSpeech.ts

export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);

  const speak = useCallback((text: string) => {
    if (!isEnabled || !('speechSynthesis' in window)) {
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1; // Slightly faster
    utterance.pitch = 1.0;
    utterance.volume = 0.8;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);

    speechSynthesis.speak(utterance);
  }, [isEnabled]);

  const stop = useCallback(() => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  return { speak, stop, isSpeaking, isEnabled, setIsEnabled };
}
```

#### Conversational UI

```typescript
// components/VoiceConversationModal.tsx

export function VoiceConversationModal() {
  const [conversationHistory, setConversationHistory] = useState<ConversationTurn[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<ConversationPhase>('greeting');

  const { speak, stop, isSpeaking } = useTextToSpeech();

  const handleUserSpeech = async (transcript: string) => {
    // Add user turn to history
    addTurn({ speaker: 'user', text: transcript });

    // Process with AI
    const { response, updatedData, nextPhase } = await generateConversationalResponse(
      transcript,
      conversationHistory,
      collectedData
    );

    // Add AI turn
    addTurn({ speaker: 'ai', text: response });

    // Speak if enabled
    speak(response);

    // Update state
    setCollectedData(updatedData);
    setCurrentPhase(nextPhase);

    // If done, show preview
    if (nextPhase === 'done') {
      setShowPreview(true);
    }
  };

  return (
    <div className="conversation-modal">
      {/* Conversation History */}
      <div className="conversation-history">
        {conversationHistory.map((turn, i) => (
          <ConversationBubble key={i} turn={turn} />
        ))}
      </div>

      {/* Recording Controls */}
      {!showPreview && (
        <div className="conversation-controls">
          <button onClick={toggleRecording}>
            {isListening ? '🔴 Listening...' : '🎤 Tap to Speak'}
          </button>
          <button onClick={skipToPreview}>
            Skip to Preview
          </button>
        </div>
      )}

      {/* Preview (when done) */}
      {showPreview && (
        <VoiceJournalPreview ... />
      )}
    </div>
  );
}
```

### What's Still NOT Included

❌ Audio playback
❌ Voice commands ("navigate to yesterday")
❌ Multiple entry creation in one session

### Testing Checklist

- [ ] Start conversation → AI asks opening question
- [ ] Say "yesterday" → AI detects date, asks about mood
- [ ] Say "it was good" → AI infers mood ~4, asks what happened
- [ ] Describe activities → AI extracts tags, asks for more
- [ ] Say "that's it" → AI shows preview
- [ ] Enable TTS → AI speaks responses
- [ ] Click "Skip to Preview" → Jumps directly
- [ ] Interrupt AI while speaking → Can speak over it
- [ ] Full conversation → All data correctly captured

### Success Criteria

✅ Conversation feels natural, not robotic
✅ AI asks relevant follow-up questions
✅ No redundant questions
✅ User can end conversation naturally
✅ TTS voice is clear and pleasant

### Estimated Effort

**Development:** 12-16 hours
**Testing:** 4 hours
**Total:** 2-3 days

---

## 🚀 Phase 4: Advanced Features

### Goal
Polish and power-user features based on user feedback.

### Potential Features (Prioritize Based on Demand)

#### 🎵 Audio Playback & Storage
- Save original voice recording alongside transcript
- Playback button in diary entries
- Cloud storage for audio files (Firebase Storage)
- Audio compression to save space

#### 🎯 Voice Commands
- "Navigate to yesterday" → Opens that day's entry
- "Show my stats" → Shows mood tracker statistics
- "Delete today's entry" → Voice-controlled actions

#### 📊 Multi-Entry Creation
- One session can create multiple day entries
- "On Monday I did X, Tuesday I did Y"
- Batch processing and review

#### 🧠 Smart Patterns & Insights
- "You seem happier when you mention running"
- Weekly/monthly voice journal summaries
- Pattern detection across voice entries

#### 🎨 Customization
- Choose AI personality (friendly, minimal, coach)
- Custom wake word
- Preferred speaking style
- Voice speed adjustment

#### 🌐 Multi-Language Support
- Detect language automatically
- Support for non-English journaling
- Translation features

#### 📱 Mobile Optimization
- Mobile-specific UI adjustments
- Better touch controls
- Push-to-talk mode

#### 🔒 Privacy Enhancements
- Local-only mode (no cloud processing)
- End-to-end encryption for audio
- Auto-delete voice recordings after N days
- Privacy dashboard

#### 🎭 Emotion Detection
- Analyze tone/pitch for emotional state
- Visual emotional arc over time
- Detect stress levels from voice

#### ⚡ Performance Optimizations
- Caching common interpretations
- Faster model (if available)
- Progressive loading
- Background processing

### Implementation Order (Suggested)

**High Priority:**
1. Audio playback (most requested)
2. Mobile optimization (usage data driven)
3. Voice commands (if users ask for it)

**Medium Priority:**
4. Multi-entry creation
5. Pattern insights
6. Customization options

**Low Priority:**
7. Multi-language
8. Emotion detection
9. Advanced privacy

### Estimated Effort

**Per feature:** 1-3 days each
**Total:** Ongoing based on priorities

---

## 📊 Implementation Roadmap

### Recommended Timeline

```
Week 1:
├─ Day 1-2: Phase 1 (MVP)
├─ Day 3: Testing & bug fixes
├─ Day 4-5: Phase 2 (Enhanced UX)
└─ Weekend: User testing with Phase 2

Week 2:
├─ Day 1-3: Phase 3 (Conversational Mode)
├─ Day 4-5: Testing & refinement
└─ Weekend: Evaluate user feedback

Week 3+:
└─ Phase 4 features based on priorities
```

### Deployment Strategy

**Phase 1:**
- Deploy behind feature flag
- Enable for beta testers first
- Gather feedback for 3-5 days
- Fix critical bugs
- Enable for all users

**Phase 2:**
- Direct deployment (builds on Phase 1)
- Monitor error rates
- A/B test specific features

**Phase 3:**
- Beta test extensively (new interaction model)
- Optional feature toggle (let users choose mode)
- Gradual rollout

**Phase 4:**
- Feature-by-feature deployment
- User voting on next features

---

## 🎯 Decision Points

### After Phase 1
**Question:** Is basic voice journaling useful enough?
**If YES:** Proceed to Phase 2
**If NO:** Pivot or reconsider approach

### After Phase 2
**Question:** Do users want conversational mode?
**If YES:** Build Phase 3
**If NO:** Focus on Phase 4 polish features

### After Phase 3
**Question:** Which Phase 4 features are most requested?
**Data sources:** User surveys, feature requests, usage analytics
**Prioritize:** Top 3 features based on impact vs effort

---

## 🔧 Technical Dependencies

### External Services
- **Firebase AI (Gemini 2.5 Flash)** - Required for all phases
- **Firebase Storage** - Optional for Phase 4 (audio storage)
- **Firebase Analytics** - Optional for usage tracking

### Browser APIs
- **MediaRecorder API** - Phase 1+ (audio recording)
- **Web Audio API** - Phase 2+ (waveform visualization)
- **Web Speech API (TTS)** - Phase 3 (optional voice responses)

### Library Versions
- `firebase`: ^12.7.0 (current)
- `@tiptap/react`: ^3.15.3 (current)
- No additional dependencies needed for Phase 1-3

---

## 📈 Success Metrics

### Phase 1
- **Adoption:** 20%+ of active users try voice journal
- **Retention:** 50%+ use it more than once
- **Data Quality:** <10% of entries require heavy editing
- **Technical:** <2% error rate

### Phase 2
- **Date Accuracy:** >90% correct date detection
- **Tag Accuracy:** >80% tags correctly matched
- **User Satisfaction:** NPS score >7/10

### Phase 3
- **Conversation Completion:** >70% complete full conversation
- **Preference:** >40% prefer conversation vs single narration
- **Efficiency:** Faster to complete vs manual entry

### Phase 4
- Metrics TBD based on specific features

---

## 🚨 Risk Assessment

### Technical Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Gemini API rate limits | High | Medium | Implement request queuing, caching |
| Browser compatibility | Medium | High | Feature detection, graceful fallback |
| AI interpretation errors | Medium | Medium | Preview step, user editing |
| Audio quality issues | Low | Medium | Noise detection, retry prompts |
| Firebase costs | Medium | Low | Monitor usage, set budget alerts |

### User Experience Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Users don't understand AI edits | Medium | Medium | Show diff, explain changes |
| Privacy concerns | High | Low | Clear disclosure, optional feature |
| Confusion in conversation mode | Medium | Medium | Skip button, clear instructions |
| Voice journal faster than typing? | High | Medium | Measure and optimize flow |

---

## 📝 Open Questions

**For Phase 1:**
- [ ] Where exactly should voice button be placed?
- [ ] What's the max recording length? (suggest 5 minutes)
- [ ] Should we compress audio before sending? (probably yes)
- [ ] Delete audio after processing or keep temporarily? (delete immediately)

**For Phase 2:**
- [ ] How aggressive should date parsing be?
- [ ] Show original + cleaned transcript, or just cleaned?
- [ ] Min confidence threshold for suggestions? (0.7?)

**For Phase 3:**
- [ ] How many questions before showing preview? (max 5?)
- [ ] Should TTS be on by default? (probably no, opt-in)
- [ ] Voice or text for AI responses? (text is safer default)

**For Phase 4:**
- [ ] Which features do users actually want?
- [ ] What's the storage/cost model for audio files?

---

## 🎓 Lessons Learned (To Be Updated)

*This section will be filled in after each phase deployment.*

### Phase 1 Learnings
- TBD

### Phase 2 Learnings
- TBD

### Phase 3 Learnings
- TBD

---

## 📚 References

### Technical Documentation
- [Firebase AI Logic - Analyze Audio](https://firebase.google.com/docs/ai-logic/analyze-audio)
- [Gemini API - Structured Output](https://ai.google.dev/gemini-api/docs/structured-output)
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)

### Internal Documentation
- `VOICE_MODE_IMPLEMENTATION_PLAN.md` - Original detailed plan
- `CLAUDE.md` - Codebase architecture and patterns
- `app/apps/game-analytics/lib/ai-service.ts` - Existing Gemini integration example

---

## ✅ Approval & Sign-Off

**Phase 1 Approved:** ☐ Pending
**Phase 2 Approved:** ☐ Pending
**Phase 3 Approved:** ☐ Pending

**Notes:**

---

**Last Updated:** January 14, 2026
**Next Review:** After Phase 1 deployment
