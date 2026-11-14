// Thin wrapper around fetch for the Wakis Mart REST API.
// All requests go to the same origin (/api is proxied to Express in development),
// and include credentials so the httpOnly auth cookie is sent.

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request(path, { method = 'GET', body, signal, isForm = false } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      signal,
      credentials: 'same-origin',
      headers: body && !isForm ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError('We could not reach the Wakis Mart server. Please check your connection and try again.', 0);
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(data?.error || `Request failed (${res.status})`, res.status, data);
  return data;
}

const qs = (params = {}) => {
  const s = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== false),
  ).toString();
  return s ? `?${s}` : '';
};

export const api = {
  // Store
  config: () => request('/config'),
  home: () => request('/home'),
  categories: () => request('/categories'),
  category: (slug) => request(`/categories/${slug}`),
  products: (params, signal) => request(`/products${qs(params)}`, { signal }),
  product: (slug, signal) => request(`/products/${encodeURIComponent(slug)}`, { signal }),
  subscribe: (email) => request('/newsletter', { method: 'POST', body: { email } }),
  contact: (data) => request('/contact', { method: 'POST', body: data }),

  // Cart & checkout
  validateCart: (items) => request('/cart/validate', { method: 'POST', body: { items } }),
  quote: (items, fulfillmentMethod) => request('/checkout/quote', { method: 'POST', body: { items, fulfillmentMethod } }),
  createCheckoutSession: (payload) => request('/checkout/session', { method: 'POST', body: payload }),
  cancelCheckout: (orderNumber) => request('/checkout/cancel', { method: 'POST', body: { orderNumber } }),
  confirmation: (sessionId) => request(`/orders/confirmation/${encodeURIComponent(sessionId)}`),

  // Auth & account
  me: () => request('/auth/me'),
  login: (data) => request('/auth/login', { method: 'POST', body: data }),
  register: (data) => request('/auth/register', { method: 'POST', body: data }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  updateProfile: (data) => request('/auth/profile', { method: 'PUT', body: data }),
  changePassword: (data) => request('/auth/password', { method: 'PUT', body: data }),
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (token, password) => request('/auth/reset-password', { method: 'POST', body: { token, password } }),
  myOrders: () => request('/orders/mine'),
  myOrder: (orderNumber) => request(`/orders/mine/${encodeURIComponent(orderNumber)}`),

  // Admin
  admin: {
    stats: () => request('/admin/stats'),
    products: (params, signal) => request(`/admin/products${qs(params)}`, { signal }),
    product: (id) => request(`/admin/products/${id}`),
    createProduct: (data) => request('/admin/products', { method: 'POST', body: data }),
    updateProduct: (id, data) => request(`/admin/products/${id}`, { method: 'PUT', body: data }),
    patchProduct: (id, data) => request(`/admin/products/${id}`, { method: 'PATCH', body: data }),
    deleteProduct: (id) => request(`/admin/products/${id}`, { method: 'DELETE' }),
    uploadImage: (file) => {
      const form = new FormData();
      form.append('image', file);
      return request('/admin/uploads', { method: 'POST', body: form, isForm: true });
    },
    categories: () => request('/admin/categories'),
    createCategory: (data) => request('/admin/categories', { method: 'POST', body: data }),
    updateCategory: (id, data) => request(`/admin/categories/${id}`, { method: 'PUT', body: data }),
    deleteCategory: (id) => request(`/admin/categories/${id}`, { method: 'DELETE' }),
    orders: (params, signal) => request(`/admin/orders${qs(params)}`, { signal }),
    order: (id) => request(`/admin/orders/${id}`),
    resendConfirmation: (id) => request(`/admin/orders/${id}/resend-confirmation`, { method: 'POST' }),
    updateOrderStatus: (id, status) => request(`/admin/orders/${id}/status`, { method: 'PATCH', body: { status } }),
    messages: () => request('/admin/messages'),
    users: (params, signal) => request(`/admin/users${qs(params)}`, { signal }),
    updateUserRole: (id, role) => request(`/admin/users/${id}/role`, { method: 'PATCH', body: { role } }),
  },
};
