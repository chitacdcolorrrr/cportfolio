# Taipei Sans TC webfonts

This directory contains the Regular (400) and Bold (700) webfont subsets of
Taipei Sans TC Beta. The Light (300) weight is intentionally not included
because the site does not request it.

- Original typeface: [JT Foundry](https://sites.google.com/view/jtfoundry/)
- Typeface license: SIL Open Font License 1.1 (`OFL-1.1.txt`)
- Webfont package: [`taipei-sans-tc` 0.1.1](https://github.com/VdustR/taipei-sans-tc)
- Webfont package license: MIT (`LICENSE-webfont-package.txt`)

The upstream WOFF2 files are split by Unicode range so browsers only download
the subsets needed by the page. Local font shortcuts were removed from the
vendored CSS to keep rendering consistent and to make self-hosted font loading
verifiable.
