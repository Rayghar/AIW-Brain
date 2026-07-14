# Architecture Intelligence Workbench — Terraform starter
# This is intentionally scaffolding, not production-ready infrastructure.
# Validate provider versions, networking, security, identity, backup, monitoring and cost controls before use.

terraform {
  required_version = ">= 1.8.0"
}

variable "environment" {
  type        = string
  description = "Target environment name"
}

# TODO: bind Managed PostgreSQL (TechnologyProduct) to a reviewed provider-specific module.
# Architecture node id: physical-postgres
# Properties: {"vendor":"generic","product":"PostgreSQL","version":"15","replicas":2,"availabilityZones":2,"encryptedAtRest":true,"expectedMonthlyCost":500}
