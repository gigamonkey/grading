/**
 * Column filter dropdowns for tables with low-cardinality columns.
 *
 * Usage: Add `data-column-filters` to a <table> and `data-column-filter="<colIndex>"`
 * to each <th> that should be filterable (0-based column index).
 */
(function () {
  function initColumnFilters(table) {
    const headers = Array.from(table.querySelectorAll('th[data-column-filter]'));
    const activeFilters = {}; // colIndex -> Set of selected values, or absent if all selected

    headers.forEach((th) => {
      const colIndex = parseInt(th.getAttribute('data-column-filter'));
      th.style.position = 'relative';
      th.style.cursor = 'pointer';
      th.style.userSelect = 'none';

      const indicator = document.createElement('span');
      indicator.className = 'col-filter-btn';
      indicator.textContent = ' ▾';
      th.appendChild(indicator);

      th.addEventListener('click', (e) => {
        openFilterDropdown(table, th, colIndex);
        e.stopPropagation();
      });
    });

    // Lock column widths at their natural content size to prevent layout shifts.
    // Temporarily switch to auto width so measurements reflect content, not the
    // CSS `table { width: 100% }` rule, then lock everything down with fixed layout.
    const allThs = Array.from(table.querySelectorAll('thead th'));
    table.style.width = 'auto';
    const widths = allThs.map((th) => th.offsetWidth);
    const tableWidth = widths.reduce((a, b) => a + b, 0);
    allThs.forEach((th, i) => (th.style.width = widths[i] + 'px'));
    table.style.tableLayout = 'fixed';

    // Insert a clear-all button just before the table
    const clearBtn = document.createElement('button');
    clearBtn.className = 'col-filter-clear-all';
    clearBtn.textContent = 'Clear filters';
    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      for (const key of Object.keys(activeFilters)) delete activeFilters[key];
      applyFilters(table, activeFilters, headers);
    });
    table.parentNode.insertBefore(clearBtn, table);

    function applyFilters() {
      // Update header indicators
      headers.forEach((th) => {
        const colIndex = parseInt(th.getAttribute('data-column-filter'));
        const btn = th.querySelector('.col-filter-btn');
        if (btn) btn.classList.toggle('col-filter-active', !!activeFilters[colIndex]);
      });

      // Show/hide clear-all button
      clearBtn.style.display = Object.keys(activeFilters).length > 0 ? 'inline-block' : 'none';

      // Show/hide rows
      table.querySelectorAll('tbody tr').forEach((row) => {
        let visible = true;
        for (const [colStr, selectedValues] of Object.entries(activeFilters)) {
          const cell = row.cells[parseInt(colStr)];
          if (cell && !selectedValues.has(cellValue(cell))) {
            visible = false;
            break;
          }
        }
        row.style.display = visible ? '' : 'none';
      });
    }

    // Re-apply filters after HTMX swaps the tbody
    table._columnFilters = { reapply: applyFilters };

    // Close dropdowns on outside click
    document.addEventListener('click', closeDropdowns);

    function closeDropdowns() {
      table.querySelectorAll('.col-filter-dropdown').forEach((d) => d.remove());
    }

    function openFilterDropdown(table, th, colIndex) {
      closeDropdowns();

      // Only show values present in rows that pass all *other* active filters
      const { values: allValues, htmlByValue } = getColumnValues(table, colIndex, activeFilters);
      if (allValues.length === 0) return;

      const dropdown = document.createElement('div');
      dropdown.className = 'col-filter-dropdown';

      const actions = document.createElement('div');
      actions.className = 'col-filter-actions';

      makeBtn(actions, 'All', (e) => {
        e.stopPropagation();
        dropdown.querySelectorAll('input[type=checkbox]').forEach((cb) => (cb.checked = true));
        delete activeFilters[colIndex];
        applyFilters();
      });

      makeBtn(actions, 'Clear all', (e) => {
        e.stopPropagation();
        dropdown.querySelectorAll('input[type=checkbox]').forEach((cb) => (cb.checked = false));
        activeFilters[colIndex] = new Set();
        applyFilters();
      });

      dropdown.appendChild(actions);

      // Add search box for quick select-by-enter
      let searchInput = null;
      {
        searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Search (Enter to select)';
        searchInput.className = 'col-filter-search';
        searchInput.addEventListener('click', (e) => e.stopPropagation());
        searchInput.addEventListener('input', () => {
          const query = searchInput.value.toLowerCase();
          dropdown.querySelectorAll('.col-filter-item').forEach((label) => {
            const cb = label.querySelector('input[type=checkbox]');
            const text = cb ? cb.value.toLowerCase() : label.textContent.toLowerCase();
            label.style.display = text.includes(query) ? '' : 'none';
          });
        });
        searchInput.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            closeDropdowns();
          } else if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            // Select only the visible (matching) items
            const visibleValues = new Set();
            dropdown.querySelectorAll('.col-filter-item').forEach((label) => {
              if (label.style.display !== 'none') {
                const cb = label.querySelector('input[type=checkbox]');
                if (cb) visibleValues.add(cb.value);
              }
            });
            if (visibleValues.size > 0) {
              activeFilters[colIndex] = visibleValues;
              applyFilters();
              closeDropdowns();
            }
          }
        });
        dropdown.appendChild(searchInput);
      }

      allValues.forEach((val) => {
        const label = document.createElement('label');
        label.className = 'col-filter-item';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = val;
        cb.checked = !activeFilters[colIndex] || activeFilters[colIndex].has(val);

        cb.addEventListener('change', (e) => {
          e.stopPropagation();
          if (!activeFilters[colIndex]) {
            activeFilters[colIndex] = new Set(allValues);
          }
          if (cb.checked) {
            activeFilters[colIndex].add(val);
          } else {
            activeFilters[colIndex].delete(val);
          }
          // If all currently-available values are selected, clear the filter
          const { values: currentValues } = getColumnValues(table, colIndex, activeFilters);
          if (currentValues.every((v) => activeFilters[colIndex].has(v))) {
            delete activeFilters[colIndex];
          }
          applyFilters();
        });

        label.appendChild(cb);
        const labelText = document.createElement('span');
        const html = htmlByValue[val];
        const tmp = document.createElement('span');
        tmp.innerHTML = html;
        const visibleText = tmp.textContent.trim();
        labelText.innerHTML = '\u00a0' + (visibleText !== val ? html + ' ' + val : html);
        label.appendChild(labelText);
        dropdown.appendChild(label);
      });

      th.appendChild(dropdown);
      searchInput.focus();
      dropdown.addEventListener('click', (e) => e.stopPropagation());
    }
  }

  function makeBtn(parent, text, handler) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = text;
    btn.addEventListener('click', handler);
    parent.appendChild(btn);
    return btn;
  }

  // Returns unique values for colIndex from rows that pass all active filters
  // except the filter on colIndex itself (so the dropdown shows what's available).
  function cellValue(cell) {
    return (cell.hasAttribute('data-filter-value') ? cell.getAttribute('data-filter-value') : cell.textContent).trim();
  }

  function getColumnValues(table, colIndex, activeFilters) {
    const valueHtml = {}; // filterValue -> innerHTML of first matching cell
    table.querySelectorAll('tbody tr').forEach((row) => {
      for (const [colStr, selectedValues] of Object.entries(activeFilters)) {
        if (parseInt(colStr) === colIndex) continue;
        const cell = row.cells[parseInt(colStr)];
        if (cell && !selectedValues.has(cellValue(cell))) return;
      }
      const cell = row.cells[colIndex];
      if (cell) {
        const val = cellValue(cell);
        if (!(val in valueHtml)) valueHtml[val] = cell.innerHTML.trim();
      }
    });
    const sorted = Object.keys(valueHtml).sort();
    return { values: sorted, htmlByValue: valueHtml };
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('table[data-column-filters]').forEach(initColumnFilters);
  });

  // Re-apply filters after HTMX swaps tbody content
  document.addEventListener('htmx:afterSwap', (e) => {
    const target = e.target;
    const table =
      (target.tagName === 'TBODY' ? target.closest('table') : null) ||
      target.querySelector('table[data-column-filters]');
    if (table && table._columnFilters) {
      table._columnFilters.reapply();
    }
  });
})();
