# Jinhao You — Academic Homepage

Academic homepage migrated to [PRISM](https://github.com/xyjoey/PRISM), based on template commit `f2748db9821e98ed487eee5104ce4cc282aa8c1e`. PRISM is MIT licensed; see LICENSE.

The root homepage now uses a classic academic layout inspired by [Hanzhe Hu's homepage](https://hzhupku.github.io/): a centered white document, portrait beside the biography, blue links, burgundy section headings, and publication figures alongside their citations. Responsive layout rules live in `src/app/academic.css`. Secondary pages retain the existing PRISM layout. The root homepage uses Arial/Helvetica to match the reference; secondary pages retain their existing Times New Roman typography.

## Preview and build

Use Node.js 22 or later. Run `npm ci`, then `npm run dev` for development. `npm run build` creates the static site in `out/`; `npm run check` checks TypeScript.

For a production preview: `python -m http.server 4173 --directory out`.

## Content

- `content/config.toml`: profile, contact links and navigation.
- `content/bio.md`: introduction.
- `content/publications.bib`: papers; original author lists and publication status are retained.
- `content/research.toml`: research experience.
- `content/cv.md`: education, tools and awards.
- `public/profile-beach.jpg`: the user-selected beach portrait from the local 03_Personal folder.
- `public/papers/`: reduced previews from the linked papers; see `SOURCES.md` for figure provenance. Publication metadata is unchanged.

This first version migrates only the original root homepage at commit `2ea7b7e143577c07c47fa91b4f7e9945f5e023f4`. It does not import the local CV or verify/revise original research claims, paper metadata or dates. Existing author lists ending in “et al.” remain incomplete as in the source. English-only content is intentional for this first migration.

`index.html` is retained as the original source snapshot; it is not the generated new homepage. Builds include it at `/legacy/`. The existing `/网页/` and `/regimevggt/` pages and assets are copied unchanged to the output by `scripts/build.mjs`.

## GitHub Pages

The workflow builds pull requests without deployment and deploys pushes to `main` or manual runs. Deployment uses **GitHub Actions** as the Pages publishing source. Local builds do not publish; pushes to `main` run the build and deployment workflow.

The template's Next.js dependency and matching ESLint configuration are updated within version 15 to 15.5.28. Headings and body text use Times New Roman, with Times and serif fallbacks.

The unused `svg2ico` development tool is omitted; the site uses an SVG favicon directly.

Update: the user requested a replacement portrait from `03_Personal`, Times New Roman, a RegimeVGGT entry labelled NeurIPS 2026 Poster, and education on the homepage. RegimeVGGT metadata and education are drawn from the current CV and existing project page; the Poster designation is supplied directly by the user. Other original-site content remains as migrated.
