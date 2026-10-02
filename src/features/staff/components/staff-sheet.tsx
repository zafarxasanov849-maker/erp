"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Copy, KeyRound, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { type Control, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { FormError } from "@/components/form-error";
import { PhoneInput } from "@/components/phone-input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
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
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useServerAction } from "@/hooks/use-server-action";
import { generateTempPassword } from "@/lib/password";
import { formatPhone } from "@/lib/phone";

import { addStaff, updateStaff } from "../actions";
import type { StaffRow } from "../queries";
import {
  type StaffCreateValues,
  type StaffUpdateValues,
  staffCreateSchema,
  staffUpdateSchema,
} from "../schema";

export interface StaffOptions {
  roles: { id: string; name: string }[];
  branches: { id: string; name: string }[];
  canGrantAllBranches: boolean;
}

type AccessFields = Pick<StaffCreateValues, "roleId" | "isTeacher" | "allBranches" | "branchIds">;

export function StaffSheet({
  open,
  onOpenChange,
  staff,
  options,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null — yangi xodim */
  staff: StaffRow | null;
  options: StaffOptions;
}) {
  const t = useTranslations("settings.staff");
  const tc = useTranslations("common");
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md" closeLabel={tc("close")}>
        <SheetHeader>
          <SheetTitle>{staff ? staff.fullName : t("add")}</SheetTitle>
          {staff?.phone && <SheetDescription>{formatPhone(staff.phone)}</SheetDescription>}
        </SheetHeader>
        {open &&
          (staff ? (
            <EditStaffForm staff={staff} options={options} onDone={() => onOpenChange(false)} />
          ) : (
            <CreateStaffForm options={options} onDone={() => onOpenChange(false)} />
          ))}
      </SheetContent>
    </Sheet>
  );
}

function CreateStaffForm({ options, onDone }: { options: StaffOptions; onDone: () => void }) {
  const t = useTranslations("settings.staff");
  const tc = useTranslations("common");
  const form = useForm<StaffCreateValues>({
    resolver: zodResolver(staffCreateSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      tempPassword: generateTempPassword(),
      roleId: "",
      isTeacher: false,
      allBranches: false,
      branchIds: options.branches.length === 1 ? [options.branches[0]!.id] : [],
    },
  });
  const { error, pending, run } = useServerAction(form);
  const [credentials, setCredentials] = useState<{ phone: string; password: string } | null>(null);
  const [existing, setExisting] = useState(false);

  if (credentials) {
    return (
      <div className="grid gap-4 px-4">
        {existing ? (
          <p className="text-sm">{t("addedExisting")}</p>
        ) : (
          <>
            <p className="text-sm">{t("addedNew")}</p>
            <div className="grid gap-1 rounded-md bg-muted p-3 font-mono text-sm">
              <span>{formatPhone(credentials.phone)}</span>
              <span data-testid="temp-password">{credentials.password}</span>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void navigator.clipboard?.writeText(
                  `${formatPhone(credentials.phone)}\n${credentials.password}`,
                );
                toast.success(tc("copied"));
              }}
            >
              <Copy />
              {tc("copy")}
            </Button>
          </>
        )}
        <Button onClick={onDone}>{tc("done")}</Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        className="grid gap-4 px-4"
        onSubmit={form.handleSubmit((v) =>
          run(
            () => addStaff(v),
            (data) => {
              setExisting(data.existingUser);
              setCredentials({
                phone: `+998${v.phone.replace(/\D/g, "")}`,
                password: v.tempPassword,
              });
            },
          ),
        )}
      >
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("fullName")}</FormLabel>
              <FormControl>
                <Input autoFocus {...field} />
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
              <FormLabel>{t("phone")}</FormLabel>
              <FormControl>
                <PhoneInput {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <AccessFields
          control={form.control as unknown as Control<AccessFields>}
          options={options}
        />
        <FormField
          control={form.control}
          name="tempPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("tempPassword")}</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input className="font-mono" autoComplete="off" {...field} />
                </FormControl>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={t("regenerate")}
                  onClick={() => form.setValue("tempPassword", generateTempPassword())}
                >
                  <RefreshCw />
                </Button>
              </div>
              <FormDescription>
                <KeyRound className="mr-1 inline size-3" />
                {t("tempPasswordHint")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormError error={error} />
        <SheetFooter className="px-0">
          <Button type="submit" disabled={pending}>
            {t("add")}
          </Button>
        </SheetFooter>
      </form>
    </Form>
  );
}

function EditStaffForm({
  staff,
  options,
  onDone,
}: {
  staff: StaffRow;
  options: StaffOptions;
  onDone: () => void;
}) {
  const t = useTranslations("settings.staff");
  const tc = useTranslations("common");
  const form = useForm<StaffUpdateValues>({
    resolver: zodResolver(staffUpdateSchema),
    defaultValues: {
      id: staff.id,
      roleId: staff.roleId,
      isTeacher: staff.isTeacher,
      allBranches: staff.allBranches,
      branchIds: staff.branchIds,
      isActive: staff.isActive,
    },
  });
  const { error, pending, run } = useServerAction(form);
  // Hozirgi rol tanlov ro'yxatida bo'lmasa ham (bera olmaydigan rol) ko'rinsin
  const roles = options.roles.some((r) => r.id === staff.roleId)
    ? options.roles
    : [{ id: staff.roleId, name: staff.roleName }, ...options.roles];

  return (
    <Form {...form}>
      <form
        className="grid gap-4 px-4"
        onSubmit={form.handleSubmit((v) =>
          run(
            () => updateStaff(v),
            () => {
              toast.success(tc("saved"));
              onDone();
            },
          ),
        )}
      >
        <AccessFields
          control={form.control as unknown as Control<AccessFields>}
          options={{ ...options, roles }}
          allBranchesLocked={!options.canGrantAllBranches && !staff.allBranches}
        />
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between gap-4 rounded-md border p-3">
              <div className="grid gap-1">
                <FormLabel>{t("active")}</FormLabel>
                <FormDescription>{t("activeHint")}</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormError error={error} />
        <SheetFooter className="px-0">
          <Button type="submit" disabled={pending || !form.formState.isDirty}>
            {tc("save")}
          </Button>
        </SheetFooter>
      </form>
    </Form>
  );
}

function AccessFields({
  control,
  options,
  allBranchesLocked,
}: {
  control: Control<AccessFields>;
  options: StaffOptions;
  allBranchesLocked?: boolean;
}) {
  const t = useTranslations("settings.staff");
  const allBranches = useWatch({ control, name: "allBranches" });

  return (
    <>
      <FormField
        control={control}
        name="roleId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("role")}</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("rolePlaceholder")} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {options.roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="isTeacher"
        render={({ field }) => (
          <FormItem className="flex items-center gap-2">
            <FormControl>
              <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />
            </FormControl>
            <FormLabel className="font-normal">{t("isTeacher")}</FormLabel>
          </FormItem>
        )}
      />
      {(options.canGrantAllBranches || !allBranchesLocked) && (
        <FormField
          control={control}
          name="allBranches"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between gap-4 rounded-md border p-3">
              <div className="grid gap-1">
                <FormLabel>{t("allBranches")}</FormLabel>
                <FormDescription>{t("allBranchesHint")}</FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  disabled={!options.canGrantAllBranches && !field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
      )}
      {!allBranches && (
        <FormField
          control={control}
          name="branchIds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("branches")}</FormLabel>
              <div className="grid gap-2 rounded-md border p-3">
                {options.branches.map((b) => {
                  const id = `staff-branch-${b.id}`;
                  return (
                    <div key={b.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        id={id}
                        checked={field.value.includes(b.id)}
                        onCheckedChange={(v) =>
                          field.onChange(
                            v === true
                              ? [...field.value, b.id]
                              : field.value.filter((x) => x !== b.id),
                          )
                        }
                      />
                      <label htmlFor={id} className="cursor-pointer">
                        {b.name}
                      </label>
                    </div>
                  );
                })}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </>
  );
}
