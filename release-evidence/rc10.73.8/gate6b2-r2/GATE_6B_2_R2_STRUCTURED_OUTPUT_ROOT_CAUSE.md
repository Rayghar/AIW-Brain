# Gate 6B.2 R2 structured-output root cause

The predecessor request included a strict JSON Schema, but the shared gateway did not use the SDK parsed-output route. It read the response as text, concatenated output items, and passed the result to a manual JSON parser. Refusal, incomplete output, content filtering, truncation and schema parsing were therefore not cleanly separated. The malformed G6B2-REQ-02 output was reported only after this manual parsing path.

R2 uses OpenAI SDK `responses.parse` with `zodTextFormat`, `strict=true`, non-streaming output and `output_parsed`. One Zod source generates the provider schema and validates the parsed result. Arbitrary output text is never repaired or accepted as strict evidence. Model-supplied offsets are removed; exact quotations are resolved deterministically against immutable bounded evidence.

Production accepted: false.
