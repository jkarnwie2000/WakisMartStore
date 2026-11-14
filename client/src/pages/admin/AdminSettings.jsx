import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { useToast } from '../../context/ToastContext.jsx';
import FormField from '../../components/FormField.jsx';
import { Alert, ErrorState, Spinner } from '../../components/Feedback.jsx';

const toForm = (s) => ({
  taxRatePercent: +(s.taxRate * 100).toFixed(3),
  deliveryEnabled: s.delivery.enabled,
  deliveryFee: (s.delivery.feeCents / 100).toFixed(2),
  freeDeliveryThreshold: (s.delivery.freeThresholdCents / 100).toFixed(2),
  deliveryNote: s.delivery.note || '',
  pickupEnabled: s.pickup.enabled,
  pickupInstructions: s.pickup.instructions || '',
  storeAddress: s.address || '',
  storePhone: s.phone || '',
  storeEmail: s.email || '',
  storeHours: s.hours || '',
  announcement: s.announcement || '',
});

export default function AdminSettings() {
  useDocumentTitle('Store Settings');
  const { notify } = useToast();
  const [form, setForm] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.admin
      .settings()
      .then((r) => setForm(toForm(r.settings)))
      .catch(setLoadError);
  }, []);

  if (loadError) return <ErrorState error={loadError} />;
  if (!form) return <Spinner />;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.deliveryEnabled && !form.pickupEnabled) {
      setError('Keep at least one of home delivery or store pickup switched on, or customers cannot check out.');
      return;
    }
    setSaving(true);
    try {
      const r = await api.admin.updateSettings({
        ...form,
        taxRatePercent: Number(form.taxRatePercent),
        deliveryFee: Number(form.deliveryFee),
        freeDeliveryThreshold: Number(form.freeDeliveryThreshold),
      });
      setForm(toForm(r.settings));
      notify(r.message);
    } catch (err) {
      setError(err.data?.details?.[0]?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-head">
        <div>
          <h1>Store settings</h1>
          <p className="muted">Changes apply to the storefront and checkout within a minute, with no redeploy needed.</p>
        </div>
      </div>
      <form className="admin-form" onSubmit={submit} noValidate>
        {error && <Alert type="error">{error}</Alert>}
        <div className="admin-form__grid">
          <section className="panel">
            <h2 className="panel__title">Tax</h2>
            <FormField label="Sales tax rate (%)" type="number" min="0" max="25" step="0.001" value={form.taxRatePercent} onChange={set('taxRatePercent')} hint="Applied to the order subtotal at checkout. Use 0 to turn tax off." />
          </section>

          <section className="panel">
            <h2 className="panel__title">Announcement bar</h2>
            <FormField label="Message" value={form.announcement} onChange={set('announcement')} maxLength={200} hint="Shown at the top of every page. Leave blank for the standard deli message." />
          </section>

          <section className="panel">
            <h2 className="panel__title">Home delivery</h2>
            <label className="check">
              <input type="checkbox" checked={form.deliveryEnabled} onChange={set('deliveryEnabled')} /> <span>Offer home delivery</span>
            </label>
            <div className="form-grid">
              <FormField label="Delivery fee ($)" type="number" min="0" step="0.01" value={form.deliveryFee} onChange={set('deliveryFee')} disabled={!form.deliveryEnabled} />
              <FormField label="Free delivery over ($)" type="number" min="0" step="0.01" value={form.freeDeliveryThreshold} onChange={set('freeDeliveryThreshold')} disabled={!form.deliveryEnabled} hint="0 = delivery is never free" />
            </div>
            <FormField label="Delivery note shown at checkout" as="textarea" rows={3} maxLength={400} value={form.deliveryNote} onChange={set('deliveryNote')} />
          </section>

          <section className="panel">
            <h2 className="panel__title">Store pickup</h2>
            <label className="check">
              <input type="checkbox" checked={form.pickupEnabled} onChange={set('pickupEnabled')} /> <span>Offer free store pickup</span>
            </label>
            <FormField label="Pickup instructions" as="textarea" rows={3} maxLength={400} value={form.pickupInstructions} onChange={set('pickupInstructions')} hint="Shown at checkout, on the confirmation page and in the confirmation email." />
          </section>

          <section className="panel span-2-lg">
            <h2 className="panel__title">Store details</h2>
            <p className="muted">Shown in the footer, contact page, checkout and emails. Leave blank to hide.</p>
            <div className="form-grid">
              <FormField label="Address" value={form.storeAddress} onChange={set('storeAddress')} maxLength={200} className="span-2" />
              <FormField label="Phone" type="tel" value={form.storePhone} onChange={set('storePhone')} maxLength={40} />
              <FormField label="Email" type="email" value={form.storeEmail} onChange={set('storeEmail')} maxLength={160} hint="Also used as the reply-to address on emails." />
              <FormField label="Opening hours" value={form.storeHours} onChange={set('storeHours')} maxLength={200} className="span-2" placeholder="e.g. Mon–Sat 9am–8pm · Sun 11am–6pm" />
            </div>
          </section>
        </div>
        <div className="admin-form__actions">
          <button type="submit" className="btn btn--primary btn--lg" disabled={saving}>
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
