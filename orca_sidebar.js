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
      '  <div style="margin-top:auto;padding:12px 16px;border-top:1px solid var(--orca-border,#e2e8f0);display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">',
      '    <a href="#" id="orca-link-m01" style="font-size:11px;color:var(--orca-text-sub,#94a3b8);text-decoration:none;opacity:0.7;transition:opacity 0.2s;" title="メインメニュー">▶ M01</a>',
      '    <a href="#" id="orca-link-w98" style="font-size:11px;color:var(--orca-text-sub,#94a3b8);text-decoration:none;opacity:0.7;transition:opacity 0.2s;" title="排他制御画面">🔒 W98</a>',
      '  </div>',
      '</div>'
    ].join('\n');
    document.body.appendChild(sidebar);

    floatBtn.addEventListener('click', openSidebar);
    document.getElementById('orca-sidebar-close').addEventListener('click', closeSidebar);

    // ORCA画面リンク共通処理
    function openOrcaScreen(screen) {
      var params = new URLSearchParams(window.location.search);
      var user = params.get('user') || 'secom';
      var pass = params.get('pass') || 'secom';
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
