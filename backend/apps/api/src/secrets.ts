import type { SecretReference } from '@aiw/domain';
import { signAwsRequest } from './awsSigV4.js';

export interface SecretProvider {
  resolve(reference: SecretReference): Promise<string>;
  health?(): Promise<{ ready: boolean; detail: string }>;
}
type FetchLike = typeof fetch;

function locator(reference: SecretReference, scheme: string): string {
  if (reference.provider === 'environment' && scheme === 'env') return reference.locator.replace(/^env:\/\//, '');
  const prefix = `${scheme}://`;
  if (!reference.locator.startsWith(prefix)) throw new Error(`INVALID_SECRET_LOCATOR:${scheme}`);
  return reference.locator.slice(prefix.length);
}
async function responseJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(`SECRET_PROVIDER_HTTP_${response.status}:${(await response.text()).slice(0, 200)}`);
  return response.json() as Promise<T>;
}

export class EnvironmentSecretProvider implements SecretProvider {
  async resolve(reference: SecretReference): Promise<string> {
    if (reference.provider !== 'environment') throw new Error('UNSUPPORTED_SECRET_REFERENCE');
    const name = locator(reference, 'env');
    const value = process.env[name];
    if (!value) throw new Error(`SECRET_NOT_AVAILABLE:${name}`);
    return value;
  }
  async health() { return { ready: true, detail: 'Environment secret provider available' }; }
}

export class VaultSecretProvider implements SecretProvider {
  constructor(private readonly address = process.env.VAULT_ADDR, private readonly token = process.env.VAULT_TOKEN, private readonly fetcher: FetchLike = fetch) {}
  async resolve(reference: SecretReference): Promise<string> {
    const target = locator(reference, 'vault');
    const [path, field = 'value'] = target.split('#');
    if (!this.address || !this.token || !path) throw new Error('VAULT_CONFIGURATION_REQUIRED');
    const response = await this.fetcher(`${this.address.replace(/\/$/, '')}/v1/${path}`, { headers: { 'X-Vault-Token': this.token } });
    const result = await responseJson<{ data?: ({ data?: Record<string, unknown> } & Record<string, unknown>) }>(response);
    const source = (result.data?.data ?? result.data ?? {}) as Record<string, unknown>;
    const value = source[field];
    if (typeof value !== 'string') throw new Error(`VAULT_SECRET_FIELD_NOT_FOUND:${field}`);
    return value;
  }
  async health() {
    try {
      if (!this.address || !this.token) return { ready: false, detail: 'VAULT_ADDR/VAULT_TOKEN missing' };
      const response = await this.fetcher(`${this.address.replace(/\/$/, '')}/v1/sys/health`, { headers: { 'X-Vault-Token': this.token } });
      return { ready: response.ok || [429, 472, 473].includes(response.status), detail: `Vault HTTP ${response.status}` };
    } catch (error) { return { ready: false, detail: error instanceof Error ? error.message : String(error) }; }
  }
}

export class AzureKeyVaultSecretProvider implements SecretProvider {
  constructor(private readonly accessToken = process.env.AZURE_KEY_VAULT_ACCESS_TOKEN, private readonly fetcher: FetchLike = fetch) {}
  async resolve(reference: SecretReference): Promise<string> {
    const target = locator(reference, 'azure-key-vault');
    const [vaultHost, name, version] = target.split('/');
    if (!vaultHost || !name || !this.accessToken) throw new Error('AZURE_KEY_VAULT_CONFIGURATION_REQUIRED');
    const response = await this.fetcher(`https://${vaultHost}/secrets/${encodeURIComponent(name)}${version ? `/${encodeURIComponent(version)}` : ''}?api-version=7.4`, { headers: { Authorization: `Bearer ${this.accessToken}` } });
    const result = await responseJson<{ value?: string }>(response);
    if (!result.value) throw new Error('AZURE_SECRET_VALUE_MISSING');
    return result.value;
  }
}

export class GcpSecretManagerProvider implements SecretProvider {
  constructor(private readonly accessToken = process.env.GCP_ACCESS_TOKEN, private readonly fetcher: FetchLike = fetch) {}
  async resolve(reference: SecretReference): Promise<string> {
    const resource = locator(reference, 'gcp-secret-manager');
    if (!this.accessToken) throw new Error('GCP_ACCESS_TOKEN_REQUIRED');
    const normalized = resource.includes('/versions/') ? resource : `${resource}/versions/latest`;
    const response = await this.fetcher(`https://secretmanager.googleapis.com/v1/${normalized}:access`, { headers: { Authorization: `Bearer ${this.accessToken}` } });
    const result = await responseJson<{ payload?: { data?: string } }>(response);
    if (!result.payload?.data) throw new Error('GCP_SECRET_VALUE_MISSING');
    return Buffer.from(result.payload.data, 'base64').toString('utf8');
  }
}

export class AwsSecretsManagerProvider implements SecretProvider {
  constructor(private readonly config = { region: process.env.AWS_REGION || 'us-east-1', accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, sessionToken: process.env.AWS_SESSION_TOKEN }, private readonly fetcher: FetchLike = fetch) {}
  async resolve(reference: SecretReference): Promise<string> {
    const secretId = locator(reference, 'aws-secrets-manager');
    if (!this.config.accessKeyId || !this.config.secretAccessKey) throw new Error('AWS_SECRET_MANAGER_CREDENTIALS_REQUIRED');
    const url = `https://secretsmanager.${this.config.region}.amazonaws.com/`;
    const requestBody = JSON.stringify({ SecretId: secretId });
    const headers = signAwsRequest({ method: 'POST', url, service: 'secretsmanager', region: this.config.region, accessKeyId: this.config.accessKeyId, secretAccessKey: this.config.secretAccessKey, ...(this.config.sessionToken ? { sessionToken: this.config.sessionToken } : {}), body: requestBody, headers: { 'content-type': 'application/x-amz-json-1.1', 'x-amz-target': 'secretsmanager.GetSecretValue' } });
    const result = await responseJson<{ SecretString?: string; SecretBinary?: string }>(await this.fetcher(url, { method: 'POST', headers, body: requestBody }));
    if (result.SecretString !== undefined) return result.SecretString;
    if (result.SecretBinary) return Buffer.from(result.SecretBinary, 'base64').toString('utf8');
    throw new Error('AWS_SECRET_VALUE_MISSING');
  }
}

export class CompositeSecretProvider implements SecretProvider {
  constructor(private readonly providers: Partial<Record<SecretReference['provider'], SecretProvider>>) {}
  async resolve(reference: SecretReference) {
    const provider = this.providers[reference.provider];
    if (!provider) throw new Error(`SECRET_PROVIDER_NOT_CONFIGURED:${reference.provider}`);
    return provider.resolve(reference);
  }
}
export function createEnterpriseSecretProvider(): CompositeSecretProvider {
  return new CompositeSecretProvider({ environment: new EnvironmentSecretProvider(), vault: new VaultSecretProvider(), 'aws-secrets-manager': new AwsSecretsManagerProvider(), 'azure-key-vault': new AzureKeyVaultSecretProvider(), 'gcp-secret-manager': new GcpSecretManagerProvider() });
}
