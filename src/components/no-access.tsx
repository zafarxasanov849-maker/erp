import { ShieldX } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

/**
 * Ruxsat yo'q (CLAUDE.md qoida 11). Tarif cheklovi uchun — PlanLimit, bu emas.
 */
export async function NoAccess() {
  const t = await getTranslations("access");
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <ShieldX className="size-6" />
      </span>
      <h1 className="text-lg font-semibold">{t("noAccessTitle")}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">{t("noAccessDescription")}</p>
      <Button asChild variant="outline">
        <Link href="/">{t("home")}</Link>
      </Button>
    </div>
  );
}
