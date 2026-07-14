export interface JsonSchemaViolation {
  path: string;
  rule: string;
  message: string;
}

export interface JsonSchemaValidationResult {
  valid: boolean;
  violations: JsonSchemaViolation[];
}

type JsonSchema = Record<string, unknown>;

function typeOf(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (Number.isInteger(value)) return 'integer';
  return typeof value;
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function childPath(path: string, key: string | number): string {
  return typeof key === 'number' ? `${path}[${key}]` : `${path}.${key}`;
}

function validateNode(value: unknown, schema: JsonSchema, path: string, violations: JsonSchemaViolation[]): void {
  if (Array.isArray(schema.allOf)) {
    for (const item of schema.allOf) if (item && typeof item === 'object') validateNode(value, item as JsonSchema, path, violations);
  }

  if (Array.isArray(schema.anyOf)) {
    const matches = schema.anyOf.filter((candidate) => {
      if (!candidate || typeof candidate !== 'object') return false;
      const nested: JsonSchemaViolation[] = [];
      validateNode(value, candidate as JsonSchema, path, nested);
      return nested.length === 0;
    });
    if (!matches.length) violations.push({ path, rule: 'anyOf', message: 'Value does not match any permitted schema.' });
    return;
  }

  if (Array.isArray(schema.oneOf)) {
    const matches = schema.oneOf.filter((candidate) => {
      if (!candidate || typeof candidate !== 'object') return false;
      const nested: JsonSchemaViolation[] = [];
      validateNode(value, candidate as JsonSchema, path, nested);
      return nested.length === 0;
    });
    if (matches.length !== 1) violations.push({ path, rule: 'oneOf', message: `Value matched ${matches.length} schemas; exactly one is required.` });
    return;
  }

  if ('const' in schema && !sameJson(value, schema.const)) violations.push({ path, rule: 'const', message: 'Value does not equal the required constant.' });
  if (Array.isArray(schema.enum) && !schema.enum.some((item) => sameJson(item, value))) violations.push({ path, rule: 'enum', message: 'Value is not in the permitted enumeration.' });

  const expected = schema.type;
  if (typeof expected === 'string') {
    const actual = typeOf(value);
    const validType = expected === 'number' ? (actual === 'number' || actual === 'integer') : actual === expected;
    if (!validType) {
      violations.push({ path, rule: 'type', message: `Expected ${expected}, received ${actual}.` });
      return;
    }
  } else if (Array.isArray(expected)) {
    const actual = typeOf(value);
    const validType = expected.some((item) => item === actual || (item === 'number' && actual === 'integer'));
    if (!validType) {
      violations.push({ path, rule: 'type', message: `Expected one of ${expected.join(', ')}, received ${actual}.` });
      return;
    }
  }

  if (typeof value === 'string') {
    if (typeof schema.minLength === 'number' && value.length < schema.minLength) violations.push({ path, rule: 'minLength', message: `String is shorter than ${schema.minLength}.` });
    if (typeof schema.maxLength === 'number' && value.length > schema.maxLength) violations.push({ path, rule: 'maxLength', message: `String is longer than ${schema.maxLength}.` });
    if (typeof schema.pattern === 'string' && !new RegExp(schema.pattern).test(value)) violations.push({ path, rule: 'pattern', message: 'String does not match the required pattern.' });
  }

  if (typeof value === 'number') {
    if (typeof schema.minimum === 'number' && value < schema.minimum) violations.push({ path, rule: 'minimum', message: `Number is below ${schema.minimum}.` });
    if (typeof schema.maximum === 'number' && value > schema.maximum) violations.push({ path, rule: 'maximum', message: `Number is above ${schema.maximum}.` });
  }

  if (Array.isArray(value)) {
    if (typeof schema.minItems === 'number' && value.length < schema.minItems) violations.push({ path, rule: 'minItems', message: `Array contains fewer than ${schema.minItems} items.` });
    if (typeof schema.maxItems === 'number' && value.length > schema.maxItems) violations.push({ path, rule: 'maxItems', message: `Array contains more than ${schema.maxItems} items.` });
    if (schema.uniqueItems === true) {
      const unique = new Set(value.map((item) => JSON.stringify(item)));
      if (unique.size !== value.length) violations.push({ path, rule: 'uniqueItems', message: 'Array contains duplicate items.' });
    }
    if (schema.items && typeof schema.items === 'object') value.forEach((item, index) => validateNode(item, schema.items as JsonSchema, childPath(path, index), violations));
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const properties = schema.properties && typeof schema.properties === 'object' ? schema.properties as Record<string, unknown> : {};
    const required = Array.isArray(schema.required) ? schema.required.filter((item): item is string => typeof item === 'string') : [];
    for (const key of required) if (!(key in record)) violations.push({ path: childPath(path, key), rule: 'required', message: 'Required property is missing.' });
    for (const [key, item] of Object.entries(record)) {
      const propertySchema = properties[key];
      if (propertySchema && typeof propertySchema === 'object') validateNode(item, propertySchema as JsonSchema, childPath(path, key), violations);
      else if (schema.additionalProperties === false) violations.push({ path: childPath(path, key), rule: 'additionalProperties', message: 'Additional property is not permitted.' });
      else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') validateNode(item, schema.additionalProperties as JsonSchema, childPath(path, key), violations);
    }
  }
}

export function validateJsonSchema(value: unknown, schema: JsonSchema): JsonSchemaValidationResult {
  const violations: JsonSchemaViolation[] = [];
  validateNode(value, schema, '$', violations);
  return { valid: violations.length === 0, violations };
}
