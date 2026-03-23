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

      // 3. 会計ボタンチェック
      if (actions.indexOf('accountCheck') !== -1) {
        // 「会計ボタンでORCA画面を開く」チェックボックスをONにする
        if (typeof vm.is_weborcaOpen === 'function') {
          vm.is_weborcaOpen(true);
          actionLog.push('会計ボタンチェック=ON');
        } else {
          // フォールバック: IDやラベルから探す
          var fallbackCb = document.querySelector('#weborcaOpen input[type="checkbox"]');
          if (fallbackCb && !fallbackCb.checked) {
            fallbackCb.click();
            actionLog.push('会計ボタンチェック=ON');
          } else {
            var labels = document.querySelectorAll('label');
            for (var li = 0; li < labels.length; li++) {
              if (labels[li].textContent.indexOf('会計ボタンでORCA画面を開く') !== -1) {
                var cb = labels[li].querySelector('input[type="checkbox"]') || labels[li].parentElement.querySelector('input[type="checkbox"]');
                if (cb && !cb.checked) { cb.click(); }
                actionLog.push('会計ボタンチェック=ON');
                break;
              }
            }
          }
        }
      }

      // 4. 自動検索
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

  /**
   * ORCAボタンブロックを一括送信の下に追加
   */
  function injectOrcaButtons(vm) {
    var allSubmitBtn = document.getElementById('allSubmit');
    if (!allSubmitBtn || document.getElementById('orca-btn-block')) return;

    // 患者ID取得ヘルパー
    function getPatientId(padded) {
      var ptid = '';
      if (typeof vm.ptid === 'function') ptid = vm.ptid();
      if (!ptid) { alert('患者IDが取得できません'); return null; }
      if (padded) {
        // 10桁ゼロパディング（K03, K04 等で必要）
        var id = String(ptid).replace(/^0+/, '');
        return id.padStart(10, '0');
      }
      // 通常（K02, K10 等 - 元のロジック）
      return String(Number(ptid));
    }

    // WebORCA URL構築ヘルパー
    function buildOrcaUrl(screen, padded) {
      var patientId = getPatientId(padded);
      if (!patientId) return null;

      // サイドバーで設定されたユーザー/パスワードを取得
      var orcaUser = document.documentElement.getAttribute('data-orca-user') || 'secom';
      var orcaPass = document.documentElement.getAttribute('data-orca-pass') || 'secom';

      if (typeof vm.IsCloudFlg === 'function' && vm.IsCloudFlg()) {
        return 'https://weborca.cloud.orcamo.jp/client.html?scale_mode=percent&user=' + encodeURIComponent(orcaUser) + '&pass=' + encodeURIComponent(orcaPass) + '&screen=' + screen + '&ptnum=' + patientId;
      } else if (typeof vm.is_weborca === 'function' && vm.is_weborca()) {
        var link = '';
        if (typeof vm.serverLink === 'function') link += vm.serverLink();
        if (typeof vm.orcaPort === 'function') link += ':' + vm.orcaPort();
        return 'http://' + link + '/client.html?scale_mode=percent&user=' + encodeURIComponent(orcaUser) + '&pass=' + encodeURIComponent(orcaPass) + '&screen=' + screen + '&ptnum=' + patientId;
      }
      alert('WebORCA環境が設定されていません');
      return null;
    }

    // ボタン定義
    var btnDefs = [
      { text: '患者を開く',      screen: 'K02', cls: 'btn btn-success' },
      { text: '中途データを開く',  screen: 'K10', cls: 'btn btn-success' },
      { text: '一括送信して中途データ', screen: 'K10', cls: 'btn btn-success', action: 'batchThenChuto' }
    ];

    // ブロック作成
    var block = document.createElement('div');
    block.id = 'orca-btn-block';
    block.style.cssText = 'margin-top: 12px; padding-top: 12px; border-top: 1px dotted rgba(0,0,0,0.1); display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; width: 100%; clear: both; align-items: center;';

    btnDefs.forEach(function (def) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = def.cls;
      btn.textContent = def.text;
      if (def.white) btn.style.color = '#fff';

      if (def.action === 'batchThenChuto') {
        btn.addEventListener('click', function () {
          // まず一括送信ボタンをクリック
          allSubmitBtn.click();
          // 少し待ってから中途データ画面を開く
          setTimeout(function () {
            var url = buildOrcaUrl(def.screen, def.padded);
            if (url) window.open(url, '_blank');
          }, 1500);
        });
      } else {
        btn.addEventListener('click', function () {
          var url = buildOrcaUrl(def.screen, def.padded);
          if (url) window.open(url, '_blank');
        });
      }
      block.appendChild(btn);
    });

    // 一括送信ボタンの親要素(ブロック)のさらに親に挿入して横並びを防止
    // ※ 既存の親(parentEl)が flex 等で横並びになっている場合は、その「後」に独立した段として追加
    var parentEl = allSubmitBtn.parentElement;
    parentEl.parentNode.insertBefore(block, parentEl.nextSibling);
    console.log('[ORCA Helper] ORCAボタンブロックを追加しました');
  }

  // content.js からの初回適用指示
  document.addEventListener('orca-helper-apply', function (e) {
    executeActions(e.detail || {});
  });

  // content.js からの日付更新指示（適用ボタン）
  document.addEventListener('orca-helper-set-dates', function (e) {
    handleDateUpdate(e.detail || {});
  });

  // ========================================
  // ORCA API プロキシ経由送信
  // ========================================

  var PROXY_URL = 'http://localhost:5100';

  /**
   * インジェクションが有効かどうかチェック
   */
  function isInjectEnabled() {
    return document.documentElement.getAttribute('data-orca-inject') === 'true';
  }

  /**
   * XMLに820コードブロックを注入する（クライアント側で実行）
   * コードはサイドバーの入力フィールドから読み取る
   */
  function inject820Codes(xmlStr) {
    var medClass = document.documentElement.getAttribute('data-orca-inject-class') || '820';
    var code1 = document.documentElement.getAttribute('data-orca-inject-code1') || '099999908';
    var code2 = document.documentElement.getAttribute('data-orca-inject-code2') || '';

    // 既にこのクラスが含まれていれば注入しない
    if (xmlStr.indexOf('>' + medClass + '<') !== -1 || xmlStr.indexOf('>.' + medClass + '<') !== -1) {
      return xmlStr;
    }

    var block =
      '<Medical_Information_child type="record">' +
      '<Medical_Class type="string">' + medClass + '</Medical_Class>' +
      '<Medical_Class_Number type="string">1</Medical_Class_Number>' +
      '<Medication_info type="array">' +
      '<Medication_info_child type="record">' +
      '<Medication_Code type="string">' + code1 + '</Medication_Code>' +
      '<Medication_Number type="string">1</Medication_Number>' +
      '</Medication_info_child>';

    // コード2が指定されている場合のみ追加
    if (code2) {
      block +=
        '<Medication_info_child type="record">' +
        '<Medication_Code type="string">' + code2 + '</Medication_Code>' +
        '<Medication_Number type="string">1</Medication_Number>' +
        '</Medication_info_child>';
    }

    block += '</Medication_info></Medical_Information_child>';

    var closeTag = '</Medical_Information>';
    var pos = xmlStr.lastIndexOf(closeTag);
    if (pos === -1) return xmlStr;

    return xmlStr.substring(0, pos) + block + xmlStr.substring(pos);
  }
  /**
   * ORCA APIプロキシにXMLを送信（1回送信）
   */
  function sendToProxy(originalXml) {
    var isDebug = document.documentElement.getAttribute('data-orca-debug') === 'true';

    // クライアント側で820コードを注入
    var injectedXml = inject820Codes(originalXml);
    var wasInjected = injectedXml !== originalXml;

    if (wasInjected) {
      console.log('[ORCA Helper] ✅ 820コード注入完了（クライアント側）');
    }

    console.log('[ORCA Helper] === プロキシ送信開始 ===');

    fetch(PROXY_URL + '/api/medical/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ xml: injectedXml, class_type: '01' })
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      console.log('[ORCA Helper] ' + (data.success ? '✅ 送信成功' : '❌ 送信失敗 (status=' + data.status_code + ')'));

      if (isDebug && window.__orcaDebugPanel) {
        window.__orcaDebugPanel({
          sentXml: originalXml,
          serverData: {
            success: data.success,
            status_code: data.status_code,
            body: data.body,
            injected: wasInjected,
            injected_xml: wasInjected ? injectedXml : null
          }
        });
      }
    })
    .catch(function (err) {
      console.error('[ORCA Helper] ❌ プロキシ接続エラー:', err.message);
      if (isDebug && window.__orcaDebugPanel) {
        window.__orcaDebugPanel({
          sentXml: originalXml,
          serverData: { success: false, status_code: null, body: err.message, injected: false }
        });
      }
    });
  }

  /**
   * XHRインターセプト: ペイロードをキャプチャし、セコム送信成功後にプロキシへ転送
   */
  function setupXhrInterceptor() {
    var origOpen = XMLHttpRequest.prototype.open;
    var origSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url) {
      this._orcaHelperUrl = url;
      return origOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function (body) {
      var xhr = this;

      // /api/order/send へのリクエストのみ対象
      if (xhr._orcaHelperUrl && xhr._orcaHelperUrl.indexOf('/api/order/send') !== -1 && isInjectEnabled()) {
        console.log('[ORCA Helper] === セコム送信検知 ===');

        // ペイロードからXMLを抽出
        var capturedXml = null;
        if (typeof body === 'string' && body.length > 0 && body.charAt(0) === '{') {
          try {
            var jsonData = JSON.parse(body);
            if (jsonData && jsonData.API_REQUEST) {
              // 212（処方）が含まれるかチェック
              if (jsonData.API_REQUEST.indexOf('>212<') !== -1) {
                capturedXml = jsonData.API_REQUEST;
                console.log('[ORCA Helper] XMLキャプチャ成功 (212あり), 長さ:', capturedXml.length);
              } else {
                console.log('[ORCA Helper] 212（処方）なし → プロキシ送信スキップ');
              }
            }
          } catch (e) {
            console.log('[ORCA Helper] JSONパース失敗:', e.message);
          }
        }

        // セコム送信完了後にプロキシへ転送（ステータスに関わらず）
        if (capturedXml) {
          xhr.addEventListener('load', function () {
            console.log('[ORCA Helper] セコム送信完了 (status=' + xhr.status + ') → プロキシへ転送');
            sendToProxy(capturedXml);
          });
        }
      }

      // セコムへの送信はそのまま通す
      return origSend.call(this, body);
    };

    console.log('[ORCA Helper] XHRインターセプター設置完了');
  }

  // content.js からのインジェクション設定変更
  document.addEventListener('orca-helper-inject-toggle', function (e) {
    var enabled = e.detail && e.detail.enabled;
    document.documentElement.setAttribute('data-orca-inject', enabled ? 'true' : 'false');
    console.log('[ORCA Helper] コードインジェクション: ' + (enabled ? 'ON' : 'OFF'));
  });

  // XHRインターセプター設置
  setupXhrInterceptor();

  // ORCAボタンブロック追加（VM取得後）
  getVM(function (vm) {
    injectOrcaButtons(vm);
  });
})();
