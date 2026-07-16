# FIELD–001 persistent analytics

FIELD–001 records anonymous operational events only. Receipt contents, custom receipt text, names, email addresses, IP addresses, precise locations, and social identities are never stored.

## Canonical identity

- Machine code: `LD-001`
- Machine name: `Bad Day Receipt`
- `SM` identifiers and “Soft Machine” labels are retired.

## Event funnel

- `field_opened`
- `object_presented`
- `qr_verified`
- `machine_started`
- `receipt_generated`
- `instagram_clicked`

Every event contains only:

- the physical card token, used transiently for server-side hash lookup
- anonymous session and visitor UUIDs, hashed before storage
- event name
- canonical machine code `LD-001`
- optional placement code
- returning-object flag
- client version and viewport class
- a unique client event ID for deduplication

Raw card tokens are never stored in Supabase. The browser sends the token to the `field-telemetry` Edge Function, which resolves it against a SHA-256 hash and writes through the server-only `record_field_event` RPC.

## Supabase project

Project: `lab-dojo-field-analytics`

The persistent registry contains:

- `field_machines`
- `field_objects`
- `field_placements`
- `field_sessions`
- `field_events`
- `field_unlocks`

All exposed tables have RLS enabled with explicit default-deny policies. Anonymous and authenticated browser roles cannot read or write registry data directly.

## Edge Functions

### `field-telemetry`

Accepts validated browser events from the production site and Vercel previews. It requires the project publishable key, validates the origin, restricts event fields, resolves the physical token server-side, and writes with the Supabase service role available only inside the Edge Function.

### `field-metrics`

Returns the private 7, 30, or 90-day FIELD–001 report. It requires both the publishable key and the operator passphrase. The passphrase is stored only as a SHA-256 hash in the private database schema.

## Tracked archive handoff

The artifact bridge opens a durable per-card route:

```text
/go/instagram/06/44ZSSL?source=artifact-bridge
```

The page records `instagram_clicked`, waits briefly for the keepalive request, then redirects to `https://www.instagram.com/labdojo/`.

## Private metrics console

Open:

```text
https://bad-day-receipt.vercel.app/lab/metrics
```

The operator key is stored only in session storage for the current tab. The metrics console is excluded from public Vercel page analytics.

The report includes:

- total opens
- anonymous unique visitors
- full funnel counts
- per-card performance
- placement labels
- LD–001 unlock and operation history

## Vercel role

Vercel hosts the interface and remains a supplemental page-analytics layer. Supabase is the canonical persistent registry and event ledger. The compatibility route `/api/field-metrics` proxies to Supabase and does not require Vercel analytics credentials or database secrets.
