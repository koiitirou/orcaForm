/**
 * ORCA Helper - ルールエンジン
 *
 * ルール状態管理、トグルバインド、MutationObserver による
 * 画面遷移検知とルール自動実行。
 */
(function () {
  'use strict';

  var ruleStates = {};

  /** ルールの有効/無効状態を chrome.storage から読み込み */
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
        toggle.addEventListener('change', function () {
          ruleStates[rule.id] = toggle.checked;
          var obj = {};
          obj[rule.storageKey] = toggle.checked;
          chrome.storage.local.set(obj);
          if (rule.onToggle) rule.onToggle(toggle.checked);
        });

        // リフレッシュボタン
        var refreshBtn = document.getElementById('orca-refresh-' + rule.id);
        if (refreshBtn && rule.forceExecute) {
          refreshBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            rule.forceExecute();
          });
        }
      })(rules[i]);
    }
  }

  /** ルールが有効かどうか判定 (customUI 対応) */
  function isRuleActive(rule) {
    if (rule.customUI && rule.isActive) return rule.isActive();
    return ruleStates[rule.id] || false;
  }

  /** title-bar テキスト監視で画面遷移を検知 */
  function startObserver() {
    var lastScreenId = '';
    var rules = window.OrcaRules || [];

    function checkScreenTransition() {
      var titleBar = document.querySelector('.title-bar');
      if (!titleBar) return;

      var text = titleBar.textContent || '';
      var match = text.match(/\(([A-Z]\d+)\)/);
      var currentScreenId = match ? match[1] : '';

      if (currentScreenId && currentScreenId !== lastScreenId) {
        lastScreenId = currentScreenId;
        for (var i = 0; i < rules.length; i++) {
          if (rules[i].triggerScreen === currentScreenId && isRuleActive(rules[i])) {
            if (rules[i].onScreenEnter) rules[i].onScreenEnter();
          }
        }
      }
    }

    // title-bar 要素を取得してObserverを接続
    function connectTitleObserver() {
      var titleBar = document.querySelector('.title-bar');
      if (!titleBar) {
        // 要素がまだ無い場合は少し待ってリトライ
        setTimeout(connectTitleObserver, 500);
        return;
      }

      var observer = new MutationObserver(checkScreenTransition);
      observer.observe(titleBar, { childList: true, characterData: true, subtree: true });

      // 初回チェック
      checkScreenTransition();
    }

    connectTitleObserver();
  }

  // 公開API
  window.OrcaRuleEngine = {
    loadStates: loadRuleStates,
    bindToggles: bindRuleToggles,
    startObserver: startObserver,
    getStates: function () { return ruleStates; }
  };
})();
