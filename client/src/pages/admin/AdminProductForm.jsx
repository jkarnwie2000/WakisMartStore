import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { useToast } from '../../context/ToastContext.jsx';
import FormField from '../../components/FormField.jsx';
import { Alert, ErrorState, Spinner } from '../../components/Feedback.jsx';
import Icon from '../../components/Icon.jsx';

const EMPTY = {
  name: '', description: '', image: '', price: '', compareAtPrice: '', unit: '', categoryId: '', subcategory: '', brand: 'Wakis Mart Select',
  sku: '', origin: 'BOTH', inventory: 0, isActive: true, featured: false, isDeli: false, portions: [],
};

const toForm = (p) => ({
  name: p.name, description: p.description, image: p.image, price: (p.price / 100).toFixed(2), compareAtPrice: p.compareAtPrice ? (p.compareAtPrice / 100).toFixed(2) : '',
  unit: p.unit || '', categoryId: String(p.categoryId), subcategory: p.subcategory || '', brand: p.brand, sku: p.sku, origin: p.origin, inventory: p.inventory,
  isActive: p.isActive, featured: p.featured, isDeli: p.isDeli, portions: (p.portions || []).map((o) => ({ label: o.label, price: (o.price / 100).toFixed(2) })),
});

export default function AdminProductForm() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  useDocumentTitle(isNew ? 'Add Product' : 'Edit Product');
  const navigate = useNavigate();
  const { notify } = useToast();
  const [form, setForm] = useState(EMPTY);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [loadError, setLoadError] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api.admin.categories().then((r) => setCategories(r.categories)).catch(() => {});
    if (isNew) return;
    api.admin
      .product(id)
      .then((r) => setForm(toForm(r.product)))
      .catch(setLoadError)
      .finally(() => setLoading(false));
  }, [id, isNew]);

  const set = (k) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => {
      const next = { ...f, [k]: value };
      // Selecting the deli category makes it a deli item by default.
      if (k === 'categoryId') {
        const cat = categories.find((c) => String(c.id) === value);
        if (cat?.slug === 'deli') next.isDeli = true;
      }
      return next;
    });
  };

  const setPortion = (i, k, v) => setForm((f) => ({ ...f, portions: f.portions.map((p, idx) => (idx === i ? { ...p, [k]: v } : p)) }));

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const { url } = await api.admin.uploadImage(file);
      setForm((f) => ({ ...f, image: url }));
      notify('Image uploaded.');
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    const portions = form.isDeli ? form.portions.filter((p) => p.label.trim()) : [];
    if (!portions.length && form.price === '') return setError('Please enter a price (or add portion sizes for deli items).');
    const payload = {
      ...form,
      price: portions.length ? Math.min(...portions.map((p) => Number(p.price))) : Number(form.price),
      compareAtPrice: form.compareAtPrice === '' ? null : Number(form.compareAtPrice),
      categoryId: Number(form.categoryId),
      inventory: Number(form.inventory),
      portions: portions.map((p) => ({ label: p.label, price: Number(p.price) })),
    };
    setSaving(true);
    try {
      if (isNew) await api.admin.createProduct(payload);
      else await api.admin.updateProduct(id, payload);
      notify(`${form.name} saved.`);
      navigate(form.isDeli ? '/admin/deli' : '/admin/products');
    } catch (err) {
      setError(err.data?.details?.length ? `${err.data.details[0].field}: ${err.data.details[0].message}` : err.message);
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;
  if (loadError) return <ErrorState error={loadError} />;

  return (
    <div className="admin-page">
      <Link to="/admin/products" className="back-link">
        <Icon name="arrowLeft" size={16} /> All products
      </Link>
      <h1>{isNew ? 'Add product' : `Edit ${form.name}`}</h1>
      <form className="admin-form" onSubmit={submit} noValidate>
        {error && <Alert type="error">{error}</Alert>}
        <div className="admin-form__grid">
          <section className="panel">
            <h2 className="panel__title">Details</h2>
            <FormField label="Product name" required value={form.name} onChange={set('name')} maxLength={140} />
            <FormField label="Description" as="textarea" rows={4} required value={form.description} onChange={set('description')} maxLength={2000} />
            <div className="form-grid">
              <FormField label="Brand" required value={form.brand} onChange={set('brand')} />
              <FormField label="SKU" required value={form.sku} onChange={set('sku')} hint="Letters, numbers and dashes, e.g. AFR-0101" />
              <FormField label="Category" as="select" required value={form.categoryId} onChange={set('categoryId')}>
                <option value="">Choose a category…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </FormField>
              <FormField label="Sub-category" value={form.subcategory} onChange={set('subcategory')} hint="e.g. Rice & Grains, Caribbean Sauces" />
              <FormField label="Origin" as="select" value={form.origin} onChange={set('origin')}>
                <option value="AFRICAN">African</option>
                <option value="CARIBBEAN">Caribbean</option>
                <option value="BOTH">African &amp; Caribbean</option>
              </FormField>
              <FormField label="Unit / size" value={form.unit} onChange={set('unit')} hint="e.g. 5 lb bag, 12 oz jar" />
            </div>
          </section>

          <section className="panel">
            <h2 className="panel__title">Image</h2>
            <div className="image-field">
              {form.image ? <img src={form.image} alt="Product preview" width="160" height="160" /> : <div className="image-field__empty">No image</div>}
              <div>
                <label className="btn btn--outline">
                  <Icon name="upload" size={16} /> {uploading ? 'Uploading…' : 'Upload image'}
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={upload} className="visually-hidden" disabled={uploading} />
                </label>
                <p className="field__hint">JPG, PNG, WebP or GIF up to 5 MB. Square images look best.</p>
                <FormField label="…or image URL / path" value={form.image} onChange={set('image')} />
              </div>
            </div>
          </section>

          <section className="panel">
            <h2 className="panel__title">Price &amp; stock</h2>
            <div className="form-grid">
              <FormField label="Price ($)" type="number" min="0" step="0.01" value={form.price} onChange={set('price')} disabled={form.isDeli && form.portions.length > 0} hint={form.isDeli && form.portions.length ? 'Set by the cheapest portion' : undefined} />
              <FormField label="Compare-at price ($)" type="number" min="0" step="0.01" value={form.compareAtPrice} onChange={set('compareAtPrice')} hint="Optional — shows the item as a weekly special." />
              <FormField label={form.isDeli ? 'Portions available' : 'Inventory'} type="number" min="0" value={form.inventory} onChange={set('inventory')} />
            </div>
            <div className="toggles">
              <label className="check">
                <input type="checkbox" checked={form.isActive} onChange={set('isActive')} /> <span>Active (visible in store)</span>
              </label>
              <label className="check">
                <input type="checkbox" checked={form.featured} onChange={set('featured')} /> <span>Featured product</span>
              </label>
              <label className="check">
                <input type="checkbox" checked={form.isDeli} onChange={set('isDeli')} /> <span>Deli / prepared food</span>
              </label>
            </div>
          </section>

          {form.isDeli && (
            <section className="panel">
              <h2 className="panel__title">Portion sizes</h2>
              <p className="muted">Leave empty to sell at a single price.</p>
              {form.portions.map((p, i) => (
                <div key={i} className="portion-row">
                  <FormField label="Label" value={p.label} onChange={(e) => setPortion(i, 'label', e.target.value)} placeholder="Small (16 oz)" />
                  <FormField label="Price ($)" type="number" min="0" step="0.01" value={p.price} onChange={(e) => setPortion(i, 'price', e.target.value)} />
                  <button type="button" className="icon-btn icon-btn--danger" aria-label={`Remove portion ${p.label || i + 1}`} onClick={() => setForm((f) => ({ ...f, portions: f.portions.filter((_, idx) => idx !== i) }))}>
                    <Icon name="trash" size={18} />
                  </button>
                </div>
              ))}
              <button type="button" className="btn btn--outline btn--sm" onClick={() => setForm((f) => ({ ...f, portions: [...f.portions, { label: '', price: '' }] }))}>
                + Add portion
              </button>
            </section>
          )}
        </div>
        <div className="admin-form__actions">
          <button type="submit" className="btn btn--primary btn--lg" disabled={saving || uploading}>
            {saving ? 'Saving…' : isNew ? 'Create product' : 'Save changes'}
          </button>
          <Link to="/admin/products" className="btn btn--outline btn--lg">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
