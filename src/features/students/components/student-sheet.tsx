"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert, Plus, Trash2, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { type UseFormReturn, useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { DateInput } from "@/components/date-input";
import { FormError } from "@/components/form-error";
import { PhoneInput } from "@/components/phone-input";
import { TagBadge } from "@/components/tag-badge";
import { Button } from "@/components/ui/button";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useServerAction } from "@/hooks/use-server-action";
import { formatDate, todayInTashkent } from "@/lib/dates";
import { isValidPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

import { createStudent } from "../actions";
import { type StudentFormData, findStudentsByPhone, getStudentFormData } from "../form-data";
import { type StudentCreateValues, studentCreateSchema } from "../schema";
import { GroupMeta, GroupSearch } from "./group-search";

const NONE = "__none__";

/** "Maydon qo'shish" menyusidagi ixtiyoriy maydonlar */
const EXTRA_FIELDS = [
  "birthDate",
  "parent",
  "telegram",
  "address",
  "school",
  "passportSeries",
] as const;
type ExtraField = (typeof EXTRA_FIELDS)[number];

interface OpenOptions {
  groupId?: string;
}

const StudentSheetContext = createContext<{ open: (options?: OpenOptions) => void } | null>(null);

/** Talaba qo'shish paneli istalgan sahifadan ochiladi (header tugmasi, guruh sahifasi, ...). */
export function useStudentSheet() {
  return useContext(StudentSheetContext);
}

export function StudentSheetProvider({
  branchId,
  enabled,
  children,
}: {
  /** URL dagi filial ("all" bo'lishi mumkin) */
  branchId: string;
  /** students.create ruxsati */
  enabled: boolean;
  children: ReactNode;
}) {
  const [state, setState] = useState<{ open: boolean; groupId?: string; key: number }>({
    open: false,
    key: 0,
  });
  const open = useCallback(
    (options?: OpenOptions) =>
      setState((s) => ({ open: true, groupId: options?.groupId, key: s.key + 1 })),
    [],
  );
  const value = useMemo(() => (enabled ? { open } : null), [enabled, open]);

  return (
    <StudentSheetContext.Provider value={value}>
      {children}
      {enabled && (
        <StudentSheet
          key={state.key}
          open={state.open}
          onOpenChange={(o) => setState((s) => ({ ...s, open: o }))}
          branchId={branchId}
          groupId={state.groupId}
        />
      )}
    </StudentSheetContext.Provider>
  );
}

/** Header'dagi "+ Talaba" tugmasi */
export function AddStudentButton() {
  const sheet = useStudentSheet();
  const t = useTranslations("students");
  if (!sheet) return null;
  return (
    <Button size="sm" onClick={() => sheet.open()} data-testid="add-student">
      <Plus />
      <span className="max-sm:sr-only">{t("add")}</span>
    </Button>
  );
}

function StudentSheet({
  open,
  onOpenChange,
  branchId,
  groupId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  groupId?: string;
}) {
  const t = useTranslations("students.sheet");
  const tc = useTranslations("common");
  const [data, setData] = useState<StudentFormData | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!open || data) return;
    let cancelled = false;
    getStudentFormData().then((r) => {
      if (cancelled) return;
      if (r.ok) setData(r.data);
      else setLoadError(true);
    });
    return () => {
      cancelled = true;
    };
  }, [open, data]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        closeLabel={tc("close")}
        className="w-full gap-0 sm:max-w-lg"
        data-testid="student-sheet"
      >
        <SheetHeader className="border-b">
          <SheetTitle>{t("title")}</SheetTitle>
          <SheetDescription>{t("description")}</SheetDescription>
        </SheetHeader>
        {data ? (
          <StudentForm
            data={data}
            branchId={branchId}
            groupId={groupId}
            onDone={() => onOpenChange(false)}
          />
        ) : loadError ? (
          <div className="p-4">
            <FormError error="students.sheet.loadError" />
          </div>
        ) : (
          <div className="grid gap-4 p-4">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function StudentForm({
  data,
  branchId,
  groupId,
  onDone,
}: {
  data: StudentFormData;
  branchId: string;
  groupId?: string;
  onDone: () => void;
}) {
  const t = useTranslations("students");
  const tc = useTranslations("common");
  const router = useRouter();
  const today = formatDate(todayInTashkent());
  const preset = data.groups.find((g) => g.id === groupId);
  const defaultBranch =
    preset?.branchId ??
    (data.branches.some((b) => b.id === branchId) ? branchId : (data.branches[0]?.id ?? ""));

  const form = useForm<StudentCreateValues>({
    resolver: zodResolver(studentCreateSchema),
    defaultValues: {
      branchId: defaultBranch,
      joinedAt: today,
      tagIds: [],
      enrollments: preset ? [{ groupId: preset.id, status: "trial", date: today }] : [],
      fullName: "",
      phone: "",
      gender: "",
      birthDate: "",
      parentName: "",
      parentPhone: "",
      telegram: "",
      address: "",
      school: "",
      passportSeries: "",
    },
  });
  const { error, pending, run } = useServerAction(form);
  const enrollments = useFieldArray({ control: form.control, name: "enrollments" });
  const [extra, setExtra] = useState<ExtraField[]>([]);
  const [picking, setPicking] = useState(false);

  const selectedIds = useWatch({ control: form.control, name: "enrollments" }).map(
    (e) => e.groupId,
  );
  const groupsById = useMemo(() => new Map(data.groups.map((g) => [g.id, g])), [data.groups]);

  function removeExtra(field: ExtraField) {
    setExtra((list) => list.filter((f) => f !== field));
    const reset: Record<ExtraField, (keyof StudentCreateValues)[]> = {
      birthDate: ["birthDate"],
      parent: ["parentName", "parentPhone"],
      telegram: ["telegram"],
      address: ["address"],
      school: ["school"],
      passportSeries: ["passportSeries"],
    };
    for (const name of reset[field]) form.setValue(name, "");
  }

  return (
    <Form {...form}>
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={form.handleSubmit((v) =>
          run(
            () => createStudent(v),
            ({ studentId }) => {
              const href = `/${branchId}/students/${studentId}`;
              toast.success(t("sheet.created"), {
                action: { label: t("sheet.openProfile"), onClick: () => router.push(href) },
              });
              onDone();
              router.refresh();
            },
          ),
        )}
      >
        <div className="grid flex-1 content-start gap-4 overflow-y-auto p-4">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("fields.fullName")}</FormLabel>
                <FormControl>
                  <Input autoFocus placeholder={t("fields.fullNamePlaceholder")} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("fields.phone")}</FormLabel>
                <FormControl>
                  <PhoneInput {...field} />
                </FormControl>
                <FormMessage />
                <DuplicatePhoneWarning phone={field.value} branchId={branchId} />
              </FormItem>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
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
              name="joinedAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.joinedAt")}</FormLabel>
                  <FormControl>
                    <DateInput {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {data.branches.length > 1 && (
            <FormField
              control={form.control}
              name="branchId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.branch")}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {data.branches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <TagsField form={form} tags={data.tags} />

          <ExtraFields form={form} shown={extra} onRemove={removeExtra} />

          {extra.length < EXTRA_FIELDS.length && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="justify-self-start">
                  <Plus />
                  {t("sheet.addField")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {EXTRA_FIELDS.filter((f) => !extra.includes(f)).map((f) => (
                  <DropdownMenuItem key={f} onSelect={() => setExtra((list) => [...list, f])}>
                    {t(`fields.${f}`)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <section className="grid gap-3 border-t pt-4" aria-labelledby="enroll-title">
            <div>
              <h3 id="enroll-title" className="text-sm font-medium">
                {t("sheet.groupsTitle")}
              </h3>
              <p className="text-xs text-muted-foreground">{t("sheet.groupsHint")}</p>
            </div>

            {enrollments.fields.map((item, index) => {
              const group = groupsById.get(item.groupId);
              return (
                <div
                  key={item.id}
                  className="grid gap-3 rounded-md border p-3"
                  data-testid="enrollment-card"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="grid gap-0.5">
                      <span className="text-sm font-medium">{group?.name}</span>
                      {group && <GroupMeta group={group} />}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      aria-label={tc("remove")}
                      onClick={() => enrollments.remove(index)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name={`enrollments.${index}.status`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">{t("sheet.status")}</FormLabel>
                          <div
                            className="grid grid-cols-2 rounded-md border p-0.5"
                            role="radiogroup"
                          >
                            {(["trial", "active"] as const).map((s) => (
                              <button
                                key={s}
                                type="button"
                                role="radio"
                                aria-checked={field.value === s}
                                className={cn(
                                  "rounded px-2 py-1 text-sm transition-colors",
                                  field.value === s
                                    ? "bg-primary text-primary-foreground"
                                    : "hover:bg-accent",
                                )}
                                onClick={() => field.onChange(s)}
                              >
                                {t(`enrollmentStatuses.${s}`)}
                              </button>
                            ))}
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`enrollments.${index}.date`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">{t("sheet.startDate")}</FormLabel>
                          <FormControl>
                            <DateInput {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              );
            })}
            {form.formState.errors.enrollments?.root?.message && (
              <FormError error={form.formState.errors.enrollments.root.message} />
            )}

            {picking ? (
              <div className="grid gap-2">
                <GroupSearch
                  groups={data.groups}
                  excludeIds={selectedIds}
                  branchId={form.getValues("branchId")}
                  onPick={(g) => {
                    enrollments.append({
                      groupId: g.id,
                      status: "trial",
                      date: form.getValues("joinedAt") || today,
                    });
                    setPicking(false);
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="justify-self-start"
                  onClick={() => setPicking(false)}
                >
                  {tc("cancel")}
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="justify-self-start"
                onClick={() => setPicking(true)}
              >
                <UserPlus />
                {t("enrollments.add")}
              </Button>
            )}
          </section>

          <FormError error={error} />
        </div>
        <div className="flex justify-end gap-2 border-t p-4">
          <Button type="button" variant="outline" onClick={onDone}>
            {tc("cancel")}
          </Button>
          <Button type="submit" disabled={pending}>
            {tc("save")}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function TagsField({
  form,
  tags,
}: {
  form: UseFormReturn<StudentCreateValues>;
  tags: StudentFormData["tags"];
}) {
  const t = useTranslations("students");
  return (
    <FormField
      control={form.control}
      name="tagIds"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t("fields.tags")}</FormLabel>
          {tags.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("sheet.noTags")}</p>
          ) : (
            <TagPicker tags={tags} value={field.value} onChange={field.onChange} />
          )}
        </FormItem>
      )}
    />
  );
}

/** Teglarni bosib tanlash (profil tahririda ham ishlatiladi) */
export function TagPicker({
  tags,
  value,
  onChange,
}: {
  tags: readonly { id: string; name: string; color: string | null }[];
  value: string[];
  onChange: (value: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => {
        const on = value.includes(tag.id);
        return (
          <button
            key={tag.id}
            type="button"
            aria-pressed={on}
            className={cn("rounded-full transition-opacity", !on && "opacity-45 hover:opacity-80")}
            onClick={() => onChange(on ? value.filter((v) => v !== tag.id) : [...value, tag.id])}
          >
            <TagBadge name={tag.name} color={tag.color} />
          </button>
        );
      })}
    </div>
  );
}

function ExtraFields({
  form,
  shown,
  onRemove,
}: {
  form: UseFormReturn<StudentCreateValues>;
  shown: ExtraField[];
  onRemove: (field: ExtraField) => void;
}) {
  const t = useTranslations("students");
  const removeButton = (f: ExtraField) => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-6"
      aria-label={t("sheet.removeField")}
      onClick={() => onRemove(f)}
    >
      <X />
    </Button>
  );
  const text = (
    f: ExtraField,
    name: "telegram" | "address" | "school" | "passportSeries",
    placeholder?: string,
  ) => (
    <FormField
      key={f}
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <div className="flex items-center justify-between">
            <FormLabel>{t(`fields.${name}`)}</FormLabel>
            {removeButton(f)}
          </div>
          <FormControl>
            <Input autoFocus placeholder={placeholder} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return shown.map((f) => {
    switch (f) {
      case "birthDate":
        return (
          <FormField
            key={f}
            control={form.control}
            name="birthDate"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>{t("fields.birthDate")}</FormLabel>
                  {removeButton(f)}
                </div>
                <FormControl>
                  <DateInput autoFocus {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      case "parent":
        return (
          <div key={f} className="grid gap-2 rounded-md border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t("fields.parent")}</span>
              {removeButton(f)}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="parentName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">{t("fields.parentName")}</FormLabel>
                    <FormControl>
                      <Input autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="parentPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">{t("fields.parentPhone")}</FormLabel>
                    <FormControl>
                      <PhoneInput {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        );
      case "telegram":
        return text(f, "telegram", t("fields.telegramPlaceholder"));
      default:
        return text(f, f);
    }
  });
}

/** CLAUDE.md qoida 8: bir xil telefonli talaba bo'lsa — ogohlantirish, baribir saqlash mumkin. */
export function DuplicatePhoneWarning({
  phone,
  branchId,
  excludeId,
}: {
  phone: string;
  branchId: string;
  excludeId?: string;
}) {
  const t = useTranslations("students.sheet");
  const [matches, setMatches] = useState<{ id: string; fullName: string }[]>([]);
  const valid = isValidPhone(phone);

  useEffect(() => {
    if (!valid) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      findStudentsByPhone(phone).then((r) => {
        if (!cancelled && r.ok) setMatches(r.data.filter((s) => s.id !== excludeId));
      });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [phone, valid, excludeId]);

  if (!valid || matches.length === 0) return null;
  return (
    <div
      role="status"
      data-testid="duplicate-phone"
      className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300"
    >
      <CircleAlert className="mt-0.5 size-4 shrink-0" />
      <div className="grid gap-0.5">
        {matches.map((s) => (
          <span key={s.id}>
            {t("duplicatePhone", { name: s.fullName })} —{" "}
            <Link
              href={`/${branchId}/students/${s.id}`}
              className="font-medium underline"
              target="_blank"
            >
              {t("open")}
            </Link>
          </span>
        ))}
        <span className="text-xs opacity-80">{t("saveAnyway")}</span>
      </div>
    </div>
  );
}
