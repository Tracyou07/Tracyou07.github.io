# Classic academic homepage

The user requested changing https://tracyou07.github.io/ to the style of https://hzhupku.github.io/. Match the reference's centered white document on a gray background, rectangular portrait beside the biography, blue text links, burgundy section headings with thin rules, and image-plus-text publication rows. Use responsive CSS rather than the reference's fixed-width tables.

Keep the existing Next.js static export and GitHub Pages workflow. Build the homepage as server-rendered content using existing Markdown, TOML and BibTeX sources. Keep all five publication records, research appointments, education, honours, original portrait and existing project routes. Publication preview figures may be derived from the linked papers, with recorded sources. Do not revise publication authors, status or dates as part of this visual change.

Implementation choice: a dedicated homepage stylesheet, leaving secondary pages and project pages intact. Hide the template navigation/footer on the homepage and present section anchors and a compact footer instead. Reuse existing dependencies. Use Arial/Helvetica to approximate the reference's Open Sans without adding font downloads.

Validate production build, TypeScript, exported headings/content, local links/assets and preserved project files before publishing through the existing repository. Browser automation was stopped by the local Windows browser-URL policy, so rendered visual QA is unavailable for this turn; do not claim screenshot or mobile-browser validation.
