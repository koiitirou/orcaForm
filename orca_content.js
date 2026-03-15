/**
 * ORCA Helper - WebORCA Content Script (コア)
 *
 * - サイドバーUI / テーマ管理
 * - OrcaRules レジストリのルールを自動的にUI化・監視
 *
 * ※ ルール固有ロジックは orca_rules/*.js に分離。
 *   新ルール追加時はファイルを追加して OrcaRules.push() するだけ。
 */
(function () {
  'use strict';

  var SIDEBAR_OPEN_KEY = 'orcaSidebarOpen';
  var THEME_KEY = 'themeDarkEnabled';
  var SIDEBAR_WIDTH = 280;

  // ========================================
  // スタイル注入
  // ========================================
  function buildCoreCSS() {
    var lines = [
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
      '',
      'body.orca-helper-active #client-container { width: calc(100vw - ' + SIDEBAR_WIDTH + 'px) !important; overflow: hidden !important; }',
      '',
      '#orca-helper-float-btn {',
      '  position: fixed; top: 16px; right: 16px; width: 44px; height: 44px;',
      '  z-index: 99998; background: var(--orca-bg-grad);',
      '  border: 1px solid var(--orca-float-border); border-radius: 50%;',
      '  color: var(--orca-accent); font-size: 20px; cursor: pointer;',
      '  display: flex; align-items: center; justify-content: center;',
      '  box-shadow: 0 4px 12px var(--orca-float-shadow); transition: transform 0.25s, box-shadow 0.25s;',
      '}',
      '#orca-helper-float-btn:hover { transform: scale(1.1); box-shadow: 0 6px 16px var(--orca-accent-hover); }',
      '#orca-helper-float-btn.hidden { opacity: 0; pointer-events: none; }',
      '',
      '#orca-helper-sidebar {',
      '  display: none; width: ' + SIDEBAR_WIDTH + 'px; position: fixed;',
      '  top: 30px; right: 0; height: calc(100vh - 30px);',
      '  z-index: 99999; font-family: "Segoe UI", "Meiryo", "ヒラギノ角ゴ ProN W3", sans-serif;',
      '  background: var(--orca-sidebar-bg);',
      '  border-left: 1px solid var(--orca-border); box-shadow: -4px 0 24px var(--orca-sidebar-shadow);',
      '  flex-direction: column;',
      '}',
      '#orca-helper-sidebar.open { display: flex; }',
      '',
      '.sidebar-header {',
      '  padding: 12px 16px; border-bottom: 1px solid var(--orca-border);',
      '  display: flex; flex-direction: column; align-items: center; position: relative;',
      '  box-sizing: border-box; background: var(--orca-header-bg);',
      '}',
      '.sidebar-header h2 { margin: 0; font-size: 15px; font-weight: bold; color: var(--orca-text-main); }',
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
      '.sidebar-content { padding: 16px; flex: 1; box-sizing: border-box; background: var(--orca-sidebar-bg); overflow-y: auto; }',
      '',
      '.setting-card { background: var(--orca-card-bg); border: 1px solid var(--orca-card-border); border-radius: 12px; padding: 18px; box-shadow: 0 2px 8px var(--orca-card-shadow); margin-bottom: 12px; }',
      '.setting-row { display: flex; justify-content: space-between; align-items: center; }',
      '.setting-label { font-size: 14px; font-weight: 600; color: var(--orca-text-main); }',
      '.setting-desc { font-size: 12px; color: var(--orca-text-sub); margin-top: 6px; line-height: 1.4; }',
      '',
      '.toggle-switch { position: relative; width: 44px; height: 24px; display: inline-block; flex-shrink: 0; }',
      '.toggle-switch input { opacity: 0; width: 0; height: 0; }',
      '.toggle-slider { position: absolute; inset: 0; background: var(--orca-toggle-bg); border-radius: 24px; cursor: pointer; transition: 0.3s; }',
      '.toggle-slider:before { content: ""; position: absolute; width: 18px; height: 18px; left: 3px; bottom: 3px; background: var(--orca-toggle-knob); border-radius: 50%; transition: 0.3s; box-shadow: 0 1px 3px var(--orca-toggle-knob-shadow); }',
      '.toggle-switch input:checked + .toggle-slider { background: var(--orca-accent); }',
      '.toggle-switch input:checked + .toggle-slider:before { transform: translateX(20px); }',
      '',
      '.status-box { margin-top: 16px; padding: 12px; background: var(--orca-status-bg); border-radius: 8px; font-size: 12px; color: var(--orca-text-sub); min-height: 20px; border: 1px solid var(--orca-border); text-align: center; }'
    ];
    return lines.join('\n');
  }

  function injectStyles() {
    var style = document.createElement('style');
    style.id = 'orca-helper-style';

    // コアCSS
    var css = buildCoreCSS();

    // 各ルール固有CSSを追記
    var rules = window.OrcaRules || [];
    for (var i = 0; i < rules.length; i++) {
      if (rules[i].css) {
        css += '\n' + rules[i].css;
      }
    }

    style.textContent = css;
    document.head.appendChild(style);
  }

  // ========================================
  // UI生成
  // ========================================
  var sidebar, floatBtn;

  /** ルールカードのHTMLを生成 */
  function buildRuleCardsHTML() {
    var rules = window.OrcaRules || [];
    var html = '';
    for (var i = 0; i < rules.length; i++) {
      var r = rules[i];
      html += [
        '<div class="setting-card">',
        '  <div class="setting-row">',
        '    <div>',
        '      <div class="setting-label">' + r.name + '</div>',
        '      <div class="setting-desc">' + r.description + '</div>',
        '    </div>',
        '    <label class="toggle-switch">',
        '      <input type="checkbox" id="orca-rule-toggle-' + r.id + '">',
        '      <span class="toggle-slider"></span>',
        '    </label>',
        '  </div>',
        '  <div class="status-box" id="orca-rule-status-' + r.id + '">待機中</div>',
        '</div>'
      ].join('\n');
    }
    return html;
  }

  function createUI() {
    floatBtn = document.createElement('button');
    floatBtn.id = 'orca-helper-float-btn';
    floatBtn.title = 'ORCA Helper を開く';
    floatBtn.innerHTML = '⚕';
    document.body.appendChild(floatBtn);

    sidebar = document.createElement('div');
    sidebar.id = 'orca-helper-sidebar';
    sidebar.innerHTML = [
      '<div class="sidebar-header">',
      '  <h2>ORCA Helper</h2>',
      '  <button class="sidebar-close" id="orca-sidebar-close" title="閉じる">✕</button>',
      '</div>',
      '<div class="sidebar-content">',
      '  <div class="setting-card">',
      '    <div class="setting-row">',
      '      <div>',
      '        <div class="setting-label">テーマ設定</div>',
      '        <div class="setting-desc">ダークモードを使用する</div>',
      '      </div>',
      '      <label class="toggle-switch">',
      '        <input type="checkbox" id="orca-theme-toggle">',
      '        <span class="toggle-slider"></span>',
      '      </label>',
      '    </div>',
      '  </div>',
      buildRuleCardsHTML(),
      '</div>'
    ].join('\n');
    document.body.appendChild(sidebar);

    floatBtn.addEventListener('click', openSidebar);
    document.getElementById('orca-sidebar-close').addEventListener('click', closeSidebar);
  }

  // ========================================
  // 開閉制御
  // ========================================
  function openSidebar() {
    if (sidebar) sidebar.classList.add('open');
    if (floatBtn) floatBtn.classList.add('hidden');
    document.body.classList.add('orca-helper-active');
    setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 50);
    var obj = {};
    obj[SIDEBAR_OPEN_KEY] = true;
    chrome.storage.local.set(obj);
  }

  function closeSidebar() {
    if (sidebar) sidebar.classList.remove('open');
    if (floatBtn) floatBtn.classList.remove('hidden');
    document.body.classList.remove('orca-helper-active');
    setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 50);
    var obj = {};
    obj[SIDEBAR_OPEN_KEY] = false;
    chrome.storage.local.set(obj);
  }

  // ========================================
  // ルール状態管理
  // ========================================
  var ruleStates = {}; // { ruleId: boolean }

  function loadRuleStates(callback) {
    var rules = window.OrcaRules || [];
    var keys = [];
    for (var i = 0; i < rules.length; i++) {
      keys.push(rules[i].storageKey);
    }
    chrome.storage.local.get(keys, function (result) {
      for (var i = 0; i < rules.length; i++) {
        ruleStates[rules[i].id] = result[rules[i].storageKey] || false;
      }
      if (callback) callback();
    });
  }

  /** 各ルールのトグルにイベントをバインド */
  function bindRuleToggles() {
    var rules = window.OrcaRules || [];
    for (var i = 0; i < rules.length; i++) {
      (function (rule) {
        var toggle = document.getElementById('orca-rule-toggle-' + rule.id);
        if (!toggle) return;

        toggle.checked = ruleStates[rule.id] || false;

        // ステータス初期表示
        var statusEl = document.getElementById('orca-rule-status-' + rule.id);
        if (statusEl) statusEl.textContent = toggle.checked ? '監視中...' : '待機中';

        toggle.addEventListener('change', function () {
          ruleStates[rule.id] = toggle.checked;
          var obj = {};
          obj[rule.storageKey] = toggle.checked;
          chrome.storage.local.set(obj);

          if (rule.onToggle) rule.onToggle(toggle.checked);
        });
      })(rules[i]);
    }
  }

  // ========================================
  // 画面遷移監視 & ルール実行オブザーバー
  // ========================================
  function startObserver() {
    var lastScreenId = '';
    var rules = window.OrcaRules || [];
    var timers = {};

    var observer = new MutationObserver(function () {
      var currentScreenId = window.OrcaHelpers.getScreenId();

      // 画面遷移検知
      if (currentScreenId && currentScreenId !== lastScreenId) {
        lastScreenId = currentScreenId;
        for (var i = 0; i < rules.length; i++) {
          if (rules[i].triggerScreen === currentScreenId && ruleStates[rules[i].id]) {
            if (rules[i].onScreenEnter) rules[i].onScreenEnter();
          }
        }
      }

      // ルール実行チェック
      for (var j = 0; j < rules.length; j++) {
        (function (rule) {
          if (!ruleStates[rule.id]) return;
          if (rule.triggerCondition && document.body.innerText.indexOf(rule.triggerCondition) === -1) return;

          clearTimeout(timers[rule.id]);
          timers[rule.id] = setTimeout(function () {
            rule.execute();
          }, 500);
        })(rules[j]);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  // ========================================
  // SPA対策: 定期的なDOM生存チェック
  // ========================================
  function ensureInjection() {
    if (!document.getElementById('orca-helper-style')) {
      injectStyles();
    }

    if (!document.getElementById('orca-helper-sidebar') || !document.getElementById('orca-helper-float-btn')) {
      var oldBtn = document.getElementById('orca-helper-float-btn');
      var oldSidebar = document.getElementById('orca-helper-sidebar');
      if (oldBtn) oldBtn.remove();
      if (oldSidebar) oldSidebar.remove();

      createUI();
      bindRuleToggles();

      chrome.storage.local.get([SIDEBAR_OPEN_KEY], function (result) {
        if (result[SIDEBAR_OPEN_KEY]) {
          openSidebar();
        } else {
          closeSidebar();
        }
      });
    }

    // sidebar open状態の復帰
    chrome.storage.local.get([SIDEBAR_OPEN_KEY], function (result) {
      var shouldBeOpen = result[SIDEBAR_OPEN_KEY];
      var isActive = document.body.classList.contains('orca-helper-active');
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
  function init() {
    injectStyles();
    createUI();

    var themeToggle = document.getElementById('orca-theme-toggle');

    // テーマ & ルール状態読み込み
    chrome.storage.local.get([SIDEBAR_OPEN_KEY, THEME_KEY], function (result) {
      // テーマ適用
      var isDark = result[THEME_KEY] || false;
      if (themeToggle) themeToggle.checked = isDark;
      if (isDark) {
        document.documentElement.classList.add('orca-theme-dark');
      } else {
        document.documentElement.classList.remove('orca-theme-dark');
      }

      // サイドバー開閉
      if (result[SIDEBAR_OPEN_KEY]) {
        openSidebar();
      }
    });

    // ルール状態を読み込んでトグルにバインド
    loadRuleStates(function () {
      bindRuleToggles();

      // 初回ルール実行
      var rules = window.OrcaRules || [];
      for (var i = 0; i < rules.length; i++) {
        if (ruleStates[rules[i].id] && rules[i].execute) {
          rules[i].execute();
        }
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
    setInterval(ensureInjection, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
