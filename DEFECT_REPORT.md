# Defect & Quality Observations Report

**Track:** SDET Intern - Fynd Hiring Hackathon (Nov 2026)  
**Project:** QuickStore Mini Checkout & Browser Test Suite  
**Evaluation Standard:** Real Defects Identified and Resolved During Engineering  

---

## Defect 1: Whitespace-Only Input Bypassed Required Name Validation

* **Defect ID:** DEF-01
* **Severity:** High
* **Priority:** P1
* **Affected Component:** `src/app.js` (`validate()` function)
* **Status:** Resolved & Verified via Automated Test `TC-07`

### Steps to Reproduce
1. Navigate to the checkout page (`http://localhost:3000`).
2. Add "Wireless Ergonomic Mouse" ($45.00) to the cart.
3. In the **Full Name** input field, press the Spacebar three times (`"   "`).
4. Click the **"Place Order"** button.

### Expected Result
Submission must be blocked. A clear validation message must state that Full Name is required, because whitespace does not constitute a valid customer identifier.

### Actual Result (Prior to Fix)
A naive truthy condition (`if (!name)`) evaluated `"   "` to `true`. The order was processed, generating an invoice and confirmation card with a blank-looking customer name: `"Customer Name:    "`.

### Root Cause
The initial validation check did not sanitize or strip leading/trailing whitespace before testing whether the name field was populated.

### Resolution
Strengthened the validation logic in `src/app.js`:
```javascript
const rawName = elements.customerNameInput.value;
const name = rawName.trim();

if (!name) {
  elements.nameError.textContent = 'Full Name is required to place your order.';
  elements.nameError.style.display = 'block';
  elements.customerNameInput.classList.add('is-invalid');
  isValid = false;
}
```
Automated check added in `tests/checkout.spec.js` (`Edge Case 1`) verifies that `"   "` is rejected with `Full Name is required to place your order.`

---

## Defect 2: Direct Input of Zero, Negative Numbers, or Non-Numerics Corrupted Cart Line Totals

* **Defect ID:** DEF-02
* **Severity:** Medium
* **Priority:** P1
* **Affected Component:** `src/app.js` (`handleDirectQuantityChange()` function)
* **Status:** Resolved & Verified via Automated Test `TC-08`

### Steps to Reproduce
1. Navigate to the checkout page.
2. Add "Mechanical Gaming Keyboard" ($75.00) to the cart.
3. In the quantity input box, manually backspace and type `0` or `-3` or `abc`.
4. Press Tab or click outside the input field (triggering `change` / `blur`).

### Expected Result
The application must sanitize direct inputs to valid integer boundaries (minimum `1`, maximum `99`), keeping line totals and order totals mathematically sound.

### Actual Result (Prior to Fix)
The unconstrained numerical input passed directly into financial multiplication, producing `$0.00` line totals for active cart rows, or negative totals (`$-225.00`), or `NaN` values that broke subsequent checkout steps.

### Root Cause
Direct manual input into `<input type="number">` triggered unvalidated updates without enforcing integer parsing, `MIN_QUANTITY_PER_ITEM` (1), or `MAX_QUANTITY_PER_ITEM` (99).

### Resolution
Implemented integer sanitization and bounds clamping in `src/app.js`:
```javascript
function handleDirectQuantityChange(productId, val) {
  if (!isValidProductId(productId)) return;
  const rawNum = Number(val);
  let sanitized = Math.floor(rawNum);

  if (isNaN(sanitized) || !Number.isFinite(sanitized) || sanitized < MIN_QUANTITY_PER_ITEM) {
    sanitized = MIN_QUANTITY_PER_ITEM;
  } else if (sanitized > MAX_QUANTITY_PER_ITEM) {
    sanitized = MAX_QUANTITY_PER_ITEM;
  }

  state.cart[productId] = sanitized;
  renderCart();
}
```
Automated check added in `tests/checkout.spec.js` (`Edge Case 2`) asserts that negative numbers and zero automatically reset to `1`, floats truncate, and overflows clamp to `99`.

---

## Verification Summary
Both defects were captured through manual exploratory sessions, corrected in the application architecture, and verified via automated Playwright regression tests.
