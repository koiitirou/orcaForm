/**
 * ORCA Order Convert Helper - Background Service Worker
 *
 * 拡張機能アイコンをクリックしたとき、
 * content script にサイドバーのトグルを指示する。
 */

chrome.action.onClicked.addListener(function (tab) {
  if (tab.id) {
    chrome.tabs.sendMessage(tab.id, { action: 'toggleSidebar' }).catch(function () {
      // content script が読み込まれていないページでは無視
    });
  }
});
