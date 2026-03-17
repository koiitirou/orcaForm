/**
 * ORCA Helper - テーマ管理
 *
 * ダークモードの切替・永続化。
 */
(function () {
  'use strict';

  var THEME_KEY = 'themeDarkEnabled';

  window.OrcaTheme = {
    THEME_KEY: THEME_KEY,

    /** テーマ状態を読み込んで適用 */
    apply: function () {
      var toggle = document.getElementById('orca-theme-toggle');
      chrome.storage.local.get([THEME_KEY], function (result) {
        var isDark = result[THEME_KEY] || false;
        if (toggle) toggle.checked = isDark;
        if (isDark) {
          document.documentElement.classList.add('orca-theme-dark');
        } else {
          document.documentElement.classList.remove('orca-theme-dark');
        }
      });
    },

    /** テーマトグルにイベントをバインド */
    bind: function () {
      var toggle = document.getElementById('orca-theme-toggle');
      if (!toggle) return;
      toggle.addEventListener('change', function () {
        var isDark = toggle.checked;
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
  };
})();
