import { LogOut } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

import { signOut } from "../actions";

export async function SignOutButton() {
  const t = await getTranslations("user");
  return (
    <form action={signOut}>
      <Button type="submit" variant="ghost" size="sm">
        <LogOut />
        {t("signOut")}
      </Button>
    </form>
  );
}
