// Pomodoro Timer JavaScript
class PomodoroTimer {
    constructor() {
        this.isRunning = false;
        this.isPaused = false;
        this.currentMode = 'focus'; // 'focus', 'break', 'longBreak'
        this.timeRemaining = 25 * 60; // 25 minutes in seconds
        this.totalTime = 0;
        this.sessionCount = 1;
        this.settings = {
            focus: 25,
            break: 5,
            longBreak: 15,
            soundEnabled: true,
            notificationEnabled: true
        };
        
        this.timer = null;
        this.audio = null;
        
        this.initializeElements();
        this.loadSettings();
        this.setupEventListeners();
        this.updateDisplay();
    }

    initializeElements() {
        this.elements = {
            timer: document.getElementById('timer'),
            timerLabel: document.getElementById('timerLabel'),
            progressBar: document.getElementById('progressBar'),
            sessionCount: document.getElementById('sessionCount'),
            totalTime: document.getElementById('totalTime'),
            startBtn: document.getElementById('startBtn'),
            pauseBtn: document.getElementById('pauseBtn'),
            resetBtn: document.getElementById('resetBtn'),
            settingsToggle: document.getElementById('settingsToggle'),
            settingsPanel: document.getElementById('settingsPanel'),
            focusDuration: document.getElementById('focusDuration'),
            breakDuration: document.getElementById('breakDuration'),
            longBreakDuration: document.getElementById('longBreakDuration'),
            soundToggle: document.getElementById('soundToggle'),
            notificationToggle: document.getElementById('notificationToggle'),
            saveSettings: document.getElementById('saveSettings'),
            notification: document.getElementById('notification')
        };
    }

    setupEventListeners() {
        // Timer controls
        this.elements.startBtn.addEventListener('click', () => this.startTimer());
        this.elements.pauseBtn.addEventListener('click', () => this.pauseTimer());
        this.elements.resetBtn.addEventListener('click', () => this.resetTimer());

        // Settings
        this.elements.settingsToggle.addEventListener('click', () => this.toggleSettings());
        this.elements.saveSettings.addEventListener('click', () => this.saveSettings());

        // Alarm toggles
        this.elements.soundToggle.addEventListener('click', () => this.toggleSound());
        this.elements.notificationToggle.addEventListener('click', () => this.toggleNotification());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                if (this.isRunning) {
                    this.pauseTimer();
                } else {
                    this.startTimer();
                }
            } else if (e.code === 'KeyR') {
                this.resetTimer();
            }
        });

        // Request notification permission
        if ('Notification' in window) {
            Notification.requestPermission();
        }
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.local.get(['pomodoroSettings']);
            if (result.pomodoroSettings) {
                this.settings = { ...this.settings, ...result.pomodoroSettings };
                this.updateSettingsDisplay();
            }
        } catch (error) {
            console.log('No saved settings found, using defaults');
        }
    }

    updateSettingsDisplay() {
        this.elements.focusDuration.value = this.settings.focus;
        this.elements.breakDuration.value = this.settings.break;
        this.elements.longBreakDuration.value = this.settings.longBreak;
        
        this.elements.soundToggle.classList.toggle('active', this.settings.soundEnabled);
        this.elements.notificationToggle.classList.toggle('active', this.settings.notificationEnabled);
    }

    startTimer() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.isPaused = false;
            
            this.elements.startBtn.style.display = 'none';
            this.elements.pauseBtn.style.display = 'inline-block';
            
            this.timer = setInterval(() => {
                this.timeRemaining--;
                this.totalTime++;
                this.updateDisplay();
                
                if (this.timeRemaining <= 0) {
                    this.completeSession();
                }
            }, 1000);
        }
    }

    pauseTimer() {
        if (this.isRunning) {
            this.isRunning = false;
            this.isPaused = true;
            
            clearInterval(this.timer);
            this.timer = null;
            
            this.elements.startBtn.style.display = 'inline-block';
            this.elements.pauseBtn.style.display = 'none';
        }
    }

    resetTimer() {
        this.isRunning = false;
        this.isPaused = false;
        
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        
        this.currentMode = 'focus';
        this.sessionCount = 1;
        this.timeRemaining = this.settings.focus * 60;
        this.totalTime = 0;
        
        this.elements.startBtn.style.display = 'inline-block';
        this.elements.pauseBtn.style.display = 'none';
        this.elements.timerLabel.textContent = 'Focus Time';
        
        this.updateDisplay();
    }

    completeSession() {
        clearInterval(this.timer);
        this.timer = null;
        this.isRunning = false;
        
        this.elements.startBtn.style.display = 'inline-block';
        this.elements.pauseBtn.style.display = 'none';
        
        // Add celebration animation
        this.addCelebrationAnimation();
        
        // Play alarm and show notification
        this.playAlarm();
        this.showNotification();
        
        // Determine next mode
        if (this.currentMode === 'focus') {
            this.sessionCount++;
            if (this.sessionCount % 4 === 0) {
                this.currentMode = 'longBreak';
                this.timeRemaining = this.settings.longBreak * 60;
                this.elements.timerLabel.textContent = 'Long Break';
            } else {
                this.currentMode = 'break';
                this.timeRemaining = this.settings.break * 60;
                this.elements.timerLabel.textContent = 'Break Time';
            }
        } else {
            this.currentMode = 'focus';
            this.timeRemaining = this.settings.focus * 60;
            this.elements.timerLabel.textContent = 'Focus Time';
        }
        
        this.updateDisplay();
        
        // Auto-start next session after 3 seconds
        setTimeout(() => {
            if (!this.isRunning) {
                this.startTimer();
            }
        }, 3000);
    }

    updateDisplay() {
        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = this.timeRemaining % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        this.elements.timer.textContent = timeString;
        this.elements.sessionCount.textContent = this.sessionCount;
        
        const totalMinutes = Math.floor(this.totalTime / 60);
        const totalSeconds = this.totalTime % 60;
        this.elements.totalTime.textContent = `${totalMinutes}:${totalSeconds.toString().padStart(2, '0')}`;
        
        // Update progress bar
        const totalDuration = this.currentMode === 'focus' ? this.settings.focus * 60 : 
                            this.currentMode === 'break' ? this.settings.break * 60 : 
                            this.settings.longBreak * 60;
        const progress = ((totalDuration - this.timeRemaining) / totalDuration) * 100;
        this.elements.progressBar.style.width = `${progress}%`;
        
        // Change timer color based on mode
        const timerDisplay = document.querySelector('.timer-display');
        if (this.currentMode === 'focus') {
            timerDisplay.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
        } else if (this.currentMode === 'break') {
            timerDisplay.style.background = 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)';
        } else {
            timerDisplay.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        }
    }

    playAlarm() {
        if (!this.settings.soundEnabled) return;
        
        try {
            // Create audio context for custom alarm sound
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
            
            // Play multiple beeps
            setTimeout(() => {
                const oscillator2 = audioContext.createOscillator();
                const gainNode2 = audioContext.createGain();
                
                oscillator2.connect(gainNode2);
                gainNode2.connect(audioContext.destination);
                
                oscillator2.frequency.setValueAtTime(800, audioContext.currentTime);
                oscillator2.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
                oscillator2.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
                
                gainNode2.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                
                oscillator2.start(audioContext.currentTime);
                oscillator2.stop(audioContext.currentTime + 0.5);
            }, 600);
            
        } catch (error) {
            console.log('Audio not supported, using fallback');
        }
    }

    showNotification() {
        if (!this.settings.notificationEnabled) return;
        
        const message = this.currentMode === 'focus' ? 
            'Focus session completed! Take a break! 🎉' :
            'Break time is over! Back to focus! 💪';
        
        this.elements.notification.innerHTML = `<i class="fas fa-bell"></i> ${message}`;
        this.elements.notification.classList.add('show');
        
        // Hide notification after 5 seconds
        setTimeout(() => {
            this.elements.notification.classList.remove('show');
        }, 5000);
        
        // Desktop notification
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('StudyFlow Pomodoro', {
                body: message,
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%23667eea"/><text x="50" y="60" text-anchor="middle" fill="white" font-size="40">⏰</text></svg>',
                badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%23667eea"/><text x="50" y="60" text-anchor="middle" fill="white" font-size="40">⏰</text></svg>'
            });
        }
    }

    toggleSettings() {
        this.elements.settingsPanel.classList.toggle('show');
    }

    toggleSound() {
        this.settings.soundEnabled = !this.settings.soundEnabled;
        this.elements.soundToggle.classList.toggle('active', this.settings.soundEnabled);
    }

    toggleNotification() {
        this.settings.notificationEnabled = !this.settings.notificationEnabled;
        this.elements.notificationToggle.classList.toggle('active', this.settings.notificationEnabled);
        
        if (this.settings.notificationEnabled && 'Notification' in window) {
            Notification.requestPermission();
        }
    }

    async saveSettings() {
        this.settings.focus = parseInt(this.elements.focusDuration.value) || 25;
        this.settings.break = parseInt(this.elements.breakDuration.value) || 5;
        this.settings.longBreak = parseInt(this.elements.longBreakDuration.value) || 15;
        
        try {
            await chrome.storage.local.set({ pomodoroSettings: this.settings });
            
            // Update current timer if not running
            if (!this.isRunning) {
                this.timeRemaining = this.settings.focus * 60;
                this.updateDisplay();
            }
            
            this.showMessage('Settings saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showMessage('Error saving settings', 'error');
        }
    }

    showMessage(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `<i class="fas fa-${type === 'success' ? 'check' : 'exclamation-triangle'}"></i> ${message}`;
        notification.style.background = type === 'success' ? 
            'linear-gradient(135deg, #4ecdc4, #44a08d)' : 
            'linear-gradient(135deg, #ff6b6b, #ee5a52)';
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    addCelebrationAnimation() {
        const container = document.querySelector('.container');
        const emojis = ['🎉', '✨', '🌟', '💪', '🎯', '🔥', '⭐', '🏆'];
        
        for (let i = 0; i < 12; i++) {
            setTimeout(() => {
                const emoji = document.createElement('div');
                emoji.textContent = emojis[Math.floor(Math.random() * emojis.length)];
                emoji.style.position = 'absolute';
                emoji.style.left = Math.random() * 100 + '%';
                emoji.style.top = Math.random() * 100 + '%';
                emoji.style.fontSize = '2rem';
                emoji.style.pointerEvents = 'none';
                emoji.style.zIndex = '1000';
                emoji.style.animation = 'celebration 2s ease-out forwards';
                
                container.appendChild(emoji);
                
                setTimeout(() => {
                    if (emoji.parentNode) {
                        emoji.parentNode.removeChild(emoji);
                    }
                }, 2000);
            }, i * 100);
        }
    }
}

// Initialize the timer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const pomodoroTimer = new PomodoroTimer();
    
    // Add some cute animations
    const container = document.querySelector('.container');
    container.style.opacity = '0';
    container.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        container.style.transition = 'all 0.5s ease';
        container.style.opacity = '1';
        container.style.transform = 'translateY(0)';
    }, 100);
    
    // Add confetti effect on session completion (optional)
    window.pomodoroTimer = pomodoroTimer; // Make it globally accessible for debugging
});

// Add some fun Easter eggs
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyP') {
        // Secret keyboard shortcut to show a motivational message
        const messages = [
            "You're doing amazing! 🌟",
            "Keep up the great work! 💪",
            "You've got this! 🚀",
            "Stay focused, stay awesome! ✨",
            "Every session counts! 🎯"
        ];
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.innerHTML = `<i class="fas fa-star"></i> ${randomMessage}`;
        notification.style.background = 'linear-gradient(135deg, #feca57, #ff9ff3)';
        
        document.body.appendChild(notification);
        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);
    }
}); 