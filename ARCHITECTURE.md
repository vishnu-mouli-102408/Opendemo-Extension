# 🏗️ Architecture Documentation

## System Overview

Zordon is a Chrome extension that records and replays DOM interactions using rrweb. It consists of three main components that communicate via Chrome's messaging API.

## Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Chrome Browser                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐         ┌──────────────┐                  │
│  │              │         │              │                  │
│  │   Popup UI   │◄───────►│  Background  │                  │
│  │  (popup.ts)  │         │Service Worker│                  │
│  │              │         │              │                  │
│  └──────────────┘         └──────┬───────┘                  │
│                                   │                          │
│                                   │                          │
│  ┌────────────────────────────────▼──────────────────────┐  │
│  │              Webpage Content Script                    │  │
│  │  ┌──────────────┐           ┌──────────────┐          │  │
│  │  │   Recorder   │           │    Player    │          │  │
│  │  │(recorder.ts) │           │ (player.ts)  │          │  │
│  │  │              │           │              │          │  │
│  │  │   + rrweb    │           │+ rrweb-player│          │  │
│  │  └──────────────┘           └──────────────┘          │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Chrome Local Storage                       │ │
│  │     { recordings: [], playbackEnabled: bool }           │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. Popup UI (`src/popup/popup.ts`)

**Purpose**: User interface for controlling recordings and playback.

**Responsibilities**:
- Display recording status
- Start/stop recording controls
- Toggle playback enable/disable
- Display saved recordings list
- Delete recordings
- Trigger playback

**Communication**:
```typescript
// Send to Background
chrome.runtime.sendMessage({
  type: 'START_RECORDING' | 'STOP_RECORDING' | 'TOGGLE_PLAYBACK'
})

// Read from Storage
chrome.storage.local.get(['recordings', 'playbackEnabled'])
```

**State Management**:
- Current recording status
- List of saved recordings
- Playback enabled flag

### 2. Background Service Worker (`src/background/service-worker.ts`)

**Purpose**: Central state manager and message router.

**Responsibilities**:
- Maintain recording state
- Route messages between popup and content scripts
- Manage recording sessions
- Save recordings to storage
- Handle tab updates

**Key Methods**:
```typescript
startRecording(tabId) → Creates new recording session
stopRecording() → Finalizes and saves recording
saveRecording(recording) → Persists to storage
playRecording(recordingId, tabId) → Sends to content script
```

**Storage Schema**:
```typescript
{
  recordings: RecordingSession[],
  currentRecording: RecordingSession | null,
  playbackEnabled: boolean,
  recordingStatus: RecordingStatus
}
```

### 3. Recorder Content Script (`src/content/recorder.ts`)

**Purpose**: Capture DOM interactions and changes.

**Responsibilities**:
- Initialize rrweb recording
- Capture all DOM events
- Display recording indicator
- Send events to background
- Manage recording lifecycle

**rrweb Configuration**:
```typescript
record({
  emit: (event) => events.push(event),
  checkoutEveryNms: 10 * 60 * 1000,  // 10 min checkpoints
  recordCanvas: true,
  collectFonts: true,
  maskAllInputs: false,
  sampling: {
    mousemove: true,
    mouseInteraction: true,
    scroll: 150,
    input: 'last'
  }
})
```

**Visual Indicator**:
- Fixed position recording badge
- Pulsing animation
- Shows "Recording..." text

### 4. Player Content Script (`src/content/player.ts`)

**Purpose**: Replay recorded sessions.

**Responsibilities**:
- Initialize rrweb-player
- Display player UI overlay
- Handle playback controls
- Manage player lifecycle

**Player Features**:
- Full-screen overlay
- Playback controls (play, pause, speed)
- Timeline scrubbing
- Close button

## Data Flow

### Recording Flow

```
1. User clicks "Start Recording" in popup
   ↓
2. Popup sends START_RECORDING message to background
   ↓
3. Background creates RecordingSession with unique ID
   ↓
4. Background sends START_RECORDING to content script
   ↓
5. Content script initializes rrweb.record()
   ↓
6. User interacts with page → events captured
   ↓
7. User clicks "Stop Recording"
   ↓
8. Popup sends STOP_RECORDING to background
   ↓
9. Background requests events from content script
   ↓
10. Content script sends RECORDING_DATA to background
    ↓
11. Background saves to storage
    ↓
12. Recording complete!
```

### Playback Flow

```
1. User enables playback toggle in popup
   ↓
2. Popup updates playbackEnabled in storage
   ↓
3. User clicks "Play" on a recording
   ↓
4. Popup sends PLAY_RECORDING to background
   ↓
5. Background retrieves recording from storage
   ↓
6. Background sends recording to content script
   ↓
7. Content script checks playbackEnabled flag
   ↓
8. If enabled, injects player.js script
   ↓
9. Player script receives recording via postMessage
   ↓
10. Player initializes rrweb-player overlay
    ↓
11. Playback starts!
```

## Message Protocol

### Message Types

```typescript
enum MessageType {
  START_RECORDING = 'START_RECORDING',
  STOP_RECORDING = 'STOP_RECORDING',
  PAUSE_RECORDING = 'PAUSE_RECORDING',
  RESUME_RECORDING = 'RESUME_RECORDING',
  GET_STATUS = 'GET_STATUS',
  TOGGLE_PLAYBACK = 'TOGGLE_PLAYBACK',
  PLAY_RECORDING = 'PLAY_RECORDING',
  RECORDING_DATA = 'RECORDING_DATA',
  STATUS_UPDATE = 'STATUS_UPDATE'
}
```

### Message Format

```typescript
interface Message {
  type: MessageType;
  payload?: {
    sessionId?: string;
    recording?: RecordingSession;
    events?: any[];
    enabled?: boolean;
    recordingId?: string;
  }
}
```

## Data Models

### RecordingSession

```typescript
interface RecordingSession {
  id: string;              // Unique identifier (rec_timestamp)
  url: string;             // Page URL
  startTime: number;       // Unix timestamp
  endTime?: number;        // Unix timestamp
  duration?: number;       // Milliseconds
  events: any[];          // rrweb events
  title?: string;         // Page title
}
```

### RecordingStatus

```typescript
enum RecordingStatus {
  IDLE = 'idle',
  RECORDING = 'recording',
  PAUSED = 'paused',
  STOPPED = 'stopped'
}
```

## Storage Strategy

### Chrome Local Storage

```typescript
// Storage Keys
- recordings: RecordingSession[]  // All saved recordings
- currentRecording: RecordingSession  // Active recording
- playbackEnabled: boolean  // Playback toggle state
- recordingStatus: RecordingStatus  // Current status
```

### Storage Limits

- Chrome local storage: ~5MB (sufficient for ~20-30 recordings)
- Large recordings stored with gzip compression (future)
- Consider IndexedDB for larger datasets (future)

## Security Considerations

### Data Privacy

- All data stored locally
- No external server communication
- Option to mask sensitive inputs
- Data-sensitive attribute support

### Content Security

- Content scripts run in isolated world
- No eval() or unsafe code execution
- CSP-compliant implementation

## Performance Optimizations

### Recording Optimizations

1. **Event Sampling**: Throttle high-frequency events
2. **Checkpointing**: Periodic full snapshots for long recordings
3. **Incremental Snapshots**: Only store DOM changes
4. **Mutation Batching**: Group similar mutations

### Playback Optimizations

1. **Skip Inactive**: Fast-forward through idle periods
2. **Canvas Optimization**: UNSAFE_replayCanvas for performance
3. **Lazy Loading**: Load player only when needed
4. **Memory Management**: Cleanup on player close

## Extension Permissions

```json
{
  "permissions": [
    "storage",      // Save recordings
    "activeTab",    // Access current tab
    "scripting",    // Inject scripts
    "tabs"          // Tab management
  ],
  "host_permissions": [
    "<all_urls>"    // Record any website
  ]
}
```

## Build Process

### Webpack Configuration

```javascript
Entry points:
- background.js → Service worker
- content.js → Recorder
- player.js → Player
- popup.js → UI

Output: dist/
- Minified and bundled
- Source maps for debugging
- Static assets copied
```

### TypeScript Compilation

```
src/*.ts → webpack → ts-loader → dist/*.js
```

## Future Enhancements

### Planned Features

1. **Export/Import**: JSON export for sharing
2. **Cloud Sync**: Optional cloud storage
3. **Compression**: Gzip compression for large recordings
4. **Annotations**: Add notes to recordings
5. **Categories**: Organize recordings
6. **Search**: Find recordings by URL/title
7. **Keyboard Shortcuts**: Quick actions
8. **Network Recording**: Capture network requests
9. **Console Logs**: Include console output
10. **Replay Speed**: Adjustable playback speed

### Technical Debt

1. Better error handling
2. Retry mechanisms
3. Storage quota management
4. Progressive enhancement
5. Accessibility improvements
6. Unit tests
7. Integration tests

## Debugging

### Console Logs

All components log with `[Zordon]` prefix:
```
[Zordon] Recorder content script loaded
[Zordon] Starting recording: rec_1234567890
[Zordon] Player script loaded
```

### Chrome DevTools

- **Popup**: Right-click extension → Inspect popup
- **Background**: chrome://extensions → Inspect service worker
- **Content**: F12 on webpage → Console

### Storage Inspection

```javascript
// View storage
chrome.storage.local.get(null, console.log)

// Clear storage
chrome.storage.local.clear()
```

---

**Last Updated**: October 12, 2025

