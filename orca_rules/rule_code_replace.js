/**
 * ルール: 入力コード置換 (rule_code_replace)
 *
 * K02 画面（診療行為入力）で入力コード列の値を置換する。
 *
 * 1. 施医総管 (842100036) — 元人数→先人数（元が空なら全てマッチ）
 * 2. 自由置換 — 任意ペア（正規表現チェック付き）
 *
 * ・マッチ = 常にハイライト / 置換は▶ボタンで手動実行
 * ・トグルOFFでも UI は表示（実行ボタン含む）
 */
(function () {
  'use strict';

  var STORAGE = {
    ninzuFrom: 'codeReplace_ninzuFrom',
    ninzuTo: 'codeReplace_ninzuTo',
    ninzuOn: 'codeReplace_ninzuOn',
    freePairs: 'codeReplace_freePairs',
    enabled: 'codeReplace_enabled'
  };

  var ninzuFrom = '';
  var ninzuTo = '';
  var ninzuOn = false;
  var freePairs = [];
  var isEnabled = false;
  var uiBuilt = false;

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
      [STORAGE.ninzuFrom, STORAGE.ninzuTo, STORAGE.ninzuOn, STORAGE.freePairs, STORAGE.enabled],
      function (r) {
        ninzuFrom = r[STORAGE.ninzuFrom] || '';
        ninzuTo = r[STORAGE.ninzuTo] || '';
        ninzuOn = r[STORAGE.ninzuOn] || false;
        isEnabled = r[STORAGE.enabled] || false;
        try { freePairs = JSON.parse(r[STORAGE.freePairs] || '[]'); } catch (e) { freePairs = []; }
        if (cb) cb();
      }
    );
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

  function highlightRow(input) {
    var tr = input.closest('tr');
    if (tr) {
      var tds = tr.querySelectorAll('td');
      for (var k = 0; k < tds.length; k++) tds[k].classList.add('orca-code-replaced');
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
  // スキャン＆置換
  // doReplace=false → ハイライトのみ, true → 実際に置換
  // ========================================
  function scanAndReplace(doReplace) {
    if (!isEnabled) return;
    clearHighlights();
    var inputs = getCodeInputs();
    var replacedCount = 0;
    var matchCount = 0;
    var statusParts = [];

    for (var i = 0; i < inputs.length; i++) {
      var input = inputs[i];
      var val = input.value.trim();
      if (!val) continue;

      // 1. 施医総管
      if (ninzuOn && ninzuTo && val.indexOf('842100036') !== -1) {
        var pattern;
        if (ninzuFrom) {
          // 元指定あり: 特定の数字だけマッチ
          pattern = new RegExp('(842100036\\s+)(' + escRegex(ninzuFrom) + ')\\b');
        } else {
          // 元なし: 842100036 + 任意の数字にマッチ（ワイルドカード）
          pattern = new RegExp('(842100036\\s+)(\\d+)');
        }
        var m = val.match(pattern);
        if (m) {
          matchCount++;
          highlightRow(input);
          if (doReplace && m[2] !== ninzuTo) {
            setFieldValue(input, val.replace(pattern, '$1' + ninzuTo));
            replacedCount++;
            statusParts.push('施医総管: ' + m[2] + '→' + ninzuTo);
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
          matchCount++;
          highlightRow(input);
          if (doReplace) {
            var rep = val.replace(rx, pair.to);
            if (rep !== val) {
              setFieldValue(input, rep);
              replacedCount++;
              statusParts.push(pair.name || (pair.from + '→' + pair.to));
            }
          }
        }
      }
    }

    var s = document.getElementById('orca-replace-status');
    if (s) {
      if (doReplace && replacedCount > 0) {
        s.textContent = '✅ ' + replacedCount + '件置換';
      } else if (matchCount > 0) {
        s.textContent = '🔍 ' + matchCount + '件';
      } else {
        s.textContent = '';
      }
    }
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

    // マスタートグル + ▶ 行
    var headerRow = document.createElement('div');
    headerRow.className = 'setting-row';
    headerRow.innerHTML = [
      '<div>',
      '  <div class="setting-label">コード置換</div>',
      '  <div class="setting-desc">入力コードを自動置換</div>',
      '</div>',
      '<div class="setting-controls">',
      '  <button class="cr-play-btn" id="cr-exec-btn" title="置換実行">▶</button>',
      '  <label class="toggle-switch">',
      '    <input type="checkbox" id="orca-toggle-code-replace">',
      '    <span class="toggle-slider"></span>',
      '  </label>',
      '</div>'
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
        '<input type="text" id="cr-ninzu-from" class="cr-num-input" placeholder="元(空=全)" maxlength="3" value="' + esc(ninzuFrom) + '">' +
        '<span class="cr-arrow">→</span>' +
        '<input type="text" id="cr-ninzu-to" class="cr-num-input" placeholder="先" maxlength="3" value="' + esc(ninzuTo) + '">' +
        '<span class="cr-status" id="orca-replace-status"></span>' +
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
      if (isEnabled) { startPolling(); scanAndReplace(false); }
      else { stopPolling(); clearHighlights(); }
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

    document.getElementById('cr-exec-btn').addEventListener('click', function () {
      scanAndReplace(true);
    });

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
  // ポーリング
  // ========================================
  var lastVals = {};
  var pollTimer = null;

  function startPolling() {
    if (pollTimer) return;
    pollTimer = setInterval(function () {
      if (!isEnabled) return;
      var inputs = getCodeInputs();
      var changed = false;
      for (var i = 0; i < inputs.length; i++) {
        var id = inputs[i].id, v = inputs[i].value;
        if (lastVals[id] !== v) { lastVals[id] = v; changed = true; }
      }
      if (changed) scanAndReplace(false);
    }, 1500);
  }

  function stopPolling() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    lastVals = {};
  }

  // ========================================
  // ルール登録
  // ========================================
  window.OrcaRules = window.OrcaRules || [];
  window.OrcaRules.push({
    id: 'rule_code_replace',
    name: 'コード置換',
    description: '入力コードを自動置換',
    storageKey: STORAGE.enabled,
    triggerScreen: 'K02',
    customUI: true,

    isActive: function () { return isEnabled; },

    buildUI: function (container) {
      loadSettings(function () {
        buildUI(container);
        if (isEnabled) startPolling();
      });
    },
    execute: function () {
      if (isEnabled) scanAndReplace(false);
    },
    onScreenEnter: function () {
      clearHighlights();
      lastVals = {};
    },
    onToggle: function (enabled) {
      isEnabled = enabled;
      if (enabled) { startPolling(); scanAndReplace(false); }
      else { stopPolling(); clearHighlights(); }
    },

    css: [
      '.orca-code-replaced { background-color: #fff3cd !important; transition: background-color 0.3s; }',
      '.orca-theme-dark .orca-code-replaced { background-color: rgba(245,158,11,0.15) !important; }',

      '.cr-detail { margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--orca-border); }',

      /* 施医総管ブロック */
      '.cr-ninzu-block { margin-bottom: 8px; }',
      '.cr-ninzu-header { display: flex; align-items: center; gap: 5px; margin-bottom: 4px; }',
      '.cr-ninzu-inputs { display: flex; align-items: center; gap: 5px; padding-left: 33px; }',
      '.cr-rule-label { font-size: 11px; font-weight: 600; color: var(--orca-text-main); white-space: nowrap; }',
      '.cr-fixed-code { font-size: 10px; font-family: Consolas, monospace; color: var(--orca-accent); background: var(--orca-status-bg); padding: 2px 6px; border-radius: 3px; border: 1px solid var(--orca-border); white-space: nowrap; }',
      '.cr-num-input { width: 42px; background: var(--orca-status-bg); border: 1px solid var(--orca-border); border-radius: 4px; color: var(--orca-text-main); padding: 3px 4px; font-size: 12px; font-family: Consolas, monospace; outline: none; text-align: center; }',
      '.cr-num-input:focus { border-color: var(--orca-accent); }',
      '.cr-status { font-size: 10px; color: var(--orca-text-sub); white-space: nowrap; margin-left: auto; }',

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
      '.cr-regex-label span { font-size: 10px; }'
    ].join('\n')
  });
})();
