import type { BranchRef } from "@/lib/auth";

export type ShellBranch = BranchRef;

export interface ShellUser {
  fullName: string;
  roleName: string;
  /** "Barcha filiallar" tanlovi (staff.all_branches) */
  canSeeAllBranches: boolean;
  /** Bir nechta markazda ishlaydi — "Markazni almashtirish" */
  hasOtherOrgs: boolean;
}
