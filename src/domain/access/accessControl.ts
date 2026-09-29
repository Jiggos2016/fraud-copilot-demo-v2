export type DemoRole = 'investigator' | 'auditor';

export type DemoPermission =
  | 'queryCopilot'
  | 'editMemo'
  | 'submitDisposition'
  | 'viewAudit'
  | 'exportEvidence'
  | 'viewModelProvenance'
  | 'viewAdministration';

export const ROLE_LABELS: Record<DemoRole, string> = {
  investigator: 'Investigator',
  auditor: 'Compliance / OIG Auditor',
};

export const ROLE_PERMISSIONS: Record<DemoRole, Record<DemoPermission, boolean>> = {
  investigator: {
    queryCopilot: true,
    editMemo: true,
    submitDisposition: true,
    viewAudit: true,
    exportEvidence: false,
    viewModelProvenance: true,
    viewAdministration: true,
  },
  auditor: {
    queryCopilot: false,
    editMemo: false,
    submitDisposition: false,
    viewAudit: true,
    exportEvidence: true,
    viewModelProvenance: true,
    viewAdministration: false,
  },
};

const ROLE_KEY = 'fraud-copilot-demo-role';

export function getCurrentDemoRole(): DemoRole {
  if (typeof window === 'undefined') return 'investigator';
  const stored = window.sessionStorage.getItem(ROLE_KEY);
  return stored === 'auditor' ? 'auditor' : 'investigator';
}

export function setCurrentDemoRole(role: DemoRole) {
  if (typeof window !== 'undefined') window.sessionStorage.setItem(ROLE_KEY, role);
}

export const hasDemoPermission = (role: DemoRole, permission: DemoPermission) =>
  ROLE_PERMISSIONS[role][permission];
