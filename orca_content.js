/**
 * ORCA Helper - WebORCA Content Script
 *
 * WebORCA (orcamo.jp) の診療行為確認画面で
 * .820 処方箋料を自動検出し、削除剤番号に番号を自動入力する。
 * (押し出し式サイドバー版)
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'orcaDeleteShohousen';
  var SIDEBAR_OPEN_KEY = 'orcaSidebarOpen';
  var SIDEBAR_WIDTH = 280;
  var isEnabled = false;
  var hasRun = false; // 重複実行防止

  // ========================================
  // スタイル注入
  // ========================================
  function injectStyles() {
    var style = document.createElement('style');
    style.id = 'orca-helper-style';
    style.textContent = [
      ':root {',
      '  --orca-bg-grad: linear-gradient(135deg, #ffffff, #f8fbff);',
      '  --orca-float-border: rgba(126,184,218,0.3);',
      '  --orca-float-shadow: rgba(0,0,0,0.08);',
      '  --orca-accent: #7eb8da;',
      '  --orca-accent-hover: rgba(126,184,218,0.25);',
      '  --orca-sidebar-bg: #fdfdfd;',
      '  --orca-border: #e2e8f0;',
      '  --orca-sidebar-shadow: rgba(0,0,0,0.06);',
      '  --orca-header-bg: #fff;',
      '  --orca-text-main: #475569;',
      '  --orca-text-sub: #64748b;',
      '  --orca-close-color: #94a3b8;',
      '  --orca-close-hover-bg: #f8fafc;',
      '  --orca-close-hover-color: #64748b;',
      '  --orca-card-bg: #ffffff;',
      '  --orca-card-border: #e2e8f0;',
      '  --orca-card-shadow: rgba(0,0,0,0.02);',
      '  --orca-toggle-bg: #cbd5e1;',
      '  --orca-toggle-knob: #fff;',
      '  --orca-toggle-knob-shadow: rgba(0,0,0,0.1);',
      '  --orca-status-bg: #f8fafc;',
      '}',
      '.orca-theme-dark {',
      '  --orca-bg-grad: linear-gradient(135deg, #1a1a2e, #0f3460);',
      '  --orca-float-border: rgba(79,172,254,0.3);',
      '  --orca-float-shadow: rgba(0,0,0,0.4);',
      '  --orca-accent: #4facfe;',
      '  --orca-accent-hover: rgba(79,172,254,0.4);',
      '  --orca-sidebar-bg: linear-gradient(180deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%);',
      '  --orca-border: rgba(79,172,254,0.25);',
      '  --orca-sidebar-shadow: rgba(0,0,0,0.5);',
      '  --orca-header-bg: transparent;',
      '  --orca-text-main: #e2e8f0;',
      '  --orca-text-sub: #94a3b8;',
      '  --orca-close-color: #64748b;',
      '  --orca-close-hover-bg: rgba(255,255,255,0.1);',
      '  --orca-close-hover-color: #e2e8f0;',
      '  --orca-card-bg: rgba(255,255,255,0.04);',
      '  --orca-card-border: rgba(255,255,255,0.06);',
      '  --orca-card-shadow: transparent;',
      '  --orca-toggle-bg: #334155;',
      '  --orca-toggle-knob: #fff;',
      '  --orca-toggle-knob-shadow: transparent;',
      '  --orca-status-bg: rgba(0,0,0,0.25);',
      '}',
      
      '/* DevTools風分割スタイル (Flexboxではなく直接幅計算を採用) */',
      'body.orca-helper-active #client-container { width: calc(100vw - ' + SIDEBAR_WIDTH + 'px) !important; overflow: hidden !important; }',
      
      '/* Floatボタン */',
      '#orca-helper-float-btn {',
      '  position: fixed; top: 16px; right: 16px; width: 44px; height: 44px;',
      '  z-index: 99998; background: var(--orca-bg-grad);',
      '  border: 1px solid var(--orca-float-border); border-radius: 50%;',
      '  color: var(--orca-accent); font-size: 20px; cursor: pointer;',
      '  display: flex; align-items: center; justify-content: center;',
      '  box-shadow: 0 4px 12px var(--orca-float-shadow); transition: transform 0.25s, box-shadow 0.25s;',
      '}',
      '#orca-helper-float-btn:hover {',
      '  transform: scale(1.1); box-shadow: 0 6px 16px var(--orca-accent-hover);',
      '}',
      '#orca-helper-float-btn.hidden { opacity: 0; pointer-events: none; }',
      
      '/* サイドバーコンテナ */',
      '#orca-helper-sidebar {',
      '  display: none; width: ' + SIDEBAR_WIDTH + 'px; position: fixed;',
      '  top: 30px; right: 0; height: calc(100vh - 30px);',
      '  z-index: 99999; font-family: "Segoe UI", "Meiryo", "ヒラギノ角ゴ ProN W3", sans-serif;',
      '  background: var(--orca-sidebar-bg);',
      '  border-left: 1px solid var(--orca-border); box-shadow: -4px 0 24px var(--orca-sidebar-shadow);',
      '  flex-direction: column;',
      '}',
      '#orca-helper-sidebar.open { display: flex; }',
      
      '.sidebar-header {',
      '  padding: 12px 16px; border-bottom: 1px solid var(--orca-border);',
      '  display: flex; flex-direction: column; align-items: center; position: relative;',
      '  box-sizing: border-box; background: var(--orca-header-bg);',
      '}',
      '.sidebar-header h2 {',
      '  margin: 0; font-size: 15px; font-weight: bold; color: var(--orca-text-main);',
      '}',
      '.orca-theme-dark .sidebar-header h2 {',
      '  background: linear-gradient(135deg, #4facfe, #00f2fe);',
      '  -webkit-background-clip: text; -webkit-text-fill-color: transparent;',
      '}',
      '.sidebar-close {',
      '  background: none; border: none; color: var(--orca-close-color); font-size: 16px;',
      '  cursor: pointer; padding: 4px; border-radius: 6px; display: flex;',
      '  align-items: center; justify-content: center;',
      '  position: absolute; top: 10px; right: 12px;',
      '}',
      '.sidebar-close:hover { background: var(--orca-close-hover-bg); color: var(--orca-close-hover-color); }',
      '.sidebar-content { padding: 16px; flex: 1; box-sizing: border-box; background: var(--orca-sidebar-bg); }',
      
      '.setting-card { background: var(--orca-card-bg); border: 1px solid var(--orca-card-border); border-radius: 12px; padding: 18px; box-shadow: 0 2px 8px var(--orca-card-shadow); margin-bottom: 12px; }',
      '.setting-row { display: flex; justify-content: space-between; align-items: center; }',
      '.setting-label { font-size: 14px; font-weight: 600; color: var(--orca-text-main); }',
      '.setting-desc { font-size: 12px; color: var(--orca-text-sub); margin-top: 6px; line-height: 1.4; }',
      
      '.toggle-switch { position: relative; width: 44px; height: 24px; display: inline-block; flex-shrink: 0; }',
      '.toggle-switch input { opacity: 0; width: 0; height: 0; }',
      '.toggle-slider { position: absolute; inset: 0; background: var(--orca-toggle-bg); border-radius: 24px; cursor: pointer; transition: 0.3s; }',
      '.toggle-slider:before { content: ""; position: absolute; width: 18px; height: 18px; left: 3px; bottom: 3px; background: var(--orca-toggle-knob); border-radius: 50%; transition: 0.3s; box-shadow: 0 1px 3px var(--orca-toggle-knob-shadow); }',
      '.toggle-switch input:checked + .toggle-slider { background: var(--orca-accent); }',
      '.toggle-switch input:checked + .toggle-slider:before { transform: translateX(20px); }',
      
      '.status-box { margin-top: 16px; padding: 12px; background: var(--orca-status-bg); border-radius: 8px; font-size: 12px; color: var(--orca-text-sub); min-height: 20px; border: 1px solid var(--orca-border); text-align: center; }',
      
      '/* 投薬料ハイライト */',
      '.orca-highlight-touyaku { border: 3px solid #f97316 !important; background-color: #fff7ed !important; box-shadow: 0 0 8px rgba(249, 115, 22, 0.4) !important; }'
    ].join('\n');
    document.head.appendChild(style);
  }

  // ========================================
  // UI生成とイベント設定
  // ========================================
  var sidebar, floatBtn;

  function createUI() {
    floatBtn = document.createElement('button');
    floatBtn.id = 'orca-helper-float-btn';
    floatBtn.title = 'ORCA Helper を開く';
    floatBtn.innerHTML = '⚕';
    document.body.appendChild(floatBtn);

    sidebar = document.createElement('div');
    sidebar.id = 'orca-helper-sidebar';
    sidebar.innerHTML = [
      '  <div class="sidebar-header">',
      '    <h2>ORCA Helper</h2>',
      '    <button class="sidebar-close" id="orca-sidebar-close" title="閉じる">✕</button>',
      '  </div>',
      '  <div class="sidebar-content">',
      '    <div class="setting-card">',
      '      <div class="setting-row">',
      '        <div>',
      '          <div class="setting-label">テーマ設定</div>',
      '          <div class="setting-desc">ダークモードを使用する</div>',
      '        </div>',
      '        <label class="toggle-switch">',
      '          <input type="checkbox" id="orca-theme-toggle">',
      '          <span class="toggle-slider"></span>',
      '        </label>',
      '      </div>',
      '    </div>',
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
      '  </div>'
    ].join('\n');
    document.body.appendChild(sidebar);

    floatBtn.addEventListener('click', openSidebar);
    document.getElementById('orca-sidebar-close').addEventListener('click', closeSidebar);
  }

  // ========================================
  // 開閉制御（DOM構造を弄らず、CSS幅のみ調整）
  // ========================================
  
  function openSidebar() {
    if (sidebar) sidebar.classList.add('open');
    if (floatBtn) floatBtn.classList.add('hidden');
    document.body.classList.add('orca-helper-active');
    
    // WebORCAにリサイズイベントを発火させて自分自身を新しい幅に合わせさせる
    setTimeout(function() { window.dispatchEvent(new Event('resize')); }, 50);

    var obj = {};
    obj[SIDEBAR_OPEN_KEY] = true;
    chrome.storage.local.set(obj);
  }

  function closeSidebar() {
    if (sidebar) sidebar.classList.remove('open');
    if (floatBtn) floatBtn.classList.remove('hidden');
    document.body.classList.remove('orca-helper-active');
    
    // WebORCAにリサイズイベントを発火させる
    setTimeout(function() { window.dispatchEvent(new Event('resize')); }, 50);

    var obj = {};
    obj[SIDEBAR_OPEN_KEY] = false;
    chrome.storage.local.set(obj);
  }

  // ========================================
  // .820 処方箋料の行番号を検出
  // ========================================
  function find820RowNumbers() {
    var rows = [];
    
    // 表示中の画面(GtkWindow)のみを対象にする（非表示のK09等を除外）
    var visibleScreen = null;
    var allScreens = document.querySelectorAll('.gtk-window');
    for (var s = 0; s < allScreens.length; s++) {
      if (allScreens[s].style.display === 'block') {
        visibleScreen = allScreens[s];
      }
    }
    
    var searchRoot = visibleScreen || document;
    var allCells = searchRoot.querySelectorAll('td');
    
    for (var i = 0; i < allCells.length; i++) {
      var el = allCells[i];
      var text = el.textContent || '';
      if (text.indexOf('.820') !== -1 && text.indexOf('処方箋料') !== -1) {
        var row = el.closest('tr');
        if (row) {
          var tds = row.querySelectorAll('td');
          // 通常のテーブル構成: [0]=番号, [1]=◎や□などの記号, [2]=診療行為名
          if (tds.length >= 3) {
            var numCell = tds[0];
            var markCell = tds[1];
            
            // "◎" が「ない」場合は自動削除をスキップする (手入力分なので「自動算定分ではありません」エラーになる)
            if (markCell.textContent.indexOf('◎') === -1) {
              continue; // ◎がない行は無視
            }
            
            var num = parseInt(numCell.textContent.trim(), 10);
            if (!isNaN(num) && rows.indexOf(num) === -1) {
              rows.push(num);
            }
          } else if (tds.length > 0) {
            // 例外的な行構造のフォールバック
            var firstCell = tds[0];
            var num = parseInt(firstCell.textContent.trim(), 10);
            if (!isNaN(num) && rows.indexOf(num) === -1) {
              rows.push(num);
            }
          }
        }
      }
    }

    // フォールバック: テキスト全体から検索 (DOMでとれなかった場合のみ)
    if (rows.length === 0) {
      var bodyText = document.body.innerText || '';
      var lines = bodyText.split('\n');
      for (var j = 0; j < lines.length; j++) {
        var line = lines[j];
        if (line.indexOf('.820') !== -1 && line.indexOf('処方箋料') !== -1) {
          // もし行テキスト内に "◎" が含まれて「いなければ」スキップ
          if (line.indexOf('◎') === -1) {
            continue;
          }
          
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
    // 既存のハイライトをクリア
    var existing = document.querySelectorAll('.orca-highlight-touyaku');
    for (var j = 0; j < existing.length; j++) {
      existing[j].classList.remove('orca-highlight-touyaku');
    }

    // 指定されたID (当月点数累計 -> 投薬料 の入力枠) を直接探索
    var fieldId = 'K08.fixed1.TYKHKNTEN';
    var input = document.getElementById(fieldId);
    
    // もしIDで見つからなかった場合のフォールバック（name属性など）
    if (!input) {
      var fields = document.querySelectorAll('[name="' + fieldId + '"]');
      if (fields.length > 0) input = fields[0];
    }

    if (input) {
      input.classList.add('orca-highlight-touyaku');
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
    var lastScreenId = '';
    
    var observer = new MutationObserver(function () {
      // 画面遷移を検知: 表示中のGtkWindowが変わったらhasRunをリセット
      var currentScreenId = '';
      var allScreens = document.querySelectorAll('.gtk-window');
      for (var s = 0; s < allScreens.length; s++) {
        if (allScreens[s].style.display === 'block') {
          currentScreenId = allScreens[s].id || '';
        }
      }
      
      if (currentScreenId && currentScreenId !== lastScreenId) {
        lastScreenId = currentScreenId;
        // K08画面に遷移したらhasRunをリセットして再実行可能に
        if (currentScreenId === 'K08') {
          hasRun = false;
          var status = document.getElementById('orca-del-status');
          if (status && isEnabled) status.textContent = '監視中...';
        }
      }
      
      if (!isEnabled || hasRun) return;
      if (document.body.innerText.indexOf('削除剤番号') !== -1) {
        clearTimeout(startObserver._timer);
        startObserver._timer = setTimeout(runAutoDelete, 500);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  // ========================================
  // 定期的なDOM生存チェック (SPA対策)
  // ========================================
  function ensureInjection() {
    // 1. スタイルの生存確認
    if (!document.getElementById('orca-helper-style')) {
      injectStyles();
    }
    
    // 2. UIの生存確認 (SPAの画面遷移で body.innerHTML が書き換えられる対策)
    if (!document.getElementById('orca-helper-sidebar') || !document.getElementById('orca-helper-float-btn')) {
      // 古い参照が残っていれば削除
      var oldBtn = document.getElementById('orca-helper-float-btn');
      var oldSidebar = document.getElementById('orca-helper-sidebar');
      if (oldBtn) oldBtn.remove();
      if (oldSidebar) oldSidebar.remove();

      createUI();

      // UI再生成に伴い、イベントや状態を再バインドする
      var toggle = document.getElementById('orca-del-toggle');
      if (toggle) {
        toggle.checked = isEnabled;
        toggle.addEventListener('change', function () {
          isEnabled = toggle.checked;
          hasRun = false;
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
      }

      var status = document.getElementById('orca-del-status');
      if (status) {
         status.textContent = isEnabled ? '監視中...' : '待機中';
      }

      chrome.storage.local.get([SIDEBAR_OPEN_KEY], function (result) {
        if (result[SIDEBAR_OPEN_KEY]) {
          openSidebar();
        } else {
          closeSidebar();
        }
      });
    }

    // 3. bodyのflex状態が意図せず消された場合の復帰
    chrome.storage.local.get([SIDEBAR_OPEN_KEY], function (result) {
      var shouldBeOpen = result[SIDEBAR_OPEN_KEY];
      var isActive = document.body.classList.contains('orca-helper-active');
      
      // クラス状態だけでなく、sidebarのDOM自身がopenクラスを持っているかも確認
      var isSidebarOpen = sidebar && sidebar.classList.contains('open');
      
      if (shouldBeOpen && (!isActive || !isSidebarOpen)) {
        openSidebar();
      } else if (!shouldBeOpen && (isActive || isSidebarOpen)) {
        closeSidebar();
      }
    });
  }

  // ========================================
  // 初期化
  // ========================================
  var THEME_KEY = 'themeDarkEnabled';

  function init() {
    injectStyles();
    createUI();

    var toggle = document.getElementById('orca-del-toggle');
    var themeToggle = document.getElementById('orca-theme-toggle');

    // テーマとトグル設定を読み込む
    chrome.storage.local.get([STORAGE_KEY, SIDEBAR_OPEN_KEY, THEME_KEY], function (result) {
      isEnabled = result[STORAGE_KEY] || false;
      toggle.checked = isEnabled;
      document.getElementById('orca-del-status').textContent = isEnabled ? '監視中...' : '待機中';

      // テーマ適用
      var isDark = result[THEME_KEY] || false;
      if (themeToggle) themeToggle.checked = isDark;
      if (isDark) {
        document.documentElement.classList.add('orca-theme-dark');
      } else {
        document.documentElement.classList.remove('orca-theme-dark');
      }

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

    // テーマトグル
    if (themeToggle) {
      themeToggle.addEventListener('change', function () {
        var isDark = themeToggle.checked;
        var obj = {};
        obj[THEME_KEY] = isDark;
        chrome.storage.local.set(obj);
        if (isDark) {
          document.documentElement.classList.add('orca-theme-dark');
        } else {
          document.documentElement.classList.remove('orca-theme-dark');
        }
      });
    }

    startObserver();
    
    // SPA対策: 定期的にDOMをチェックして消えていたら再作成する
    setInterval(ensureInjection, 1000);

    if (isEnabled) setTimeout(runAutoDelete, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
