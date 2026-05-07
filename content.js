// content.js - Enhanced content script with web monitoring

// ========== WEB MONITORING INTEGRATION ==========
class ContentTracker {
  constructor() {
    this.isActive = true;
    this.lastActivity = Date.now();
    this.inactivityThreshold = 30000; // 30 seconds
    this.setupActivityTracking();
  }

  setupActivityTracking() {
    // Track user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, () => {
        this.updateActivity();
      }, { passive: true });
    });

    // Check for inactivity
    setInterval(() => {
      this.checkInactivity();
    }, 5000);

    // Track page visibility
    document.addEventListener('visibilitychange', () => {
      this.handleVisibilityChange();
    });

    // Track focus/blur events
    window.addEventListener('focus', () => {
      this.handleFocus();
    });

    window.addEventListener('blur', () => {
      this.handleBlur();
    });
  }

  updateActivity() {
    this.lastActivity = Date.now();
    if (!this.isActive) {
      this.isActive = true;
      this.notifyBackground('activity_resumed');
    }
  }

  checkInactivity() {
    const now = Date.now();
    if (now - this.lastActivity > this.inactivityThreshold && this.isActive) {
      this.isActive = false;
      this.notifyBackground('activity_paused');
    }
  }

  handleVisibilityChange() {
    if (document.hidden) {
      this.notifyBackground('page_hidden');
    } else {
      this.notifyBackground('page_visible');
      this.updateActivity();
    }
  }

  handleFocus() {
    this.notifyBackground('page_focused');
    this.updateActivity();
  }

  handleBlur() {
    this.notifyBackground('page_blurred');
  }

  notifyBackground(event) {
    try {
      chrome.runtime.sendMessage({
        action: 'content_event',
        event: event,
        url: window.location.href,
        timestamp: Date.now(),
        isActive: this.isActive
      })
      .catch(err => {
        // Handle error silently - extension might be reloading
      });
    } catch (error) {
      // Handle error silently - extension might be reloading
    }
  }

  // Track scroll depth for engagement metrics
  trackScrollDepth() {
    const scrollPercent = Math.round(
      ((window.scrollY + window.innerHeight) / document.body.scrollHeight) * 100
    );
    
    if (scrollPercent > 0 && scrollPercent % 25 === 0) {
      this.notifyBackground('scroll_milestone', { scrollPercent });
    }
  }

  // Track time spent reading (based on scroll behavior)
  trackReadingTime() {
    let readingTime = 0;
    let lastScrollTime = Date.now();
    
    window.addEventListener('scroll', () => {
      const now = Date.now();
      const timeDiff = now - lastScrollTime;
      
      if (timeDiff > 1000 && timeDiff < 10000) { // Between 1-10 seconds
        readingTime += timeDiff;
      }
      
      lastScrollTime = now;
    });
    
    // Send reading time every minute
    setInterval(() => {
      if (readingTime > 0) {
        this.notifyBackground('reading_time', { readingTime });
        readingTime = 0;
      }
    }, 60000);
  }
}

// Initialize content tracker
const contentTracker = new ContentTracker();

// Enhanced activity tracking
window.addEventListener('scroll', () => {
  contentTracker.trackScrollDepth();
});

contentTracker.trackReadingTime();

// ========== ORIGINAL STUDYFLOW CONTENT SCRIPT FUNCTIONALITY ==========

// 1. Extract basic info about the current page
const pageInfo = {
  url: window.location.href,
  title: document.title,
  timestamp: Date.now()
};

// 2. Listen for messages from background/popup (for quick note-taking, AI tools, etc.)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_PAGE_INFO') {
    sendResponse(pageInfo);
  }

  // Example: Highlight distractions if requested
  if (message.type === 'HIGHLIGHT_DISTRACTION') {
    highlightDistractions();
    sendResponse({status: "highlighted"});
  }

  // Example: Show motivational overlay
  if (message.type === 'SHOW_MOTIVATION') {
    showMotivationalOverlay(message.quote);
    sendResponse({status: "shown"});
  }
});

// 3. Helper: Highlight distraction elements (e.g., YouTube comments, social feeds)
function highlightDistractions() {
  // Example: Blur YouTube comments
  if (window.location.hostname.includes("youtube.com")) {
    const comments = document.getElementById('comments');
    if (comments) comments.style.filter = "blur(8px)";
  }
  // Add more site-specific logic as needed
}

// 4. Helper: Show a motivational overlay
function showMotivationalOverlay(quote) {
  let overlay = document.getElementById('study-motivation-overlay');
  if (overlay) overlay.remove();

  overlay = document.createElement('div');
  overlay.id = 'study-motivation-overlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.background = 'rgba(0, 0, 0, 0.7)';
  overlay.style.color = '#fff';
  overlay.style.display = 'flex';
  overlay.style.flexDirection = 'column';
  overlay.style.justifyContent = 'center';
  overlay.style.alignItems = 'center';
  overlay.style.zIndex = '999999';
  overlay.style.fontSize = '2em';
  overlay.innerHTML = `<div style="max-width: 80vw; text-align: center;">${quote}</div>
    <button id="close-motivation-overlay" style="margin-top: 2em; padding: 0.5em 2em; font-size: 1em;">Close</button>`;
  document.body.appendChild(overlay);

  document.getElementById('close-motivation-overlay').onclick = () => overlay.remove();
}

// 5. (Optional) Quick note-taking: Listen for keyboard shortcut (Alt+N)
document.addEventListener('keydown', function(e) {
  if (e.altKey && e.key.toLowerCase() === 'n') {
    const note = prompt("Quick Note for this page:");
    if (note) {
      chrome.runtime.sendMessage({type: "SAVE_QUICK_NOTE", note, pageInfo})
      .catch(err => {
        // Handle error silently - extension might be reloading
      });
    }
  }
});

// 6. (Optional) Send page info to background for analytics (if needed)
chrome.runtime.sendMessage({type: "PAGE_VISITED", pageInfo})
  .catch(err => {
    // Handle error silently - extension might be reloading
  });