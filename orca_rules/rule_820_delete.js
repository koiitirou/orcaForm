/**
 * ルール: 処方箋料削除 (rule_820_delete)
 *
 * K08 画面（診療行為確認）で .820 処方箋料を自動検出し、
 * 削除剤番号フィールドに番号を自動入力する。
 */
(function () {
  'use strict';

  var hasRun = false;

  // ========================================
  // .820 処方箋料の行番号を検出
  // ========================================
  function find820RowNumbers() {
    var rows = [];
    var table = document.getElementById('K08.fixed1.scrolledwindow1.MEILIST');
    if (!table) return rows;

    var trs = table.querySelectorAll('tbody tr');
    for (var i = 0; i < trs.length; i++) {
      var tds = trs[i].querySelectorAll('td');
      if (tds.length < 3) continue;

      // 3列目（診療区分）に .820 処方箋料 があるか
      var categoryText = tds[2].textContent || '';
      if (categoryText.indexOf('.820') === -1 || categoryText.indexOf('処方箋料') === -1) continue;

      // 2列目（削除）に ◎ があるか（手入力分はスキップ）
      var markText = tds[1].textContent || '';
      if (markText.indexOf('◎') === -1) continue;

      // 1列目（番号）から行番号を取得
      var num = parseInt(tds[0].textContent.trim(), 10);
      if (!isNaN(num) && rows.indexOf(num) === -1) {
        rows.push(num);
      }
    }

    return rows;
  }

  // ========================================
  // 投薬料フィールドをハイライト
  // ========================================
  function highlightTouyaku() {
    var existing = document.querySelectorAll('.orca-highlight-touyaku');
    for (var j = 0; j < existing.length; j++) {
      existing[j].classList.remove('orca-highlight-touyaku');
    }

    var fieldId = 'K08.fixed1.TYKHKNTEN';
    var input = document.getElementById(fieldId);
    if (!input) {
      var fields = document.querySelectorAll('[name="' + fieldId + '"]');
      if (fields.length > 0) input = fields[0];
    }
    if (input) {
      input.classList.add('orca-highlight-touyaku');
    }
  }

  // ========================================
  // 削除剤番号フィールドに番号を入力
  // ========================================
  function fillDeleteFields(rowNumbers, statusEl) {
    if (rowNumbers.length === 0) {
      if (statusEl) statusEl.textContent = '.820 処方箋料 なし';
      return;
    }

    var fieldId = 'K08.fixed1.SELNUM01';
    var field = document.getElementById(fieldId);
    if (!field) {
      var fields = document.querySelectorAll('[name="' + fieldId + '"], [id="' + fieldId + '"]');
      if (fields.length > 0) field = fields[0];
    }

    if (field) {
      field.focus();
      field.value = String(rowNumbers[0]);
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
      field.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true
      }));
      hasRun = true;
      highlightTouyaku();

      if (statusEl) {
        statusEl.textContent = '✅ 行 ' + rowNumbers[0] + ' を削除対象に設定';
      }
    } else {
      if (statusEl) statusEl.textContent = '⚠ フィールドが見つかりません';
    }
  }

  var k08Observer = null;

  /** K08画面用のMutationObserverを接続 */
  function startK08Observer() {
    if (k08Observer) { k08Observer.disconnect(); k08Observer = null; }
    var screen = window.OrcaHelpers.getVisibleScreen();
    if (!screen) return;

    var tryExecute = function () {
      if (hasRun) return;
      if (document.body.innerText.indexOf('削除剤番号') === -1) return;
      var rows = find820RowNumbers();
      fillDeleteFields(rows);
      if (hasRun && k08Observer) { k08Observer.disconnect(); k08Observer = null; }
    };

    k08Observer = new MutationObserver(tryExecute);
    k08Observer.observe(screen, { childList: true, subtree: true, characterData: true });

    // 画面が既に読み込み済みの場合に即チェック
    setTimeout(tryExecute, 300);
  }

  // ========================================
  // ルール登録
  // ========================================
  window.OrcaRules = window.OrcaRules || [];
  window.OrcaRules.push({
    id: 'rule_820_delete',
    name: 'K08ルール',
    description: '.820 処方箋料を自動で削除',
    tooltip: '【動作ルール】\n・K08（診療行為確認）画面で自動実行\n・「.820 処方箋料」かつ「◎」マークがある行を検出\n・検出した行番号を削除剤番号フィールドに自動入力\n・投薬料フィールドをオレンジ色でハイライト\n・手入力分（◎なし）はスキップ',
    storageKey: 'orcaDeleteShohousen',
    triggerScreen: 'K08',
    triggerCondition: '削除剤番号',
    skipMutationExecute: true,

    /** ルール実行 */
    execute: function () {
      if (hasRun) return;
      var rows = find820RowNumbers();
      fillDeleteFields(rows);
    },

    /** 画面遷移時にリセット＆独自Observer起動 */
    onScreenEnter: function () {
      hasRun = false;
      startK08Observer();
    },

    /** トグル変更時 */
    onToggle: function (enabled) {
      hasRun = false;
      if (enabled) this.execute();
    },

    /** ▶ ボタン押下時 */
    forceExecute: function () {
      hasRun = false;
      var rows = find820RowNumbers();
      fillDeleteFields(rows);
    },

    /** 追加CSS（ルール固有スタイル） */
    css: [
      '.orca-highlight-touyaku { border: 3px solid #f97316 !important; background-color: #fff7ed !important; box-shadow: 0 0 8px rgba(249, 115, 22, 0.4) !important; }'
    ].join('\n')
  });
})();
