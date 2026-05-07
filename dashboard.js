// dashboard.js - Enhanced dashboard with web monitoring integration

class DashboardController {
  constructor() {
    this.currentTab = 'overview';
    this.updateInterval = null;
    this.initializeDashboard();
    this.startAutoUpdate();
  }

  async initializeDashboard() {
    try {
      await this.loadAndRenderData();
      this.setupTabNavigation();
    } catch (error) {
      console.error('Error initializing dashboard:', error);
      this.showError('Failed to load dashboard data');
    }
  }

  setupTabNavigation() {
    document.querySelectorAll('.tab-nav').forEach(nav => {
      nav.addEventListener('click', (e) => {
        const tabName = e.target.getAttribute('data-tab');
        if (tabName) {
          this.switchTab(tabName);
        }
      });
    });
  }

  switchTab(tabName) {
    // Update nav
    document.querySelectorAll('.tab-nav').forEach(nav => {
      nav.classList.remove('active');
    });
    
    // Find the clicked tab nav and make it active
    const clickedNav = Array.from(document.querySelectorAll('.tab-nav')).find(nav => 
      nav.getAttribute('data-tab') === tabName
    );
    if (clickedNav) {
      clickedNav.classList.add('active');
    }

    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');
  }

  async loadAndRenderData() {
    const [tabData, dailyStats] = await Promise.all([
      this.getTabData(),
      this.getDailyStats(7)
    ]);

    this.renderOverview(tabData, dailyStats);
    this.renderTabs(tabData);
    this.renderAnalytics(dailyStats, tabData);
  }

  async getTabData() {
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

  async getDailyStats(days = 7) {
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

  renderOverview(tabData, dailyStats) {
    const today = dailyStats[dailyStats.length - 1] || {
      totalTime: 0,
      productiveTime: 0,
      distractingTime: 0,
      focusScore: 0,
      tabsSwitched: 0
    };

    const totalTabs = tabData.length;
    const productiveTabs = tabData.filter(tab => tab.category === 'productive').length;
    const distractingTabs = tabData.filter(tab => tab.category === 'distracting').length;

    const content = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value focus-score ${this.getScoreClass(today.focusScore)}">
            ${today.focusScore}%
          </div>
          <div class="stat-label">Today's Focus Score</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-value">${this.formatTime(today.totalTime)}</div>
          <div class="stat-label">Total Time Today</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-value productive">${this.formatTime(today.productiveTime)}</div>
          <div class="stat-label">Productive Time</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-value">${totalTabs}</div>
          <div class="stat-label">Sites Tracked</div>
        </div>
      </div>

      <div class="chart-container">
        <div class="chart-title">Weekly Focus Score Trend</div>
        <div class="chart-placeholder">
          ${this.renderWeeklyChart(dailyStats)}
        </div>
      </div>

      <div class="chart-container">
        <div class="chart-title">Site Category Breakdown</div>
        <div class="category-breakdown-chart">
          <div class="category-bar">
            <div class="category-section productive" style="width: ${totalTabs > 0 ? (productiveTabs / totalTabs) * 100 : 0}%">
              <span>Productive (${productiveTabs})</span>
            </div>
            <div class="category-section distracting" style="width: ${totalTabs > 0 ? (distractingTabs / totalTabs) * 100 : 0}%">
              <span>Distracting (${distractingTabs})</span>
            </div>
            <div class="category-section neutral" style="width: ${totalTabs > 0 ? ((totalTabs - productiveTabs - distractingTabs) / totalTabs) * 100 : 0}%">
              <span>Neutral (${totalTabs - productiveTabs - distractingTabs})</span>
            </div>
          </div>
        </div>
      </div>

      <div class="chart-container">
        <div class="chart-title">Top Sites Today</div>
        ${this.renderTopSites(tabData)}
      </div>
    `;

    document.getElementById('content').innerHTML = content;
  }

  renderTabs(tabData) {
    const sortedTabs = tabData.sort((a, b) => b.timeSpent - a.timeSpent);

    const content = `
      <div class="chart-container">
        <div class="chart-title">All Tracked Sites (${sortedTabs.length} total)</div>
        <div class="tab-list">
          ${sortedTabs.length > 0 ? sortedTabs.map(tab => `
            <div class="tab-item">
              <div class="tab-info">
                <div class="tab-icon ${tab.category}"></div>
                <div>
                  <div class="tab-title">${tab.title}</div>
                  <div class="tab-domain">${tab.domain} • ${tab.category} • ${tab.visitCount || 1} visits</div>
                </div>
              </div>
              <div class="tab-time">
                <div>${this.formatTime(tab.timeSpent)}</div>
                <div class="tab-status">${tab.isActive ? 'Active now' : 'Inactive'}</div>
              </div>
            </div>
          `).join('') : '<div class="no-data">No sites tracked yet. Start browsing to see data!</div>'}
        </div>
      </div>
    `;

    document.getElementById('tabs-content').innerHTML = content;
  }

  renderAnalytics(dailyStats, tabData) {
    const weeklyTotal = dailyStats.reduce((sum, day) => sum + day.totalTime, 0);
    const weeklyProductive = dailyStats.reduce((sum, day) => sum + day.productiveTime, 0);
    const weeklyDistracting = dailyStats.reduce((sum, day) => sum + day.distractingTime, 0);
    const avgFocusScore = dailyStats.length > 0 ? 
      Math.round(dailyStats.reduce((sum, day) => sum + day.focusScore, 0) / dailyStats.length) : 0;

    const productiveSites = tabData.filter(tab => tab.category === 'productive').slice(0, 5);
    const distractingSites = tabData.filter(tab => tab.category === 'distracting').slice(0, 5);

    const content = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${this.formatTime(weeklyTotal)}</div>
          <div class="stat-label">Weekly Total</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-value productive">${this.formatTime(weeklyProductive)}</div>
          <div class="stat-label">Weekly Productive</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-value distracting">${this.formatTime(weeklyDistracting)}</div>
          <div class="stat-label">Weekly Distracting</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-value focus-score ${this.getScoreClass(avgFocusScore)}">
            ${avgFocusScore}%
          </div>
          <div class="stat-label">Average Focus Score</div>
        </div>
      </div>

      <div class="chart-container">
        <div class="chart-title">Daily Activity Breakdown</div>
        <div class="daily-breakdown">
          ${dailyStats.map(day => {
            const date = new Date(day.date);
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            return `
              <div class="day-item">
                <div class="day-header">
                  <span class="day-name">${dayName}</span>
                  <span class="day-score ${this.getScoreClass(day.focusScore)}">${day.focusScore}%</span>
                </div>
                <div class="day-bars">
                  <div class="time-bar">
                    <div class="time-segment productive" style="width: ${day.totalTime > 0 ? (day.productiveTime / day.totalTime) * 100 : 0}%" title="Productive: ${this.formatTime(day.productiveTime)}"></div>
                    <div class="time-segment distracting" style="width: ${day.totalTime > 0 ? (day.distractingTime / day.totalTime) * 100 : 0}%" title="Distracting: ${this.formatTime(day.distractingTime)}"></div>
                    <div class="time-segment neutral" style="width: ${day.totalTime > 0 ? (day.neutralTime / day.totalTime) * 100 : 0}%" title="Neutral: ${this.formatTime(day.neutralTime)}"></div>
                  </div>
                </div>
                <div class="day-total">${this.formatTime(day.totalTime)} total</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div class="chart-container">
        <div class="chart-title">Site Analysis</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
          <div>
            <h4 style="margin-bottom: 15px; color: #4ade80; font-size: 1.2em;">Top Productive Sites</h4>
            ${productiveSites.length > 0 ? productiveSites.map(site => `
              <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                <span style="font-weight: 500;">${site.domain}</span>
                <span style="color: #4ade80; font-weight: 600;">${this.formatTime(site.timeSpent)}</span>
              </div>
            `).join('') : '<div class="no-data">No productive sites yet</div>'}
          </div>
          
          <div>
            <h4 style="margin-bottom: 15px; color: #f87171; font-size: 1.2em;">Top Distracting Sites</h4>
            ${distractingSites.length > 0 ? distractingSites.map(site => `
              <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                <span style="font-weight: 500;">${site.domain}</span>
                <span style="color: #f87171; font-weight: 600;">${this.formatTime(site.timeSpent)}</span>
              </div>
            `).join('') : '<div class="no-data">No distracting sites yet</div>'}
          </div>
        </div>
      </div>

      <div class="chart-container">
        <div class="chart-title">Productivity Insights</div>
        <div class="insights-grid">
          <div class="insight-card">
            <h4>💡 Focus Improvement</h4>
            <p>${this.getFocusInsight(avgFocusScore)}</p>
          </div>
          <div class="insight-card">
            <h4>📊 Usage Pattern</h4>
            <p>${this.getUsageInsight(weeklyTotal, weeklyProductive, weeklyDistracting)}</p>
          </div>
          <div class="insight-card">
            <h4>🎯 Recommendation</h4>
            <p>${this.getRecommendation(avgFocusScore, weeklyDistracting)}</p>
          </div>
          <div class="insight-card">
            <h4>📚 Learning Progress</h4>
            <p>${this.getLearningInsight(productiveSites.length)}</p>
          </div>
        </div>
      </div>
    `;

    document.getElementById('analytics-content').innerHTML = content;
  }

  renderWeeklyChart(dailyStats) {
    if (dailyStats.length === 0) {
      return '<div class="no-data">No data available yet</div>';
    }

    return `
      <div style="display: flex; align-items: end; gap: 12px; height: 200px; padding: 20px; justify-content: center;">
        ${dailyStats.map(day => {
          const height = Math.max(10, (day.focusScore / 100) * 160);
          const date = new Date(day.date);
          const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
          
          return `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
              <div style="
                width: 40px;
                height: ${height}px;
                background: linear-gradient(to top, ${this.getScoreGradient(day.focusScore)});
                border-radius: 6px;
                position: relative;
                transition: all 0.3s ease;
              " title="${dayName}: ${day.focusScore}% focus score, ${this.formatTime(day.totalTime)} total time">
                <div style="
                  position: absolute;
                  top: -25px;
                  left: 50%;
                  transform: translateX(-50%);
                  font-size: 11px;
                  font-weight: 600;
                  color: #fff;
                  white-space: nowrap;
                ">${day.focusScore}%</div>
              </div>
              <span style="font-size: 13px; color: rgba(255, 255, 255, 0.8); font-weight: 500;">${dayName}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  renderTopSites(tabData) {
    const topSites = tabData
      .sort((a, b) => b.timeSpent - a.timeSpent)
      .slice(0, 5);

    if (topSites.length === 0) {
      return '<div class="no-data">No sites tracked yet</div>';
    }

    return `
      <div style="display: flex; flex-direction: column; gap: 15px;">
        ${topSites.map((site, index) => `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 15px 20px; background: rgba(255, 255, 255, 0.05); border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1);">
            <div style="display: flex; align-items: center; gap: 15px;">
              <span style="
                width: 30px;
                height: 30px;
                background: ${this.getCategoryColor(site.category)};
                color: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
                font-weight: bold;
              ">${index + 1}</span>
              <div>
                <div style="font-weight: 600; font-size: 1.1em;">${site.domain}</div>
                <div style="font-size: 0.9em; color: rgba(255, 255, 255, 0.7);">${site.category} • ${site.visitCount || 1} visits</div>
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: 700; font-size: 1.2em;">${this.formatTime(site.timeSpent)}</div>
              <div style="font-size: 0.9em; color: rgba(255, 255, 255, 0.7);">${site.isActive ? 'Active' : 'Inactive'}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  getScoreClass(score) {
    if (score >= 75) return 'good';
    if (score >= 50) return 'average';
    return 'poor';
  }

  getScoreGradient(score) {
    if (score >= 75) return '#4ade80, #22d3ee';
    if (score >= 50) return '#fbbf24, #f59e0b';
    return '#f87171, #ef4444';
  }

  getCategoryColor(category) {
    switch (category) {
      case 'productive': return '#4ade80';
      case 'distracting': return '#f87171';
      case 'neutral': return '#9ca3af';
      default: return '#9ca3af';
    }
  }

  getFocusInsight(score) {
    if (score >= 80) return 'Excellent focus! You\'re maintaining great productivity habits and staying on track with your goals.';
    if (score >= 60) return 'Good focus overall. Try to reduce time on distracting sites during study hours.';
    return 'Focus needs improvement. Consider using website blockers during study time and setting specific goals.';
  }

  getUsageInsight(total, productive, distracting) {
    const productiveRatio = total > 0 ? (productive / total) * 100 : 0;
    if (productiveRatio >= 70) return 'Great balance! Most of your time is spent productively on educational and work-related sites.';
    if (productiveRatio >= 50) return 'Decent balance. Try to increase productive site usage and limit entertainment browsing.';
    return 'Consider spending more time on educational and productive websites to improve your learning outcomes.';
  }

  getRecommendation(focusScore, distractingTime) {
    if (focusScore >= 80) return 'Keep up the excellent work! Your study habits are on track for success.';
    if (distractingTime > 60) return 'Try setting daily limits for social media and entertainment sites using the site blocker feature.';
    return 'Use the Pomodoro Technique: 25 minutes focused work, 5 minute breaks. Enable focus sessions for better results.';
  }

  getLearningInsight(productiveSitesCount) {
    if (productiveSitesCount >= 5) return 'Excellent! You\'re using diverse educational resources and learning platforms effectively.';
    if (productiveSitesCount >= 3) return 'Good variety of learning platforms. Keep exploring new educational resources!';
    return 'Try exploring more educational websites like Khan Academy, Coursera, GitHub, or subject-specific learning platforms.';
  }

  formatTime(minutes) {
    if (minutes < 1) return '< 1m';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  startAutoUpdate() {
    // Update dashboard every 30 seconds
    this.updateInterval = setInterval(() => {
      this.loadAndRenderData();
    }, 30000);
  }

  showError(message) {
    document.getElementById('content').innerHTML = `
      <div class="error">
        <h3>Error Loading Data</h3>
        <p>${message}</p>
        <button class="btn reload-btn">
          <i class="fas fa-redo"></i> Retry
        </button>
      </div>
    `;
    document.querySelectorAll('.reload-btn').forEach(btn => {
      btn.addEventListener('click', () => location.reload());
    });
  }
}

// Initialize dashboard controller
const dashboardController = new DashboardController();

// Listen for data updates
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'data_updated') {
    dashboardController.loadAndRenderData();
  }
});

// Cleanup on unload
window.addEventListener('beforeunload', () => {
  if (dashboardController.updateInterval) {
    clearInterval(dashboardController.updateInterval);
  }
});