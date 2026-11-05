import { Link } from 'react-router-dom';
import { formatPrice, formatDate, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '../utils/format.js';

export function StatusPill({ status, kind = 'order' }) {
  const label = kind === 'payment' ? PAYMENT_STATUS_LABELS[status] : ORDER_STATUS_LABELS[status];
  return <span className={`pill pill--${kind}-${status.toLowerCase().replace(/_/g, '-')}`}>{label || status}</span>;
}

/** Shared order breakdown used on the confirmation page, account order details and admin. */
export default function OrderDetails({ order, showCustomer = true }) {
  const addr = order.shippingAddress;
  return (
    <div className="order-details">
      <div className="order-meta">
        <div>
          <span className="order-meta__label">Order number</span>
          <strong className="order-meta__value">{order.orderNumber}</strong>
        </div>
        <div>
          <span className="order-meta__label">Placed</span>
          <span className="order-meta__value">{formatDate(order.createdAt, true)}</span>
        </div>
        <div>
          <span className="order-meta__label">Payment</span>
          <StatusPill status={order.paymentStatus} kind="payment" />
        </div>
        <div>
          <span className="order-meta__label">Order status</span>
          <StatusPill status={order.status} />
        </div>
      </div>

      <table className="order-table">
        <caption className="visually-hidden">Items in order {order.orderNumber}</caption>
        <thead>
          <tr>
            <th scope="col">Item</th>
            <th scope="col" className="num">
              Price
            </th>
            <th scope="col" className="num">
              Qty
            </th>
            <th scope="col" className="num">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((i) => (
            <tr key={i.id}>
              <td>
                <div className="order-item">
                  {i.image && <img src={i.image} alt="" width="44" height="44" loading="lazy" />}
                  <span>
                    {i.productSlug ? <Link to={`/product/${i.productSlug}`}>{i.productName}</Link> : i.productName}
                    {i.portionLabel && <small>{i.portionLabel}</small>}
                  </span>
                </div>
              </td>
              <td className="num">{formatPrice(i.unitPrice)}</td>
              <td className="num">{i.quantity}</td>
              <td className="num">{formatPrice(i.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" colSpan={3}>
              Subtotal
            </th>
            <td className="num">{formatPrice(order.subtotal)}</td>
          </tr>
          <tr>
            <th scope="row" colSpan={3}>
              Tax
            </th>
            <td className="num">{formatPrice(order.tax)}</td>
          </tr>
          <tr>
            <th scope="row" colSpan={3}>
              {order.fulfillmentMethod === 'DELIVERY' ? 'Delivery' : 'Store pickup'}
            </th>
            <td className="num">{order.deliveryFee ? formatPrice(order.deliveryFee) : 'Free'}</td>
          </tr>
          <tr className="order-table__total">
            <th scope="row" colSpan={3}>
              Total
            </th>
            <td className="num">{formatPrice(order.total)}</td>
          </tr>
        </tfoot>
      </table>

      {showCustomer && (
        <div className="order-blocks">
          <div className="order-block">
            <h3>Customer</h3>
            <p>
              {order.customerName}
              <br />
              {order.customerEmail}
              {order.customerPhone && (
                <>
                  <br />
                  {order.customerPhone}
                </>
              )}
            </p>
          </div>
          <div className="order-block">
            <h3>{order.fulfillmentMethod === 'DELIVERY' ? 'Delivery address' : 'Fulfilment'}</h3>
            {addr ? (
              <p>
                {addr.line1}
                {addr.line2 && (
                  <>
                    <br />
                    {addr.line2}
                  </>
                )}
                <br />
                {addr.city}, {addr.state} {addr.postalCode}
              </p>
            ) : (
              <p>Store pickup</p>
            )}
          </div>
          {order.notes && (
            <div className="order-block">
              <h3>Notes</h3>
              <p>{order.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
