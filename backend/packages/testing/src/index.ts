export interface VerificationGateResult { id: string; status: 'pass' | 'fail'; detail: string; }
export function summarizeGateResults(results: VerificationGateResult[]) { return { total: results.length, passed: results.filter((r) => r.status === 'pass').length, failed: results.filter((r) => r.status === 'fail').length }; }
