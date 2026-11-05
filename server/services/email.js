// Order confirmation emails via Resend (https://resend.com) — plain HTTPS, no SDK needed.
// Enabled when RESEND_API_KEY is set. Without a verified domain, Resend only delivers to the
// email address that owns the Resend account; set EMAIL_FROM to an address on your verified
// domain (e.g. "Wakis Mart <orders@wakismart.com>") to email any customer.
import { env } from '../config/env.js';

const RESEND_URL = 'https://api.resend.com/emails';
const DEFAULT_FROM = 'Wakis Mart <onboarding@resend.dev>';

export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY);

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const money = (cents, currency = 'usd') => new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);

export function renderOrderConfirmation(order) {
  const store = env.store; // { address, phone, email, delivery, pickup, … }
  const { delivery, pickup } = store;
  const isDelivery = order.fulfillmentMethod === 'DELIVERY';
  const firstName = order.customerName.split(' ')[0];
  const orderUrl = order.stripeSessionId ? `${env.clientUrl}/order-confirmation?session_id=${encodeURIComponent(order.stripeSessionId)}` : env.clientUrl;
  const fulfilment = isDelivery
    ? `<strong>Home delivery to:</strong><br>${esc(order.shippingLine1)}${order.shippingLine2 ? `, ${esc(order.shippingLine2)}` : ''}<br>${esc(order.shippingCity)}, ${esc(order.shippingState)} ${esc(order.shippingPostalCode)}<br><br>${esc(delivery.note)}`
    : `<strong>Store pickup</strong>${store.address ? ` at ${esc(store.address)}` : ''}<br><br>${esc(pickup.instructions)}`;

  const rows = order.items
    .map(
      (i) => `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #eadfc9">${esc(i.productName)}${i.portionLabel ? `<br><span style="color:#6b5a48;font-size:13px">${esc(i.portionLabel)}</span>` : ''}</td>
        <td style="padding:10px 0;border-bottom:1px solid #eadfc9;text-align:center">${i.quantity}</td>
        <td style="padding:10px 0;border-bottom:1px solid #eadfc9;text-align:right">${money(i.lineTotal, order.currency)}</td>
      </tr>`,
    )
    .join('');
  const totalRow = (label, value, strong = false) =>
    `<tr><td colspan="2" style="padding:4px 0;text-align:right;color:#4a3b2e${strong ? ';font-weight:700;font-size:16px;color:#241a12' : ''}">${label}</td><td style="padding:4px 0;text-align:right${strong ? ';font-weight:700;font-size:16px' : ''}">${value}</td></tr>`;

  const html = `<!doctype html><html><body style="margin:0;background:#fffcf6;font-family:Arial,Helvetica,sans-serif;color:#241a12">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fffcf6;padding:24px 12px"><tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #eadfc9;border-radius:14px;overflow:hidden">
    <tr><td style="background:#1f5134;padding:22px 28px;color:#fff6e7;font-family:Georgia,serif;font-size:24px;font-weight:bold">Wakis <span style="color:#ecd08a">Mart</span></td></tr>
    <tr><td style="height:6px;background:#e07a1f"></td></tr>
    <tr><td style="padding:28px">
      <h1 style="font-family:Georgia,serif;font-size:24px;margin:0 0 8px">Thank you, ${esc(firstName)}! Your order is confirmed.</h1>
      <p style="margin:0 0 20px;color:#4a3b2e">We’ve received your payment. Here are your order details.</p>
      <table role="presentation" width="100%" style="background:#fff6e7;border-radius:10px;padding:14px 16px;margin-bottom:20px"><tr>
        <td><span style="font-size:12px;color:#6b5a48;text-transform:uppercase;letter-spacing:1px">Order number</span><br><strong style="font-size:17px">${esc(order.orderNumber)}</strong></td>
        <td style="text-align:right"><span style="font-size:12px;color:#6b5a48;text-transform:uppercase;letter-spacing:1px">Total paid</span><br><strong style="font-size:17px">${money(order.total, order.currency)}</strong></td>
      </tr></table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">
        <tr><th style="text-align:left;padding-bottom:6px;border-bottom:2px solid #eadfc9">Item</th><th style="padding-bottom:6px;border-bottom:2px solid #eadfc9">Qty</th><th style="text-align:right;padding-bottom:6px;border-bottom:2px solid #eadfc9">Total</th></tr>
        ${rows}
        ${totalRow('Subtotal', money(order.subtotal, order.currency))}
        ${totalRow('Tax', money(order.tax, order.currency))}
        ${totalRow(isDelivery ? 'Delivery' : 'Store pickup', order.deliveryFee ? money(order.deliveryFee, order.currency) : 'Free')}
        ${totalRow('Total', money(order.total, order.currency), true)}
      </table>
      <div style="margin-top:22px;padding:16px;border:1px solid #eadfc9;border-radius:10px;font-size:14px;line-height:1.5">${fulfilment}</div>
      <p style="margin:24px 0 0"><a href="${esc(orderUrl)}" style="display:inline-block;background:#c2570f;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px">View your order</a></p>
      <p style="margin:22px 0 0;font-size:13px;color:#6b5a48">Questions? ${store.email ? 'Reply to this email or contact us' : 'Contact us'} through <a href="${esc(env.clientUrl)}/contact" style="color:#1f5134">our contact page</a> and include your order number.${store.phone ? ` You can also call us on ${esc(store.phone)}.` : ''}</p>
    </td></tr>
    <tr><td style="background:#0d2818;color:#eedcb9;padding:16px 28px;font-size:12px">Wakis Mart · African · Caribbean Deli &amp; Grocery</td></tr>
  </table></td></tr></table></body></html>`;

  const text = [
    `Thank you, ${firstName}! Your Wakis Mart order is confirmed.`,
    '',
    `Order number: ${order.orderNumber}`,
    ...order.items.map((i) => `- ${i.productName}${i.portionLabel ? ` (${i.portionLabel})` : ''} × ${i.quantity}: ${money(i.lineTotal, order.currency)}`),
    '',
    `Subtotal: ${money(order.subtotal, order.currency)}`,
    `Tax: ${money(order.tax, order.currency)}`,
    `${isDelivery ? 'Delivery' : 'Store pickup'}: ${order.deliveryFee ? money(order.deliveryFee, order.currency) : 'Free'}`,
    `Total paid: ${money(order.total, order.currency)}`,
    '',
    isDelivery ? `Home delivery. ${delivery.note}` : `Store pickup. ${pickup.instructions}`,
    '',
    `View your order: ${orderUrl}`,
  ].join('\n');

  return { subject: `Your Wakis Mart order ${order.orderNumber} is confirmed`, html, text };
}

/**
 * Sends the order confirmation. Never throws — email problems must not affect payment processing.
 * @returns {Promise<{sent:boolean, id?:string, error?:string}>}
 */
export async function sendOrderConfirmation(order, { idempotencyKey = `order-confirmation-${order.orderNumber}` } = {}) {
  if (!emailConfigured()) return { sent: false, error: 'RESEND_API_KEY not set' };
  try {
    const { subject, html, text } = renderOrderConfirmation(order);
    const res = await fetch(RESEND_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ from: process.env.EMAIL_FROM || DEFAULT_FROM, to: [order.customerEmail], subject, html, text, ...(env.store.email && { reply_to: env.store.email }) }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.warn(`[email] Resend rejected confirmation for ${order.orderNumber}: ${res.status} ${data?.message || ''}`);
      return { sent: false, error: data?.message || `HTTP ${res.status}` };
    }
    console.log(`[email] Confirmation for ${order.orderNumber} sent (${data.id}).`);
    return { sent: true, id: data.id };
  } catch (err) {
    console.warn(`[email] Could not send confirmation for ${order.orderNumber}: ${err.message}`);
    return { sent: false, error: err.message };
  }
}
