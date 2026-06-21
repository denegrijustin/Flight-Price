# Premium Flight Intelligence Platform

Static prototype for the MCI to Naples premium-cabin flight intelligence dashboard.

## Data Status

This version opens with sample/mock fares, award space, routing, and provider settings so the dashboard remains useful without credentials.

Live cash fares can be loaded through the Cloudflare Pages Function at `/api/google-flights` when `SERPAPI_API_KEY` is configured. Award availability remains illustrative. The current live-search default is June 15-27, 2027 because June 15, 2026 has already passed.

## Map

The routing panel uses Leaflet with OpenStreetMap tiles to plot airport-to-airport connections from real airport coordinates. It loads Leaflet from a CDN and map tiles from OpenStreetMap, so the map requires browser network access.

## Cloudflare Pages

Recommended settings:

* Framework preset: None
* Build command: leave blank
* Build output directory: `.`
* Production branch: `main`
* Custom domain: `flights.elskatemm.com`
* Environment variable: `SERPAPI_API_KEY`

If this folder remains nested in a larger repo, set the Cloudflare Pages root directory to `outputs/flight-intelligence-platform`.

## Local Preview

Serve this folder with any static file server, or open `index.html` directly in a browser.

## Real Data Integration Needed

To make this live, connect approved airfare and award data providers, store search snapshots, and replace the sample arrays in `app.js` with provider responses.
