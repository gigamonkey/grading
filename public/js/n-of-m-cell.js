(() => {
  const DBLCLICK_MS = 200;

  function ajaxMark(cell, values) {
    const isWidget = cell.dataset.widget === '1';
    const target = isWidget ? cell : cell.closest('tr');
    const merged = isWidget ? { ...values, widget: '1' } : values;
    htmx.ajax('PUT', cell.dataset.markUrl, {
      target,
      swap: 'outerHTML',
      values: merged,
    });
  }

  function openEditor(cell) {
    const max = Number(cell.dataset.max);
    const original = cell.innerHTML;
    const text = cell.textContent.trim();
    const currentN = text ? text.split('/')[0] : '';
    cell.innerHTML = '';
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.max = String(max);
    input.step = '1';
    input.value = currentN;
    input.className = 'n-of-m-input';
    cell.appendChild(input);
    input.focus();
    input.select();

    let done = false;
    const finish = (save) => {
      if (done) return;
      done = true;
      if (save) {
        const v = input.value.trim();
        if (v !== '') {
          const n = Math.max(0, Math.min(max, Math.round(Number(v))));
          if (Number.isFinite(n)) {
            ajaxMark(cell, { fraction: n / max });
            return;
          }
        }
      }
      cell.innerHTML = original;
    };
    input.addEventListener('blur', () => finish(true));
    input.addEventListener('keydown', (k) => {
      if (k.key === 'Enter') {
        k.preventDefault();
        input.blur();
      } else if (k.key === 'Escape') {
        k.preventDefault();
        finish(false);
      }
    });
  }

  document.addEventListener('click', (e) => {
    const cell = e.target.closest('.n-of-m-cell');
    if (!cell || cell.querySelector('input')) return;
    const direction = e.shiftKey ? 'down' : 'up';
    if (cell._clickTimer) clearTimeout(cell._clickTimer);
    cell._clickTimer = setTimeout(() => {
      cell._clickTimer = null;
      ajaxMark(cell, { direction });
    }, DBLCLICK_MS);
  });

  document.addEventListener('dblclick', (e) => {
    const cell = e.target.closest('.n-of-m-cell');
    if (!cell || cell.querySelector('input')) return;
    if (cell._clickTimer) {
      clearTimeout(cell._clickTimer);
      cell._clickTimer = null;
    }
    openEditor(cell);
  });

  document.addEventListener('contextmenu', (e) => {
    const cell = e.target.closest('.n-of-m-cell');
    if (!cell || cell.querySelector('input')) return;
    e.preventDefault();
    if (cell._clickTimer) {
      clearTimeout(cell._clickTimer);
      cell._clickTimer = null;
    }
    ajaxMark(cell, { direction: 'down' });
  });
})();
