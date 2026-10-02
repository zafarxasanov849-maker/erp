/**
 * Ko'rsatkich funksiyalarida (metric_*, report_*) p_branch = null — "barcha ko'rinadigan filiallar".
 * Generatsiya qilingan turlar null'ni bilmaydi, shuning uchun bitta joyda o'giramiz.
 */
export function rpcBranch(branchId: string | null): string {
  return branchId as string;
}
