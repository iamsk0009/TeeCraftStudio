/**
 * Utility functions for cart and order operations
 */

/**
 * Calculate total price for cart items
 * @param {Object} quantities - Object with size as key and quantity as value
 * @param {number} unitPrice - Price per unit
 * @returns {number} - Total price
 */
export const calculateTotalPrice = (quantities, unitPrice) => {
  const totalQuantity = Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
  return totalQuantity * unitPrice;
};

/**
 * Calculate total quantity in cart
 * @param {Object} quantities - Object with size as key and quantity as value
 * @returns {number} - Total quantity
 */
export const calculateTotalQuantity = (quantities) => {
  return Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
};

/**
 * Format cart data for WooCommerce order
 * @param {Object} cartState - Redux cart state
 * @param {Object} productState - Redux product state
 * @param {string} color - Selected color from color state
 * @param {string} printFiles - Print files URL from cart state
 * @returns {Object} - Formatted cart data
 */
export const formatCartDataForOrder = (cartState, productState, color = null, printFiles = null) => {
  const { quantities, totalPrice } = cartState;
  const { selectedProduct } = productState;

  return {
    quantities,
    totalPrice,
    selectedProduct,
    color,
    printFiles,
    totalQuantity: calculateTotalQuantity(quantities),
    calculatedTotal: calculateTotalPrice(quantities, totalPrice)
  };
};

/**
 * Validate cart before order creation
 * @param {Object} cartData - Cart data to validate
 * @returns {Object} - Validation result with isValid and errors
 */
export const validateCartForOrder = (cartData) => {
  const errors = [];
  
  if (!cartData.quantities || Object.keys(cartData.quantities).length === 0) {
    errors.push('Cart is empty');
  }
  
  if (!cartData.selectedProduct) {
    errors.push('No product selected');
  }
  
  if (!cartData.totalPrice || cartData.totalPrice <= 0) {
    errors.push('Invalid price');
  }
  
  const totalQuantity = calculateTotalQuantity(cartData.quantities);
  if (totalQuantity <= 0) {
    errors.push('No items in cart');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Format order response for display
 * @param {Object} order - WooCommerce order response
 * @returns {Object} - Formatted order data
 */
export const formatOrderForDisplay = (order) => {
  return {
    id: order.id,
    orderNumber: order.number,
    status: order.status,
    total: order.total,
    currency: order.currency,
    dateCreated: new Date(order.date_created).toLocaleDateString(),
    customerName: `${order.billing.first_name} ${order.billing.last_name}`.trim(),
    customerEmail: order.billing.email,
    lineItems: order.line_items.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      total: item.total,
      size: item.meta_data.find(meta => meta.key === 'Size')?.value || 'N/A'
    }))
  };
};
