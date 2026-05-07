// options.js - Options page functionality

// ========== CONSTANTS ==========
const BLOCKED_SITES_KEY = 'blockedSites';
const CUSTOM_QUOTES_KEY = 'customQuotes';
const DAILY_GOAL_KEY = 'dailyGoal';
const REMINDER_TIME_KEY = 'reminderTime';
const POMODORO_SETTINGS_KEY = 'pomodoroSettings';
const AI_TOOLS_KEY = 'aiTools';

// ========== DOM ELEMENTS ==========
const blockSiteForm = document.getElementById('blockSiteForm');
const blockSiteInput = document.getElementById('blockSiteInput');
const blockedSitesList = document.getElementById('blockedSitesList');

const quoteForm = document.getElementById('quoteForm');
const quoteInput = document.getElementById('quoteInput');
const quotesList = document.getElementById('quotesList');

const dailyGoalInput = document.getElementById('dailyGoalInput');
const reminderTimeInput = document.getElementById('reminderTimeInput');
const saveGoalBtn = document.getElementById('saveGoalBtn');
const goalStatus = document.getElementById('goalStatus');

const pomodoroDuration = document.getElementById('pomodoroDuration');
const breakDuration = document.getElementById('breakDuration');
const savePomodoroBtn = document.getElementById('savePomodoroBtn');
const pomodoroStatus = document.getElementById('pomodoroStatus');

const aiToolForm = document.getElementById('aiToolForm');
const aiToolName = document.getElementById('aiToolName');
const aiToolUrl = document.getElementById('aiToolUrl');
const aiToolsList = document.getElementById('aiToolsList');

const clearDataBtn = document.getElementById('clearDataBtn');
const clearStatus = document.getElementById('clearStatus');

// ========== BLOCKED SITES MANAGEMENT ==========
blockSiteForm.addEventListener('submit', function(e) {
  e.preventDefault();
  const site = blockSiteInput.value.trim();
  if (site) {
    addBlockedSite(site);
    blockSiteInput.value = '';
  }
});

function addBlockedSite(site) {
  chrome.storage.local.get([BLOCKED_SITES_KEY], (result) => {
    const sites = result[BLOCKED_SITES_KEY] || [];
    if (!sites.includes(site)) {
      sites.push(site);
      chrome.storage.local.set({ [BLOCKED_SITES_KEY]: sites });
      chrome.runtime.sendMessage({
        type: 'UPDATE_BLOCKED_SITES',
        sites: sites
      })
      .then(() => {
        displayBlockedSites();
      })
      .catch(err => {
        console.error('Error updating blocked sites:', err);
      });
    }
  });
}

function removeBlockedSite(site) {
  chrome.storage.local.get([BLOCKED_SITES_KEY], (result) => {
    const sites = result[BLOCKED_SITES_KEY] || [];
    const updatedSites = sites.filter(s => s !== site);
    chrome.storage.local.set({ [BLOCKED_SITES_KEY]: updatedSites });
    chrome.runtime.sendMessage({
      type: 'UPDATE_BLOCKED_SITES',
      sites: updatedSites
    })
    .then(() => {
      displayBlockedSites();
    })
    .catch(err => {
      console.error('Error updating blocked sites:', err);
    });
  });
}

function displayBlockedSites() {
  chrome.storage.local.get([BLOCKED_SITES_KEY], (result) => {
    const sites = result[BLOCKED_SITES_KEY] || [];
    blockedSitesList.innerHTML = '';
    sites.forEach(site => {
      const li = document.createElement('li');
      li.className = 'collection-item';
      li.innerHTML = `
        <span>${site}</span>
        <a href="#" class="secondary-content remove-blocked-site" data-site="${site}">
          <i class="fas fa-trash red-text"></i>
        </a>
      `;
      blockedSitesList.appendChild(li);
    });
    blockedSitesList.querySelectorAll('.remove-blocked-site').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        removeBlockedSite(link.getAttribute('data-site'));
      });
    });
  });
}

// ========== MOTIVATIONAL QUOTES ==========
quoteForm.addEventListener('submit', function(e) {
  e.preventDefault();
  const quote = quoteInput.value.trim();
  if (quote) {
    addCustomQuote(quote);
    quoteInput.value = '';
  }
});

function addCustomQuote(quote) {
  chrome.storage.local.get([CUSTOM_QUOTES_KEY], (result) => {
    const quotes = result[CUSTOM_QUOTES_KEY] || [];
    quotes.push(quote);
    chrome.storage.local.set({ [CUSTOM_QUOTES_KEY]: quotes });
    displayCustomQuotes();
  });
}

function removeCustomQuote(index) {
  chrome.storage.local.get([CUSTOM_QUOTES_KEY], (result) => {
    const quotes = result[CUSTOM_QUOTES_KEY] || [];
    quotes.splice(index, 1);
    chrome.storage.local.set({ [CUSTOM_QUOTES_KEY]: quotes });
    displayCustomQuotes();
  });
}

function displayCustomQuotes() {
  chrome.storage.local.get([CUSTOM_QUOTES_KEY], (result) => {
    const quotes = result[CUSTOM_QUOTES_KEY] || [];
    quotesList.innerHTML = '';
    quotes.forEach((quote, index) => {
      const li = document.createElement('li');
      li.className = 'collection-item';
      li.innerHTML = `
        <span>${quote}</span>
        <a href="#" class="secondary-content remove-quote" data-index="${index}">
          <i class="fas fa-trash red-text"></i>
        </a>
      `;
      quotesList.appendChild(li);
    });
    quotesList.querySelectorAll('.remove-quote').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        removeCustomQuote(parseInt(link.getAttribute('data-index')));
      });
    });
  });
}

// ========== DAILY GOALS & REMINDERS ==========
saveGoalBtn.addEventListener('click', function() {
  const goal = dailyGoalInput.value.trim();
  const reminderTime = reminderTimeInput.value;
  
  if (goal) {
    chrome.storage.local.set({
      [DAILY_GOAL_KEY]: goal,
      [REMINDER_TIME_KEY]: reminderTime
    });
    goalStatus.textContent = 'Goal saved successfully!';
    setTimeout(() => goalStatus.textContent = '', 3000);
  }
});

// ========== POMODORO SETTINGS ==========
savePomodoroBtn.addEventListener('click', function() {
  const pomodoroTime = parseInt(pomodoroDuration.value);
  const breakTime = parseInt(breakDuration.value);
  
  if (pomodoroTime && breakTime) {
    chrome.storage.local.set({
      [POMODORO_SETTINGS_KEY]: {
        pomodoro: pomodoroTime,
        break: breakTime
      }
    });
    pomodoroStatus.textContent = 'Settings saved!';
    setTimeout(() => pomodoroStatus.textContent = '', 3000);
  }
});

// ========== AI TOOLS ==========
aiToolForm.addEventListener('submit', function(e) {
  e.preventDefault();
  const name = aiToolName.value.trim();
  const url = aiToolUrl.value.trim();
  
  if (name && url) {
    addAITool(name, url);
    aiToolName.value = '';
    aiToolUrl.value = '';
  }
});

function addAITool(name, url) {
  chrome.storage.local.get([AI_TOOLS_KEY], (result) => {
    const tools = result[AI_TOOLS_KEY] || [];
    tools.push({ name, url });
    chrome.storage.local.set({ [AI_TOOLS_KEY]: tools });
    displayAITools();
  });
}

function removeAITool(index) {
  chrome.storage.local.get([AI_TOOLS_KEY], (result) => {
    const tools = result[AI_TOOLS_KEY] || [];
    tools.splice(index, 1);
    chrome.storage.local.set({ [AI_TOOLS_KEY]: tools });
    displayAITools();
  });
}

function displayAITools() {
  chrome.storage.local.get([AI_TOOLS_KEY], (result) => {
    const tools = result[AI_TOOLS_KEY] || [];
    aiToolsList.innerHTML = '';
    tools.forEach((tool, index) => {
      const li = document.createElement('li');
      li.className = 'collection-item';
      li.innerHTML = `
        <span>${tool.name} - ${tool.url}</span>
        <a href="#" class="secondary-content remove-ai-tool" data-index="${index}">
          <i class="fas fa-trash red-text"></i>
        </a>
      `;
      aiToolsList.appendChild(li);
    });
    aiToolsList.querySelectorAll('.remove-ai-tool').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        removeAITool(parseInt(link.getAttribute('data-index')));
      });
    });
  });
}

// ========== DATA MANAGEMENT ==========
clearDataBtn.addEventListener('click', function() {
  if (confirm('Are you sure you want to clear all extension data? This cannot be undone.')) {
    chrome.storage.local.clear(() => {
      clearStatus.textContent = 'All data cleared successfully!';
      setTimeout(() => {
        clearStatus.textContent = '';
        loadSavedSettings();
      }, 3000);
    });
  }
});

// ========== LOAD SAVED SETTINGS ==========
function loadSavedSettings() {
  // Load blocked sites
  displayBlockedSites();
  
  // Load custom quotes
  displayCustomQuotes();
  
  // Load daily goal and reminder
  chrome.storage.local.get([DAILY_GOAL_KEY, REMINDER_TIME_KEY], (result) => {
    if (result[DAILY_GOAL_KEY]) {
      dailyGoalInput.value = result[DAILY_GOAL_KEY];
    }
    if (result[REMINDER_TIME_KEY]) {
      reminderTimeInput.value = result[REMINDER_TIME_KEY];
    }
  });
  
  // Load Pomodoro settings
  chrome.storage.local.get([POMODORO_SETTINGS_KEY], (result) => {
    if (result[POMODORO_SETTINGS_KEY]) {
      pomodoroDuration.value = result[POMODORO_SETTINGS_KEY].pomodoro || 25;
      breakDuration.value = result[POMODORO_SETTINGS_KEY].break || 5;
    }
  });
  
  // Load AI tools
  displayAITools();
}

// ========== GLOBAL FUNCTIONS FOR ONCLICK HANDLERS ==========
window.removeBlockedSite = removeBlockedSite;
window.removeCustomQuote = removeCustomQuote;
window.removeAITool = removeAITool;

// ========== INITIALIZE ==========
document.addEventListener('DOMContentLoaded', function() {
  // Initialize Materialize components
  M.AutoInit();
  
  // Load saved settings
  loadSavedSettings();
});