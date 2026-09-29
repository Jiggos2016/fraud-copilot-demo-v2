import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  getCurrentDemoRole,
  hasDemoPermission,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  setCurrentDemoRole,
  type DemoPermission,
  type DemoRole,
} from '@/domain/access/accessControl';

type RoleContextValue = {
  role: DemoRole;
  roleLabel: string;
  isReadOnly: boolean;
  permissions: Record<DemoPermission, boolean>;
  setRole: (role: DemoRole) => void;
  can: (permission: DemoPermission) => boolean;
};

const RoleContext = createContext<RoleContextValue | null>(null);

export function DemoRoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<DemoRole>(() => getCurrentDemoRole());

  const value = useMemo<RoleContextValue>(() => ({
    role,
    roleLabel: ROLE_LABELS[role],
    isReadOnly: role === 'auditor',
    permissions: ROLE_PERMISSIONS[role],
    setRole: (nextRole: DemoRole) => {
      setCurrentDemoRole(nextRole);
      setRoleState(nextRole);
    },
    can: (permission: DemoPermission) => hasDemoPermission(role, permission),
  }), [role]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useDemoRole() {
  const context = useContext(RoleContext);
  if (!context) throw new Error('useDemoRole must be used inside DemoRoleProvider');
  return context;
}
