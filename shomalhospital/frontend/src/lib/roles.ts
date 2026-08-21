export type UserRole = "admin" | "technician";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "مدیر",
  technician: "کارشناس",
};

export function roleLabel(role: string): string {
  return ROLE_LABELS[role as UserRole] || role;
}

export function isValidRole(role: string): role is UserRole {
  return role === "admin" || role === "technician";
}

export function isAdmin(role?: string | null): boolean {
  return role === "admin";
}
