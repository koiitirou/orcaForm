/**
 * ORCA Order Convert Helper - Content Script
 *
 * Content scriptはisolated worldで動作するため、
 * ページのKnockout.jsにアクセスするには<script>タグを
 * ページに注入する必要がある。
 */

(function () {
  'use strict';

  /**
   * ページコンテキストにスクリプトを注入して実行する
   */
  function injectAndExecute() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const firstDay = `${year}-${month}-01`;

    const script = document.createElement('script');
    script.textContent = `
      (function() {
        var maxRetries = 20;
        var retries = 0;
        var interval = 500;

        function applyAutoDate() {
          var checkbox = document.querySelector('input[data-bind*="is_allow_enddate"]');
          var startDateInput = document.querySelector('input[data-bind*="value: start_date"]');

          if (!checkbox || !startDateInput) {
            return false;
          }

          if (typeof ko === 'undefined' || typeof ko.dataFor !== 'function') {
            return false;
          }

          var vm = ko.dataFor(checkbox);
          if (!vm || typeof vm.is_allow_enddate !== 'function') {
            return false;
          }

          // 1. 期間指定を有効化
          vm.is_allow_enddate(true);

          // 2. 開始日を当月1日に設定
          if (typeof vm.start_date === 'function') {
            vm.start_date('${firstDay}');
          }

          // 3. bootstrap-datepickerのUIも同期
          if (typeof $ !== 'undefined' && $.fn && $.fn.datepicker) {
            $(startDateInput).datepicker('update', '${firstDay}');
          }

          console.log('[ORCA Helper] 自動設定完了: 期間指定=ON, 開始日=${firstDay}');
          return true;
        }

        function attempt() {
          if (applyAutoDate()) return;
          retries++;
          if (retries < maxRetries) {
            setTimeout(attempt, interval);
          } else {
            console.warn('[ORCA Helper] 最大リトライ回数に達しました。');
          }
        }

        // 初期化Ajax完了を待つために少し遅延してから開始
        setTimeout(attempt, 800);
      })();
    `;
    document.documentElement.appendChild(script);
    script.remove();
  }

  /**
   * 初期化: ストレージの状態を確認
   */
  function init() {
    chrome.storage.local.get(['autoDateEnabled'], (result) => {
      if (result.autoDateEnabled) {
        injectAndExecute();
      }
    });
  }

  // ポップアップからのメッセージを受信
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'toggleAutoDate' && message.enabled) {
      injectAndExecute();
    }
  });

  // ページ読み込み時に実行
  init();
})();
