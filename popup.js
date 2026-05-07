// popup.js - Enhanced popup functionality with web monitoring integration

// ========== GLOBAL VARIABLES ==========
let focusTimer = null;
let focusTimeRemaining = 25 * 60; // 25 minutes in seconds
let isFocusActive = false;
let updateInterval = null;
let pomodoroSettings = {
  focus: 25,
  break: 5,
  longBreak: 15
};

// Common distracting sites list
const COMMON_DISTRACTING_SITES = [
  'facebook.com',
  'instagram.com',
  'twitter.com',
  'x.com',
  'youtube.com',
  'tiktok.com',
  'reddit.com',
  'netflix.com',
  'twitch.tv',
  'discord.com',
  'snapchat.com',
  'pinterest.com',
  'linkedin.com',
  'whatsapp.com',
  'telegram.org',
  'spotify.com',
  'amazon.com',
  'ebay.com',
  'news.ycombinator.com',
  'buzzfeed.com'
];

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', function() {
  initializePopup();
  setupEventListeners();
  startAutoUpdate();
});

async function initializePopup() {
  try {
    await loadDashboardData();
    await loadUserStats();
    updateMotivationalQuote();
    displayCommonSites();
    loadPomodoroSettings();
    loadNotes();
    loadGoals();
    renderAlertsBar();
  } catch (error) {
    console.error('Error initializing popup:', error);
    showError('Failed to load data');
  }
}

// ========== NAVIGATION ==========
function setupEventListeners() {
  // Menu toggle
  const menuToggle = document.getElementById('menuToggle');
  const menuContent = document.getElementById('menuContent');
  
  menuToggle.addEventListener('click', function() {
    const isActive = menuContent.classList.contains('active');
    if (isActive) {
      menuContent.classList.remove('active');
      menuToggle.classList.remove('active');
    } else {
      menuContent.classList.add('active');
      menuToggle.classList.add('active');
    }
  });

  // Navigation buttons
  const navBtns = document.querySelectorAll('.nav-btn');
  navBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      navBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      
      // Hide all pages
      const pages = ['dashboardPage', 'analyticsPage', 'focusPage', 'blockerPage', 'goalsPage', 'notesPage', 'calendarPage', 'bookmarksPage'];
      pages.forEach(pageId => {
        const page = document.getElementById(pageId);
        if (page) page.style.display = 'none';
      });
      
      // Show selected page
      const targetPage = this.dataset.page + 'Page';
      const page = document.getElementById(targetPage);
      if (page) {
        page.style.display = '';
        
        // Load page-specific data
        if (this.dataset.page === 'blocker') {
          loadBlockedSites();
        } else if (this.dataset.page === 'analytics') {
          loadAnalyticsData();
        } else if (this.dataset.page === 'notes') {
          loadNotes();
        } else if (this.dataset.page === 'goals') {
          loadGoals();
        } else if (this.dataset.page === 'calendar') {
          loadReminders();
        } else if (this.dataset.page === 'bookmarks') {
          loadBookmarks();
        }
      }
    });
  });

  // Site blocker events
  const addSiteBtn = document.getElementById('addSiteBtn');
  const siteInput = document.getElementById('siteInput');
  
  if (addSiteBtn) addSiteBtn.addEventListener('click', addSite);
  if (siteInput) {
    siteInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') addSite();
    });
  }

  // Focus session events
  const startFocusBtn = document.getElementById('startFocusBtn');
  const stopFocusBtn = document.getElementById('stopFocusBtn');
  
  if (startFocusBtn) startFocusBtn.addEventListener('click', startFocusSession);
  if (stopFocusBtn) stopFocusBtn.addEventListener('click', endFocusSession);
  
  // Pomodoro timer page button
  const openPomodoroBtn = document.getElementById('openPomodoroBtn');
  if (openPomodoroBtn) openPomodoroBtn.addEventListener('click', () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL('pomodoro.html'),
      active: true
    });
  });

  // Pomodoro settings events
  const focusDuration = document.getElementById('focusDuration');
  const breakDuration = document.getElementById('breakDuration');
  const longBreakDuration = document.getElementById('longBreakDuration');
  
  if (focusDuration) focusDuration.addEventListener('change', savePomodoroSettings);
  if (breakDuration) breakDuration.addEventListener('change', savePomodoroSettings);
  if (longBreakDuration) longBreakDuration.addEventListener('change', savePomodoroSettings);

  // Notes events
  const saveNoteBtn = document.getElementById('saveNoteBtn');
  if (saveNoteBtn) saveNoteBtn.addEventListener('click', saveNote);

  // Goals events
  const addGoalBtn = document.getElementById('addGoalBtn');
  if (addGoalBtn) addGoalBtn.addEventListener('click', addGoal);

  // Calendar events
  const addReminderBtn = document.getElementById('addReminderBtn');
  if (addReminderBtn) addReminderBtn.addEventListener('click', addReminder);

  // Bookmarks events
  const refreshBookmarksBtn = document.getElementById('refreshBookmarksBtn');
  const exportBookmarksBtn = document.getElementById('exportBookmarksBtn');
  const importBookmarksBtn = document.getElementById('importBookmarksBtn');
  const importFileInput = document.getElementById('importFileInput');
  const addCustomBookmarkBtn = document.getElementById('addCustomBookmarkBtn');
  
  if (refreshBookmarksBtn) refreshBookmarksBtn.addEventListener('click', refreshBookmarks);
  if (exportBookmarksBtn) exportBookmarksBtn.addEventListener('click', exportBookmarks);
  if (importBookmarksBtn) importBookmarksBtn.addEventListener('click', () => importFileInput.click());
  if (importFileInput) importFileInput.addEventListener('change', importBookmarks);
  if (addCustomBookmarkBtn) addCustomBookmarkBtn.addEventListener('click', addCustomBookmark);

  // Category filter events
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('category-filter')) {
      document.querySelectorAll('.category-filter').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      const category = e.target.getAttribute('data-category');
      filterBookmarks(category);
    }
  });

  // Analytics events
  const viewFullAnalyticsBtn = document.getElementById('viewFullAnalyticsBtn');
  const refreshDataBtn = document.getElementById('refreshDataBtn');
  const viewFullBookmarksAnalyticsBtn = document.getElementById('viewFullBookmarksAnalyticsBtn');
  
  if (viewFullAnalyticsBtn) viewFullAnalyticsBtn.addEventListener('click', openFullAnalytics);
  if (refreshDataBtn) refreshDataBtn.addEventListener('click', refreshData);
  if (viewFullBookmarksAnalyticsBtn) viewFullBookmarksAnalyticsBtn.addEventListener('click', openFullBookmarksAnalytics);
}

// ========== USER STATS & XP SYSTEM ==========
async function loadUserStats() {
  try {
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_STATS' }, resolve);
    });

    const xp = response.xp || 0;
    const streak = response.streak || 0;
    const level = Math.floor(xp / 1000) + 1;

    document.getElementById('xp').textContent = xp;
    document.getElementById('level').textContent = level;
    document.getElementById('streak').textContent = streak;
  } catch (error) {
    console.error('Error loading user stats:', error);
  }
}

async function updateXP(amount, reason = 'activity') {
  try {
    await new Promise((resolve) => {
      chrome.runtime.sendMessage({ 
        type: 'UPDATE_XP', 
        amount: amount,
        reason: reason 
      }, resolve);
    });
    
    await loadUserStats();
    showMessage(`+${amount} XP earned for ${reason}!`, 'success');
  } catch (error) {
    console.error('Error updating XP:', error);
  }
}

// ========== DASHBOARD FUNCTIONALITY ==========
async function loadDashboardData() {
  try {
    const [tabData, dailyStats, currentStats, blockedSites] = await Promise.all([
      getTabData(),
      getDailyStats(7),
      getCurrentStats(),
      getBlockedSites()
    ]);

    updateDashboardStats(currentStats, tabData, dailyStats);
    renderFocusChart(dailyStats);
    renderProductivityChart(dailyStats);
    loadDashboardGoals();
    renderAlertsBar();
    
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    showError('Failed to load dashboard data');
  }
}

function updateDashboardStats(currentStats, tabData, dailyStats) {
  const focusScore = currentStats.focusScore || 0;
  const totalTime = currentStats.totalTime || 0;
  const productiveTime = currentStats.productiveTime || 0;
  const sitesVisited = tabData.length || 0;

  // Update stat values
  const focusScoreElement = document.getElementById('focusScoreValue');
  const totalTimeElement = document.getElementById('totalTimeValue');
  const productiveTimeElement = document.getElementById('productiveTimeValue');
  const sitesVisitedElement = document.getElementById('sitesVisitedValue');

  if (focusScoreElement) {
    focusScoreElement.textContent = focusScore + '%';
    focusScoreElement.className = `stat-value focus-score ${getScoreClass(focusScore)}`;
  }
  
  if (totalTimeElement) totalTimeElement.textContent = formatTime(totalTime);
  if (productiveTimeElement) productiveTimeElement.textContent = formatTime(productiveTime);
  if (sitesVisitedElement) sitesVisitedElement.textContent = sitesVisited;

  // Update progress bar
  const progressBar = document.getElementById('focusProgressBar');
  if (progressBar) {
    progressBar.style.width = focusScore + '%';
  }
}

function renderFocusChart(dailyStats) {
  const chartContainer = document.getElementById('focusChart');
  const labelsContainer = document.getElementById('focusChartLabels');
  
  if (!chartContainer || !labelsContainer) return;

  if (dailyStats.length === 0) {
    chartContainer.innerHTML = '<div class="no-data">No data available yet</div>';
    labelsContainer.innerHTML = '';
    return;
  }

  // Render bars
  chartContainer.innerHTML = dailyStats.map(day => {
    const height = Math.max(4, (day.focusScore / 100) * 76);
    const scoreClass = getScoreClass(day.focusScore);
    
    return `
      <div 
        class="graph-bar ${scoreClass}" 
        style="height: ${height}px;" 
        title="${new Date(day.date).toLocaleDateString()}: ${day.focusScore}% focus score"
      ></div>
    `;
  }).join('');

  // Render labels
  labelsContainer.innerHTML = dailyStats.map(day => {
    const date = new Date(day.date);
    return `<span>${date.toLocaleDateString('en-US', { weekday: 'short' })}</span>`;
  }).join('');
}

function renderProductivityChart(dailyStats) {
  const chartContainer = document.getElementById('productivityChart');
  const labelsContainer = document.getElementById('productivityChartLabels');
  
  if (!chartContainer || !labelsContainer) return;

  if (dailyStats.length === 0) {
    chartContainer.innerHTML = '<div class="no-data">No data available yet</div>';
    labelsContainer.innerHTML = '';
    return;
  }

  // Find max total time for scaling
  const maxTime = Math.max(...dailyStats.map(day => day.totalTime), 1);

  // Render bars
  chartContainer.innerHTML = dailyStats.map(day => {
    const totalHeight = Math.max(4, (day.totalTime / maxTime) * 96);
    const productiveHeight = day.totalTime > 0 ? (day.productiveTime / day.totalTime) * totalHeight : 0;
    const distractingHeight = day.totalTime > 0 ? (day.distractingTime / day.totalTime) * totalHeight : 0;
    const neutralHeight = totalHeight - productiveHeight - distractingHeight;
    
    return `
      <div class="productivity-bar" style="height: ${totalHeight}px;" title="${new Date(day.date).toLocaleDateString()}: ${formatTime(day.totalTime)} total">
        <div class="productivity-segment neutral" style="height: ${neutralHeight}px;"></div>
        <div class="productivity-segment distracting" style="height: ${distractingHeight}px;"></div>
        <div class="productivity-segment productive" style="height: ${productiveHeight}px;"></div>
      </div>
    `;
  }).join('');

  // Render labels
  labelsContainer.innerHTML = dailyStats.map(day => {
    const date = new Date(day.date);
    return `<span>${date.toLocaleDateString('en-US', { weekday: 'short' })}</span>`;
  }).join('');
}

// ========== WEB ANALYTICS FUNCTIONALITY ==========
async function loadAnalyticsData() {
  try {
    const [tabData, currentStats] = await Promise.all([
      getTabData(),
      getCurrentStats()
    ]);

    renderVisitedSites(tabData);
    renderCurrentTab(tabData);
    
  } catch (error) {
    console.error('Error loading analytics data:', error);
    showError('Failed to load analytics data');
  }
}

function renderVisitedSites(tabData) {
  const container = document.getElementById('visitedSitesList');
  if (!container) return;

  const topSites = tabData
    .filter(tab => tab.timeSpent > 0)
    .sort((a, b) => b.timeSpent - a.timeSpent)
    .slice(0, 10);

  if (topSites.length === 0) {
    container.innerHTML = '<div class="no-data">No sites visited yet today</div>';
    return;
  }

  container.innerHTML = topSites.map(site => `
    <div class="site-item">
      <div class="site-info">
        <div class="site-dot ${site.category}"></div>
        <div class="site-name" title="${site.domain} - ${site.title}">
          <div style="font-weight: 500;">${getSiteName(site)}</div>
          <div style="font-size: 10px; opacity: 0.7; margin-top: 1px;">${site.domain}</div>
        </div>
      </div>
      <div class="site-time">
        <div>${formatTime(site.timeSpent)}</div>
        <div style="font-size: 9px; opacity: 0.6;">${site.visitCount || 1} visits</div>
      </div>
    </div>
  `).join('');
}

function renderCurrentTab(tabData) {
  const container = document.getElementById('currentTabSection');
  if (!container) return;

  const activeTab = tabData.find(tab => tab.isActive);
  
  if (activeTab) {
    container.innerHTML = `
      <div class="current-tab">
        <h3>Currently Active</h3>
        <div class="tab-info">
          <div class="tab-icon ${activeTab.category}"></div>
          <div class="tab-details">
            <div class="tab-title">${activeTab.title}</div>
            <div class="tab-domain">${activeTab.domain} • ${formatTime(activeTab.timeSpent)} • ${activeTab.category}</div>
          </div>
        </div>
      </div>
    `;
  } else {
    container.innerHTML = '';
  }
}

// ========== SITE BLOCKER FUNCTIONALITY ==========
async function loadBlockedSites() {
  try {
    const response = await getBlockedSites();
    displayBlockedSites(response);
  } catch (error) {
    console.error('Error loading blocked sites:', error);
  }
}

function displayBlockedSites(sites) {
  const container = document.getElementById('blockedSitesList');
  if (!container) return;
  
  if (sites.length === 0) {
    container.innerHTML = '<div class="no-data">No sites blocked yet. Add some distracting sites to get started!</div>';
    return;
  }
  
  container.innerHTML = sites.map(site => `
    <div class="site-item-blocker">
      <span>${site}</span>
      <button class="remove-btn" data-site="${site}">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `).join('');
  
  // Add event listeners to remove buttons
  container.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const site = this.getAttribute('data-site');
      removeSite(site);
    });
  });
}

function addSite() {
  const input = document.getElementById('siteInput');
  if (!input) return;
  
  const site = input.value.trim().toLowerCase();
  if (!site) return;
  
  // Clean up the site URL
  const cleanSite = site.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  
  chrome.runtime.sendMessage({type: 'GET_BLOCKED_SITES'}, (response) => {
    const currentSites = response.sites || [];
    
    if (currentSites.includes(cleanSite)) {
      showMessage('This site is already blocked!', 'error');
      return;
    }
    
    const updatedSites = [...currentSites, cleanSite];
    chrome.runtime.sendMessage({
      type: 'UPDATE_BLOCKED_SITES',
      sites: updatedSites
    }, () => {
      input.value = '';
      loadBlockedSites();
      showMessage('Site blocked successfully!', 'success');
    });
  });
}

function addCommonSite(site) {
  chrome.runtime.sendMessage({type: 'GET_BLOCKED_SITES'}, (response) => {
    const currentSites = response.sites || [];
    
    if (currentSites.includes(site)) {
      showMessage('This site is already blocked!', 'error');
      return;
    }
    
    const updatedSites = [...currentSites, site];
    chrome.runtime.sendMessage({
      type: 'UPDATE_BLOCKED_SITES',
      sites: updatedSites
    }, () => {
      loadBlockedSites();
      showMessage('Site blocked successfully!', 'success');
    });
  });
}

function removeSite(site) {
  chrome.runtime.sendMessage({type: 'GET_BLOCKED_SITES'}, (response) => {
    const currentSites = response.sites || [];
    const updatedSites = currentSites.filter(s => s !== site);
    
    chrome.runtime.sendMessage({
      type: 'UPDATE_BLOCKED_SITES',
      sites: updatedSites
    }, () => {
      loadBlockedSites();
      showMessage('Site unblocked successfully!', 'success');
    });
  });
}

function displayCommonSites() {
  const container = document.getElementById('commonSitesList');
  if (!container) return;
  
  container.innerHTML = COMMON_DISTRACTING_SITES.map(site => `
    <div class="common-site-item">
      <span>${site}</span>
      <button class="add-common-btn" data-site="${site}">
        <i class="fas fa-plus"></i>
      </button>
    </div>
  `).join('');
  
  // Add event listeners to add buttons
  container.querySelectorAll('.add-common-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const site = this.getAttribute('data-site');
      addCommonSite(site);
    });
  });
}

// ========== FOCUS SESSION FUNCTIONALITY ==========
function loadPomodoroSettings() {
  chrome.storage.local.get(['pomodoroSettings'], (result) => {
    if (result.pomodoroSettings) {
      pomodoroSettings = result.pomodoroSettings;
      document.getElementById('focusDuration').value = pomodoroSettings.focus;
      document.getElementById('breakDuration').value = pomodoroSettings.break;
      document.getElementById('longBreakDuration').value = pomodoroSettings.longBreak;
    }
    updateTimerDisplay();
  });
}

function savePomodoroSettings() {
  pomodoroSettings = {
    focus: parseInt(document.getElementById('focusDuration').value) || 25,
    break: parseInt(document.getElementById('breakDuration').value) || 5,
    longBreak: parseInt(document.getElementById('longBreakDuration').value) || 15
  };
  
  chrome.storage.local.set({ pomodoroSettings: pomodoroSettings });
  
  if (!isFocusActive) {
    focusTimeRemaining = pomodoroSettings.focus * 60;
    updateTimerDisplay();
  }
  
  showMessage('Pomodoro settings saved!', 'success');
}

function startFocusSession() {
  isFocusActive = true;
  focusTimeRemaining = pomodoroSettings.focus * 60;
  
  const startBtn = document.getElementById('startFocusBtn');
  const stopBtn = document.getElementById('stopFocusBtn');
  
  if (startBtn) startBtn.style.display = 'none';
  if (stopBtn) stopBtn.style.display = 'inline-block';
  
  // Start the timer
  focusTimer = setInterval(() => {
    focusTimeRemaining--;
    updateTimerDisplay();
    
    if (focusTimeRemaining <= 0) {
      endFocusSession();
    }
  }, 1000);
  
  // Get current blocked sites and add additional focus sites
  chrome.runtime.sendMessage({type: 'GET_BLOCKED_SITES'}, (response) => {
    const currentSites = response.sites || [];
    const additionalFocusSites = ['twitter.com', 'instagram.com', 'tiktok.com', 'reddit.com'];
    
    // Notify background script with all sites to block during focus
    chrome.runtime.sendMessage({
      type: 'START_FOCUS_SESSION',
      additionalSites: additionalFocusSites,
      currentSites: currentSites
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('No receiving end for START_FOCUS_SESSION message:', chrome.runtime.lastError);
      }
    });
  });
  
  updateTimerDisplay();
  showMessage('Focus session started! Stay focused!', 'success');
}

function endFocusSession() {
  isFocusActive = false;
  
  if (focusTimer) {
    clearInterval(focusTimer);
    focusTimer = null;
  }
  
  const startBtn = document.getElementById('startFocusBtn');
  const stopBtn = document.getElementById('stopFocusBtn');
  
  if (startBtn) startBtn.style.display = 'inline-block';
  if (stopBtn) stopBtn.style.display = 'none';
  
  // Calculate session duration and XP
  const sessionDuration = Math.floor((pomodoroSettings.focus * 60 - focusTimeRemaining) / 60);
  const xpEarned = Math.min(sessionDuration * 2, pomodoroSettings.focus * 2);
  
  // Reset timer display
  focusTimeRemaining = pomodoroSettings.focus * 60;
  updateTimerDisplay();
  
  // Notify background script
  chrome.runtime.sendMessage({type: 'END_FOCUS_SESSION'}, async (response) => {
    if (sessionDuration > 0) {
      await updateXP(xpEarned, 'focus session');
      showMessage(`Focus session completed! You earned ${xpEarned} XP!`, 'success');
      loadDashboardData(); // Refresh stats
    }
  });
}

function updateTimerDisplay() {
  const minutes = Math.floor(focusTimeRemaining / 60);
  const seconds = focusTimeRemaining % 60;
  const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  
  const timerElement = document.getElementById('timerDisplay');
  if (timerElement) timerElement.textContent = display;
}

// ========== NOTES FUNCTIONALITY ==========
function saveNote() {
  const textarea = document.getElementById('noteTextarea');
  if (!textarea) return;
  
  const note = textarea.value.trim();
  if (!note) return;
  
  const noteData = {
    id: Date.now(),
    content: note,
    timestamp: new Date().toISOString(),
    date: new Date().toLocaleDateString()
  };
  
  chrome.storage.local.get(['notes'], (result) => {
    const notes = result.notes || [];
    notes.unshift(noteData); // Add to beginning
    
    chrome.storage.local.set({ notes: notes }, () => {
      textarea.value = '';
      loadNotes();
      showMessage('Note saved successfully!', 'success');
      updateXP(5, 'taking notes');
    });
  });
}

function loadNotes() {
  chrome.storage.local.get(['notes'], (result) => {
    const notes = result.notes || [];
    const container = document.getElementById('notesList');
    
    if (!container) return;
    
    if (notes.length === 0) {
      container.innerHTML = '<div class="no-data">No notes yet. Start taking notes to track your learning!</div>';
      return;
    }
    
    container.innerHTML = notes.map(note => `
      <div class="note-item">
        <div class="note-header">
          <span class="note-date">${note.date}</span>
          <button class="remove-btn delete-note-btn" data-id="${note.id}">
            <i class="fas fa-trash"></i>
          </button>
        </div>
        <div class="note-content">${note.content}</div>
      </div>
    `).join('');
    // Attach delete listeners
    container.querySelectorAll('.delete-note-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const id = parseInt(this.getAttribute('data-id'));
        deleteNote(id);
      });
    });
  });
}

function deleteNote(noteId) {
  chrome.storage.local.get(['notes'], (result) => {
    const notes = result.notes || [];
    const updatedNotes = notes.filter(note => note.id !== noteId);
    
    chrome.storage.local.set({ notes: updatedNotes }, () => {
      loadNotes();
      showMessage('Note deleted!', 'success');
    });
  });
}

// ========== GOALS FUNCTIONALITY ==========
function addGoal() {
  const title = document.getElementById('goalTitle').value.trim();
  const description = document.getElementById('goalDescription').value.trim();
  const category = document.getElementById('goalCategory').value;
  const target = parseInt(document.getElementById('goalTarget').value) || 1;
  
  if (!title) {
    showMessage('Please enter a goal title!', 'error');
    return;
  }
  
  const goalData = {
    id: Date.now(),
    title: title,
    description: description,
    category: category,
    target: target,
    progress: 0,
    completed: false,
    createdAt: new Date().toISOString(),
    completedAt: null
  };
  
  chrome.storage.local.get(['goals'], (result) => {
    const goals = result.goals || [];
    goals.unshift(goalData);
    
    chrome.storage.local.set({ goals: goals }, () => {
      // Clear form
      document.getElementById('goalTitle').value = '';
      document.getElementById('goalDescription').value = '';
      document.getElementById('goalTarget').value = '';
      
      loadGoals();
      loadDashboardGoals();
      showMessage('Goal added successfully!', 'success');
      updateXP(10, 'setting goals');
    });
  });
}

function loadGoals() {
  chrome.storage.local.get(['goals'], (result) => {
    const goals = result.goals || [];
    const container = document.getElementById('goalsList');
    
    if (!container) return;
    
    if (goals.length === 0) {
      container.innerHTML = '<div class="no-data">No goals yet. Set your first goal to start tracking progress!</div>';
      return;
    }
    
    container.innerHTML = goals.map(goal => {
      const progressPercent = Math.min((goal.progress / goal.target) * 100, 100);
      const isCompleted = goal.completed || goal.progress >= goal.target;
      
      return `
        <div class="goal-item ${isCompleted ? 'completed' : ''}">
          <div class="goal-header">
            <div class="goal-title">${goal.title}</div>
            <div class="goal-category">${goal.category}</div>
          </div>
          ${goal.description ? `<div style="font-size: 0.9em; opacity: 0.8; margin-bottom: 10px;">${goal.description}</div>` : ''}
          <div class="goal-progress">
            <div class="goal-progress-bar">
              <div class="goal-progress-fill" style="width: ${progressPercent}%;"></div>
            </div>
            <div class="goal-progress-text">${goal.progress} / ${goal.target} ${goal.category === 'study' ? 'hours' : 'units'}</div>
          </div>
          <div class="goal-actions">
            ${!isCompleted ? `
              <button class="goal-btn update-goal-progress" data-id="${goal.id}">
                <i class="fas fa-plus"></i> +1
              </button>
              <button class="goal-btn complete-goal" data-id="${goal.id}">
                <i class="fas fa-check"></i> Complete
              </button>
            ` : `
              <span style="color: #4ade80; font-weight: 600;">
                <i class="fas fa-check-circle"></i> Completed!
              </span>
            `}
            <button class="goal-btn delete-goal" data-id="${goal.id}">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
    // Attach listeners for goal actions
    container.querySelectorAll('.delete-goal').forEach(btn => {
      btn.addEventListener('click', function() {
        const id = parseInt(this.getAttribute('data-id'));
        deleteGoal(id);
      });
    });
    container.querySelectorAll('.update-goal-progress').forEach(btn => {
      btn.addEventListener('click', function() {
        const id = parseInt(this.getAttribute('data-id'));
        updateGoalProgress(id, 1);
      });
    });
    container.querySelectorAll('.complete-goal').forEach(btn => {
      btn.addEventListener('click', function() {
        const id = parseInt(this.getAttribute('data-id'));
        completeGoal(id);
      });
    });
  });
}

function loadDashboardGoals() {
  chrome.storage.local.get(['goals'], (result) => {
    const goals = result.goals || [];
    const container = document.getElementById('dashboardGoals');
    
    if (!container) return;
    
    const activeGoals = goals.filter(goal => !goal.completed && goal.progress < goal.target).slice(0, 3);
    
    if (activeGoals.length === 0) {
      container.innerHTML = '<div class="no-data">No active goals. <a href="#" class="switch-to-goals" style="color: #0d5a2c; font-weight: 600; text-decoration: underline;">Add your first goal!</a></div>';
      return;
    }
    
    container.innerHTML = activeGoals.map(goal => {
      const progressPercent = Math.min((goal.progress / goal.target) * 100, 100);
      
      return `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(255.255.255, 0.1);">
          <div style="flex: 1;">
            <div style="font-weight: 500; margin-bottom: 5px;">${goal.title}</div>
            <div class="goal-progress-bar" style="height: 6px;">
              <div class="goal-progress-fill" style="width: ${progressPercent}%; height: 100%;"></div>
            </div>
          </div>
          <div style="margin-left: 15px; text-align: right; font-size: 0.9em;">
            <div style="font-weight: 600;">${goal.progress}/${goal.target}</div>
            <div style="opacity: 0.7;">${Math.round(progressPercent)}%</div>
          </div>
        </div>
      `;
    }).join('');
  });
}

function updateGoalProgress(goalId, increment) {
  chrome.storage.local.get(['goals'], (result) => {
    const goals = result.goals || [];
    const goalIndex = goals.findIndex(goal => goal.id === goalId);
    
    if (goalIndex !== -1) {
      goals[goalIndex].progress += increment;
      
      // Check if goal is completed
      if (goals[goalIndex].progress >= goals[goalIndex].target && !goals[goalIndex].completed) {
        goals[goalIndex].completed = true;
        goals[goalIndex].completedAt = new Date().toISOString();
        updateXP(50, 'completing goals');
        showMessage('🎉 Goal completed! You earned 50 XP!', 'success');
      } else {
        updateXP(5, 'goal progress');
      }
      
      chrome.storage.local.set({ goals: goals }, () => {
        loadGoals();
        loadDashboardGoals();
      });
    }
  });
}

function completeGoal(goalId) {
  chrome.storage.local.get(['goals'], (result) => {
    const goals = result.goals || [];
    const goalIndex = goals.findIndex(goal => goal.id === goalId);
    
    if (goalIndex !== -1) {
      goals[goalIndex].completed = true;
      goals[goalIndex].completedAt = new Date().toISOString();
      goals[goalIndex].progress = goals[goalIndex].target;
      
      chrome.storage.local.set({ goals: goals }, () => {
        loadGoals();
        loadDashboardGoals();
        updateXP(50, 'completing goals');
        showMessage('🎉 Goal completed! You earned 50 XP!', 'success');
      });
    }
  });
}

function deleteGoal(goalId) {
  if (confirm('Are you sure you want to delete this goal?')) {
    chrome.storage.local.get(['goals'], (result) => {
      const goals = result.goals || [];
      const updatedGoals = goals.filter(goal => goal.id !== goalId);
      
      chrome.storage.local.set({ goals: updatedGoals }, () => {
        loadGoals();
        loadDashboardGoals();
        showMessage('Goal deleted!', 'success');
      });
    });
  }
}

function switchToGoals() {
  // Switch to goals page
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelector('[data-page="goals"]').classList.add('active');
  
  document.querySelectorAll('[id$="Page"]').forEach(page => page.style.display = 'none');
  document.getElementById('goalsPage').style.display = '';
  
  loadGoals();
}

// ========== CALENDAR & REMINDERS FUNCTIONALITY ==========
function addReminder() {
  const title = document.getElementById('reminderTitle').value.trim();
  const description = document.getElementById('reminderDescription').value.trim();
  const date = document.getElementById('reminderDate').value;
  const time = document.getElementById('reminderTime').value;
  const category = document.getElementById('reminderCategory').value;
  
  if (!title || !date || !time) {
    showMessage('Please fill in title, date, and time!', 'error');
    return;
  }
  
  // Check if date/time is in the future
  const reminderDateTime = new Date(`${date}T${time}`);
  if (reminderDateTime <= new Date()) {
    showMessage('Please select a future date and time!', 'error');
    return;
  }
  
  const reminderData = {
    id: Date.now(),
    title: title,
    description: description,
    date: date,
    time: time,
    category: category,
    completed: false,
    createdAt: new Date().toISOString(),
    reminderDateTime: reminderDateTime.toISOString()
  };
  
  chrome.storage.local.get(['reminders'], (result) => {
    const reminders = result.reminders || [];
    reminders.push(reminderData);
    
    // Sort reminders by date/time
    reminders.sort((a, b) => new Date(a.reminderDateTime) - new Date(b.reminderDateTime));
    
    chrome.storage.local.set({ reminders: reminders }, () => {
      // Clear form
      document.getElementById('reminderTitle').value = '';
      document.getElementById('reminderDescription').value = '';
      document.getElementById('reminderDate').value = '';
      document.getElementById('reminderTime').value = '';
      
      loadReminders();
      showMessage('Reminder added successfully!', 'success');
      updateXP(5, 'setting reminders');
      
      // Set up alarm for this reminder
      chrome.runtime.sendMessage({
        type: 'SET_REMINDER_ALARM',
        reminder: reminderData
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('No receiving end for SET_REMINDER_ALARM message:', chrome.runtime.lastError);
        }
      });
    });
  });
}

function loadReminders() {
  chrome.storage.local.get(['reminders'], (result) => {
    const reminders = result.reminders || [];
    const container = document.getElementById('remindersList');
    
    if (!container) return;
    
    if (reminders.length === 0) {
      container.innerHTML = '<div class="no-data">No reminders set. Add your first reminder to stay organized!</div>';
      return;
    }
    
    const now = new Date();
    
    container.innerHTML = reminders.map(reminder => {
      const reminderDate = new Date(reminder.reminderDateTime);
      const isOverdue = reminderDate < now && !reminder.completed;
      const isUpcoming = reminderDate > now && (reminderDate - now) < 24 * 60 * 60 * 1000; // Within 24 hours
      
      let statusClass = '';
      if (reminder.completed) statusClass = 'completed';
      else if (isOverdue) statusClass = 'overdue';
      else if (isUpcoming) statusClass = 'upcoming';
      
      return `
        <div class="reminder-item ${statusClass}">
          <div class="reminder-header">
            <div class="reminder-title">${reminder.title}</div>
            <div class="reminder-category">${reminder.category}</div>
          </div>
          <div class="reminder-datetime">
            📅 ${new Date(reminder.date).toLocaleDateString()} at ${reminder.time}
            ${isOverdue ? ' (Overdue)' : isUpcoming ? ' (Soon)' : ''}
          </div>
          ${reminder.description ? `<div class="reminder-description">${reminder.description}</div>` : ''}
          <div class="reminder-actions">
            ${!reminder.completed ? `
              <button class="reminder-btn complete-reminder" data-id="${reminder.id}">
                <i class="fas fa-check"></i> Complete
              </button>
            ` : `
              <span style="color: #4ade80; font-weight: 600;">
                <i class="fas fa-check-circle"></i> Completed
              </span>
            `}
            <button class="reminder-btn delete-reminder" data-id="${reminder.id}">
              <i class="fas fa-trash"></i> Delete
            </button>
          </div>
        </div>
      `;
    }).join('');
    // Attach listeners for reminder actions
    container.querySelectorAll('.delete-reminder').forEach(btn => {
      btn.addEventListener('click', function() {
        const id = parseInt(this.getAttribute('data-id'));
        deleteReminder(id);
      });
    });
    container.querySelectorAll('.complete-reminder').forEach(btn => {
      btn.addEventListener('click', function() {
        const id = parseInt(this.getAttribute('data-id'));
        completeReminder(id);
      });
    });
  });
}

function completeReminder(reminderId) {
  chrome.storage.local.get(['reminders'], (result) => {
    const reminders = result.reminders || [];
    const reminderIndex = reminders.findIndex(reminder => reminder.id === reminderId);
    
    if (reminderIndex !== -1) {
      reminders[reminderIndex].completed = true;
      reminders[reminderIndex].completedAt = new Date().toISOString();
      
      chrome.storage.local.set({ reminders: reminders }, () => {
        loadReminders();
        updateXP(10, 'completing reminders');
        showMessage('Reminder completed! You earned 10 XP!', 'success');
      });
    }
  });
}

function deleteReminder(reminderId) {
  if (confirm('Are you sure you want to delete this reminder?')) {
    chrome.storage.local.get(['reminders'], (result) => {
      const reminders = result.reminders || [];
      const updatedReminders = reminders.filter(reminder => reminder.id !== reminderId);
      
      chrome.storage.local.set({ reminders: updatedReminders }, () => {
        loadReminders();
        showMessage('Reminder deleted!', 'success');
      });
    });
  }
}

// ========== BOOKMARKS FUNCTIONALITY ==========
function addCustomBookmark() {
  const title = document.getElementById('customBookmarkTitle').value.trim();
  const url = document.getElementById('customBookmarkUrl').value.trim();
  const category = document.getElementById('customBookmarkCategory').value;
  
  if (!title || !url) {
    showMessage('Please fill in both title and URL!', 'error');
    return;
  }
  
  // Validate URL
  try {
    new URL(url);
  } catch (e) {
    showMessage('Please enter a valid URL!', 'error');
    return;
  }
  
  const domain = new URL(url).hostname.replace(/^www\./, '');
  
  chrome.storage.local.get(['productiveBookmarks'], (result) => {
    const bookmarks = result.productiveBookmarks || [];
    
    // Check for duplicates
    if (bookmarks.some(bookmark => bookmark.domain === domain)) {
      showMessage('This site is already bookmarked!', 'error');
      return;
    }
    
    const newBookmark = {
      id: Date.now() + Math.random(),
      title: title,
      url: url,
      domain: domain,
      category: category,
      timeSpent: 0,
      addedAt: new Date().toISOString(),
      lastVisited: new Date().toISOString(),
      isCustom: true
    };
    
    bookmarks.push(newBookmark);
    
    chrome.storage.local.set({ productiveBookmarks: bookmarks }, () => {
      // Clear form
      document.getElementById('customBookmarkTitle').value = '';
      document.getElementById('customBookmarkUrl').value = '';
      document.getElementById('customBookmarkCategory').value = 'learning';
      
      loadBookmarks();
      updateXP(5, 'adding bookmarks');
      showMessage('Bookmark added successfully!', 'success');
    });
  });
}

function loadBookmarks() {
  chrome.storage.local.get(['productiveBookmarks'], (result) => {
    const bookmarks = result.productiveBookmarks || [];
    const container = document.getElementById('bookmarksList');
    const totalBookmarksEl = document.getElementById('totalBookmarks');
    const newBookmarksEl = document.getElementById('newBookmarks');
    
    if (!container) return;
    
    // Update stats
    if (totalBookmarksEl) totalBookmarksEl.textContent = bookmarks.length;
    
    // Calculate new bookmarks this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const newThisWeek = bookmarks.filter(bookmark => 
      new Date(bookmark.addedAt) > oneWeekAgo
    ).length;
    if (newBookmarksEl) newBookmarksEl.textContent = newThisWeek;
    
    if (bookmarks.length === 0) {
      container.innerHTML = '<div class="no-data">No productive bookmarks yet. Keep using productive sites to build your bookmark collection!</div>';
      return;
    }
    
    displayBookmarks(bookmarks);
  });
}

function removeBookmark(bookmarkId) {
  if (confirm('Are you sure you want to remove this bookmark?')) {
    chrome.storage.local.get(['productiveBookmarks'], (result) => {
      const bookmarks = result.productiveBookmarks || [];
      const updatedBookmarks = bookmarks.filter(bookmark => bookmark.id !== bookmarkId);
      
      chrome.storage.local.set({ productiveBookmarks: updatedBookmarks }, () => {
        loadBookmarks();
        showMessage('Bookmark removed!', 'success');
      });
    });
  }
}

function completeBookmark(bookmarkId) {
  chrome.storage.local.get(['productiveBookmarks'], (result) => {
    const bookmarks = result.productiveBookmarks || [];
    const bookmarkIndex = bookmarks.findIndex(bookmark => bookmark.id === bookmarkId);
    if (bookmarkIndex !== -1 && !bookmarks[bookmarkIndex].completed) {
      bookmarks[bookmarkIndex].completed = true;
      bookmarks[bookmarkIndex].completedAt = new Date().toISOString();
      chrome.storage.local.set({ productiveBookmarks: bookmarks }, () => {
        loadBookmarks();
        showMessage('Bookmark marked as completed!', 'success');
      });
    }
  });
}

function displayBookmarks(bookmarks, category = 'all') {
  const container = document.getElementById('bookmarksList');
  if (!container) return;
  let filteredBookmarks = bookmarks;
  if (category !== 'all') {
    filteredBookmarks = bookmarks.filter(bookmark => bookmark.category === category);
  }
  filteredBookmarks.sort((a, b) => b.timeSpent - a.timeSpent);
  if (filteredBookmarks.length === 0) {
    container.innerHTML = `<div class="no-data">No bookmarks in the ${category} category yet.</div>`;
    return;
  }
  container.innerHTML = filteredBookmarks.map(bookmark => `
    <div class="bookmark-item${bookmark.completed ? ' completed' : ''}">
      <div class="bookmark-info">
        <div class="bookmark-favicon" style="background: ${bookmark.isCustom ? '#22d3ee' : '#4ade80'}; display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold;">
          ${bookmark.isCustom ? 'C' : 'A'}
        </div>
        <div class="bookmark-details">
          <div class="bookmark-title">${bookmark.title}</div>
          <div class="bookmark-url">${bookmark.domain} ${bookmark.isCustom ? '• Custom' : '• Auto'}</div>
        </div>
      </div>
      <div class="bookmark-meta">
        <div class="bookmark-time">${bookmark.timeSpent > 0 ? formatTime(bookmark.timeSpent) : 'New'}</div>
        <div class="bookmark-category">${bookmark.category}</div>
      </div>
      <div style="display: flex; gap: 5px;">
        <button class="btn" data-action="open" data-url="${bookmark.url}" style="padding: 6px 8px; font-size: 0.8em;">
          <i class="fas fa-external-link-alt"></i>
        </button>
        <button class="btn" data-action="remove" data-id="${bookmark.id}" style="padding: 6px 8px; font-size: 0.8em; background: #f87171;">
          <i class="fas fa-trash"></i>
        </button>
        ${!bookmark.completed ? `<button class='btn' data-action='complete' data-id='${bookmark.id}' style='padding: 6px 8px; font-size: 0.8em; background: #4ade80;'><i class='fas fa-check'></i></button>` : `<span style='color: #4ade80; font-weight: 600;'><i class='fas fa-check-circle'></i> Completed!</span>`}
      </div>
    </div>
  `).join('');
  container.querySelectorAll('[data-action="open"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const url = e.target.closest('[data-url]').getAttribute('data-url');
      openBookmark(url);
    });
  });
  container.querySelectorAll('[data-action="remove"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.closest('[data-id]').getAttribute('data-id');
      removeBookmark(parseFloat(id));
    });
  });
  container.querySelectorAll('[data-action="complete"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.closest('[data-id]').getAttribute('data-id');
      completeBookmark(parseFloat(id));
    });
  });
}

function filterBookmarks(category) {
  chrome.storage.local.get(['productiveBookmarks'], (result) => {
    const bookmarks = result.productiveBookmarks || [];
    displayBookmarks(bookmarks, category);
  });
}

function addCustomBookmark() {
  const title = document.getElementById('customBookmarkTitle').value.trim();
  const url = document.getElementById('customBookmarkUrl').value.trim();
  const category = document.getElementById('customBookmarkCategory').value;
  
  if (!title || !url) {
    showMessage('Please enter both title and URL!', 'error');
    return;
  }
  
  // Validate URL
  try {
    new URL(url);
  } catch (e) {
    showMessage('Please enter a valid URL!', 'error');
    return;
  }
  
  const domain = extractDomain(url);
  
  chrome.storage.local.get(['productiveBookmarks'], (result) => {
    const bookmarks = result.productiveBookmarks || [];
    
    // Check if bookmark already exists
    const existingBookmark = bookmarks.find(bookmark => bookmark.domain === domain);
    if (existingBookmark) {
      showMessage('This site is already bookmarked!', 'error');
      return;
    }
    
    const newBookmark = {
      id: Date.now() + Math.random(),
      title: title,
      url: url,
      domain: domain,
      category: category,
      timeSpent: 0,
      addedAt: new Date().toISOString(),
      lastVisited: new Date().toISOString(),
      isCustom: true // Mark as user-added
    };
    
    bookmarks.push(newBookmark);
    
    chrome.storage.local.set({ productiveBookmarks: bookmarks }, () => {
      // Clear form
      document.getElementById('customBookmarkTitle').value = '';
      document.getElementById('customBookmarkUrl').value = '';
      
      loadBookmarks();
      showMessage('Bookmark added successfully!', 'success');
      updateXP(5, 'adding bookmarks');
    });
  });
}

function removeBookmark(bookmarkId) {
  if (confirm('Are you sure you want to remove this bookmark?')) {
    chrome.storage.local.get(['productiveBookmarks'], (result) => {
      const bookmarks = result.productiveBookmarks || [];
      const updatedBookmarks = bookmarks.filter(bookmark => bookmark.id !== bookmarkId);
      
      chrome.storage.local.set({ productiveBookmarks: updatedBookmarks }, () => {
        loadBookmarks();
        showMessage('Bookmark removed successfully!', 'success');
      });
    });
  }
}

function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch (error) {
    return 'unknown';
  }
}
function refreshBookmarks() {
  const button = document.getElementById('refreshBookmarksBtn');
  if (!button) return;
  
  const originalText = button.innerHTML;
  button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
  button.disabled = true;
  
  // Request background script to update bookmarks
  chrome.runtime.sendMessage({ type: 'UPDATE_BOOKMARKS' }, (response) => {
    setTimeout(() => {
      loadBookmarks();
      button.innerHTML = '<i class="fas fa-check"></i> Updated!';
      
      setTimeout(() => {
        button.innerHTML = originalText;
        button.disabled = false;
      }, 1000);
      
      showMessage('Bookmarks refreshed successfully!', 'success');
    }, 500);
  });
}

function exportBookmarks() {
  chrome.storage.local.get(['productiveBookmarks'], (result) => {
    const bookmarks = result.productiveBookmarks || [];
    
    if (bookmarks.length === 0) {
      showMessage('No bookmarks to export!', 'error');
      return;
    }
    
    const exportData = {
      exportDate: new Date().toISOString(),
      totalBookmarks: bookmarks.length,
      bookmarks: bookmarks.map(bookmark => ({
        title: bookmark.title,
        url: bookmark.url,
        domain: bookmark.domain,
        category: bookmark.category,
        timeSpent: bookmark.timeSpent,
        addedAt: bookmark.addedAt
      }))
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `productive-bookmarks-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    showMessage('Bookmarks exported successfully!', 'success');
  });
}

function openBookmark(url) {
  chrome.tabs.create({ url: url, active: true })
    .then(() => {
      window.close();
    })
    .catch(err => {
      console.error('Error opening bookmark:', err);
      showMessage('Failed to open bookmark. Please try again.', 'error');
    });
}

// ========== UTILITY FUNCTIONS ==========
async function getTabData() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'getTabData' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Runtime error:', chrome.runtime.lastError);
        resolve([]);
      } else {
        resolve(response?.data || []);
      }
    });
  });
}

async function getDailyStats(days = 7) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'getDailyStats', days }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Runtime error:', chrome.runtime.lastError);
        resolve([]);
      } else {
        resolve(response?.data || []);
      }
    });
  });
}

async function getCurrentStats() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'getCurrentStats' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Runtime error:', chrome.runtime.lastError);
        resolve({ totalTime: 0, productiveTime: 0, distractingTime: 0, focusScore: 0 });
      } else {
        resolve(response?.data || { totalTime: 0, productiveTime: 0, distractingTime: 0, focusScore: 0 });
      }
    });
  });
}

async function getBlockedSites() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({type: 'GET_BLOCKED_SITES'}, (response) => {
      resolve(response?.sites || []);
    });
  });
}

function getSiteName(site) {
  // Extract a clean site name from the title or domain
  if (site.title && site.title !== 'Unknown' && !site.title.includes('chrome://')) {
    // Clean up common title patterns
    let name = site.title
      .replace(/^\(?\d+\)?\s*/, '') // Remove notification counts
      .replace(/\s*[-–—]\s*.*$/, '') // Remove everything after dash
      .replace(/\s*\|\s*.*$/, '') // Remove everything after pipe
      .replace(/\s*•\s*.*$/, '') // Remove everything after bullet
      .trim();
    
    // Limit length
    if (name.length > 20) {
      name = name.substring(0, 20) + '...';
    }
    
    return name || site.domain;
  }
  
  // Fallback to domain with nice formatting
  return site.domain
    .replace(/^www\./, '')
    .replace(/\.com$/, '')
    .replace(/\.org$/, '')
    .replace(/\.net$/, '')
    .replace(/\.edu$/, '');
}

function getScoreClass(score) {
  if (score >= 75) return 'good';
  if (score >= 50) return 'average';
  return 'poor';
}

function formatTime(minutes) {
  if (minutes < 1) return '< 1m';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

function updateMotivationalQuote() {
  const quotes = [
    "Innovation distinguishes between a leader and a follower. – Steve Jobs",
    "The only way to do great work is to love what you do. – Steve Jobs",
    "Success is not final, failure is not fatal: it is the courage to continue that counts. – Winston Churchill",
    "The future belongs to those who believe in the beauty of their dreams. – Eleanor Roosevelt",
    "It is during our darkest moments that we must focus to see the light. – Aristotle",
    "Education is the most powerful weapon which you can use to change the world. – Nelson Mandela"
  ];
  
  const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
  const element = document.getElementById('motivationText');
  if (element) element.textContent = randomQuote;
}

async function openFullAnalytics() {
  try {
    await chrome.tabs.create({
      url: chrome.runtime.getURL('dashboard.html'),
      active: true
    });
    window.close();
  } catch (error) {
    console.error('Error opening analytics:', error);
  }
}

async function openFullBookmarksAnalytics() {
  try {
    await chrome.tabs.create({
      url: chrome.runtime.getURL('bookmarks-analytics.html'),
      active: true
    });
    window.close();
  } catch (error) {
    console.error('Error opening bookmarks analytics:', error);
  }
}

async function refreshData() {
  try {
    const button = document.getElementById('refreshDataBtn');
    if (!button) return;
    
    const originalText = button.innerHTML;
    
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
    button.disabled = true;
    
    // Force background script to save current data
    await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'saveData' }, (response) => {
        resolve(response);
      });
    });
    
    // Wait a moment for data to be saved
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await loadDashboardData();
    await loadAnalyticsData();
    await loadUserStats();
    
    button.innerHTML = '<i class="fas fa-check"></i> Refreshed!';
    
    setTimeout(() => {
      button.innerHTML = originalText;
      button.disabled = false;
    }, 1000);
    
    showMessage('Data refreshed successfully!', 'success');
  } catch (error) {
    console.error('Error refreshing data:', error);
    const button = document.getElementById('refreshDataBtn');
    if (button) {
      button.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
      button.disabled = false;
    }
    showMessage('Failed to refresh data. Please try again.', 'error');
  }
}

function showMessage(message, type = 'info') {
  const messageDiv = document.createElement('div');
  messageDiv.className = type === 'error' ? 'error-message' : 'success-message';
  messageDiv.textContent = message;
  
  const content = document.getElementById('mainContent');
  if (content) {
    content.insertBefore(messageDiv, content.firstChild);
    
    // Remove message after 3 seconds
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.parentNode.removeChild(messageDiv);
      }
    }, 3000);
  }
}

function showError(message) {
  const content = document.getElementById('mainContent');
  if (content) {
    content.innerHTML = `
      <div class="loading">
        <p>${message}</p>
        <button class="btn btn-primary reload-btn">
          Retry
        </button>
      </div>
    `;
  }
}

function startAutoUpdate() {
  // Update data every 30 seconds
  updateInterval = setInterval(() => {
    loadDashboardData();
    loadUserStats();
  }, 30000);
}

// Make functions globally available
window.deleteNote = deleteNote;
window.updateGoalProgress = updateGoalProgress;
window.completeGoal = completeGoal;
window.deleteGoal = deleteGoal;
window.switchToGoals = switchToGoals;
window.completeReminder = completeReminder;
window.deleteReminder = deleteReminder;
window.openBookmark = openBookmark;
window.removeBookmark = removeBookmark;
window.completeBookmark = completeBookmark;

// Listen for data updates
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'data_updated') {
    loadDashboardData();
    loadUserStats();
  }
});

// Listen for storage changes to update bookmarks in real time
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.productiveBookmarks) {
    loadBookmarks();
  }
});

// Cleanup on unload
window.addEventListener('beforeunload', () => {
  if (updateInterval) {
    clearInterval(updateInterval);
  }
  if (focusTimer) {
    clearInterval(focusTimer);
  }
});

function renderAlertsBar() {
  const alertsBar = document.getElementById('alertsBar');
  if (!alertsBar) return;
  chrome.storage.local.get(['goals', 'reminders'], (result) => {
    const goals = (result.goals || []).filter(g => !g.completed && g.progress < g.target).slice(0, 3);
    const now = new Date();
    const reminders = (result.reminders || []).filter(r => !r.completed && new Date(r.reminderDateTime) >= now).sort((a, b) => new Date(a.reminderDateTime) - new Date(b.reminderDateTime)).slice(0, 3);
    let html = '';
    if (goals.length > 0) {
      html += `<div style='background:#fbbf24;color:#222;padding:10px 18px;border-radius:8px;margin-bottom:8px;font-weight:500;'>
        <span style='font-size:1.1em;'>⚡ Pending Goals:</span> ` + goals.map(g => `<span style='margin-right:18px;'>${g.title} (${g.progress}/${g.target})</span>`).join('') + `</div>`;
    }
    if (reminders.length > 0) {
      html += `<div style='background:#60a5fa;color:#fff;padding:10px 18px;border-radius:8px;font-weight:500;'>
        <span style='font-size:1.1em;'>⏰ Upcoming Reminders:</span> ` + reminders.map(r => `<span style='margin-right:18px;'>${r.title} (${r.date} ${r.time})</span>`).join('') + `</div>`;
    }
    if (!html) html = `<div style='background:#f87171;color:#fff;padding:10px 18px;border-radius:8px;font-weight:500;'>No pending goals or reminders!</div>`;
    alertsBar.innerHTML = html;
  });
}