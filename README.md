# 🎬 Zordon - DOM Recording & Playback Chrome Extension

A powerful Chrome extension for recording and playing back user interactions and DOM changes. Built with TypeScript and rrweb for high-fidelity session replay.

## ✨ Features

- **🔴 DOM Recording**: Capture all user interactions, DOM changes, and page state
- **▶️ Playback**: Replay recorded sessions with full controls
- **🎯 Smart Capture**: Records clicks, inputs, scrolls, and all user interactions
- **💾 Local Storage**: Recordings saved locally in Chrome storage
- **🎨 Beautiful UI**: Modern, gradient-based interface
- **🔒 Privacy-Focused**: All data stored locally, no external servers
- **⚡ Performance Optimized**: Efficient recording with minimal overhead

## 🚀 Getting Started

### Prerequisites

- Node.js 16+ and npm
- Google Chrome browser

### Installation

1. **Clone and install dependencies**:
   ```bash
   npm install
   ```

2. **Build the extension**:
   ```bash
   npm run build
   ```

3. **Load in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `dist` folder from this project

## 📖 Usage

### Recording Sessions

1. Click the Zordon extension icon in your Chrome toolbar
2. Click **"Start Recording"** button
3. Interact with any webpage - all actions are captured
4. Click **"Stop Recording"** when done
5. Your recording is automatically saved

### Playing Back Recordings

1. Open the Zordon popup
2. Toggle **"Enable Playback"** to ON
3. Click **"View Recordings"** to see saved sessions
4. Click **"▶️ Play"** on any recording
5. Watch your interactions replayed in full detail

### Managing Recordings

- **View All**: Click "View Recordings" to see your saved sessions
- **Play**: Click the play button to watch a recording
- **Delete**: Click the trash icon to remove a recording
- **Storage**: All recordings stored in Chrome's local storage

## 🛠️ Development

### Project Structure

```
zordon/
├── src/
│   ├── background/
│   │   └── service-worker.ts    # Extension background service
│   ├── content/
│   │   ├── recorder.ts          # DOM recording logic
│   │   └── player.ts            # Playback functionality
│   ├── popup/
│   │   └── popup.ts             # Popup UI controller
│   └── types/
│       └── index.ts             # TypeScript interfaces
├── public/
│   ├── manifest.json            # Chrome extension manifest
│   ├── popup.html               # Popup UI
│   └── icons/                   # Extension icons
├── package.json
├── tsconfig.json
└── webpack.config.js
```

### Available Scripts

```bash
# Build for production
npm run build

# Build and watch for changes
npm run watch

# Clean build directory
npm run clean
```

### Architecture

**Recording Flow**:
1. User clicks "Start Recording" in popup
2. Popup sends message to background service worker
3. Background worker sends message to content script
4. Content script initializes rrweb recorder
5. All DOM events captured and stored
6. On stop, events sent back to background worker
7. Recording saved to Chrome storage

**Playback Flow**:
1. User enables playback and selects recording
2. Recording data sent to content script
3. Player script injected into page
4. rrweb-player initialized with recording data
5. Session replayed with full controls

## 🔧 Technical Details

### Technologies

- **TypeScript**: Type-safe development
- **rrweb**: Industry-standard DOM recording library
- **Webpack**: Module bundling and optimization
- **Chrome Extension Manifest V3**: Latest extension API

### Key Features

- **MutationObserver**: Tracks all DOM changes
- **Event Delegation**: Efficient event capture
- **Incremental Snapshots**: Memory-efficient recording
- **Canvas Recording**: Captures canvas elements
- **Font Collection**: Preserves custom fonts
- **Checkpoint System**: Long recording support

### Configuration

Recording behavior can be customized in `src/content/recorder.ts`:

```typescript
record({
  checkoutEveryNms: 10 * 60 * 1000,  // Checkpoint interval
  recordCanvas: true,                 // Record canvas elements
  maskAllInputs: false,               // Mask sensitive inputs
  sampling: {
    scroll: 150,                      // Scroll sampling rate
    input: 'last'                     // Input recording strategy
  }
})
```

## 🎨 UI Customization

The popup UI uses inline styles and can be customized in `public/popup.html`. The interface features:

- Gradient backgrounds
- Smooth animations
- Responsive design
- Status indicators
- Recording list with controls

## 📦 Building for Distribution

1. Build the extension:
   ```bash
   npm run build
   ```

2. The `dist` folder contains your extension

3. To create a ZIP for Chrome Web Store:
   ```bash
   cd dist && zip -r ../zordon-extension.zip . && cd ..
   ```

## 🔒 Privacy & Security

- **Local Storage**: All recordings stored locally in Chrome
- **No External Servers**: No data sent to external services
- **Mask Sensitive Data**: Configure masking for inputs
- **User Control**: Full control over recordings

## 🐛 Troubleshooting

### Recording doesn't start
- Check console for errors (F12 > Console)
- Ensure content script loaded (check page source)
- Try reloading the extension

### Playback not working
- Ensure "Enable Playback" toggle is ON
- Check if recording has events
- Verify rrweb-player loaded correctly

### Missing icons
- Icons should be placed in `public/icons/`
- Sizes: 16x16, 48x48, 128x128
- Format: PNG with transparency

## 🤝 Contributing

This is a private project. For issues or suggestions, contact the maintainer.

## 📄 License

Private - All rights reserved

## 🙏 Acknowledgments

- Built with [rrweb](https://github.com/rrweb-io/rrweb)
- Inspired by modern session replay tools
- Designed for the Webwiz/Zordon project

---

**Made with ❤️ for better web debugging and testing**

