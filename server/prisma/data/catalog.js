// Wakis Mart seed catalog.
// Prices are SAMPLE prices in US dollars — review and replace with real store pricing before going live.
// Row format: [name, brand, price, unit, description, originOverride?]
//   originOverride: 'A' = African, 'C' = Caribbean, 'B' = both (defaults to the category's origin)
// `pack` controls the style of the generated placeholder image (see generate-images.js).

export const CATEGORIES = [
  {
    slug: 'african-groceries',
    name: 'African Groceries',
    description: 'Rice, garri, fufu flours, palm oil, spices and pantry staples from across West, East and Southern Africa.',
    sortOrder: 1,
    skuPrefix: 'AFR',
    origin: 'AFRICAN',
  },
  {
    slug: 'caribbean-groceries',
    name: 'Caribbean Groceries',
    description: 'Jerk seasonings, pepper sauces, coconut products, ackee, baking essentials and island drinks.',
    sortOrder: 2,
    skuPrefix: 'CAR',
    origin: 'CARIBBEAN',
  },
  {
    slug: 'deli',
    name: 'Deli & Prepared Foods',
    description: 'Freshly prepared African and Caribbean favourites — jollof, jerk chicken, soups, stews, patties and sides.',
    sortOrder: 3,
    skuPrefix: 'DLI',
    origin: 'BOTH',
  },
  {
    slug: 'fresh-produce',
    name: 'Fresh Produce',
    description: 'Plantains, yams, cassava, scotch bonnets, okra, fresh herbs and tropical fruit.',
    sortOrder: 4,
    skuPrefix: 'PRD',
    origin: 'BOTH',
  },
  {
    slug: 'meat-seafood',
    name: 'Meat & Seafood',
    description: 'Goat, oxtail, cow foot, smoked turkey, stockfish, saltfish, smoked fish and fresh seafood.',
    sortOrder: 5,
    skuPrefix: 'MSF',
    origin: 'BOTH',
  },
  {
    slug: 'frozen-foods',
    name: 'Frozen Foods',
    description: 'Frozen fish, African leafy vegetables, Jamaican patties, snails and specialty frozen favourites.',
    sortOrder: 6,
    skuPrefix: 'FRZ',
    origin: 'BOTH',
  },
  {
    slug: 'snacks-beverages',
    name: 'Snacks & Beverages',
    description: 'Chin chin, plantain chips, island snacks, malt drinks, tropical juices, sodas and specialty teas.',
    sortOrder: 7,
    skuPrefix: 'SNB',
    origin: 'BOTH',
  },
];

export const GROCERY_SECTIONS = [
  // ───────────────────────── AFRICAN GROCERIES ─────────────────────────
  {
    category: 'african-groceries', subcategory: 'Rice & Grains', pack: 'bag', emoji: '🌾',
    items: [
      ['Royal Stallion Parboiled Long Grain Rice', 'Royal Stallion', 32.99, '22 lb bag', 'Stone-free parboiled long-grain rice that cooks up fluffy and separate — the classic base for party jollof and fried rice.'],
      ['Mama Gold Thai Parboiled Rice', 'Mama Gold', 31.49, '22 lb bag', 'Premium Thai parboiled rice with firm, non-sticky grains that hold their shape in rich tomato stews.'],
      ['Ofada Rice (Nigerian Local Rice)', 'Wakis Mart Select', 12.99, '4 lb bag', 'Aromatic, unpolished short-grain Nigerian rice with a nutty flavour. Traditionally served with spicy ayamase (designer) stew.'],
      ['Fonio Ancient Grain (Acha)', 'Yolélé', 8.99, '16 oz bag', 'Fast-cooking West African super-grain, naturally gluten-free. Ready in five minutes — use like couscous or quinoa.'],
      ['Whole Millet Grain (Gero)', 'Wakis Mart Select', 6.49, '2 lb bag', 'Cleaned whole pearl millet for fura, millet porridge (koko) and hearty Sahelian dishes.'],
      ['Guinea Corn Grain (Red Sorghum)', 'Wakis Mart Select', 6.99, '2 lb bag', 'Red sorghum grain used to make ogi (pap), tuwo and malted drinks across Northern Nigeria and Ghana.'],
    ],
  },
  {
    category: 'african-groceries', subcategory: 'Garri & Cassava', pack: 'bag', emoji: '🥣',
    items: [
      ['Ijebu Garri (White, Extra Sour)', 'Olu Olu', 9.99, '4 lb bag', 'Crisp, finely granulated Ijebu-style garri with a sharp tang — perfect for soaking with cold water, sugar and groundnuts.'],
      ['Yellow Garri with Palm Oil', 'Olu Olu', 10.49, '4 lb bag', 'Smooth yellow garri processed with red palm oil for a mellow flavour. Makes a soft, elastic eba.'],
      ['Ghana Gari (Fine Grain)', 'Tropiway', 8.99, '4 lb bag', 'Fine-textured Ghanaian gari, ideal for gari foto, gari and beans (red-red) or a quick soaked-garri snack.'],
      ['Attiéké Cassava Couscous', 'Wakis Mart Select', 7.49, '1 lb pack', 'Fermented cassava couscous from Côte d’Ivoire. Steam and serve with grilled fish, onions and chilli.'],
      ['Abacha (Dried Shredded Cassava)', 'Wakis Mart Select', 6.99, '1 lb pack', 'Sun-dried cassava shreds for preparing Igbo African salad with ugba, palm oil and garden egg leaves.'],
      ['Lafun Cassava Flour', 'Iya Foods', 8.49, '2 lb bag', 'Fermented cassava flour for smooth, light amala lafun. Naturally gluten-free and grain-free.'],
    ],
  },
  {
    category: 'african-groceries', subcategory: 'Fufu & Swallow', pack: 'box', emoji: '🍚',
    items: [
      ['Pounded Yam Flour', 'Ola-Ola', 13.99, '4 lb box', 'Instant pounded yam flour made from select white yams. Whisk into hot water for a soft, stretchy swallow in minutes.'],
      ['Poundo Iyan Yam Flour', 'Ayoola', 12.99, '4 lb box', 'Smooth, lump-free poundo made from 100% yam — pairs beautifully with egusi, efo riro or okra soup.'],
      ['Plantain Fufu Flour', 'Ayoola', 9.99, '1.5 lb box', 'Blend of plantain and cassava that cooks into a light, mildly sweet fufu with a soft golden colour.'],
      ['Cocoyam Fufu Flour', 'Tropiway', 9.49, '1.5 lb box', 'Ghanaian-style cocoyam fufu flour for a silky swallow to serve with light soup or groundnut soup.'],
      ['Semovita', 'Golden Penny', 10.99, '4.4 lb bag', 'Fine wheat semolina swallow that is easy to stir and smooth to eat. A dependable everyday favourite.', 'A'],
      ['Elubo Yam Flour (Amala)', 'Iya Foods', 11.49, '2 lb bag', 'Dried yam flour for authentic dark amala. Serve with ewedu, gbegiri and buka stew for the full Ibadan experience.'],
      ['Tuwo Shinkafa Rice Flour', 'Wakis Mart Select', 7.99, '2 lb bag', 'Finely milled short-grain rice flour for making tuwo shinkafa, the soft Northern Nigerian rice swallow.'],
    ],
  },
  {
    category: 'african-groceries', subcategory: 'African Spices & Seasonings', pack: 'jar', emoji: '🌶️',
    items: [
      ['Maggi Star Seasoning Cubes', 'Maggi', 6.99, '100 cubes', 'The iconic West African stock cube. Adds deep savoury flavour to stews, soups and jollof rice.'],
      ['Knorr Chicken Bouillon Cubes', 'Knorr', 6.49, '60 cubes', 'Rich chicken stock cubes loved across Nigeria and Ghana for pepper soup, fried rice and stews.'],
      ['Ducros Curry Powder', 'Ducros', 3.99, '3.5 oz tin', 'Mild, fragrant Nigerian-style curry powder — essential for fried rice, coleslaw and peppered chicken.'],
      ['Suya Spice (Yaji)', 'Wakis Mart Select', 5.99, '6 oz jar', 'Roasted peanut, ginger and chilli spice blend for Hausa-style suya beef, chicken and grilled plantain.'],
      ['Ground Crayfish', 'Wakis Mart Select', 8.99, '8 oz jar', 'Finely ground smoked crayfish that gives Nigerian soups, stews and beans their unmistakable savoury depth.'],
      ['Iru (Fermented Locust Beans)', 'Wakis Mart Select', 6.49, '4 oz jar', 'Pungent fermented locust beans (dawadawa) — the traditional umami seasoning for ewedu, efo riro and ofada stew.'],
      ['Pepper Soup Spice Mix', 'Wakis Mart Select', 4.99, '3 oz jar', 'Aromatic blend of uda, ehuru, uziza and alligator pepper for authentic goat meat and catfish pepper soup.'],
    ],
  },
  {
    category: 'african-groceries', subcategory: 'Palm Oil & Cooking Ingredients', pack: 'bottle', emoji: '🌴',
    items: [
      ['Zomi Red Palm Oil', 'Zomi', 11.99, '1 L bottle', 'Traditional Ghanaian palm oil infused with spices — bold colour and flavour for red-red, banga and stews.'],
      ['Unrefined Red Palm Oil', 'Praise', 8.99, '500 ml bottle', 'Pure, unrefined red palm oil rich in carotenoids, for egusi soup, ofe onugbu and palm-oil rice.'],
      ['Palm Soup Base (Banga Concentrate)', 'Nkulenu\'s', 6.99, '28 oz can', 'Ready-made palm nut concentrate. Skip hours of pounding — just add meat, fish and spices for banga or abenkwan.'],
      ['Gino Tomato Paste', 'Gino', 2.49, '14 oz tin', 'Thick double-concentrated tomato paste, the starting point for countless jollof rice and stew pots.'],
      ['Pure Groundnut Oil', 'Wakis Mart Select', 10.99, '1 L bottle', 'Cold-pressed peanut oil with a gentle nutty aroma — great for frying plantain, puff puff and akara.'],
      ['Shea Butter Cooking Fat', 'Wakis Mart Select', 9.49, '12 oz tub', 'Food-grade unrefined shea butter used in Northern Ghanaian and Burkinabé cooking for frying and sauces.'],
    ],
  },
  {
    category: 'african-groceries', subcategory: 'African Sauces & Condiments', pack: 'jar', emoji: '🥫',
    items: [
      ['Shito Black Pepper Sauce', 'Wakis Mart Select', 8.99, '10 oz jar', 'Ghana’s beloved dark chilli sauce made with dried fish, shrimp and ginger. Spoon over kenkey, rice or eggs.'],
      ['Nando\'s Peri-Peri Sauce (Hot)', 'Nando\'s', 5.49, '8.4 oz bottle', 'Southern African bird’s-eye chilli sauce with garlic and lemon. Brilliant on grilled chicken and fries.'],
      ['Mrs. Ball\'s Original Chutney', 'Mrs. Ball\'s', 5.99, '16 oz bottle', 'South Africa’s famous sweet-tangy peach and apricot chutney — the classic partner for bobotie and braai.'],
      ['Ata Din Din (Fried Pepper Sauce)', 'Wakis Mart Select', 9.49, '12 oz jar', 'Slow-fried tatashe, scotch bonnet and onion in oil. Use as a base for ofada stew or eat with yam and plantain.'],
      ['Suya Pepper Dip', 'Wakis Mart Select', 6.99, '8 oz jar', 'Smoky, nutty chilli dip with roasted peanuts and spices — the perfect side for suya and grilled meats.'],
      ['Berbere Spiced Pepper Paste (Awaze)', 'Wakis Mart Select', 7.49, '8 oz jar', 'Fiery Ethiopian chilli paste made with berbere and spices. Serve with tibs or stir into stews.'],
    ],
  },
  {
    category: 'african-groceries', subcategory: 'Beans & Legumes', pack: 'bag', emoji: '🌱',
    items: [
      ['Honey Beans (Ewa Oloyin)', 'Wakis Mart Select', 9.99, '4 lb bag', 'Naturally sweet Nigerian brown beans that cook down creamy — ideal for ewa agoyin and beans porridge.'],
      ['Black-Eyed Beans', 'Wakis Mart Select', 6.99, '4 lb bag', 'Versatile black-eyed peas for akara, moi moi, red-red and Ghanaian waakye.'],
      ['Ground Egusi (Melon Seeds)', 'Wakis Mart Select', 10.99, '1 lb bag', 'Cleaned and finely ground melon seeds — the essential thickener for rich Nigerian egusi soup.'],
      ['Ground Ogbono (Wild Mango Seed)', 'Wakis Mart Select', 12.99, '8 oz bag', 'Ground African bush mango seeds that give ogbono soup its signature draw and earthy flavour.'],
      ['Peeled Bean Flour (for Moi Moi & Akara)', 'Ayoola', 8.99, '2 lb bag', 'Skinless black-eyed bean flour — skip the soaking and peeling and go straight to fluffy akara or moi moi.'],
      ['Bambara Groundnut Flour (Okpa)', 'Wakis Mart Select', 9.49, '2 lb bag', 'Milled Bambara nuts for steaming okpa, the protein-rich Enugu street-food favourite.'],
    ],
  },
  {
    category: 'african-groceries', subcategory: 'African Specialty Flours', pack: 'bag', emoji: '🌾',
    items: [
      ['Ivory Teff Flour', 'Wakis Mart Select', 11.99, '2 lb bag', 'Finely milled Ethiopian teff for injera, pancakes and gluten-free baking. Naturally rich in iron.'],
      ['Unripe Plantain Flour', 'Ayoola', 9.99, '1.5 lb bag', 'Low-sugar green plantain flour, a popular high-fibre swallow and gluten-free baking flour.'],
      ['Tiger Nut Flour', 'Wakis Mart Select', 10.49, '1 lb bag', 'Sweet, nutty flour from tiger nuts (aya / atadwe). Use in kunun aya drinks, smoothies and baking.'],
      ['Wheat Meal Swallow', 'Golden Penny', 9.49, '4.4 lb bag', 'Whole wheat swallow flour with added fibre. Cooks smooth and pairs well with any draw soup.'],
      ['Ogi Corn Pap Powder (Akamu)', 'Wakis Mart Select', 7.49, '2 lb bag', 'Fermented white corn pap powder for a smooth breakfast pap, served with akara or moi moi.'],
      ['Elubo Ogede (Plantain Amala Flour)', 'Iya Foods', 10.99, '2 lb bag', 'Sun-dried plantain flour that cooks into a soft, dark amala — a lighter alternative to yam amala.'],
    ],
  },

  // ───────────────────────── CARIBBEAN GROCERIES ─────────────────────────
  {
    category: 'caribbean-groceries', subcategory: 'Jamaican & Caribbean Spices', pack: 'jar', emoji: '🌿',
    items: [
      ['Whole Pimento (Allspice) Berries', 'Wakis Mart Select', 5.99, '4 oz jar', 'Jamaican pimento berries — the backbone of authentic jerk, escovitch and pickled pepper sauce.'],
      ['Jamaican Curry Powder', 'Betapac', 6.49, '8 oz bag', 'Turmeric-forward Jamaican curry with toasted cumin and fenugreek. The go-to spice for curry goat and chicken.'],
      ['Trinidad Curry Powder', 'Chief', 5.99, '8 oz bag', 'Trinidad’s favourite curry blend, made for curry duck, channa and aloo, and roti fillings.'],
      ['Grenada Whole Nutmegs', 'Wakis Mart Select', 6.99, '10 nutmegs', 'Fragrant whole nutmegs from the Spice Isle. Grate fresh into punch, porridge, sweet potato pudding and cakes.'],
      ['Geera (Roasted Cumin) Powder', 'Chief', 3.99, '3.5 oz pack', 'Dark-roasted ground cumin with a deep smoky aroma — essential in Trinidadian curries and chokas.'],
      ['Jamaican Ground Ginger', 'Wakis Mart Select', 4.49, '3 oz jar', 'Pungent ground Jamaican ginger for gingerbread, ginger beer, sorrel and spiced teas.'],
    ],
  },
  {
    category: 'caribbean-groceries', subcategory: 'Caribbean Sauces', pack: 'bottle', emoji: '🌶️',
    items: [
      ['West Indian Hot Pepper Sauce', 'Encona', 4.99, '5 oz bottle', 'Fiery scotch bonnet pepper sauce with a vinegary kick — a few drops wake up any dish.'],
      ['Calypso Sauce', 'Matouk\'s', 5.99, '10 oz bottle', 'Trinidadian classic made with scotch bonnet, mustard and papaya. Hot, tangy and seriously addictive.'],
      ['Pickapeppa Sauce (Original)', 'Pickapeppa', 5.49, '5 oz bottle', 'Jamaica’s tamarind-and-mango sauce, aged in oak. Pour over cream cheese or use as a marinade for beef.'],
      ['Spicy Jerk Sauce', 'Busha Browne\'s', 8.49, '6 oz bottle', 'Small-batch Jamaican jerk sauce with scallion, thyme and scotch bonnet for basting or dipping.'],
      ['West Indian Hot Sauce', 'Baron', 4.49, '5 oz bottle', 'St Lucian hot sauce with a bright, fruity heat that suits fish, eggs and rice and peas.'],
      ['Jerk BBQ Sauce', 'Grace', 5.99, '17 oz bottle', 'Sweet-smoky barbecue sauce with authentic jerk spices. Perfect for wings, ribs and grilled pork.'],
    ],
  },
  {
    category: 'caribbean-groceries', subcategory: 'Caribbean Seasonings', pack: 'jar', emoji: '🧂',
    items: [
      ['Traditional Jerk Seasoning (Hot & Spicy)', 'Walkerswood', 9.99, '10 oz jar', 'Award-winning wet jerk rub from St Ann, Jamaica, with scotch bonnets, scallions and pimento.'],
      ['Mild Jerk Seasoning', 'Walkerswood', 9.99, '10 oz jar', 'All the depth of Walkerswood’s jerk with gentler heat — great for families and first-timers.'],
      ['Green Seasoning', 'Chief', 6.49, '10 oz bottle', 'Trinidadian herb marinade of shado beni, chive, thyme and garlic for chicken, fish and stew.'],
      ['Jerk Seasoning', 'Baron', 6.99, '10 oz jar', 'Bold St Lucian jerk paste with pepper, allspice and thyme for grilling and oven roasting.'],
      ['All Purpose Seasoning', 'Dunn\'s River', 4.99, '3.5 oz shaker', 'Caribbean savoury blend of salt, paprika, onion and spice — a sprinkle for meat, fish and veg.'],
      ['Jamaican Escallion & Thyme Paste', 'Wakis Mart Select', 5.99, '8 oz jar', 'Ready-chopped scallion, thyme and garlic in oil. Saves prep for brown stew, fricassee and soups.'],
    ],
  },
  {
    category: 'caribbean-groceries', subcategory: 'Rice & Peas Ingredients', pack: 'can', emoji: '🍛',
    items: [
      ['Red Kidney Beans (Canned)', 'Grace', 2.29, '14 oz can', 'Tender red kidney beans in brine — the quick route to Sunday rice and peas or stew peas.'],
      ['Gungo Peas (Pigeon Peas)', 'Dunn\'s River', 2.49, '14 oz can', 'Ready-to-use pigeon peas for Christmas gungo rice and peas or Trini pelau.'],
      ['Dried Red Kidney Beans', 'Wakis Mart Select', 5.49, '2 lb bag', 'Dried red peas for slow-cooked rice and peas with coconut milk and pimento.', 'C'],
      ['Dried Gungo Peas', 'Wakis Mart Select', 6.49, '2 lb bag', 'Whole dried pigeon peas for soups, stews and traditional rice and peas.'],
      ['Jamaican Long Grain Parboiled Rice', 'Wakis Mart Select', 14.99, '10 lb bag', 'Easy-cook long-grain rice that stays separate when simmered with peas and coconut milk.'],
      ['Black-Eyed Peas (Canned)', 'Grace', 2.29, '14 oz can', 'Tender black-eyed peas, ready for Bajan peas and rice, cook-up rice or salads.'],
    ],
  },
  {
    category: 'caribbean-groceries', subcategory: 'Coconut Products', pack: 'can', emoji: '🥥',
    items: [
      ['Coconut Milk', 'Grace', 2.99, '13.5 oz can', 'Rich, full-fat coconut milk for rice and peas, curry, rundown and coconut drops.'],
      ['Creamed Coconut Block', 'Tropical Sun', 3.49, '7 oz block', 'Solid creamed coconut — grate or dissolve into curries and soups for intense coconut flavour.'],
      ['Pure Coconut Water', 'Grace', 2.49, '16.9 oz bottle', 'Refreshing natural coconut water with no added sugar.'],
      ['Virgin Coconut Oil', 'KTC', 9.99, '17 oz jar', 'Cold-pressed virgin coconut oil for frying, baking, and hair and skin care.'],
      ['Desiccated Coconut (Unsweetened)', 'Wakis Mart Select', 4.49, '12 oz bag', 'Fine unsweetened coconut for gizzada, coconut drops, toto and sweet bread.'],
      ['Coconut Milk Powder', 'Maggi', 4.99, '10.5 oz pack', 'Instant coconut milk powder — mix with water for creamy coconut milk any time.', 'B'],
    ],
  },
  {
    category: 'caribbean-groceries', subcategory: 'Caribbean Canned Foods', pack: 'can', emoji: '🥫',
    items: [
      ['Ackee in Brine', 'Grace', 11.99, '19 oz can', 'Premium Jamaican ackee, ready to sauté with saltfish, onions and peppers for the national dish.'],
      ['Callaloo (Canned)', 'Grace', 3.49, '19 oz can', 'Tender Jamaican callaloo leaves, ready to steam with onion, tomato and saltfish.'],
      ['Mackerel in Tomato Sauce', 'Grace', 3.29, '15 oz can', 'Classic Caribbean breakfast staple — heat with onions and peppers and serve with hard dough bread.'],
      ['Vienna Sausages', 'Grace', 1.49, '4.6 oz can', 'Mini chicken sausages, a lunchbox and breakfast favourite across the islands.'],
      ['Hominy Corn', 'Grace', 2.49, '15 oz can', 'Tender whole hominy kernels for creamy Jamaican hominy corn porridge.'],
      ['Breadfruit (Canned)', 'Tropical Sun', 4.99, '19 oz can', 'Pre-cooked breadfruit slices — fry, roast or add to soups when fresh breadfruit is out of season.'],
    ],
  },
  {
    category: 'caribbean-groceries', subcategory: 'Caribbean Baking Ingredients', pack: 'bag', emoji: '🧁',
    items: [
      ['Fine Cornmeal', 'Dunn\'s River', 3.99, '3.3 lb bag', 'Finely milled yellow cornmeal for cornmeal porridge, festival dumplings and turn cornmeal.'],
      ['Coarse Cornmeal', 'Dunn\'s River', 3.99, '3.3 lb bag', 'Coarse-ground cornmeal for Jamaican cornmeal pudding, cou-cou and fried fritters.'],
      ['Black Cake Fruit Mix', 'Wakis Mart Select', 12.99, '2 lb jar', 'Pre-soaked raisins, prunes, currants and cherries for Caribbean black cake and Christmas fruit cake.'],
      ['Browning Sauce', 'Grace', 3.49, '4 oz bottle', 'Burnt-sugar browning that gives black cake, brown stew and oxtail their deep rich colour.'],
      ['Demerara Brown Sugar', 'Wakis Mart Select', 4.99, '2 lb bag', 'Golden, crunchy Guyanese-style demerara sugar for baking, sorrel and coffee.'],
      ['Vanilla Flavouring (Caribbean Style)', 'Wakis Mart Select', 3.99, '8 oz bottle', 'Strong, aromatic vanilla flavouring used in Caribbean puddings, punches and cake batter.'],
    ],
  },
  {
    category: 'caribbean-groceries', subcategory: 'Caribbean Specialty Beverages', pack: 'bottle', emoji: '🍹',
    items: [
      ['Dried Sorrel (Hibiscus) Petals', 'Wakis Mart Select', 7.99, '8 oz bag', 'Deep red dried sorrel for brewing the classic Caribbean Christmas drink with ginger and pimento.'],
      ['Supligen Vanilla Nutritional Drink', 'Supligen', 2.99, '9.6 oz can', 'Creamy Jamaican vanilla meal-replacement drink — serve chilled.'],
      ['Food Drink (Vanilla)', 'Lasco', 3.49, '14 oz pack', 'Jamaica’s much-loved nutritional milk drink powder. Mix with cold water for a creamy shake.'],
      ['Old Jamaica Ginger Beer', 'Old Jamaica', 7.99, '6 × 11 oz cans', 'Fiery, sparkling ginger beer made with real Jamaican ginger.'],
      ['Mauby Bark', 'Wakis Mart Select', 5.49, '4 oz bag', 'Dried mauby bark for brewing the bittersweet, spiced drink popular in Trinidad and Barbados.'],
      ['Jamaica Blue Mountain Coffee (Ground)', 'Wallenford', 39.99, '8 oz bag', '100% Jamaica Blue Mountain coffee — smooth, mild and remarkably low in bitterness.'],
    ],
  },

  // ───────────────────────── FRESH PRODUCE ─────────────────────────
  {
    category: 'fresh-produce', subcategory: 'Plantains', pack: 'produce', emoji: '🍌',
    items: [
      ['Green Plantains', 'Wakis Mart Select', 0.99, 'each', 'Firm green plantains for tostones, boiled plantain, plantain chips and green plantain porridge.'],
      ['Ripe Yellow Plantains', 'Wakis Mart Select', 1.09, 'each', 'Sweet, ripe plantains with yellow skins — slice and fry for dodo, kelewele or Jamaican fried plantain.'],
      ['Extra-Ripe Black Plantains', 'Wakis Mart Select', 0.89, 'each', 'Very ripe, soft plantains at peak sweetness — ideal for plantain mosa, tatale and caramelised dodo.'],
    ],
  },
  {
    category: 'fresh-produce', subcategory: 'Yams & Root Vegetables', pack: 'produce', emoji: '🍠',
    items: [
      ['Puna Yam (African White Yam)', 'Wakis Mart Select', 3.49, 'per lb', 'Starchy Ghanaian puna yam for boiling, frying, asaro (yam porridge) and pounded yam.'],
      ['Jamaican Yellow Yam', 'Wakis Mart Select', 3.99, 'per lb', 'Prized Jamaican yellow yam with dense golden flesh — boil and serve with ackee and saltfish.'],
      ['Fresh Cassava Root (Yuca)', 'Wakis Mart Select', 1.99, 'per lb', 'Whole cassava root for boiling, frying, bammy and fufu. Peel thick skin before cooking.'],
      ['Eddoes (Cocoyam)', 'Wakis Mart Select', 2.79, 'per lb', 'Small, creamy cocoyam corms for soups and thickening ofe onugbu or Caribbean soups.'],
      ['Dasheen (Taro Root)', 'Wakis Mart Select', 2.99, 'per lb', 'Large taro corms with nutty, purple-flecked flesh — boil for provisions or add to Saturday soup.'],
      ['Jamaican Sweet Potato', 'Wakis Mart Select', 2.49, 'per lb', 'Red-skinned, white-fleshed sweet potato with a dry, chestnut-like texture — the one for sweet potato pudding.'],
      ['Orange Sweet Potato', 'Wakis Mart Select', 1.79, 'per lb', 'Moist, sweet orange-flesh sweet potatoes for roasting, mashing and frying.'],
    ],
  },
  {
    category: 'fresh-produce', subcategory: 'Peppers', pack: 'produce', emoji: '🌶️',
    items: [
      ['Scotch Bonnet Peppers', 'Wakis Mart Select', 6.99, 'per lb', 'Fruity, fiery scotch bonnets — the essential heat in jerk, pepper soup, stews and pepper sauce.'],
      ['Habanero Peppers', 'Wakis Mart Select', 5.99, 'per lb', 'Bright orange habaneros with intense heat and a floral aroma, great in ata rodo blends.'],
      ['Tatashe (Red Bell Peppers)', 'Wakis Mart Select', 3.99, 'per lb', 'Sweet red bell peppers that give Nigerian stew and jollof base their deep red colour.', 'A'],
    ],
  },
  {
    category: 'fresh-produce', subcategory: 'Fresh Vegetables', pack: 'produce', emoji: '🥬',
    items: [
      ['Fresh Okra', 'Wakis Mart Select', 3.99, 'per lb', 'Tender young okra pods for okra soup, gumbo, cou-cou and stews.'],
      ['Garden Eggs (African Eggplant)', 'Wakis Mart Select', 4.49, 'per lb', 'Small white garden eggs, eaten raw with peanut butter or cooked into Ghanaian garden egg stew.', 'A'],
      ['Chocho (Chayote)', 'Wakis Mart Select', 1.49, 'each', 'Crisp, mild chocho for soups, stews and Jamaican-style steamed vegetables.', 'C'],
      ['Fresh Callaloo (Amaranth)', 'Wakis Mart Select', 3.99, 'bunch', 'Freshly cut Jamaican callaloo — steam with onion, tomato and scotch bonnet for a classic breakfast.', 'C'],
    ],
  },
  {
    category: 'fresh-produce', subcategory: 'Ginger & Fresh Herbs', pack: 'produce', emoji: '🌿',
    items: [
      ['Fresh Ginger Root', 'Wakis Mart Select', 3.49, 'per lb', 'Pungent fresh ginger for ginger beer, sorrel, zobo, marinades and stews.'],
      ['Fresh Thyme', 'Wakis Mart Select', 1.99, 'bunch', 'Fragrant bunch of fresh thyme — an essential aromatic in Caribbean cooking.'],
      ['Escallion (Green Onion)', 'Wakis Mart Select', 1.49, 'bunch', 'Jamaican-style escallion with a bold oniony bite for jerk, brown stew and seasoning.'],
      ['Culantro (Shado Beni)', 'Wakis Mart Select', 2.49, 'bunch', 'Pungent, cilantro-like herb used in Trinidadian green seasoning and chutneys.', 'C'],
      ['Scent Leaf (Nchanwu)', 'Wakis Mart Select', 3.49, 'bunch', 'Aromatic African basil for pepper soup, ofe nsala and yam porridge.', 'A'],
    ],
  },
  {
    category: 'fresh-produce', subcategory: 'Tropical Fruits', pack: 'produce', emoji: '🥭',
    items: [
      ['Julie Mangoes', 'Wakis Mart Select', 2.49, 'each', 'Sweet, juicy Caribbean Julie mangoes with smooth, fibre-free flesh.'],
      ['Papaya', 'Wakis Mart Select', 4.99, 'each', 'Large ripe papaya with sweet orange flesh — great for breakfast or green papaya chutney.'],
      ['Soursop (Graviola)', 'Wakis Mart Select', 9.99, 'each', 'Creamy, tangy soursop for juices, punches and ice cream.'],
      ['Fresh Breadfruit', 'Wakis Mart Select', 6.99, 'each', 'Whole breadfruit for roasting on the fire, frying or adding to soup.'],
      ['Dry Coconut (Brown)', 'Wakis Mart Select', 2.29, 'each', 'Mature brown coconut for grating, coconut milk, coconut drops and gizzada.'],
      ['Green Jelly Coconut', 'Wakis Mart Select', 3.49, 'each', 'Young green coconut full of refreshing water and soft jelly.'],
      ['Golden Pineapple', 'Wakis Mart Select', 3.99, 'each', 'Sweet, aromatic pineapple for juice, pineapple chutney and fruit salad.'],
      ['Passion Fruit', 'Wakis Mart Select', 0.99, 'each', 'Tangy, fragrant passion fruit for juices, cheesecakes and cocktails.'],
      ['Sweet Tamarind Pods', 'Wakis Mart Select', 4.49, '1 lb pack', 'Fresh tamarind pods for tamarind balls, juice and sweet-sour sauces.'],
      ['Hass Avocados (Pear)', 'Wakis Mart Select', 1.79, 'each', 'Creamy avocados — or “pear” in the islands — perfect with hard dough bread or alongside rice.'],
    ],
  },

  // ───────────────────────── MEAT & SEAFOOD ─────────────────────────
  {
    category: 'meat-seafood', subcategory: 'Goat Meat', pack: 'tray', emoji: '🍖',
    items: [
      ['Fresh Goat Meat (Bone-In, Cubed)', 'Wakis Mart Butcher', 18.99, '2 lb tray', 'Fresh bone-in goat cut into stew-size pieces — ready for curry goat, pepper soup or asun.'],
      ['Skin-On Goat Meat', 'Wakis Mart Butcher', 21.99, '2 lb tray', 'Singed, skin-on goat pieces with the traditional smoky flavour prized for West African pepper soup.'],
      ['Goat Leg (Whole, Bone-In)', 'Wakis Mart Butcher', 34.99, 'approx. 3 lb', 'Whole goat leg for slow roasting or cutting to your preferred size. Ask our butcher to cut it for you.'],
    ],
  },
  {
    category: 'meat-seafood', subcategory: 'Oxtail & Beef', pack: 'tray', emoji: '🥩',
    items: [
      ['Beef Oxtail (Cut)', 'Wakis Mart Butcher', 24.99, '2 lb tray', 'Meaty oxtail sections, trimmed and cut for rich braised Jamaican oxtail and butter beans.'],
      ['Beef Stew Meat (Shin)', 'Wakis Mart Butcher', 14.99, '2 lb tray', 'Lean beef shin cubes that turn meltingly tender in Nigerian stew and Caribbean beef soup.'],
      ['Cow Foot (Cut)', 'Wakis Mart Butcher', 10.99, '2 lb tray', 'Cleaned, cut cow foot for Jamaican cow foot stew, soup and Nigerian nkwobi.'],
      ['Beef Tripe (Shaki)', 'Wakis Mart Butcher', 9.99, '2 lb tray', 'Washed honeycomb tripe for assorted meat stew, pepper soup and Caribbean tripe and beans.'],
      ['Cow Skin (Ponmo)', 'Wakis Mart Butcher', 8.99, '1 lb pack', 'Soft, ready-to-cook cow skin that soaks up the flavour of stews and egusi soup.', 'A'],
    ],
  },
  {
    category: 'meat-seafood', subcategory: 'Chicken & Turkey', pack: 'tray', emoji: '🍗',
    items: [
      ['Hard Chicken (Stewing Hen)', 'Wakis Mart Butcher', 15.99, 'whole bird', 'Firm, flavourful mature hen — the Nigerian favourite for stews that won’t fall apart.', 'A'],
      ['Chicken Leg Quarters', 'Wakis Mart Butcher', 9.99, '5 lb bag', 'Juicy leg quarters, ideal for jerk chicken, brown stew chicken and peppered chicken.'],
      ['Chicken Feet (Cleaned)', 'Wakis Mart Butcher', 5.99, '2 lb tray', 'Cleaned chicken feet for Caribbean chicken foot soup and slow-simmered broths.'],
      ['Smoked Turkey Wings', 'Wakis Mart Butcher', 12.99, '2 lb pack', 'Hickory-smoked turkey wings that add deep smoky flavour to beans, greens and stews.'],
      ['Turkey Necks', 'Wakis Mart Butcher', 8.99, '2 lb tray', 'Meaty turkey necks for stewing, soups and peppered turkey.'],
      ['Turkey Tails', 'Wakis Mart Butcher', 9.49, '2 lb tray', 'Rich, crispy-when-fried turkey tails — a much-loved treat in African and Caribbean homes.'],
    ],
  },
  {
    category: 'meat-seafood', subcategory: 'Smoked & Dried Fish', pack: 'tray', emoji: '🐟',
    items: [
      ['Smoked Catfish', 'Wakis Mart Select', 16.99, '8 oz pack', 'Wood-smoked catfish, cleaned and split — a classic flavouring for egusi, okra and banga soup.', 'A'],
      ['Smoked Mackerel (Titus)', 'Wakis Mart Select', 9.99, '2 fish', 'Smoked whole mackerel for stews, jollof and Ghanaian light soup.', 'A'],
      ['Smoked Herring Fillets', 'Wakis Mart Select', 7.49, '7 oz pack', 'Boneless smoked herring for Caribbean herring choka, solomon gundy and bake.', 'C'],
      ['Boneless Salted Cod (Saltfish)', 'Wakis Mart Select', 14.99, '1 lb pack', 'Premium boneless saltfish — soak, flake and cook with ackee or make fritters (stamp and go).', 'C'],
      ['Dried Bonga Fish', 'Wakis Mart Select', 8.99, '6 oz pack', 'Smoke-dried bonga shad that adds deep, savoury character to Nigerian soups and stews.', 'A'],
      ['Whole Dried Crayfish', 'Wakis Mart Select', 7.99, '4 oz pack', 'Whole smoked river crayfish — grind fresh or add whole to pepper soup and porridge.', 'A'],
    ],
  },
  {
    category: 'meat-seafood', subcategory: 'Stockfish', pack: 'tray', emoji: '🐟',
    items: [
      ['Stockfish Cuts (Okporoko)', 'Wakis Mart Select', 22.99, '8 oz pack', 'Norwegian air-dried cod, pre-cut into soup-size pieces. Soak overnight before cooking.', 'A'],
      ['Stockfish Head', 'Wakis Mart Select', 13.99, 'per head', 'Whole dried cod head — prized for its rich flavour in ofe owerri and assorted soups.', 'A'],
      ['Shredded Stockfish Flakes', 'Wakis Mart Select', 11.99, '4 oz pack', 'Ready-shredded stockfish that softens quickly — no hammer or overnight soak needed.', 'A'],
    ],
  },
  {
    category: 'meat-seafood', subcategory: 'Fresh Seafood', pack: 'tray', emoji: '🦐',
    items: [
      ['Jumbo Raw Shrimp (Shell-On)', 'Wakis Mart Select', 15.99, '1 lb pack', 'Jumbo 16/20 shrimp for curry shrimp, pepper shrimp and seafood fried rice.'],
      ['Whole Red Snapper (Cleaned)', 'Wakis Mart Select', 13.99, 'per lb', 'Scaled and gutted red snapper — perfect for escovitch fish, steamed fish or grilling.'],
      ['Kingfish Steaks', 'Wakis Mart Select', 12.99, 'per lb', 'Firm, meaty kingfish steaks for frying, curry fish and Trini fish broth.'],
      ['Whole Croaker Fish', 'Wakis Mart Select', 8.99, 'per lb', 'Mild, flaky croaker — fry whole or simmer in Nigerian fish stew and pepper soup.'],
      ['Conch Meat (Cleaned)', 'Wakis Mart Select', 19.99, '1 lb pack', 'Tenderised conch for conch fritters, curried conch and Bahamian conch salad.', 'C'],
      ['Whole Parrot Fish (Cleaned)', 'Wakis Mart Select', 11.99, 'per lb', 'Colourful reef fish with sweet white flesh — a Jamaican favourite for steaming and escovitch.', 'C'],
    ],
  },

  // ───────────────────────── FROZEN FOODS ─────────────────────────
  {
    category: 'frozen-foods', subcategory: 'Frozen Fish & Seafood', pack: 'box', emoji: '🐟',
    items: [
      ['Frozen Whole Mackerel (Titus)', 'Wakis Mart Select', 12.99, '5 lb box', 'Frozen whole Atlantic mackerel — fry, grill or stew. A West African staple.', 'A'],
      ['Frozen Whole Tilapia', 'Wakis Mart Select', 9.99, '2 lb bag', 'Cleaned, scaled tilapia for grilled tilapia, fish stew and banku with pepper.'],
      ['Frozen Hake (Panla)', 'Wakis Mart Select', 10.49, '2 lb bag', 'Mild, flaky hake steaks — wonderful in Nigerian fish stew and peppered fish.', 'A'],
      ['Frozen Atlantic Herring (Shawa)', 'Wakis Mart Select', 8.99, '2 lb bag', 'Whole herring to fry crisp and serve with rice, beans or garri.', 'A'],
      ['Frozen Tiger Prawns', 'Wakis Mart Select', 17.99, '2 lb bag', 'Large raw tiger prawns, easy-peel, for jollof, curry and grilling.'],
    ],
  },
  {
    category: 'frozen-foods', subcategory: 'Frozen Vegetables', pack: 'box', emoji: '🥬',
    items: [
      ['Frozen Ugu Leaves (Fluted Pumpkin)', 'Wakis Mart Select', 5.99, '14 oz pack', 'Washed and sliced ugu leaves, frozen fresh for edikang ikong, egusi and vegetable soup.', 'A'],
      ['Frozen Washed Bitter Leaf', 'Wakis Mart Select', 5.99, '14 oz pack', 'Pre-washed bitter leaf (onugbu) with the bitterness reduced — ready for ofe onugbu.', 'A'],
      ['Frozen Cassava Leaves', 'Wakis Mart Select', 4.99, '1 lb pack', 'Pounded cassava leaves for Sierra Leonean plasas, Congolese pondu and Liberian cassava leaf stew.', 'A'],
      ['Frozen Cut Okra', 'Wakis Mart Select', 3.49, '1 lb bag', 'Sliced okra, frozen at peak freshness for okra soup, gumbo and stews.'],
      ['Frozen Jute Leaves (Ewedu)', 'Wakis Mart Select', 5.49, '14 oz pack', 'Chopped jute leaves for silky Yoruba ewedu soup and Egyptian molokhia.', 'A'],
      ['Frozen Grated Cassava', 'Wakis Mart Select', 4.49, '1 lb pack', 'Finely grated cassava for Caribbean cassava pone, pudding and bammy.', 'C'],
    ],
  },
  {
    category: 'frozen-foods', subcategory: 'Frozen Specialty Foods', pack: 'box', emoji: '🥟',
    items: [
      ['Jamaican Beef Patties (Frozen)', 'Golden Krust', 11.99, '6-pack', 'Flaky golden pastry filled with seasoned spicy beef. Bake from frozen in 25 minutes.', 'C'],
      ['Jamaican Chicken Patties (Frozen)', 'Golden Krust', 11.99, '6-pack', 'Curry-seasoned chicken in a turmeric-gold crust — a quick Caribbean lunch.', 'C'],
      ['Coco Bread (Frozen)', 'Golden Krust', 6.99, '6-pack', 'Soft, buttery folded coco bread — split and stuff with a hot patty for the classic combo.', 'C'],
      ['Ga Kenkey (Frozen)', 'Wakis Mart Select', 8.99, '4 balls', 'Fermented corn dough wrapped in corn husk. Serve with fried fish, shito and fresh pepper.', 'A'],
      ['Sliced Ripe Plantain (Frozen)', 'Wakis Mart Select', 4.99, '1.5 lb bag', 'Peeled, sliced ripe plantain — fry straight from frozen for quick dodo.'],
      ['Frozen Yam Chunks', 'Wakis Mart Select', 5.99, '2 lb bag', 'Peeled and cut white yam, ready to boil, fry or add to porridge.'],
    ],
  },
  {
    category: 'frozen-foods', subcategory: 'Frozen Meat Products', pack: 'box', emoji: '🍖',
    items: [
      ['Frozen Goat Meat (Bone-In)', 'Wakis Mart Select', 24.99, '4 lb box', 'Bone-in goat pieces, frozen for convenience — ready for curry goat and pepper soup.'],
      ['Frozen Chicken Gizzards', 'Wakis Mart Select', 6.99, '2 lb pack', 'Cleaned gizzards for peppered gizzard and gizdodo (gizzard and plantain).', 'A'],
      ['Frozen Turkey Gizzards', 'Wakis Mart Select', 7.49, '2 lb pack', 'Meaty turkey gizzards for stews and fried peppered snacks.'],
      ['African Giant Snails (Cleaned, Frozen)', 'Wakis Mart Select', 21.99, '1 lb pack', 'Cleaned and blanched land snails (igbin) for peppered snail and pepper soup.', 'A'],
    ],
  },

  // ───────────────────────── SNACKS & BEVERAGES ─────────────────────────
  {
    category: 'snacks-beverages', subcategory: 'African Biscuits', pack: 'box', emoji: '🍪',
    items: [
      ['Cabin Biscuits', 'Cabin', 3.99, '6.3 oz pack', 'Crunchy, lightly sweet Nigerian biscuits — classic with a cup of tea or garri.', 'A'],
      ['Cream Crackers', 'Beloxxi', 3.49, '7 oz pack', 'Light, flaky Nigerian cream crackers for snacking or pairing with cheese and sardines.', 'A'],
      ['Gala Sausage Roll', 'UAC Gala', 1.99, 'each', 'Nigeria’s iconic on-the-go sausage roll in a soft, golden pastry.', 'A'],
    ],
  },
  {
    category: 'snacks-beverages', subcategory: 'Plantain Chips', pack: 'pouch', emoji: '🍌',
    items: [
      ['Lightly Salted Plantain Chips', 'Olu Olu', 2.99, '3 oz bag', 'Thin, crunchy green plantain chips with just a touch of salt.'],
      ['Sweet Ripe Plantain Chips', 'Tropical Sun', 2.99, '3 oz bag', 'Naturally sweet chips made from ripe plantains — a lunchbox favourite.'],
      ['Spicy Chilli Plantain Chips', 'Olu Olu', 2.99, '3 oz bag', 'Crunchy plantain chips dusted with a kick of chilli and pepper.'],
    ],
  },
  {
    category: 'snacks-beverages', subcategory: 'Chin Chin & African Snacks', pack: 'pouch', emoji: '🥨',
    items: [
      ['Classic Chin Chin', 'Wakis Mart Select', 5.99, '12 oz bag', 'Crunchy, nutmeg-spiced fried dough bites — the Nigerian party snack everyone reaches for.', 'A'],
      ['Coconut Chin Chin', 'Wakis Mart Select', 6.49, '12 oz bag', 'Golden chin chin made with fresh coconut milk for an extra-rich crunch.', 'A'],
      ['Kokoro Corn Sticks', 'Wakis Mart Select', 4.49, '8 oz bag', 'Crunchy fried maize sticks from Western Nigeria — perfect with soaked garri.', 'A'],
      ['Kuli Kuli (Groundnut Cakes)', 'Wakis Mart Select', 4.99, '8 oz bag', 'Crispy, spicy groundnut snacks from Northern Nigeria — also delicious crushed over salads.', 'A'],
    ],
  },
  {
    category: 'snacks-beverages', subcategory: 'Caribbean Snacks', pack: 'box', emoji: '🍘',
    items: [
      ['Excelsior Water Crackers', 'Excelsior', 4.49, '10.6 oz tin', 'Jamaica’s famous light, crispy water crackers. Great with cheese, butter or mackerel.', 'C'],
      ['Bulla Cakes', 'National', 3.99, '4-pack', 'Dense, moist Jamaican spiced molasses cakes. Pair with cheese or a slice of pear.', 'C'],
      ['Tamarind Balls', 'Wakis Mart Select', 4.99, '8 oz pack', 'Sweet, sour and sticky tamarind balls rolled in sugar — a Caribbean childhood classic.', 'C'],
      ['Coconut Drops', 'Wakis Mart Select', 5.49, '6 pieces', 'Chewy Jamaican sweets of diced coconut and ginger cooked in brown sugar.', 'C'],
      ['Jamaican Spiced Bun', 'National', 7.99, '24 oz loaf', 'Rich, dark spiced bun with raisins — slice and serve with cheese, Easter or any time.', 'C'],
      ['Banana Chips', 'Grace', 2.99, '3 oz bag', 'Crispy salted green banana chips from Jamaica.', 'C'],
    ],
  },
  {
    category: 'snacks-beverages', subcategory: 'Malt Beverages', pack: 'can', emoji: '🥤',
    items: [
      ['Malta Guinness', 'Guinness', 8.99, '6 × 11 oz cans', 'Rich, non-alcoholic malt drink with a smooth caramel taste. Best served ice-cold.'],
      ['Supermalt Original', 'Supermalt', 8.49, '6 × 11 oz cans', 'Classic Caribbean malt — sweet, energising and non-alcoholic.'],
      ['Vitamalt Classic', 'Vitamalt', 8.49, '6 × 11 oz cans', 'Vitamin-enriched non-alcoholic malt drink loved across the Caribbean and West Africa.'],
      ['Amstel Malta', 'Amstel', 7.99, '6 × 11 oz cans', 'Smooth, full-bodied Nigerian malt drink with a sweet finish.', 'A'],
      ['Malta Goya', 'Goya', 7.49, '6 × 12 oz bottles', 'Lightly carbonated malt beverage with a molasses-like sweetness.', 'C'],
    ],
  },
  {
    category: 'snacks-beverages', subcategory: 'Tropical Juices', pack: 'can', emoji: '🧃',
    items: [
      ['Rubicon Mango Juice', 'Rubicon', 1.49, '11 oz can', 'Sweet, tropical mango nectar made with real Alphonso mangoes.'],
      ['Rubicon Guava Juice', 'Rubicon', 1.49, '11 oz can', 'Fragrant pink guava nectar — refreshing on its own or as a cocktail mixer.'],
      ['Rubicon Passion Fruit Juice', 'Rubicon', 1.49, '11 oz can', 'Tangy, exotic passion fruit drink served best over ice.'],
      ['Chivita Exotic Juice', 'Chivita', 4.99, '1 L carton', 'Nigerian blend of pineapple, orange, mango and guava juices with no added sugar.', 'A'],
      ['Sorrel Ginger Drink', 'Wakis Mart Select', 3.49, '16 oz bottle', 'Ready-to-drink sorrel with fresh ginger — the taste of a Caribbean Christmas all year round.', 'C'],
    ],
  },
  {
    category: 'snacks-beverages', subcategory: 'Soft Drinks', pack: 'can', emoji: '🥤',
    items: [
      ['Ting Grapefruit Soda', 'Ting', 7.99, '6 × 10 oz bottles', 'Jamaica’s sparkling grapefruit soda made with real juice — tangy and refreshing.', 'C'],
      ['D&G Kola Champagne', 'D&G', 7.49, '6 × 12 oz bottles', 'Sweet, cream-soda-style Jamaican kola champagne. A Sunday dinner classic.', 'C'],
      ['D&G Pineapple Soda', 'D&G', 7.49, '6 × 12 oz bottles', 'Bright, fizzy Jamaican pineapple soda.', 'C'],
      ['Vimto Sparkling', 'Vimto', 6.99, '6 × 11 oz cans', 'Fruity mixed-berry fizzy drink beloved in West Africa and the Caribbean.'],
    ],
  },
  {
    category: 'snacks-beverages', subcategory: 'Specialty Teas & Hot Drinks', pack: 'box', emoji: '🍵',
    items: [
      ['Rooibos Tea', 'Freshpak', 6.49, '80 tea bags', 'Caffeine-free South African red bush tea with a naturally sweet, earthy flavour.', 'A'],
      ['Cerasee Tea', 'Wakis Mart Select', 4.99, '24 tea bags', 'Traditional Jamaican bush tea made from the cerasee vine — bitter and herbal.', 'C'],
      ['Zobo Hibiscus Tea', 'Wakis Mart Select', 4.99, '24 tea bags', 'Tart, ruby-red hibiscus tea inspired by Nigerian zobo. Delicious hot or iced.', 'A'],
      ['Jamaican Ginger Tea', 'Caribbean Dreams', 4.49, '14 sachets', 'Instant sweetened ginger tea with a warming Jamaican ginger kick.', 'C'],
      ['Milo Chocolate Malt Drink', 'Nestlé', 9.99, '14 oz tin', 'The chocolate malt energy drink generations grew up on — mix hot or cold.'],
      ['Bournvita Chocolate Drink', 'Cadbury', 9.49, '17.6 oz tin', 'Malted chocolate drink enriched with vitamins — a Nigerian breakfast staple.', 'A'],
    ],
  },
];

// ───────────────────────── DELI MENU ─────────────────────────
// Row format: [name, origin, subcategory, emoji, description, portions:[[label, price], ...]]
export const DELI_ITEMS = [
  // African deli
  ['Party Jollof Rice', 'A', 'African Deli', '🍛', 'Smoky, slow-cooked Nigerian party jollof simmered in a rich tomato and scotch bonnet base.', [['Small (16 oz)', 8.99], ['Large (32 oz)', 15.99], ['Party Tray (serves 8–10)', 69.99]]],
  ['Nigerian Fried Rice', 'A', 'African Deli', '🍚', 'Curry-spiced fried rice with mixed vegetables, liver and shrimp, Nigerian party style.', [['Small (16 oz)', 8.99], ['Large (32 oz)', 15.99], ['Party Tray (serves 8–10)', 69.99]]],
  ['Waakye', 'A', 'African Deli', '🍛', 'Ghanaian rice and black-eyed beans cooked with sorghum leaves, served with shito and gari.', [['Regular', 11.99], ['Large', 16.99]]],
  ['Egusi Soup', 'A', 'African Deli', '🥘', 'Ground melon seed soup with ugu leaves, assorted meat and stockfish in palm oil.', [['Pint (16 oz)', 13.99], ['Quart (32 oz)', 24.99]]],
  ['Ogbono Soup', 'A', 'African Deli', '🥘', 'Draw soup made with ground wild mango seed, okra, beef and dried fish.', [['Pint (16 oz)', 13.99], ['Quart (32 oz)', 24.99]]],
  ['Okra Soup', 'A', 'African Deli', '🥘', 'Fresh chopped okra soup with spinach, crayfish, beef and smoked fish.', [['Pint (16 oz)', 12.99], ['Quart (32 oz)', 23.99]]],
  ['Goat Meat Pepper Soup', 'A', 'African Deli', '🍲', 'Light, fiery broth with tender goat meat, scent leaf and our house pepper-soup spices.', [['Bowl (16 oz)', 13.99], ['Quart (32 oz)', 24.99]]],
  ['Goat Meat Stew', 'A', 'African Deli', '🍲', 'Tender goat simmered in a red pepper and tomato stew. Pair with rice, yam or plantain.', [['Small (16 oz)', 14.99], ['Large (32 oz)', 26.99]]],
  ['Beef Stew', 'A', 'African Deli', '🍲', 'Classic Nigerian red stew with fried beef chunks — rich, spicy and deeply savoury.', [['Small (16 oz)', 11.99], ['Large (32 oz)', 21.99]]],
  ['Chicken Stew', 'A', 'African Deli', '🍗', 'Fried chicken pieces finished in a slow-simmered tomato and pepper stew.', [['Small (16 oz)', 11.99], ['Large (32 oz)', 21.99]]],
  ['Fried Plantain (Dodo)', 'B', 'Sides', '🍌', 'Sweet ripe plantain, fried golden and caramelised at the edges.', [['Side', 4.99], ['Large', 8.99]]],
  ['Pounded Yam', 'A', 'Swallows', '🍚', 'Smooth, stretchy freshly pounded yam, wrapped and ready for your favourite soup.', [['Single wrap', 4.99], ['Double wrap', 8.99]]],
  ['Fufu (Cassava & Plantain)', 'A', 'Swallows', '🍚', 'Soft Ghanaian-style fufu made fresh from cassava and plantain.', [['Single wrap', 4.99], ['Double wrap', 8.99]]],
  ['Moi Moi', 'A', 'African Deli', '🥮', 'Steamed bean pudding with peppers, egg and fish — moist, savoury and filling.', [['1 wrap', 3.99], ['4 wraps', 14.49]]],
  ['Puff Puff', 'A', 'Sides', '🍩', 'Fluffy, golden fried dough balls with a hint of nutmeg. Warm and addictive.', [['10 pieces', 5.99], ['25 pieces', 12.99]]],
  // Caribbean deli
  ['Jamaican Jerk Chicken', 'C', 'Caribbean Deli', '🍗', 'Chicken marinated overnight in scotch bonnet, pimento and thyme, then smoked and grilled.', [['Quarter', 8.99], ['Half', 14.99], ['Whole', 26.99]]],
  ['Jamaican Curry Goat', 'C', 'Caribbean Deli', '🍛', 'Bone-in goat slow-cooked with Jamaican curry, potatoes and scotch bonnet until falling-off-the-bone tender.', [['Small (16 oz)', 15.99], ['Large (32 oz)', 28.99]]],
  ['Oxtail Stew with Butter Beans', 'C', 'Caribbean Deli', '🍲', 'Braised oxtail in a rich brown gravy with butter beans, pimento and spinners.', [['Small (16 oz)', 18.99], ['Large (32 oz)', 34.99]]],
  ['Rice and Peas', 'C', 'Sides', '🍚', 'Long-grain rice cooked with red kidney beans, coconut milk, thyme and pimento.', [['Side (12 oz)', 4.99], ['Large (32 oz)', 10.99]]],
  ['Jamaican Beef Patties', 'C', 'Caribbean Deli', '🥟', 'Flaky golden pastry filled with spicy seasoned ground beef, baked fresh daily.', [['Single', 3.49], ['Half dozen', 18.99]]],
  ['Fried Dumplings (Johnny Cakes)', 'C', 'Sides', '🥯', 'Crisp-outside, fluffy-inside fried dumplings — perfect with ackee, saltfish or stew.', [['3 pieces', 3.99], ['8 pieces', 8.99]]],
  ['Escovitch Fish', 'C', 'Caribbean Deli', '🐟', 'Whole fried snapper topped with pickled onions, carrots, scotch bonnet and pimento vinegar.', [['Regular (1 fish)', 18.99], ['Large (1 large fish)', 24.99]]],
  ['Brown Stew Chicken', 'C', 'Caribbean Deli', '🍗', 'Browned chicken simmered in a savoury gravy with onions, peppers and thyme.', [['Small (16 oz)', 11.99], ['Large (32 oz)', 21.99]]],
  ['Steamed Callaloo', 'C', 'Sides', '🥬', 'Jamaican callaloo steamed with onion, tomato, garlic and a touch of scotch bonnet.', [['Side (12 oz)', 5.49], ['Large (32 oz)', 11.99]]],
  ['Caribbean Fried Fish', 'C', 'Caribbean Deli', '🐟', 'Seasoned kingfish steaks fried crisp and served with a wedge of lime.', [['2 pieces', 13.99], ['4 pieces', 25.99]]],
  ['Ackee and Saltfish', 'C', 'Caribbean Deli', '🍳', 'Jamaica’s national dish — ackee sautéed with flaked saltfish, onions, tomato and peppers.', [['Small (16 oz)', 15.99], ['Large (32 oz)', 28.99]]],
];

// Products flagged as "featured" (shown on homepage / featured filter)
export const FEATURED = new Set([
  'Royal Stallion Parboiled Long Grain Rice', 'Pounded Yam Flour', 'Ground Egusi (Melon Seeds)', 'Zomi Red Palm Oil',
  'Traditional Jerk Seasoning (Hot & Spicy)', 'Ackee in Brine', 'Coconut Milk', 'Calypso Sauce',
  'Green Plantains', 'Scotch Bonnet Peppers', 'Beef Oxtail (Cut)', 'Fresh Goat Meat (Bone-In, Cubed)',
  'Jamaican Beef Patties (Frozen)', 'Malta Guinness', 'Classic Chin Chin', 'Ting Grapefruit Soda',
  'Party Jollof Rice', 'Jamaican Jerk Chicken', 'Jamaican Curry Goat', 'Egusi Soup', 'Oxtail Stew with Butter Beans', 'Puff Puff',
]);
