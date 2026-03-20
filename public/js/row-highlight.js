(function () {
  const table = document.querySelector('[data-row-highlight]');
  if (!table) return;
  const tbody = table.querySelector('tbody');
  const RAPID_MS = 500;
  let lastArrowTime = 0;

  function visibleRows() {
    return Array.from(tbody.querySelectorAll('tr')).filter(r => r.style.display !== 'none');
  }

  function clearHighlight() {
    tbody.querySelectorAll('tr.ic-highlight').forEach(r => r.classList.remove('ic-highlight'));
  }

  function highlightedIndices(rows) {
    const indices = [];
    rows.forEach((r, i) => { if (r.classList.contains('ic-highlight')) indices.push(i); });
    return indices;
  }

  function ensureVisible(row) {
    const rect = row.getBoundingClientRect();
    const margin = window.innerHeight * 0.15;
    if (rect.top < margin || rect.bottom > window.innerHeight - margin) {
      const target = row.getBoundingClientRect().top + window.scrollY - window.innerHeight / 2 + rect.height / 2;
      smoothScrollTo(target, 500);
    }
  }

  function smoothScrollTo(target, duration) {
    const start = window.scrollY;
    const delta = target - start;
    const startTime = performance.now();
    function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    function step(now) {
      const t = Math.min((now - startTime) / duration, 1);
      window.scrollTo(0, start + delta * ease(t));
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  tbody.addEventListener('click', (e) => {
    const row = e.target.closest('tr');
    if (row) {
      clearHighlight();
      row.classList.add('ic-highlight');
      ensureVisible(row);
      lastArrowTime = Date.now();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      clearHighlight();
      lastArrowTime = 0;
      return;
    }
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

    e.preventDefault();
    const rows = visibleRows();
    if (rows.length === 0) return;

    const now = Date.now();
    const rapid = (now - lastArrowTime) < RAPID_MS;
    lastArrowTime = now;

    const highlighted = highlightedIndices(rows);

    if (highlighted.length === 0) {
      const idx = e.key === 'ArrowDown' ? 0 : rows.length - 1;
      rows[idx].classList.add('ic-highlight');
      ensureVisible(rows[idx]);
      return;
    }

    const lo = Math.min(...highlighted);
    const hi = Math.max(...highlighted);

    if (rapid) {
      if (e.key === 'ArrowDown' && hi < rows.length - 1) {
        rows[hi + 1].classList.add('ic-highlight');
        ensureVisible(rows[hi + 1]);
      } else if (e.key === 'ArrowUp' && lo > 0) {
        rows[lo - 1].classList.add('ic-highlight');
        ensureVisible(rows[lo - 1]);
      }
    } else {
      clearHighlight();
      if (e.key === 'ArrowDown') {
        const next = Math.min(hi + 1, rows.length - 1);
        rows[next].classList.add('ic-highlight');
        ensureVisible(rows[next]);
      } else {
        const prev = Math.max(lo - 1, 0);
        rows[prev].classList.add('ic-highlight');
        ensureVisible(rows[prev]);
      }
    }
  });
})();
