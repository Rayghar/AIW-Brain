import { createId, type ArchitectureProject, type RuntimeInventory, type RuntimeInventorySource, type RuntimeRelationship, type RuntimeResource } from '@aiw/domain';

function fingerprint(value: unknown): string {
  const text = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringRecord(value: unknown): Record<string, string> {
  const record = objectValue(value);
  return Object.fromEntries(Object.entries(record).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
}

function firstContainerImage(spec: Record<string, unknown>): string | undefined {
  const template = objectValue(spec.template);
  const nestedSpec = objectValue(template.spec);
  const containers = Array.isArray(nestedSpec.containers) ? nestedSpec.containers : Array.isArray(spec.containers) ? spec.containers : [];
  const first = objectValue(containers[0]);
  return typeof first.image === 'string' ? first.image : undefined;
}

function importKubernetes(raw: unknown, capturedAt: string): { resources: RuntimeResource[]; relationships: RuntimeRelationship[] } {
  const root = objectValue(raw);
  const items = Array.isArray(root.items) ? root.items : [raw];
  const resources: RuntimeResource[] = [];
  const relationships: RuntimeRelationship[] = [];
  const keyToId = new Map<string, string>();

  for (const rawItem of items) {
    const item = objectValue(rawItem);
    const metadata = objectValue(item.metadata);
    const spec = objectValue(item.spec);
    const name = typeof metadata.name === 'string' ? metadata.name : 'unnamed-resource';
    const namespace = typeof metadata.namespace === 'string' ? metadata.namespace : 'default';
    const kind = typeof item.kind === 'string' ? item.kind : 'Unknown';
    const id = createId('runtime');
    const externalId = `k8s:${namespace}:${kind}:${name}`;
    const image = firstContainerImage(spec);
    const replicas = typeof spec.replicas === 'number' ? spec.replicas : undefined;
    const labels = stringRecord(metadata.labels);
    resources.push({
      id, sourceType: 'kubernetes', externalId, resourceType: kind, name, provider: 'kubernetes', namespace,
      version: image, labels, discoveredAt: capturedAt,
      properties: {
        apiVersion: typeof item.apiVersion === 'string' ? item.apiVersion : undefined,
        replicas,
        image,
        selector: objectValue(spec.selector),
        encryptedAtRest: labels['aiw.encrypted-at-rest'] === 'true' ? true : undefined,
        availabilityZones: labels['aiw.availability-zones'] ? Number(labels['aiw.availability-zones']) : undefined,
      },
    });
    keyToId.set(`${namespace}:${kind}:${name}`, id);
  }

  for (const rawItem of items) {
    const item = objectValue(rawItem);
    const metadata = objectValue(item.metadata);
    const name = typeof metadata.name === 'string' ? metadata.name : 'unnamed-resource';
    const namespace = typeof metadata.namespace === 'string' ? metadata.namespace : 'default';
    const kind = typeof item.kind === 'string' ? item.kind : 'Unknown';
    const childId = keyToId.get(`${namespace}:${kind}:${name}`);
    const owners = Array.isArray(metadata.ownerReferences) ? metadata.ownerReferences : [];
    for (const ownerRaw of owners) {
      const owner = objectValue(ownerRaw);
      const ownerName = typeof owner.name === 'string' ? owner.name : '';
      const ownerKind = typeof owner.kind === 'string' ? owner.kind : '';
      const ownerId = keyToId.get(`${namespace}:${ownerKind}:${ownerName}`);
      if (childId && ownerId) relationships.push({ id: createId('runtime-edge'), sourceResourceId: ownerId, targetResourceId: childId, kind: 'contains', properties: {} });
    }
  }
  return { resources, relationships };
}

function importTerraform(raw: unknown, capturedAt: string): { resources: RuntimeResource[]; relationships: RuntimeRelationship[] } {
  const root = objectValue(raw);
  const resourcesRaw = Array.isArray(root.resources) ? root.resources : [];
  const resources: RuntimeResource[] = [];
  for (const rawResource of resourcesRaw) {
    const resource = objectValue(rawResource);
    const type = typeof resource.type === 'string' ? resource.type : 'unknown_resource';
    const name = typeof resource.name === 'string' ? resource.name : 'unnamed';
    const mode = typeof resource.mode === 'string' ? resource.mode : 'managed';
    const provider = typeof resource.provider === 'string' ? resource.provider : undefined;
    const instances = Array.isArray(resource.instances) ? resource.instances : [{}];
    instances.forEach((rawInstance, index) => {
      const instance = objectValue(rawInstance);
      const attributes = objectValue(instance.attributes);
      const labels = stringRecord(attributes.tags);
      const address = `${mode}.${type}.${name}${instances.length > 1 ? `[${index}]` : ''}`;
      resources.push({
        id: createId('runtime'), sourceType: 'terraform-state', externalId: address, resourceType: type, name,
        provider, region: typeof attributes.region === 'string' ? attributes.region : undefined,
        version: typeof attributes.engine_version === 'string' ? attributes.engine_version : typeof attributes.version === 'string' ? attributes.version : undefined,
        properties: { ...attributes, terraformAddress: address }, labels, discoveredAt: capturedAt,
      });
    });
  }
  return { resources, relationships: [] };
}

function importOpenApi(raw: unknown, capturedAt: string): { resources: RuntimeResource[]; relationships: RuntimeRelationship[] } {
  const root = objectValue(raw);
  const info = objectValue(root.info);
  const title = typeof info.title === 'string' ? info.title : 'Imported API';
  const version = typeof info.version === 'string' ? info.version : undefined;
  const apiId = createId('runtime');
  const resources: RuntimeResource[] = [{
    id: apiId, sourceType: 'openapi', externalId: `openapi:${title}`, resourceType: 'OpenAPI', name: title, version,
    properties: { openapi: root.openapi, serverCount: Array.isArray(root.servers) ? root.servers.length : 0 }, labels: {}, discoveredAt: capturedAt,
  }];
  const relationships: RuntimeRelationship[] = [];
  const paths = objectValue(root.paths);
  for (const [path, pathValue] of Object.entries(paths)) {
    const operations = objectValue(pathValue);
    for (const method of Object.keys(operations).filter((key) => ['get','post','put','patch','delete','options','head'].includes(key.toLowerCase()))) {
      const id = createId('runtime');
      resources.push({
        id, sourceType: 'openapi', externalId: `openapi:${title}:${method.toUpperCase()}:${path}`, resourceType: 'ApiOperation',
        name: `${method.toUpperCase()} ${path}`, version, properties: { method: method.toUpperCase(), path }, labels: {}, discoveredAt: capturedAt,
      });
      relationships.push({ id: createId('runtime-edge'), sourceResourceId: apiId, targetResourceId: id, kind: 'contains', properties: {} });
    }
  }
  return { resources, relationships };
}

function importManual(raw: unknown, capturedAt: string): { resources: RuntimeResource[]; relationships: RuntimeRelationship[] } {
  const root = objectValue(raw);
  const rawResources = Array.isArray(root.resources) ? root.resources : [];
  const rawRelationships = Array.isArray(root.relationships) ? root.relationships : [];
  const resources = rawResources.map((value) => {
    const resource = objectValue(value);
    return {
      id: typeof resource.id === 'string' ? resource.id : createId('runtime'),
      sourceType: 'manual' as const,
      externalId: typeof resource.externalId === 'string' ? resource.externalId : createId('manual'),
      resourceType: typeof resource.resourceType === 'string' ? resource.resourceType : 'Unknown',
      name: typeof resource.name === 'string' ? resource.name : 'Unnamed runtime resource',
      provider: typeof resource.provider === 'string' ? resource.provider : undefined,
      namespace: typeof resource.namespace === 'string' ? resource.namespace : undefined,
      region: typeof resource.region === 'string' ? resource.region : undefined,
      version: typeof resource.version === 'string' ? resource.version : undefined,
      properties: objectValue(resource.properties), labels: stringRecord(resource.labels), discoveredAt: capturedAt,
    } satisfies RuntimeResource;
  });
  const relationships = rawRelationships.flatMap((value) => {
    const relationship = objectValue(value);
    const sourceResourceId = typeof relationship.sourceResourceId === 'string' ? relationship.sourceResourceId : '';
    const targetResourceId = typeof relationship.targetResourceId === 'string' ? relationship.targetResourceId : '';
    const allowed = ['calls','publishes','subscribes','reads','writes','deployed-on','contains','depends-on'] as const;
    const kindValue = typeof relationship.kind === 'string' ? relationship.kind : 'depends-on';
    const kind = allowed.includes(kindValue as typeof allowed[number]) ? kindValue as typeof allowed[number] : 'depends-on';
    return sourceResourceId && targetResourceId ? [{ id: typeof relationship.id === 'string' ? relationship.id : createId('runtime-edge'), sourceResourceId, targetResourceId, kind, properties: objectValue(relationship.properties) }] : [];
  });
  return { resources, relationships };
}

export function importRuntimeInventory(project: ArchitectureProject, name: string, sourceType: RuntimeInventorySource, raw: unknown, sourceRevision?: string): RuntimeInventory {
  const capturedAt = new Date().toISOString();
  const imported = sourceType === 'kubernetes' ? importKubernetes(raw, capturedAt)
    : sourceType === 'terraform-state' ? importTerraform(raw, capturedAt)
      : sourceType === 'openapi' ? importOpenApi(raw, capturedAt)
        : importManual(raw, capturedAt);
  const resources = imported.resources.map((resource) => ({ ...resource, sourceType }));
  return {
    id: createId('inventory'), tenantId: project.tenantId, projectId: project.id, branchId: project.branch.id, name, sourceType,
    capturedAt, sourceRevision, rawFingerprint: fingerprint(raw), resources, relationships: imported.relationships,
  };
}
