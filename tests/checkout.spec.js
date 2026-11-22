const { test, expect } = require('@playwright/test');

/**
 * Suite: Mini Checkout Browser Test Suite & Edge Case Hardening
 * Evaluated for: Fynd Hiring Hackathon (SDET Intern Track)
 * 
 * Automation Principles Applied:
 * 1. Clean State Isolation: Each test executes from an isolated page context visiting baseURL.
 * 2. Web-first Assertions: Zero arbitrary timeouts/fixed sleeps; assertions wait on DOM states.
 * 3. Exact UI Assertions: Verify customer-facing messages, formatted currency, and confirmation details.
 * 4. Comprehensive Edge Case Coverage: Boundary checks, sanitization, XSS resistance, and idempotency.
 */

test.describe('Mini Checkout - Customer Journey & Core Requirements', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to checkout app with fresh clean context
    await page.goto('/');
    // Verify initial clean state: empty cart message is visible
    await expect(page.getByTestId('cart-empty-state')).toBeVisible();
    await expect(page.getByTestId('cart-item-count')).toHaveText('0 items');
    await expect(page.getByTestId('order-confirmation')).not.toBeVisible();
  });

  /**
   * TEST 1 (Prompt Task 3.1):
   * Verify a successful checkout produces a confirmation with reference number,
   * customer details, and correct itemized total.
   */
  test('Check 1: Successful checkout produces a clear order confirmation with reference', async ({ page }) => {
    // 1. Add synthetic product 1 (Wireless Mouse - $45.00)
    await page.getByTestId('add-to-cart-prod-1').click();
    await expect(page.getByTestId('cart-item-prod-1')).toBeVisible();
    await expect(page.getByTestId('cart-total')).toHaveText('$45.00');

    // 2. Add synthetic product 2 (Mechanical Keyboard - $75.00)
    await page.getByTestId('add-to-cart-prod-2').click();
    await expect(page.getByTestId('cart-item-prod-2')).toBeVisible();
    await expect(page.getByTestId('cart-total')).toHaveText('$120.00');

    // 3. Fill required customer name field
    const testCustomerName = 'Aarav Sharma';
    await page.getByTestId('customer-name-input').fill(testCustomerName);
    await page.getByTestId('customer-email-input').fill('aarav.sharma@example.com');

    // 4. Click "Place Order"
    await page.getByTestId('place-order-btn').click();

    // 5. Assert confirmation view is displayed and checkout form is hidden
    const confirmation = page.getByTestId('order-confirmation');
    await expect(confirmation).toBeVisible();
    await expect(page.getByTestId('checkout-view')).not.toBeVisible();

    // 6. Assert confirmation displays unique order reference matching pattern ORD-YYYYMMDD-XXXXX
    const orderRef = page.getByTestId('order-ref-number');
    await expect(orderRef).toBeVisible();
    await expect(orderRef).toHaveText(/^ORD-\d{8}-[A-Z0-9]+$/);

    // 7. Assert customer name, email, and exact total paid in confirmation
    await expect(page.getByTestId('confirmation-customer-name')).toHaveText(testCustomerName);
    await expect(page.getByTestId('confirmation-customer-email')).toHaveText('aarav.sharma@example.com');
    await expect(page.getByTestId('confirmation-total')).toHaveText('$120.00');

    // 8. Assert itemized purchased items are accurately listed
    const itemsList = page.getByTestId('confirmation-items-list');
    await expect(itemsList).toContainText('Wireless Ergonomic Mouse × 1');
    await expect(itemsList).toContainText('$45.00');
    await expect(itemsList).toContainText('Mechanical Gaming Keyboard × 1');
    await expect(itemsList).toContainText('$75.00');
  });

  /**
   * TEST 2 (Prompt Task 3.2):
   * Verify missing required field blocks checkout, shows clear validation message,
   * does not show confirmation, and preserves customer inputs.
   */
  test('Check 2: Missing required field blocks checkout and preserves entered input', async ({ page }) => {
    // 1. Add item to cart so cart is valid
    await page.getByTestId('add-to-cart-prod-1').click();
    await expect(page.getByTestId('cart-total')).toHaveText('$45.00');

    // 2. Populate optional fields, leaving required Name field empty
    const optionalEmail = 'test.shopper@example.com';
    const optionalAddress = '42 Marine Drive, Mumbai, MH';
    await page.getByTestId('customer-email-input').fill(optionalEmail);
    await page.getByTestId('shipping-address-input').fill(optionalAddress);

    // 3. Ensure required Full Name is left blank
    await page.getByTestId('customer-name-input').fill('');

    // 4. Click "Place Order"
    await page.getByTestId('place-order-btn').click();

    // 5. Assert validation message is displayed to the user
    const nameError = page.getByTestId('name-error');
    await expect(nameError).toBeVisible();
    await expect(nameError).toHaveText('Full Name is required to place your order.');

    // 6. Assert confirmation was NOT generated / confirmation view remains hidden
    await expect(page.getByTestId('order-confirmation')).not.toBeVisible();
    await expect(page.getByTestId('checkout-view')).toBeVisible();

    // 7. Critical assertion: Customer entered values are preserved (not wiped!)
    await expect(page.getByTestId('customer-email-input')).toHaveValue(optionalEmail);
    await expect(page.getByTestId('shipping-address-input')).toHaveValue(optionalAddress);

    // 8. Assert cart remains untouched and ready
    await expect(page.getByTestId('cart-total')).toHaveText('$45.00');

    // 9. Now fulfill the required field and verify validation error clears and checkout succeeds
    await page.getByTestId('customer-name-input').fill('Priya Patel');
    await expect(nameError).not.toBeVisible();

    await page.getByTestId('place-order-btn').click();
    await expect(page.getByTestId('order-confirmation')).toBeVisible();
    await expect(page.getByTestId('confirmation-customer-name')).toHaveText('Priya Patel');
  });

  /**
   * TEST 3 (Prompt Task 3.3):
   * Verify quantity change updates line totals and exact order total.
   */
  test('Check 3: Quantity change updates line totals and exact order total in real-time', async ({ page }) => {
    // 1. Add Product 1 (Mouse - $45.00)
    await page.getByTestId('add-to-cart-prod-1').click();
    await expect(page.getByTestId('cart-item-qty-prod-1')).toHaveValue('1');
    await expect(page.getByTestId('cart-line-total-prod-1')).toHaveText('$45.00');
    await expect(page.getByTestId('cart-total')).toHaveText('$45.00');

    // 2. Add Product 2 (Keyboard - $75.00)
    await page.getByTestId('add-to-cart-prod-2').click();
    await expect(page.getByTestId('cart-line-total-prod-2')).toHaveText('$75.00');
    await expect(page.getByTestId('cart-total')).toHaveText('$120.00');

    // 3. Increment Product 1 quantity using '+' button: 1 -> 2
    await page.getByTestId('cart-qty-inc-prod-1').click();
    await expect(page.getByTestId('cart-item-qty-prod-1')).toHaveValue('2');
    await expect(page.getByTestId('cart-line-total-prod-1')).toHaveText('$90.00'); // 2 * $45.00
    await expect(page.getByTestId('cart-total')).toHaveText('$165.00'); // $90.00 + $75.00

    // 4. Increment Product 1 quantity again: 2 -> 3
    await page.getByTestId('cart-qty-inc-prod-1').click();
    await expect(page.getByTestId('cart-item-qty-prod-1')).toHaveValue('3');
    await expect(page.getByTestId('cart-line-total-prod-1')).toHaveText('$135.00'); // 3 * $45.00
    await expect(page.getByTestId('cart-total')).toHaveText('$210.00'); // $135.00 + $75.00

    // 5. Decrement Product 1 quantity using '-' button: 3 -> 2
    await page.getByTestId('cart-qty-dec-prod-1').click();
    await expect(page.getByTestId('cart-item-qty-prod-1')).toHaveValue('2');
    await expect(page.getByTestId('cart-line-total-prod-1')).toHaveText('$90.00');
    await expect(page.getByTestId('cart-total')).toHaveText('$165.00');

    // 6. Direct input change on Product 2 quantity: 1 -> 4
    const keyboardQtyInput = page.getByTestId('cart-item-qty-prod-2');
    await keyboardQtyInput.fill('4');
    await keyboardQtyInput.dispatchEvent('change');
    await expect(page.getByTestId('cart-line-total-prod-2')).toHaveText('$300.00'); // 4 * $75.00
    await expect(page.getByTestId('cart-total')).toHaveText('$390.00'); // $90.00 + $300.00

    // 7. Remove Product 1 completely
    await page.getByTestId('cart-item-remove-prod-1').click();
    await expect(page.getByTestId('cart-item-prod-1')).not.toBeVisible();
    await expect(page.getByTestId('cart-total')).toHaveText('$300.00'); // Only 4 keyboards remaining
  });

  /**
   * TEST 4 (Mistake Handling - Empty Cart):
   * Block checkout when cart is empty and show clear validation message.
   */
  test('Mistake Handling: Block checkout when cart is empty', async ({ page }) => {
    // 1. Enter name but leave cart empty
    await page.getByTestId('customer-name-input').fill('Neha Verma');

    // 2. Attempt to checkout with empty cart
    await page.getByTestId('place-order-btn').click();

    // 3. Assert cart error message is displayed
    const cartError = page.getByTestId('cart-error');
    await expect(cartError).toBeVisible();
    await expect(cartError).toHaveText(/Your cart is empty. Please add at least one item/);

    // 4. Assert order confirmation was not generated
    await expect(page.getByTestId('order-confirmation')).not.toBeVisible();

    // 5. Assert entered customer name is still preserved
    await expect(page.getByTestId('customer-name-input')).toHaveValue('Neha Verma');
  });

  /**
   * TEST 5 (Concurrency & Double-Click Protection):
   * Once an order is placed, clicking "Place Order" twice must not produce two confirmations.
   */
  test('Double-Click Protection: Rapid double-click produces exactly one confirmation', async ({ page }) => {
    // 1. Add product and fill customer name
    await page.getByTestId('add-to-cart-prod-1').click();
    await page.getByTestId('customer-name-input').fill('Rohan Gupta');

    const placeOrderBtn = page.getByTestId('place-order-btn');

    // 2. Dispatch two rapid clicks concurrently (simulating fast double-click or network race)
    await Promise.all([
      placeOrderBtn.click(),
      placeOrderBtn.click({ timeout: 500 }).catch(() => {
        // May fail or be ignored if button was disabled synchronously
      })
    ]);

    // 3. Verify exactly one confirmation card is rendered in the DOM
    const confirmations = page.getByTestId('order-confirmation');
    await expect(confirmations).toHaveCount(1);
    await expect(confirmations).toBeVisible();

    // 4. Verify exactly one order reference element exists
    const orderRefElements = page.getByTestId('order-ref-number');
    await expect(orderRefElements).toHaveCount(1);
    await expect(orderRefElements).toHaveText(/^ORD-\d{8}-[A-Z0-9]+$/);

    // 5. Verify customer details match
    await expect(page.getByTestId('confirmation-customer-name')).toHaveText('Rohan Gupta');
  });

  /**
   * TEST 6 (Journey Reset & State Isolation):
   * Placing another order cleanses state and returns to fresh checkout.
   */
  test('Journey Reset: Starting a new order resets cart and customer inputs cleanly', async ({ page }) => {
    // 1. Complete an initial order
    await page.getByTestId('add-to-cart-prod-1').click();
    await page.getByTestId('customer-name-input').fill('Ananya Sen');
    await page.getByTestId('place-order-btn').click();
    await expect(page.getByTestId('order-confirmation')).toBeVisible();

    // 2. Click "Place Another Order"
    await page.getByTestId('new-order-btn').click();

    // 3. Assert checkout view is restored and confirmation view is hidden
    await expect(page.getByTestId('checkout-view')).toBeVisible();
    await expect(page.getByTestId('order-confirmation')).not.toBeVisible();

    // 4. Assert cart is reset to 0 items and inputs are clear
    await expect(page.getByTestId('cart-empty-state')).toBeVisible();
    await expect(page.getByTestId('cart-item-count')).toHaveText('0 items');
    await expect(page.getByTestId('customer-name-input')).toHaveValue('');
  });

});

test.describe('Mini Checkout - Edge Cases & Robustness Verification', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  /**
   * EDGE CASE 1: Whitespace-only name & minimum length boundary
   * Submitting spaces e.g. "   " or single character must not bypass required name rule.
   */
  test('Edge Case 1: Rejects whitespace-only and single-char customer names', async ({ page }) => {
    await page.getByTestId('add-to-cart-prod-1').click();

    // Test whitespace-only string
    const nameInput = page.getByTestId('customer-name-input');
    await nameInput.fill('     ');
    await page.getByTestId('place-order-btn').click();

    const nameError = page.getByTestId('name-error');
    await expect(nameError).toBeVisible();
    await expect(nameError).toHaveText('Full Name is required to place your order.');
    await expect(page.getByTestId('order-confirmation')).not.toBeVisible();

    // Test 1-character string
    await nameInput.fill('A');
    await page.getByTestId('place-order-btn').click();
    await expect(nameError).toBeVisible();
    await expect(nameError).toHaveText('Full Name must be at least 2 characters long.');
    await expect(page.getByTestId('order-confirmation')).not.toBeVisible();
  });

  /**
   * EDGE CASE 2: Quantity boundary sanitization
   * Negative numbers, zero, floats, non-numeric strings, and numbers exceeding MAX (99)
   * must be automatically sanitized without corrupting totals.
   */
  test('Edge Case 2: Sanitizes invalid quantity inputs (negative, zero, float, overflow)', async ({ page }) => {
    await page.getByTestId('add-to-cart-prod-1').click();
    const qtyInput = page.getByTestId('cart-item-qty-prod-1');

    // Case A: Negative number (-5) -> sanitized to minimum (1)
    await qtyInput.fill('-5');
    await qtyInput.dispatchEvent('change');
    await expect(qtyInput).toHaveValue('1');
    await expect(page.getByTestId('cart-total')).toHaveText('$45.00');

    // Case B: Zero (0) -> sanitized to minimum (1)
    await qtyInput.fill('0');
    await qtyInput.dispatchEvent('change');
    await expect(qtyInput).toHaveValue('1');
    await expect(page.getByTestId('cart-total')).toHaveText('$45.00');

    // Case C: Non-integer float (3.7) -> sanitized to floor integer (3)
    await qtyInput.fill('3.7');
    await qtyInput.dispatchEvent('change');
    await expect(qtyInput).toHaveValue('3');
    await expect(page.getByTestId('cart-line-total-prod-1')).toHaveText('$135.00'); // 3 * $45.00

    // Case D: Exceeding max boundary (500) -> capped at MAX (99)
    await qtyInput.fill('500');
    await qtyInput.dispatchEvent('change');
    await expect(qtyInput).toHaveValue('99');
    await expect(page.getByTestId('cart-line-total-prod-1')).toHaveText('$4,455.00'.replace(',', '')); // 99 * $45.00 = $4455.00
    await expect(page.getByTestId('cart-total')).toHaveText('$4455.00');
  });

  /**
   * EDGE CASE 3: Optional email format validation
   * If customer provides an email, it must be syntactically valid.
   */
  test('Edge Case 3: Validates email syntax when optional email is provided', async ({ page }) => {
    await page.getByTestId('add-to-cart-prod-1').click();
    await page.getByTestId('customer-name-input').fill('Sarah Connor');

    const emailInput = page.getByTestId('customer-email-input');
    const emailError = page.getByTestId('email-error');

    // Invalid email missing '@' and domain
    await emailInput.fill('invalid-email-address');
    await page.getByTestId('place-order-btn').click();

    await expect(emailError).toBeVisible();
    await expect(emailError).toHaveText(/Please enter a valid email address/);
    await expect(page.getByTestId('order-confirmation')).not.toBeVisible();

    // Fix email to valid syntax
    await emailInput.fill('sarah.connor@cyberdyne.org');
    await expect(emailError).not.toBeVisible();

    // Verify submission succeeds with valid email
    await page.getByTestId('place-order-btn').click();
    await expect(page.getByTestId('order-confirmation')).toBeVisible();
    await expect(page.getByTestId('confirmation-customer-email')).toHaveText('sarah.connor@cyberdyne.org');
  });

  /**
   * EDGE CASE 4: XSS & HTML Injection Resistance
   * Injecting HTML/script payloads into name or email must render as literal text
   * without executing scripts or injecting DOM elements.
   */
  test('Edge Case 4: XSS script tags and HTML injection rendered safely as literal text', async ({ page }) => {
    await page.getByTestId('add-to-cart-prod-1').click();

    // Payload designed to trigger alert or inject element if innerHTML is misused
    const xssPayload = '<b id="xss-test"><script>window.__xss_vulnerable = true;</script>John Doe</b>';
    await page.getByTestId('customer-name-input').fill(xssPayload);

    await page.getByTestId('place-order-btn').click();
    await expect(page.getByTestId('order-confirmation')).toBeVisible();

    // Assert the customer name is rendered as plain text containing the literal tags
    const renderedName = page.getByTestId('confirmation-customer-name');
    await expect(renderedName).toHaveText(xssPayload);

    // Assert that the injected HTML element does not exist in DOM
    const injectedElement = page.locator('#xss-test');
    await expect(injectedElement).toHaveCount(0);

    // Assert script was never evaluated
    const wasScriptExecuted = await page.evaluate(() => window.__xss_vulnerable === true);
    expect(wasScriptExecuted).toBe(false);
  });

  /**
   * EDGE CASE 5: Precision currency math across multiple additions
   * Guarantees cents-integer arithmetic eliminates floating-point drift.
   */
  test('Edge Case 5: Exact floating point arithmetic across high quantity line items', async ({ page }) => {
    // Add 10 mice ($45.00 each = $450.00)
    await page.getByTestId('add-to-cart-prod-1').click();
    const mouseQty = page.getByTestId('cart-item-qty-prod-1');
    await mouseQty.fill('10');
    await mouseQty.dispatchEvent('change');

    // Add 7 keyboards ($75.00 each = $525.00)
    await page.getByTestId('add-to-cart-prod-2').click();
    const kbdQty = page.getByTestId('cart-item-qty-prod-2');
    await kbdQty.fill('7');
    await kbdQty.dispatchEvent('change');

    // Total should be exactly $450.00 + $525.00 = $975.00 without any float artifacts
    await expect(page.getByTestId('cart-line-total-prod-1')).toHaveText('$450.00');
    await expect(page.getByTestId('cart-line-total-prod-2')).toHaveText('$525.00');
    await expect(page.getByTestId('cart-total')).toHaveText('$975.00');
  });

});
