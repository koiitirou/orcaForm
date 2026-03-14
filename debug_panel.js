/**
 * ORCA Helper - デバッグパネル
 *
 * デバッグモード時にORCA Proxy送信結果を画面上に表示する。
 * 元XML / 注入後XML（差分ハイライト） / ORCAレスポンス をタブ切り替え。
 */

(function () {
  'use strict';

  function esc(str) {
    if (!str) return '(データなし)';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function fmt(str) {
    if (!str) return '';
    return str.replace(/></g, '>\n<');
  }

  /**
   * 注入後XMLに差分ハイライトを適用
   * 注入ブロック（Medical_Class>820）を緑色で強調
   */
  function highlightInjected(xmlStr) {
    if (!xmlStr) return '(注入なし)';
    var formatted = fmt(xmlStr);
    var escaped = esc(formatted);
    // 820ブロックの行を緑色ハイライト
    var lines = escaped.split('\n');
    var inBlock = false;
    var result = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (line.indexOf('&gt;820&lt;') !== -1) {
        inBlock = true;
      }
      if (inBlock) {
        result.push('<span style="color:#a6e3a1;background:rgba(166,227,161,0.1);">' + line + '</span>');
      } else {
        result.push(line);
      }
      if (inBlock && line.indexOf('&lt;/Medical_Information_child&gt;') !== -1) {
        inBlock = false;
      }
    }
    return result.join('\n');
  }

  /**
   * @param {Object} opts
   * @param {string} opts.sentXml      - 元のXML（Chrome側で保持）
   * @param {Object} opts.serverData   - サーバーレスポンス
   */
  window.__orcaDebugPanel = function (opts) {
    var old = document.getElementById('orca-debug-panel');
    if (old) old.remove();

    var sentXml = opts.sentXml || '';
    var data = opts.serverData || {};

    // パネル
    var panel = document.createElement('div');
    panel.id = 'orca-debug-panel';
    Object.assign(panel.style, {
      position: 'fixed', bottom: '10px', right: '10px',
      width: '720px', maxHeight: '80vh',
      background: '#1e1e2e', color: '#cdd6f4',
      border: '1px solid #585b70', borderRadius: '8px',
      fontFamily: 'Consolas, monospace', fontSize: '12px',
      zIndex: '99999', boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden'
    });

    // ヘッダー
    var icon = data.success ? '✅' : '❌';
    var text = data.success ? '送信成功' : '送信失敗';
    var extra = data.injected ? ' | 820注入済' : '';

    // タブ定義
    var tabs = [
      { id: 'original', label: '元XML' },
      { id: 'injected', label: '注入後XML', highlight: true },
      { id: 'response', label: 'ORCAレスポンス' }
    ];

    // コンテンツ生成
    var originalHtml = esc(fmt(sentXml));
    var injectedHtml = data.injected_xml ? highlightInjected(data.injected_xml) : '(注入なし — 元XMLと同一)';
    var responseHtml = esc(fmt(data.body || ''));

    var tabsHtml = tabs.map(function (t, i) {
      var active = i === 1; // 注入後XMLをデフォルト表示
      return '<button class="orca-dbg-tab" data-tab="' + t.id + '" style="flex:1;padding:8px;' +
        'background:' + (active ? '#45475a' : '#313244') + ';' +
        'color:' + (active ? '#cdd6f4' : '#a6adc8') + ';' +
        'border:none;cursor:pointer;font-weight:' + (active ? 'bold' : 'normal') + ';' +
        'border-bottom:2px solid ' + (active ? '#89b4fa' : 'transparent') + ';">' +
        t.label + '</button>';
    }).join('');

    panel.innerHTML =
      '<div style="padding:8px 12px;background:#313244;display:flex;justify-content:space-between;align-items:center;">' +
        '<span style="font-weight:bold;">' + icon + ' ORCA Proxy ' + text + extra + ' (status=' + (data.status_code || '?') + ')</span>' +
        '<button id="orca-debug-close" style="background:none;border:none;color:#f38ba8;cursor:pointer;font-size:18px;">✕</button>' +
      '</div>' +
      '<div id="orca-dbg-tabs" style="display:flex;border-bottom:1px solid #585b70;">' + tabsHtml + '</div>' +
      '<div style="overflow:auto;flex:1;max-height:60vh;">' +
        '<pre id="orca-dbg-original" style="margin:0;padding:10px;white-space:pre-wrap;word-break:break-all;display:none;">' + originalHtml + '</pre>' +
        '<pre id="orca-dbg-injected" style="margin:0;padding:10px;white-space:pre-wrap;word-break:break-all;">' + injectedHtml + '</pre>' +
        '<pre id="orca-dbg-response" style="margin:0;padding:10px;white-space:pre-wrap;word-break:break-all;display:none;">' + responseHtml + '</pre>' +
      '</div>';

    document.body.appendChild(panel);

    // 閉じる
    document.getElementById('orca-debug-close').addEventListener('click', function () {
      panel.remove();
    });

    // タブ切り替え
    var contentIds = { original: 'orca-dbg-original', injected: 'orca-dbg-injected', response: 'orca-dbg-response' };
    panel.querySelectorAll('.orca-dbg-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = btn.getAttribute('data-tab');
        Object.keys(contentIds).forEach(function (k) {
          document.getElementById(contentIds[k]).style.display = k === target ? 'block' : 'none';
        });
        panel.querySelectorAll('.orca-dbg-tab').forEach(function (b) {
          var isActive = b === btn;
          b.style.background = isActive ? '#45475a' : '#313244';
          b.style.color = isActive ? '#cdd6f4' : '#a6adc8';
          b.style.borderBottom = isActive ? '2px solid #89b4fa' : '2px solid transparent';
          b.style.fontWeight = isActive ? 'bold' : 'normal';
        });
      });
    });

    console.log('[ORCA Helper] デバッグパネル表示');
  };
})();
