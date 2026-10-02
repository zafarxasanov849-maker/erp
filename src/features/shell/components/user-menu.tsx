"use client";

import { ArrowLeftRight, KeyRound, Languages, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/features/auth/actions";
import { setLocale } from "@/i18n/actions";
import { locales } from "@/i18n/config";

import type { ShellUser } from "../types";

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]!.toUpperCase())
      .join("") || "?"
  );
}

export function UserMenu({ user }: { user: ShellUser }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function changeLocale(next: string) {
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 px-2" aria-label={t("user.menu")}>
          <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {initials(user.fullName)}
          </span>
          <span className="hidden text-left text-sm leading-tight sm:block">
            <span className="block font-medium">{user.fullName}</span>
            <span className="block text-xs text-muted-foreground">{user.roleName}</span>
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="sm:hidden">
          <span className="block">{user.fullName}</span>
          <span className="block text-xs font-normal text-muted-foreground">{user.roleName}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="sm:hidden" />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger disabled={pending}>
            <Languages />
            {t("user.language")}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={locale} onValueChange={changeLocale}>
              {locales.map((l) => (
                <DropdownMenuRadioItem key={l} value={l}>
                  {t(`locale.${l}`)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem onSelect={() => router.push("/change-password")}>
          <KeyRound />
          {t("user.changePassword")}
        </DropdownMenuItem>
        {user.hasOtherOrgs && (
          <DropdownMenuItem onSelect={() => router.push("/select-org")}>
            <ArrowLeftRight />
            {t("user.switchOrg")}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={pending}
          onSelect={() => startTransition(() => signOut())}
        >
          <LogOut />
          {t("user.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
