# Deep Work Blocker Chrome Extension

A Chrome extension designed to help you maintain focus during deep work sessions by blocking distracting websites with an integrated timer.

## Features

- **Website Blocking**: Block specific websites during deep work sessions
- **Timer Functionality**: Start and stop timer to track your deep work sessions
- **Customizable Block List**: Add and remove websites from your block list
- **Beautiful UI**: Modern, gradient-based interface with smooth animations
- **Session Persistence**: Your session continues even if you close the popup
- **Motivational Blocking Page**: Encouraging message when you try to access blocked sites

## Installation

### Option 1: Developer Mode (Recommended for now)

1. **Download or Clone** this repository to your local machine
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer Mode** by toggling the switch in the top-right corner
4. **Click "Load unpacked"** and select the folder containing the extension files
5. **Pin the extension** to your toolbar by clicking the puzzle piece icon and pinning "Deep Work Blocker"

### Option 2: Chrome Web Store (Coming Soon)
The extension will be available on the Chrome Web Store once published.

## How to Use

### Starting a Deep Work Session

1. **Click the extension icon** in your Chrome toolbar
2. **Review your blocked sites** in the popup (default sites are pre-loaded)
3. **Click "Start Session"** to begin blocking the listed websites
4. **Watch the timer** count up as you maintain focus

### Managing Blocked Sites

1. **Add a website**: Type a domain (e.g., `facebook.com`) in the input field and click "Add"
2. **Remove a website**: Click the "Remove" button next to any site in the list
3. **Changes take effect immediately** if a session is active

### Ending a Session

1. **Click the extension icon** to open the popup
2. **Click "Stop Session"** to end the blocking and reset the timer
3. **Celebrate your focused work time!** 🎉


You can remove any of these or add your own distracting websites.

## What Happens When You Try to Visit a Blocked Site?

When you attempt to visit a blocked website during an active session, you'll see a beautiful blocking page that:
- Shows your current session time
- Provides motivational quotes about deep work
- Suggests alternative productive activities
- Allows you to go back to your previous page

## Technical Details

- **Manifest Version**: 3 (latest Chrome extension standard)
- **Permissions**: Storage, tabs, declarativeNetRequest, alarms
- **Blocking Method**: Uses Chrome's declarativeNetRequest API for efficient blocking
- **Storage**: All settings and session data are stored locally

## File Structure

```
blocker-chrome-extension/
├── manifest.json          # Extension configuration
├── background.js          # Service worker for blocking logic
├── popup.html            # Extension popup interface
├── popup.js              # Popup functionality
├── blocked.html          # Page shown when sites are blocked
├── rules.json            # Dynamic blocking rules (managed by background script)
├── icons/                # Extension icons (add your own 16x16, 32x32, 48x48, 128x128 PNG files)
└── README.md            # This file
```

## Privacy

- **No data collection**: The extension doesn't collect or transmit any personal data
- **Local storage only**: All settings and session data are stored locally on your device
- **No tracking**: No analytics or tracking mechanisms are included

## Contributing

Feel free to submit issues, feature requests, or pull requests to improve the extension!

## License

This project is open source

## Inspiration

I be distracted and want to block website that don't adhere to my goals 

---
