import { GraduationCap } from "lucide-react";
import { getTranslations } from "next-intl/server";

export async function Brand() {
  const t = await getTranslations("app");
  return (
    <div className="flex items-center gap-2 px-3 font-semibold">
      <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <GraduationCap className="size-5" />
      </span>
      {t("name")}
    </div>
  );
}
