const timeLimitInput = document.getElementById('timeLimit');
const saveBtn = document.getElementById('saveOptions');

chrome.storage.sync.get(['dailyLimit'], (result) => {
  timeLimitInput.value = result.dailyLimit || 0;
});

saveBtn.addEventListener('click', () => {
  const limit = parseInt(timeLimitInput.value, 10);
  if (!isNaN(limit)) {
    chrome.storage.sync.set({ dailyLimit: limit });
    alert('Settings saved.');
  }
});
