/**
 * ORCA Order Convert Helper - Content Script (Isolated World)
 *
 * ページ内にフローティングボタンとサイドバーを注入。
 * サイドバー開閉時にページの全コンテンツをラッパーで囲んで幅を制御。
 */

(function () {
  'use strict';

  var STORAGE_KEYS = {
    autoDate: 'autoDateEnabled',
    statusBlank: 'statusBlankEnabled',
    autoSearch: 'autoSearchEnabled',
    sidebarOpen: 'sidebarOpen',
    savedStartDate: 'savedStartDate',
    savedEndDate: 'savedEndDate',
    injectCode: 'injectCodeEnabled'
  };

  var SIDEBAR_WIDTH = 280;

  // ========================================
  // 日付ヘルパー
  // ========================================
  function toDateStr(year, month, day) {
    return year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
  }

  function getLastDayOfMonth(year, month) {
    return new Date(year, month, 0).getDate();
  }

  function getMonthRange(offset) {
    var now = new Date();
    var year = now.getFullYear();
    var month = now.getMonth() + 1 + offset; // 1-indexed
    if (month < 1) { year--; month += 12; }
    if (month > 12) { year++; month -= 12; }
    var lastDay = getLastDayOfMonth(year, month);
    return {
      start: toDateStr(year, month, 1),
      end: toDateStr(year, month, lastDay)
    };
  }

  function getTodayStr() {
    var now = new Date();
    return toDateStr(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }

  function getFirstDayOfMonthStr() {
    var now = new Date();
    return toDateStr(now.getFullYear(), now.getMonth() + 1, 1);
  }

  // ========================================
  // ページの全コンテンツをラッパーで囲む
  // ========================================
  function wrapPageContent() {
    var wrapper = document.createElement('div');
    wrapper.id = 'orca-page-wrapper';
    wrapper.style.cssText = [
      'transition: margin-right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      'min-height: 100vh',
      'overflow-x: auto'
    ].join(';');

    while (document.body.firstChild) {
      wrapper.appendChild(document.body.firstChild);
    }
    document.body.appendChild(wrapper);
    return wrapper;
  }

  // ========================================
  // フローティング設定ボタン
  // ========================================
  function createFloatButton() {
    var btn = document.createElement('button');
    btn.id = 'orca-helper-float-btn';
    btn.title = 'ORCA Helper 設定';
    btn.textContent = '⚙';
    document.body.appendChild(btn);
    return btn;
  }

  // ========================================
  // サイドバーHTML注入
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
      '',
      '    <div class="setting-card" id="card-autoDate">',
      '      <div class="setting-row">',
      '        <div>',
      '          <div class="setting-label">自動日付設定</div>',
      '          <div class="setting-desc">期間指定ON・開始日を当月1日</div>',
      '        </div>',
      '        <label class="toggle-switch">',
      '          <input type="checkbox" id="orca-toggle-autoDate">',
      '          <span class="toggle-slider"></span>',
      '        </label>',
      '      </div>',
      '      <div class="date-section" id="date-section">',
      '        <div class="date-row">',
      '          <label class="date-label">開始</label>',
      '          <input type="date" class="date-input" id="orca-start-date">',
      '        </div>',
      '        <div class="date-row">',
      '          <label class="date-label">終了</label>',
      '          <input type="date" class="date-input" id="orca-end-date">',
      '        </div>',
      '        <div class="month-buttons">',
      '          <button class="month-btn" id="orca-prev-month">前月</button>',
      '          <button class="month-btn current" id="orca-cur-month">現在</button>',
      '          <button class="month-btn" id="orca-full-month">当月</button>',
      '          <button class="month-btn" id="orca-next-month">次月</button>',
      '        </div>',
      '        <button class="apply-btn" id="orca-apply-dates">適用</button>',
      '      </div>',
      '    </div>',
      '',
      '    <div class="setting-card" id="card-statusBlank">',
      '      <div class="setting-row">',
      '        <div>',
      '          <div class="setting-label">ステータス変更</div>',
      '          <div class="setting-desc">要送信 → 空白（全件表示）</div>',
      '        </div>',
      '        <label class="toggle-switch">',
      '          <input type="checkbox" id="orca-toggle-statusBlank">',
      '          <span class="toggle-slider"></span>',
      '        </label>',
      '      </div>',
      '    </div>',
      '',
      '    <div class="setting-card" id="card-autoSearch">',
      '      <div class="setting-row">',
      '        <div>',
      '          <div class="setting-label">自動検索</div>',
      '          <div class="setting-desc">設定適用後に検索を自動実行</div>',
      '        </div>',
      '        <label class="toggle-switch">',
      '          <input type="checkbox" id="orca-toggle-autoSearch">',
      '          <span class="toggle-slider"></span>',
      '        </label>',
      '      </div>',
      '    </div>',
      '',
      '    <div class="setting-card" id="card-injectCode">',
      '      <div class="setting-row">',
      '        <div>',
      '          <div class="setting-label">処方コード付加</div>',
      '          <div class="setting-desc">212処方時 .820/099999908/120002910 を自動追加</div>',
      '        </div>',
      '        <label class="toggle-switch">',
      '          <input type="checkbox" id="orca-toggle-injectCode">',
      '          <span class="toggle-slider"></span>',
      '        </label>',
      '      </div>',
      '    </div>',
      '',
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
  // サイドバー開閉
  // ========================================
  function openSidebar() {
    sidebar.classList.add('open');
    wrapper.style.marginRight = SIDEBAR_WIDTH + 'px';
    floatBtn.classList.add('hidden');
    chrome.storage.local.set({ sidebarOpen: true });
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    wrapper.style.marginRight = '0px';
    floatBtn.classList.remove('hidden');
    chrome.storage.local.set({ sidebarOpen: false });
  }

  function toggleSidebar() {
    if (sidebar.classList.contains('open')) {
      closeSidebar();
    } else {
      openSidebar();
    }
  }

  // ========================================
  // 日付セクション表示/非表示
  // ========================================
  function updateDateSectionVisibility(autoDateOn) {
    var section = document.getElementById('date-section');
    if (section) {
      section.style.display = autoDateOn ? 'block' : 'none';
    }
  }

  // ========================================
  // 日付を page_script.js へ送信
  // ========================================
  function sendDateUpdate(startDate, endDate, triggerSearch) {
    document.dispatchEvent(new CustomEvent('orca-helper-set-dates', {
      detail: {
        startDate: startDate,
        endDate: endDate,
        enableEndDate: true,
        autoSearch: triggerSearch
      }
    }));
  }

  // ========================================
  // 月ボタン処理
  // ========================================
  function saveDates(startDate, endDate) {
    var obj = {};
    obj[STORAGE_KEYS.savedStartDate] = startDate;
    obj[STORAGE_KEYS.savedEndDate] = endDate;
    chrome.storage.local.set(obj);
  }

  function setActiveMonthBtn(activeId) {
    ['orca-prev-month', 'orca-cur-month', 'orca-full-month', 'orca-next-month'].forEach(function (id) {
      var btn = document.getElementById(id);
      if (btn) {
        if (id === activeId) {
          btn.classList.add('current');
        } else {
          btn.classList.remove('current');
        }
      }
    });
  }

  function setupDateControls() {
    var startInput = document.getElementById('orca-start-date');
    var endInput = document.getElementById('orca-end-date');

    // 保存された日付を復元、なければデフォルト
    chrome.storage.local.get([STORAGE_KEYS.savedStartDate, STORAGE_KEYS.savedEndDate], function (result) {
      startInput.value = result[STORAGE_KEYS.savedStartDate] || getFirstDayOfMonthStr();
      endInput.value = result[STORAGE_KEYS.savedEndDate] || getTodayStr();
    });

    // 前月ボタン（前月1日〜前月末）
    document.getElementById('orca-prev-month').addEventListener('click', function () {
      var range = getMonthRange(-1);
      startInput.value = range.start;
      endInput.value = range.end;
      saveDates(range.start, range.end);
      setActiveMonthBtn('orca-prev-month');
    });

    // 現在ボタン（当月1日〜今日）
    document.getElementById('orca-cur-month').addEventListener('click', function () {
      var start = getFirstDayOfMonthStr();
      var end = getTodayStr();
      startInput.value = start;
      endInput.value = end;
      saveDates(start, end);
      setActiveMonthBtn('orca-cur-month');
    });

    // 当月ボタン（当月1日〜当月末）
    document.getElementById('orca-full-month').addEventListener('click', function () {
      var range = getMonthRange(0);
      startInput.value = range.start;
      endInput.value = range.end;
      saveDates(range.start, range.end);
      setActiveMonthBtn('orca-full-month');
    });

    // 次月ボタン（次月1日〜次月末）
    document.getElementById('orca-next-month').addEventListener('click', function () {
      var range = getMonthRange(1);
      startInput.value = range.start;
      endInput.value = range.end;
      saveDates(range.start, range.end);
      setActiveMonthBtn('orca-next-month');
    });

    // 適用ボタン
    document.getElementById('orca-apply-dates').addEventListener('click', function () {
      saveDates(startInput.value, endInput.value);
      var autoSearch = document.getElementById('orca-toggle-autoSearch').checked;
      sendDateUpdate(startInput.value, endInput.value, autoSearch);
    });
  }

  // ========================================
  // トグルUI
  // ========================================
  function updateCardStyle(cardId, active) {
    var card = document.getElementById(cardId);
    if (card) {
      if (active) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    }
  }

  function setupToggleListeners() {
    var toggles = [
      { id: 'orca-toggle-autoDate', key: STORAGE_KEYS.autoDate, card: 'card-autoDate' },
      { id: 'orca-toggle-statusBlank', key: STORAGE_KEYS.statusBlank, card: 'card-statusBlank' },
      { id: 'orca-toggle-autoSearch', key: STORAGE_KEYS.autoSearch, card: 'card-autoSearch' },
      { id: 'orca-toggle-injectCode', key: STORAGE_KEYS.injectCode, card: 'card-injectCode' }
    ];

    toggles.forEach(function (t) {
      var el = document.getElementById(t.id);
      el.addEventListener('change', function () {
        var obj = {};
        obj[t.key] = el.checked;
        chrome.storage.local.set(obj);
        updateCardStyle(t.card, el.checked);

        // 自動日付トグルの場合、日付セクションの表示を更新
        if (t.id === 'orca-toggle-autoDate') {
          updateDateSectionVisibility(el.checked);
        }

        // コードインジェクショントグルの場合、page_script.jsに通知
        if (t.id === 'orca-toggle-injectCode') {
          document.dispatchEvent(new CustomEvent('orca-helper-inject-toggle', {
            detail: { enabled: el.checked }
          }));
        }
      });
    });
  }

  // ========================================
  // 設定の読み込みと適用
  // ========================================
  function loadAndApplySettings() {
    chrome.storage.local.get(
      [STORAGE_KEYS.autoDate, STORAGE_KEYS.statusBlank, STORAGE_KEYS.autoSearch,
       STORAGE_KEYS.sidebarOpen, STORAGE_KEYS.savedStartDate, STORAGE_KEYS.savedEndDate,
       STORAGE_KEYS.injectCode],
      function (result) {
        var autoDate = result[STORAGE_KEYS.autoDate] || false;
        var statusBlank = result[STORAGE_KEYS.statusBlank] || false;
        var autoSearch = result[STORAGE_KEYS.autoSearch] || false;
        var injectCode = result[STORAGE_KEYS.injectCode] || false;
        var sidebarOpenState = result[STORAGE_KEYS.sidebarOpen] || false;
        var savedStart = result[STORAGE_KEYS.savedStartDate] || getFirstDayOfMonthStr();
        var savedEnd = result[STORAGE_KEYS.savedEndDate] || getTodayStr();

        // サイドバーの開閉状態を復元
        if (sidebarOpenState) {
          openSidebar();
        }

        // 日付入力に保存値を反映
        document.getElementById('orca-start-date').value = savedStart;
        document.getElementById('orca-end-date').value = savedEnd;

        // UIに反映
        document.getElementById('orca-toggle-autoDate').checked = autoDate;
        document.getElementById('orca-toggle-statusBlank').checked = statusBlank;
        document.getElementById('orca-toggle-autoSearch').checked = autoSearch;
        document.getElementById('orca-toggle-injectCode').checked = injectCode;

        updateCardStyle('card-autoDate', autoDate);
        updateCardStyle('card-statusBlank', statusBlank);
        updateCardStyle('card-autoSearch', autoSearch);
        updateCardStyle('card-injectCode', injectCode);
        updateDateSectionVisibility(autoDate);

        // page_script.js に適用を指示（保存された日付を使用）
        var actions = [];
        if (autoDate) actions.push('autoDate');
        if (statusBlank) actions.push('statusBlank');

        if (actions.length > 0 || autoSearch) {
          document.dispatchEvent(new CustomEvent('orca-helper-apply', {
            detail: {
              actions: actions,
              autoSearch: autoSearch,
              startDate: savedStart,
              endDate: savedEnd
            }
          }));
        }

        // コードインジェクション状態をpage_script.jsに通知
        document.dispatchEvent(new CustomEvent('orca-helper-inject-toggle', {
          detail: { enabled: injectCode }
        }));
      }
    );
  }

  // ========================================
  // 初期化
  // ========================================

  // 1. ページコンテンツをラッパーで囲む
  var wrapper = wrapPageContent();

  // 2. フローティングボタンとサイドバーを body 直下に追加（ラッパーの外）
  var floatBtn = createFloatButton();
  var sidebar = createSidebar();

  // 3. イベントリスナー
  floatBtn.addEventListener('click', function () {
    openSidebar();
  });

  document.getElementById('orca-sidebar-close').addEventListener('click', function () {
    closeSidebar();
  });

  setupToggleListeners();
  setupDateControls();

  // background.js からのメッセージ（拡張アイコンクリック）
  chrome.runtime.onMessage.addListener(function (message) {
    if (message.action === 'toggleSidebar') {
      toggleSidebar();
    }
  });

  // ページ読み込み時に設定を適用
  setTimeout(function () {
    loadAndApplySettings();
  }, 500);
})();
