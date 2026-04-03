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
    injectCode: 'injectCodeEnabled',
    debugMode: 'debugModeEnabled',
    accountCheck: 'accountCheckEnabled',
    themeDark: 'themeDarkEnabled',
    activeMonthBtn: 'activeMonthBtn',
    injectClass: 'injectClass',
    injectCode1: 'injectCode1',
    injectCode2: 'injectCode2',
    orcaUser: 'orcaUser',
    orcaPass: 'orcaPass',
    nativeZipUrl: 'nativeZipUrl',
    nativeUnzipPath: 'nativeUnzipPath'
  };

  var INJECT_DEFAULTS = {
    injectClass: '820',
    injectCode1: '099999908',
    injectCode2: '120002910'
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
      '  <div class="sidebar-content">',
      '',
      '    <div class="setting-card" id="card-themeDark">',
      '      <div class="setting-row">',
      '        <div>',
      '          <div class="setting-label">テーマ設定</div>',
      '          <div class="setting-desc">ダークモードを使用する</div>',
      '        </div>',
      '        <label class="toggle-switch">',
      '          <input type="checkbox" id="orca-toggle-themeDark">',
      '          <span class="toggle-slider"></span>',
      '        </label>',
      '      </div>',
      '    </div>',
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
      '          <div class="setting-label">送信ステータス変更</div>',
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
      '    <div class="setting-card" id="card-accountCheck">',
      '      <div class="setting-row">',
      '        <div>',
      '          <div class="setting-label">会計ボタンチェック</div>',
      '          <div class="setting-desc">会計ボタンでORCA画面を開くをON</div>',
      '        </div>',
      '        <label class="toggle-switch">',
      '          <input type="checkbox" id="orca-toggle-accountCheck">',
      '          <span class="toggle-slider"></span>',
      '        </label>',
      '      </div>',
      '    </div>',
      '',
      '    <div class="accordion-header" id="orca-accordion-dev" style="padding:8px 12px;margin-top:8px;cursor:pointer;color:#94a3b8;font-size:12px;display:flex;align-items:center;gap:6px;">',
      '      <span id="orca-accordion-arrow" style="transition:transform 0.2s;display:inline-block;">▶</span>',
      '      <span>開発者向け</span>',
      '    </div>',
      '    <div id="orca-accordion-body" style="display:none;">',
      '',
      '    <div class="setting-card" id="card-injectCode" style="display:none;">',
      '      <div class="setting-row">',
      '        <div>',
      '          <div class="setting-label">処方コード付加</div>',
      '          <div class="setting-desc">212処方時に下記コードを自動追加</div>',
      '        </div>',
      '        <label class="toggle-switch">',
      '          <input type="checkbox" id="orca-toggle-injectCode">',
      '          <span class="toggle-slider"></span>',
      '        </label>',
      '      </div>',
      '      <div class="inject-codes-section" style="padding:8px 12px 12px;border-top:1px solid rgba(255,255,255,0.1);">',
      '        <div style="margin-bottom:6px;">',
      '          <label style="font-size:11px;color:#94a3b8;display:block;margin-bottom:2px;">Medical_Class</label>',
      '          <input type="text" id="orca-inject-class" value="820" style="width:100%;padding:4px 8px;background:#1e293b;color:#e2e8f0;border:1px solid #475569;border-radius:4px;font-size:13px;box-sizing:border-box;">',
      '        </div>',
      '        <div style="margin-bottom:6px;">',
      '          <label style="font-size:11px;color:#94a3b8;display:block;margin-bottom:2px;">コード1</label>',
      '          <input type="text" id="orca-inject-code1" value="099999908" style="width:100%;padding:4px 8px;background:#1e293b;color:#e2e8f0;border:1px solid #475569;border-radius:4px;font-size:13px;box-sizing:border-box;">',
      '        </div>',
      '        <div>',
      '          <label style="font-size:11px;color:#94a3b8;display:block;margin-bottom:2px;">コード2（空欄で省略）</label>',
      '          <input type="text" id="orca-inject-code2" value="120002910" style="width:100%;padding:4px 8px;background:#1e293b;color:#e2e8f0;border:1px solid #475569;border-radius:4px;font-size:13px;box-sizing:border-box;">',
      '        </div>',
      '      </div>',
      '    </div>',
      '',
      '    <div class="setting-card" id="card-debugMode" style="display:none;">',
      '      <div class="setting-row">',
      '        <div>',
      '          <div class="setting-label">デバッグモード</div>',
      '          <div class="setting-desc">送信XMLとORCA応答をConsoleに表示</div>',
      '        </div>',
      '        <label class="toggle-switch">',
      '          <input type="checkbox" id="orca-toggle-debugMode">',
      '          <span class="toggle-slider"></span>',
      '        </label>',
      '      </div>',
      '    </div>',
      '',
      '    <div class="setting-card">',
      '      <div style="padding:8px 12px;">',
      '        <div class="setting-label" style="margin-bottom:6px;">ORCA接続ユーザー</div>',
      '        <div class="setting-desc" style="margin-bottom:8px;">WebORCA画面を開く時のユーザー/パスワード</div>',
      '        <div style="margin-bottom:6px;">',
      '          <label style="font-size:11px;color:#94a3b8;display:block;margin-bottom:2px;">ユーザー名</label>',
      '          <input type="text" id="orca-user" value="orca" style="width:100%;padding:4px 8px;background:#1e293b;color:#e2e8f0;border:1px solid #475569;border-radius:4px;font-size:13px;box-sizing:border-box;">',
      '        </div>',
      '        <div>',
      '          <label style="font-size:11px;color:#94a3b8;display:block;margin-bottom:2px;">パスワード</label>',
      '          <input type="text" id="orca-pass" value="receipt" style="width:100%;padding:4px 8px;background:#1e293b;color:#e2e8f0;border:1px solid #475569;border-radius:4px;font-size:13px;box-sizing:border-box;">',
      '        </div>',
      '      </div>',
      '    </div>',
      '',
      '    <div class="setting-card">',
      '      <div style="padding:8px 12px;">',
      '        <div class="setting-label" style="margin-bottom:6px;">WebORCAショートカット・別ウィンドウ起動セットアップ</div>',
      '        <div class="setting-desc" style="margin-bottom:4px;">1. WebORCA単体起動用ショートカット（コピーして利用）</div>',
      '        <textarea readonly style="width:100%;height:35px;padding:4px;background:#0f172a;color:#10b981;border:1px solid #475569;border-radius:4px;font-size:10px;font-family:monospace;resize:none;margin-bottom:8px;">"C:\\Program Files\\Google\\Chrome\\Application\\chrome_proxy.exe" --user-data-dir="C:\\weborca-chrome" https://weborca.cloud.orcamo.jp/?scale_mode=percent</textarea>',
      '        <div class="setting-desc" style="margin-bottom:4px;">2-1. 以下のボタンからセットアップ用ZIPをダウンロードし、任意のフォルダに解凍してください。</div>',
      '        <div style="margin-bottom:8px;display:flex;gap:4px;">',
      '          <input type="text" id="orca-native-zip-url" placeholder="ZIPファイルのDL URL (GCS等)" value="https://storage.googleapis.com/orca-helper-extension/native_host.zip" style="flex:1;padding:4px;background:#1e293b;color:#e2e8f0;border:1px solid #475569;border-radius:4px;font-size:11px;">',
      '          <button id="orca-download-zip-btn" type="button" style="padding:4px 8px;background:#10b981;color:white;border:none;border-radius:4px;font-size:11px;cursor:pointer;">DL🔗</button>',
      '        </div>',
      '        <div class="setting-desc" style="margin-bottom:4px;">2-2. 解凍先フォルダパスを入力して、インストールコマンドをコピー＆実行してください。</div>',
      '        <input type="text" id="orca-native-unzip-path" placeholder="例: C:\\MyApp\\test" style="width:100%;padding:4px;background:#1e293b;color:#e2e8f0;border:1px solid #475569;border-radius:4px;font-size:11px;margin-bottom:4px;box-sizing:border-box;">',
      '        <textarea id="orca-native-install-cmd" readonly style="width:100%;height:35px;padding:4px;background:#0f172a;color:#10b981;border:1px solid #475569;border-radius:4px;font-size:10px;font-family:monospace;resize:none;margin-bottom:6px;box-sizing:border-box;"></textarea>',
      '        <button id="orca-copy-reg-cmd" type="button" style="width:100%;padding:4px;background:#3b82f6;color:white;border:none;border-radius:4px;font-size:12px;cursor:pointer;">インストーラー起動コマンドをコピー</button>',
      '      </div>',
      '    </div>',
      '',
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
    // 選択状態を保存
    var obj = {};
    obj[STORAGE_KEYS.activeMonthBtn] = activeId;
    chrome.storage.local.set(obj);
  }

  function setupDateControls() {
    var startInput = document.getElementById('orca-start-date');
    var endInput = document.getElementById('orca-end-date');

    // 保存された日付とアクティブボタンを復元
    chrome.storage.local.get([STORAGE_KEYS.savedStartDate, STORAGE_KEYS.savedEndDate, STORAGE_KEYS.activeMonthBtn], function (result) {
      startInput.value = result[STORAGE_KEYS.savedStartDate] || getFirstDayOfMonthStr();
      endInput.value = result[STORAGE_KEYS.savedEndDate] || getTodayStr();
      // ボタンの色を復元（デフォルトは「現在」）
      var savedBtn = result[STORAGE_KEYS.activeMonthBtn] || 'orca-cur-month';
      setActiveMonthBtn(savedBtn);
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
      { id: 'orca-toggle-themeDark', key: STORAGE_KEYS.themeDark, card: 'card-themeDark' },
      { id: 'orca-toggle-autoDate', key: STORAGE_KEYS.autoDate, card: 'card-autoDate' },
      { id: 'orca-toggle-statusBlank', key: STORAGE_KEYS.statusBlank, card: 'card-statusBlank' },
      { id: 'orca-toggle-autoSearch', key: STORAGE_KEYS.autoSearch, card: 'card-autoSearch' },
      { id: 'orca-toggle-accountCheck', key: STORAGE_KEYS.accountCheck, card: 'card-accountCheck' },
      { id: 'orca-toggle-injectCode', key: STORAGE_KEYS.injectCode, card: 'card-injectCode' },
      { id: 'orca-toggle-debugMode', key: STORAGE_KEYS.debugMode, card: 'card-debugMode' }
    ];

    toggles.forEach(function (t) {
      var el = document.getElementById(t.id);
      el.addEventListener('change', function () {
        var obj = {};
        obj[t.key] = el.checked;
        chrome.storage.local.set(obj);
        updateCardStyle(t.card, el.checked);
        // トグルごとの個別処理
        if (t.id === 'orca-toggle-themeDark') {
          if (el.checked) {
            document.body.classList.add('orca-theme-dark');
          } else {
            document.body.classList.remove('orca-theme-dark');
          }
        }

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

        // デバッグモードトグルの場合、page_script.jsに通知
        if (t.id === 'orca-toggle-debugMode') {
          document.documentElement.setAttribute('data-orca-debug', el.checked ? 'true' : 'false');
        }
      });
    });

    // 注入コード入力フィールドのイベント
    var codeInputs = [
      { id: 'orca-inject-class', key: STORAGE_KEYS.injectClass, attr: 'data-orca-inject-class' },
      { id: 'orca-inject-code1', key: STORAGE_KEYS.injectCode1, attr: 'data-orca-inject-code1' },
      { id: 'orca-inject-code2', key: STORAGE_KEYS.injectCode2, attr: 'data-orca-inject-code2' },
      { id: 'orca-user', key: STORAGE_KEYS.orcaUser, attr: 'data-orca-user' },
      { id: 'orca-pass', key: STORAGE_KEYS.orcaPass, attr: 'data-orca-pass' }
    ];
    codeInputs.forEach(function (ci) {
      var input = document.getElementById(ci.id);
      input.addEventListener('change', function () {
        var obj = {};
        obj[ci.key] = input.value.trim();
        chrome.storage.local.set(obj);
        document.documentElement.setAttribute(ci.attr, input.value.trim());
      });
    });

    // Native Host ZIP DL & Install URL events
    var zipUrlEl = document.getElementById('orca-native-zip-url');
    var dlBtnEl = document.getElementById('orca-download-zip-btn');
    var unzipPathEl = document.getElementById('orca-native-unzip-path');
    var cmdTextareaEl = document.getElementById('orca-native-install-cmd');

    function updateInstallCmd() {
      if (!cmdTextareaEl || !unzipPathEl) return;
      var p = unzipPathEl.value.trim() || 'C:\\MyApp\\test';
      var scriptPath = p.replace(/\\$/, '') + '\\install_host.ps1';
      cmdTextareaEl.value = 'PowerShell -ExecutionPolicy Bypass -File "' + scriptPath + '"';
    }

    if (zipUrlEl) {
      zipUrlEl.addEventListener('input', function() {
        var obj = {}; obj[STORAGE_KEYS.nativeZipUrl] = zipUrlEl.value;
        chrome.storage.local.set(obj);
      });
    }

    if (dlBtnEl) {
      dlBtnEl.addEventListener('click', function() {
        if (zipUrlEl && zipUrlEl.value) {
          window.open(zipUrlEl.value, '_blank');
        } else {
          alert('ZIPファイルのURLが入力されていません。');
        }
      });
    }

    if (unzipPathEl) {
      unzipPathEl.addEventListener('input', function() {
        var obj = {}; obj[STORAGE_KEYS.nativeUnzipPath] = unzipPathEl.value;
        chrome.storage.local.set(obj);
        updateInstallCmd();
      });
    }

    // レジストリ登録コマンドコピーボタン
    var copyBtn = document.getElementById('orca-copy-reg-cmd');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var cmd = cmdTextareaEl ? cmdTextareaEl.value : '';
        if (!cmd) return;
        navigator.clipboard.writeText(cmd).then(function() {
          alert('コマンドをコピーしました。\nWinキーを押して「powershell」と入力し、開いた画面に右クリックで貼り付けて実行してください。');
        }).catch(function(err) {
          alert('コピーに失敗しました: ' + err);
        });
      });
    }

    // アコーディオン開閉
    document.getElementById('orca-accordion-dev').addEventListener('click', function () {
      var body = document.getElementById('orca-accordion-body');
      var arrow = document.getElementById('orca-accordion-arrow');
      var isOpen = body.style.display !== 'none';
      body.style.display = isOpen ? 'none' : 'block';
      arrow.style.transform = isOpen ? '' : 'rotate(90deg)';
    });
  }

  // ========================================
  // 設定の読み込みと適用
  // ========================================
  function loadAndApplySettings() {
    chrome.storage.local.get(
      [STORAGE_KEYS.themeDark, STORAGE_KEYS.autoDate, STORAGE_KEYS.statusBlank, STORAGE_KEYS.autoSearch,
       STORAGE_KEYS.accountCheck, STORAGE_KEYS.sidebarOpen, STORAGE_KEYS.savedStartDate, STORAGE_KEYS.savedEndDate,
       STORAGE_KEYS.injectCode, STORAGE_KEYS.debugMode, STORAGE_KEYS.orcaUser, STORAGE_KEYS.orcaPass,
       STORAGE_KEYS.nativeZipUrl, STORAGE_KEYS.nativeUnzipPath],
      function (result) {
        var themeDark = result[STORAGE_KEYS.themeDark] || false;
        var autoDate = result[STORAGE_KEYS.autoDate] || false;
        var statusBlank = result[STORAGE_KEYS.statusBlank] || false;
        var autoSearch = result[STORAGE_KEYS.autoSearch] || false;
        var accountCheck = result[STORAGE_KEYS.accountCheck] || false;
        var injectCode = result[STORAGE_KEYS.injectCode] || false;
        var debugMode = result[STORAGE_KEYS.debugMode] || false;
        var sidebarOpenState = result[STORAGE_KEYS.sidebarOpen] || false;
        var savedStart = result[STORAGE_KEYS.savedStartDate] || getFirstDayOfMonthStr();
        var savedEnd = result[STORAGE_KEYS.savedEndDate] || getTodayStr();

        // テーマの適用
        if (themeDark) {
          document.body.classList.add('orca-theme-dark');
        } else {
          document.body.classList.remove('orca-theme-dark');
        }

        // サイドバーの開閉状態を復元
        if (sidebarOpenState) {
          openSidebar();
        }

        // 日付入力に保存値を反映
        document.getElementById('orca-start-date').value = savedStart;
        document.getElementById('orca-end-date').value = savedEnd;

        // UIに反映
        var themeToggle = document.getElementById('orca-toggle-themeDark');
        if (themeToggle) themeToggle.checked = themeDark;
        document.getElementById('orca-toggle-autoDate').checked = autoDate;
        document.getElementById('orca-toggle-statusBlank').checked = statusBlank;
        document.getElementById('orca-toggle-autoSearch').checked = autoSearch;
        document.getElementById('orca-toggle-accountCheck').checked = accountCheck;
        document.getElementById('orca-toggle-injectCode').checked = injectCode;
        document.getElementById('orca-toggle-debugMode').checked = debugMode;

        // 注入コードの値を復元
        var iClass = result[STORAGE_KEYS.injectClass] || INJECT_DEFAULTS.injectClass;
        var iCode1 = result[STORAGE_KEYS.injectCode1] || INJECT_DEFAULTS.injectCode1;
        var iCode2 = (result[STORAGE_KEYS.injectCode2] !== undefined) ? result[STORAGE_KEYS.injectCode2] : INJECT_DEFAULTS.injectCode2;
        var orcaUser = result[STORAGE_KEYS.orcaUser] || 'orca';
        var orcaPass = result[STORAGE_KEYS.orcaPass] || 'receipt';
        document.getElementById('orca-inject-class').value = iClass;
        document.getElementById('orca-inject-code1').value = iCode1;
        document.getElementById('orca-inject-code2').value = iCode2;
        document.getElementById('orca-user').value = orcaUser;
        document.getElementById('orca-pass').value = orcaPass;

        var zipUrl = result[STORAGE_KEYS.nativeZipUrl];
        if (!zipUrl || !zipUrl.startsWith('http')) {
            zipUrl = 'https://storage.googleapis.com/orca-helper-extension/native_host.zip';
        }
        var unzipPath = result[STORAGE_KEYS.nativeUnzipPath] || 'C:\\MyApp\\test';
        var zipUrlEl = document.getElementById('orca-native-zip-url');
        var unzipPathEl = document.getElementById('orca-native-unzip-path');
        var cmdTextareaEl = document.getElementById('orca-native-install-cmd');
        if (zipUrlEl) zipUrlEl.value = zipUrl;
        if (unzipPathEl) unzipPathEl.value = unzipPath;
        if (cmdTextareaEl) {
          var p = unzipPath.trim() || 'C:\\MyApp\\test';
          cmdTextareaEl.value = 'PowerShell -ExecutionPolicy Bypass -File "' + p.replace(/\\$/, '') + '\\install_host.ps1"';
        }

        updateCardStyle('card-autoDate', autoDate);
        updateCardStyle('card-statusBlank', statusBlank);
        updateCardStyle('card-autoSearch', autoSearch);
        updateCardStyle('card-accountCheck', accountCheck);
        updateCardStyle('card-injectCode', injectCode);
        updateCardStyle('card-debugMode', debugMode);
        document.documentElement.setAttribute('data-orca-inject', injectCode ? 'true' : 'false');
        document.documentElement.setAttribute('data-orca-debug', debugMode ? 'true' : 'false');
        document.documentElement.setAttribute('data-orca-inject-class', iClass);
        document.documentElement.setAttribute('data-orca-inject-code1', iCode1);
        document.documentElement.setAttribute('data-orca-inject-code2', iCode2);
        document.documentElement.setAttribute('data-orca-user', orcaUser);
        document.documentElement.setAttribute('data-orca-pass', orcaPass);
        updateDateSectionVisibility(autoDate);

        // page_script.js に適用を指示（保存された日付を使用）
        var actions = [];
        if (autoDate) actions.push('autoDate');
        if (statusBlank) actions.push('statusBlank');
        if (accountCheck) actions.push('accountCheck');

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

  // page_script.js からの別Chrome起動リクエスト → background.js へ転送
  document.addEventListener('orca-helper-open-chrome', function (e) {
    var url = e.detail && e.detail.url;
    if (!url) return;
    chrome.runtime.sendMessage(
      { action: 'openChromeWindow', url: url },
      function (response) {
        if (chrome.runtime.lastError || !response || !response.success) {
          // Native Host 未接続時はエラー表示（タブで開く挙動は削除）
          alert('別ウィンドウでのChrome起動に失敗しました。\nNative Messaging Host が正しくインストールされているか確認し、拡張機能を再読み込みしてください。');
        }
      }
    );
  });

  // 患者IDコピーボタンの注入
  function injectCopyIdButton() {
    var ptidInput = document.querySelector('input[data-bind="value: ptid"]');
    if (!ptidInput || document.getElementById('orca-copy-id-btn')) return;

    var copyBtn = document.createElement('button');
    copyBtn.id = 'orca-copy-id-btn';
    copyBtn.type = 'button';
    // Bootstrapのボタンスタイルを利用しつつ少し調整
    copyBtn.className = 'btn btn-outline-secondary';
    copyBtn.style.cssText = 'margin-left: 5px; padding: 2px 8px; font-size: 12px; height: 26px; line-height: 1; border-color: #cbd5e1; background: #fff; cursor: pointer;';
    copyBtn.textContent = '📋';
    copyBtn.title = '患者IDをコピー (クリップボード＆WebORCA自動入力用)';

    ptidInput.parentNode.insertBefore(copyBtn, ptidInput.nextSibling);

    // レイアウト崩れ対策: 追加したボタンの幅の分、weborcaOpenの巨大な左マージンを動的に吸収して改行を防ぐ
    var weborcaOpen = document.getElementById('weborcaOpen');
    if (weborcaOpen) {
      weborcaOpen.style.marginLeft = 'auto'; // フレックスアライメントに任せる
    }

    copyBtn.addEventListener('click', function() {
      var idVal = ptidInput.value;
      if (!idVal) {
        alert('患者IDが入力されていません。');
        return;
      }

      function onCopySuccess() {
        var oldContent = copyBtn.textContent;
        copyBtn.textContent = '✅';
        copyBtn.style.background = '#dcfce7';
        setTimeout(function() { 
          copyBtn.textContent = oldContent; 
          copyBtn.style.background = '#fff';
        }, 1500);
      }

      // HTTP環境（IPアドレスなど）では navigator.clipboard が Undefined になるためフォールバックを用意
      if (navigator.clipboard) {
        navigator.clipboard.writeText(idVal).then(onCopySuccess).catch(function(err) {
          fallbackCopyTextToClipboard(idVal, onCopySuccess);
        });
      } else {
        fallbackCopyTextToClipboard(idVal, onCopySuccess);
      }
    });
  }

  function fallbackCopyTextToClipboard(text, onSuccess) {
    var textArea = document.createElement("textarea");
    textArea.value = text;
    // 画面外に配置
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      var successful = document.execCommand('copy');
      if (successful) onSuccess();
      else alert('コピーに失敗しました（ブラウザ設定による制限）');
    } catch (err) {
      alert('コピーに失敗しました: ' + err);
    }
    document.body.removeChild(textArea);
  }

  // KnockoutJSによるレンダリング後に追加するため定期チェック
  setInterval(injectCopyIdButton, 1000);

  // ページ読み込み時に設定を適用
  setTimeout(function () {
    loadAndApplySettings();
  }, 500);
})();
