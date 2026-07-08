/**
 * Seed: Bluffton SC demo data for local development and CI.
 * Inserts: 1 city, feature flags, 30 restaurants (with menus),
 * 10 couriers, 5 customers.
 * Safe to run multiple times (upserts on stable deterministic IDs).
 */

import { PrismaClient, VehicleType, BackgroundCheckStatus } from '@prisma/client';

const prisma = new PrismaClient();

const BLUFFTON_CITY_ID = '00000000-0000-0000-0000-000000000001';
const SEED_OWNER_USER_ID = '00000000-0000-0000-0000-000000000010';

// Bluffton + Okatie corridor (simplified bounding polygon, EPSG:4326)
const BLUFFTON_POLYGON =
  'MULTIPOLYGON(((-80.9100 32.2150,-80.7800 32.2150,-80.7800 32.2950,-80.9100 32.2950,-80.9100 32.2150)))';

const DEFAULT_HOURS = JSON.stringify({
  mon: { open: '11:00', close: '22:00' },
  tue: { open: '11:00', close: '22:00' },
  wed: { open: '11:00', close: '22:00' },
  thu: { open: '11:00', close: '22:00' },
  fri: { open: '11:00', close: '23:00' },
  sat: { open: '11:00', close: '23:00' },
  sun: { open: '12:00', close: '21:00' },
});

type RestaurantSeed = {
  name: string;
  cuisine: string[];
  lat: number;
  lng: number;
  price: number;
};

const RESTAURANTS: RestaurantSeed[] = [
  { name: 'Lowcountry Burger Co.', cuisine: ['american', 'burgers'], lat: 32.2327, lng: -80.86, price: 1 },
  { name: 'Bluffton Chicken Shack', cuisine: ['american', 'chicken'], lat: 32.2401, lng: -80.8521, price: 1 },
  { name: 'May River Tacos', cuisine: ['mexican', 'tex-mex'], lat: 32.2358, lng: -80.8677, price: 1 },
  { name: 'Okatie Grill Express', cuisine: ['american', 'breakfast'], lat: 32.229, lng: -80.8903, price: 2 },
  { name: '278 Pizza Kitchen', cuisine: ['pizza', 'italian'], lat: 32.2445, lng: -80.8432, price: 2 },
  { name: 'Bluffton Oyster House', cuisine: ['seafood', 'lowcountry'], lat: 32.2381, lng: -80.8556, price: 3 },
  { name: 'Calhoun Street Crab Shack', cuisine: ['seafood', 'american'], lat: 32.2371, lng: -80.8612, price: 2 },
  { name: 'The Sandbar Grille', cuisine: ['seafood', 'american'], lat: 32.2349, lng: -80.859, price: 3 },
  { name: 'Lowcountry Shrimp & Grits', cuisine: ['seafood', 'southern'], lat: 32.241, lng: -80.848, price: 3 },
  { name: 'May River Fish Camp', cuisine: ['seafood', 'lowcountry'], lat: 32.2425, lng: -80.851, price: 2 },
  { name: 'El Rancho Bluffton', cuisine: ['mexican'], lat: 32.2315, lng: -80.872, price: 2 },
  { name: 'Taqueria Los Amigos', cuisine: ['mexican', 'tacos'], lat: 32.245, lng: -80.885, price: 1 },
  { name: 'Sabor Latino Cocina', cuisine: ['latin', 'colombian'], lat: 32.2395, lng: -80.8634, price: 2 },
  { name: 'Burrito Brothers', cuisine: ['mexican', 'burritos'], lat: 32.2338, lng: -80.8701, price: 1 },
  { name: 'Burnt Church BBQ', cuisine: ['bbq', 'southern'], lat: 32.2367, lng: -80.8563, price: 2 },
  { name: 'South Carolina Smoke House', cuisine: ['bbq'], lat: 32.2302, lng: -80.8815, price: 2 },
  { name: 'Okatie BBQ Pit', cuisine: ['bbq', 'american'], lat: 32.2275, lng: -80.894, price: 1 },
  { name: 'Old Town Pizza Co.', cuisine: ['pizza'], lat: 32.2388, lng: -80.8543, price: 2 },
  { name: 'Bluffton Slice House', cuisine: ['pizza', 'italian'], lat: 32.2412, lng: -80.8466, price: 1 },
  { name: 'Hilton Head Sushi & Hibachi', cuisine: ['japanese', 'sushi'], lat: 32.2356, lng: -80.8648, price: 3 },
  { name: 'Pho 278', cuisine: ['vietnamese', 'pho'], lat: 32.2428, lng: -80.8497, price: 2 },
  { name: 'Golden Dragon Chinese', cuisine: ['chinese'], lat: 32.2341, lng: -80.8689, price: 2 },
  { name: 'Thai Orchid Bluffton', cuisine: ['thai'], lat: 32.2376, lng: -80.8575, price: 2 },
  { name: 'Palmetto Sub Shop', cuisine: ['sandwiches', 'american'], lat: 32.2402, lng: -80.8519, price: 1 },
  { name: 'Old Town Deli', cuisine: ['sandwiches', 'deli'], lat: 32.2385, lng: -80.8548, price: 1 },
  { name: 'Bluffton Biscuit Company', cuisine: ['breakfast', 'southern'], lat: 32.2418, lng: -80.8488, price: 1 },
  { name: 'Calhoun Cafe & Bakery', cuisine: ['cafe', 'breakfast'], lat: 32.2369, lng: -80.8561, price: 2 },
  { name: 'Spice Route Indian Kitchen', cuisine: ['indian'], lat: 32.2348, lng: -80.8693, price: 2 },
  { name: 'Mediterranean Garden', cuisine: ['mediterranean', 'greek'], lat: 32.2362, lng: -80.8632, price: 2 },
  { name: 'Lowcountry Wing Stop', cuisine: ['wings', 'american'], lat: 32.2437, lng: -80.8473, price: 1 },
];

type MenuItem = { name: string; desc: string; price: number; dietary?: string[] };
type Category = { name: string; sort: number; items: MenuItem[] };

function buildMenu(cuisine: string[]): Category[] {
  if (cuisine.some((c) => ['mexican', 'tacos', 'burritos', 'tex-mex'].includes(c))) {
    return [
      {
        name: 'Tacos', sort: 1, items: [
          { name: 'Carne Asada Taco', desc: 'Grilled beef, onion, cilantro', price: 399 },
          { name: 'Al Pastor Taco', desc: 'Marinated pork, pineapple', price: 379 },
          { name: 'Shrimp Taco', desc: 'Seasoned shrimp, cabbage slaw, chipotle mayo', price: 449 },
          { name: 'Veggie Taco', desc: 'Black beans, corn, salsa verde', price: 349, dietary: ['vegetarian'] },
        ],
      },
      {
        name: 'Burritos & Bowls', sort: 2, items: [
          { name: 'Burrito Grande', desc: 'Choice of protein, rice, beans, cheese', price: 1099 },
          { name: 'Rice Bowl', desc: 'Cilantro lime rice, protein, toppings', price: 999 },
        ],
      },
      {
        name: 'Sides & Drinks', sort: 3, items: [
          { name: 'Chips & Guacamole', desc: 'House-made guac', price: 499, dietary: ['vegetarian', 'gluten-free'] },
          { name: 'Mexican Coke', desc: 'Real cane sugar', price: 299 },
        ],
      },
    ];
  }

  if (cuisine.some((c) => ['seafood', 'lowcountry'].includes(c))) {
    return [
      {
        name: 'Seafood Plates', sort: 1, items: [
          { name: 'Shrimp & Grits', desc: 'SC white shrimp, stone-ground grits, andouille gravy', price: 1699 },
          { name: 'Fried Oysters Basket', desc: 'Local oysters, tartar sauce, hushpuppies', price: 1499 },
          { name: 'Fish Tacos (2)', desc: 'Mahi-mahi, slaw, mango salsa', price: 1299 },
          { name: 'Crab Cake Platter', desc: 'Two crab cakes, remoulade, sides', price: 1899 },
          { name: 'Lowcountry Boil', desc: 'Shrimp, sausage, corn, potatoes', price: 2199 },
        ],
      },
      {
        name: 'Sides', sort: 2, items: [
          { name: 'Hushpuppies', desc: 'Jalapeño honey butter', price: 399, dietary: ['vegetarian'] },
          { name: 'Coleslaw', desc: 'Creamy house slaw', price: 299, dietary: ['vegetarian'] },
          { name: 'Sweet Tea', desc: 'Southern sweet iced tea', price: 299 },
        ],
      },
    ];
  }

  if (cuisine.includes('pizza')) {
    return [
      {
        name: 'Pizzas', sort: 1, items: [
          { name: 'Cheese Pizza (12")', desc: 'Classic mozzarella, tomato sauce', price: 1299, dietary: ['vegetarian'] },
          { name: 'Pepperoni Pizza (12")', desc: 'House pepperoni, mozzarella', price: 1499 },
          { name: 'Veggie Supreme (12")', desc: 'Bell pepper, mushroom, olive, onion', price: 1599, dietary: ['vegetarian'] },
          { name: 'BBQ Chicken Pizza (12")', desc: 'Smoked chicken, BBQ sauce, red onion', price: 1699 },
        ],
      },
      {
        name: 'Sides & Drinks', sort: 2, items: [
          { name: 'Garlic Knots (6)', desc: 'Butter, garlic, parsley', price: 599, dietary: ['vegetarian'] },
          { name: 'Caesar Salad', desc: 'Romaine, parmesan, croutons', price: 899, dietary: ['vegetarian'] },
          { name: 'Fountain Drink', desc: '32 oz', price: 249 },
        ],
      },
    ];
  }

  if (cuisine.includes('bbq') || cuisine.includes('southern')) {
    return [
      {
        name: 'BBQ Plates', sort: 1, items: [
          { name: 'Pulled Pork Plate', desc: '1/2 lb smoked pulled pork, 2 sides', price: 1399 },
          { name: 'Brisket Plate', desc: '1/3 lb sliced brisket, 2 sides', price: 1699 },
          { name: 'BBQ Ribs (Half Rack)', desc: 'St. Louis-style, dry rub', price: 1999 },
          { name: 'Smoked Chicken Plate', desc: 'Half chicken, 2 sides', price: 1299 },
        ],
      },
      {
        name: 'Sides', sort: 2, items: [
          { name: 'Mac & Cheese', desc: 'Creamy 3-cheese', price: 449, dietary: ['vegetarian'] },
          { name: 'Collard Greens', desc: 'Slow-cooked with smoked turkey', price: 399 },
          { name: 'Potato Salad', desc: 'Mustard-based Southern style', price: 399, dietary: ['vegetarian'] },
        ],
      },
    ];
  }

  // Default American
  return [
    {
      name: 'Mains', sort: 1, items: [
        { name: 'Classic Burger', desc: 'Angus beef, lettuce, tomato, pickles', price: 1199 },
        { name: 'Grilled Chicken Sandwich', desc: 'Herb-marinated chicken, brioche', price: 1099 },
        { name: 'Veggie Wrap', desc: 'Hummus, roasted veggies, feta', price: 999, dietary: ['vegetarian'] },
        { name: 'BLT Club', desc: 'Bacon, lettuce, tomato, triple-decker', price: 1099 },
        { name: 'Fish & Chips', desc: 'Beer-battered fish, fries, tartar sauce', price: 1299 },
      ],
    },
    {
      name: 'Sides & Drinks', sort: 2, items: [
        { name: 'French Fries', desc: 'Crispy seasoned fries', price: 399, dietary: ['vegan'] },
        { name: 'Onion Rings', desc: 'Beer-battered', price: 449, dietary: ['vegetarian'] },
        { name: 'Soft Drink', desc: 'Choice of soda, 20 oz', price: 249 },
        { name: 'Iced Tea', desc: 'Sweet or unsweet', price: 249 },
      ],
    },
  ];
}

function padId(prefix: string, n: number, length = 12): string {
  return `${prefix}${String(n).padStart(length, '0')}`;
}

async function main() {
  console.log('🌱 Starting seed...');

  // 1. Seed owner user
  await prisma.user.upsert({
    where: { id: SEED_OWNER_USER_ID },
    create: {
      id: SEED_OWNER_USER_ID,
      role: 'restaurant_admin',
      email: 'seed-owner@entrego.local',
      authProvider: 'password',
      firstName: 'Seed',
      lastName: 'Owner',
      status: 'active',
    },
    update: {},
  });

  // 2. City: Bluffton SC
  await prisma.$executeRawUnsafe(`
    INSERT INTO cities (id, name, state, timezone, service_area, is_live, min_pay_rule, surge_config)
    VALUES (
      '${BLUFFTON_CITY_ID}'::uuid,
      'Bluffton', 'SC', 'America/New_York',
      ST_GeomFromText('${BLUFFTON_POLYGON}', 4326),
      false, 'none',
      '{"defaultMultiplier":1.0,"maxMultiplier":2.5,"demandThresholdOrders":20,"demandWindowMinutes":15}'::jsonb
    )
    ON CONFLICT (id) DO NOTHING
  `);
  console.log('✓ City: Bluffton SC');

  // 3. Feature flags
  const flags = [
    'surge_enabled', 'scheduled_orders_enabled', 'group_orders_enabled',
    'instant_payout_enabled', 'chat_translation_enabled',
    'thermal_printer_enabled', 'min_pay_rule_enabled',
  ];
  for (const key of flags) {
    await prisma.featureFlag.upsert({
      where: { key },
      create: { key, value: false },
      update: {},
    });
  }
  console.log('✓ Feature flags');

  // 4. Restaurants
  for (const [i, r] of RESTAURANTS.entries()) {
    const restaurantId = padId('00000000-0000-0000-0001-', i + 1);
    const phone = `+1843555${String(100 + i).padStart(4, '0')}`;
    const email = r.name.toLowerCase().replace(/[^a-z0-9]/g, '.') + '@entrego.local';
    const rating = (3.5 + (i % 15) * 0.1).toFixed(2);
    const cuisineArr = `{${r.cuisine.join(',')}}`;

    await prisma.$executeRawUnsafe(`
      INSERT INTO restaurants (
        id, city_id, owner_user_id, legal_name, display_name,
        phone, email, address_line1, address_city, address_state, address_zip,
        location, cuisine_tags, price_level, commission_pct,
        avg_prep_minutes, rating, rating_count, is_active, is_accepting_orders, hours
      ) VALUES (
        '${restaurantId}'::uuid,
        '${BLUFFTON_CITY_ID}'::uuid,
        '${SEED_OWNER_USER_ID}'::uuid,
        '${r.name.replace(/'/g, "''")}',
        '${r.name.replace(/'/g, "''")}',
        '${phone}', '${email}',
        '${(123 + i) + ' US-278'}', 'Bluffton', 'SC', '29910',
        ST_SetSRID(ST_MakePoint(${r.lng}, ${r.lat}), 4326),
        '${cuisineArr}',
        ${r.price}, 0.20,
        ${15 + (i % 10)}, ${rating}, ${50 + i * 3},
        false, false,
        '${DEFAULT_HOURS}'::jsonb
      )
      ON CONFLICT (id) DO NOTHING
    `);

    // Menu
    const menuId = padId('00000000-0000-0001-0001-', i + 1);
    await prisma.menu.upsert({
      where: { id: menuId },
      create: { id: menuId, restaurantId, name: 'Main Menu', active: true },
      update: {},
    });

    const categories = buildMenu(r.cuisine);
    for (const [ci, cat] of categories.entries()) {
      const catId = `00000000-0000-0002-${String(i + 1).padStart(4, '0')}-${String(ci + 1).padStart(12, '0')}`;
      await prisma.menuCategory.upsert({
        where: { id: catId },
        create: { id: catId, menuId, name: cat.name, sort: cat.sort },
        update: {},
      });

      for (const [ii, item] of cat.items.entries()) {
        const itemId = `00000000-0000-0003-${String(i + 1).padStart(4, '0')}-${String(ci * 10 + ii + 1).padStart(12, '0')}`;
        await prisma.menuItem.upsert({
          where: { id: itemId },
          create: {
            id: itemId,
            categoryId: catId,
            name: item.name,
            description: item.desc,
            priceCents: item.price,
            isAvailable: true,
            dietaryTags: item.dietary ?? [],
            sort: ii,
          },
          update: {},
        });
      }
    }
  }
  console.log(`✓ Restaurants: ${RESTAURANTS.length} seeded`);

  // 5. Couriers
  const COURIERS = [
    { first: 'Carlos', last: 'Mendez', vehicle: VehicleType.car },
    { first: 'Maria', last: 'Rodriguez', vehicle: VehicleType.car },
    { first: 'Jose', last: 'Hernandez', vehicle: VehicleType.car },
    { first: 'Ana', last: 'Gutierrez', vehicle: VehicleType.scooter },
    { first: 'Luis', last: 'Torres', vehicle: VehicleType.car },
    { first: 'Sofia', last: 'Martinez', vehicle: VehicleType.car },
    { first: 'Miguel', last: 'Sanchez', vehicle: VehicleType.bike },
    { first: 'Isabella', last: 'Lopez', vehicle: VehicleType.car },
    { first: 'James', last: 'Williams', vehicle: VehicleType.car },
    { first: 'Sarah', last: 'Johnson', vehicle: VehicleType.car },
  ];
  for (const [i, c] of COURIERS.entries()) {
    const userId = padId('00000000-0000-0000-0002-', i + 1);
    await prisma.user.upsert({
      where: { id: userId },
      create: {
        id: userId,
        role: 'courier',
        email: `${c.first.toLowerCase()}.${c.last.toLowerCase()}${i}@entrego.local`,
        phone: `+1843556${String(100 + i).padStart(4, '0')}`,
        authProvider: 'phone',
        firstName: c.first,
        lastName: c.last,
        status: 'active',
      },
      update: {},
    });
    await prisma.courierProfile.upsert({
      where: { userId },
      create: {
        userId,
        vehicleType: c.vehicle,
        backgroundCheckStatus: BackgroundCheckStatus.clear,
        w9Status: 'verified',
        activeCityId: BLUFFTON_CITY_ID,
        rating: 4.8,
        completedDeliveries: 50 + i * 10,
        isOnline: false,
      },
      update: {},
    });
  }
  console.log(`✓ Couriers: ${COURIERS.length} seeded`);

  // 6. Customers
  const CUSTOMERS = [
    { first: 'Michael', last: 'Smith', email: 'michael.smith@example.com' },
    { first: 'Jennifer', last: 'Brown', email: 'jennifer.brown@example.com' },
    { first: 'David', last: 'Davis', email: 'david.davis@example.com' },
    { first: 'Emily', last: 'Wilson', email: 'emily.wilson@example.com' },
    { first: 'Robert', last: 'Moore', email: 'robert.moore@example.com' },
  ];
  for (const [i, c] of CUSTOMERS.entries()) {
    const userId = padId('00000000-0000-0000-0003-', i + 1);
    await prisma.user.upsert({
      where: { id: userId },
      create: {
        id: userId,
        role: 'customer',
        email: c.email,
        authProvider: 'password',
        firstName: c.first,
        lastName: c.last,
        status: 'active',
      },
      update: {},
    });
    await prisma.customerProfile.upsert({
      where: { userId },
      create: { userId, marketingOptIn: false },
      update: {},
    });
  }
  console.log(`✓ Customers: ${CUSTOMERS.length} seeded`);

  console.log('\n✅ Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
