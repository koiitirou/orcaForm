/**
 * ORCA Helper - 共有ヘルパー
 *
 * ルール間で共有するユーティリティ関数群。
 * manifest.json で最初にロードされる。
 */
(function () {
  'use strict';

  window.OrcaHelpers = {
    /**
     * 表示中の GtkWindow 要素を返す（display: block のもの）
     * @returns {Element|null}
     */
    getVisibleScreen: function () {
      var screens = document.querySelectorAll('.gtk-window');
      var visible = null;
      for (var i = 0; i < screens.length; i++) {
        if (screens[i].style.display === 'block') {
          visible = screens[i];
        }
      }
      return visible;
    },

    /**
     * 表示中の画面ID（例: 'K08', 'K02'）を返す
     * @returns {string}
     */
    getScreenId: function () {
      var screen = this.getVisibleScreen();
      return screen ? (screen.id || '') : '';
    }
  };

  /**
   * ルールレジストリ
   * 各ルールファイルが push して登録する。
   */
  window.OrcaRules = window.OrcaRules || [];
})();
