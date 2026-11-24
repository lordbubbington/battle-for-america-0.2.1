# Battle for America — Zero-AI Art & Steamworks Content Survey Checklist

**Branch:** `art/public-domain-migration`  
**Audit Date:** 2026-11-24  
**Status:** **0 AI-generated visual assets remain in the repository.**

---

## 1. Repository Visual Asset Audit

| Asset Bucket | Directory | File Count | Resolution | Source / Provenance | AI Used? |
| :--- | :--- | :---: | :---: | :--- | :---: |
| Candidate Portraits | `public/art/candidates/` | 62 | `192x192` PNG | 52 `Public domain` / `PD-USGov` + 9 `CC BY` + 1 `CC BY-SA 2.0` (`ASSET_PROVENANCE.csv`) | **No** |
| Vintage Staff Portraits | `public/art/staff/` | 24 | `192x192` PNG | 24 `Public domain` (Library of Congress / FSA-OWI) | **No** |
| Event Illustrations (12 Categories) | `public/art/events/` | 108 | `960x540` JPEG | 108 `Public domain` / `PD-USGov` / `CC0` | **No** |
| Achievement Badges | `public/art/achievements/` | 37 | `192x192` PNG | Programmatic geometric vector-style emblems (Python/Pillow) | **No** |
| UI Icons | `public/art/ui-icons/` | 52 | `128x128` PNG | Programmatic geometric vector-style icons (Python/Pillow) | **No** |
| Game Icon / Favicon | `public/art/icon/` | 2 | `256x256` PNG + SVG | Programmatic geometric crest + hand-coded SVG | **No** |
| **Total In-Repo Visual Assets** | `public/art/` | **285** | Verified 0 mismatches | 100% non-AI (`1,351` old AI files quarantined outside repo) | **No** |

- **Quarantine Backup (outside Git repo):** `../bfa_ai_art_quarantine/` (`1,351` files logged in `QUARANTINE_MANIFEST.json`)
- **Unified Art Style Filter:** Deterministic Option 4 Campaign Poster / Risograph pixel math (`Pillow` / `NumPy`: crop, auto-contrast, median filter, tonal stepping, warm paper cast, film grain, unsharp mask). Zero neural networks or generative AI.

---

## 2. Steam Store Capsules (`../bfa_steam_capsules/`)

All 5 Valve-spec capsules are composed from `PD-USGov` U.S. Capitol backgrounds (zero living politicians on store art) with a clean programmatic editorial wordmark (re-runnable with a custom transparent `.png` logo later):

- [x] **Header Capsule (`920x430`):** `header_capsule_920x430.png`
- [x] **Small Capsule (`462x174`):** `small_capsule_462x174.png`
- [x] **Main Capsule (`1232x706`):** `main_capsule_1232x706.png`
- [x] **Vertical Capsule (`748x896`):** `vertical_capsule_748x896.png`
- [x] **Library Hero (`3840x1240`, no text/logo):** `library_hero_3840x1240.png`

---

## 3. Technical & Licensing Verification

- [x] **Zero broken image paths:** `0` broken paths across `1,275` static `/art/` references in `src/` and `index.html`.
- [x] **Build & static checks:** `npm run typecheck` (0 errors), `npm run lint` (0 errors), `npm run build` (clean `dist/` output).
- [x] **Attribution data ready:** `src/data/photoCredits.js` generated directly from `ASSET_PROVENANCE.csv` with all 10 `CC-BY` / `CC BY-SA 2.0` photographer credits (Title, Author, License, License URL, Source URL, and Modifications Note, including the `CC BY-SA 2.0` ShareAlike notice for Tucker Carlson's adapted portrait).

---

## 4. Before Submitting Your Steamworks Content Survey

- [ ] **Visual Viewport Spot-Check:** Run `npm run dev` locally and verify framing/contrast at `1440x900` and `960x640`.
- [ ] **Wire In-Game Credits Screen:** Render `CC_PHOTO_CREDITS` from `src/data/photoCredits.js` inside your Credits / About modal so all 10 `CC-BY` / `CC BY-SA 2.0` attributions are visible in-game.
- [ ] **Finish Manual Game Text Rewrite:** Confirm no AI-drafted narrative/event text remains before answering **"No"** to Pre-Generated AI Content on the Steamworks Content Survey.
- [ ] **Optional Custom Logo Swap:** Once you create a custom human-made `.svg`/`.png` logo, re-run the capsule script with `--logo /path/to/logo.png` to regenerate all 4 logo-bearing capsules.
