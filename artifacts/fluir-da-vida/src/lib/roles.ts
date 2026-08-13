/** Role IDs as defined in the backend (require-role.ts). */
export const ROLES = {
  ADMIN: 1,
  PROFESSIONAL: 2,
  CLIENT: 3,
} as const;

export type RoleId = (typeof ROLES)[keyof typeof ROLES];

/** Returns the dashboard path for a given roleId. */
export function getDashboardPath(roleId: number): string {
  if (roleId === ROLES.ADMIN) return "/admin";
  if (roleId === ROLES.PROFESSIONAL) return "/professional";
  return "/client";
}
