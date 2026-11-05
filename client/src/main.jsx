import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { CartProvider } from './context/CartContext.jsx';
import { StoreProvider } from './context/StoreContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { Spinner } from './components/Feedback.jsx';
import './styles/global.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <StoreProvider>
        <AuthProvider>
          <CartProvider>
            <ToastProvider>
              <Suspense fallback={<Spinner />}>
                <App />
              </Suspense>
            </ToastProvider>
          </CartProvider>
        </AuthProvider>
      </StoreProvider>
    </BrowserRouter>
  </StrictMode>,
);
