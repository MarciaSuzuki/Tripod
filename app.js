// Minimal application logic for the Tripod web app
//
// This file adds basic interactivity such as expanding/collapsing
// content sections and handling global expand/collapse actions.

document.addEventListener('DOMContentLoaded', () => {
  // Handle individual pane toggles
  document.querySelectorAll('.pane-head').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const isExpanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!isExpanded));
      const chevron = btn.querySelector('.chev');
      if (chevron) {
        chevron.textContent = isExpanded ? '▸' : '▾';
      }
      const paneBody = btn.parentElement.querySelector('.pane-body');
      if (paneBody) {
        paneBody.style.display = isExpanded ? 'none' : '';
      }
    });
  });

  // Expand all sections
  const expandAllBtn = document.getElementById('expandAllBtn');
  if (expandAllBtn) {
    expandAllBtn.addEventListener('click', () => {
      document.querySelectorAll('.pane-head').forEach((btn) => {
        btn.setAttribute('aria-expanded', 'true');
        const chevron = btn.querySelector('.chev');
        if (chevron) chevron.textContent = '▾';
        const paneBody = btn.parentElement.querySelector('.pane-body');
        if (paneBody) paneBody.style.display = '';
      });
    });
  }

  // Collapse all sections
  const collapseAllBtn = document.getElementById('collapseAllBtn');
  if (collapseAllBtn) {
    collapseAllBtn.addEventListener('click', () => {
      document.querySelectorAll('.pane-head').forEach((btn) => {
        btn.setAttribute('aria-expanded', 'false');
        const chevron = btn.querySelector('.chev');
        if (chevron) chevron.textContent = '▸';
        const paneBody = btn.parentElement.querySelector('.pane-body');
        if (paneBody) paneBody.style.display = 'none';
      });
    });
  }
});