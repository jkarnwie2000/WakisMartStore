import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import { RequireAdmin, RequireAuth } from './components/RouteGuards.jsx';
import HomePage from './pages/HomePage.jsx';
import ShopPage from './pages/ShopPage.jsx';
import DeliPage from './pages/DeliPage.jsx';
import ProductPage from './pages/ProductPage.jsx';
import CartPage from './pages/CartPage.jsx';
import CheckoutPage from './pages/CheckoutPage.jsx';
import OrderConfirmationPage from './pages/OrderConfirmationPage.jsx';
import AccountPage, { AccountOrderPage } from './pages/AccountPage.jsx';
import { LoginPage, RegisterPage } from './pages/AuthPages.jsx';
import { AdminLoginPage, AdminRegisterPage, ForgotPasswordPage, ResetPasswordPage } from './pages/AdminAuthPages.jsx';
import { AboutPage, ContactPage, NotFoundPage } from './pages/InfoPages.jsx';
import { DEPARTMENTS } from './utils/departments.js';

// The admin bundle is only downloaded by administrators.
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout.jsx'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard.jsx'));
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts.jsx'));
const AdminProductForm = lazy(() => import('./pages/admin/AdminProductForm.jsx'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders.jsx').then((m) => ({ default: m.AdminOrders })));
const AdminOrderDetail = lazy(() => import('./pages/admin/AdminOrders.jsx').then((m) => ({ default: m.AdminOrderDetail })));
const AdminCategories = lazy(() => import('./pages/admin/AdminMisc.jsx').then((m) => ({ default: m.AdminCategories })));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers.jsx'));
const AdminReports = lazy(() => import('./pages/admin/AdminReports.jsx'));
const AdminFulfilment = lazy(() => import('./pages/admin/AdminFulfilment.jsx').then((m) => ({ default: m.AdminFulfilment })));
const AdminPickList = lazy(() => import('./pages/admin/AdminFulfilment.jsx').then((m) => ({ default: m.AdminPickList })));
const AdminPackingSlip = lazy(() => import('./pages/admin/AdminFulfilment.jsx').then((m) => ({ default: m.AdminPackingSlip })));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings.jsx'));
const AdminInventory = lazy(() => import('./pages/admin/AdminInventory.jsx'));
const AdminCustomers = lazy(() => import('./pages/admin/AdminCustomers.jsx').then((m) => ({ default: m.AdminCustomers })));
const AdminCustomerDetail = lazy(() => import('./pages/admin/AdminCustomers.jsx').then((m) => ({ default: m.AdminCustomerDetail })));
const AdminSpecials = lazy(() => import('./pages/admin/AdminSpecials.jsx'));
const AdminActivity = lazy(() => import('./pages/admin/AdminActivity.jsx'));
const AdminMessages = lazy(() => import('./pages/admin/AdminMisc.jsx').then((m) => ({ default: m.AdminMessages })));

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="shop" element={<ShopPage key="all" />} />
        {DEPARTMENTS.filter((d) => d.slug !== 'deli').map((d) => (
          <Route key={d.slug} path={d.path.slice(1)} element={<ShopPage key={d.slug} categorySlug={d.slug} />} />
        ))}
        <Route path="deli" element={<DeliPage />} />
        <Route path="deli/all" element={<ShopPage key="deli" categorySlug="deli" />} />
        <Route path="product/:slug" element={<ProductPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="order-confirmation" element={<OrderConfirmationPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="admin/login" element={<AdminLoginPage />} />
        <Route path="admin/register" element={<AdminRegisterPage />} />
        <Route path="account" element={<RequireAuth><AccountPage /></RequireAuth>} />
        <Route path="account/profile" element={<RequireAuth><AccountPage /></RequireAuth>} />
        <Route path="account/orders/:orderNumber" element={<RequireAuth><AccountOrderPage /></RequireAuth>} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route path="admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
        <Route index element={<AdminDashboard />} />
        <Route path="products" element={<AdminProducts key="products" />} />
        <Route path="products/new" element={<AdminProductForm key="new" />} />
        <Route path="products/:id" element={<AdminProductForm />} />
        <Route path="deli" element={<AdminProducts key="deli" deliMode />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="orders/:id" element={<AdminOrderDetail />} />
        <Route path="orders/:id/slip" element={<AdminPackingSlip />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="fulfilment" element={<AdminFulfilment />} />
        <Route path="fulfilment/pick-list" element={<AdminPickList />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="inventory" element={<AdminInventory />} />
        <Route path="customers" element={<AdminCustomers />} />
        <Route path="customers/view" element={<AdminCustomerDetail />} />
        <Route path="specials" element={<AdminSpecials />} />
        <Route path="activity" element={<AdminActivity />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="messages" element={<AdminMessages />} />
      </Route>
    </Routes>
  );
}
