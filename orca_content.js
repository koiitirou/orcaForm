/**
 * ORCA Helper - WebORCA Content Script
 *
 * WebORCA (orcamo.jp) の診療行為確認画面で
 * .820 処方箋料を自動検出し、削除剤番号に番号を自動入力する。
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'orcaDeleteShohousen';
  var SIDEBAR_OPEN_KEY = 'orcaSidebarOpen';
  var SIDEBAR_WIDTH = 240;
  var isEnabled = false;
  var hasRun = false; // 重複実行防止

  // ========================================
  // スタイル注入
  // ========================================
  function injectStyles() {
    var style = document.createElement('style');
    style.textContent = [
      'body { transition: margin-right 0.3s cubic-bezier(0.4,0,0.2,1) !important; }',
      '',
      '#orca-helper-float-btn {',
      '  position: fixed; top: 12px; right: 12px; width: 40px; height: 40px;',
      '  z-index: 99999; background: linear-gradient(135deg, #1a1a2e, #0f3460);',
      '  border: 1px solid rgba(79,172,254,0.3); border-radius: 10px;',
      '  color: #4facfe; font-size: 18px; cursor: pointer;',
      '  display: flex; align-items: center; justify-content: center;',
      '  box-shadow: 0 2px 12px rgba(0,0,0,0.3); transition: all 0.25s;',
      '}',
      '#orca-helper-float-btn:hover {',
      '  background: linear-gradient(135deg, #16213e, #1a3a6e);',
      '  box-shadow: 0 4px 16px rgba(79,172,254,0.25); transform: scale(1.05);',
      '}',
      '#orca-helper-float-btn.hidden { display: none; }',
      '',
      '#orca-helper-sidebar {',
      '  position: fixed; top: 0; right: 0; width: 0; height: 100vh;',
      '  z-index: 99998; font-family: "Segoe UI","Meiryo",sans-serif;',
      '  transition: width 0.3s cubic-bezier(0.4,0,0.2,1); overflow: hidden;',
      '}',
      '#orca-helper-sidebar.open { width: ' + SIDEBAR_WIDTH + 'px; }',
      '',
      '#orca-helper-sidebar .sidebar-inner {',
      '  width: ' + SIDEBAR_WIDTH + 'px; height: 100%;',
      '  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%);',
      '  border-left: 1px solid rgba(79,172,254,0.15);',
      '  box-shadow: -4px 0 24px rgba(0,0,0,0.4);',
      '  display: flex; flex-direction: column; overflow-y: auto;',
      '}',
      '.sidebar-header {',
      '  padding: 14px 14px 10px; border-bottom: 1px solid rgba(255,255,255,0.08);',
      '  display: flex; align-items: center; justify-content: space-between;',
      '}',
      '.sidebar-header h2 {',
      '  margin: 0; font-size: 14px; font-weight: 700; color: #e2e8f0;',
      '  background: linear-gradient(135deg, #4facfe, #00f2fe);',
      '  -webkit-background-clip: text; -webkit-text-fill-color: transparent;',
      '}',
      '.sidebar-close {',
      '  background: none; border: none; color: #64748b; font-size: 16px;',
      '  cursor: pointer; padding: 4px 8px; border-radius: 6px;',
      '}',
      '.sidebar-close:hover { background: rgba(255,255,255,0.08); color: #94a3b8; }',
      '.sidebar-content { padding: 12px; flex: 1; }',
      '',
      '.setting-card {',
      '  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06);',
      '  border-radius: 10px; padding: 12px; margin-bottom: 10px;',
      '}',
      '.setting-row {',
      '  display: flex; justify-content: space-between; align-items: center;',
      '}',
      '.setting-label { font-size: 13px; font-weight: 600; color: #e2e8f0; }',
      '.setting-desc { font-size: 11px; color: #64748b; margin-top: 2px; }',
      '',
      '.toggle-switch { position: relative; width: 40px; height: 22px; display: inline-block; }',
      '.toggle-switch input { opacity: 0; width: 0; height: 0; }',
      '.toggle-slider {',
      '  position: absolute; inset: 0; background: #334155;',
      '  border-radius: 22px; cursor: pointer; transition: 0.3s;',
      '}',
      '.toggle-slider:before {',
      '  content: ""; position: absolute; width: 16px; height: 16px;',
      '  left: 3px; bottom: 3px; background: #fff;',
      '  border-radius: 50%; transition: 0.3s;',
      '}',
      '.toggle-switch input:checked + .toggle-slider { background: #3b82f6; }',
      '.toggle-switch input:checked + .toggle-slider:before { transform: translateX(18px); }',
      '',
      '.status-box {',
      '  margin-top: 8px; padding: 8px; background: rgba(0,0,0,0.2);',
      '  border-radius: 6px; font-size: 11px; color: #94a3b8; min-height: 20px;',
      '}',
      '.sidebar-footer {',
      '  padding: 10px 14px; border-top: 1px solid rgba(255,255,255,0.06);',
      '  text-align: center; font-size: 11px; color: #475569;',
      '}',
      '',
      '/* 投薬料ハイライト */',
      '.orca-highlight-touyaku {',
      '  border: 3px solid #ef4444 !important;',
      '  box-shadow: 0 0 8px rgba(239,68,68,0.5) !important;',
      '}'
    ].join('\n');
    document.head.appendChild(style);
  }

  // ========================================
  // フローティングボタン
  // ========================================
  function createFloatButton() {
    var btn = document.createElement('button');
    btn.id = 'orca-helper-float-btn';
    btn.title = 'ORCA Helper';
    btn.textContent = '⚕';
    document.body.appendChild(btn);
    return btn;
  }

  // ========================================
  // サイドバー
  // ========================================
  function createSidebar() {
    var sidebar = document.createElement('div');
    sidebar.id = 'orca-helper-sidebar';
    sidebar.innerHTML = [
      '<div class="sidebar-inner">',
      '  <div class="sidebar-header">',
      '    <h2>ORCA Helper</h2>',
      '    <button class="sidebar-close" id="orca-sidebar-close" title="閉じる">✕</button>',
      '  </div>',
      '  <div class="sidebar-content">',
      '    <div class="setting-card">',
      '      <div class="setting-row">',
      '        <div>',
      '          <div class="setting-label">処方箋料削除</div>',
      '          <div class="setting-desc">.820 処方箋料を自動で削除対象に</div>',
      '        </div>',
      '        <label class="toggle-switch">',
      '          <input type="checkbox" id="orca-del-toggle">',
      '          <span class="toggle-slider"></span>',
      '        </label>',
      '      </div>',
      '      <div class="status-box" id="orca-del-status">待機中</div>',
      '    </div>',
      '  </div>',
      '  <div class="sidebar-footer">',
      '    <span>ORCA Helper v3.0.0</span>',
      '  </div>',
      '</div>'
    ].join('\n');
    document.body.appendChild(sidebar);
    return sidebar;
  }

  // ========================================
  // 開閉制御（メインコンテンツを押し出す）
  // ========================================
  var sidebar, floatBtn;

  function openSidebar() {
    sidebar.classList.add('open');
    floatBtn.classList.add('hidden');
    document.body.style.marginRight = SIDEBAR_WIDTH + 'px';
    var obj = {};
    obj[SIDEBAR_OPEN_KEY] = true;
    chrome.storage.local.set(obj);
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    floatBtn.classList.remove('hidden');
    document.body.style.marginRight = '';
    var obj = {};
    obj[SIDEBAR_OPEN_KEY] = false;
    chrome.storage.local.set(obj);
  }

  // ========================================
  // .820 処方箋料の行番号を検出
  // ========================================
  function find820RowNumbers() {
    var rows = [];
    var allCells = document.querySelectorAll('td, span, div');
    for (var i = 0; i < allCells.length; i++) {
      var el = allCells[i];
      var text = el.textContent || '';
      if (text.indexOf('.820') !== -1 && text.indexOf('処方箋料') !== -1) {
        var row = el.closest('tr');
        if (row) {
          var firstCell = row.querySelector('td');
          if (firstCell) {
            var num = parseInt(firstCell.textContent.trim(), 10);
            if (!isNaN(num) && rows.indexOf(num) === -1) {
              rows.push(num);
            }
          }
        }
      }
    }

    // フォールバック: テキスト全体から検索
    if (rows.length === 0) {
      var bodyText = document.body.innerText || '';
      var lines = bodyText.split('\n');
      for (var j = 0; j < lines.length; j++) {
        var line = lines[j];
        if (line.indexOf('.820') !== -1 && line.indexOf('処方箋料') !== -1) {
          var match = line.match(/^\s*(\d+)/);
          if (match) {
            var rowNum = parseInt(match[1], 10);
            if (!isNaN(rowNum) && rows.indexOf(rowNum) === -1) {
              rows.push(rowNum);
            }
          }
        }
      }
    }

    return rows;
  }

  // ========================================
  // 投薬料フィールドをハイライト
  // ========================================
  function highlightTouyaku() {
    // 「投薬料」ラベルの隣のinputを探す
    var allLabels = document.querySelectorAll('td, th, label, span, div');
    for (var i = 0; i < allLabels.length; i++) {
      var text = allLabels[i].textContent.trim();
      if (text === '投薬料') {
        // 隣接する input を探す
        var parent = allLabels[i].parentElement;
        if (parent) {
          var input = parent.querySelector('input');
          if (!input) {
            var next = allLabels[i].nextElementSibling;
            if (next) input = next.tagName === 'INPUT' ? next : next.querySelector('input');
          }
          if (!input) {
            // テーブル行の次のセル
            var tr = allLabels[i].closest('tr');
            if (tr) {
              var cells = tr.querySelectorAll('td, th');
              for (var c = 0; c < cells.length; c++) {
                if (cells[c].textContent.trim() === '投薬料' && cells[c + 1]) {
                  input = cells[c + 1].querySelector('input');
                  break;
                }
              }
            }
          }
          if (input) {
            input.classList.add('orca-highlight-touyaku');
            return;
          }
        }
      }
    }
  }

  // ========================================
  // 削除剤番号フィールドに番号を入力（1回だけ）
  // ========================================
  function fillDeleteFields(rowNumbers) {
    var status = document.getElementById('orca-del-status');
    if (rowNumbers.length === 0) {
      if (status) status.textContent = '.820 処方箋料 なし';
      return;
    }

    // 最初のフィールドにだけ入力（1回だけ）
    var fieldId = 'K08.fixed1.SELNUM01';
    var field = document.getElementById(fieldId);
    if (!field) {
      var fields = document.querySelectorAll('[name="' + fieldId + '"], [id="' + fieldId + '"]');
      if (fields.length > 0) field = fields[0];
    }

    if (field) {
      field.focus();
      field.value = String(rowNumbers[0]);
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
      // Enter キーを1回だけ発火
      field.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true
      }));
      // focus を元に戻さない（他のフィールドに移動しない）
      hasRun = true;

      // 投薬料フィールドをハイライト
      highlightTouyaku();

      if (status) {
        status.textContent = '✅ 行 ' + rowNumbers[0] + ' を削除対象に設定';
      }
    } else {
      if (status) status.textContent = '⚠ フィールドが見つかりません';
    }
  }

  // ========================================
  // メイン処理
  // ========================================
  function runAutoDelete() {
    if (!isEnabled || hasRun) return;
    var rows = find820RowNumbers();
    fillDeleteFields(rows);
  }

  function startObserver() {
    var observer = new MutationObserver(function () {
      if (!isEnabled || hasRun) return;
      if (document.body.innerText.indexOf('削除剤番号') !== -1) {
        clearTimeout(startObserver._timer);
        startObserver._timer = setTimeout(runAutoDelete, 500);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  // ========================================
  // 初期化
  // ========================================
  function init() {
    injectStyles();
    floatBtn = createFloatButton();
    sidebar = createSidebar();

    floatBtn.addEventListener('click', openSidebar);
    document.getElementById('orca-sidebar-close').addEventListener('click', closeSidebar);

    var toggle = document.getElementById('orca-del-toggle');

    chrome.storage.local.get([STORAGE_KEY, SIDEBAR_OPEN_KEY], function (result) {
      isEnabled = result[STORAGE_KEY] || false;
      toggle.checked = isEnabled;
      document.getElementById('orca-del-status').textContent = isEnabled ? '監視中...' : '待機中';

      if (result[SIDEBAR_OPEN_KEY]) {
        openSidebar();
      }

      if (isEnabled) runAutoDelete();
    });

    toggle.addEventListener('change', function () {
      isEnabled = toggle.checked;
      hasRun = false; // トグル変更で再実行可能に
      var obj = {};
      obj[STORAGE_KEY] = isEnabled;
      chrome.storage.local.set(obj);

      var status = document.getElementById('orca-del-status');
      if (isEnabled) {
        status.textContent = '監視中...';
        runAutoDelete();
      } else {
        status.textContent = '待機中';
      }
    });

    startObserver();
    if (isEnabled) setTimeout(runAutoDelete, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
