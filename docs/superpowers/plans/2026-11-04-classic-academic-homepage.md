# Classic academic homepage implementation plan

**Goal:** Restyle the existing GitHub Pages homepage after the user-selected reference.

**Architecture:** Keep Next.js static export, existing content loaders, secondary routes and project assets. Render the root homepage from the existing content, with scoped classic academic styles and sourced paper previews.

**Spec:** `docs/superpowers/specs/2026-11-04-classic-academic-homepage-design.md`.

- [x] Inspect the reference HTML/CSS, website source, existing content and publishing workflow.
- [x] Replace the root page with biography, section anchors, news from the existing RegimeVGGT record, publications, research experience, education and honours.
- [x] Add responsive homepage CSS, visible server-rendered content, and original-paper previews with provenance.
- [x] Run the production build and TypeScript; inspect exported anchors, images, links, bibliography preservation and project asset hashes. Passed: 5 publications, 4 previews, 3 research entries, 17 local links/assets, 60 unchanged project files.
- [ ] Review the diff, publish through the existing GitHub Pages workflow and verify the deployed response.

Visual browser checks are unavailable because Computer Use was stopped by the Windows URL-verification policy. Do not substitute a claimed screenshot review.
