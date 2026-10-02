"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Textarea } from "@/components/ui/textarea";
import { useServerAction } from "@/hooks/use-server-action";
import { formatDate } from "@/lib/dates";

import { saveLessonNotes } from "../actions";
import { type LessonNotesValues, lessonNotesSchema } from "../schema";

export function LessonNotesDialog({
  lesson,
  readOnly,
  onClose,
}: {
  lesson: {
    id: string;
    date: string;
    startTime: string;
    topic: string | null;
    homework: string | null;
  };
  readOnly: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("attendance.notes");
  const tc = useTranslations("common");
  const form = useForm<LessonNotesValues>({
    resolver: zodResolver(lessonNotesSchema),
    defaultValues: {
      lessonId: lesson.id,
      topic: lesson.topic ?? "",
      homework: lesson.homework ?? "",
    },
  });
  const { error, pending, run } = useServerAction(form);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent closeLabel={tc("close")}>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {formatDate(lesson.date)} · {lesson.startTime}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            className="grid gap-4"
            onSubmit={form.handleSubmit((v) =>
              run(
                () => saveLessonNotes(v),
                () => {
                  toast.success(tc("saved"));
                  onClose();
                },
              ),
            )}
          >
            <LessonNotesFields form={form} readOnly={readOnly} />
            <FormError error={error} />
            {!readOnly && (
              <DialogFooter>
                <Button type="submit" disabled={pending}>
                  {tc("save")}
                </Button>
              </DialogFooter>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function LessonNotesFields({
  form,
  readOnly,
}: {
  form: ReturnType<typeof useForm<LessonNotesValues>>;
  readOnly: boolean;
}) {
  const t = useTranslations("attendance.notes");
  return (
    <>
      <FormField
        control={form.control}
        name="topic"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("topic")}</FormLabel>
            <FormControl>
              <Input placeholder={t("topicPlaceholder")} readOnly={readOnly} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="homework"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("homework")}</FormLabel>
            <FormControl>
              <Textarea
                rows={3}
                placeholder={t("homeworkPlaceholder")}
                readOnly={readOnly}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
