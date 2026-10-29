# Nawabi Hyderabad House Greenwood inventory

Inventory for **Nawabi Hyderabad House Greenwood** and **Kwality Ice-cream**: cups, lids, cones, cake boxes, takeout trays, biryani boxes, tickets, and garage backup.

The list is loaded from the ice-cream and restaurant order sheets. Quantities, last receive dates, partial receipts, and garage backup counts come from those sheets. Unit costs were not on the sheets, so they start at $0 — add a cost on any SKU if you want dollar totals.

## What you can do

- Open **Inventory** and toggle between Nawabi Hyderabad House Greenwood and Kwality Ice-cream
- Under Kwality, toggle **Supplies** (cups, lids, cones) and **Ice-creams** (product, tubs, pints, quat, half)
- Each list matches the order sheet: S.No, date ordered, quantity, status, and garage backup
- Mark each SKU green (received all), yellow (partial), or red (did not receive)
- Filter either sheet to show a color first: not received, partial, or received all
- See on-hand vs garage backup, out-of-stock SKUs, and a suggested order list on the dashboard
- Maintain every item (par, reorder point, location, notes)
- Receive deliveries, log usage, waste, adjustments, and counts
- Search and filter the list and the activity log

Changes stay in this browser (`localStorage`). Reload the sheet inventory any time from the sidebar.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:43127](http://localhost:43127).

```bash
npm run build
npm start -- --port 43127
```

## Stack

- Next.js (App Router) and React
- Tailwind CSS and shadcn/ui
- Recharts for the category dashboard
- Client-side persistence (no database or login required)

## Scripts

- `npm run dev` — development server on port 43127
- `npm run build` — production build
- `npm run lint` — ESLint
