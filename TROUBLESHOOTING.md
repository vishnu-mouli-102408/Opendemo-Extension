# 🔧 Troubleshooting Guide

## Issue: Start Recording / Playback Not Working

### ✅ Step 1: Reload the Extension (CRITICAL!)

After running `npm run build`, you MUST reload the extension in Chrome:

1. Go to `chrome://extensions/`
2. Find **"Zordon - DOM Recorder & Player"**
3. Click the **🔄 Reload** button (circular arrow icon)
4. **OR** toggle it OFF then ON
5. **OR** Remove and re-add it (Load unpacked from `dist` folder)

**⚠️ The old code stays in memory until you reload!**

---

## Complete Debugging Steps

### Step 1: Clean Build and Reload

```bash
cd /Users/hiteshshimpi/Desktop/personal/Webwiz/zordon
npm run clean
npm run build
```

Then reload in Chrome (see above).

---

### Step 2: Check Extension Logs

#### A. Check Background Service Worker

1. Go to `chrome://extensions/`
2. Find Zordon extension
3. Click **"Inspect views service worker"** (blue link)
4. This opens DevTools for the background worker
5. Try to start recording
6. Look for console logs like:
   - `[Zordon Background] Starting recording on tab: X`
   - Any errors?

#### B. Check Content Script (on the page)

1. Open any webpage (e.g., google.com)
2. Press **F12** to open DevTools
3. Go to **Console** tab
4. You should see: `[Zordon] Recorder content script loaded`
5. Click Start Recording in extension
6. Look for logs like:
   - `[Zordon] Starting recording: rec_XXXXX`
   - Any errors?

#### C. Check Popup

1. Right-click the Zordon extension icon
2. Click **"Inspect popup"**
3. Keep this DevTools window open
4. Click the extension icon again to open popup
5. Click "Start Recording"
6. Look for logs like:
   - `[Zordon Popup] Sending START_RECORDING message`
   - `[Zordon Popup] Response: {success: true}`

---

### Step 3: Verify Files Are Correct

```bash
cd /Users/hiteshshimpi/Desktop/personal/Webwiz/zordon
ls -lh dist/*.js
```

Should show:
- `background.js` (~4-5 KB)
- `content.js` (~180 KB)
- `player.js` (~226 KB)
- `popup.js` (~6 KB)

Check file dates - should be recent (after your last build).

---

### Step 4: Test Recording Flow

1. **Open a simple webpage**: `google.com`
2. **Refresh the page** (F5) - ensures content script loads
3. **Open Zordon popup**
4. **Click "Start Recording"**
5. **Look for red recording indicator** on the page (top-right)
6. **Interact with the page** (click, type, scroll)
7. **Click "Stop Recording"**

---

## Common Issues

### Issue: "Nothing happens when I click Start Recording"

**Causes:**
- Extension not reloaded after build ✅ **MOST COMMON**
- Content script not loaded on page
- Background worker crashed

**Solutions:**
1. Reload extension in `chrome://extensions/`
2. Refresh the webpage
3. Check console for errors
4. Try a different webpage (some sites block extensions)

---

### Issue: "Recording starts but no indicator appears"

**Causes:**
- CSS styles being overridden
- Content script partially loaded

**Solutions:**
1. Open DevTools (F12) → Elements tab
2. Search for `zordon-recording-indicator`
3. If not found, content script didn't inject indicator
4. Check console for errors

---

### Issue: "No events in recording"

**Causes:**
- rrweb failed to initialize
- Page blocked the recording
- Recording stopped too quickly

**Solutions:**
1. Check console: `[Zordon] Starting recording: rec_XXXXX`
2. Wait at least 2-3 seconds before stopping
3. Actually interact with the page (click, type, scroll)
4. Some sites may block rrweb (rare)

---

### Issue: "Playback button does nothing"

**Causes:**
- Playback not enabled
- Recording has no events
- Player script failed to load

**Solutions:**
1. **Toggle "Enable Playback" to ON** (critical!)
2. Check recording has events (duration > 0)
3. Open console: Look for `[Zordon Recorder] Playing recording`
4. Check for player loading errors
5. Refresh the page before playing

---

### Issue: "Extension icon missing"

**Causes:**
- Extension not pinned

**Solutions:**
1. Click puzzle piece icon in Chrome toolbar
2. Find Zordon
3. Click pin icon

---

### Issue: "Could not load file 'content.js'"

**Causes:**
- Old encoding issue (should be fixed)
- Corrupted build

**Solutions:**
```bash
npm run clean
npm run build
```
Then reload extension.

---

## Debug Commands

### View Storage Contents
```javascript
// Run in background worker console:
chrome.storage.local.get(null, console.log)

// Should show:
// {
//   recordings: [...],
//   playbackEnabled: true/false,
//   recordingStatus: "idle"/"recording"
// }
```

### Clear All Storage
```javascript
// Run in background worker console:
chrome.storage.local.clear()
console.log('Storage cleared')
```

### Check Content Script Loaded
```javascript
// Run in page console (F12):
console.log('Content script loaded?', typeof DOMRecorder)
```

---

## Expected Console Logs

### When Starting Recording:
```
[Zordon Popup] Sending START_RECORDING message
[Zordon Background] Starting recording on tab: 123
[Zordon Background] Recording started successfully
[Zordon Popup] Response: {success: true, status: "recording"}
[Zordon Popup] Recording started successfully
[Zordon] Starting recording: rec_1234567890
```

### When Stopping Recording:
```
[Zordon] Stopping recording
[Zordon Background] Recording saved
```

### When Playing Back:
```
[Zordon Popup] Playing recording: rec_1234567890
[Zordon Background] Playing recording: rec_1234567890 on tab: 123
[Zordon Background] Found recording: rec_1234567890 with 156 events
[Zordon Recorder] Playing recording: rec_1234567890 with 156 events
[Zordon Recorder] Loading player script
[Zordon Recorder] Player script loaded, sending recording
[Zordon] Player script loaded
[Zordon] Initializing player for: rec_1234567890
[Zordon] Player initialized successfully
```

---

## Still Not Working?

### Nuclear Option: Complete Reinstall

```bash
# 1. Remove extension from Chrome
Go to chrome://extensions/ → Remove Zordon

# 2. Clean everything
cd /Users/hiteshshimpi/Desktop/personal/Webwiz/zordon
npm run clean
rm -rf node_modules package-lock.json

# 3. Reinstall and rebuild
npm install
npm run build

# 4. Load fresh in Chrome
chrome://extensions/ → Load unpacked → Select dist folder
```

---

## Quick Checklist

Before asking for help, verify:

- [ ] Extension reloaded after build
- [ ] Webpage refreshed after installing extension
- [ ] Checked background worker console (no errors)
- [ ] Checked page console (content script loaded)
- [ ] Checked popup console (messages sent)
- [ ] Tried on a simple page (google.com)
- [ ] "Enable Playback" toggle is ON (for playback)
- [ ] Recording has events (duration > 0)

---

## Get More Help

If still stuck, provide:
1. What you clicked
2. What happened (or didn't happen)
3. Any error messages from console
4. Which console (background/page/popup)
5. Screenshots if possible

---

**Most issues are fixed by reloading the extension! 🔄**

