import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api.js';
import { readJSON, writeJSON } from '../utils/storage.js';

const STORAGE_KEY = 'wakis-mart-cart-v1';
const CartContext = createContext(null);

export const lineKey = (productId, portionId) => `${productId}:${portionId ?? ''}`;

/*
 * Cart lines store a display snapshot (name, image, price, stock) so the cart renders
 * instantly, but prices are NOT trusted: `refresh()` re-prices every line from the
 * server, and checkout totals are always calculated by the backend.
 */
export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    const saved = readJSON(STORAGE_KEY, []);
    return Array.isArray(saved) ? saved.filter((i) => i && i.productId && i.quantity > 0) : [];
  });
  const [issues, setIssues] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    writeJSON(STORAGE_KEY, items);
  }, [items]);

  // Keep carts in sync across browser tabs.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) setItems(readJSON(STORAGE_KEY, []));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  /** Units of a product already in the cart (all portion sizes share the same stock). */
  const quantityInCart = useCallback(
    (productId, exceptKey) => items.filter((i) => i.productId === productId && i.key !== exceptKey).reduce((n, i) => n + i.quantity, 0),
    [items],
  );

  /**
   * Adds a product. Returns { added, quantity, limited } so callers can show feedback.
   * `product` is a product object from the API; `portion` is one of product.portions (or null).
   */
  const addItem = useCallback(
    (product, { portion = null, quantity = 1 } = {}) => {
      const key = lineKey(product.id, portion?.id);
      const otherUnits = items.filter((i) => i.productId === product.id && i.key !== key).reduce((n, i) => n + i.quantity, 0);
      const existing = items.find((i) => i.key === key);
      const maxForLine = Math.max(0, product.inventory - otherUnits);
      const desired = (existing?.quantity || 0) + quantity;
      const finalQty = Math.min(desired, maxForLine, 99);
      if (finalQty <= (existing?.quantity || 0)) return { added: 0, quantity: existing?.quantity || 0, limited: true };

      const line = {
        key,
        productId: product.id,
        portionId: portion?.id ?? null,
        portionLabel: portion?.label ?? null,
        name: product.name,
        slug: product.slug,
        image: product.image,
        unitPrice: portion?.price ?? product.price,
        inventory: product.inventory,
        isDeli: product.isDeli,
        quantity: finalQty,
      };
      setItems((prev) => (prev.some((i) => i.key === key) ? prev.map((i) => (i.key === key ? { ...i, ...line } : i)) : [...prev, line]));
      return { added: finalQty - (existing?.quantity || 0), quantity: finalQty, limited: finalQty < desired };
    },
    [items],
  );

  const updateQuantity = useCallback((key, quantity) => {
    setItems((prev) => {
      const line = prev.find((i) => i.key === key);
      if (!line) return prev;
      const others = prev.filter((i) => i.productId === line.productId && i.key !== key).reduce((n, i) => n + i.quantity, 0);
      const max = Math.max(1, Math.min(99, (line.inventory ?? 99) - others));
      const q = Math.max(1, Math.min(max, Math.floor(quantity) || 1));
      return prev.map((i) => (i.key === key ? { ...i, quantity: q } : i));
    });
  }, []);

  const removeItem = useCallback((key) => setItems((prev) => prev.filter((i) => i.key !== key)), []);
  const clearCart = useCallback(() => {
    setItems([]);
    setIssues([]);
  }, []);

  /** Re-prices the cart from the server and applies stock / availability changes. */
  const refresh = useCallback(async () => {
    const current = readJSON(STORAGE_KEY, []);
    if (!current.length) {
      setIssues([]);
      return { lines: [], issues: [] };
    }
    setRefreshing(true);
    try {
      const result = await api.validateCart(current.map(({ productId, portionId, quantity }) => ({ productId, portionId, quantity })));
      const byKey = new Map(result.lines.map((l) => [l.key, l]));
      setItems((prev) =>
        prev
          .filter((i) => byKey.has(i.key))
          .map((i) => {
            const l = byKey.get(i.key);
            return { ...i, name: l.name, slug: l.slug, image: l.image, unitPrice: l.unitPrice, portionLabel: l.portionLabel, inventory: l.inventory, quantity: l.quantity };
          }),
      );
      setIssues(result.issues);
      return result;
    } finally {
      setRefreshing(false);
    }
  }, []);

  const value = useMemo(() => {
    const count = items.reduce((n, i) => n + i.quantity, 0);
    const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    return { items, count, subtotal, issues, refreshing, addItem, updateQuantity, removeItem, clearCart, refresh, quantityInCart, setIssues };
  }, [items, issues, refreshing, addItem, updateQuantity, removeItem, clearCart, refresh, quantityInCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
