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
      html += [
        '<div class="setting-card" title="' + tooltipText.replace(/"/g, '&quot;') + '">',
        '  <div class="setting-row">',
        '    <div>',
        '      <div class="setting-label">' + r.name + '</div>',
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
    var contentEl = sidebar ? sidebar.querySelector('.sidebar-content') : null;
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
    floatBtn.innerHTML = '⚕';
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
      buildRuleCardsHTML(),
      '  <div class="setting-card" style="margin-top:12px;">',
      '    <div class="setting-row" style="justify-content:center;">',
      '      <button id="orca-haita-btn" style="width:100%;padding:10px 16px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;letter-spacing:0.5px;transition:all 0.2s;">🔒 排他制御画面を開く (W98)</button>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('\n');
    document.body.appendChild(sidebar);

    floatBtn.addEventListener('click', openSidebar);
    document.getElementById('orca-sidebar-close').addEventListener('click', closeSidebar);

    // 排他制御ボタン
    var haitaBtn = document.getElementById('orca-haita-btn');
    if (haitaBtn) {
      haitaBtn.addEventListener('mouseenter', function () {
        haitaBtn.style.transform = 'translateY(-1px)';
        haitaBtn.style.boxShadow = '0 4px 12px rgba(245,158,11,0.4)';
      });
      haitaBtn.addEventListener('mouseleave', function () {
        haitaBtn.style.transform = '';
        haitaBtn.style.boxShadow = '';
      });
      haitaBtn.addEventListener('click', function () {
        // 現在のページURLからuser/passを引き継ぐ
        var params = new URLSearchParams(window.location.search);
        var user = params.get('user') || 'secom';
        var pass = params.get('pass') || 'secom';
        var base = window.location.origin;
        var url = base + '/client.html?user=' + encodeURIComponent(user) + '&pass=' + encodeURIComponent(pass) + '&screen=W98';
        window.open(url, '_blank');
      });
    }
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
