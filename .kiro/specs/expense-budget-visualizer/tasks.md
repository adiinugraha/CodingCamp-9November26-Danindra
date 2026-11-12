# Implementation Plan: Expense & Budget Visualizer

## Overview

Implement the Expense & Budget Visualizer as three files (`index.html`, `css/style.css`, `js/app.js`) following the unidirectional data-flow architecture defined in the design. Work proceeds layer by layer: file structure → StorageService → State layer → UI components → wiring and integration. Property-based tests use fast-check and unit tests use Vitest with jsdom.

## Tasks

- [x] 1. Create project file structure and HTML entry point
  - Create `index.html` at the project root with the full page skeleton: `<head>` loading `css/style.css` via `<link>`, and `<script src="js/app.js">` before `</body>`
  - Add all required DOM anchor elements: `#expense-form`, `#item-name`, `#amount`, `#category`, `#transaction-list`, `#balance-display`, `#pie-chart-canvas`, and a placeholder for the warning banner
  - Load Chart.js from CDN inside `<head>` with a `defer` attribute
  - Create empty `css/style.css` under `css/` and empty `js/app.js` under `js/`
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 2. Implement StorageService and browser compatibility guard
  - [x] 2.1 Implement `StorageService` in `js/app.js`
    - Write `StorageService.isAvailable()` — checks `localStorage`, `crypto.randomUUID`, and `DOMContentLoaded` support
    - Write `StorageService.load()` — reads key `"expense_transactions"`, JSON-parses, validates each item against the Transaction schema, returns `Transaction[]` or `null` on any error
    - Write `StorageService.save(list)` — JSON-serializes and writes to `"expense_transactions"`, returns `boolean`
    - On init, if `isAvailable()` is false for any required API, render a "browser not supported" message and halt
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.2, 6.4_

  - [ ]* 2.2 Write property test for serialization round-trip (Property 1)
    - **Property 1: Serialization round-trip preserves transactions**
    - Use fast-check to generate arbitrary valid `Transaction[]` arrays; assert `JSON.parse(JSON.stringify(list))` deep-equals the original
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**

  - [ ]* 2.3 Write unit tests for StorageService
    - Test `load()` with valid JSON, malformed JSON, unavailable storage (mocked `localStorage`)
    - Test `save()` with quota exceeded error (mocked `localStorage.setItem` throwing `DOMException`)
    - _Requirements: 5.4, 5.5_

- [x] 3. Implement State layer (addTransaction / deleteTransaction)
  - [x] 3.1 Implement the `state` object and mutation functions
    - Define `const state = { transactions: [] }` as the single in-memory source of truth
    - Implement `addTransaction(transaction)`: appends to `state.transactions`, calls `StorageService.save()`, triggers all render functions; if `save()` returns `false`, roll back and show inline error
    - Implement `deleteTransaction(id)`: filters `state.transactions`, calls `StorageService.save()`, triggers all render functions; if `save()` returns `false`, roll back and show inline error
    - _Requirements: 1.2, 1.6, 2.5, 2.6, 5.1, 5.2_

  - [ ]* 3.2 Write property test for addTransaction (Property 5)
    - **Property 5: Adding a transaction grows the list by exactly one**
    - Generate arbitrary valid transaction and existing list; assert post-add length equals pre-add length + 1 and list contains the new transaction
    - **Validates: Requirements 1.2, 2.1**

  - [ ]* 3.3 Write property test for deleteTransaction (Property 6)
    - **Property 6: Deleting a transaction removes exactly that transaction**
    - Generate a non-empty list; pick a random id; assert post-delete length equals pre-delete length − 1 and the deleted id is absent
    - **Validates: Requirements 2.5**

- [x] 4. Implement input validation logic
  - [x] 4.1 Implement the validation functions
    - `validateItemName(value)`: trims whitespace; rejects empty string or length outside 1–100; returns `{ valid, message }`
    - `validateAmount(value)`: rejects non-numeric, NaN, < 0.01, > 999,999,999.99; returns `{ valid, message }`
    - `validateCategory(value)`: rejects values not in `["Food", "Transport", "Fun"]`; returns `{ valid, message }`
    - _Requirements: 1.1, 1.3, 1.4_

  - [ ]* 4.2 Write property test for whitespace/invalid item names (Property 2)
    - **Property 2: Whitespace and invalid item names are rejected**
    - Generate strings of pure whitespace or empty strings; assert `validateItemName` always returns `valid: false`
    - **Validates: Requirements 1.3**

  - [ ]* 4.3 Write property test for out-of-range amounts (Property 3)
    - **Property 3: Out-of-range amounts are rejected**
    - Generate values < 0.01, > 999,999,999.99, and non-numeric; assert `validateAmount` always returns `valid: false`
    - **Validates: Requirements 1.4**

  - [ ]* 4.4 Write unit tests for validation boundary values
    - `itemName`: length 0, 1, 100, 101; whitespace-only
    - `amount`: 0, 0.01, 999999999.99, 999999999.995, negative, NaN, non-numeric string
    - `category`: valid values, empty string, arbitrary string
    - _Requirements: 1.1, 1.3, 1.4_

- [x] 5. Implement InputForm component
  - [x] 5.1 Bind `#expense-form` and wire submit handler in `js/app.js`
    - Read `#item-name`, `#amount`, `#category` on submit
    - Run all three validation functions; display inline error messages per invalid field; abort if any fail
    - On success, construct a `Transaction` object with `crypto.randomUUID()` id and `new Date().toISOString()` date, call `addTransaction()`, then reset all fields to default
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 6. Implement BalanceDisplay component
  - [x] 6.1 Implement `renderBalance(transactions)` bound to `#balance-display`
    - Sum all `amount` fields; format to exactly 2 decimal places
    - Show `"0.00"` when list is empty
    - Show inline error message if `state` signals a storage read failure
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 6.2 Write property test for balance calculation (Property 4)
    - **Property 4: Balance equals sum of all transaction amounts**
    - Generate arbitrary `Transaction[]`; assert `renderBalance` output equals `amounts.reduce((a, b) => a + b, 0).toFixed(2)`
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

  - [ ]* 6.3 Write unit tests for renderBalance
    - Empty list → `"0.00"`, single item, multiple items with floating-point values
    - _Requirements: 3.1, 3.4_

- [x] 7. Implement TransactionList component
  - [x] 7.1 Implement `renderTransactionList(transactions)` bound to `#transaction-list`
    - Sort by `date` descending before rendering
    - Render each transaction as a list item showing item name, amount formatted as a positive value with two decimal places and currency symbol prefix, category, and date
    - Attach a delete button to each item that calls `deleteTransaction(id)`
    - Show empty-state message when list is empty
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ]* 7.2 Write property test for date sort (Property 9)
    - **Property 9: Transactions are sorted by date descending on render**
    - Generate a list with distinct ISO timestamps; assert each rendered transaction's date ≥ the next one's date
    - **Validates: Requirements 2.2**

  - [ ]* 7.3 Write unit tests for renderTransactionList
    - Already sorted, reverse order, identical timestamps
    - Delete from middle, start, and end of list; non-existent id (no-op)
    - _Requirements: 2.2, 2.5_

- [ ] 8. Checkpoint — Core data flow complete
  - Ensure all tests pass, ask the user if questions arise.

- [~] 9. Implement PieChart component
  - [ ] 9.1 Implement category spending aggregation helper
    - Write `computeCategoryTotals(transactions)` that groups transactions by category and sums amounts per category, returning `{ Food, Transport, Fun }` with only categories that have at least one transaction
    - _Requirements: 4.1, 4.7_

  - [ ]* 9.2 Write property test for category aggregation (Property 8)
    - **Property 8: Category spending aggregation is correct**
    - Generate arbitrary `Transaction[]`; assert sum of all per-category totals equals total balance (no omissions or double-counting)
    - **Validates: Requirements 4.1, 4.7**

  - [ ] 9.3 Implement `renderPieChart(transactions)` bound to `#pie-chart-canvas`
    - Use `computeCategoryTotals` to build labels and data arrays for Chart.js
    - Destroy any existing Chart.js instance before creating a new one
    - Configure tooltips/labels to show category name and percentage rounded to 2 decimal places
    - Show a placeholder message overlay when list is empty (Chart.js absent or no data)
    - If the `Chart` global is absent (CDN failed), show a fallback message in the chart area
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [ ]* 9.4 Write property test for pie chart slice percentages (Property 7)
    - **Property 7: Pie chart slice percentages sum to 100**
    - Generate a non-empty `Transaction[]`; compute slice percentages from `computeCategoryTotals`; assert sum is within ±(0.02 × number of categories) of 100
    - **Validates: Requirements 4.1, 4.6**

  - [ ]* 9.5 Write unit tests for pie chart percentage computation
    - Single category, all three categories, duplicate category names (treated as one combined slice)
    - _Requirements: 4.1, 4.6, 4.7_

- [x] 10. Implement AppController and wire all components
  - [x] 10.1 Implement `init()` in `js/app.js`
    - Run on `DOMContentLoaded`
    - Call `StorageService.isAvailable()`; if false, render "browser not supported" and halt
    - Call `StorageService.load()`; if `null`, initialize `state.transactions = []` and show dismissible warning banner
    - Otherwise populate `state.transactions` from storage
    - Call `renderTransactionList`, `renderBalance`, and `renderPieChart` with initial state
    - _Requirements: 5.4, 5.5, 6.1, 6.3, 6.4_

  - [x] 10.2 Wire Local Storage unavailability warning banner
    - Render an inline dismissible alert (not a modal) when storage is unavailable or data is corrupt on load
    - Attach a close button that removes the banner from the DOM
    - _Requirements: 5.5_

- [x] 11. Apply CSS styling
  - [x] 11.1 Write `css/style.css`
    - Style the page layout: position `Balance_Display` prominently at the top, `Input_Form` below, `Transaction_List` with `overflow-y: scroll` or `auto` for vertical scrolling, and `Pie_Chart` canvas in a defined area
    - Style inline validation error messages, empty-state messages, warning banner, and delete buttons
    - Ensure all UI elements are accessible and render correctly when the page is opened via `file://` protocol
    - _Requirements: 2.4, 6.1, 6.3, 7.1_

- [ ] 12. Final checkpoint — Ensure all tests pass and integration is complete
  - Ensure all tests pass, ask the user if questions arise.
  - Verify the full add → persist → reload → display cycle manually
  - Confirm the app opens correctly via `file://` protocol

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- All implementation is Vanilla JS — no React, Vue, jQuery, Webpack, or Babel
- Property tests use fast-check (CDN/ESM import); unit tests use Vitest with jsdom
- Each property test task references its property number and the requirements it validates
- Checkpoints at tasks 8 and 12 ensure incremental validation before moving forward
- The Chart.js CDN load is the only external dependency; all other APIs are native browser APIs

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1"] },
    { "id": 1, "tasks": ["2.2", "2.3", "3.1"] },
    { "id": 2, "tasks": ["3.2", "3.3", "4.1"] },
    { "id": 3, "tasks": ["4.2", "4.3", "4.4", "5.1"] },
    { "id": 4, "tasks": ["6.1", "7.1", "9.1"] },
    { "id": 5, "tasks": ["6.2", "6.3", "7.2", "7.3", "9.2", "9.3"] },
    { "id": 6, "tasks": ["9.4", "9.5", "10.1"] },
    { "id": 7, "tasks": ["10.2", "11.1"] }
  ]
}
```
