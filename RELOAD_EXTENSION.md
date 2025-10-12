# 🔄 How to Reload the Extension

## The encoding issue has been fixed! Follow these steps:

### Step 1: Remove Old Version (Important!)
1. Open Chrome: `chrome://extensions/`
2. Find **"Zordon - DOM Recorder & Player"**
3. Click **"Remove"** button
4. Confirm removal

### Step 2: Clear Chrome Cache (Optional but Recommended)
1. Press `Cmd + Shift + Delete` (Mac) or `Ctrl + Shift + Delete` (Windows)
2. Select "Cached images and files"
3. Click "Clear data"

### Step 3: Load Fresh Extension
1. Still on `chrome://extensions/`
2. Make sure **"Developer mode"** is ON (top-right)
3. Click **"Load unpacked"**
4. Select: `/Users/hiteshshimpi/Desktop/personal/Webwiz/zordon/dist`
5. Click "Select"

### Step 4: Verify Installation
You should see:
- ✅ Extension loaded without errors
- ✅ Zordon icon in toolbar
- ✅ No error messages in the extension card

## What Was Fixed?

The webpack configuration was updated to:
- ✅ Output pure **ASCII text** (Chrome-friendly)
- ✅ Removed source maps that can cause encoding issues
- ✅ Added `ascii_only` flag to terser
- ✅ Better Chrome extension compatibility

## File Verification
```bash
# The content.js file is now:
- Format: ASCII text (not UTF-8, which is better!)
- Size: 179 KB
- Status: Clean, no encoding issues
```

## If You Still Get Errors

### Error: "Could not load file 'content.js'"
**Solution**: Make sure you're loading the `dist` folder, not the root folder

### Error: "File not found"
**Solution**: Run `npm run build` again to regenerate dist folder

### Error: "Extension is corrupt"
**Solution**:
```bash
cd /Users/hiteshshimpi/Desktop/personal/Webwiz/zordon
npm run clean
npm run build
# Then reload in Chrome
```

### Extension loads but doesn't work
**Solution**: 
1. Open DevTools (F12) on any webpage
2. Check Console for errors
3. Make sure to refresh the page after installing extension

## Troubleshooting Commands

```bash
# Verify the build is clean
cd /Users/hiteshshimpi/Desktop/personal/Webwiz/zordon

# Check file encoding
file dist/content.js
# Should say: "ASCII text"

# Rebuild from scratch
npm run clean
npm run build

# Check all files exist
ls -lh dist/
```

## Expected Files in dist/
- ✅ background.js (3.8 KB)
- ✅ content.js (179 KB) - **Now ASCII encoded!**
- ✅ player.js (226 KB)
- ✅ popup.js (5.5 KB)
- ✅ popup.html
- ✅ manifest.json
- ✅ icons/ (folder with 3 PNG files)

---

**The extension is now ready and the encoding issue is fixed!**

If you continue to have problems, let me know the exact error message.

