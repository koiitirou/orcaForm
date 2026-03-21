/**
 * ルール: 入力コード置換 (rule_code_replace)
 *
 * K02 画面（診療行為入力）で入力コード列の値を置換する。
 *
 * 1. 施医総管 (842100036) — 元人数→先人数（元が空なら全てマッチ）
 * 2. 自由置換 — 任意ペア（正規表現チェック付き）
 *
 * ・トグルON → 自動検出＆置換（従来動作）
 * ・▶ボタン → 手動で即時置換
 */
(function () {
  'use strict';

  var STORAGE = {
    ninzuFrom: 'codeReplace_ninzuFrom',
    ninzuTo: 'codeReplace_ninzuTo',
    ninzuOn: 'codeReplace_ninzuOn',
    freePairs: 'codeReplace_freePairs',
    enabled: 'codeReplace_enabled',
    highlightColor: 'codeReplace_highlightColor'
  };

  var PALETTE = [
    { color: 'none', dark: 'none', label: 'なし' },
    { color: '#ffe0e6', dark: 'rgba(244,114,182,0.15)', label: 'ピンク' },
    { color: '#fff3cd', dark: 'rgba(245,158,11,0.15)', label: 'イエロー' },
    { color: '#d1fae5', dark: 'rgba(52,211,153,0.15)', label: 'グリーン' },
    { color: '#dbeafe', dark: 'rgba(96,165,250,0.15)', label: 'ブルー' },
    { color: '#e9d5ff', dark: 'rgba(192,132,252,0.15)', label: 'パープル' },
    { color: '#fed7aa', dark: 'rgba(251,146,60,0.15)', label: 'オレンジ' }
  ];

  var ninzuFrom = '';
  var ninzuTo = '';
  var ninzuOn = false;
  var freePairs = [];
  var isEnabled = false;
  var uiBuilt = false;
  var highlightColor = '#ffe0e6';

  // 保存 / 読み込み
  function saveSettings() {
    var obj = {};
    obj[STORAGE.ninzuFrom] = ninzuFrom;
    obj[STORAGE.ninzuTo] = ninzuTo;
    obj[STORAGE.ninzuOn] = ninzuOn;
    obj[STORAGE.freePairs] = JSON.stringify(freePairs);
    chrome.storage.local.set(obj);
  }

  function loadSettings(cb) {
    chrome.storage.local.get(
      [STORAGE.ninzuFrom, STORAGE.ninzuTo, STORAGE.ninzuOn, STORAGE.freePairs, STORAGE.enabled, STORAGE.highlightColor],
      function (r) {
        ninzuFrom = r[STORAGE.ninzuFrom] || '';
        ninzuTo = r[STORAGE.ninzuTo] || '';
        ninzuOn = r[STORAGE.ninzuOn] || false;
        isEnabled = r[STORAGE.enabled] || false;
        highlightColor = r[STORAGE.highlightColor] || '#ffe0e6';
        try { freePairs = JSON.parse(r[STORAGE.freePairs] || '[]'); } catch (e) { freePairs = []; }
        if (cb) cb();
      }
    );
  }

  function applyHighlightColor() {
    var styleId = 'orca-highlight-color';
    var el = document.getElementById(styleId);
    if (!el) { el = document.createElement('style'); el.id = styleId; document.head.appendChild(el); }
    if (highlightColor === 'none') {
      el.textContent = '';
      return;
    }
    var entry = PALETTE.find(function (p) { return p.color === highlightColor; });
    var dark = entry ? entry.dark : 'rgba(244,114,182,0.15)';
    el.textContent = '.orca-code-replaced { background-color: ' + highlightColor + ' !important; }\n' +
      '.orca-theme-dark .orca-code-replaced { background-color: ' + dark + ' !important; }';
  }

  // DOM
  function getCodeInputs() {
    var screen = window.OrcaHelpers.getVisibleScreen() || document;
    return screen.querySelectorAll('input[data-tcol="2"][data-owner*="PANDATABLE1"]');
  }

  function setFieldValue(input, newValue) {
    input.focus();
    input.value = newValue;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true
    }));
    input.dispatchEvent(new KeyboardEvent('keyup', {
      key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true
    }));
  }

  /** 置換先コードがある行をハイライト（置換とは独立して常時更新） */
  function refreshHighlights() {
    if (highlightColor === 'none') { clearHighlights(); return; }

    var inputs = getCodeInputs();
    for (var j = 0; j < inputs.length; j++) {
      var input = inputs[j];
      var val = input.value.trim();
      var tr = input.closest('tr');
      if (!tr) continue;

      var shouldHighlight = false;
      if (val) {
        // 施医総管: 842100036 + ninzuTo の完全パターンマッチ
        if (ninzuOn && ninzuTo && val.indexOf('842100036') !== -1) {
          var ninzuPattern = new RegExp('842100036\\s+' + escRegex(ninzuTo) + '\\b');
          if (ninzuPattern.test(val)) shouldHighlight = true;
        }

        // 自由置換: 入力値全体が to と完全一致
        if (!shouldHighlight) {
          for (var k = 0; k < freePairs.length; k++) {
            if (freePairs[k].enabled && freePairs[k].to && val === freePairs[k].to) {
              shouldHighlight = true;
              break;
            }
          }
        }
      }

      var tds = tr.querySelectorAll('td');
      for (var t = 0; t < tds.length; t++) {
        if (shouldHighlight) tds[t].classList.add('orca-code-replaced');
        else tds[t].classList.remove('orca-code-replaced');
      }
    }
  }

  function clearHighlights() {
    var els = document.querySelectorAll('.orca-code-replaced');
    for (var i = 0; i < els.length; i++) els[i].classList.remove('orca-code-replaced');
  }

  function escRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // ========================================
  // 置換実行（1回1フィールドの順次実行方式）
  // ========================================
  function executeReplace() {
    var inputs = getCodeInputs();

    for (var i = 0; i < inputs.length; i++) {
      var input = inputs[i];
      var val = input.value.trim();
      if (!val) continue;

      // 1. 施医総管
      if (ninzuOn && ninzuTo && val.indexOf('842100036') !== -1) {
        var pattern;
        if (ninzuFrom) {
          pattern = new RegExp('(842100036\\s+)(' + escRegex(ninzuFrom) + ')\\b');
        } else {
          pattern = new RegExp('(842100036\\s+)(\\d+)');
        }
        var m = val.match(pattern);
        if (m) {
          if (m[2] !== ninzuTo) {
            setFieldValue(input, val.replace(pattern, '$1' + ninzuTo));
            updateStatus('✅ 置換中...');
            lastSnapshot = getCodeSnapshot();
            pendingRecheck = true;
            return; // 1つ置換したら終了。サーバー応答後にMutationObserverが次を処理
          }
        }
      }

      // 2. 自由置換
      for (var j = 0; j < freePairs.length; j++) {
        var pair = freePairs[j];
        if (!pair.enabled || !pair.from || !pair.to) continue;
        var rx;
        try {
          rx = pair.regex ? new RegExp(pair.from) : new RegExp(escRegex(pair.from));
        } catch (e) { continue; }
        if (rx.test(val)) {
          var rep = val.replace(rx, pair.to);
          if (rep !== val) {
            setFieldValue(input, rep);
            updateStatus('✅ 置換中...');
            lastSnapshot = getCodeSnapshot();
            pendingRecheck = true;
            return; // 1つ置換したら終了
          }
        }
      }
    }

    // ここに来た = 全フィールドチェック済み、置換対象なし
    updateStatus('');
    lastSnapshot = getCodeSnapshot();
  }

  function updateStatus(text) {
    var s = document.getElementById('orca-replace-status');
    if (s) s.textContent = text;
  }

  // ========================================
  // ミニトグル
  // ========================================
  function miniToggle(id, checked) {
    return '<label class="cr-mini-toggle"><input type="checkbox" id="' + id + '"' +
      (checked ? ' checked' : '') + '><span class="cr-mini-slider"></span></label>';
  }

  // ========================================
  // UI
  // ========================================
  function buildUI(container) {
    if (uiBuilt) return;
    uiBuilt = true;

    var card = document.createElement('div');
    card.className = 'setting-card';
    card.id = 'card-code-replace';

    // マスタートグル行
    var headerRow = document.createElement('div');
    headerRow.className = 'setting-row';
    headerRow.innerHTML = [
      '<div>',
      '  <div class="setting-label">K02ルール</div>',
      '  <div class="setting-desc">入力コードを自動置換</div>',
      '</div>',
      '<label class="toggle-switch">',
      '  <input type="checkbox" id="orca-toggle-code-replace">',
      '  <span class="toggle-slider"></span>',
      '</label>'
    ].join('');
    card.appendChild(headerRow);

    // 詳細パネル（トグルOFFでも表示）
    var detail = document.createElement('div');
    detail.id = 'orca-replace-detail';
    detail.className = 'cr-detail';

    // 施医総管（2行: ラベル行 + 入力行）
    var ninzuBlock = document.createElement('div');
    ninzuBlock.className = 'cr-ninzu-block';
    ninzuBlock.innerHTML =
      '<div class="cr-ninzu-header">' +
      miniToggle('cr-ninzu-toggle', ninzuOn) +
      '<span class="cr-rule-label">施医総管</span>' +
      '<span class="cr-fixed-code">842100036</span>' +
      '</div>' +
      '<div class="cr-ninzu-inputs">' +
      '<input type="text" id="cr-ninzu-from" class="cr-num-input" placeholder="元" title="元の人数（空欄＝全てマッチ）" maxlength="3" value="' + esc(ninzuFrom) + '">' +
      '<span class="cr-arrow">→</span>' +
      '<input type="text" id="cr-ninzu-to" class="cr-num-input" placeholder="先" maxlength="3" value="' + esc(ninzuTo) + '">' +
      '</div>';
    detail.appendChild(ninzuBlock);

    // 自由置換ヘッダー
    var freeHeader = document.createElement('div');
    freeHeader.className = 'cr-free-header';
    freeHeader.innerHTML = '<span class="cr-section-label">自由置換</span>' +
      '<button id="cr-add-pair" class="cr-add-btn" title="追加">＋</button>';
    detail.appendChild(freeHeader);

    // 自由置換コンテナ
    var freeContainer = document.createElement('div');
    freeContainer.id = 'cr-free-pairs';
    detail.appendChild(freeContainer);

    // ハイライトカラーパレット
    var palRow = document.createElement('div');
    palRow.className = 'cr-palette-row';
    palRow.innerHTML = '<span class="cr-section-label">ハイライト色</span>';
    var swatches = document.createElement('div');
    swatches.className = 'cr-swatches';
    for (var p = 0; p < PALETTE.length; p++) {
      var sw = document.createElement('button');
      sw.className = 'cr-swatch' + (PALETTE[p].color === highlightColor ? ' active' : '');
      if (PALETTE[p].color === 'none') {
        sw.style.background = '#ccc';
        sw.textContent = '∅';
        sw.style.fontSize = '10px';
        sw.style.lineHeight = '14px';
        sw.style.color = '#666';
      } else {
        sw.style.background = PALETTE[p].color;
      }
      sw.title = PALETTE[p].label;
      sw.dataset.color = PALETTE[p].color;
      swatches.appendChild(sw);
    }
    palRow.appendChild(swatches);
    detail.appendChild(palRow);

    card.appendChild(detail);
    container.appendChild(card);

    // --- イベント ---
    var masterToggle = document.getElementById('orca-toggle-code-replace');
    masterToggle.checked = isEnabled;

    masterToggle.addEventListener('change', function () {
      isEnabled = masterToggle.checked;
      var obj = {};
      obj[STORAGE.enabled] = isEnabled;
      chrome.storage.local.set(obj);
      if (isEnabled) { startWatching(); executeReplace(); }
      else { stopWatching(); clearHighlights(); }
    });

    document.getElementById('cr-ninzu-toggle').addEventListener('change', function () {
      ninzuOn = this.checked; saveSettings();
    });
    document.getElementById('cr-ninzu-from').addEventListener('change', function () {
      ninzuFrom = this.value.trim(); saveSettings();
    });
    document.getElementById('cr-ninzu-to').addEventListener('change', function () {
      ninzuTo = this.value.trim(); saveSettings();
    });

    document.getElementById('cr-add-pair').addEventListener('click', function () {
      freePairs.push({ name: '置換' + (freePairs.length + 1), from: '', to: '', enabled: true, regex: false });
      saveSettings();
      renderFreePairs();
    });

    // パレットクリック
    var allSwatches = document.querySelectorAll('.cr-swatch');
    for (var si = 0; si < allSwatches.length; si++) {
      allSwatches[si].addEventListener('click', function () {
        highlightColor = this.dataset.color;
        var obj = {};
        obj[STORAGE.highlightColor] = highlightColor;
        chrome.storage.local.set(obj);
        applyHighlightColor();
        refreshHighlights();
        var all = document.querySelectorAll('.cr-swatch');
        for (var k = 0; k < all.length; k++) all[k].classList.remove('active');
        this.classList.add('active');
      });
    }

    applyHighlightColor();
    renderFreePairs();
  }

  // ========================================
  // 自由置換ペア描画
  // ========================================
  function renderFreePairs() {
    var ct = document.getElementById('cr-free-pairs');
    if (!ct) return;
    ct.innerHTML = '';

    for (var i = 0; i < freePairs.length; i++) {
      (function (idx) {
        var p = freePairs[idx];
        var el = document.createElement('div');
        el.className = 'cr-pair';

        // 行1
        var r1 = document.createElement('div');
        r1.className = 'cr-pair-row1';
        var tid = 'cr-pt-' + idx;
        var rid = 'cr-pr-' + idx;
        r1.innerHTML = miniToggle(tid, p.enabled !== false) +
          '<input type="text" class="cr-pair-name" value="' + esc(p.name) + '" placeholder="名前">' +
          '<label class="cr-regex-label" title="正規表現を使用"><input type="checkbox" id="' + rid + '"' +
          (p.regex ? ' checked' : '') + '><span>正規</span></label>' +
          '<button class="cr-del-btn" title="削除">×</button>';
        el.appendChild(r1);

        // 行2
        var r2 = document.createElement('div');
        r2.className = 'cr-pair-row2';
        r2.innerHTML = '<input type="text" class="cr-pair-code" value="' + esc(p.from) + '" placeholder="変換元">' +
          '<span class="cr-arrow">→</span>' +
          '<input type="text" class="cr-pair-code" value="' + esc(p.to) + '" placeholder="変換先">';
        el.appendChild(r2);
        ct.appendChild(el);

        // バインド
        el.querySelector('#' + tid).addEventListener('change', function () { freePairs[idx].enabled = this.checked; saveSettings(); });
        el.querySelector('#' + rid).addEventListener('change', function () { freePairs[idx].regex = this.checked; saveSettings(); });
        el.querySelector('.cr-pair-name').addEventListener('change', function () { freePairs[idx].name = this.value.trim(); saveSettings(); });
        var codes = el.querySelectorAll('.cr-pair-code');
        codes[0].addEventListener('change', function () { freePairs[idx].from = this.value.trim(); saveSettings(); });
        codes[1].addEventListener('change', function () { freePairs[idx].to = this.value.trim(); saveSettings(); });
        el.querySelector('.cr-del-btn').addEventListener('click', function () { freePairs.splice(idx, 1); saveSettings(); renderFreePairs(); });
      })(i);
    }
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ========================================
  // イベント駆動監視（ポーリング廃止）
  // ========================================
  var lastSnapshot = '';
  var watchDebounce = null;
  var codeObserver = null;
  var isWatching = false;
  var pendingRecheck = false;

  /** 入力コード列のスナップショットを取得 */
  function getCodeSnapshot() {
    var inputs = getCodeInputs();
    var vals = [];
    for (var i = 0; i < inputs.length; i++) {
      vals.push(inputs[i].value);
    }
    return vals.join('|');
  }

  /** スナップショット比較 → 変化時 or 再チェック待ち時に executeReplace */
  function checkAndExecute() {
    if (!isEnabled) return;
    refreshHighlights();
    var snapshot = getCodeSnapshot();
    if (snapshot !== lastSnapshot || pendingRecheck) {
      lastSnapshot = snapshot;
      pendingRecheck = false;
      executeReplace();
    }
  }

  /** デバウンス付きチェック */
  function debouncedCheck(delay) {
    clearTimeout(watchDebounce);
    watchDebounce = setTimeout(checkAndExecute, delay);
  }

  /** PANDATABLE1 限定 MutationObserver で監視 */
  function startWatching() {
    if (isWatching) return;
    isWatching = true;
    connectTableObserver();
  }

  /** PANDATABLE1用MutationObserverを接続 */
  function connectTableObserver() {
    if (codeObserver) { codeObserver.disconnect(); codeObserver = null; }
    var scrolledWin = document.getElementById('K02.fixed2.scrolledwindow3');
    if (scrolledWin) {
      codeObserver = new MutationObserver(function () {
        if (!isEnabled) return;
        debouncedCheck(500);
      });
      codeObserver.observe(scrolledWin, {
        childList: true, subtree: true, characterData: true
      });
    }
  }

  /** 監視を停止 */
  function stopWatching() {
    clearTimeout(watchDebounce);
    if (codeObserver) { codeObserver.disconnect(); codeObserver = null; }
    lastSnapshot = '';
  }

  // ========================================
  // ルール登録
  // ========================================
  window.OrcaRules = window.OrcaRules || [];
  window.OrcaRules.push({
    id: 'rule_code_replace',
    name: 'K02ルール',
    description: '入力コードを自動置換',
    storageKey: STORAGE.enabled,
    triggerScreen: 'K02',
    customUI: true,
    skipMutationExecute: true,

    isActive: function () { return isEnabled; },

    buildUI: function (container) {
      loadSettings(function () {
        buildUI(container);
        if (isEnabled) startWatching();
      });
    },
    execute: function () {
      if (isEnabled) executeReplace();
    },
    onScreenEnter: function () {
      lastSnapshot = '';
      if (isEnabled) {
        setTimeout(function () { connectTableObserver(); }, 200);
      }
    },
    onToggle: function (enabled) {
      isEnabled = enabled;
      if (enabled) { startWatching(); executeReplace(); }
      else { stopWatching(); clearHighlights(); }
    },

    css: [
      '.orca-code-replaced { background-color: #ffe0e6 !important; transition: background-color 0.3s; }',
      '.orca-theme-dark .orca-code-replaced { background-color: rgba(244,114,182,0.15) !important; }',

      '.cr-detail { margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--orca-border); }',

      /* 施医総管ブロック */
      '.cr-ninzu-block { margin-bottom: 8px; }',
      '.cr-ninzu-header { display: flex; align-items: center; gap: 5px; margin-bottom: 4px; }',
      '.cr-ninzu-inputs { display: flex; align-items: center; gap: 5px; padding-left: 33px; }',
      '.cr-rule-label { font-size: 11px; font-weight: 600; color: var(--orca-text-main); white-space: nowrap; }',
      '.cr-fixed-code { font-size: 12px; font-family: Consolas, monospace; color: var(--orca-accent); background: var(--orca-status-bg); padding: 2px 6px; border-radius: 3px; border: 1px solid var(--orca-border); white-space: nowrap; }',
      '.cr-num-input { width: 42px; background: var(--orca-status-bg); border: 1px solid var(--orca-border); border-radius: 4px; color: var(--orca-text-main); padding: 3px 4px; font-size: 12px; font-family: Consolas, monospace; outline: none; text-align: center; }',
      '.cr-num-input:focus { border-color: var(--orca-accent); }',

      /* ミニトグル */
      '.cr-mini-toggle { position: relative; width: 28px; height: 16px; display: inline-block; flex-shrink: 0; vertical-align: middle; }',
      '.cr-mini-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }',
      '.cr-mini-slider { position: absolute; inset: 0; background: var(--orca-toggle-bg); border-radius: 16px; cursor: pointer; transition: 0.25s; }',
      '.cr-mini-slider::before { content: ""; position: absolute; width: 12px; height: 12px; left: 2px; bottom: 2px; background: #fff; border-radius: 50%; transition: 0.25s; }',
      '.cr-mini-toggle input:checked + .cr-mini-slider { background: var(--orca-accent); }',
      '.cr-mini-toggle input:checked + .cr-mini-slider::before { transform: translateX(12px); }',

      '.cr-free-header { display: flex; align-items: center; justify-content: space-between; margin: 6px 0 4px; }',
      '.cr-section-label { font-size: 10px; font-weight: 600; color: var(--orca-text-sub); }',
      '.cr-add-btn { width: 22px; height: 22px; background: var(--orca-card-bg); border: 1px solid var(--orca-card-border); border-radius: 4px; color: var(--orca-accent); font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; line-height: 1; transition: all 0.2s; }',
      '.cr-add-btn:hover { background: var(--orca-accent-hover); }',

      '.cr-pair { background: var(--orca-status-bg); border: 1px solid var(--orca-border); border-radius: 6px; padding: 5px 6px; margin-bottom: 4px; }',
      '.cr-pair-row1 { display: flex; align-items: center; gap: 4px; margin-bottom: 3px; }',
      '.cr-pair-name { flex: 1; background: transparent; border: 1px solid var(--orca-border); border-radius: 3px; color: var(--orca-text-main); padding: 2px 5px; font-size: 11px; outline: none; min-width: 0; }',
      '.cr-pair-name:focus { border-color: var(--orca-accent); }',
      '.cr-del-btn { width: 18px; height: 18px; background: none; border: none; color: var(--orca-close-color); font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; line-height: 1; border-radius: 3px; }',
      '.cr-del-btn:hover { color: var(--orca-close-hover-color); background: var(--orca-close-hover-bg); }',
      '.cr-pair-row2 { display: flex; align-items: center; gap: 3px; padding-left: 32px; }',
      '.cr-pair-code { flex: 1; background: transparent; border: 1px solid var(--orca-border); border-radius: 3px; color: var(--orca-text-main); padding: 2px 5px; font-size: 11px; font-family: Consolas, monospace; outline: none; min-width: 0; }',
      '.cr-pair-code:focus { border-color: var(--orca-accent); }',
      '.cr-arrow { font-size: 10px; color: var(--orca-text-sub); flex-shrink: 0; }',

      '.cr-regex-label { display: flex; align-items: center; gap: 2px; font-size: 10px; color: var(--orca-text-sub); cursor: pointer; flex-shrink: 0; user-select: none; }',
      '.cr-regex-label input { width: 12px; height: 12px; margin: 0; }',
      '.cr-regex-label span { font-size: 10px; }',

      /* パレット */
      '.cr-palette-row { display: flex; align-items: center; gap: 8px; margin-top: 8px; padding-top: 6px; border-top: 1px solid var(--orca-border); }',
      '.cr-swatches { display: flex; gap: 4px; }',
      '.cr-swatch { width: 18px; height: 18px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; padding: 0; transition: border-color 0.2s, transform 0.15s; }',
      '.cr-swatch:hover { transform: scale(1.2); }',
      '.cr-swatch.active { border-color: var(--orca-accent); }',

      '.cr-action-row { display: flex; align-items: center; gap: 8px; margin-top: 8px; padding-top: 6px; border-top: 1px solid var(--orca-border); }',
      '.cr-action-row .cr-status { font-size: 10px; color: var(--orca-text-sub); flex: 1; }'
    ].join('\n')
  });
})();
