# Carry Forward authored parity review

This note records the production differences that are intentional rather than defects. The canonical screen map and ownership contract remain in [`figma-integration.md`](./figma-integration.md).

## Accessibility color companions

The Figma source remains the authority for hierarchy and visual character. Two small-text colors use application-owned accessible companions in production:

- Quiet small text uses `#5d5a53` rather than canonical `#6e6b63` on the light canvas and paper surfaces.
- Small coral explanatory text uses `#9d302a`; canonical `#ff5b4d` remains the object, progress, focus, and motion signal.

These substitutions are scoped in `src/carry-forward/carry-forward-accessibility.css`, loaded after the canonical Carry Forward stylesheet. They preserve the authored hierarchy while clearing the automated WCAG AA contrast gate.

## Receipt bridge continuity

M01 consumes the real receipt seed and shows the receipt identity plus a compact continuity object. It does not reconstruct or persist the completed receipt's raw line items inside Carry Forward. This is an acceptable privacy-preserving implementation difference: the bridge remains truthful without expanding the temporary task record.

## Protected preview verification

The preview remains protected. Ordinary CI resolves and records the exact-SHA Vercel deployment but does not weaken deployment protection. Full deployed browser and API verification uses either Vercel's automation-bypass secret or a temporary Vercel share path supplied outside Git history. Paid GPT-5.6 verification is opt-in and bounded to one synthetic request.
