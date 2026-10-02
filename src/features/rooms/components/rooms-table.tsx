"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { DoorOpen, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { FormError } from "@/components/form-error";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useServerAction } from "@/hooks/use-server-action";

import { deleteRoom, saveRoom } from "../actions";
import type { RoomRow } from "../queries";
import { type RoomValues, roomSchema } from "../schema";

export function RoomsTable({
  rooms,
  branches,
  defaultBranchId,
}: {
  rooms: RoomRow[];
  branches: { id: string; name: string }[];
  defaultBranchId: string | null;
}) {
  const t = useTranslations("settings.rooms");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RoomValues | null>(null);

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

      {rooms.length === 0 ? (
        <EmptyState icon={DoorOpen} title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("branch")}</TableHead>
                <TableHead className="text-right">{t("capacity")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rooms.map((r) => (
                <TableRow
                  key={r.id}
                  className="cursor-pointer"
                  onClick={() => {
                    setEditing({
                      id: r.id,
                      branchId: r.branch_id,
                      name: r.name,
                      capacity: r.capacity,
                    });
                    setOpen(true);
                  }}
                >
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-muted-foreground">{r.branch?.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.capacity ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <RoomDialog
        open={open}
        onOpenChange={setOpen}
        room={editing}
        branches={branches}
        defaultBranchId={defaultBranchId}
      />
    </div>
  );
}

function RoomDialog({
  open,
  onOpenChange,
  room,
  branches,
  defaultBranchId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: RoomValues | null;
  branches: { id: string; name: string }[];
  defaultBranchId: string | null;
}) {
  const t = useTranslations("settings.rooms");
  const tc = useTranslations("common");
  const empty: RoomValues = {
    branchId: defaultBranchId ?? branches[0]?.id ?? "",
    name: "",
    capacity: null,
  };
  const form = useForm<RoomValues>({ resolver: zodResolver(roomSchema), defaultValues: empty });
  const { error, setError, pending, run } = useServerAction(form);
  const del = useServerAction();

  useEffect(() => {
    if (open) {
      form.reset(room ?? empty);
      setError(null);
    }
    // empty har renderda yangi — faqat ochilganda qayta o'rnatamiz
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, room]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={tc("close")}>
        <DialogHeader>
          <DialogTitle>{room ? t("edit") : t("add")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            className="grid gap-4"
            onSubmit={form.handleSubmit((v) =>
              run(
                () => saveRoom(v),
                () => {
                  toast.success(tc("saved"));
                  onOpenChange(false);
                },
              ),
            )}
          >
            <FormField
              control={form.control}
              name="branchId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("branch")}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {branches.map((b) => (
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
            <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
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
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("capacity")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value === "" ? null : e.target.valueAsNumber)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormError error={error ?? del.error} />
            <DialogFooter className="sm:justify-between">
              {room?.id ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive"
                  disabled={del.pending}
                  onClick={() =>
                    del.run(
                      () => deleteRoom(room.id!),
                      () => {
                        toast.success(t("deleted"));
                        onOpenChange(false);
                      },
                    )
                  }
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
