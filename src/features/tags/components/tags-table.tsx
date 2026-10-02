"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Tags, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { FormError } from "@/components/form-error";
import { TagBadge } from "@/components/tag-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useServerAction } from "@/hooks/use-server-action";
import { cn } from "@/lib/utils";

import { deleteTag, saveTag } from "../actions";
import type { TagRow } from "../queries";
import { TAG_COLORS, type TagValues, tagSchema } from "../schema";

export function TagsTable({ tags }: { tags: TagRow[] }) {
  const t = useTranslations("settings.tags");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TagValues | null>(null);

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{t("description")}</p>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus />
          {t("add")}
        </Button>
      </div>
      {tags.length === 0 ? (
        <EmptyState icon={Tags} title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("name")}</TableHead>
                <TableHead className="text-right">{t("students")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tags.map((tag) => (
                <TableRow
                  key={tag.id}
                  className="cursor-pointer"
                  onClick={() => {
                    setEditing({ id: tag.id, name: tag.name, color: tag.color ?? TAG_COLORS[0] });
                    setOpen(true);
                  }}
                >
                  <TableCell>
                    <TagBadge name={tag.name} color={tag.color} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{tag.studentCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <TagDialog open={open} onOpenChange={setOpen} tag={editing} />
    </div>
  );
}

function TagDialog({
  open,
  onOpenChange,
  tag,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tag: TagValues | null;
}) {
  const t = useTranslations("settings.tags");
  const tc = useTranslations("common");
  const empty: TagValues = { name: "", color: TAG_COLORS[6] };
  const form = useForm<TagValues>({ resolver: zodResolver(tagSchema), defaultValues: empty });
  const { error, setError, pending, run } = useServerAction(form);
  const del = useServerAction();

  useEffect(() => {
    if (open) {
      form.reset(tag ?? empty);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tag]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={tc("close")}>
        <DialogHeader>
          <DialogTitle>{tag ? t("edit") : t("add")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            className="grid gap-4"
            onSubmit={form.handleSubmit((v) =>
              run(
                () => saveTag(v),
                () => {
                  toast.success(tc("saved"));
                  onOpenChange(false);
                },
              ),
            )}
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("name")}</FormLabel>
                  <FormControl>
                    <Input autoFocus placeholder={t("namePlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("color")}</FormLabel>
                  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("color")}>
                    {TAG_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        role="radio"
                        aria-checked={field.value === c}
                        aria-label={c}
                        onClick={() => field.onChange(c)}
                        className={cn(
                          "size-7 rounded-full border-2 border-transparent",
                          field.value === c && "ring-2 ring-ring ring-offset-2",
                        )}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormError error={error ?? del.error} />
            <DialogFooter className="sm:justify-between">
              {tag?.id ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive"
                  disabled={del.pending}
                  onClick={() => {
                    if (!window.confirm(t("deleteConfirm", { name: tag.name }))) return;
                    del.run(
                      () => deleteTag(tag.id!),
                      () => {
                        toast.success(t("deleted"));
                        onOpenChange(false);
                      },
                    );
                  }}
                >
                  <Trash2 />
                  {tc("delete")}
                </Button>
              ) : (
                <span />
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  {tc("cancel")}
                </Button>
                <Button type="submit" disabled={pending}>
                  {tc("save")}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
