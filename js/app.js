/**
 * Expense & Budget Visualizer
 * js/app.js — Vanilla JavaScript, no build toolchain, no imports.
 */

/* ============================================================
   CONSTANTS
   ============================================================ */

const STORAGE_KEY = 'expense_transactions';
const VALID_CATEGORIES = ['Food', 'Transport', 'Fun'];

/* ============================================================
   STORAGE SERVICE
   Responsible for all localStorage interactions.
   ============================================================ */

const StorageService = (function () {

  /**
   * Checks that all APIs required by the app are available:
   *   - localStorage (may throw in private/restricted mode)
   *   - crypto.randomUUID
   *   - document.addEventListener (DOMContentLoaded support)
   *
   * @returns {boolean}
   */
  function isAvailable() {
    // Check document / DOMContentLoaded support
    if (typeof document === 'undefined' || typeof document.addEventListener !== 'function') {
      return false;
    }

    // Check crypto.randomUUID
    if (
      typeof crypto === 'undefined' ||
      typeof crypto.randomUUID !== 'function'
    ) {
      return false;
    }

    // Check localStorage (may throw in some private-browsing modes)
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
    } catch (e) {
      return false;
    }

    return true;
  }

  /**
   * Validates a single item against the Transaction schema.
   *
   * Schema:
   *   id        — non-empty string
   *   itemName  — string, 1–100 chars after trim
   *   amount    — number, 0.01 ≤ value ≤ 999_999_999.99
   *   category  — "Food" | "Transport" | "Fun"
   *   date      — non-empty string (ISO 8601)
   *
   * @param {unknown} item
   * @returns {boolean}
   */
  function isValidTransaction(item) {
    if (!item || typeof item !== 'object') return false;

    // id: non-empty string
    if (typeof item.id !== 'string' || item.id.trim().length === 0) return false;

    // itemName: string, 1–100 chars after trim
    if (typeof item.itemName !== 'string') return false;
    const trimmedName = item.itemName.trim();
    if (trimmedName.length < 1 || trimmedName.length > 100) return false;

    // amount: number, 0.01–999_999_999.99
    if (typeof item.amount !== 'number' || isNaN(item.amount)) return false;
    if (item.amount < 0.01 || item.amount > 999999999.99) return false;

    // category: one of the three valid values
    if (!VALID_CATEGORIES.includes(item.category)) return false;

    // date: non-empty string
    if (typeof item.date !== 'string' || item.date.trim().length === 0) return false;

    return true;
  }

  /**
   * Reads and validates transaction data from localStorage.
   *
   * @returns {Array|null} Transaction[] on success, null on any error.
   */
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      // Key not present — treat as empty list
      if (raw === null) return [];

      const parsed = JSON.parse(raw);

      // Must be an array
      if (!Array.isArray(parsed)) return null;

      // Validate every item; fail the whole load if any item is invalid
      for (let i = 0; i < parsed.length; i++) {
        if (!isValidTransaction(parsed[i])) return null;
      }

      return parsed;
    } catch (e) {
      // JSON parse error, localStorage unavailable, or any other error
      return null;
    }
  }

  /**
   * Serializes and writes the transaction list to localStorage.
   *
   * @param {Array} list  Transaction[]
   * @returns {boolean} true on success, false on any error.
   */
  function save(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      return true;
    } catch (e) {
      // Quota exceeded (DOMException) or storage unavailable
      return false;
    }
  }

  return { isAvailable, load, save };
}());

/* ============================================================
   STATE
   Single in-memory source of truth for all transactions.
   ============================================================ */

const state = {
  transactions: [],
  storageError: false   // set to true when storage is unavailable / data is corrupt on load
};

/* ============================================================
   APP CONTROLLER
   init() bootstraps the application on DOMContentLoaded:
     1. Guards against unsupported browsers
     2. Loads persisted transactions from storage
     3. Shows a dismissible warning if storage is unavailable/corrupt
     4. Populates in-memory state and renders all UI components
   ============================================================ */

/**
 * Shows the warning banner with the given message.
 * The banner persists until the user clicks the close button.
 *
 * @param {string} message
 */
function showWarningBanner(message) {
  const banner  = document.getElementById('warning-banner');
  const msgEl   = document.getElementById('warning-message');
  const closeEl = document.getElementById('warning-close');

  if (!banner || !msgEl || !closeEl) return;

  msgEl.textContent = message;
  banner.hidden = false;

  // Attach close handler (once — replace any prior listener by cloning)
  const freshClose = closeEl.cloneNode(true);
  closeEl.parentNode.replaceChild(freshClose, closeEl);
  freshClose.addEventListener('click', function () {
    banner.hidden = true;
  });
}

/**
 * Bootstraps the application.
 *
 * Steps:
 *   1. Check browser compatibility via StorageService.isAvailable().
 *      If unavailable, render an accessible error and halt.
 *   2. Load persisted transactions via StorageService.load().
 *      If null (parse error / unavailable), initialise with empty state
 *      and show a dismissible warning banner.
 *   3. Populate state.transactions from storage.
 *   4. Render Transaction_List, Balance_Display, and Pie_Chart.
 *   5. Wire the InputForm submit handler.
 *
 * Requirements: 5.4, 5.5, 6.1, 6.3, 6.4
 */
function init() {
  // ── Step 1: Browser compatibility guard ──────────────────────────────────
  if (!StorageService.isAvailable()) {
    document.body.innerHTML = '';
    const msg = document.createElement('p');
    msg.setAttribute('role', 'alert');
    msg.textContent = 'Browser not supported. Please upgrade to a modern browser.';
    document.body.appendChild(msg);
    return; // halt — do not wire anything else
  }

  // ── Step 2: Load persisted transactions ──────────────────────────────────
  const loaded = StorageService.load();

  if (loaded === null) {
    // Storage unavailable or data is corrupt — start fresh and warn the user
    state.transactions = [];
    state.storageError = true;
    showWarningBanner(
      'Your saved data could not be loaded (storage unavailable or data is corrupt). ' +
      'Starting with an empty transaction list.'
    );
  } else {
    // ── Step 3: Populate in-memory state ─────────────────────────────────
    state.transactions = loaded;
    state.storageError = false;
  }

  // ── Step 4: Render all UI components ─────────────────────────────────────
  renderTransactionList(state.transactions);
  renderBalance(state.transactions);
  renderPieChart(state.transactions);

  // ── Step 5: Wire the InputForm submit handler ─────────────────────────────
  const form = document.getElementById('expense-form');

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    // Read field values
    const itemNameValue = document.getElementById('item-name').value;
    const amountValue   = document.getElementById('amount').value;
    const categoryValue = document.getElementById('category').value;

    // Clear previous inline errors
    document.getElementById('item-name-error').textContent = '';
    document.getElementById('amount-error').textContent    = '';
    document.getElementById('category-error').textContent  = '';

    // Validate all three fields
    const nameResult     = validateItemName(itemNameValue);
    const amountResult   = validateAmount(amountValue);
    const categoryResult = validateCategory(categoryValue);

    let hasError = false;

    if (!nameResult.valid) {
      document.getElementById('item-name-error').textContent = nameResult.message;
      hasError = true;
    }
    if (!amountResult.valid) {
      document.getElementById('amount-error').textContent = amountResult.message;
      hasError = true;
    }
    if (!categoryResult.valid) {
      document.getElementById('category-error').textContent = categoryResult.message;
      hasError = true;
    }

    // Abort if any field failed validation
    if (hasError) return;

    // Build and persist the new transaction
    const transaction = {
      id:       crypto.randomUUID(),
      itemName: itemNameValue.trim(),
      amount:   Number(amountValue),
      category: categoryValue,
      date:     new Date().toISOString()
    };

    addTransaction(transaction);

    // Reset form fields
    document.getElementById('item-name').value = '';
    document.getElementById('amount').value    = '';
    document.getElementById('category').value  = '';

    document.getElementById('item-name-error').textContent = '';
    document.getElementById('amount-error').textContent    = '';
    document.getElementById('category-error').textContent  = '';
  });
}

// ── Entry point ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);

/* ============================================================
   INLINE ERROR HELPER
   Injects a dismissible error <div> inside the given element.
   Does not replace existing content — appends after it.
   ============================================================ */

/**
 * @param {string} containerId  — id of the host element (without #)
 * @param {string} message      — human-readable error text
 */
function showInlineError(containerId, message) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const errorDiv = document.createElement('div');
  errorDiv.setAttribute('role', 'alert');
  errorDiv.style.cssText = 'color:#c0392b;background:#fdecea;border:1px solid #e74c3c;border-radius:4px;padding:8px 12px;margin-top:8px;display:flex;justify-content:space-between;align-items:center;';

  const text = document.createElement('span');
  text.textContent = message;

  const dismiss = document.createElement('button');
  dismiss.textContent = '×';
  dismiss.setAttribute('aria-label', 'Dismiss error');
  dismiss.style.cssText = 'background:none;border:none;cursor:pointer;font-size:1.2rem;line-height:1;padding:0 0 0 12px;color:inherit;';
  dismiss.addEventListener('click', function () {
    errorDiv.remove();
  });

  errorDiv.appendChild(text);
  errorDiv.appendChild(dismiss);
  container.appendChild(errorDiv);
}

/* ============================================================
   VALIDATION
   Each function returns { valid: boolean, message: string }.
   On success: valid === true, message === "".
   On failure: valid === false, message describes the problem.
   ============================================================ */

/**
 * Validates an item name value.
 * Rules: must be a string; trimmed length must be 1–100 characters.
 *
 * @param {unknown} value
 * @returns {{ valid: boolean, message: string }}
 */
function validateItemName(value) {
  if (typeof value !== 'string') {
    return { valid: false, message: 'Item name is required.' };
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return { valid: false, message: 'Item name is required.' };
  }
  if (trimmed.length > 100) {
    return { valid: false, message: 'Item name must be 100 characters or fewer.' };
  }
  return { valid: true, message: '' };
}

/**
 * Validates an amount value.
 * Rules: must be numeric (number type or numeric string); not NaN;
 *        0.01 ≤ value ≤ 999,999,999.99.
 *
 * @param {unknown} value
 * @returns {{ valid: boolean, message: string }}
 */
function validateAmount(value) {
  const num = Number(value);
  if (value === '' || value === null || value === undefined || isNaN(num)) {
    return { valid: false, message: 'Amount must be a positive number.' };
  }
  if (num < 0.01) {
    return { valid: false, message: 'Amount must be at least 0.01.' };
  }
  if (num > 999999999.99) {
    return { valid: false, message: 'Amount must be no greater than 999,999,999.99.' };
  }
  return { valid: true, message: '' };
}

/**
 * Validates a category value.
 * Rules: must be one of "Food", "Transport", or "Fun".
 *
 * @param {unknown} value
 * @returns {{ valid: boolean, message: string }}
 */
function validateCategory(value) {
  if (!VALID_CATEGORIES.includes(value)) {
    return { valid: false, message: 'Please select a valid category: Food, Transport, or Fun.' };
  }
  return { valid: true, message: '' };
}

/* ============================================================
   RENDER STUBS
   Placeholder implementations filled out in later tasks.
   ============================================================ */

/**
 * Renders the transaction list into #transaction-list.
 *
 * - Sorts by date descending (newest first) without mutating the input array.
 * - Shows an empty-state message when there are no transactions.
 * - Each item shows name, amount, category, date, and a delete button.
 *
 * @param {Array} transactions  — Transaction[]
 *
 * Requirements: 2.1, 2.2, 2.3, 2.5
 */
function renderTransactionList(transactions) {
  const listEl = document.getElementById('transaction-list');
  if (!listEl) return;

  // Clear existing contents
  listEl.innerHTML = '';

  // Empty state (Requirement 2.3)
  if (transactions.length === 0) {
    const emptyLi = document.createElement('li');
    emptyLi.className = 'empty-state';
    emptyLi.textContent = 'No transactions recorded yet.';
    listEl.appendChild(emptyLi);
    return;
  }

  // Sort descending by date — do not mutate the original array (Requirement 2.2)
  const sorted = transactions.slice().sort(function (a, b) {
    return new Date(b.date) - new Date(a.date);
  });

  // Render each transaction (Requirements 2.1, 2.5)
  sorted.forEach(function (transaction) {
    const li = document.createElement('li');
    li.className = 'transaction-item';
    li.setAttribute('data-id', transaction.id);

    const nameSpan = document.createElement('span');
    nameSpan.className = 'transaction-name';
    nameSpan.textContent = transaction.itemName;

    const amountSpan = document.createElement('span');
    amountSpan.className = 'transaction-amount';
    amountSpan.textContent = '$' + transaction.amount.toFixed(2);

    const categorySpan = document.createElement('span');
    categorySpan.className = 'transaction-category';
    categorySpan.textContent = transaction.category;

    const dateSpan = document.createElement('span');
    dateSpan.className = 'transaction-date';
    dateSpan.textContent = new Date(transaction.date).toLocaleDateString();

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.setAttribute('aria-label', 'Delete ' + transaction.itemName);
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', function () {
      deleteTransaction(transaction.id);
    });

    li.appendChild(nameSpan);
    li.appendChild(amountSpan);
    li.appendChild(categorySpan);
    li.appendChild(dateSpan);
    li.appendChild(deleteBtn);

    listEl.appendChild(li);
  });
}

/**
 * Renders the total balance into #balance-display.
 *
 * - Sums all `transaction.amount` values and formats to 2 decimal places.
 * - Shows "0.00" when the list is empty or the sum is zero.
 * - Shows an inline error message when `state.storageError` is truthy.
 *
 * @param {Array} transactions  — Transaction[]
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */
function renderBalance(transactions) {
  const amountEl = document.getElementById('balance-amount');
  if (!amountEl) return;

  // Requirement 3.5: storage read failure takes priority
  if (state.storageError) {
    amountEl.textContent = 'Balance unavailable — storage error';
    amountEl.setAttribute('aria-label', 'Balance unavailable due to storage error');
    return;
  }

  // Requirements 3.1, 3.4: sum amounts, default to 0.00
  const total = transactions.reduce(function (sum, t) {
    return sum + t.amount;
  }, 0);

  amountEl.textContent = total.toFixed(2);
  amountEl.setAttribute('aria-label', 'Total balance: ' + total.toFixed(2));
}

/* ============================================================
   PIE CHART HELPERS
   ============================================================ */

/**
 * Groups transactions by category and sums the amounts per category.
 * Only categories with at least one transaction are included in the result.
 *
 * @param {Array} transactions  — Transaction[]
 * @returns {{ Food?: number, Transport?: number, Fun?: number }}
 *   An object whose keys are category names and values are the summed
 *   amounts for that category.  Keys for categories with no transactions
 *   are omitted entirely.
 *
 * Requirements: 4.1, 4.7
 */
function computeCategoryTotals(transactions) {
  const totals = {};

  for (let i = 0; i < transactions.length; i++) {
    const t = transactions[i];
    if (Object.prototype.hasOwnProperty.call(totals, t.category)) {
      totals[t.category] += t.amount;
    } else {
      totals[t.category] = t.amount;
    }
  }

  return totals;
}

/**
 * Module-level reference to the active Chart.js instance.
 * Destroyed and replaced each time renderPieChart is called with data.
 * @type {Chart|null}
 */
let pieChartInstance = null;

/**
 * Renders a pie chart into #pie-chart-canvas using Chart.js.
 *
 * Behaviour:
 *  - If Chart global is absent (CDN failed): show fallback message, hide canvas.
 *  - If transactions is empty / no category totals: destroy any existing chart,
 *    show the placeholder, hide the canvas.
 *  - Otherwise: hide placeholder, show canvas, destroy prior instance, draw chart.
 *    Tooltips and legend labels show "CategoryName — XX.XX%" of total spending.
 *
 * @param {Array} transactions  — Transaction[]
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 */
function renderPieChart(transactions) {
  const canvas      = document.getElementById('pie-chart-canvas');
  const placeholder = document.getElementById('pie-chart-placeholder');

  if (!canvas || !placeholder) return;

  // Helper: destroy any existing Chart.js instance and clean up the canvas
  function destroyExistingChart() {
    if (pieChartInstance !== null) {
      pieChartInstance.destroy();
      pieChartInstance = null;
    }
  }

  // Helper: show placeholder, hide canvas
  function showPlaceholder(message) {
    destroyExistingChart();
    placeholder.textContent = message;
    placeholder.hidden = false;
    canvas.hidden = true;
  }

  // ── Guard: Chart.js CDN failed to load ──────────────────────────────────
  if (typeof Chart === 'undefined') {
    showPlaceholder('Chart unavailable — please check your connection.');
    return;
  }

  // ── Compute category totals ──────────────────────────────────────────────
  const totals   = computeCategoryTotals(transactions);
  const labels   = Object.keys(totals);

  if (labels.length === 0) {
    showPlaceholder('No spending data available.');
    return;
  }

  // ── Build data arrays ────────────────────────────────────────────────────
  const grandTotal = labels.reduce(function (sum, label) {
    return sum + totals[label];
  }, 0);

  const data = labels.map(function (label) {
    return totals[label];
  });

  // Percentage per category, rounded to 2 decimal places (Requirement 4.1, 4.6)
  const percentages = labels.map(function (label) {
    return Math.round((totals[label] / grandTotal) * 10000) / 100; // round to 2dp
  });

  // Category colour palette — matches the pill colours used in the transaction list
  const CATEGORY_COLOURS = {
    Food:      '#16a34a',
    Transport: '#2563eb',
    Fun:       '#9333ea'
  };
  const DEFAULT_COLOUR = '#6b7280';

  const backgroundColors = labels.map(function (label) {
    return CATEGORY_COLOURS[label] || DEFAULT_COLOUR;
  });

  // ── Destroy prior chart instance ─────────────────────────────────────────
  destroyExistingChart();

  // ── Show canvas, hide placeholder ────────────────────────────────────────
  canvas.hidden = false;
  placeholder.hidden = true;

  // ── Create new Chart.js pie chart ────────────────────────────────────────
  const ctx = canvas.getContext('2d');

  pieChartInstance = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: backgroundColors,
        borderColor: '#ffffff',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        // Legend: show "CategoryName — XX.XX%" per slice (Requirement 4.6)
        legend: {
          position: 'bottom',
          labels: {
            font: { size: 13 },
            padding: 16,
            generateLabels: function (chart) {
              return chart.data.labels.map(function (label, index) {
                const pct = percentages[index];
                return {
                  text: label + ' \u2014 ' + pct.toFixed(2) + '%',
                  fillStyle: backgroundColors[index],
                  strokeStyle: '#ffffff',
                  lineWidth: 2,
                  hidden: false,
                  index: index
                };
              });
            }
          }
        },
        // Tooltip: show "CategoryName: XX.XX%" on hover (Requirement 4.6)
        tooltip: {
          callbacks: {
            label: function (context) {
              const label = context.label || '';
              const pct   = percentages[context.dataIndex];
              return ' ' + label + ': ' + pct.toFixed(2) + '%';
            }
          }
        }
      }
    }
  });
}

/* ============================================================
   STATE MUTATION FUNCTIONS
   Every mutation follows the same pattern:
     1. Apply the change to state.transactions
     2. Persist via StorageService.save()
     3. On failure: roll back + show inline error
     4. On success: trigger all render functions
   ============================================================ */

/**
 * Appends a transaction to state and persists it.
 *
 * @param {Object} transaction  — validated Transaction object
 */
function addTransaction(transaction) {
  state.transactions.push(transaction);

  const saved = StorageService.save(state.transactions);

  if (!saved) {
    // Roll back: remove the item we just pushed
    state.transactions.pop();
    showInlineError('transaction-list', 'Unable to save transaction. Storage may be full or unavailable.');
    return;
  }

  renderTransactionList(state.transactions);
  renderBalance(state.transactions);
  renderPieChart(state.transactions);
}

/**
 * Removes the transaction with the given id from state and persists the change.
 *
 * @param {string} id  — UUID of the transaction to remove
 */
function deleteTransaction(id) {
  const previous = state.transactions.slice(); // snapshot for rollback

  state.transactions = state.transactions.filter(function (t) {
    return t.id !== id;
  });

  const saved = StorageService.save(state.transactions);

  if (!saved) {
    // Roll back: restore previous list
    state.transactions = previous;
    showInlineError('transaction-list', 'Unable to delete transaction. Storage may be full or unavailable.');
    return;
  }

  renderTransactionList(state.transactions);
  renderBalance(state.transactions);
  renderPieChart(state.transactions);
}
