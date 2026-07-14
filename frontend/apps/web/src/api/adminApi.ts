import { getJson } from '../lib/apiClient';
export const fetchAdminConfigurationSummary = () => getJson('/api/admin/configuration-summary');
