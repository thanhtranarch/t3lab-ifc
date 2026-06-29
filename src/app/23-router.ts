// Hash-based client-side router for T3LAB.IFC (standalone build)
// Each page maps to existing window.* mode-switching globals.
// The sidebar nav buttons update the hash; this module reacts to hashchange.

type Page = 'viewer' | 'compare' | 'clash' | 'validate' | 'field';

const PAGE_LABELS: Record<Page, string> = {
  viewer:   '3D Viewer',
  compare:  'Version Compare',
  clash:    'Clash Detection',
  validate: 'SG Validate',
  field:    'Field Mode',
};

let activePage: Page = 'viewer';

function hashToPage(): Page {
  const h = window.location.hash.slice(1) as Page;
  return h in PAGE_LABELS ? h : 'viewer';
}

function syncNav(page: Page) {
  document.querySelectorAll<HTMLElement>('.sb-item[data-page]').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  const lbl = document.getElementById('headerModeLbl');
  if (lbl) lbl.textContent = PAGE_LABELS[page];
}

function applyPage(page: Page, isInit = false) {
  if (page === activePage && !isInit) return;
  activePage = page;
  syncNav(page);

  // Exit modes that conflict with target page
  // sgState is declared globally in 16-validator-rules.ts
  const exitClash = () => { if (typeof clashMode !== 'undefined' && clashMode) (window as any).exitClashMode?.(); };
  const exitSG    = () => { if (typeof sgState !== 'undefined' && sgState.open) (window as any).toggleSGCheckPanel?.(); };

  switch (page) {
    case 'viewer':
      exitClash();
      exitSG();
      break;

    case 'compare':
      exitClash();
      exitSG();
      break;

    case 'clash':
      exitSG();
      if (typeof clashMode !== 'undefined' && !clashMode) (window as any).toggleClashMode?.();
      break;

    case 'validate':
      exitClash();
      if (typeof sgState !== 'undefined' && !sgState.open) (window as any).toggleSGCheckPanel?.();
      break;

    case 'field':
      exitClash();
      exitSG();
      (window as any).fieldEnterMode?.();
      break;
  }

  try { localStorage.setItem('ifc.page', page); } catch { /* quota */ }
}

function navigateTo(page: Page) {
  if (window.location.hash !== '#' + page) {
    history.pushState(null, '', '#' + page);
  }
  applyPage(page);
}

// Expose on window
(window as any).navigateTo = navigateTo;

function initRouter() {
  window.addEventListener('popstate', () => applyPage(hashToPage()));

  // Restore: prefer URL hash, fall back to localStorage
  const fromHash   = hashToPage();
  const fromStore  = localStorage.getItem('ifc.page') as Page | null;
  const initial: Page =
    fromHash !== 'viewer'
      ? fromHash
      : fromStore && fromStore in PAGE_LABELS
        ? fromStore as Page
        : 'viewer';

  // Delay so all modules finish registering their window.* globals
  setTimeout(() => applyPage(initial, true), 120);
}

// Start router
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRouter);
} else {
  initRouter();
}

// ── Account menu toggle (IDD-style) ──────────────────────────────────
(window as any).toggleUserMenu = function(e: MouseEvent) {
  e.stopPropagation();
  const menu = document.getElementById('userMenu');
  const trigger = document.getElementById('userBadge');
  if (!menu) return;
  const open = menu.style.display !== 'none';
  menu.style.display = open ? 'none' : 'block';
  trigger?.classList.toggle('open', !open);
  // Close on outside click
  if (!open) {
    const close = (ev: MouseEvent) => {
      if (!menu.contains(ev.target as Node) && ev.target !== trigger) {
        menu.style.display = 'none';
        trigger?.classList.remove('open');
      }
      document.removeEventListener('click', close);
    };
    setTimeout(() => document.addEventListener('click', close), 0);
  }
};

// ── Settings panel stub (extend in future) ────────────────────────────
(window as any).toggleSettingsPanel = function() {
  let panel = document.getElementById('settingsPanel');
  if (!panel) {
    // Create minimal settings panel on first open
    panel = document.createElement('div');
    panel.id = 'settingsPanel';
    panel.className = 'settings-panel';
    panel.innerHTML = `
      <div class="settings-card">
        <div class="settings-card-title">
          <svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          Project Settings
        </div>
        <div class="settings-row"><span>Application</span><span style="font-size:12px;color:var(--text-muted)">T3LAB.IFC &mdash; 3D Version Compare</span></div>
        <div class="settings-row"><span>Version</span><span style="font-size:12px;color:var(--text-muted)">v1.0</span></div>
        <div style="margin-top:20px;display:flex;justify-content:flex-end">
          <button class="btn" onclick="document.getElementById('settingsPanel').style.display='none'" style="height:34px;padding:0 16px;font-size:13px">Close</button>
        </div>
      </div>
    `;
    panel.addEventListener('click', (e) => {
      if (e.target === panel) panel.style.display = 'none';
    });
    document.body.appendChild(panel);
  }
  const hidden = panel.style.display === 'none' || !panel.style.display;
  panel.style.display = hidden ? 'flex' : 'none';
};
