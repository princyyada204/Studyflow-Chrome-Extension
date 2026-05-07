// Handle tab navigation
const tabButtons = document.querySelectorAll('.tab-nav');
const tabContents = document.querySelectorAll('.tab-content');
tabButtons.forEach(btn => {
  btn.addEventListener('click', function() {
    tabButtons.forEach(b => b.classList.remove('active'));
    tabContents.forEach(tc => tc.classList.remove('active'));
    this.classList.add('active');
    const tab = this.getAttribute('data-tab');
    document.getElementById(tab).classList.add('active');
    if (tab === 'bookmarks-list') renderBookmarksList();
  });
});

function renderBookmarksList() {
  const container = document.getElementById('bookmarks-list');
  if (!container) return;
  chrome.storage.local.get(['productiveBookmarks'], (result) => {
    let bookmarks = result.productiveBookmarks || [];
    // Render add form
    let html = `
      <form id="addBookmarkForm" style="margin-bottom:20px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        <input type="text" id="newBookmarkTitle" placeholder="Title" required style="padding:8px;border-radius:6px;border:none;min-width:120px;">
        <input type="url" id="newBookmarkUrl" placeholder="URL (https://...)" required style="padding:8px;border-radius:6px;border:none;min-width:180px;">
        <input type="text" id="newBookmarkCategory" placeholder="Category" style="padding:8px;border-radius:6px;border:none;min-width:100px;">
        <button type="submit" class="btn btn-primary"><i class="fas fa-plus"></i> Add</button>
      </form>
    `;
    if (bookmarks.length === 0) {
      html += '<div class="no-data">No bookmarks found.</div>';
    } else {
      html += bookmarks.map(bookmark => `
        <div class="tab-item">
          <div class="tab-info">
            <div class="tab-icon" style="background: ${bookmark.isCustom ? '#22d3ee' : '#4ade80'};"></div>
            <div>
              <div class="tab-title clickable-bookmark" data-url="${bookmark.url}" style="cursor: pointer !important; color: #1976D2 !important; text-decoration: underline !important;" title="Click to open ${bookmark.title}">${bookmark.title}</div>
              <div class="tab-domain">${bookmark.domain} ${bookmark.isCustom ? '• Custom' : '• Auto'}</div>
            </div>
          </div>
          <div class="tab-time">
            <div>${bookmark.timeSpent > 0 ? formatTime(bookmark.timeSpent) : 'New'}</div>
            <div class="tab-status">${bookmark.category}</div>
            <button class="btn" data-id="${bookmark.id}" style="margin-left:10px;background:#f87171;padding:4px 10px;" title="Delete"><i class="fas fa-trash"></i></button>
          </div>
        </div>
      `).join('');
    }
    container.innerHTML = html;
    // Add event for add form
    const addForm = document.getElementById('addBookmarkForm');
    if (addForm) {
      addForm.onsubmit = function(e) {
        e.preventDefault();
        const title = document.getElementById('newBookmarkTitle').value.trim();
        const url = document.getElementById('newBookmarkUrl').value.trim();
        const category = document.getElementById('newBookmarkCategory').value.trim() || 'custom';
        if (!title || !url) return;
        let domain;
        try { domain = new URL(url).hostname.replace(/^www\./, ''); } catch { domain = url; }
        // Prevent duplicates
        if (bookmarks.some(b => b.domain === domain)) {
          alert('This site is already bookmarked!');
          return;
        }
        const newBookmark = {
          id: Date.now() + Math.random(),
          title,
          url,
          domain,
          category,
          timeSpent: 0,
          addedAt: new Date().toISOString(),
          lastVisited: new Date().toISOString(),
          isCustom: true
        };
        bookmarks.push(newBookmark);
        chrome.storage.local.set({ productiveBookmarks: bookmarks }, renderBookmarksList);
        addForm.reset();
      };
    }
    // Add event for delete buttons
    container.querySelectorAll('.btn[data-id]').forEach(btn => {
      btn.addEventListener('click', function() {
        const id = parseFloat(this.getAttribute('data-id'));
        bookmarks = bookmarks.filter(b => b.id !== id);
        chrome.storage.local.set({ productiveBookmarks: bookmarks }, renderBookmarksList);
      });
    });
    
    // Add event listeners for clickable bookmarks
    container.querySelectorAll('.clickable-bookmark').forEach(bookmarkTitle => {
      bookmarkTitle.addEventListener('click', function() {
        const url = this.getAttribute('data-url');
        if (url) {
          openBookmark(url);
        }
      });
    });
  });
}

function formatTime(minutes) {
  if (!minutes || isNaN(minutes)) return '0m';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

function openBookmark(url) {
  // Open the bookmark URL in a new tab
  if (chrome && chrome.tabs && chrome.tabs.create) {
    chrome.tabs.create({ url: url });
  } else {
    // Fallback: open in current window
    window.open(url, '_blank');
  }
}

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

// Initial render if tab is active
if (document.querySelector('.tab-nav.active[data-tab="bookmarks-list"]')) renderBookmarksList();

// Make openBookmark function globally available
window.openBookmark = openBookmark; 