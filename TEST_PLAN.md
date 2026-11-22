# 📋 Quality Assurance Test Plan: Mini Checkout & Browser Test Suite
**Track:** SDET Intern — Fynd Hiring Hackathon (Nov 2026)  
**Project:** QuickStore Mini Checkout Single-Page Application  
**Target Platform:** Modern Web Browsers (Chromium / Desktop Web)  
**Automation Framework:** Playwright (@playwright/test)  

---

## 1. Executive Summary & Objectives
The goal of this test plan is to establish end-to-end quality assurance for the QuickStore single-page checkout flow. Customers must experience:
1. Accurate, real-time pricing and line-item calculation.
2. Clear validation feedback when required details are missing, without losing entered data.
3. A single, distinct, and unambiguous order confirmation reference upon successful checkout.
4. Robust resilience against common human errors (empty cart submission, rapid double-clicking).

---

## 2. Key Checkout Risks & Priority Matrix

| Risk ID | Risk Description | Severity | Probability | Priority | Mitigation / Test Approach |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RSK-01** | **Incorrect Totals / Math Errors**<br>Line totals or grand total calculate incorrectly when items are added, incremented, or decremented. | Critical | Medium | **P0** | Automated boundary and calculation tests verifying floating-point precision on every quantity change. |
| **RSK-02** | **Duplicate Order Confirmation / Double-Click**<br>Customer clicks "Place Order" twice rapidly, resulting in duplicate confirmations, duplicate order IDs, or double charging. | Critical | High | **P0** | Synchronous submit-locking (`isSubmitting = true`) + immediate button disabling. Automated concurrent click test. |
| **RSK-03** | **Missing Required Field Submission**<br>Customer submits order without entering their Full Name. | High | High | **P0** | Form validation intercepting submission, highlighting missing field, preventing order generation. |
| **RSK-04** | **Input Data Wipe on Validation Error**<br>Validation failure resets form fields, forcing customer to re-type address/email. | Medium | Medium | **P1** | State preservation verification: assert input values remain in DOM after validation fails. |
| **RSK-05** | **Empty Cart Checkout**<br>Customer clicks "Place Order" with no items in the cart. | Medium | High | **P1** | Cart validation guard blocking checkout and displaying warning alert. |
| **RSK-06** | **State Bleed Across Sessions**<br>Previous cart state persists into a new order session unexpectedly. | Low | Low | **P2** | Clean state reset verification via "Place Another Order" action. |

---

## 3. Test Strategy & Automation Architecture

### 3.1 Principles Followed
- **Clean State Isolation:** Every automated test runs against a clean browser session navigating to `baseURL`. No test depends on the state of a preceding test.
- **Web-First Assertions:** Playwright's `expect(locator).toBeVisible()` and `expect(locator).toHaveText()` are used throughout. Arbitrary fixed waits (`page.waitForTimeout` / `sleep`) are strictly avoided.
- **Customer-Centric Assertions:** Assertions validate what the customer visibly experiences (exact prices, currency signs, badges, formatted confirmation codes, error messages).

### 3.2 Test Automation Matrix

| Test ID | Test Scenario | Requirement Reference | Type | Status |
| :--- | :--- | :--- | :--- | :--- |
| `TC-01` | Successful checkout produces clear order confirmation with unique reference | Task 3.1 | Automated (Playwright) | ✅ PASS |
| `TC-02` | Missing required field blocks checkout, shows validation, preserves entered inputs | Task 3.2 | Automated (Playwright) | ✅ PASS |
| `TC-03` | Quantity change (+, -, input) updates line totals and order total accurately | Task 3.3 | Automated (Playwright) | ✅ PASS |
| `TC-04` | Empty cart submission is blocked with visible validation warning | Task 2 (Mistake handling) | Automated (Playwright) | ✅ PASS |
| `TC-05` | Rapid double-click on Place Order produces exactly one confirmation | Task 2 (Mistake handling) | Automated (Playwright) | ✅ PASS |
| `TC-06` | Clean reset allows placing another order without lingering state | Task 3.1 (State lifecycle) | Automated (Playwright) | ✅ PASS |

---

## 4. Manual Exploratory Testing Session

### Manual Scenario 1: Empty Cart Checkout Attempt
* **Objective:** Verify that an empty cart cannot be checked out and provides clear guidance.
* **Preconditions:** Fresh browser page loaded at `http://localhost:3000`.
* **Execution Steps:**
  1. Open the checkout page. Verify shopping cart displays "0 items" and "Your cart is empty."
  2. Enter `"Jane Doe"` into the **Full Name** field.
  3. Enter `"jane.doe@example.com"` into the **Email Address** field.
  4. Click the **"Place Order"** button.
* **Expected Result:**
  - Order submission is blocked.
  - A clear warning banner appears: *"Your cart is empty. Please add at least one item to proceed with checkout."*
  - No order confirmation is generated.
  - The entered name and email remain preserved in the input fields.
* **Actual Result:**
  - Validation banner appeared instantly in red alert box.
  - Button remained active for user correction.
  - Entered customer details (`Jane Doe`, `jane.doe@example.com`) remained intact.
  - Confirmation view was NOT displayed.
* **Verdict:** ✅ **PASS** (Zero defects observed)

---

### Manual Scenario 2: Rapid Double-Click on "Place Order"
* **Objective:** Verify that rapid consecutive clicks on "Place Order" do not generate multiple confirmations or duplicate order IDs.
* **Preconditions:** Single product added to cart ($45.00), required Full Name populated.
* **Execution Steps:**
  1. Add "Wireless Ergonomic Mouse" to cart.
  2. Enter `"Vikram Aditya"` in the Full Name field.
  3. Rapidly double-click (within ~150ms) the **"Place Order"** button.
  4. Inspect the DOM and UI for duplicate order confirmation containers, multiple order references, or console errors.
* **Expected Result:**
  - First click locks submission (`isSubmitting = true`) and disables button.
  - Second click is safely ignored.
  - Exactly one order confirmation is rendered with a single unique reference ID.
* **Actual Result:**
  - The submit handler immediately acquired the submission lock.
  - The button disabled and transitioned to "Processing Order...".
  - Exactly one confirmation card appeared with order ID `ORD-YYYYMMDD-XXXXX`.
  - Console showed graceful handling; no unhandled promise rejections or duplicate views.
* **Verdict:** ✅ **PASS** (Zero defects observed)

---

## 5. Defect & Quality Observations Log
*In accordance with hackathon instructions: "Report real defects if found; don’t invent one to satisfy the brief."*

### Observation 1: Whitespace Input in Required Name Field (Fixed during dev)
* **Description:** Entering only spaces (`"   "`) initially passed naive truthy check `if (!name)`.
* **Impact:** Customer could place an order with an empty-looking name on the invoice.
* **Resolution:** Strengthened validation rule to `customerName.trim() === ''` to ensure at least one printable non-space character is supplied. Verified via automated Check 2.

### Observation 2: Direct Input Boundary in Quantity Field (Handled)
* **Description:** If a user manually cleared the quantity input box or typed `0` or negative numbers, cart math could produce `NaN` or negative totals.
* **Impact:** Corrupted line totals and invalid subtotal calculations.
* **Resolution:** Implemented `handleDirectQuantityChange(productId, val)` which parses integer input and defaults to minimum `1` if invalid or `<= 0`.

---

## 6. Evaluation Criteria Verification

| Evaluation Criterion | Implementation Details | Verified By |
| :--- | :--- | :--- |
| **Clear Test Cases** | 6 descriptive, self-documenting test cases covering requirements and edge risks. | `tests/checkout.spec.js` |
| **Accurate Assertions** | Web-first assertions matching exact prices, currency formatting, regex references, and DOM element presence. | Playwright Test Engine |
| **Reproducibility** | Standard npm project runnable with `npm test` or `npx playwright test`. Static server built-in. | CI / Local execution |
| **Plain Interface** | Responsive, semantic HTML5/CSS3/Vanilla JS with zero external framework dependencies or heavy setup. | `index.html`, `src/style.css` |
