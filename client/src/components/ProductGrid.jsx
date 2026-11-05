import ProductCard from './ProductCard.jsx';

export function ProductSkeleton() {
  return (
    <div className="card card--skeleton" aria-hidden="true">
      <div className="card__media skeleton" />
      <div className="card__body">
        <div className="skeleton skeleton--line" style={{ width: '40%' }} />
        <div className="skeleton skeleton--line" style={{ width: '85%' }} />
        <div className="skeleton skeleton--line" style={{ width: '60%' }} />
      </div>
    </div>
  );
}

export default function ProductGrid({ products, loading = false, skeletons = 8, columns }) {
  return (
    <div className="product-grid" style={columns ? { '--cols': columns } : undefined} aria-busy={loading || undefined}>
      {products?.map((p) => <ProductCard key={p.id} product={p} />)}
      {loading && Array.from({ length: skeletons }, (_, i) => <ProductSkeleton key={`s${i}`} />)}
    </div>
  );
}
