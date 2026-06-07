# Tessie Power Calculator

A web app that pulls your Tesla's charging history from [Tessie](https://tessie.com) and calculates the electricity cost of each session using your utility's rate plan from [OpenEI](https://openei.org).

![Dashboard showing charging sessions filtered to home location with cost breakdown](https://placehold.co/1200x600/1e293b/f1f5f9?text=Tessie+Power+Calculator)

## Features

- Pulls all charging sessions from Tessie (home, supercharger, third-party)
- Looks up your utility's residential rate plans by ZIP code via OpenEI
- Calculates cost per session using TOU (time-of-use) schedules — rates vary by hour and month
- Filter sessions by location (e.g. home only)
- Monthly breakdown chart of energy used and cost
- Stat cards: total energy, total cost, avg cost/session, avg rate paid

## Prerequisites

- [Node.js](https://nodejs.org) v18+
- A [Tessie](https://tessie.com) account with API access
- A free [OpenEI API key](https://openei.org/services/)

## Setup

```bash
# Clone the repo
git clone https://github.com/michaelajuarez/tessie-power-calculator.git
cd tessie-power-calculator

# Install all dependencies
npm run install:all

# Create the server env file
cp .env.example server/.env
```

Edit `server/.env` and optionally add your keys there (you can also enter them in the app's Settings UI instead):

```
TESSIE_API_TOKEN=your_tessie_token
OPENEI_API_KEY=your_openei_key
PORT=3001
```

## Running

```bash
npm run dev
```

This starts both the Express server (port 3001) and Vite dev server (port 5173). Open [http://localhost:5173](http://localhost:5173).

## Configuration

On first launch, go to **Settings**:

1. **Tessie API Token** — get yours at [tessie.com/settings/api](https://tessie.com/settings/api)
2. **ZIP Code + OpenEI API Key** — get a free key at [openei.org/services](https://openei.org/services/), then click **Look up rate plans**
3. Select your utility's rate plan from the dropdown
4. Click **Save Settings**

Then go to **Dashboard**, choose a date range, and click **Load Data**.

## How costs are calculated

For **flat rate** plans: `cost = kWh × rate`

For **TOU plans** (like SDG&E DR-TOU): the session is split into hourly buckets. Each hour's cost is calculated using the period index from the utility's weekday/weekend schedule (a 12×24 month/hour lookup table from OpenEI), then priced using the above-baseline tier rate from that period.

## Tech stack

| Layer | Stack |
|---|---|
| Frontend | React 18, Vite, Recharts |
| Backend | Node.js, Express |
| Charging data | [Tessie API](https://developer.tessie.com) |
| Utility rates | [OpenEI Utility Rate Database](https://openei.org/services/doc/rest/util_rates/) |
