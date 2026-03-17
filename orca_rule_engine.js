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
      })(rules[i]);
    }
  }

  /** ルールが有効かどうか判定 (customUI 対応) */
  function isRuleActive(rule) {
    if (rule.customUI && rule.isActive) return rule.isActive();
    return ruleStates[rule.id] || false;
  }

  /** MutationObserver で画面遷移検知 & ルール自動実行 */
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
          if (rules[i].triggerScreen === currentScreenId && isRuleActive(rules[i])) {
            if (rules[i].onScreenEnter) rules[i].onScreenEnter();
          }
        }
      }

      // ルール実行チェック
      for (var j = 0; j < rules.length; j++) {
        (function (rule) {
          if (!isRuleActive(rule)) return;
          if (rule.triggerCondition && document.body.innerText.indexOf(rule.triggerCondition) === -1) return;
          clearTimeout(timers[rule.id]);
          timers[rule.id] = setTimeout(function () {
            rule.execute();
          }, 500);
        })(rules[j]);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true });
  }

  // 公開API
  window.OrcaRuleEngine = {
    loadStates: loadRuleStates,
    bindToggles: bindRuleToggles,
    startObserver: startObserver,
    getStates: function () { return ruleStates; }
  };
})();
