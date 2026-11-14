import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { imageUpload } from '../middleware/upload.js';
import { env } from '../config/env.js';
import * as products from '../controllers/productController.js';
import * as checkout from '../controllers/checkoutController.js';
import * as orders from '../controllers/orderController.js';
import * as auth from '../controllers/authController.js';
import * as store from '../controllers/storeController.js';
import * as admin from '../controllers/adminController.js';
import * as suite from '../controllers/adminSuiteController.js';
import * as invites from '../controllers/adminInviteController.js';

const limiter = (max, windowMinutes = 15) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit: env.isTest ? 10000 : max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many requests. Please wait a few minutes and try again.' },
  });

export const api = Router();

api.get('/health', (_req, res) => res.json({ ok: true }));
api.get('/config', store.getConfig);

// Catalog
api.get('/home', products.getHome);
api.get('/categories', products.listCategories);
api.get('/categories/:slug', products.getCategory);
api.get('/products', (req, res) => products.listProducts(req, res));
api.get('/products/:slug', products.getProduct);

// Cart & checkout
api.post('/cart/validate', checkout.validateCart);
api.post('/checkout/quote', checkout.quote);
api.post('/checkout/session', limiter(30), checkout.createCheckoutSession);
api.post('/checkout/cancel', limiter(30), checkout.cancelPendingOrder);
api.get('/orders/confirmation/:sessionId', orders.getConfirmation);

// Customer accounts
api.post('/auth/register', limiter(20), auth.register);
api.post('/auth/login', limiter(20), auth.login);
api.post('/auth/logout', auth.logout);
api.get('/auth/me', auth.me);
api.put('/auth/profile', requireAuth, auth.updateProfile);
api.put('/auth/password', requireAuth, limiter(10), auth.changePassword);
api.post('/auth/forgot-password', limiter(5), auth.forgotPassword);
api.post('/auth/reset-password', limiter(10), auth.resetPassword);
api.get('/auth/admin-invite', limiter(30), invites.checkInvite);
api.post('/auth/register-admin', limiter(10), invites.registerAdmin);
api.get('/orders/mine', requireAuth, orders.myOrders);
api.get('/orders/mine/:orderNumber', requireAuth, orders.myOrder);

// Store
api.post('/newsletter', limiter(10), store.subscribe);
api.post('/contact', limiter(10), store.contact);

// Admin (every route requires an authenticated ADMIN user)
const adminRouter = Router();
adminRouter.use(requireAdmin);
adminRouter.get('/stats', admin.stats);
adminRouter.get('/products', admin.adminListProducts);
adminRouter.get('/products/:id', admin.adminGetProduct);
adminRouter.post('/products', admin.createProduct);
adminRouter.put('/products/:id', admin.updateProduct);
adminRouter.patch('/products/:id', admin.patchProduct);
adminRouter.delete('/products/:id', admin.deleteProduct);
adminRouter.post('/uploads', imageUpload.single('image'), admin.uploadImage);
adminRouter.get('/categories', admin.listAdminCategories);
adminRouter.post('/categories', admin.createCategory);
adminRouter.put('/categories/:id', admin.updateCategory);
adminRouter.delete('/categories/:id', admin.deleteCategory);
adminRouter.get('/orders', admin.listOrders);
adminRouter.get('/orders/:id', admin.getOrder);
adminRouter.patch('/orders/:id/status', admin.updateOrderStatus);
adminRouter.post('/orders/:id/resend-confirmation', admin.resendConfirmation);
adminRouter.get('/users', admin.listUsers);
adminRouter.patch('/users/:id/role', admin.updateUserRole);
adminRouter.get('/invites', invites.listInvites);
adminRouter.post('/invites', invites.createInvite);
adminRouter.post('/invites/:id/revoke', invites.revokeInvite);
adminRouter.get('/messages', admin.listMessages);
adminRouter.get('/overview', suite.overview);
adminRouter.get('/reports/sales', suite.salesReport);
adminRouter.get('/exports/orders.csv', suite.exportOrders);
adminRouter.get('/exports/sales.csv', suite.exportSales);
adminRouter.get('/exports/products.csv', suite.exportProducts);
adminRouter.get('/exports/customers.csv', suite.exportCustomers);
adminRouter.get('/fulfilment', suite.fulfilmentBoard);
adminRouter.get('/fulfilment/pick-list', suite.pickList);
adminRouter.post('/orders/:id/refund', suite.refundOrder);
adminRouter.get('/settings', suite.getSettings);
adminRouter.put('/settings', suite.updateSettings);
adminRouter.get('/inventory', suite.inventoryList);
adminRouter.get('/inventory/summary', suite.inventorySummary);
adminRouter.post('/inventory/bulk', suite.bulkInventory);
adminRouter.post('/inventory/import', suite.importInventory);
adminRouter.get('/customers', suite.listCustomers);
adminRouter.get('/customers/detail', suite.customerDetail);
adminRouter.get('/specials', suite.listSpecials);
adminRouter.post('/specials', suite.createSpecial);
adminRouter.post('/specials/end', suite.deleteSpecials);
adminRouter.get('/activity', suite.listActivity);
api.use('/admin', adminRouter);
