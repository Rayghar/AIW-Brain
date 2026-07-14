export const clinicalWorkspaceRegistry = ['design','activation','admin','quality','patterns','synthesis','governance','conformance','portfolio','runtime','security','knowledge','pilot'] as const;
export type ClinicalWorkspaceId = (typeof clinicalWorkspaceRegistry)[number];
