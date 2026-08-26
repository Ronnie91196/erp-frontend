# Pharma ERP React Frontend

Production-oriented React frontend for the supplied Pharma ERP Express/Prisma backend.

## Backend contract used

Default API base URL: `http://localhost:5000/api`

Override with:

```env
VITE_API_URL=http://localhost:5000/api
```

## Run

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

## Included application areas

- Login / JWT session
- Dashboard
- Products
- Product batches
- Product-supplier relationships (read access in product detail)
- Suppliers
- Supplier ledger
- Customers
- Customer ledger
- Users
- Purchases
- Purchase payments
- Purchase returns
- Sales / POS
- Sales payments
- Sales returns
- Inventory and every stock operation exposed by the backend
- Auth role tests
- Health check
- Full authenticated API console covering every backend route in the supplied `src/routes` files

## Important backend notes

The frontend intentionally follows the backend that was supplied rather than inventing endpoints that do not exist. The API console is included so every route can be exercised even when a dedicated business screen is not appropriate.

The backend currently does not expose CRUD routes for categories, manufacturers, units, packaging, prescriptions, notifications, stores or audit logs; therefore those are not falsely represented as connected frontend APIs.

## Route coverage

The API console lists and can execute all routes discovered in:

- `/api/auth`
- `/api/users`
- `/api/products`
- `/api` product-supplier routes
- `/api/suppliers`
- `/api/customers`
- `/api` batch, stock, purchase, payment, sales and return routes
- `/api/sales`
- `/api/dashboard`
- `/health`

## Recommended deployment

For production, build with `npm run build` and serve the `dist` directory behind Nginx or the organization's preferred static hosting/CDN. Configure `VITE_API_URL` to the HTTPS backend URL and enable HTTPS on both frontend and backend.
