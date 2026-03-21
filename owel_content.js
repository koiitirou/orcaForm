/**
 * ORCA Helper - SECOM OWEL (介護会計) エントリーポイント
 *
 * c1.secom-owel.jp 用のフローティングボタンとリサイズ可能サイドバー。
 * ORCA側のモジュール群(OrcaRules等)には依存せず、単独で動作する。
 */
(function () {
  'use strict';

  var SIDEBAR_OPEN_KEY  = 'owelSidebarOpen';
  var SIDEBAR_WIDTH_KEY = 'owelSidebarWidth';
  var DEFAULT_WIDTH = 300;
  var MIN_WIDTH = 200;
  var MAX_WIDTH = 600;

  var sidebar, floatBtn, resizeHandle;
  var sidebarWidth = DEFAULT_WIDTH;

  // ============================================================
  // CSS
  // ============================================================
  function injectCSS() {
    if (document.getElementById('owel-helper-style')) return;
    var style = document.createElement('style');
    style.id = 'owel-helper-style';
    style.textContent = [
      ':root {',
      '  --owel-accent: #4a90d9;',
      '  --owel-accent-hover: rgba(74,144,217,0.25);',
      '  --owel-sidebar-bg: #fdfdfd;',
      '  --owel-border: #e2e8f0;',
      '  --owel-shadow: rgba(0,0,0,0.06);',
      '  --owel-text-main: #475569;',
      '  --owel-text-sub: #64748b;',
      '  --owel-card-bg: #ffffff;',
      '  --owel-card-border: #e2e8f0;',
      '  --owel-card-shadow: rgba(0,0,0,0.02);',
      '  --owel-close-color: #94a3b8;',
      '  --owel-close-hover-bg: #f8fafc;',
      '  --owel-close-hover-color: #64748b;',
      '}',
      '',
      'body.owel-helper-active {',
      '  margin-right: var(--owel-sidebar-w, ' + DEFAULT_WIDTH + 'px) !important;',
      '}',
      '',
      '#owel-helper-float-btn {',
      '  position: fixed; top: 16px; right: 16px; width: 44px; height: 44px;',
      '  z-index: 99998; background: linear-gradient(135deg, #fff, #f0f4ff);',
      '  border: 1px solid rgba(74,144,217,0.3); border-radius: 50%;',
      '  color: var(--owel-accent); font-size: 20px; cursor: pointer;',
      '  display: flex; align-items: center; justify-content: center;',
      '  box-shadow: 0 4px 12px rgba(0,0,0,0.08); transition: transform 0.25s, box-shadow 0.25s;',
      '}',
      '#owel-helper-float-btn:hover { transform: scale(1.1); box-shadow: 0 6px 16px var(--owel-accent-hover); }',
      '#owel-helper-float-btn.hidden { opacity: 0; pointer-events: none; }',
      '',
      '#owel-helper-sidebar {',
      '  display: none; position: fixed;',
      '  top: 0; right: 0; height: 100vh;',
      '  z-index: 99999; font-family: "Segoe UI", "Meiryo", sans-serif;',
      '  background: var(--owel-sidebar-bg);',
      '  border-left: 1px solid var(--owel-border); box-shadow: -4px 0 24px var(--owel-shadow);',
      '  flex-direction: column;',
      '}',
      '#owel-helper-sidebar.open { display: flex; }',
      '',
      '.owel-resize-handle {',
      '  position: absolute; top: 0; left: -4px; width: 8px; height: 100%;',
      '  cursor: ew-resize; z-index: 100000;',
      '}',
      '.owel-resize-handle:hover, .owel-resize-handle.active {',
      '  background: var(--owel-accent); opacity: 0.3;',
      '}',
      '',
      '.owel-sidebar-header {',
      '  padding: 12px 16px; border-bottom: 1px solid var(--owel-border);',
      '  display: flex; align-items: center; justify-content: space-between;',
      '  box-sizing: border-box; background: #fff; min-height: 48px;',
      '}',
      '.owel-sidebar-header h2 { margin: 0; font-size: 15px; font-weight: bold; color: var(--owel-text-main); }',
      '.owel-sidebar-close {',
      '  background: none; border: none; color: var(--owel-close-color); font-size: 16px;',
      '  cursor: pointer; padding: 4px 8px; border-radius: 6px;',
      '}',
      '.owel-sidebar-close:hover { background: var(--owel-close-hover-bg); color: var(--owel-close-hover-color); }',
      '',
      '.owel-sidebar-content {',
      '  padding: 16px; flex: 1; box-sizing: border-box; overflow-y: auto;',
      '}',
      '',
      '.owel-setting-card {',
      '  background: var(--owel-card-bg); border: 1px solid var(--owel-card-border);',
      '  border-radius: 12px; padding: 18px; box-shadow: 0 2px 8px var(--owel-card-shadow);',
      '  margin-bottom: 12px;',
      '}',
      '.owel-setting-label { font-size: 14px; font-weight: 600; color: var(--owel-text-main); }',
      '.owel-setting-desc { font-size: 12px; color: var(--owel-text-sub); margin-top: 6px; line-height: 1.4; }',
      '.owel-info-card {',
      '  padding: 14px; background: #f8fafc; border: 1px solid var(--owel-card-border);',
      '  border-radius: 10px; font-size: 12px; color: var(--owel-text-sub); text-align: center;',
      '}'
    ].join('\n');
    document.head.appendChild(style);
  }

  // ============================================================
  // サイドバー幅の適用
  // ============================================================
  function applySidebarWidth(w) {
    sidebarWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, w));
    if (sidebar) sidebar.style.width = sidebarWidth + 'px';
    document.documentElement.style.setProperty('--owel-sidebar-w', sidebarWidth + 'px');
  }

  // ============================================================
  // リサイズ
  // ============================================================
  function initResize() {
    var startX, startW;

    resizeHandle.addEventListener('mousedown', function (e) {
      e.preventDefault();
      startX = e.clientX;
      startW = sidebarWidth;
      resizeHandle.classList.add('active');

      function onMove(ev) {
        var diff = startX - ev.clientX;
        applySidebarWidth(startW + diff);
      }

      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        resizeHandle.classList.remove('active');
        var obj = {};
        obj[SIDEBAR_WIDTH_KEY] = sidebarWidth;
        chrome.storage.local.set(obj);
      }

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  // ============================================================
  // サイドバー開閉
  // ============================================================
  function openSidebar() {
    if (sidebar) sidebar.classList.add('open');
    if (floatBtn) floatBtn.classList.add('hidden');
    document.body.classList.add('owel-helper-active');
    applySidebarWidth(sidebarWidth);
    var obj = {};
    obj[SIDEBAR_OPEN_KEY] = true;
    chrome.storage.local.set(obj);
  }

  function closeSidebar() {
    if (sidebar) sidebar.classList.remove('open');
    if (floatBtn) floatBtn.classList.remove('hidden');
    document.body.classList.remove('owel-helper-active');
    var obj = {};
    obj[SIDEBAR_OPEN_KEY] = false;
    chrome.storage.local.set(obj);
  }

  // ============================================================
  // UI構築
  // ============================================================
  function createUI() {
    // フローティングボタン
    floatBtn = document.createElement('button');
    floatBtn.id = 'owel-helper-float-btn';
    floatBtn.title = 'ORCA Helper を開く';
    floatBtn.innerHTML = '⚕';
    document.body.appendChild(floatBtn);

    // サイドバー
    sidebar = document.createElement('div');
    sidebar.id = 'owel-helper-sidebar';
    sidebar.innerHTML = [
      '<div class="owel-resize-handle"></div>',
      '<div class="owel-sidebar-header">',
      '  <h2>ORCA Helper</h2>',
      '  <button class="owel-sidebar-close" id="owel-sidebar-close" title="閉じる">✕</button>',
      '</div>',
      '<div class="owel-sidebar-content">',
      '  <div class="owel-setting-card">',
      '    <div class="owel-setting-label">介護会計 (OWEL)</div>',
      '    <div class="owel-setting-desc">c1.secom-owel.jp で動作中</div>',
      '  </div>',
      '  <div class="owel-info-card">',
      '    機能は順次追加予定です',
      '  </div>',
      '</div>'
    ].join('\n');
    document.body.appendChild(sidebar);

    resizeHandle = sidebar.querySelector('.owel-resize-handle');

    // イベント
    floatBtn.addEventListener('click', openSidebar);
    document.getElementById('owel-sidebar-close').addEventListener('click', closeSidebar);
    initResize();
  }

  // ============================================================
  // 初期化
  // ============================================================
  function init() {
    injectCSS();
    createUI();

    // 保存済みの幅と開閉状態を復元
    chrome.storage.local.get([SIDEBAR_OPEN_KEY, SIDEBAR_WIDTH_KEY], function (result) {
      if (result[SIDEBAR_WIDTH_KEY]) {
        applySidebarWidth(result[SIDEBAR_WIDTH_KEY]);
      }
      if (result[SIDEBAR_OPEN_KEY]) {
        openSidebar();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
