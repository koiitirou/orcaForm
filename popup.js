document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('autoDateToggle');
  const statusBar = document.getElementById('statusBar');
  const statusText = document.getElementById('statusText');

  // Load saved state
  chrome.storage.local.get(['autoDateEnabled'], (result) => {
    const enabled = result.autoDateEnabled || false;
    toggle.checked = enabled;
    updateStatusUI(enabled);
  });

  // Handle toggle change
  toggle.addEventListener('change', () => {
    const enabled = toggle.checked;
    chrome.storage.local.set({ autoDateEnabled: enabled });
    updateStatusUI(enabled);

    // Notify active tab's content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'toggleAutoDate',
          enabled: enabled
        }).catch(() => {
          // Content script may not be loaded on this page
        });
      }
    });
  });

  function updateStatusUI(enabled) {
    if (enabled) {
      statusBar.className = 'status-bar active';
      statusText.textContent = '有効 — ページ読込時に自動設定';
    } else {
      statusBar.className = 'status-bar inactive';
      statusText.textContent = '無効';
    }
  }
});
