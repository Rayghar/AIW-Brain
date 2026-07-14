# Provider Binding Security Profile

Required controls:
- repository tokens must be read-only;
- allowed paths must be configured;
- token references are recorded, not token values;
- KMS/HSM key material is never stored by AIW;
- signed manifests are verified before activation;
- activation is tenant/project scoped;
- every provider operation is audit logged.
