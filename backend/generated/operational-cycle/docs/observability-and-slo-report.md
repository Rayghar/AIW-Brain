# Order-to-Payment Reference Design — Observability and SLO Report

- Service name: aiw-reference-workbench
- Traces enabled: Yes
- Metrics enabled: Yes
- Logs enabled: Yes
- Sampling ratio: 0.2
- OTLP endpoint reference: env://OTEL_EXPORTER_OTLP_ENDPOINT
- Availability target: 99.9%
- p95 latency target: 500 ms

Runtime telemetry must be connected to a production collector and alerting platform before the target architecture is declared operationally ready.