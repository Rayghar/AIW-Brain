import type { ProviderProductCatalogEntry } from './architectureInteroperability.js';

const review = {
  status: 'approved-advisory' as const,
  reviewedAt: '2026-07-11T00:00:00.000Z',
  reviewOwner: 'AIW Provider Mapping Council',
};

const sourceByProvider = {
  portable: ['GH-CNCF-LANDSCAPE-GRAPH','GH-ASYNCAPI-SPEC','GH-OTEL'],
  aws: ['GH-AWS-SOLUTIONS-CONSTRUCTS','GH-AWS-SERVERLESS-PATTERNS'],
  azure: ['GH-MICROSOFT-ARCH-CENTER','GH-AZURE-RESOURCE-MODULES'],
  gcp: ['GH-GCP-CLOUD-FOUNDATION-FABRIC','GH-GCP-SOFTWARE-DELIVERY-BLUEPRINT'],
  'on-premises': ['GH-CNCF-LANDSCAPE-GRAPH','GH-APACHE-CAMEL','GH-BACKSTAGE'],
} as const;

function entry(
  id: string,
  neutralCapability: string,
  capabilityAliases: string[],
  provider: ProviderProductCatalogEntry['provider'],
  productName: string,
  productFamily: string,
  serviceModel: ProviderProductCatalogEntry['serviceModel'],
  requiredCharacteristics: string[],
  architectureConsequences: string[],
  portabilityRisks: string[],
): ProviderProductCatalogEntry {
  return {
    id, neutralCapability, capabilityAliases, provider, productName, productFamily, serviceModel,
    requiredCharacteristics, architectureConsequences, portabilityRisks,
    sourceConnectorIds: [...sourceByProvider[provider]],
    ...review,
  };
}

export const providerProductCatalog: ProviderProductCatalogEntry[] = [
  entry('PPC-PORTABLE-API-GATEWAY','API management',['api gateway','api management','ingress api'],'portable','OpenAPI-compatible API gateway capability','API management','portable-standard',['OpenAPI support','policy enforcement','rate limiting','workload identity'],['Preserves contract portability','Requires an implementation selection before deployment'],[]),
  entry('PPC-AWS-API-GATEWAY','API management',['api gateway','api management','ingress api'],'aws','Amazon API Gateway','API management','managed',['OpenAPI integration','IAM/OIDC integration','regional availability'],['Managed control plane and provider-native identity integration'],['Provider-specific policy and extension semantics']),
  entry('PPC-AZURE-API-MANAGEMENT','API management',['api gateway','api management','ingress api'],'azure','Azure API Management','API management','managed',['OpenAPI integration','Entra integration','policy enforcement'],['Managed gateway with Azure policy and identity integration'],['Policy language and operational model are provider-specific']),
  entry('PPC-GCP-API-GATEWAY','API management',['api gateway','api management','ingress api'],'gcp','Google Cloud API Gateway / Apigee','API management','managed',['OpenAPI integration','IAM integration','traffic policy'],['Managed API lifecycle and traffic governance'],['Product choice and policy semantics affect portability']),
  entry('PPC-ONPREM-KONG','API management',['api gateway','api management','ingress api'],'on-premises','Kong or approved enterprise API gateway','API management','enterprise-platform',['OpenAPI support','OIDC integration','rate limiting','high availability'],['Enterprise-operated gateway with local control'],['Operations, patching and scaling remain enterprise responsibilities']),

  entry('PPC-PORTABLE-EVENT','Event and messaging',['event broker','message broker','queue','streaming'],'portable','AsyncAPI/CloudEvents-compatible messaging capability','Event and messaging','portable-standard',['AsyncAPI contracts','CloudEvents compatibility','retry and dead-letter semantics'],['Preserves event contract and delivery semantics across implementations'],[]),
  entry('PPC-AWS-EVENT','Event and messaging',['event broker','message broker','queue','streaming'],'aws','Amazon EventBridge / MSK / SQS','Event and messaging','managed',['At-least-once delivery options','dead-letter handling','regional availability'],['Provider-managed event routing, streaming and queuing options'],['Semantics differ across EventBridge, MSK and SQS']),
  entry('PPC-AZURE-EVENT','Event and messaging',['event broker','message broker','queue','streaming'],'azure','Azure Event Grid / Service Bus / Event Hubs','Event and messaging','managed',['Topics and queues','dead-letter handling','streaming option'],['Provider-managed event and messaging services'],['Feature selection affects portability and ordering semantics']),
  entry('PPC-GCP-EVENT','Event and messaging',['event broker','message broker','queue','streaming'],'gcp','Google Pub/Sub','Event and messaging','managed',['At-least-once delivery','dead-letter topics','regional controls'],['Managed publish/subscribe messaging'],['Subscription and ordering semantics require explicit mapping']),
  entry('PPC-ONPREM-KAFKA','Event and messaging',['event broker','message broker','queue','streaming'],'on-premises','Apache Kafka / approved enterprise broker','Event and messaging','self-managed',['Schema governance','replication','dead-letter strategy','operational monitoring'],['Portable event-streaming foundation'],['Enterprise assumes broker operations and lifecycle management']),

  entry('PPC-PORTABLE-RUNTIME','Container runtime',['runtime','compute','container platform','orchestration'],'portable','OCI/Kubernetes-compatible runtime capability','Compute runtime','portable-standard',['OCI images','declarative deployment','health and scaling contracts'],['Supports portable workload packaging'],[]),
  entry('PPC-AWS-RUNTIME','Container runtime',['runtime','compute','container platform','orchestration'],'aws','Amazon EKS / ECS / Lambda','Compute runtime','managed',['Workload isolation','autoscaling','identity integration'],['Provider-managed orchestration or functions'],['Runtime-specific deployment and scaling semantics']),
  entry('PPC-AZURE-RUNTIME','Container runtime',['runtime','compute','container platform','orchestration'],'azure','Azure Kubernetes Service / Container Apps / Functions','Compute runtime','managed',['Workload identity','autoscaling','availability-zone support'],['Provider-managed orchestration and serverless runtime'],['Runtime-specific networking and scaling semantics']),
  entry('PPC-GCP-RUNTIME','Container runtime',['runtime','compute','container platform','orchestration'],'gcp','Google Kubernetes Engine / Cloud Run / Functions','Compute runtime','managed',['Workload identity','autoscaling','regional availability'],['Provider-managed container and serverless runtime'],['Runtime-specific request and execution semantics']),
  entry('PPC-ONPREM-RUNTIME','Container runtime',['runtime','compute','container platform','orchestration'],'on-premises','Kubernetes / approved virtualisation platform','Compute runtime','enterprise-platform',['OCI support','autoscaling','patching','multi-zone operations'],['Enterprise-controlled runtime platform'],['Platform operations and upgrades are enterprise responsibilities']),

  entry('PPC-PORTABLE-RELATIONAL','Relational data',['relational database','sql data','transactional store'],'portable','PostgreSQL-compatible relational capability','Data platform','portable-standard',['ACID transactions','backup and restore','encryption','replication'],['Preserves SQL and transactional semantics'],[]),
  entry('PPC-AWS-RELATIONAL','Relational data',['relational database','sql data','transactional store'],'aws','Amazon Aurora / RDS','Data platform','managed',['Multi-zone support','backup and restore','encryption'],['Managed relational database operations'],['Engine extensions and operational APIs are provider-specific']),
  entry('PPC-AZURE-RELATIONAL','Relational data',['relational database','sql data','transactional store'],'azure','Azure SQL / Azure Database for PostgreSQL','Data platform','managed',['High availability','backup and restore','private networking'],['Managed relational database capability'],['Tiering and platform extensions affect portability']),
  entry('PPC-GCP-RELATIONAL','Relational data',['relational database','sql data','transactional store'],'gcp','Cloud SQL / AlloyDB / Spanner','Data platform','managed',['High availability','backup and restore','regional controls'],['Managed relational and globally distributed database options'],['Spanner semantics differ from conventional relational engines']),
  entry('PPC-ONPREM-RELATIONAL','Relational data',['relational database','sql data','transactional store'],'on-premises','PostgreSQL / approved enterprise relational database','Data platform','self-managed',['Replication','backup and restore','encryption','operational monitoring'],['Enterprise-controlled relational platform'],['Database operations and capacity planning remain enterprise responsibilities']),

  entry('PPC-PORTABLE-OBJECT','Object storage',['object storage','blob storage','archive store'],'portable','S3-compatible object storage capability','Object storage','portable-standard',['Versioning','retention','encryption','lifecycle policy'],['Portable object-storage contract'],[]),
  entry('PPC-AWS-OBJECT','Object storage',['object storage','blob storage','archive store'],'aws','Amazon S3','Object storage','managed',['Versioning','retention','encryption','regional replication'],['Provider-managed durable object storage'],['Event and policy integrations are provider-specific']),
  entry('PPC-AZURE-OBJECT','Object storage',['object storage','blob storage','archive store'],'azure','Azure Blob Storage','Object storage','managed',['Versioning','immutability','encryption','replication'],['Provider-managed blob and archive storage'],['Access tiers and policy model are provider-specific']),
  entry('PPC-GCP-OBJECT','Object storage',['object storage','blob storage','archive store'],'gcp','Google Cloud Storage','Object storage','managed',['Versioning','retention','encryption','dual-region options'],['Provider-managed object storage'],['Lifecycle and event integrations are provider-specific']),
  entry('PPC-ONPREM-OBJECT','Object storage',['object storage','blob storage','archive store'],'on-premises','MinIO / approved enterprise object store','Object storage','self-managed',['S3 compatibility','replication','retention','encryption'],['Enterprise-controlled object storage'],['Durability and operations depend on enterprise deployment']),

  entry('PPC-PORTABLE-IDENTITY','Identity and access',['identity provider','iam','authentication','authorization'],'portable','OIDC/OAuth 2.0 and workload-identity capability','Identity','portable-standard',['OIDC','OAuth 2.0','workload identity','policy decision integration'],['Separates identity contracts from provider products'],[]),
  entry('PPC-AWS-IDENTITY','Identity and access',['identity provider','iam','authentication','authorization'],'aws','AWS IAM / Cognito / IAM Identity Center','Identity','managed',['Federation','workload roles','policy enforcement'],['Provider-native identity and access controls'],['Policy model and role semantics are provider-specific']),
  entry('PPC-AZURE-IDENTITY','Identity and access',['identity provider','iam','authentication','authorization'],'azure','Microsoft Entra ID / Managed Identities','Identity','managed',['OIDC federation','managed workload identity','conditional access'],['Provider-native enterprise identity integration'],['Tenant and conditional-access semantics are provider-specific']),
  entry('PPC-GCP-IDENTITY','Identity and access',['identity provider','iam','authentication','authorization'],'gcp','Google Cloud IAM / Identity Platform','Identity','managed',['Federation','workload identity','policy controls'],['Provider-native identity and access'],['Role and policy semantics are provider-specific']),
  entry('PPC-ONPREM-IDENTITY','Identity and access',['identity provider','iam','authentication','authorization'],'on-premises','Enterprise IdP / Keycloak / approved IAM platform','Identity','enterprise-platform',['OIDC','SAML','workload identity integration','high availability'],['Enterprise-controlled identity platform'],['Operations and integration ownership remain with the enterprise']),

  entry('PPC-PORTABLE-SECRETS','Secrets and key management',['secrets manager','kms','key vault','hsm'],'portable','Secret-manager and KMS abstraction','Secrets and key management','portable-standard',['envelope encryption','rotation','audit','external key custody'],['Separates key and secret contracts from providers'],[]),
  entry('PPC-AWS-SECRETS','Secrets and key management',['secrets manager','kms','key vault','hsm'],'aws','AWS Secrets Manager / KMS / CloudHSM','Secrets and key management','managed',['Rotation','audit','managed keys','HSM option'],['Provider-managed secrets and cryptographic keys'],['Key policy and API semantics are provider-specific']),
  entry('PPC-AZURE-SECRETS','Secrets and key management',['secrets manager','kms','key vault','hsm'],'azure','Azure Key Vault / Managed HSM','Secrets and key management','managed',['Rotation','audit','managed HSM','private endpoints'],['Provider-managed secrets and key custody'],['Vault and access-policy semantics are provider-specific']),
  entry('PPC-GCP-SECRETS','Secrets and key management',['secrets manager','kms','key vault','hsm'],'gcp','Secret Manager / Cloud KMS / Cloud HSM','Secrets and key management','managed',['Rotation','audit','HSM protection','regional keys'],['Provider-managed secrets and keys'],['Key hierarchy and API semantics are provider-specific']),
  entry('PPC-ONPREM-SECRETS','Secrets and key management',['secrets manager','kms','key vault','hsm'],'on-premises','HashiCorp Vault / enterprise HSM','Secrets and key management','enterprise-platform',['Rotation','audit','HSM integration','high availability'],['Enterprise-controlled key and secret platform'],['Operations, unseal and disaster recovery require enterprise ownership']),

  entry('PPC-PORTABLE-OBSERVABILITY','Observability',['telemetry','monitoring','logging','tracing','metrics'],'portable','OpenTelemetry-compatible observability capability','Observability','portable-standard',['OTLP','metrics','logs','traces','SLO integration'],['Portable telemetry collection and semantic conventions'],[]),
  entry('PPC-AWS-OBSERVABILITY','Observability',['telemetry','monitoring','logging','tracing','metrics'],'aws','Amazon CloudWatch / X-Ray / Managed Prometheus','Observability','managed',['OTLP integration','metrics','logs','traces'],['Provider-managed telemetry and monitoring'],['Query language and retention configuration are provider-specific']),
  entry('PPC-AZURE-OBSERVABILITY','Observability',['telemetry','monitoring','logging','tracing','metrics'],'azure','Azure Monitor / Application Insights','Observability','managed',['OTLP integration','metrics','logs','traces'],['Provider-managed application and platform monitoring'],['Query and workspace semantics are provider-specific']),
  entry('PPC-GCP-OBSERVABILITY','Observability',['telemetry','monitoring','logging','tracing','metrics'],'gcp','Google Cloud Operations','Observability','managed',['OTLP integration','metrics','logs','traces'],['Provider-managed cloud operations telemetry'],['Query and retention semantics are provider-specific']),
  entry('PPC-ONPREM-OBSERVABILITY','Observability',['telemetry','monitoring','logging','tracing','metrics'],'on-premises','OpenTelemetry / Prometheus / Grafana / approved SIEM','Observability','self-managed',['OTLP','metrics','logs','traces','retention governance'],['Enterprise-controlled observability stack'],['Capacity, retention and upgrades are enterprise responsibilities']),

  entry('PPC-PORTABLE-NETWORK','Network and traffic management',['network','load balancer','firewall','dns','service mesh'],'portable','Standards-based network and policy capability','Networking','portable-standard',['segmentation','ingress/egress control','DNS','TLS','policy enforcement'],['Preserves network and trust-boundary requirements'],[]),
  entry('PPC-AWS-NETWORK','Network and traffic management',['network','load balancer','firewall','dns','service mesh'],'aws','Amazon VPC / ELB / Network Firewall / Route 53','Networking','managed',['segmentation','load balancing','firewall policy','DNS'],['Provider-managed network and traffic controls'],['Network constructs and policy APIs are provider-specific']),
  entry('PPC-AZURE-NETWORK','Network and traffic management',['network','load balancer','firewall','dns','service mesh'],'azure','Azure Virtual Network / Application Gateway / Firewall / DNS','Networking','managed',['segmentation','load balancing','firewall policy','DNS'],['Provider-managed network and traffic controls'],['Network constructs and policy APIs are provider-specific']),
  entry('PPC-GCP-NETWORK','Network and traffic management',['network','load balancer','firewall','dns','service mesh'],'gcp','Google VPC / Cloud Load Balancing / Firewall / Cloud DNS','Networking','managed',['segmentation','load balancing','firewall policy','DNS'],['Provider-managed network and traffic controls'],['Network constructs and policy APIs are provider-specific']),
  entry('PPC-ONPREM-NETWORK','Network and traffic management',['network','load balancer','firewall','dns','service mesh'],'on-premises','Enterprise network / load balancer / firewall / DNS platform','Networking','enterprise-platform',['segmentation','load balancing','firewall policy','DNS','high availability'],['Enterprise-controlled network platform'],['Operations and policy lifecycle remain enterprise responsibilities']),
];

export function findProviderProductCandidates(capabilityText: string, provider?: ProviderProductCatalogEntry['provider']): ProviderProductCatalogEntry[] {
  const normalized = capabilityText.toLowerCase();
  return providerProductCatalog.filter((item) => {
    if (provider && item.provider !== provider) return false;
    const terms = [item.neutralCapability, ...item.capabilityAliases].map((value) => value.toLowerCase());
    return terms.some((term) => normalized.includes(term) || term.includes(normalized));
  });
}
