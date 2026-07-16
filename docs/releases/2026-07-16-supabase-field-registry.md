# FIELD–001 Supabase registry release

Release date: 2026-07-16

Canonical machine: `LD-001 / Bad Day Receipt`

This release connects the physical FIELD–001 object system to the persistent Supabase registry and event ledger.

- Anonymous opens and funnel events are recorded through the `field-telemetry` Edge Function.
- The private `/lab/metrics` report reads from the `field-metrics` Edge Function.
- Raw physical tokens are never stored; Supabase resolves SHA-256 hashes server-side.
- Anonymous session and visitor identifiers are hashed before persistence.
- The compatibility `/api/field-metrics` route proxies to Supabase and contains no database secret.
- `SM` identifiers and “Soft Machine” labels are retired in favor of canonical `LD-001`.
