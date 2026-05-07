// background.js

// ========== CONSTANTS ==========
const BLOCKED_SITES_KEY = 'blockedSites';
const ACTIVITY_LOG_KEY = 'activityLog';
const XP_KEY = 'xp';
const STREAK_KEY = 'streak';
const LAST_ACTIVE_DATE_KEY = 'lastActiveDate';
const DAILY_LIMIT_KEY = 'dailyLimit';
const SITE_TIME_KEY = 'siteTime';
const MOTIVATIONAL_QUOTES = [
  "Stay focused and never give up!",
  "Every small step counts!",
  "Consistency is the key to success!",
  "Great things take time. Keep going!"
];

// ========== WEB MONITORING INTEGRATION ==========
class StudyFlowTracker {
  constructor() {
    this.tabData = new Map();
    this.currentActiveTab = null;
    this.lastActiveTime = Date.now();
    this.updateInterval = 15000; // 15 seconds
    this.initializeExtension();
  }

  initializeExtension() {
    console.log('StudyFlow extension with web monitoring initialized');
    this.setupEventListeners();
    this.startPeriodicUpdates();
    this.loadExistingData();
    this.checkDailyReset();
  }

  async loadExistingData() {
    try {
      const result = await chrome.storage.local.get();
      const today = new Date().toISOString().split('T')[0];
      
      for (const [key, value] of Object.entries(result)) {
        if (key.startsWith('tab_')) {
          const lastAccessed = value.lastAccessed ? new Date(value.lastAccessed) : null;
          if (!lastAccessed || isNaN(lastAccessed.getTime())) {
            // Skip invalid or missing date
            continue;
          }
          const tabDate = lastAccessed.toISOString().split('T')[0];

          // Only load data from today
          if (tabDate === today) {
            this.tabData.set(parseInt(key.replace('tab_', '')), {
              ...value,
              lastAccessed
            });
          }
        }
      }
      console.log('Loaded existing monitoring data for today:', this.tabData.size, 'tabs');
    } catch (error) {
      console.error('Error loading existing data:', error);
    }
  }

  setupEventListeners() {
    // Tab activation
    chrome.tabs.onActivated.addListener((activeInfo) => {
      this.handleTabActivation(activeInfo.tabId);
    });

    // Tab updates
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        this.handleTabUpdate(tabId, tab);
      }
    });

    // Tab removal
    chrome.tabs.onRemoved.addListener((tabId) => {
      this.handleTabRemoval(tabId);
    });

    // Window focus changes
    chrome.windows.onFocusChanged.addListener((windowId) => {
      if (windowId === chrome.windows.WINDOW_ID_NONE) {
        this.handleWindowUnfocus();
      } else {
        this.handleWindowFocus();
      }
    });

    // Idle state detection
    chrome.idle.onStateChanged.addListener((state) => {
      this.handleIdleStateChange(state);
    });
  }

  async handleTabActivation(tabId) {
    try {
      // Save time for previously active tab
      if (this.currentActiveTab && this.currentActiveTab !== tabId) {
        await this.updateTabTime(this.currentActiveTab);
        await updateProductiveBookmarks(); // Real-time auto-bookmark
      }
      // Get tab info
      const tab = await chrome.tabs.get(tabId);
      if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
        this.currentActiveTab = tabId;
        this.lastActiveTime = Date.now();
        // Initialize or update tab data
        await this.initializeTabData(tabId, tab);
        // Mark as active
        const tabInfo = this.tabData.get(tabId);
        if (tabInfo) {
          tabInfo.isActive = true;
          tabInfo.lastAccessed = new Date();
          await this.saveTabData(tabId, tabInfo);
        }
        await updateProductiveBookmarks(); // Real-time auto-bookmark
        console.log('Tab activated:', tab.title, 'Category:', this.classifySite(this.extractDomain(tab.url)));
      }
    } catch (error) {
      console.error('Error handling tab activation:', error);
    }
  }

  async handleTabUpdate(tabId, tab) {
    try {
      if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
        await this.initializeTabData(tabId, tab);
        await updateProductiveBookmarks(); // Real-time auto-bookmark
        console.log('Tab updated:', tab.title, 'URL:', tab.url);
      }
    } catch (error) {
      console.error('Error handling tab update:', error);
    }
  }

  async handleTabRemoval(tabId) {
    if (this.currentActiveTab === tabId) {
      await this.updateTabTime(tabId);
      this.currentActiveTab = null;
    }
    
    // Mark as inactive but keep data
    const tabInfo = this.tabData.get(tabId);
    if (tabInfo) {
      tabInfo.isActive = false;
      await this.saveTabData(tabId, tabInfo);
    }
  }

  handleWindowUnfocus() {
    if (this.currentActiveTab) {
      this.updateTabTime(this.currentActiveTab);
    }
  }

  handleWindowFocus() {
    this.lastActiveTime = Date.now();
  }

  handleIdleStateChange(state) {
    if (state === 'idle' || state === 'locked') {
      if (this.currentActiveTab) {
        this.updateTabTime(this.currentActiveTab);
      }
    } else if (state === 'active') {
      this.lastActiveTime = Date.now();
    }
  }

  async initializeTabData(tabId, tab) {
    const domain = this.extractDomain(tab.url);
    const category = this.classifySite(domain);
    
    let tabInfo = this.tabData.get(tabId);
    
    if (!tabInfo) {
      tabInfo = {
        id: tabId.toString(),
        title: tab.title || 'Unknown',
        url: tab.url,
        domain: domain,
        timeSpent: 0,
        isActive: false,
        category: category,
        lastAccessed: new Date(),
        visitCount: 1
      };
      this.tabData.set(tabId, tabInfo);
    } else {
      // Update existing tab data
      tabInfo.title = tab.title || tabInfo.title;
      tabInfo.url = tab.url;
      tabInfo.domain = domain;
      tabInfo.category = category;
      tabInfo.visitCount = (tabInfo.visitCount || 0) + 1;
      tabInfo.lastAccessed = new Date();
    }
    
    await this.saveTabData(tabId, tabInfo);
    console.log('Tab data initialized/updated:', domain, 'Category:', category);
  }

  async updateTabTime(tabId) {
    const tabInfo = this.tabData.get(tabId);
    if (tabInfo && this.lastActiveTime) {
      const timeSpent = Math.max(0, Math.round((Date.now() - this.lastActiveTime) / 1000)); // Convert to seconds
      
      // Check if this is a new day for this tab
      const today = new Date().toISOString().split('T')[0];
      const tabDate = new Date(tabInfo.lastAccessed).toISOString().split('T')[0];
      
      if (tabDate !== today) {
        // Reset time spent for new day
        tabInfo.timeSpent = timeSpent;
        console.log('New day detected for', tabInfo.domain, ', resetting time to:', timeSpent, 'seconds');
      } else {
        // Add to existing time for same day
        tabInfo.timeSpent += timeSpent;
      }
      
      tabInfo.isActive = false;
      tabInfo.lastAccessed = new Date(); // Update last accessed time
      
      await this.saveTabData(tabId, tabInfo);
      console.log('Updated time for', tabInfo.domain, ':', timeSpent, 'seconds. Total:', tabInfo.timeSpent);
    }
  }

  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace(/^www\./, '');
    } catch (error) {
      return 'unknown';
    }
  }

  classifySite(domain) {
    const productiveSites = [
      // Learning Platforms
      'khanacademy.org', 'coursera.org', 'edx.org', 'udemy.com', 'nptel.ac.in',
      'unacademy.com', 'byjus.com', 'vedantu.com', 'toppr.com', 'academicearth.org',
      
      // AI Tools for Study & Research
      'chat.openai.com', 'chatgpt.com', 'claude.ai', 'gemini.google.com', 'bard.google.com',
      'perplexity.ai', 'quillbot.com', 'grammarly.com', 'chatpdf.com', 'doctrina.ai',
      'unriddle.ai', 'otter.ai', 'notion.ai',
      
      // Notes, Flashcards & Study Tools
      'quizlet.com', 'brainscape.com', 'sparknotes.com', 'chegg.com', 'coursehero.com',
      'studocu.com', 'study.com', 'clearias.com', 'examrace.com', 'jagranjosh.com',
      
      // Research & Reference Tools
      'scholar.google.com', 'ndl.iitkgp.ac.in', 'jstor.org', 'pubmed.ncbi.nlm.nih.gov',
      'eric.ed.gov', 'researchgate.net', 'muse.jhu.edu', 'sciencedirect.com',
      'zotero.org', 'mendeley.com', 'arxiv.org',
      
      // Productivity & Focus Tools
      'notion.so', 'todoist.com', 'upbase.io', 'flocus.com', 'lifeat.io',
      'loficafe.com', 'noisli.com', 'imissmycafe.com', 'lucidchart.com', 'trello.com',
      
      // Development & Programming
      'github.com', 'stackoverflow.com', 'codecademy.com', 'freecodecamp.org',
      'mdn.mozilla.org', 'w3schools.com', 'react.dev', 'vuejs.org', 'angular.io',
      'developer.mozilla.org', 'npmjs.com', 'leetcode.com', 'hackerrank.com',
      'codepen.io', 'replit.com', 'codesandbox.io', 'glitch.com',
      
      // Educational Content & Documentation
      'medium.com', 'dev.to', 'hashnode.com', 'wikipedia.org',
      'ted.com', 'khanacademy.org', 'brilliant.org', 'skillshare.com',
      
      // Professional Development
      'linkedin.com', 'glassdoor.com', 'indeed.com', 'coursera.org',
      'pluralsight.com', 'lynda.com', 'udacity.com', 'edureka.co',
      
      // Academic & Research Institutions
      'mit.edu', 'harvard.edu', 'stanford.edu', 'berkeley.edu', 'ox.ac.uk',
      'cambridge.org', 'iitb.ac.in', 'iitd.ac.in', 'iisc.ac.in',
      
      // Language Learning
      'duolingo.com', 'babbel.com', 'rosettastone.com', 'memrise.com',
      'busuu.com', 'lingoda.com', 'italki.com',
      
      // Design & Creative Learning
      'figma.com', 'canva.com', 'adobe.com', 'sketch.com', 'invisionapp.com',
      'dribbble.com', 'behance.net',
      
      // Math & Science Tools
      'wolframalpha.com', 'desmos.com', 'geogebra.org', 'mathway.com',
      'symbolab.com', 'photomath.com',
      
      // General Knowledge & Reference
      'britannica.com', 'dictionary.com', 'merriam-webster.com', 'thesaurus.com',
      'google.com', 'duckduckgo.com'
    ];

    const distractingSites = [
      // Social Media & Messaging
      'instagram.com', 'facebook.com', 'snapchat.com', 'telegram.org', 'telegram.me',
      'twitter.com', 'x.com', 'reddit.com', 'discord.com', 'whatsapp.com',
      'web.whatsapp.com', 'messenger.com', 'signal.org',
      
      // Streaming & Entertainment
      'netflix.com', 'primevideo.com', 'amazon.com/prime',
      'hotstar.com', 'twitch.tv', 'jiocinema.com', 'sonyliv.com',
      'zee5.com', 'voot.com', 'altbalaji.com', 'eros.com',
      'hulu.com', 'disneyplus.com', 'hbomax.com', 'paramount.com',
      
      // Gaming & Fun
      'steam.com', 'epicgames.com', 'miniclip.com', 'coolmathgames.com',
      'roblox.com', 'chess.com', 'lichess.org', 'pogo.com',
      'addictinggames.com', 'kongregate.com', 'newgrounds.com',
      'armor.games', 'y8.com', 'friv.com',
      
      // Shopping & Browsing
      'amazon.com', 'amazon.in', 'flipkart.com', 'myntra.com',
      'nykaa.com', 'aliexpress.com', 'ebay.com', 'etsy.com',
      'shopify.com', 'zara.com', 'h&m.com', 'uniqlo.com',
      
      // Forums & Miscellaneous
      'quora.com', 'pinterest.com', 'buzzfeed.com', '9gag.com',
      'driveandlisten.herokuapp.com', 'imgur.com', 'tumblr.com',
      'tiktok.com', 'vine.co', 'snapchat.com',
      
      // News & Entertainment (can be distracting)
      'dailymail.co.uk', 'tmz.com', 'entertainment.com', 'eonline.com',
      'peoplemagazine.com', 'usmagazine.com', 'cosmopolitan.com',
      
      // Sports (can be distracting during study time)
      'espn.com', 'cricbuzz.com', 'cricinfo.com', 'goal.com',
      'nba.com', 'nfl.com', 'fifa.com',
      
      // Music & Audio (when used for entertainment)
      'spotify.com', 'apple.com/music', 'soundcloud.com', 'pandora.com',
      'last.fm', 'bandcamp.com', 'mixcloud.com',
      
      // Memes & Humor
      'memebase.cheezburger.com', 'knowyourmeme.com', 'funnyjunk.com',
      'collegehumor.com', 'theonion.com', 'satirewire.com'
    ];

    const cleanDomain = domain.toLowerCase();
    
    if (productiveSites.some(site => cleanDomain.includes(site) || site.includes(cleanDomain))) {
      return 'productive';
    } else if (distractingSites.some(site => cleanDomain.includes(site) || site.includes(cleanDomain))) {
      return 'distracting';
    } else {
      return 'neutral';
    }
  }

  async saveTabData(tabId, tabData) {
    try {
      const key = `tab_${tabId}`;
      await chrome.storage.local.set({ [key]: tabData });
    } catch (error) {
      console.error('Error saving tab data:', error);
    }
  }

  async saveDailyStats() {
    const today = new Date().toISOString().split('T')[0];
    
    let totalTime = 0;
    let productiveTime = 0;
    let distractingTime = 0;
    let neutralTime = 0;
    let tabsSwitched = 0;

    // Calculate stats from current session - only for today's data
    for (const [tabId, tabData] of this.tabData.entries()) {
      // Only include data from today
      const tabDate = new Date(tabData.lastAccessed).toISOString().split('T')[0];
      if (tabDate === today) {
        const timeInMinutes = Math.round(tabData.timeSpent / 60);
        totalTime += timeInMinutes;
        
        switch (tabData.category) {
          case 'productive':
            productiveTime += timeInMinutes;
            break;
          case 'distracting':
            distractingTime += timeInMinutes;
            break;
          case 'neutral':
            neutralTime += timeInMinutes;
            break;
        }
        
        tabsSwitched += tabData.visitCount || 1;
      }
    }

    // Calculate focus score
    const focusScore = totalTime > 0 ? 
      Math.round(Math.max(0, Math.min(100, 
        ((productiveTime / totalTime) * 100) - ((distractingTime / totalTime) * 30)
      ))) : 0;

    const dailyStats = {
      date: today,
      totalTime,
      productiveTime,
      distractingTime,
      neutralTime,
      tabsSwitched,
      focusScore
    };

    await chrome.storage.local.set({ [`daily_${today}`]: dailyStats });
    console.log('Daily stats saved:', dailyStats);
    return dailyStats;
  }

  startPeriodicUpdates() {
    // Update every 15 seconds
    setInterval(async () => {
      try {
        // Check for daily reset first
        await this.checkDailyReset();
        
        if (this.currentActiveTab) {
          await this.updateTabTime(this.currentActiveTab);
          this.lastActiveTime = Date.now(); // Reset timer
        }
        await this.saveDailyStats();
        
        // Notify popup/dashboard of updates
        try {
          try {
  chrome.runtime.sendMessage({ action: 'data_updated' }, response => { if (chrome.runtime.lastError) {/* no receiver */} });
} catch(e) { /* ignore */ }
        } catch (e) {
          // Ignore if no listeners
        }
      } catch (error) {
        console.error('Error in periodic update:', error);
      }
    }, this.updateInterval);

    console.log('Periodic updates started (15 second intervals)');
  }

  async getAllTabData() {
    const result = await chrome.storage.local.get();
    const tabs = [];
    
    for (const [key, value] of Object.entries(result)) {
      if (key.startsWith('tab_')) {
        tabs.push({
          ...value,
          lastAccessed: new Date(value.lastAccessed),
          timeSpent: Math.round(value.timeSpent / 60), // Convert to minutes for display
          visitCount: value.visitCount || 1
        });
      }
    }
    
    // Sort by time spent, then by last accessed
    return tabs.sort((a, b) => {
      if (b.timeSpent !== a.timeSpent) {
        return b.timeSpent - a.timeSpent;
      }
      return new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime();
    });
  }

  async getDailyStats(days = 7) {
    const result = await chrome.storage.local.get();
    const stats = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const key = `daily_${dateStr}`;
      
      if (result[key]) {
        stats.push(result[key]);
      } else {
        // Add empty day if no data
        stats.push({
          date: dateStr,
          totalTime: 0,
          productiveTime: 0,
          distractingTime: 0,
          neutralTime: 0,
          tabsSwitched: 0,
          focusScore: 0
        });
      }
    }
    
    return stats.reverse();
  }

  async checkDailyReset() {
    const today = new Date().toISOString().split('T')[0];
    const lastResetDate = await this.getLastResetDate();
    
    if (lastResetDate !== today) {
      console.log('New day detected, performing daily reset...');
      await this.performDailyReset();
      await this.setLastResetDate(today);
    }
  }

  async getLastResetDate() {
    try {
      const result = await chrome.storage.local.get(['lastResetDate']);
      return result.lastResetDate || null;
    } catch (error) {
      console.error('Error getting last reset date:', error);
      return null;
    }
  }

  async setLastResetDate(date) {
    try {
      await chrome.storage.local.set({ lastResetDate: date });
    } catch (error) {
      console.error('Error setting last reset date:', error);
    }
  }

  async performDailyReset() {
    try {
      // Clear all tab data from memory
      this.tabData.clear();
      
      // Clear all tab data from storage
      const result = await chrome.storage.local.get();
      const keysToRemove = [];
      
      for (const key of Object.keys(result)) {
        if (key.startsWith('tab_')) {
          keysToRemove.push(key);
        }
      }
      
      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
        console.log(`Cleared ${keysToRemove.length} old tab entries`);
      }
      
      // Reset current active tab
      this.currentActiveTab = null;
      this.lastActiveTime = Date.now();
      
      console.log('Daily reset completed successfully');
    } catch (error) {
      console.error('Error performing daily reset:', error);
    }
  }
}

// Initialize the web monitoring tracker
const studyFlowTracker = new StudyFlowTracker();

// ========== REMINDER SYSTEM ==========

// Check for due reminders every minute
chrome.alarms.create('checkReminders', { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkReminders') {
    checkDueReminders();
  } else if (alarm.name === 'dailyMotivation') {
    chrome.notifications.create({
        iconUrl: 'icons/icon48.png',
        
      type: 'basic',
      title: 'Daily Motivation - StudyFlow',
      message: getRandomQuote()
    });
  } else if (alarm.name.startsWith('reminder_')) {
    // Handle specific reminder alarm
    const reminderId = parseInt(alarm.name.replace('reminder_', ''));
    showReminderNotification(reminderId);
  }
});

function checkDueReminders() {
  chrome.storage.local.get(['reminders'], (result) => {
    const reminders = result.reminders || [];
    const now = new Date();
    
    reminders.forEach(reminder => {
      if (!reminder.completed && !reminder.notified) {
        const reminderTime = new Date(reminder.reminderDateTime);
        
        // Check if reminder is due (within 1 minute)
        if (Math.abs(now - reminderTime) < 60000) {
          showReminderNotification(reminder.id);
          
          // Mark as notified
          reminder.notified = true;
          chrome.storage.local.set({ reminders: reminders });
        }
      }
    });
  });
}

function showReminderNotification(reminderId) {
  chrome.storage.local.get(['reminders'], (result) => {
    const reminders = result.reminders || [];
    const reminder = reminders.find(r => r.id === reminderId);
    
    if (reminder && !reminder.completed) {
      chrome.notifications.create(`reminder_${reminderId}`, {
        type: 'basic',
        title: `📅 Reminder: ${reminder.title}`,
        message: reminder.description || `${reminder.category} reminder is due!`,
        buttons: [
          { title: 'Mark Complete' },
          { title: 'Snooze 10 min' }
        ],
        requireInteraction: true
      });
    }
  });
}

// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (notificationId.startsWith('reminder_')) {
    const reminderId = parseInt(notificationId.replace('reminder_', ''));
    
    if (buttonIndex === 0) {
      // Mark Complete
      completeReminderFromNotification(reminderId);
    } else if (buttonIndex === 1) {
      // Snooze 10 minutes
      snoozeReminder(reminderId, 10);
    }
    
    chrome.notifications.clear(notificationId);
  }
});

function completeReminderFromNotification(reminderId) {
  chrome.storage.local.get(['reminders'], (result) => {
    const reminders = result.reminders || [];
    const reminderIndex = reminders.findIndex(r => r.id === reminderId);
    
    if (reminderIndex !== -1) {
      reminders[reminderIndex].completed = true;
      reminders[reminderIndex].completedAt = new Date().toISOString();
      
      chrome.storage.local.set({ reminders: reminders });
      
      // Award XP
      chrome.storage.local.get([XP_KEY], (result) => {
        const currentXP = result[XP_KEY] || 0;
        chrome.storage.local.set({ [XP_KEY]: currentXP + 10 });
      });
    }
  });
}

function snoozeReminder(reminderId, minutes) {
  chrome.storage.local.get(['reminders'], (result) => {
    const reminders = result.reminders || [];
    const reminderIndex = reminders.findIndex(r => r.id === reminderId);
    
    if (reminderIndex !== -1) {
      const newTime = new Date(Date.now() + minutes * 60000);
      reminders[reminderIndex].reminderDateTime = newTime.toISOString();
      reminders[reminderIndex].notified = false;
      
      chrome.storage.local.set({ reminders: reminders });
      
      // Set new alarm
      chrome.alarms.create(`reminder_${reminderId}`, {
        when: newTime.getTime()
      });
    }
  });
}

// ========== PRODUCTIVE BOOKMARKS SYSTEM ==========

// Update bookmarks every 5 minutes
setInterval(updateProductiveBookmarks, 5 * 60 * 1000);

async function updateProductiveBookmarks() {
  try {
    const tabData = await studyFlowTracker.getAllTabData();
    const productiveTabs = tabData.filter(tab => 
      tab.category === 'productive' // Remove timeSpent >= 5 condition
    );
    
    chrome.storage.local.get(['productiveBookmarks'], (result) => {
      const existingBookmarks = result.productiveBookmarks || [];
      const bookmarkMap = new Map(existingBookmarks.map(b => [b.domain, b]));
      
      productiveTabs.forEach(tab => {
        const existing = bookmarkMap.get(tab.domain);
        
        if (existing) {
          // Update existing bookmark
          if (!existing.isCustom) {
            existing.timeSpent = Math.max(existing.timeSpent, tab.timeSpent);
            existing.lastVisited = new Date().toISOString();
            existing.title = tab.title || existing.title;
          }
        } else {
          // Add new bookmark
          const newBookmark = {
            id: Date.now() + Math.random(),
            title: tab.title || tab.domain,
            url: tab.url,
            domain: tab.domain,
            category: categorizeProductiveSite(tab.domain),
            timeSpent: tab.timeSpent,
            addedAt: new Date().toISOString(),
            lastVisited: new Date().toISOString(),
            isCustom: false // Mark as automatically added
          };
          bookmarkMap.set(tab.domain, newBookmark);
        }
      });
      
      const updatedBookmarks = Array.from(bookmarkMap.values());
      chrome.storage.local.set({ productiveBookmarks: updatedBookmarks });
      
      console.log('Updated productive bookmarks:', updatedBookmarks.length);
    });
  } catch (error) {
    console.error('Error updating productive bookmarks:', error);
  }
}

function categorizeProductiveSite(domain) {
  const categories = {
    learning: [
      'khanacademy.org', 'coursera.org', 'edx.org', 'udemy.com', 'skillshare.com',
      'brilliant.org', 'duolingo.com', 'babbel.com', 'memrise.com'
    ],
    research: [
      'scholar.google.com', 'jstor.org', 'pubmed.ncbi.nlm.nih.gov', 'researchgate.net',
      'arxiv.org', 'wikipedia.org', 'britannica.com'
    ],
    tools: [
      'notion.so', 'todoist.com', 'trello.com', 'figma.com', 'canva.com',
      'grammarly.com', 'quillbot.com', 'otter.ai'
    ],
    documentation: [
      'mdn.mozilla.org', 'stackoverflow.com', 'github.com', 'developer.mozilla.org',
      'w3schools.com', 'react.dev', 'vuejs.org'
    ]
  };
  
  for (const [category, domains] of Object.entries(categories)) {
    if (domains.some(d => domain.includes(d) || d.includes(domain))) {
      return category;
    }
  }
  
  return 'learning'; // Default category
}

// ========== UTILITIES ==========

// Get today's date as YYYY-MM-DD
function getToday() {
  return new Date().toISOString().slice(0, 10);
}

// Get yesterday's date as YYYY-MM-DD
function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

// Pick a random motivational quote
function getRandomQuote() {
  return MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
}

// ========== SITE BLOCKING FUNCTIONALITY ==========

function updateBlockedSites(sites) {
  const MAX_RULES = 100;

  // Create rules for each site
  const rules = sites.map((site, index) => ({
    id: index + 1,
    priority: 1,
    action: { type: 'block' },
    condition: {
      urlFilter: site,
      resourceTypes: ['main_frame']
    }
  }));

  // Remove all possible rule IDs, then add the current rules
  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: Array.from({ length: MAX_RULES }, (_, i) => i + 1),
    addRules: rules
  }, () => {
    if (chrome.runtime.lastError) {
      console.error("Failed to update blocking rules:", chrome.runtime.lastError.message);
    } else {
      console.log("Site blocking rules updated successfully. Blocked sites:", sites);
    }
  });
}

// Load initial blocking rules on startup
chrome.storage.local.get([BLOCKED_SITES_KEY], (result) => {
  const sites = result[BLOCKED_SITES_KEY] || [];
  updateBlockedSites(sites);
});

// ========== ACTIVITY TRACKING ==========

// Listen for tab activation and log activity
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url) {
      logActivity(tab.url);
      trackSiteTime(tab.url);
    }
  } catch (error) {
    console.error("Error tracking tab activation:", error);
  }
});

// Listen for tab updates (navigation, reload)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    logActivity(tab.url);
    trackSiteTime(tab.url);
  }
});

// Log activity in chrome.storage.local
function logActivity(url) {
  const today = getToday();
  chrome.storage.local.get([ACTIVITY_LOG_KEY], (result) => {
    const log = result[ACTIVITY_LOG_KEY] || {};
    if (!log[today]) log[today] = [];
    log[today].push({ url, timestamp: Date.now() });
    chrome.storage.local.set({ [ACTIVITY_LOG_KEY]: log });
  });
}

// Track time spent on sites
function trackSiteTime(url) {
  try {
    const domain = new URL(url).hostname;
    const today = getToday();
    
    chrome.storage.local.get([SITE_TIME_KEY], (result) => {
      const siteTime = result[SITE_TIME_KEY] || {};
      if (!siteTime[today]) siteTime[today] = {};
      if (!siteTime[today][domain]) siteTime[today][domain] = 0;
      
      siteTime[today][domain] += 1; // Increment by 1 minute (approximate)
      chrome.storage.local.set({ [SITE_TIME_KEY]: siteTime });
    });
  } catch (error) {
    console.error("Error tracking site time:", error);
  }
}

// ========== STREAK & XP LOGIC ==========

function updateStreakAndXP() {
  chrome.storage.local.get([LAST_ACTIVE_DATE_KEY, STREAK_KEY, XP_KEY], (result) => {
    const today = getToday();
    const lastDate = result[LAST_ACTIVE_DATE_KEY];
    let streak = result[STREAK_KEY] || 0;
    let xp = result[XP_KEY] || 0;

    if (lastDate !== today) {
      streak = (lastDate === getYesterday()) ? streak + 1 : 1;
      xp += 10; // Award XP for daily activity
      chrome.storage.local.set({
        [LAST_ACTIVE_DATE_KEY]: today,
        [STREAK_KEY]: streak,
        [XP_KEY]: xp
      });
    }
  });
}

// Call this when user completes a study session or logs activity
updateStreakAndXP();

// ========== NOTIFICATIONS & REMINDERS ==========

// Show motivational quote daily
chrome.alarms.create('dailyMotivation', { periodInMinutes: 1440 }); // once a day

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'dailyMotivation') {
    chrome.notifications.create({
        iconUrl: 'icons/icon48.png',
        
      type: 'basic',
      title: 'Daily Motivation - StudyFlow',
      message: getRandomQuote()
    });
  }
});

// ========== IDLE DETECTION ==========

// Pause activity logging if user is idle for 5+ minutes
chrome.idle.onStateChanged.addListener((newState) => {
  if (newState === "idle" || newState === "locked") {
    // Optionally pause timers or logging
    console.log("User is idle, pausing activity tracking");
  }
});

// ========== FOCUS SESSION MANAGEMENT ==========

let focusSessionActive = false;
let focusSessionStart = null;
let originalBlockedSites = [];

// ========== MESSAGE HANDLING ==========

// Listen for messages from popup/options
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'UPDATE_BLOCKED_SITES':
      chrome.storage.local.set({ [BLOCKED_SITES_KEY]: message.sites });
      updateBlockedSites(message.sites);
      sendResponse({ status: 'blocked sites updated' });
      break;
      
    case 'GET_STATS':
      chrome.storage.local.get([XP_KEY, STREAK_KEY, ACTIVITY_LOG_KEY, SITE_TIME_KEY], (result) => {
        sendResponse({
          xp: result[XP_KEY] || 0,
          streak: result[STREAK_KEY] || 0,
          activityLog: result[ACTIVITY_LOG_KEY] || {},
          siteTime: result[SITE_TIME_KEY] || {}
        });
      });
      return true; // keep message channel open for async response
      
    case 'GET_BLOCKED_SITES':
      chrome.storage.local.get([BLOCKED_SITES_KEY], (result) => {
        sendResponse({ sites: result[BLOCKED_SITES_KEY] || [] });
      });
      return true;
      
    case 'UPDATE_XP':
      chrome.storage.local.get([XP_KEY], (result) => {
        const currentXP = result[XP_KEY] || 0;
        const newXP = currentXP + (message.amount || 0);
        chrome.storage.local.set({ [XP_KEY]: newXP });
        sendResponse({ status: 'XP updated', newXP: newXP });
      });
      return true;
      
    case 'SAVE_QUICK_NOTE':
      // Handle quick note saving
      const today = getToday();
      chrome.storage.local.get(['quickNotes'], (result) => {
        const notes = result.quickNotes || {};
        if (!notes[today]) notes[today] = [];
        notes[today].push({
          note: message.note,
          pageInfo: message.pageInfo,
          timestamp: Date.now()
        });
        chrome.storage.local.set({ quickNotes: notes });
      });
      sendResponse({ status: 'note saved' });
      break;
      
    case 'PAGE_VISITED':
      // Handle page visit tracking
      logActivity(message.pageInfo.url);
      break;
      
    case 'START_FOCUS_SESSION':
      focusSessionActive = true;
      focusSessionStart = Date.now();
      
      // Store original blocked sites
      chrome.storage.local.get([BLOCKED_SITES_KEY], (result) => {
        originalBlockedSites = result[BLOCKED_SITES_KEY] || [];
        
        // Combine current blocked sites with additional focus sites
        const additionalSites = message.additionalSites || [];
        const combinedSites = [...new Set([...originalBlockedSites, ...additionalSites])];
        
        console.log("Starting focus session with sites:", combinedSites);
        updateBlockedSites(combinedSites);
      });
      
      // Open Pomodoro timer page in a new tab
      chrome.tabs.create({
        url: chrome.runtime.getURL('pomodoro.html'),
        active: true
      });
      
      sendResponse({ status: 'focus session started' });
      break;
      
    case 'END_FOCUS_SESSION':
      if (focusSessionActive) {
        const sessionDuration = Math.floor((Date.now() - focusSessionStart) / 60000); // minutes
        focusSessionActive = false;
        
        // Award XP for focus session
        chrome.storage.local.get([XP_KEY], (result) => {
          const currentXP = result[XP_KEY] || 0;
          const bonusXP = Math.min(sessionDuration * 2, 100); // 2 XP per minute, max 100
          chrome.storage.local.set({ [XP_KEY]: currentXP + bonusXP });
        });
        
        // Restore original blocked sites only
        console.log("Ending focus session, restoring original sites:", originalBlockedSites);
        updateBlockedSites(originalBlockedSites);
        
        sendResponse({ 
          status: 'focus session ended', 
          duration: sessionDuration,
          xpEarned: Math.min(sessionDuration * 2, 100)
        });
      } else {
        sendResponse({ status: 'no active focus session' });
      }
      break;

    // ========== WEB MONITORING MESSAGE HANDLERS ==========
    case 'getTabData':
      studyFlowTracker.getAllTabData().then(tabs => {
        sendResponse({ success: true, data: tabs });
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true;
      
    case 'getDailyStats':
      studyFlowTracker.getDailyStats(message.days || 7).then(stats => {
        sendResponse({ success: true, data: stats });
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true;
      
    case 'getCurrentStats':
      studyFlowTracker.saveDailyStats().then(currentStats => {
        sendResponse({ success: true, data: currentStats });
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true;
      
    case 'saveData':
      // Force update current active tab time
      if (studyFlowTracker.currentActiveTab) {
        studyFlowTracker.updateTabTime(studyFlowTracker.currentActiveTab).then(() => {
          studyFlowTracker.lastActiveTime = Date.now(); // Reset timer
          return studyFlowTracker.saveDailyStats();
        }).then(() => {
          sendResponse({ success: true });
        }).catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      } else {
        studyFlowTracker.saveDailyStats().then(() => {
          sendResponse({ success: true });
        }).catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      }
      return true;
      
    case 'SET_REMINDER_ALARM':
      const reminder = message.reminder;
      const reminderTime = new Date(reminder.reminderDateTime);
      
      chrome.alarms.create(`reminder_${reminder.id}`, {
        when: reminderTime.getTime()
      });
      
      sendResponse({ status: 'alarm set' });
      break;
      
    case 'UPDATE_BOOKMARKS':
      updateProductiveBookmarks();
      sendResponse({ status: 'bookmarks updated' });
      break;
      
    case 'REMOVE_BOOKMARK':
      chrome.storage.local.get(['productiveBookmarks'], (result) => {
        const bookmarks = result.productiveBookmarks || [];
        const updatedBookmarks = bookmarks.filter(bookmark => bookmark.id !== message.bookmarkId);
        chrome.storage.local.set({ productiveBookmarks: updatedBookmarks });
        sendResponse({ status: 'bookmark removed' });
      });
      return true;

    default:
      sendResponse({ status: 'unknown message type' });
  }
});