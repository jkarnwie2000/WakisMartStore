// Generates lightweight, branded SVG placeholder images for every product and category.
// Output: client/public/images/products/<slug>.svg and client/public/images/categories/<slug>.svg
// Replace any file with real photography (same filename), or upload a photo via the admin dashboard.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORIES, GROCERY_SECTIONS, DELI_ITEMS } from './data/catalog.js';
import { slugify } from '../utils/slugify.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../../client/public/images');
const PRODUCT_DIR = path.join(OUT, 'products');
const CATEGORY_DIR = path.join(OUT, 'categories');

const PACK_COLORS = ['#1F5134', '#D9661F', '#A8322B', '#B8862B', '#2D6A82', '#5E3A7A', '#3D7A36', '#7E4E24', '#0F4C5C', '#C2452D', '#2E5E4E', '#8A6D1F'];
const CATEGORY_THEME = {
  'african-groceries': ['#FFF4E0', '#F6DDB3', '#1F5134'],
  'caribbean-groceries': ['#FFF1E2', '#F9D2A8', '#D9661F'],
  'fresh-produce': ['#F1F8E8', '#D7EBC3', '#3D7A36'],
  'meat-seafood': ['#FBEDE8', '#F1CFC4', '#A8322B'],
  'frozen-foods': ['#EAF4F8', '#C9E2EC', '#2D6A82'],
  'snacks-beverages': ['#FFF6DD', '#F5E0A0', '#B8862B'],
  deli: ['#5A3420', '#3B2215', '#E9A23B'],
};
const EMOJI_FONT = "'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',sans-serif";
const SERIF = "Georgia,'Times New Roman',serif";
const SANS = "'Segoe UI',Arial,Helvetica,sans-serif";

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const shade = (hex, amt) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  return `#${[c(n >> 16), c((n >> 8) & 255), c(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};

function wrap(text, maxChars, maxLines) {
  const clean = text.replace(/\s*\(.*?\)\s*/g, ' ').trim();
  const words = clean.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if (`${cur} ${w}`.trim().length > maxChars && cur) {
      lines.push(cur);
      cur = w;
    } else cur = `${cur} ${w}`.trim();
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/\s*\S*$/, '')}…`;
  }
  return lines;
}

function labelText({ x = 300, top, brand, name, unit, color, maxChars = 14, size = 26 }) {
  const lines = wrap(name, maxChars, 3);
  const lh = size * 1.18;
  const nameStart = top + 46;
  let out = `<text x="${x}" y="${top + 8}" text-anchor="middle" font-family="${SANS}" font-size="15" font-weight="700" letter-spacing="2.5" fill="${color}">${esc(brand.toUpperCase())}</text>`;
  out += `<line x1="${x - 40}" y1="${top + 22}" x2="${x + 40}" y2="${top + 22}" stroke="${color}" stroke-width="2" opacity=".5"/>`;
  lines.forEach((l, i) => {
    out += `<text x="${x}" y="${nameStart + i * lh}" text-anchor="middle" font-family="${SERIF}" font-size="${size}" font-weight="700" fill="#2B2118">${esc(l)}</text>`;
  });
  if (unit) out += `<text x="${x}" y="${nameStart + 3 * lh + 6}" text-anchor="middle" font-family="${SANS}" font-size="15" fill="#6B5B4B">${esc(unit)}</text>`;
  return out;
}

function background(theme, accent) {
  const [a, b] = theme;
  const stripes = Array.from({ length: 12 }, (_, i) => `<rect x="${i * 50 + 10}" y="570" width="30" height="20" fill="${i % 2 ? '#E9A23B' : '#FFF4E0'}" opacity=".7"/>`).join('');
  return `<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>
<pattern id="pt" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M24 6 L42 24 L24 42 L6 24Z" fill="none" stroke="${accent}" stroke-opacity=".09" stroke-width="2"/><circle cx="24" cy="24" r="3" fill="${accent}" fill-opacity=".08"/></pattern>
<linearGradient id="shine" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".45" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
</defs>
<rect width="600" height="600" fill="url(#bg)"/><rect width="600" height="600" fill="url(#pt)"/>
<rect y="560" width="600" height="40" fill="${accent}" opacity=".9"/><g opacity=".55">${stripes}</g>`;
}

const shadow = (rx = 160) => `<ellipse cx="300" cy="512" rx="${rx}" ry="20" fill="#000" opacity=".13"/>`;
const zigzag = Array.from({ length: 13 }, () => 'l10 -9 l10 9').join(' ');

const SHAPES = {
  bag: (c, p) => `${shadow()}
<rect x="172" y="96" width="256" height="36" rx="6" fill="${shade(c, -0.12)}"/>
<path d="M176 104h248M176 114h248M176 124h248" stroke="${shade(c, 0.12)}" stroke-width="2"/>
<path d="M170 132 L430 132 L446 476 Q448 506 416 506 L184 506 Q152 506 154 476 Z" fill="${c}"/>
<rect x="188" y="208" width="224" height="220" rx="16" fill="#FFF9EE"/>
<text x="300" y="186" text-anchor="middle" font-family="${EMOJI_FONT}" font-size="40">${p.emoji}</text>
${labelText({ top: 238, ...p, color: c })}
<rect x="190" y="132" width="44" height="372" fill="url(#shine)"/>`,
  pouch: (c, p) => `${shadow()}
<path d="M168 110 L432 110 Q448 300 432 500 L168 500 Q152 300 168 110 Z" fill="${c}"/>
<path d="M168 110 L432 110 L432 128 L168 128 Z M168 482 L432 482 L432 500 L168 500 Z" fill="${shade(c, -0.15)}"/>
<path d="M170 128 ${zigzag}" fill="none" stroke="${shade(c, 0.15)}" stroke-width="2"/>
<rect x="186" y="200" width="228" height="230" rx="110" fill="#FFF9EE"/>
<text x="300" y="182" text-anchor="middle" font-family="${EMOJI_FONT}" font-size="40">${p.emoji}</text>
${labelText({ top: 248, ...p, color: c, maxChars: 13, size: 24 })}
<rect x="196" y="130" width="40" height="350" fill="url(#shine)"/>`,
  jar: (c, p) => `${shadow(140)}
<rect x="206" y="128" width="188" height="62" rx="12" fill="${shade(c, -0.18)}"/>
<path d="M214 144h172M214 158h172M214 172h172" stroke="${c}" stroke-width="3" opacity=".6"/>
<rect x="178" y="184" width="244" height="320" rx="48" fill="${c}"/>
<rect x="178" y="238" width="244" height="214" fill="#FFF9EE"/>
<rect x="178" y="238" width="244" height="8" fill="${shade(c, 0.2)}"/><rect x="178" y="444" width="244" height="8" fill="${shade(c, 0.2)}"/>
${labelText({ top: 270, ...p, color: c, maxChars: 14, size: 25 })}
<rect x="196" y="190" width="38" height="308" fill="url(#shine)"/>`,
  bottle: (c, p) => `${shadow(120)}
<rect x="268" y="72" width="64" height="44" rx="8" fill="${shade(c, -0.2)}"/>
<rect x="278" y="112" width="44" height="60" fill="${c}"/>
<path d="M278 168 L322 168 Q404 196 404 256 L404 474 Q404 506 372 506 L228 506 Q196 506 196 474 L196 256 Q196 196 278 168 Z" fill="${c}"/>
<rect x="196" y="270" width="208" height="190" fill="#FFF9EE"/>
${labelText({ top: 300, ...p, color: c, maxChars: 12, size: 22 })}
<rect x="214" y="200" width="32" height="300" fill="url(#shine)"/>`,
  can: (c, p) => `${shadow(130)}
<rect x="192" y="146" width="216" height="350" rx="16" fill="${c}"/>
<ellipse cx="300" cy="148" rx="108" ry="18" fill="#D8D5CF"/><ellipse cx="300" cy="148" rx="90" ry="12" fill="#BDB9B1"/>
<rect x="192" y="214" width="216" height="222" fill="#FFF9EE"/>
<rect x="192" y="208" width="216" height="6" fill="${shade(c, 0.2)}"/><rect x="192" y="436" width="216" height="6" fill="${shade(c, 0.2)}"/>
${labelText({ top: 246, ...p, color: c, maxChars: 13, size: 24 })}
<rect x="208" y="160" width="36" height="330" fill="url(#shine)"/>`,
  box: (c, p) => `${shadow(170)}
<polygon points="156,150 196,116 474,116 434,150" fill="${shade(c, 0.12)}"/>
<polygon points="434,150 474,116 474,466 434,500" fill="${shade(c, -0.18)}"/>
<rect x="156" y="150" width="278" height="350" fill="${c}"/>
<rect x="176" y="214" width="238" height="226" rx="12" fill="#FFF9EE"/>
<text x="295" y="194" text-anchor="middle" font-family="${EMOJI_FONT}" font-size="38">${p.emoji}</text>
${labelText({ x: 295, top: 246, ...p, color: c, maxChars: 15, size: 25 })}`,
  tray: (c, p) => `<text x="300" y="98" text-anchor="middle" font-family="${SERIF}" font-size="30" font-weight="700" fill="#2B2118">${esc(wrap(p.name, 30, 1)[0])}</text>
${shadow(200)}
<rect x="104" y="226" width="392" height="270" rx="40" fill="#F7F4EE" stroke="#DCD5C8" stroke-width="3"/>
<rect x="128" y="250" width="344" height="222" rx="28" fill="#EFEAE0"/>
<text x="300" y="440" text-anchor="middle" font-family="${EMOJI_FONT}" font-size="190">${p.emoji}</text>
<rect x="104" y="226" width="392" height="270" rx="40" fill="url(#shine)" opacity=".8"/>
<g transform="rotate(-6 400 450)"><rect x="318" y="420" width="194" height="70" rx="10" fill="${c}"/>
<text x="415" y="448" text-anchor="middle" font-family="${SANS}" font-size="12" font-weight="700" letter-spacing="1" fill="#FFF4E0">${esc(p.brand.toUpperCase().slice(0, 20))}</text>
<text x="415" y="472" text-anchor="middle" font-family="${SANS}" font-size="15" fill="#FFF4E0">${esc(p.unit || '')}</text></g>`,
  produce: (c, p) => `<circle cx="300" cy="280" r="200" fill="${c}" opacity=".12"/><circle cx="300" cy="280" r="150" fill="#fff" opacity=".5"/>
${shadow(150)}
<text x="300" y="370" text-anchor="middle" font-family="${EMOJI_FONT}" font-size="230">${p.emoji}</text>
<rect x="130" y="462" width="340" height="62" rx="31" fill="${c}"/>
<text x="300" y="502" text-anchor="middle" font-family="${SERIF}" font-size="24" font-weight="700" fill="#FFF9EE">${esc(wrap(p.name, 24, 1)[0])}</text>`,
  plate: (c, p) => `<ellipse cx="300" cy="318" rx="232" ry="226" fill="#000" opacity=".25"/>
<circle cx="300" cy="300" r="225" fill="#FBF7EF"/><circle cx="300" cy="300" r="180" fill="none" stroke="#E7DCC6" stroke-width="4"/>
<circle cx="300" cy="300" r="170" fill="#F6EEDD"/>
<text x="300" y="378" text-anchor="middle" font-family="${EMOJI_FONT}" font-size="200">${p.emoji}</text>
<text x="96" y="110" font-family="${EMOJI_FONT}" font-size="54" transform="rotate(-20 96 110)">🌿</text>
<text x="470" y="520" font-family="${EMOJI_FONT}" font-size="48" transform="rotate(25 470 520)">🌶️</text>`,
};

// Per-product emoji overrides so produce/meat images show the right item.
const EMOJI_OVERRIDES = {
  'Fresh Okra': '🫑', 'Garden Eggs (African Eggplant)': '🍆', 'Chocho (Chayote)': '🍐', 'Fresh Callaloo (Amaranth)': '🥬',
  'Fresh Ginger Root': '🥔', 'Papaya': '🍈', 'Soursop (Graviola)': '🍈', 'Fresh Breadfruit': '🍈', 'Dry Coconut (Brown)': '🥥',
  'Green Jelly Coconut': '🥥', 'Golden Pineapple': '🍍', 'Passion Fruit': '🍇', 'Sweet Tamarind Pods': '🥜', 'Hass Avocados (Pear)': '🥑',
  'Fresh Cassava Root (Yuca)': '🥔', 'Eddoes (Cocoyam)': '🥔', 'Dasheen (Taro Root)': '🥔', 'Tatashe (Red Bell Peppers)': '🫑',
  'Jumbo Raw Shrimp (Shell-On)': '🦐', 'Conch Meat (Cleaned)': '🐚', 'Whole Dried Crayfish': '🦐', 'Chicken Feet (Cleaned)': '🐔',
  'Hard Chicken (Stewing Hen)': '🐔', 'Goat Leg (Whole, Bone-In)': '🍖',
};

function productSvg({ name, brand, unit, emoji, pack, category }) {
  const theme = CATEGORY_THEME[category];
  const color = pack === 'plate' ? theme[2] : PACK_COLORS[hash(name) % PACK_COLORS.length];
  const body = SHAPES[pack](color, { name, brand, unit, emoji: EMOJI_OVERRIDES[name] || emoji });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600" role="img" aria-label="${esc(name)}">${background(theme, theme[2])}${body}</svg>`;
}

function categorySvg(cat, emojis) {
  const theme = CATEGORY_THEME[cat.slug];
  const [e1, e2, e3] = emojis;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600" role="img" aria-label="${esc(cat.name)}">${background(theme, theme[2])}
<circle cx="300" cy="300" r="210" fill="${theme[2]}" opacity=".12"/>
<text x="300" y="370" text-anchor="middle" font-family="${EMOJI_FONT}" font-size="200">${e1}</text>
<text x="140" y="200" text-anchor="middle" font-family="${EMOJI_FONT}" font-size="100" transform="rotate(-12 140 200)">${e2}</text>
<text x="470" y="470" text-anchor="middle" font-family="${EMOJI_FONT}" font-size="100" transform="rotate(12 470 470)">${e3}</text></svg>`;
}

export const productImagePath = (name) => `/images/products/${slugify(name)}.svg`;
export const categoryImagePath = (slug) => `/images/categories/${slug}.svg`;

function main() {
  fs.mkdirSync(PRODUCT_DIR, { recursive: true });
  fs.mkdirSync(CATEGORY_DIR, { recursive: true });
  let count = 0;
  for (const section of GROCERY_SECTIONS) {
    for (const [name, brand, , unit] of section.items) {
      const svg = productSvg({ name, brand, unit, emoji: section.emoji, pack: section.pack, category: section.category });
      fs.writeFileSync(path.join(PRODUCT_DIR, `${slugify(name)}.svg`), svg);
      count++;
    }
  }
  for (const [name, , , emoji] of DELI_ITEMS) {
    const svg = productSvg({ name, brand: 'Wakis Mart Deli', emoji, pack: 'plate', category: 'deli' });
    fs.writeFileSync(path.join(PRODUCT_DIR, `${slugify(name)}.svg`), svg);
    count++;
  }
  const catEmoji = {
    'african-groceries': ['🍚', '🌶️', '🌴'],
    'caribbean-groceries': ['🥥', '🌶️', '🌿'],
    deli: ['🍛', '🍗', '🥟'],
    'fresh-produce': ['🍌', '🥭', '🌶️'],
    'meat-seafood': ['🥩', '🐟', '🦐'],
    'frozen-foods': ['🧊', '🐟', '🥟'],
    'snacks-beverages': ['🥤', '🍪', '🍌'],
  };
  for (const cat of CATEGORIES) {
    fs.writeFileSync(path.join(CATEGORY_DIR, `${cat.slug}.svg`), categorySvg(cat, catEmoji[cat.slug]));
  }
  console.log(`Generated ${count} product images and ${CATEGORIES.length} category images in ${OUT}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main();
