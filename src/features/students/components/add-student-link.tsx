"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

import { useStudentSheet } from "./student-sheet";

/** Sahifa ichidagi "Talaba qo'shish" tugmasi (guruh oldindan tanlanishi mumkin) */
export function AddStudentLink({
  groupId,
  variant = "default",
}: {
  groupId?: string;
  variant?: "default" | "outline";
}) {
  const sheet = useStudentSheet();
  const t = useTranslations("students");
  if (!sheet) return null;
  return (
    <Button variant={variant} onClick={() => sheet.open({ groupId })}>
      <Plus />
      {t("addLong")}
    </Button>
  );
}
