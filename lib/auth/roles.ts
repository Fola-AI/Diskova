import type { Database } from "@/lib/db/types";

export type UserRole = Database["public"]["Enums"]["user_role"];
export type VendorMemberRole = Database["public"]["Enums"]["vendor_member_role"];

export const ROLE_RANK: Record<UserRole, number> = {
  user: 1,
  vendor_member: 2,
  moderator: 3,
  admin: 4,
  super_admin: 5,
};

export const STAFF_ROLES: readonly UserRole[] = ["moderator", "admin", "super_admin"];

export function roleAtLeast(role: UserRole | null | undefined, min: UserRole): boolean {
  return Boolean(role) && ROLE_RANK[role as UserRole] >= ROLE_RANK[min];
}

export function isStaffRole(role: UserRole | null | undefined): boolean {
  return roleAtLeast(role, "moderator");
}

/** owner > manager > staff */
const MEMBER_RANK: Record<VendorMemberRole, number> = { owner: 3, manager: 2, staff: 1 };

export function memberRoleAtLeast(role: VendorMemberRole | null | undefined, min: VendorMemberRole): boolean {
  return Boolean(role) && MEMBER_RANK[role as VendorMemberRole] >= MEMBER_RANK[min];
}

export const USER_ROLES: readonly UserRole[] = ["user", "vendor_member", "moderator", "admin", "super_admin"];
