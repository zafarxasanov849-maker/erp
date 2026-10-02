"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MessageSquareText, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useServerAction } from "@/hooks/use-server-action";
import { useTranslateKey } from "@/i18n/use-translate-key";
import { formatDateTime } from "@/lib/dates";

import { addNote, deleteNote } from "../actions";
import type { NoteRow } from "../profile";
import { type NoteValues, noteSchema } from "../schema";

export function NotesPanel({
  studentId,
  notes,
  canAdd,
  staffId,
}: {
  studentId: string;
  notes: NoteRow[];
  canAdd: boolean;
  /** Joriy xodim — faqat o'z izohini o'chira oladi */
  staffId: string | null;
}) {
  const t = useTranslations("students.notes");
  const tc = useTranslations("common");
  const tk = useTranslateKey();
  const form = useForm<NoteValues>({
    resolver: zodResolver(noteSchema),
    defaultValues: { studentId, body: "" },
  });
  const { error, pending, run } = useServerAction(form);
  const del = useServerAction();

  return (
    <div className="grid gap-4">
      {canAdd && (
        <Form {...form}>
          <form
            className="grid gap-2"
            onSubmit={form.handleSubmit((v) =>
              run(
                () => addNote(v),
                () => form.reset({ studentId, body: "" }),
              ),
            )}
          >
            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea rows={3} placeholder={t("placeholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormError error={error} />
            <Button type="submit" size="sm" className="justify-self-end" disabled={pending}>
              {t("add")}
            </Button>
          </form>
        </Form>
      )}

      {notes.length === 0 ? (
        <EmptyState
          icon={MessageSquareText}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      ) : (
        <ul className="grid gap-2">
          {notes.map((n) => (
            <li key={n.id} className="grid gap-1 rounded-lg border p-3" data-testid="note">
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  {n.authorName ?? "—"} · {formatDateTime(n.createdAt)}
                </span>
                {staffId && n.createdBy === staffId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    aria-label={tc("delete")}
                    disabled={del.pending}
                    onClick={() => {
                      if (!window.confirm(t("deleteConfirm"))) return;
                      del.run(async () => {
                        const r = await deleteNote(n.id);
                        if (!r.ok) toast.error(tk(r.error));
                        return undefined;
                      });
                    }}
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
              <p className="text-sm whitespace-pre-wrap">{n.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
