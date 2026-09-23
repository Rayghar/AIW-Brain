# Troubleshoot without hiding gaps

Empty collection: build with an explicit input file. The default empty build is intentional. No source files are inferred from folder names.

Missing records: inspect indexed versus total counts, the selected filenames and the global limit. A shard is only part of a corpus.

Input rejected: inspect the reported record locator. Supported inputs are AIW JSON objects arrays and NDJSON records with objectId or semanticUnitId. Duplicates and conflicting scope labels require correction at their source, not bypass flags.

Missing citations: record the gap and request source evidence. Do not fabricate an immutable revision or passage hash.

Site will not load: run the local serve command after building. Opening index.html directly as a file does not reliably permit JSON loading in browsers.

Broken notes: run check-links on the selected vault. Fix file names or ambiguous wiki links. Heading fragments and external URLs need separate checking.

Large build: use a smaller explicit source selection. The tool reads and hashes all chosen records even when the display limit is small. This version is designed as a local explorer, not a scalable hosted search service.

Return to [start](01-start.md).
