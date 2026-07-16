# FIELD–001 anonymous analytics

FIELD–001 records anonymous interaction counts only. Receipt contents, custom receipt text, names, email addresses, precise locations, and social identities are never included in analytics events.

## Event funnel

- `field_opened`
- `object_presented`
- `qr_verified`
- `machine_started`
- `receipt_generated`
- `instagram_clicked`

Every custom event contains only:

- `batch`
- `edition`
- `token`
- `object_type`
- `machine`
- `returning`
- optional `placement`
- interaction `source`

Vercel Web Analytics provides anonymous pageviews and visitor totals for each unique `/access/{edition}/{token}` route.

## Tracked archive handoff

The artifact bridge opens:

```text
/go/instagram?edition=06&token=44ZSSL&source=artifact-bridge
```

The page records `instagram_clicked`, waits briefly for analytics delivery, then redirects to `https://www.instagram.com/labdojo/`.

## Private metrics console

Open:

```text
https://bad-day-receipt.vercel.app/lab/metrics
```

The browser sends the operator key only to `/api/field-metrics` in an Authorization header. It is stored in session storage for the current tab and is never included in Vercel page analytics.

Configure these Vercel production environment variables:

```text
LAB_METRICS_KEY=<a long random operator passphrase>
VERCEL_ANALYTICS_TOKEN=<a Vercel access token with read access to the project analytics>
```

Optional overrides:

```text
VERCEL_ANALYTICS_PROJECT_ID=prj_a8QlJCtuQxOlQnd4ABpSSujIC9BZ
VERCEL_ANALYTICS_TEAM_ID=team_catxQiUNiwAbO2g4LEh5BODI
```

The dashboard supports 7, 30, and 90 day windows and reports aggregate totals plus one row per physical FIELD–001 object.

## Vercel setup

1. Open the `bad-day-receipt` project in Vercel.
2. Enable Web Analytics from the Analytics section.
3. Add the production environment variables above.
4. Redeploy production.
5. Scan one card, complete the ritual, generate a receipt, and open the public archive.
6. Confirm the six events appear in the Web Analytics Events panel.

The private Vercel Analytics dashboard remains the source of truth. `/lab/metrics` is a focused FIELD–001 operator view powered by the same aggregated API.
