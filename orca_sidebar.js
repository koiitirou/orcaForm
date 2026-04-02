/**
 * ORCA Helper - サイドバー UI
 *
 * フローティングボタン、サイドバーの生成・開閉制御。
 * ルールカードHTML生成とカスタムUIルールの構築。
 */
(function () {
  'use strict';

  var SIDEBAR_OPEN_KEY = 'orcaSidebarOpen';
  var sidebar, floatBtn;

  /** 標準ルールカードのHTMLを生成 (customUI ルールは除外) */
  function buildRuleCardsHTML() {
    var rules = window.OrcaRules || [];
    var html = '';
    for (var i = 0; i < rules.length; i++) {
      var r = rules[i];
      if (r.customUI) continue;
      var tooltipText = r.tooltip || r.description;
      var refreshBtn = r.forceExecute
        ? '<button class="orca-refresh-btn" id="orca-refresh-' + r.id + '" title="手動で1回実行">🔄</button>'
        : '';
      html += [
        '<div class="setting-card" title="' + tooltipText.replace(/"/g, '&quot;') + '">',
        '  <div class="setting-row">',
        '    <div>',
        '      <div class="setting-label">' + r.name + refreshBtn + '</div>',
        '      <div class="setting-desc">' + r.description + '</div>',
        '    </div>',
        '    <label class="toggle-switch">',
        '      <input type="checkbox" id="orca-rule-toggle-' + r.id + '">',
        '      <span class="toggle-slider"></span>',
        '    </label>',
        '  </div>',
        '</div>'
      ].join('\n');
    }
    return html;
  }

  /** customUI ルールのUIを構築 */
  function buildCustomRuleUIs() {
    var rules = window.OrcaRules || [];
    var contentEl = sidebar ? sidebar.querySelector('#orca-custom-rules') : null;
    if (!contentEl) contentEl = sidebar ? sidebar.querySelector('.sidebar-content') : null;
    if (!contentEl) return;
    for (var i = 0; i < rules.length; i++) {
      if (rules[i].customUI && rules[i].buildUI) {
        rules[i].buildUI(contentEl);
      }
    }
  }

  function createUI() {
    floatBtn = document.createElement('button');
    floatBtn.id = 'orca-helper-float-btn';
    floatBtn.title = 'ORCA Helper を開く';
    floatBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg>';
    document.body.appendChild(floatBtn);

    sidebar = document.createElement('div');
    sidebar.id = 'orca-helper-sidebar';
    sidebar.innerHTML = [
      '<div class="sidebar-header">',
      '  <h2>ORCA Helper</h2>',
      '  <button class="sidebar-close" id="orca-sidebar-close" title="閉じる">✕</button>',
      '</div>',
      '<div class="sidebar-content">',
      
      '  <div class="setting-card">',
      '    <div class="setting-row">',
      '      <div>',
      '        <div class="setting-label">テーマ設定</div>',
      '        <div class="setting-desc">ダークモードを使用する</div>',
      '      </div>',
      '      <label class="toggle-switch">',
      '        <input type="checkbox" id="orca-theme-toggle">',
      '        <span class="toggle-slider"></span>',
      '      </label>',
      '    </div>',
      '  </div>',
      
      '  <div id="orca-custom-rules"></div>',
      buildRuleCardsHTML(),
      
      '  <div style="margin-top:auto;padding:12px 16px;border-top:1px solid var(--orca-border,#e2e8f0);display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">',
      '    <a href="#" id="orca-link-m01" style="font-size:11px;color:var(--orca-text-sub,#94a3b8);text-decoration:none;opacity:0.7;transition:opacity 0.2s;" title="メインメニュー">▶ M01</a>',
      '    <a href="#" id="orca-link-w98" style="font-size:11px;color:var(--orca-text-sub,#94a3b8);text-decoration:none;opacity:0.7;transition:opacity 0.2s;" title="排他制御画面">🔒 W98</a>',
      '  </div>',

      '  <details id="orca-dev-settings" style="margin-top: 5px; cursor: pointer; padding: 0 16px 16px;">',
      '    <summary style="font-size: 11px; color: var(--orca-text-sub, #94a3b8); outline: none; margin-bottom: 8px; font-weight: bold; list-style-position: inside;">開発者向け設定 (WebORCA連携)</summary>',
      '    <div class="setting-card" style="cursor: auto; margin-bottom: 0;">',
      '      <div style="padding:8px 12px;">',
      '        <div class="setting-label" style="margin-bottom:6px;">WebORCA接続ユーザー</div>',
      '        <div style="margin-bottom:6px;">',
      '          <label style="font-size:11px;color:var(--orca-text-sub,#94a3b8);display:block;margin-bottom:2px;">ユーザー名</label>',
      '          <input type="text" id="orca-sidebar-user" style="width:100%;padding:4px 8px;background:var(--orca-bg,#ffffff);color:var(--orca-text,#334155);border:1px solid var(--orca-border,#cbd5e1);border-radius:4px;font-size:13px;box-sizing:border-box;">',
      '        </div>',
      '        <div>',
      '          <label style="font-size:11px;color:var(--orca-text-sub,#94a3b8);display:block;margin-bottom:2px;">パスワード</label>',
      '          <input type="text" id="orca-sidebar-pass" style="width:100%;padding:4px 8px;background:var(--orca-bg,#ffffff);color:var(--orca-text,#334155);border:1px solid var(--orca-border,#cbd5e1);border-radius:4px;font-size:13px;box-sizing:border-box;">',
      '        </div>',
      '      </div>',
      '    </div>',
      '  </details>',

      '</div>'
    ].join('\n');
    document.body.appendChild(sidebar);

    floatBtn.addEventListener('click', openSidebar);
    document.getElementById('orca-sidebar-close').addEventListener('click', closeSidebar);

    var userEl = document.getElementById('orca-sidebar-user');
    var passEl = document.getElementById('orca-sidebar-pass');

    // orderconvert側と共通のストレージを読み込む
    chrome.storage.local.get(['orca-helper-orca-user', 'orca-helper-orca-pass'], function(result) {
      if (userEl && passEl) {
        userEl.value = result['orca-helper-orca-user'] || 'orca';
        passEl.value = result['orca-helper-orca-pass'] || 'receipt';
      }
    });

    function saveCredentials() {
      if (userEl && passEl) {
        chrome.storage.local.set({
          'orca-helper-orca-user': userEl.value,
          'orca-helper-orca-pass': passEl.value
        });
      }
    }

    if (userEl) userEl.addEventListener('input', saveCredentials);
    if (passEl) passEl.addEventListener('input', saveCredentials);

    // ORCA画面リンク共通処理
    function openOrcaScreen(screen) {
      var user = userEl ? userEl.value : 'orca';
      var pass = passEl ? passEl.value : 'receipt';
      var base = window.location.origin;
      window.open(base + '/client.html?scale_mode=percent&user=' + encodeURIComponent(user) + '&pass=' + encodeURIComponent(pass) + '&screen=' + screen, '_blank');
    }

    ['orca-link-m01', 'orca-link-w98'].forEach(function (id) {
      var link = document.getElementById(id);
      if (link) {
        link.addEventListener('mouseenter', function () { link.style.opacity = '1'; });
        link.addEventListener('mouseleave', function () { link.style.opacity = '0.7'; });
        if (id === 'orca-link-m01' || id === 'orca-link-w98') {
          link.addEventListener('click', function (e) {
            e.preventDefault();
            openOrcaScreen(id === 'orca-link-m01' ? 'M01' : 'W98');
          });
        }
      }
    });
  }

  function openSidebar() {
    if (sidebar) sidebar.classList.add('open');
    if (floatBtn) floatBtn.classList.add('hidden');
    document.body.classList.add('orca-helper-active');
    setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 50);
    var obj = {};
    obj[SIDEBAR_OPEN_KEY] = true;
    chrome.storage.local.set(obj);
  }

  function closeSidebar() {
    if (sidebar) sidebar.classList.remove('open');
    if (floatBtn) floatBtn.classList.remove('hidden');
    document.body.classList.remove('orca-helper-active');
    setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 50);
    var obj = {};
    obj[SIDEBAR_OPEN_KEY] = false;
    chrome.storage.local.set(obj);
  }

  // 公開API
  window.OrcaSidebar = {
    create: createUI,
    buildCustomUIs: buildCustomRuleUIs,
    open: openSidebar,
    close: closeSidebar,
    getSidebar: function () { return sidebar; },
    SIDEBAR_OPEN_KEY: SIDEBAR_OPEN_KEY
  };
})();
