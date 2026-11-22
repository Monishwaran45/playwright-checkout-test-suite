/**
 * QuickStore Mini Checkout - Application Logic
 * Implements single-page checkout, dynamic cart calculations,
 * form validation with state preservation, and double-submit protection.
 */

// 1. Synthetic Products Catalog (Fixed prices as required)
const PRODUCTS = [
  {
    id: 'prod-1',
    name: 'Wireless Ergonomic Mouse',
    price: 45.00,
    emoji: '🖱️',
    description: 'Precision optical sensor, dual Bluetooth & 2.4GHz wireless connectivity.'
  },
  {
    id: 'prod-2',
    name: 'Mechanical Gaming Keyboard',
    price: 75.00,
    emoji: '⌨️',
    description: '75% compact layout with hot-swappable tactile switches & RGB backlighting.'
  }
];

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
  confOrderDate: document.getElementById('conf-order-date'),
  confItemsList: document.getElementById('conf-items-list'),
  confTotalPaid: document.getElementById('conf-total-paid'),
  newOrderBtn: document.getElementById('new-order-btn')
};

// 4. Formatting Utilities
function formatCurrency(amount) {
  return `$${amount.toFixed(2)}`;
}

// 5. Render Products List
function renderProducts() {
  if (!elements.productsList) return;
  elements.productsList.innerHTML = PRODUCTS.map(product => `
    <div class="product-item" data-testid="product-item-${product.id}">
      <div class="product-info">
        <div class="product-emoji" aria-hidden="true">${product.emoji}</div>
        <div>
          <h3 class="product-name" data-testid="product-name-${product.id}">${product.name}</h3>
          <p class="product-desc">${product.description}</p>
          <div class="product-price" data-testid="product-price-${product.id}">${formatCurrency(product.price)}</div>
        </div>
      </div>
      <button 
        type="button" 
        class="btn btn-primary btn-sm" 
        data-testid="add-to-cart-${product.id}"
        onclick="addToCart('${product.id}')"
      >
        + Add to Cart
      </button>
    </div>
  `).join('');
}

// 6. Cart Calculations
function calculateTotals() {
  let subtotal = 0;
  let totalCount = 0;

  for (const [productId, quantity] of Object.entries(state.cart)) {
    if (quantity > 0) {
      const product = PRODUCTS.find(p => p.id === productId);
      if (product) {
        subtotal += product.price * quantity;
        totalCount += quantity;
      }
    }
  }

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    total: parseFloat(subtotal.toFixed(2)),
    totalCount
  };
}

// 7. Render Cart View
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
    const lineTotal = product.price * quantity;

    return `
      <div class="cart-item-row" data-testid="cart-item-${product.id}">
        <div class="cart-item-details">
          <div class="cart-item-title" data-testid="cart-item-name-${product.id}">${product.name}</div>
          <div class="cart-item-unit-price">${formatCurrency(product.price)} each</div>
        </div>

        <div class="cart-item-controls">
          <button 
            type="button" 
            class="qty-btn" 
            data-testid="cart-qty-dec-${product.id}"
            aria-label="Decrease quantity"
            onclick="updateQuantity('${product.id}', -1)"
          >-</button>

          <input 
            type="number" 
            min="1" 
            value="${quantity}" 
            class="qty-input" 
            data-testid="cart-item-qty-${product.id}"
            aria-label="Item quantity"
            onchange="handleDirectQuantityChange('${product.id}', this.value)"
          >

          <button 
            type="button" 
            class="qty-btn" 
            data-testid="cart-qty-inc-${product.id}"
            aria-label="Increase quantity"
            onclick="updateQuantity('${product.id}', 1)"
          >+</button>

          <button 
            type="button" 
            class="btn-remove" 
            data-testid="cart-item-remove-${product.id}"
            title="Remove item"
            onclick="removeFromCart('${product.id}')"
          >Remove</button>
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

// 8. Cart Operations
function addToCart(productId) {
  const currentQty = state.cart[productId] || 0;
  state.cart[productId] = currentQty + 1;
  renderCart();
}

function updateQuantity(productId, delta) {
  const currentQty = state.cart[productId] || 0;
  const newQty = currentQty + delta;
  if (newQty <= 0) {
    delete state.cart[productId];
  } else {
    state.cart[productId] = newQty;
  }
  renderCart();
}

function handleDirectQuantityChange(productId, val) {
  const parsed = parseInt(val, 10);
  if (isNaN(parsed) || parsed <= 0) {
    // Revert to 1 if invalid number entered
    state.cart[productId] = 1;
  } else {
    state.cart[productId] = parsed;
  }
  renderCart();
}

function removeFromCart(productId) {
  delete state.cart[productId];
  renderCart();
}

// 9. Validation
function validate() {
  let isValid = true;
  const { totalCount } = calculateTotals();
  const customerName = elements.customerNameInput.value.trim();

  // Rule 1: Cart must not be empty
  if (totalCount === 0) {
    elements.cartError.style.display = 'flex';
    isValid = false;
  } else {
    elements.cartError.style.display = 'none';
  }

  // Rule 2: Customer Name is required (cannot be blank/whitespace)
  if (!customerName) {
    elements.nameError.style.display = 'block';
    elements.customerNameInput.classList.add('is-invalid');
    isValid = false;
  } else {
    elements.nameError.style.display = 'none';
    elements.customerNameInput.classList.remove('is-invalid');
  }

  // Note: Customer inputs are PRESERVED! We do not clear them.
  return isValid;
}

// 10. Generate Order Reference
function generateOrderReference() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomChars = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `ORD-${dateStr}-${randomChars}`;
}

// 11. Handle Order Placement
function handlePlaceOrder(e) {
  if (e) e.preventDefault();

  // Guard: Double-submission protection
  // If already submitting or already completed, ignore subsequent clicks
  if (state.isSubmitting) {
    console.warn('Place Order clicked while already submitting. Request ignored.');
    return;
  }

  // Run validation
  const isValid = validate();
  if (!isValid) {
    return;
  }

  // Acquire submission lock
  state.isSubmitting = true;

  // Immediate UI feedback & disable button to prevent repeated clicks
  elements.placeOrderBtn.disabled = true;
  const btnText = elements.placeOrderBtn.querySelector('.btn-text');
  const spinner = elements.placeOrderBtn.querySelector('.spinner');
  if (btnText) btnText.textContent = 'Processing Order...';
  if (spinner) spinner.style.display = 'inline-block';

  // Snapshot details for confirmation
  const orderRef = generateOrderReference();
  const customerName = elements.customerNameInput.value.trim();
  const customerEmail = elements.customerEmailInput.value.trim();
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
        lineTotal: prod.price * quantity
      };
    });

  state.orderConfirmation = {
    orderRef,
    customerName,
    customerEmail,
    total,
    purchasedItems,
    date: new Date().toLocaleString()
  };

  // Render Confirmation View
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

  elements.confItemsList.innerHTML = state.orderConfirmation.purchasedItems.map(item => `
    <div class="conf-item-row">
      <span>${item.name} × ${item.quantity}</span>
      <strong>${formatCurrency(item.lineTotal)}</strong>
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
  elements.cartError.style.display = 'none';

  // Re-render
  renderCart();

  // Show checkout view, hide confirmation view
  elements.orderConfirmationView.style.display = 'none';
  elements.checkoutView.style.display = 'grid';
}

// 13. Event Listeners & Initialization
function init() {
  renderProducts();
  renderCart();

  // Form submission
  elements.checkoutForm.addEventListener('submit', handlePlaceOrder);

  // Clear name validation on input typing
  elements.customerNameInput.addEventListener('input', () => {
    if (elements.customerNameInput.value.trim()) {
      elements.nameError.style.display = 'none';
      elements.customerNameInput.classList.remove('is-invalid');
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
