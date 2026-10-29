# Third-party provenance

This file records where each vendored or embedded third-party file in `public/` came from, what can be established about it from the repository, and what is still undecided (audit findings B-09 and F-25). Licence texts are in `THIRD-PARTY-NOTICES.md`.

It records facts and open questions. It does not make a licence election or give a legal opinion; those belong to licence counsel.

## Vendored files

| File | Contents | Identified from | Declared licences | SHA-256 |
|---|---|---|---|---|
| `public/vendor-docx.js` (803,970 bytes) | A single-file bundle of the `docx` library and the packages it needs, used only by the Word review-pack export (`public/review-documents.js`). | `docx 9.6.1` is named in `THIRD-PARTY-NOTICES.md`. The bundle itself contains `JSZip` `version = "3.10.1"` and code identifiable as `pako`, `readable-stream`, `inherits`, `immediate`, `string_decoder` and a `sax`/XML parser. | `docx`: MIT. `JSZip`: dual MIT **or** GPL-3.0-or-later ("at your choice"). The remaining packages are not individually listed in the notices. | `21a9b418075bf88ba388dff7776cd4449d90f3f63f7788e92427fe01a933b7c5` |
| `public/review-font.js` (1,013,030 bytes) | DejaVu Sans, base64-encoded, embedded in the PDF review-pack export (`public/review-pdf.js`). | The file's first line and `THIRD-PARTY-NOTICES.md` (Debian copyright format, upstream https://dejavu-fonts.github.io/). | Bitstream Vera licence, with DejaVu changes in the public domain, as recorded in the notices; the notices also carry a GPL-2+ stanza from the Debian packaging. | `25514239eb4244c7b103bfe0b5c3f65cc47880572cd975f20f187b5e228c2e9f` |
| `public/brain-catalogue.js` (1,536,256 bytes) | The descriptive architecture catalogue projection used by the Brain, release `AKR-0.10.73.5`. | The file header: "Reproducible archive projection. Descriptive authority only", with `manifestSha256` and `sourceSha256` of `AKR-0.10.73.5/PATTERN-DNA-2.1.json`. | Project content; its licence is not stated in the file. | `a5756a0313348a368c9055d21c772a872ad6be7ce03b5265c9bf687614255e9e` |

## What cannot be established from the repository

- **The exact dependency list and versions inside `vendor-docx.js`.** The bundle has no source map, no module-path comments, no build recipe and no lockfile entry. Only `docx 9.6.1` and `JSZip 3.10.1` can be pinned from evidence. Known vulnerabilities in the bundled packages therefore cannot be checked against an advisory database.
- **How `vendor-docx.js` was produced.** No build command is recorded. It is kept byte-for-byte as vendored; its SHA-256 above lets any change be detected, and `npm run release:manifest` records it with every other file.

## Decisions that belong to people

| Question | Owner | Status |
|---|---|---|
| Which licence is elected for JSZip (MIT or GPL-3.0-or-later), and whether the redistribution terms of every bundled package are met | Licence counsel | **Pending.** Not decided here. |
| Whether the DejaVu font's recorded terms (Bitstream Vera plus the Debian packaging's GPL-2+ stanza) cover embedding in generated PDFs | Licence counsel | **Pending.** Not decided here. |
| The licence under which the `AKR-0.10.73.5` catalogue content is distributed | Content owner | **Pending.** Not stated in the repository. |

## Recommended next step

Rebuild `vendor-docx.js` from a pinned lockfile (`docx@9.6.1` as a development dependency, bundled by a recorded `esbuild` command with a source map), so its contents can be listed, audited and updated. Until then, treat the bundle as unverified third-party code.
