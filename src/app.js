/**
 * QuickStore Mini Checkout - Application Logic
 * Professional, Enterprise-grade E-Commerce Experience
 * Implements single-page checkout, dynamic cart calculations,
 * robust edge-case handling, form validation with state preservation,
 * and deterministic double-submit prevention.
 */

// 1. Synthetic Products Catalog (Fixed prices as required)
const PRODUCTS = [
  {
    id: 'prod-1',
    name: 'Wireless Ergonomic Mouse',
    sku: 'WM-450',
    category: 'Peripherals',
    price: 45.00,
    svgIcon: `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="7"></rect>
        <line x1="12" y1="6" x2="12" y2="10"></line>
      </svg>
    `,
    description: 'Precision optical sensor, dual Bluetooth and 2.4GHz wireless connectivity.'
  },
  {
    id: 'prod-2',
    name: 'Mechanical Gaming Keyboard',
    sku: 'MK-750',
    category: 'Peripherals',
    price: 75.00,
    svgIcon: `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2"></rect>
        <line x1="6" y1="8" x2="6.01" y2="8"></line>
        <line x1="10" y1="8" x2="10.01" y2="8"></line>
        <line x1="14" y1="8" x2="14.01" y2="8"></line>
        <line x1="18" y1="8" x2="18.01" y2="8"></line>
        <line x1="6" y1="12" x2="6.01" y2="12"></line>
        <line x1="10" y1="12" x2="10.01" y2="12"></line>
        <line x1="14" y1="12" x2="14.01" y2="12"></line>
        <line x1="18" y1="12" x2="18.01" y2="12"></line>
        <line x1="7" y1="16" x2="17" y2="16"></line>
      </svg>
    `,
    description: '75% compact layout with hot-swappable tactile switches and RGB backlighting.'
  }
];

// Constants & Boundaries for Edge Cases
const MAX_QUANTITY_PER_ITEM = 99;
const MIN_QUANTITY_PER_ITEM = 1;

// 2. Application State
const state = {
  cart: {}, // productId -> quantity (e.g. { 'prod-1': 1 })
  isSubmitting: false,
  orderConfirmation: null
};

// 3. DOM Elements Cache
const elements = {
  productsList: document.getElementById('products-list'),
  cartEmptyState: document.getElementById('cart-empty-state'),
  cartItemsContainer: document.getElementById('cart-items-container'),
  cartSummary: document.getElementById('cart-summary'),
  cartItemCount: document.getElementById('cart-item-count'),
  cartSubtotal: document.getElementById('cart-subtotal'),
  cartTotal: document.getElementById('cart-total'),
  formTotalPreview: document.getElementById('form-total-preview'),
  cartError: document.getElementById('cart-error'),
  nameError: document.getElementById('name-error'),
  emailError: document.getElementById('email-error'),
  addressError: document.getElementById('address-error'),
  checkoutForm: document.getElementById('checkout-form'),
  customerNameInput: document.getElementById('customer-name'),
  customerEmailInput: document.getElementById('customer-email'),
  shippingAddressInput: document.getElementById('shipping-address'),
  placeOrderBtn: document.getElementById('place-order-btn'),
  checkoutView: document.getElementById('checkout-view'),
  orderConfirmationView: document.getElementById('order-confirmation'),
  confOrderRef: document.getElementById('conf-order-ref'),
  confCustomerName: document.getElementById('conf-customer-name'),
  confCustomerEmail: document.getElementById('conf-customer-email'),
  confEmailRow: document.getElementById('conf-email-row'),
  confShippingAddress: document.getElementById('conf-shipping-address'),
  confAddressRow: document.getElementById('conf-address-row'),
  confOrderDate: document.getElementById('conf-order-date'),
  confItemsList: document.getElementById('conf-items-list'),
  confTotalPaid: document.getElementById('conf-total-paid'),
  newOrderBtn: document.getElementById('new-order-btn')
};

// 4. Formatting & Safe Financial Utilities (Cents arithmetic to prevent IEEE 754 float drift)
function formatCurrency(amount) {
  return `$${amount.toFixed(2)}`;
}

function toCents(dollarAmount) {
  return Math.round(dollarAmount * 100);
}

// 5. Render Products List (Modern Enterprise UI Cards)
function renderProducts() {
  if (!elements.productsList) return;
  elements.productsList.innerHTML = PRODUCTS.map(product => `
    <div class="product-item" data-testid="product-item-${product.id}">
      <div class="product-info-wrapper">
        <div class="product-icon-box" aria-hidden="true">
          ${product.svgIcon}
        </div>
        <div class="product-meta">
          <div class="product-top-row">
            <span class="product-sku-tag">${product.sku}</span>
            <span class="product-stock-tag">In Stock</span>
          </div>
          <h3 class="product-name" data-testid="product-name-${product.id}">${product.name}</h3>
          <p class="product-desc">${product.description}</p>
          <div class="product-price-row">
            <span class="price-label">Price:</span>
            <span class="product-price" data-testid="product-price-${product.id}">${formatCurrency(product.price)}</span>
          </div>
        </div>
      </div>
      <button 
        type="button" 
        class="btn btn-outline-primary btn-add" 
        data-testid="add-to-cart-${product.id}"
        onclick="addToCart('${product.id}')"
        aria-label="Add ${product.name} to cart"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        <span>Add to Cart</span>
      </button>
    </div>
  `).join('');
}

// 6. Cart Calculations (Safe from floating-point inaccuracy)
function calculateTotals() {
  let subtotalCents = 0;
  let totalCount = 0;

  for (const [productId, quantity] of Object.entries(state.cart)) {
    if (quantity > 0) {
      const product = PRODUCTS.find(p => p.id === productId);
      if (product) {
        subtotalCents += toCents(product.price) * quantity;
        totalCount += quantity;
      }
    }
  }

  const finalSubtotal = subtotalCents / 100;

  return {
    subtotal: parseFloat(finalSubtotal.toFixed(2)),
    total: parseFloat(finalSubtotal.toFixed(2)),
    totalCount
  };
}

// 7. Render Cart View (Segmented Controls & Tabular Line Totals)
function renderCart() {
  const { subtotal, total, totalCount } = calculateTotals();
  const activeEntries = Object.entries(state.cart).filter(([_, qty]) => qty > 0);

  // Update item count badge
  elements.cartItemCount.textContent = `${totalCount} ${totalCount === 1 ? 'item' : 'items'}`;

  // Toggle empty state vs item list
  if (activeEntries.length === 0) {
    elements.cartEmptyState.style.display = 'block';
    elements.cartItemsContainer.style.display = 'none';
    elements.cartSummary.style.display = 'none';
    elements.formTotalPreview.textContent = '$0.00';
    return;
  }

  // Active items present
  elements.cartEmptyState.style.display = 'none';
  elements.cartItemsContainer.style.display = 'flex';
  elements.cartSummary.style.display = 'block';

  // Dismiss cart empty error if items were added
  if (elements.cartError.style.display !== 'none') {
    elements.cartError.style.display = 'none';
  }

  // Render Cart Items
  elements.cartItemsContainer.innerHTML = activeEntries.map(([productId, quantity]) => {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return '';
    const lineTotal = (toCents(product.price) * quantity) / 100;

    return `
      <div class="cart-item-row" data-testid="cart-item-${product.id}">
        <div class="cart-item-details">
          <div class="cart-item-title" data-testid="cart-item-name-${product.id}">${product.name}</div>
          <div class="cart-item-submeta">
            <span class="cart-item-unit-price">${formatCurrency(product.price)} each</span>
            <span class="bullet-separator">&bull;</span>
            <span class="cart-item-sku">${product.sku}</span>
          </div>
        </div>

        <div class="cart-item-actions">
          <div class="stepper-control">
            <button 
              type="button" 
              class="stepper-btn stepper-btn-dec" 
              data-testid="cart-qty-dec-${product.id}"
              aria-label="Decrease quantity"
              onclick="updateQuantity('${product.id}', -1)"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>

            <input 
              type="number" 
              min="1" 
              max="${MAX_QUANTITY_PER_ITEM}"
              value="${quantity}" 
              class="stepper-input" 
              data-testid="cart-item-qty-${product.id}"
              aria-label="Item quantity"
              onchange="handleDirectQuantityChange('${product.id}', this.value)"
              onblur="handleDirectQuantityChange('${product.id}', this.value)"
            >

            <button 
              type="button" 
              class="stepper-btn stepper-btn-inc" 
              data-testid="cart-qty-inc-${product.id}"
              aria-label="Increase quantity"
              onclick="updateQuantity('${product.id}', 1)"
              ${quantity >= MAX_QUANTITY_PER_ITEM ? 'disabled' : ''}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </div>

          <button 
            type="button" 
            class="btn-remove" 
            data-testid="cart-item-remove-${product.id}"
            title="Remove item from cart"
            onclick="removeFromCart('${product.id}')"
          >
            Remove
          </button>
        </div>

        <div class="cart-item-line-total" data-testid="cart-line-total-${product.id}">
          ${formatCurrency(lineTotal)}
        </div>
      </div>
    `;
  }).join('');

  // Update Cart Totals Display
  elements.cartSubtotal.textContent = formatCurrency(subtotal);
  elements.cartTotal.textContent = formatCurrency(total);
  elements.formTotalPreview.textContent = formatCurrency(total);
}

// 8. Cart Operations & Boundary Edge Cases
function addToCart(productId) {
  const currentQty = state.cart[productId] || 0;
  if (currentQty >= MAX_QUANTITY_PER_ITEM) {
    alert(`Maximum quantity of ${MAX_QUANTITY_PER_ITEM} units reached for this item.`);
    return;
  }
  state.cart[productId] = currentQty + 1;
  renderCart();
}

function updateQuantity(productId, delta) {
  const currentQty = state.cart[productId] || 0;
  const newQty = currentQty + delta;
  if (newQty <= 0) {
    delete state.cart[productId];
  } else if (newQty > MAX_QUANTITY_PER_ITEM) {
    state.cart[productId] = MAX_QUANTITY_PER_ITEM;
  } else {
    state.cart[productId] = newQty;
  }
  renderCart();
}

/**
 * Handle direct text input in quantity field
 * Sanitizes: negative numbers, non-numeric strings, floats, zeroes, and overflows (> 99).
 */
function handleDirectQuantityChange(productId, val) {
  const rawNum = Number(val);
  let sanitized = Math.floor(rawNum);

  if (isNaN(sanitized) || sanitized < MIN_QUANTITY_PER_ITEM) {
    sanitized = MIN_QUANTITY_PER_ITEM;
  } else if (sanitized > MAX_QUANTITY_PER_ITEM) {
    sanitized = MAX_QUANTITY_PER_ITEM;
  }

  state.cart[productId] = sanitized;
  renderCart();
}

function removeFromCart(productId) {
  delete state.cart[productId];
  renderCart();
}

// 9. Input Sanitization & Validation (Covers edge cases: whitespace, format, boundaries)
function validate() {
  let isValid = true;
  const { totalCount } = calculateTotals();
  const rawName = elements.customerNameInput.value;
  const trimmedName = rawName.trim();
  const rawEmail = elements.customerEmailInput.value.trim();
  const rawAddress = elements.shippingAddressInput.value.trim();

  // Rule 1: Cart must not be empty
  if (totalCount === 0) {
    elements.cartError.style.display = 'flex';
    isValid = false;
  } else {
    elements.cartError.style.display = 'none';
  }

  // Rule 2: Customer Name is required (cannot be blank/whitespace-only, min 2 chars)
  if (!trimmedName) {
    elements.nameError.textContent = 'Full Name is required to place your order.';
    elements.nameError.style.display = 'block';
    elements.customerNameInput.classList.add('is-invalid');
    isValid = false;
  } else if (trimmedName.length < 2) {
    elements.nameError.textContent = 'Full Name must be at least 2 characters long.';
    elements.nameError.style.display = 'block';
    elements.customerNameInput.classList.add('is-invalid');
    isValid = false;
  } else {
    elements.nameError.style.display = 'none';
    elements.customerNameInput.classList.remove('is-invalid');
  }

  // Rule 3: Customer Email is required (cannot be blank/whitespace-only, must match valid email format)
  if (!rawEmail) {
    if (elements.emailError) {
      elements.emailError.textContent = 'Email Address is required to place your order.';
      elements.emailError.style.display = 'block';
    }
    elements.customerEmailInput.classList.add('is-invalid');
    isValid = false;
  } else {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(rawEmail)) {
      if (elements.emailError) {
        elements.emailError.textContent = 'Please enter a valid email address (e.g. name@example.com).';
        elements.emailError.style.display = 'block';
      }
      elements.customerEmailInput.classList.add('is-invalid');
      isValid = false;
    } else {
      if (elements.emailError) {
        elements.emailError.style.display = 'none';
      }
      elements.customerEmailInput.classList.remove('is-invalid');
    }
  }

  // Rule 4: Shipping Address is required (cannot be blank/whitespace-only, min 5 chars)
  if (!rawAddress) {
    if (elements.addressError) {
      elements.addressError.textContent = 'Shipping Address is required to place your order.';
      elements.addressError.style.display = 'block';
    }
    elements.shippingAddressInput.classList.add('is-invalid');
    isValid = false;
  } else if (rawAddress.length < 5) {
    if (elements.addressError) {
      elements.addressError.textContent = 'Please enter a complete shipping address (at least 5 characters).';
      elements.addressError.style.display = 'block';
    }
    elements.shippingAddressInput.classList.add('is-invalid');
    isValid = false;
  } else {
    if (elements.addressError) {
      elements.addressError.style.display = 'none';
    }
    elements.shippingAddressInput.classList.remove('is-invalid');
  }

  // CRITICAL: Customer input values are PRESERVED! We NEVER clear input values on validation fail.
  return isValid;
}

// 10. Generate Unique Order Reference
function generateOrderReference() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomChars = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `ORD-${dateStr}-${randomChars}`;
}

// 11. Handle Order Placement (Thread-safe idempotency guard)
function handlePlaceOrder(e) {
  if (e) e.preventDefault();

  // Edge Case: Concurrency & Double-Submit Guard
  // If already submitting or an order is already completed, ignore subsequent clicks
  if (state.isSubmitting || state.orderConfirmation !== null) {
    console.warn('Place Order clicked while already submitting or order already finalized. Action blocked.');
    return;
  }

  // Run validation
  const isValid = validate();
  if (!isValid) {
    return;
  }

  // Acquire submission lock synchronously
  state.isSubmitting = true;

  // Immediate UI feedback & disable button
  elements.placeOrderBtn.disabled = true;
  const btnText = elements.placeOrderBtn.querySelector('.btn-text');
  const spinner = elements.placeOrderBtn.querySelector('.spinner');
  if (btnText) btnText.textContent = 'Processing Order...';
  if (spinner) spinner.style.display = 'inline-block';

  // Snapshot details for confirmation (Trimming values to prevent whitespace artifacts)
  const orderRef = generateOrderReference();
  const customerName = elements.customerNameInput.value.trim();
  const customerEmail = elements.customerEmailInput.value.trim();
  const shippingAddress = elements.shippingAddressInput.value.trim();
  const { total } = calculateTotals();
  const purchasedItems = Object.entries(state.cart)
    .filter(([_, qty]) => qty > 0)
    .map(([productId, quantity]) => {
      const prod = PRODUCTS.find(p => p.id === productId);
      return {
        id: prod.id,
        name: prod.name,
        price: prod.price,
        quantity,
        lineTotal: (toCents(prod.price) * quantity) / 100
      };
    });

  state.orderConfirmation = {
    orderRef,
    customerName,
    customerEmail,
    shippingAddress,
    total,
    purchasedItems,
    date: new Date().toLocaleString()
  };

  // Render Confirmation View securely using textContent (Guards against XSS / HTML injection)
  elements.confOrderRef.textContent = state.orderConfirmation.orderRef;
  elements.confCustomerName.textContent = state.orderConfirmation.customerName;
  elements.confOrderDate.textContent = state.orderConfirmation.date;
  elements.confTotalPaid.textContent = formatCurrency(state.orderConfirmation.total);

  if (state.orderConfirmation.customerEmail) {
    elements.confCustomerEmail.textContent = state.orderConfirmation.customerEmail;
    elements.confEmailRow.style.display = 'flex';
  } else {
    elements.confEmailRow.style.display = 'none';
  }

  if (elements.confShippingAddress) {
    elements.confShippingAddress.textContent = state.orderConfirmation.shippingAddress;
    if (elements.confAddressRow) elements.confAddressRow.style.display = 'flex';
  }

  // Render purchased items list safely
  elements.confItemsList.innerHTML = state.orderConfirmation.purchasedItems.map(item => `
    <div class="conf-item-row">
      <span class="conf-item-name">${item.name} &times; ${item.quantity}</span>
      <strong class="conf-item-price">${formatCurrency(item.lineTotal)}</strong>
    </div>
  `).join('');

  // Switch view to confirmation
  elements.checkoutView.style.display = 'none';
  elements.orderConfirmationView.style.display = 'flex';

  // Reset button state
  elements.placeOrderBtn.disabled = false;
  if (btnText) btnText.textContent = 'Place Order';
  if (spinner) spinner.style.display = 'none';

  // Release lock
  state.isSubmitting = false;
}

// 12. Reset to New Order (Clean State)
function resetForNewOrder() {
  state.cart = {};
  state.isSubmitting = false;
  state.orderConfirmation = null;

  // Clear inputs & errors
  elements.customerNameInput.value = '';
  elements.customerEmailInput.value = '';
  elements.shippingAddressInput.value = '';
  elements.nameError.style.display = 'none';
  elements.customerNameInput.classList.remove('is-invalid');
  if (elements.emailError) {
    elements.emailError.style.display = 'none';
  }
  elements.customerEmailInput.classList.remove('is-invalid');
  if (elements.addressError) {
    elements.addressError.style.display = 'none';
  }
  elements.shippingAddressInput.classList.remove('is-invalid');
  elements.cartError.style.display = 'none';

  // Re-render
  renderCart();

  // Show checkout view, hide confirmation view
  elements.orderConfirmationView.style.display = 'none';
  elements.checkoutView.style.display = 'grid';
}

// 13. Event Listeners & Real-Time Error Dismissal
function init() {
  renderProducts();
  renderCart();

  // Form submission
  elements.checkoutForm.addEventListener('submit', handlePlaceOrder);

  // Clear name validation on input typing
  elements.customerNameInput.addEventListener('input', () => {
    if (elements.customerNameInput.value.trim().length >= 2) {
      elements.nameError.style.display = 'none';
      elements.customerNameInput.classList.remove('is-invalid');
    }
  });

  // Clear email validation on input typing if valid
  elements.customerEmailInput.addEventListener('input', () => {
    const val = elements.customerEmailInput.value.trim();
    if (val && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      if (elements.emailError) elements.emailError.style.display = 'none';
      elements.customerEmailInput.classList.remove('is-invalid');
    }
  });

  // Clear address validation on input typing if valid
  elements.shippingAddressInput.addEventListener('input', () => {
    if (elements.shippingAddressInput.value.trim().length >= 5) {
      if (elements.addressError) elements.addressError.style.display = 'none';
      elements.shippingAddressInput.classList.remove('is-invalid');
    }
  });

  // Place another order button
  elements.newOrderBtn.addEventListener('click', resetForNewOrder);
}

// Global exposure for inline onclick handlers & debugging
window.addToCart = addToCart;
window.updateQuantity = updateQuantity;
window.handleDirectQuantityChange = handleDirectQuantityChange;
window.removeFromCart = removeFromCart;
window.resetForNewOrder = resetForNewOrder;

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
