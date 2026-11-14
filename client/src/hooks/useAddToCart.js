import { useCallback } from 'react';
import { useCart } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

/** Adds a product to the cart and shows consistent toast feedback (including stock limits). */
export function useAddToCart() {
  const { addItem } = useCart();
  const { notify } = useToast();

  return useCallback(
    (product, { portion = null, quantity = 1 } = {}) => {
      if (product.availability === 'OUT_OF_STOCK' || product.availability === 'UNAVAILABLE') {
        notify(`${product.name} is currently unavailable.`, { type: 'error' });
        return false;
      }
      if (product.portions?.length && !portion) {
        notify('Please choose a portion size first.', { type: 'error' });
        return false;
      }
      const result = addItem(product, { portion, quantity });
      const label = portion ? `${product.name} (${portion.label})` : product.name;
      if (result.added === 0) {
        notify(`You already have all ${product.inventory} available ${label} in your cart.`, { type: 'error' });
        return false;
      }
      // Successful adds are confirmed in place (the button / product-page panel and the cart badge),
      // so no pop-up. The only notice kept is when we couldn't add as many as requested.
      if (result.limited) notify(`Added ${result.added} — that's all we have of ${label} right now.`, { type: 'info' });
      return true;
    },
    [addItem, notify],
  );
}
