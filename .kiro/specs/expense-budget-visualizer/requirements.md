# Requirements Document

## Introduction

The Expense & Budget Visualizer is a client-side web application that allows users to track personal expenses by category, view a running balance, and visualize spending distribution through an interactive pie chart. The application runs entirely in the browser with no backend server, using HTML, CSS, and Vanilla JavaScript. All data is persisted via the browser's Local Storage API.

## Glossary

- **App**: The Expense & Budget Visualizer web application.
- **Transaction**: A single expense record consisting of an item name, an amount, and a category.
- **Category**: One of three predefined spending labels — Food, Transport, or Fun.
- **Transaction_List**: The scrollable UI component that displays all recorded transactions.
- **Input_Form**: The UI form component used to enter and submit a new transaction.
- **Balance_Display**: The UI component at the top of the page that shows the computed total of all transaction amounts.
- **Pie_Chart**: The visual chart component that displays the spending distribution across categories.
- **Local_Storage**: The browser's Web Storage API used to persist transaction data client-side.
- **Chart_Library**: A third-party charting library (e.g., Chart.js) used to render the Pie_Chart.

---

## Requirements

### Requirement 1: Input Form

**User Story:** As a user, I want to enter an expense using a form with an item name, amount, and category, so that I can record my spending quickly.

#### Acceptance Criteria

1. THE Input_Form SHALL provide a text field for the item name accepting 1 to 100 characters, a numeric field for the amount, and a dropdown selector containing exactly the options Food, Transport, and Fun.
2. WHEN the user submits the Input_Form with all fields filled, THE App SHALL add a new Transaction to the Transaction_List and persist it to Local_Storage within 1 second.
3. WHEN the user submits the Input_Form with one or more fields empty, THE Input_Form SHALL display a validation error message indicating which specific fields are required and SHALL NOT add a Transaction to the Transaction_List.
4. WHEN the user submits the Input_Form with an amount value that is not a positive number between 0.01 and 999,999,999.99, THE Input_Form SHALL display a validation error message indicating the amount must be a positive number and SHALL NOT add a Transaction.
5. WHEN a Transaction is successfully added, THE Input_Form SHALL reset the item name field to empty, the amount field to empty, and the dropdown selector to its default unselected state.
6. IF Local_Storage is unavailable when the user submits the Input_Form, THEN THE App SHALL display an error message indicating the Transaction could not be saved and SHALL NOT add the Transaction to the Transaction_List.

---

### Requirement 2: Transaction List

**User Story:** As a user, I want to see all my recorded transactions in a scrollable list, so that I can review my spending history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display each Transaction with its item name, amount formatted as a positive value with two decimal places prefixed by the currency symbol, category, and date.
2. WHILE transactions exist in Local_Storage, THE Transaction_List SHALL render all stored transactions sorted by date in descending order on page load.
3. IF no transactions exist in Local_Storage, THEN THE Transaction_List SHALL display a message indicating that no transactions have been recorded.
4. THE Transaction_List SHALL scroll vertically when the number of displayed transactions exceeds the visible height of the list container.
5. WHEN the user clicks the delete control on a Transaction, THE App SHALL remove that Transaction from the Transaction_List display and from Local_Storage.
6. IF the delete operation fails to update Local_Storage, THEN THE App SHALL retain the Transaction in the Transaction_List and display an error message indicating the deletion was unsuccessful.

---

### Requirement 3: Total Balance Display

**User Story:** As a user, I want to see my total spending displayed prominently at the top of the page, so that I always know how much I have spent.

#### Acceptance Criteria

1. THE Balance_Display SHALL show the sum of all Transaction amounts currently stored in Local_Storage, formatted as a numeric value with exactly 2 decimal places.
2. WHEN a Transaction is added, THE Balance_Display SHALL update to reflect the new total within 500 milliseconds without requiring a page reload.
3. WHEN a Transaction is deleted, THE Balance_Display SHALL update to reflect the new total within 500 milliseconds without requiring a page reload.
4. WHILE no transactions exist in Local_Storage, THE Balance_Display SHALL show a total of 0.00.
5. IF Local_Storage is unavailable or returns a read error, THEN THE Balance_Display SHALL show an error message indicating that the balance cannot be loaded.

---

### Requirement 4: Visual Pie Chart

**User Story:** As a user, I want to see a pie chart showing how my spending is distributed across categories, so that I can understand where my money is going.

#### Acceptance Criteria

1. THE Pie_Chart SHALL display each Category that has at least one Transaction as a distinct slice, where each slice's arc length represents that Category's percentage of total spending, calculated as (sum of Transaction amounts in Category / sum of all Transaction amounts) × 100, rounded to two decimal places.
2. WHEN a Transaction is added, THE Pie_Chart SHALL update to reflect the new spending distribution without requiring a page reload, within 500 milliseconds of the Transaction being confirmed.
3. WHEN a Transaction is deleted, THE Pie_Chart SHALL update to reflect the new spending distribution without requiring a page reload, within 500 milliseconds of the Transaction being removed.
4. WHILE no transactions exist, THE Pie_Chart SHALL display a placeholder message indicating no spending data is available, occupying the same area as the chart.
5. THE App SHALL render the Pie_Chart using the Chart_Library loaded from a CDN or bundled script, with no backend dependency.
6. THE Pie_Chart SHALL display a visible label or tooltip for each slice showing the Category name and its percentage of total spending, where the percentage is rounded to two decimal places.
7. IF two or more Categories share the same name, THEN THE Pie_Chart SHALL treat them as a single combined slice, summing their Transaction amounts before calculating the slice proportion.

---

### Requirement 5: Data Persistence

**User Story:** As a user, I want my transactions to be saved between sessions, so that I do not lose my data when I close or refresh the browser.

#### Acceptance Criteria

1. WHEN a Transaction is added, THE App SHALL serialize and write the updated transaction list to Local_Storage.
2. WHEN a Transaction is deleted, THE App SHALL serialize and write the updated transaction list to Local_Storage.
3. WHEN a Transaction is edited, THE App SHALL serialize and write the updated transaction list to Local_Storage.
4. WHEN the App initializes, THE App SHALL deserialize and load all transactions from Local_Storage before rendering the Transaction_List, Balance_Display, and Pie_Chart.
5. IF Local_Storage is unavailable, returns a parse error, or contains data that does not conform to the expected transaction structure, THEN THE App SHALL initialize with an empty transaction list and display a warning message that does not prevent the user from interacting with the App, persisting until the user dismisses it.

---

### Requirement 6: Browser Compatibility

**User Story:** As a user, I want the application to work reliably across modern browsers, so that I can use it regardless of my preferred browser.

#### Acceptance Criteria

1. THE App SHALL render all UI elements and execute all features without errors in the latest stable release of Chrome, Firefox, Edge, and Safari at the time of testing.
2. THE App SHALL use only Web APIs that are natively supported across Chrome, Firefox, Edge, and Safari latest stable releases, without requiring polyfills, transpilers, or build tools.
3. THE App SHALL be usable as a standalone HTML file opened directly in the browser via the `file://` protocol and when served from a local or remote web server via the `http://` or `https://` protocol.
4. IF a browser does not support a Web API used by the App, THEN THE App SHALL display an error message indicating that the browser is not supported, without crashing or producing a blank page.

---

### Requirement 7: Code and File Structure

**User Story:** As a developer, I want the project to follow a clean single-file-per-type structure, so that the codebase is easy to read and maintain.

#### Acceptance Criteria

1. THE App SHALL contain exactly one CSS file located at `css/style.css` and no other `.css` files in the project.
2. THE App SHALL contain exactly one JavaScript file located at `js/app.js` and no other `.js` files in the project.
3. THE App SHALL contain exactly one HTML entry point file at the project root, which loads `css/style.css` via a `<link>` tag in the `<head>` and loads `js/app.js` via a `<script>` tag placed before the closing `</body>` tag.
4. THE App SHALL use Vanilla JavaScript with no frontend framework, library, bundler, or transpiler dependencies, including but not limited to React, Vue, Angular, jQuery, Webpack, and Babel.
