/**
 * ORCA Helper - WebORCA エントリーポイント
 *
 * 各モジュールを初期化し、SPA対策の定期チェックを行う。
 *
 * 読み込み順:
 *   orca_helpers.js → orca_rules/*.js → orca_css.js →
 *   orca_sidebar.js → orca_theme.js → orca_rule_engine.js → orca_content.js
 */
(function () {
  'use strict';

  var SIDEBAR_OPEN_KEY = window.OrcaSidebar.SIDEBAR_OPEN_KEY;

  // ========================================
  // SPA対策: 定期的なDOM生存チェック
  // ========================================
  function ensureInjection() {
    if (!document.getElementById('orca-helper-style')) {
      window.OrcaCSS.injectStyles();
    }

    if (!document.getElementById('orca-helper-sidebar') || !document.getElementById('orca-helper-float-btn')) {
      var oldBtn = document.getElementById('orca-helper-float-btn');
      var oldSidebar = document.getElementById('orca-helper-sidebar');
      if (oldBtn) oldBtn.remove();
      if (oldSidebar) oldSidebar.remove();

      window.OrcaSidebar.create();
      window.OrcaSidebar.buildCustomUIs();
      window.OrcaRuleEngine.bindToggles();

      chrome.storage.local.get([SIDEBAR_OPEN_KEY], function (result) {
        if (result[SIDEBAR_OPEN_KEY]) {
          window.OrcaSidebar.open();
        } else {
          window.OrcaSidebar.close();
        }
      });
    }

    // sidebar open 状態の復帰
    chrome.storage.local.get([SIDEBAR_OPEN_KEY], function (result) {
      var shouldBeOpen = result[SIDEBAR_OPEN_KEY];
      var isActive = document.body.classList.contains('orca-helper-active');
      var sidebar = window.OrcaSidebar.getSidebar();
      var isSidebarOpen = sidebar && sidebar.classList.contains('open');

      if (shouldBeOpen && (!isActive || !isSidebarOpen)) {
        window.OrcaSidebar.open();
      } else if (!shouldBeOpen && (isActive || isSidebarOpen)) {
        window.OrcaSidebar.close();
      }
    });
  }

  // ========================================
  // 初期化
  // ========================================
  function init() {
    window.OrcaCSS.injectStyles();
    window.OrcaSidebar.create();
    window.OrcaSidebar.buildCustomUIs();

    // テーマ
    window.OrcaTheme.apply();
    window.OrcaTheme.bind();

    // サイドバー開閉復帰
    chrome.storage.local.get([SIDEBAR_OPEN_KEY], function (result) {
      if (result[SIDEBAR_OPEN_KEY]) {
        window.OrcaSidebar.open();
      }
    });

    // ルール状態を読み込んでトグルにバインド
    window.OrcaRuleEngine.loadStates(function () {
      window.OrcaRuleEngine.bindToggles();

      // 初回ルール実行
      var rules = window.OrcaRules || [];
      var states = window.OrcaRuleEngine.getStates();
      for (var i = 0; i < rules.length; i++) {
        if (states[rules[i].id] && rules[i].execute) {
          rules[i].execute();
        }
      }
    });

    window.OrcaRuleEngine.startObserver();
    setInterval(ensureInjection, 1000);

    // ========================================
    // クリップボードからの自動入力連携（orderconvert → WebORCA）
    // ========================================
    chrome.storage.onChanged.addListener(function (changes, namespace) {
      if (namespace === 'local' && changes['orca-helper-copied-id']) {
        var newId = changes['orca-helper-copied-id'].newValue;
        if (newId) {
          // K02画面などの患者ID入力欄を探す
          var ptnumInput = document.getElementById('K02.fixed2.PTNUM') || document.querySelector('input[id$=".PTNUM"]');
          if (ptnumInput) {
             ptnumInput.focus();
             ptnumInput.value = newId;

             // React/Angular等のフレームワークにも値変更を認識させるためのイベント
             ptnumInput.dispatchEvent(new Event('input', { bubbles: true }));
             ptnumInput.dispatchEvent(new Event('change', { bubbles: true }));

             // Enterキーのイベントを発火して検索を実行する
             ptnumInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, code: 'Enter', which: 13, bubbles: true }));
             ptnumInput.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', keyCode: 13, code: 'Enter', which: 13, bubbles: true }));
             ptnumInput.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', keyCode: 13, code: 'Enter', which: 13, bubbles: true }));
          }
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
