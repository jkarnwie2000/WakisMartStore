import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAsync } from '../hooks/useAsync.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import ProductGrid from '../components/ProductGrid.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { SectionHeader } from '../components/Section.jsx';
import { ErrorState } from '../components/Feedback.jsx';
import Newsletter from '../components/Newsletter.jsx';
import Icon from '../components/Icon.jsx';
import { Price } from '../components/ProductBits.jsx';
import { departmentPath } from '../utils/departments.js';
import { formatPrice } from '../utils/format.js';
import { useStoreConfig } from '../context/StoreContext.jsx';

// Sample testimonials for the demo storefront — replace with genuine customer reviews before launch.
const TESTIMONIALS = [
  { quote: 'Finally a store that has proper Ijebu garri AND Walkerswood jerk in the same basket. The jollof from the deli tastes like a Lagos owambe.', name: 'Adaeze O.', detail: 'Sample review' },
  { quote: 'The oxtail is always beautifully cut and the curry goat is the closest thing to my grandmother’s Sunday dinner in Kingston.', name: 'Marcia T.', detail: 'Sample review' },
  { quote: 'Ordering for pickup is so easy. I grab my plantain, scotch bonnets and a box of patties on the way home from work.', name: 'Kwame A.', detail: 'Sample review' },
];

function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="container hero__inner">
        <div className="hero__copy">
          <p className="eyebrow eyebrow--light">African · Caribbean · Deli &amp; Grocery</p>
          <h1 id="hero-title" className="hero__title">
            The taste of home, <em>stocked fresh</em> every week.
          </h1>
          <p className="hero__text">
            From Royal Stallion rice and egusi to ackee, Walkerswood jerk and scotch bonnets — plus freshly cooked jollof, curry goat and
            patties from our deli counter.
          </p>
          <div className="hero__actions">
            <Link to="/shop" className="btn btn--accent btn--lg">
              Shop now
            </Link>
            <Link to="/deli" className="btn btn--ghost-light btn--lg">
              <Icon name="flame" size={18} /> View deli menu
            </Link>
          </div>
          <ul className="hero__perks">
            <li>
              <Icon name="leaf" size={18} /> 200+ authentic products
            </li>
            <li>
              <Icon name="truck" size={18} /> Delivery or store pickup
            </li>
            <li>
              <Icon name="lock" size={18} /> Secure Stripe checkout
            </li>
          </ul>
        </div>
        <div className="hero__art" aria-hidden="true">
          <div className="hero__plate hero__plate--a">
            <img src="/images/products/party-jollof-rice.svg" alt="" width="260" height="260" />
          </div>
          <div className="hero__plate hero__plate--b">
            <img src="/images/products/jamaican-jerk-chicken.svg" alt="" width="200" height="200" />
          </div>
          <div className="hero__plate hero__plate--c">
            <img src="/images/products/green-plantains.svg" alt="" width="170" height="170" />
          </div>
          <div className="hero__badge">
            <strong>Cooked fresh</strong>
            <span>at our deli counter</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function CategoryTiles({ categories }) {
  return (
    <section className="section container" aria-labelledby="cats-title">
      <SectionHeader eyebrow="Shop by department" title="Everything for your kitchen" id="cats-title" linkTo="/shop" linkLabel="Shop all" />
      <ul className="category-grid">
        {categories.map((c) => (
          <li key={c.slug}>
            <Link to={departmentPath(c.slug)} className={`category-tile category-tile--${c.slug}`}>
              <img src={c.image} alt="" loading="lazy" width="160" height="160" />
              <span className="category-tile__name">{c.name}</span>
              <span className="category-tile__count">{c.productCount} items</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PromoBanners() {
  const { delivery } = useStoreConfig();
  return (
    <section className="container promo-grid" aria-label="Promotions">
      <Link to="/caribbean-groceries" className="promo promo--orange">
        <span className="promo__eyebrow">Island flavours</span>
        <strong className="promo__title">Jerk, curry &amp; pepper sauce season</strong>
        <span className="promo__cta">
          Shop Caribbean <Icon name="chevronRight" size={16} />
        </span>
      </Link>
      <Link to="/african-groceries" className="promo promo--green">
        <span className="promo__eyebrow">Soup-pot essentials</span>
        <strong className="promo__title">Egusi, ogbono, palm oil &amp; stockfish</strong>
        <span className="promo__cta">
          Shop African <Icon name="chevronRight" size={16} />
        </span>
      </Link>
      <Link to="/fresh-produce" className="promo promo--gold">
        <span className="promo__eyebrow">{delivery.enabled && delivery.freeThresholdCents > 0 ? `Free delivery over ${formatPrice(delivery.freeThresholdCents)}` : 'Fresh this week'}</span>
        <strong className="promo__title">Plantains, yams &amp; scotch bonnets</strong>
        <span className="promo__cta">
          Shop produce <Icon name="chevronRight" size={16} />
        </span>
      </Link>
    </section>
  );
}

function DeliFavorites({ items }) {
  if (!items.length) return null;
  const [lead, ...rest] = items;
  return (
    <section className="deli-band" aria-labelledby="deli-fav-title">
      <div className="container">
        <SectionHeader eyebrow="From our kitchen" title="Deli favourites" id="deli-fav-title" description="Home-style African and Caribbean dishes, cooked fresh at the Wakis Mart deli counter." linkTo="/deli" linkLabel="Full deli menu" />
        <div className="deli-feature">
          <Link to={`/product/${lead.slug}`} className="deli-feature__lead">
            <img src={lead.image} alt={lead.name} loading="lazy" width="600" height="600" />
            <div className="deli-feature__caption">
              <span className="badge badge--deli">
                <Icon name="star" size={12} /> Chef’s pick
              </span>
              <h3>{lead.name}</h3>
              <p>{lead.description}</p>
              <Price price={lead.price} from={lead.portions?.length > 1} />
            </div>
          </Link>
          <div className="deli-feature__grid">
            {rest.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="section container" aria-labelledby="testimonials-title">
      <SectionHeader eyebrow="Community love" title="What our customers say" id="testimonials-title" />
      <ul className="testimonials">
        {TESTIMONIALS.map((t) => (
          <li key={t.name} className="testimonial">
            <div className="testimonial__stars" aria-label="5 out of 5 stars">
              {Array.from({ length: 5 }, (_, i) => (
                <Icon key={i} name="star" size={16} />
              ))}
            </div>
            <blockquote>“{t.quote}”</blockquote>
            <p className="testimonial__name">
              {t.name} <span>· {t.detail}</span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function HomePage() {
  useDocumentTitle(null);
  const { data, error, loading, reload } = useAsync(() => api.home(), []);

  if (error) {
    return (
      <>
        <Hero />
        <div className="container section">
          <ErrorState error={error} onRetry={reload} />
        </div>
      </>
    );
  }

  return (
    <>
      <Hero />
      {data && <CategoryTiles categories={data.categories} />}

      <section className="section container" aria-labelledby="best-title">
        <SectionHeader eyebrow="Customer favourites" title="Best sellers" id="best-title" linkTo="/shop?sort=popular" />
        <ProductGrid products={data?.bestSellers} loading={loading} skeletons={8} />
      </section>

      <PromoBanners />

      <section className="section container split-highlights" aria-label="African and Caribbean highlights">
        <div>
          <SectionHeader eyebrow="West, East & Southern Africa" title="African grocery highlights" linkTo="/african-groceries" />
          <ProductGrid products={data?.african} loading={loading} skeletons={4} columns={2} />
        </div>
        <div>
          <SectionHeader eyebrow="Jamaica, Trinidad & the islands" title="Caribbean grocery highlights" linkTo="/caribbean-groceries" />
          <ProductGrid products={data?.caribbean} loading={loading} skeletons={4} columns={2} />
        </div>
      </section>

      {data && <DeliFavorites items={data.deli} />}

      <section className="section container" aria-labelledby="specials-title">
        <SectionHeader eyebrow="Limited time" title="Weekly specials" id="specials-title" description="Fresh savings on pantry favourites while stocks last." linkTo="/shop?onSale=true" linkLabel="All specials" />
        <ProductGrid products={data?.specials} loading={loading} skeletons={4} />
      </section>

      <Testimonials />
      <Newsletter />
    </>
  );
}
