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
adminRouter.get('/messages', admin.listMessages);
api.use('/admin', adminRouter);
