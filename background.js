/**
 * ORCA Order Convert Helper - Background Service Worker
 *
 * 拡張機能アイコンをクリックしたとき、
 * content script にサイドバーのトグルを指示する。
 * 対象ページ以外ではエラーを出さないようにガードする。
 */

chrome.action.onClicked.addListener(async function (tab) {
  if (!tab.id || !tab.url) return;

  // 対象ページかどうかチェック
  if (!tab.url.includes('172.28.22.148/orderconvert/')) return;

  try {
    await chrome.tabs.sendMessage(tab.id, { action: 'toggleSidebar' });
  } catch (e) {
    // content script がまだ読み込まれていない場合は無視
  }
});
