# AIW .aiw-kpack UX and Provider Binding

`.aiw-kpack` is the portable knowledge-pack envelope used by Essential/offline, Enterprise and Sovereign deployments. It contains a signed knowledge-pack manifest, checksum, provenance and activation rules. It is verified before tenant/project pinning.

Provider binding is intentionally plan-first: AIW records read-only repository fetch plans and KMS guides; target environments bind real tokens and KMS/HSM providers. Repository output enters quarantine and candidate claims remain non-scoring.
