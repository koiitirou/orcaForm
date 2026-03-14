/**
 * ORCA Order Convert Helper - Page Script (MAIN world)
 *
 * ページの ko オブジェクトに直接アクセスして、
 * content.js から受け取った指示に基づき操作を実行する。
 */

(function () {
  'use strict';

  function getFirstDayOfMonth() {
    var now = new Date();
    var year = now.getFullYear();
    var month = String(now.getMonth() + 1).padStart(2, '0');
    return year + '-' + month + '-01';
  }

  function getTodayStr() {
    var now = new Date();
    return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  }

  /**
   * KO VMを取得（リトライ付き）
   */
  function getVM(callback) {
    var maxRetries = 25;
    var retries = 0;
    var interval = 500;

    function attempt() {
      if (typeof ko === 'undefined' || typeof ko.dataFor !== 'function') {
        retries++;
        if (retries < maxRetries) { setTimeout(attempt, interval); }
        return;
      }
      var checkbox = document.querySelector('input[data-bind*="is_allow_enddate"]');
      if (!checkbox) {
        retries++;
        if (retries < maxRetries) { setTimeout(attempt, interval); }
        return;
      }
      var vm = ko.dataFor(checkbox);
      if (!vm || typeof vm.is_allow_enddate !== 'function') {
        retries++;
        if (retries < maxRetries) { setTimeout(attempt, interval); }
        return;
      }
      callback(vm);
    }

    setTimeout(attempt, 800);
  }

  /**
   * 日付をページのdatepickerとVMに反映する
   */
  function applyDates(vm, startDate, endDate) {
    vm.is_allow_enddate(true);

    if (typeof vm.start_date === 'function') {
      vm.start_date(startDate);
    }
    if (typeof vm.end_date === 'function') {
      vm.end_date(endDate);
    }

    // bootstrap-datepickerのUI同期
    if (typeof $ !== 'undefined' && $.fn && $.fn.datepicker) {
      var startInput = document.querySelector('input[data-bind*="value: start_date"]');
      var endInput = document.querySelector('input[data-bind*="value: end_date"]');
      if (startInput) $(startInput).datepicker('update', startDate);
      if (endInput) $(endInput).datepicker('update', endDate);
    }
  }

  /**
   * 初回ロード時のアクション実行
   */
  function executeActions(detail) {
    var actions = detail.actions || [];
    var autoSearch = detail.autoSearch || false;
    var startDate = detail.startDate || getFirstDayOfMonth();
    var endDate = detail.endDate || getTodayStr();

    getVM(function (vm) {
      var actionLog = [];

      // 1. 自動日付設定
      if (actions.indexOf('autoDate') !== -1) {
        applyDates(vm, startDate, endDate);
        actionLog.push('日付設定=' + startDate + '〜' + endDate);
      }

      // 2. ステータスを空白に変更
      if (actions.indexOf('statusBlank') !== -1) {
        if (typeof vm.selectedStatus === 'function' && typeof vm.lstStatus === 'function') {
          var lstStatus = vm.lstStatus();
          if (lstStatus && lstStatus.length > 0) {
            vm.selectedStatus(lstStatus[0]);
            actionLog.push('ステータス=空白');
          }
        }
      }

      // 3. 自動検索
      if (autoSearch) {
        setTimeout(function () {
          if (typeof vm.search === 'function') {
            vm.search();
            console.log('[ORCA Helper] 検索を自動実行しました');
          }
        }, 300);
      }

      if (actionLog.length > 0) {
        console.log('[ORCA Helper] 自動設定完了: ' + actionLog.join(', '));
      }
    });
  }

  /**
   * サイドバーの「適用」ボタンから日付変更
   */
  function handleDateUpdate(detail) {
    var startDate = detail.startDate;
    var endDate = detail.endDate;
    var autoSearch = detail.autoSearch || false;

    getVM(function (vm) {
      applyDates(vm, startDate, endDate);
      console.log('[ORCA Helper] 日付更新: ' + startDate + '〜' + endDate);

      if (autoSearch) {
        setTimeout(function () {
          if (typeof vm.search === 'function') {
            vm.search();
            console.log('[ORCA Helper] 検索を自動実行しました');
          }
        }, 300);
      }
    });
  }

  // content.js からの初回適用指示
  document.addEventListener('orca-helper-apply', function (e) {
    executeActions(e.detail || {});
  });

  // content.js からの日付更新指示（適用ボタン）
  document.addEventListener('orca-helper-set-dates', function (e) {
    handleDateUpdate(e.detail || {});
  });
})();
