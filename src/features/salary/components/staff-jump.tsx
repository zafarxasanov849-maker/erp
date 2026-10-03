"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Kelishuvi hali yo'q xodimni ochish (kelishuv qo'yish uchun) */
export function StaffJump({
  staff,
  basePath,
  month,
}: {
  staff: { id: string; name: string }[];
  basePath: string;
  month: string;
}) {
  const t = useTranslations("salary");
  const router = useRouter();
  return (
    <Select onValueChange={(id) => router.push(`${basePath}/${id}?month=${month}`)}>
      <SelectTrigger size="sm" className="min-w-52" aria-label={t("openStaff")}>
        <SelectValue placeholder={t("openStaff")} />
      </SelectTrigger>
      <SelectContent>
        {staff.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {s.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
