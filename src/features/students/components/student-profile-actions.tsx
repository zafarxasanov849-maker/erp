"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Archive, ArchiveRestore, Camera, Pencil, Trash2, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { DateInput } from "@/components/date-input";
import { FormError } from "@/components/form-error";
import { PhoneInput } from "@/components/phone-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useServerAction } from "@/hooks/use-server-action";
import { useTranslateKey } from "@/i18n/use-translate-key";

import {
  removeStudentPhoto,
  setStudentArchived,
  updateStudent,
  uploadStudentPhoto,
} from "../actions";
import { type StudentUpdateValues, studentUpdateSchema } from "../schema";
import { DuplicatePhoneWarning, TagPicker } from "./student-sheet";

const NONE = "__none__";

export function StudentEditButton({
  defaults,
  tags,
  branchId,
}: {
  defaults: StudentUpdateValues;
  tags: { id: string; name: string; color: string | null }[];
  branchId: string;
}) {
  const t = useTranslations("students");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const form = useForm<StudentUpdateValues>({
    resolver: zodResolver(studentUpdateSchema),
    defaultValues: defaults,
  });
  const { error, setError, pending, run } = useServerAction(form);

  const text = (
    name: "fullName" | "parentName" | "telegram" | "address" | "school" | "passportSeries",
    placeholder?: string,
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t(`fields.${name}`)}</FormLabel>
          <FormControl>
            <Input placeholder={placeholder} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
  const phone = (name: "phone" | "parentPhone") => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t(`fields.${name}`)}</FormLabel>
          <FormControl>
            <PhoneInput {...field} />
          </FormControl>
          <FormMessage />
          {name === "phone" && (
            <DuplicatePhoneWarning
              phone={field.value}
              branchId={branchId}
              excludeId={defaults.id}
            />
          )}
        </FormItem>
      )}
    />
  );

  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          form.reset(defaults);
          setError(null);
          setOpen(true);
        }}
      >
        <Pencil />
        {t("profile.edit")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          closeLabel={tc("close")}
          className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl"
        >
          <DialogHeader>
            <DialogTitle>{t("profile.editTitle")}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              className="grid gap-4"
              onSubmit={form.handleSubmit((v) =>
                run(
                  () => updateStudent(v),
                  () => {
                    toast.success(tc("saved"));
                    setOpen(false);
                  },
                ),
              )}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                {text("fullName")}
                {phone("phone")}
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("fields.gender")}</FormLabel>
                      <Select
                        value={field.value || NONE}
                        onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={NONE}>{t("fields.genderNone")}</SelectItem>
                          <SelectItem value="male">{t("gender.male")}</SelectItem>
                          <SelectItem value="female">{t("gender.female")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="birthDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("fields.birthDate")}</FormLabel>
                      <FormControl>
                        <DateInput {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {text("parentName")}
                {phone("parentPhone")}
                {text("telegram", t("fields.telegramPlaceholder"))}
                {text("school")}
                {text("address")}
                {text("passportSeries")}
              </div>
              {tags.length > 0 && (
                <FormField
                  control={form.control}
                  name="tagIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("fields.tags")}</FormLabel>
                      <TagPicker tags={tags} value={field.value} onChange={field.onChange} />
                    </FormItem>
                  )}
                />
              )}
              <FormError error={error} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  {tc("cancel")}
                </Button>
                <Button type="submit" disabled={pending}>
                  {tc("save")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function StudentArchiveButton({
  studentId,
  name,
  archived,
}: {
  studentId: string;
  name: string;
  archived: boolean;
}) {
  const t = useTranslations("students.profile");
  const tk = useTranslateKey();
  const { pending, run } = useServerAction();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() => {
        if (!archived && !window.confirm(t("archiveConfirm", { name }))) return;
        run(
          async () => {
            const r = await setStudentArchived(studentId, !archived);
            if (!r.ok) toast.error(tk(r.error));
            return r;
          },
          () => toast.success(archived ? t("unarchived") : t("archived")),
        );
      }}
    >
      {archived ? <ArchiveRestore /> : <Archive />}
      {archived ? t("unarchive") : t("archive")}
    </Button>
  );
}

/** Talaba rasmi (yopiq bucket, imzolangan havola) */
export function StudentPhoto({
  studentId,
  url,
  name,
  editable,
}: {
  studentId: string;
  url: string | null;
  name: string;
  editable: boolean;
}) {
  const t = useTranslations("students.profile");
  const tk = useTranslateKey();
  const input = useRef<HTMLInputElement>(null);
  const { pending, run } = useServerAction();

  const report = async (p: Promise<{ ok: boolean; error?: string }>) => {
    const r = await p;
    if (!r.ok && r.error) toast.error(tk(r.error));
    return undefined;
  };

  const avatar = url ? (
    // eslint-disable-next-line @next/next/no-img-element -- imzolangan vaqtinchalik havola
    <img src={url} alt={name} className="size-16 rounded-full object-cover" />
  ) : (
    <span className="flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
      <User className="size-7" />
    </span>
  );

  if (!editable) return avatar;
  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        data-testid="photo-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          const fd = new FormData();
          fd.set("studentId", studentId);
          fd.set("file", file);
          run(() => report(uploadStudentPhoto(fd)));
        }}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="group relative rounded-full disabled:opacity-60"
            aria-label={t("photo")}
            disabled={pending}
          >
            {avatar}
            <span className="absolute right-0 bottom-0 flex size-6 items-center justify-center rounded-full border bg-background shadow-sm">
              <Camera className="size-3.5" />
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={() => input.current?.click()}>
            <Camera />
            {t("uploadPhoto")}
          </DropdownMenuItem>
          {url && (
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => run(() => report(removeStudentPhoto(studentId)))}
            >
              <Trash2 />
              {t("removePhoto")}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
