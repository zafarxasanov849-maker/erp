import { GraduationCap } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Kirish, ro'yxatdan o'tish va akkaunt sahifalari uchun markazlashgan karta. */
export async function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const t = await getTranslations("app");
  return (
    <main className="flex min-h-dvh flex-col items-center bg-muted/40 px-4 py-6">
      <div className="flex w-full max-w-md items-center justify-between">
        <span className="flex items-center gap-2 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GraduationCap className="size-5" />
          </span>
          {t("name")}
        </span>
        <LocaleSwitcher />
      </div>
      <div className="flex w-full max-w-md flex-1 flex-col justify-center py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">
              <h1>{title}</h1>
            </CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
        {footer && <div className="mt-4 text-center">{footer}</div>}
      </div>
    </main>
  );
}
