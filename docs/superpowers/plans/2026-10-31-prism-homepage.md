# PRISM Homepage Implementation Plan

**Goal:** Migrate the existing homepage content into PRISM for a local reviewable first version.
**Architecture:** PRISM Next.js static export with configuration-driven pages. A minimal build wrapper retains existing static project URLs.
**Tech stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, TOML, Markdown and BibTeX.
**Spec:** ../specs/2026-10-31-prism-homepage-design.md

- [x] Import template source and preserve original root HTML and project assets.
- [x] Migrate original homepage prose and metadata into About, Publications, Research and Background.
- [x] Preserve working paper URLs and remove sample identities and external template font dependency.
- [x] Prepare static export and GitHub Pages workflow without changing live settings.
- [x] Run production build, type check, content/asset preservation checks and browser QA.
- [x] Show the local preview and report verification limits, leaving publication pending.

Verification: production build and `npm run check` passed. Original project (58 files) and legacy Chinese directory (2 files) matched the export byte-for-byte. Browser checks passed for desktop and 390px layouts, publication search, BibTeX expansion, menu navigation and light/dark switching; no browser errors were recorded. Final research page renders all 13 bullets without nested list paragraphs. Preview: http://127.0.0.1:4173/. Publication remains pending.
