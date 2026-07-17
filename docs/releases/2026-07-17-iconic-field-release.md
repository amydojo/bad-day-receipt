# FIELD–001 iconic release

Canonical machine: `LD-001 / Bad Day Receipt`

## Product ritual

1. A physical object is recognized as one of ten FIELD–001 positions released across Southern California.
2. The operator presents and inserts the same digital twin into the LD–001 reader.
3. LD–001 generates the emotional artifact before requesting anything from the visitor.
4. The object is logged as having operated LD–001.
5. The visitor may view the public FIELD–001 archive, then continue to `@labdojo` as the next chapter.

## Canonical notation

```text
FIELD–001 · OBJECT 06 / 10
SOUTHERN CALIFORNIA
LD–001 / BAD DAY RECEIPT
```

## Figma V7

File: `Lab Dojo — Field Artifact Cards`

- Section: `84:544` — ICONIC FIELD RELEASE / V7
- Recovery screen: `84:547`
- Object logged + receipt provenance: `85:557`
- Public ten-object archive: `86:557`
- Canonical state grammar: `87:557`

Design URL:

```text
https://www.figma.com/design/N7OL06DMuvY9tks10jUBdB?node-id=84-544
```

## Public route

```text
/field/001
```

The public release record exposes object position, recovery state, broad region, and LD–001 operation state only. It never exposes card tokens, precise placements, sessions, visitor identifiers, or receipt content.

## Persistent funnel

```text
field_opened
object_presented
qr_verified
machine_started
receipt_generated
field_archive_viewed
instagram_clicked
```

## Cache policy

Release v3 of the service worker activates immediately and retrieves application JavaScript and CSS network-first. This prevents an older FIELD interface from remaining active in Safari after a new production deployment.
