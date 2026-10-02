/**
 * VAQTINCHALIK: 0-bosqichda auth va filiallar jadvali hali ulanmagan.
 * 1-bosqichda bu fayl o'chiriladi va ma'lumotlar Supabase'dan (staff, staff_branches, branches) olinadi.
 */
export interface ShellBranch {
  id: string;
  name: string;
}

export interface ShellUser {
  fullName: string;
  roleName: string;
  /** branches.all ruxsati — "Barcha filiallar" faqat shunda ko'rinadi */
  canSeeAllBranches: boolean;
}

export const MOCK_BRANCHES: readonly ShellBranch[] = [
  { id: "00000000-0000-4000-8000-000000000001", name: "Chilonzor" },
  { id: "00000000-0000-4000-8000-000000000002", name: "Yunusobod" },
];

export const MOCK_USER: ShellUser = {
  fullName: "Zafar Xasanov",
  roleName: "Egasi",
  canSeeAllBranches: true,
};
