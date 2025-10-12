# 🚀 Quick Start Guide

## Installation (5 minutes)

### Step 1: Build the Extension
```bash
cd /Users/hiteshshimpi/Desktop/personal/Webwiz/zordon
npm install  # Already done ✓
npm run build  # Already done ✓
```

### Step 2: Load in Chrome
1. Open Chrome browser
2. Navigate to `chrome://extensions/`
3. Toggle **"Developer mode"** ON (top-right corner)
4. Click **"Load unpacked"** button
5. Select the `dist` folder: `/Users/hiteshshimpi/Desktop/personal/Webwiz/zordon/dist`
6. The extension will appear with a purple/gradient icon

## Using the Extension

### Recording a Session

1. **Click the Zordon extension icon** in your Chrome toolbar
2. **Click "Start Recording"** button (green play button)
3. Navigate to any website and interact:
   - Click buttons
   - Fill forms
   - Scroll pages
   - Type text
4. **Click "Stop Recording"** when done (red stop button)
5. Your recording is automatically saved!

### Playing Back a Recording

1. **Open the Zordon popup**
2. **Toggle "Enable Playback"** to ON
3. **Click "View Recordings"**
4. **Click "▶️ Play"** on any recording
5. Watch your interactions replay in full detail!

## Features Overview

### Recording Controls
- ⏺️ **Start Recording**: Begin capturing interactions
- ⏹️ **Stop Recording**: Save and stop capture
- 🔴 **Recording Indicator**: Shows when recording is active

### Playback Controls
- ▶️ **Enable/Disable**: Toggle playback functionality
- 📋 **View Recordings**: See all saved sessions
- ▶️ **Play**: Watch a recording
- 🗑️ **Delete**: Remove unwanted recordings

### What Gets Recorded
- ✅ All clicks and interactions
- ✅ Text input (forms, fields)
- ✅ Scrolling behavior
- ✅ Page navigation
- ✅ DOM changes and updates
- ✅ Mouse movements
- ✅ Keyboard events
- ✅ Canvas elements
- ✅ Dynamic content

## File Structure

```
zordon/
├── dist/                    # Built extension (load this in Chrome)
│   ├── manifest.json
│   ├── popup.html
│   ├── background.js
│   ├── content.js
│   ├── player.js
│   └── icons/
├── src/                     # Source TypeScript files
│   ├── background/         # Service worker
│   ├── content/            # Recording & playback
│   ├── popup/              # UI controls
│   └── types/              # TypeScript interfaces
├── public/                  # Static assets
├── package.json
└── webpack.config.js
```

## Development Commands

```bash
# Build for production
npm run build

# Build and watch for changes (auto-rebuild)
npm run watch

# Clean build directory
npm run clean

# Create new icons (requires ImageMagick)
npm run create-icons
```

## Troubleshooting

### Extension not appearing?
- Make sure you loaded the `dist` folder, not the root folder
- Check that Developer mode is enabled
- Try removing and re-adding the extension

### Recording not starting?
- Check the console for errors (F12)
- Make sure you clicked "Start Recording"
- Refresh the page and try again
- Check that the content script loaded

### Playback not working?
- Ensure "Enable Playback" toggle is ON
- Make sure the recording has events
- Check that the recording was saved properly
- Try on a different webpage

### Build errors?
```bash
# Clean and rebuild
npm run clean
npm run build

# If still failing, reinstall dependencies
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Next Steps

### Customize Recording
Edit `src/content/recorder.ts` to change recording settings:
- Mask sensitive inputs
- Adjust sampling rates
- Configure checkpoint intervals
- Add custom selectors

### Enhance UI
Modify `public/popup.html` to customize:
- Color scheme
- Button layouts
- Recording list display
- Status indicators

### Add Features
Potential enhancements:
- Export recordings as JSON
- Share recordings between devices
- Add recording notes/tags
- Implement recording search
- Add keyboard shortcuts
- Create recording categories

## Support

For issues or questions, check:
- Console logs (F12 > Console)
- Background service worker logs
- Storage contents (chrome://extensions > Zordon > Inspect views)

## Demo Workflow

1. **Install Extension** → Load `dist` folder in Chrome
2. **Record Session** → Click Start, interact with any site, click Stop
3. **View Recordings** → See saved sessions with timestamps
4. **Playback** → Enable playback, select recording, watch replay
5. **Manage** → Delete old recordings, create new ones

---

**🎉 You're all set! Happy recording!**

**Tip**: Try recording a complex workflow like:
- Filling out a multi-step form
- Shopping cart flow
- Dashboard interactions
- Image gallery navigation

