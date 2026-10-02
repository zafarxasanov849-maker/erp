import { Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

/**
 * Tarif cheklovi (CLAUDE.md qoida 11) — "Bu funksiya Pro tarifida".
 * Ruxsat yo'qligi uchun NoAccess ishlatiladi. Tariflar 10-bosqichda ulanadi.
 */
export async function PlanLimit({ plan = "Pro" }: { plan?: string }) {
  const t = await getTranslations("access");
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
        <Sparkles className="size-6" />
      </span>
      <h1 className="text-lg font-semibold">{t("planLimitTitle", { plan })}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">{t("planLimitDescription")}</p>
      <Button disabled>{t("upgrade")}</Button>
    </div>
  );
}
