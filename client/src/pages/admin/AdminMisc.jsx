import { useState } from 'react';
import { api } from '../../services/api.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { useToast } from '../../context/ToastContext.jsx';
import FormField from '../../components/FormField.jsx';
import { ErrorState, Spinner, EmptyState } from '../../components/Feedback.jsx';
import { formatDate } from '../../utils/format.js';

function CategoryRow({ category, onSaved, onDelete }) {
  const [form, setForm] = useState({ name: category.name, description: category.description || '', sortOrder: category.sortOrder });
  const { notify } = useToast();
  const dirty = form.name !== category.name || form.description !== (category.description || '') || Number(form.sortOrder) !== category.sortOrder;
  const save = async (e) => {
    e.preventDefault();
    try {
      await api.admin.updateCategory(category.id, { ...form, image: category.image || '', sortOrder: Number(form.sortOrder) });
      notify(`${form.name} saved.`);
      onSaved();
    } catch (err) {
      notify(err.message, { type: 'error' });
    }
  };
  return (
    <form className="category-row panel" onSubmit={save}>
      <img src={category.image || '/favicon.svg'} alt="" width="56" height="56" />
      <FormField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <FormField label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="category-row__desc" />
      <FormField label="Order" type="number" min="0" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} className="category-row__order" />
      <div className="category-row__actions">
        <span className="muted">
          /{category.slug} · {category.productCount} products
        </span>
        <button type="submit" className="btn btn--primary btn--sm" disabled={!dirty}>
          Save
        </button>
        <button type="button" className="btn btn--outline btn--sm" onClick={() => onDelete(category)} disabled={category.productCount > 0} title={category.productCount > 0 ? 'Move or delete its products first' : undefined}>
          Delete
        </button>
      </div>
    </form>
  );
}

export function AdminCategories() {
  useDocumentTitle('Categories');
  const { notify } = useToast();
  const { data, error, loading, reload } = useAsync(() => api.admin.categories(), []);
  const [newCat, setNewCat] = useState({ name: '', description: '' });

  const create = async (e) => {
    e.preventDefault();
    if (newCat.name.trim().length < 2) return notify('Category name is required.', { type: 'error' });
    try {
      await api.admin.createCategory(newCat);
      setNewCat({ name: '', description: '' });
      notify('Category created.');
      reload();
    } catch (err) {
      notify(err.message, { type: 'error' });
    }
  };
  const remove = async (c) => {
    if (!window.confirm(`Delete category “${c.name}”?`)) return;
    try {
      await api.admin.deleteCategory(c.id);
      notify('Category deleted.');
      reload();
    } catch (err) {
      notify(err.message, { type: 'error' });
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-head">
        <h1>Categories</h1>
      </div>
      <p className="muted">The seven storefront departments have their own pages in the main navigation. New categories appear in Shop All filters and in product forms.</p>
      {loading ? <Spinner /> : error ? <ErrorState error={error} onRetry={reload} /> : data.categories.map((c) => <CategoryRow key={c.id} category={c} onSaved={reload} onDelete={remove} />)}
      <form className="panel" onSubmit={create}>
        <h2 className="panel__title">Add a category</h2>
        <div className="form-grid">
          <FormField label="Name" required value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} />
          <FormField label="Description" value={newCat.description} onChange={(e) => setNewCat({ ...newCat, description: e.target.value })} />
        </div>
        <button type="submit" className="btn btn--primary">
          Create category
        </button>
      </form>
    </div>
  );
}

export function AdminMessages() {
  useDocumentTitle('Messages');
  const { data, error, loading, reload } = useAsync(() => api.admin.messages(), []);
  if (loading) return <Spinner />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  return (
    <div className="admin-page">
      <div className="admin-head">
        <h1>Messages &amp; subscribers</h1>
      </div>
      <section className="panel">
        <h2 className="panel__title">Contact messages ({data.messages.length})</h2>
        {data.messages.length === 0 ? (
          <EmptyState icon="chat" title="No messages yet" />
        ) : (
          <ul className="message-list">
            {data.messages.map((m) => (
              <li key={m.id}>
                <div className="message-list__head">
                  <strong>{m.subject}</strong>
                  <span className="muted">{formatDate(m.createdAt, true)}</span>
                </div>
                <p className="muted">
                  {m.name} · <a href={`mailto:${m.email}`}>{m.email}</a>
                </p>
                <p className="message-list__body">{m.message}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="panel">
        <h2 className="panel__title">Newsletter subscribers ({data.subscribers.length})</h2>
        {data.subscribers.length === 0 ? (
          <p className="muted">No subscribers yet.</p>
        ) : (
          <ul className="subscriber-list">
            {data.subscribers.map((s) => (
              <li key={s.id}>
                {s.email} <span className="muted">· {formatDate(s.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
