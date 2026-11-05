import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api.js';

// Public store settings from the server (tax rate, delivery/pickup options, contact details).
const DEFAULTS = {
  currency: 'usd',
  taxRate: 0,
  delivery: { enabled: true, feeCents: 0, freeThresholdCents: 0, note: '' },
  pickup: { enabled: true, instructions: '' },
  store: { address: '', phone: '', email: '', hours: '' },
  payments: { stripeConfigured: false, publishableKey: null },
  loaded: false,
};

const StoreContext = createContext(DEFAULTS);

export function StoreProvider({ children }) {
  const [config, setConfig] = useState(DEFAULTS);
  useEffect(() => {
    api
      .config()
      .then((c) => setConfig({ ...DEFAULTS, ...c, loaded: true }))
      .catch(() => setConfig((c) => ({ ...c, loaded: true })));
  }, []);
  return <StoreContext.Provider value={config}>{children}</StoreContext.Provider>;
}

export const useStoreConfig = () => useContext(StoreContext);
