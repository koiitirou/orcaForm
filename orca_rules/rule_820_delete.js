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

    var searchRoot = window.OrcaHelpers.getVisibleScreen() || document;
    var allCells = searchRoot.querySelectorAll('td');

    for (var i = 0; i < allCells.length; i++) {
      var el = allCells[i];
      var text = el.textContent || '';
      if (text.indexOf('.820') !== -1 && text.indexOf('処方箋料') !== -1) {
        var row = el.closest('tr');
        if (row) {
          var tds = row.querySelectorAll('td');
          if (tds.length >= 3) {
            var numCell = tds[0];
            var markCell = tds[1];

            // "◎" がない場合はスキップ（手入力分）
            if (markCell.textContent.indexOf('◎') === -1) {
              continue;
            }

            var num = parseInt(numCell.textContent.trim(), 10);
            if (!isNaN(num) && rows.indexOf(num) === -1) {
              rows.push(num);
            }
          } else if (tds.length > 0) {
            var firstCell = tds[0];
            var num2 = parseInt(firstCell.textContent.trim(), 10);
            if (!isNaN(num2) && rows.indexOf(num2) === -1) {
              rows.push(num2);
            }
          }
        }
      }
    }

    // フォールバック: テキスト全体から検索
    if (rows.length === 0) {
      var bodyText = document.body.innerText || '';
      var lines = bodyText.split('\n');
      for (var j = 0; j < lines.length; j++) {
        var line = lines[j];
        if (line.indexOf('.820') !== -1 && line.indexOf('処方箋料') !== -1) {
          if (line.indexOf('◎') === -1) continue;

          var match = line.match(/^\s*(\d+)/);
          if (match) {
            var rowNum = parseInt(match[1], 10);
            if (!isNaN(rowNum) && rows.indexOf(rowNum) === -1) {
              rows.push(rowNum);
            }
          }
        }
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

  // ========================================
  // ルール登録
  // ========================================
  window.OrcaRules = window.OrcaRules || [];
  window.OrcaRules.push({
    id: 'rule_820_delete',
    name: '処方箋料削除',
    description: '.820 処方箋料を自動で削除対象に',
    storageKey: 'orcaDeleteShohousen',
    triggerScreen: 'K08',
    triggerCondition: '削除剤番号',

    /** ルール実行 */
    execute: function () {
      if (hasRun) return;
      var statusEl = document.getElementById('orca-rule-status-rule_820_delete');
      var rows = find820RowNumbers();
      fillDeleteFields(rows, statusEl);
    },

    /** 画面遷移時にリセット */
    onScreenEnter: function () {
      hasRun = false;
      var statusEl = document.getElementById('orca-rule-status-rule_820_delete');
      if (statusEl) statusEl.textContent = '監視中...';
    },

    /** トグル変更時 */
    onToggle: function (enabled) {
      hasRun = false;
      var statusEl = document.getElementById('orca-rule-status-rule_820_delete');
      if (statusEl) statusEl.textContent = enabled ? '監視中...' : '待機中';
      if (enabled) this.execute();
    },

    /** 追加CSS（ルール固有スタイル） */
    css: [
      '.orca-highlight-touyaku { border: 3px solid #f97316 !important; background-color: #fff7ed !important; box-shadow: 0 0 8px rgba(249, 115, 22, 0.4) !important; }'
    ].join('\n')
  });
})();
