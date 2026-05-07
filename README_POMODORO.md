# StudyFlow Pomodoro Timer

A beautiful, customizable Pomodoro timer integrated into the StudyFlow Chrome extension.

## Features

### 🎯 **Customizable Timer Settings**
- **Focus Duration**: 1-120 minutes (default: 25 minutes)
- **Break Duration**: 1-30 minutes (default: 5 minutes)
- **Long Break**: 5-60 minutes (default: 15 minutes, every 4 sessions)

### 🔔 **Alarm & Notification System**
- **Sound Alarms**: Custom audio alerts when sessions end
- **Desktop Notifications**: Browser notifications for session completion
- **Visual Notifications**: In-app notification system with cute animations

### 🎨 **Beautiful Interface**
- **Gradient Backgrounds**: Eye-catching color schemes
- **Smooth Animations**: Fluid transitions and hover effects
- **Celebration Effects**: Emoji animations when sessions complete
- **Responsive Design**: Works on all screen sizes

### ⌨️ **Keyboard Shortcuts**
- **Spacebar**: Start/Pause timer
- **R Key**: Reset timer
- **Ctrl + Shift + P**: Secret motivational message

## How to Use

### Starting a Pomodoro Session

1. **From the Extension Popup**:
   - Click on the StudyFlow extension icon
   - Go to the "Focus Session" tab
   - Click "Start Focus" to begin a session
   - Or click "Open Full Pomodoro Timer" for the dedicated timer page

2. **Direct Access**:
   - The Pomodoro timer opens automatically when you start a focus session
   - You can also access it directly via the extension popup

### Timer Controls

- **Start**: Begin the current session
- **Pause**: Pause the current session (can be resumed)
- **Reset**: Reset to the beginning of the current session type

### Session Flow

1. **Focus Session** (25 minutes by default)
2. **Short Break** (5 minutes by default)
3. **Focus Session** (25 minutes)
4. **Short Break** (5 minutes)
5. **Focus Session** (25 minutes)
6. **Short Break** (5 minutes)
7. **Focus Session** (25 minutes)
8. **Long Break** (15 minutes by default)
9. **Repeat**...

### Customizing Settings

1. Click the gear icon (⚙️) to open settings
2. Adjust your preferred durations
3. Toggle sound alarms and notifications
4. Click "Save Settings" to apply changes

## Integration with StudyFlow

The Pomodoro timer is fully integrated with your StudyFlow extension:

- **XP Rewards**: Earn XP for completed focus sessions
- **Site Blocking**: Enhanced site blocking during focus sessions
- **Progress Tracking**: Sessions are tracked in your productivity analytics
- **Settings Sync**: Timer settings are saved and synced across sessions

## Tips for Best Results

1. **Set Realistic Goals**: Start with 25-minute focus sessions
2. **Take Breaks**: Don't skip your break time - it's important for productivity
3. **Use Notifications**: Enable both sound and desktop notifications
4. **Stay Consistent**: Try to complete full Pomodoro cycles
5. **Track Progress**: Monitor your productivity improvements over time

## Technical Details

- **File**: `pomodoro.html` - Main timer interface
- **Script**: `pomodoro.js` - Timer functionality and logic
- **Integration**: Modified `background.js` and `popup.js` for seamless integration
- **Storage**: Settings saved using Chrome's storage API
- **Permissions**: Uses existing extension permissions for notifications and storage

## Troubleshooting

**Timer not working?**
- Check if the extension has the necessary permissions
- Try refreshing the timer page
- Ensure your browser supports the required APIs

**No sound?**
- Check if sound is enabled in settings
- Ensure your browser allows audio playback
- Try enabling desktop notifications as an alternative

**Settings not saving?**
- Make sure to click "Save Settings" after making changes
- Check if Chrome storage is working properly
- Try restarting the extension

---

Enjoy your productive Pomodoro sessions! 🎯✨ 