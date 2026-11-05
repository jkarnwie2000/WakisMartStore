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
      notify(result.limited ? `Added ${result.added} — that's all we have of ${label}.` : `Added ${label} to your cart.`, {
        link: '/cart',
        linkLabel: 'View cart',
      });
      return true;
    },
    [addItem, notify],
  );
}
