"use client";

import {
  type ColumnVisibilityState,
  type RowSelectionState,
  columnVisibilityFeature,
  createColumnHelper,
  rowSelectionFeature,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Download,
  MessageSquare,
  Tag,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQueryStates } from "nuqs";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { TagBadge } from "@/components/tag-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaymentButton } from "@/features/billing/components/payment-dialog";
import { MoneyAmount } from "@/features/billing/components/student-ledger";
import { formatWeekdays } from "@/features/groups/format";
import { useTranslateKey } from "@/i18n/use-translate-key";
import { formatDate } from "@/lib/dates";
import { formatPhone } from "@/lib/phone";
import type { Weekday } from "@/lib/schedule";
import { cn } from "@/lib/utils";

import { addTagToStudents } from "../actions";
import { exportStudents } from "../export";
import { XLSX_TYPE, downloadBase64 } from "@/lib/download";
import type { StudentListRow } from "../queries";
import { type StudentSort, studentSearchParams } from "../search-params";
import { EnrollmentStatusBadge, StudentStatusBadge } from "./status-badge";

const features = tableFeatures({ rowSelectionFeature, columnVisibilityFeature });
const helper = createColumnHelper<typeof features, StudentListRow>();

const HIDEABLE = [
  "phone",
  "groups",
  "status",
  "tags",
  "branch",
  "joinedAt",
  "balance",
  "oldDebt",
  "parentPhone",
] as const;
const DEFAULT_HIDDEN: ColumnVisibilityState = { parentPhone: false, oldDebt: false };
const STORAGE_KEY = "students.columns";

export function StudentsTable({
  rows,
  total,
  page,
  pages,
  branchId,
  branchNames,
  tags,
  canExport,
  canUpdate,
  canSeeMoney,
  canPay,
}: {
  rows: StudentListRow[];
  total: number;
  page: number;
  pages: number;
  branchId: string;
  /** Faqat "Barcha filiallar" rejimida — filial ustuni */
  branchNames: Record<string, string> | null;
  tags: { id: string; name: string; color: string | null }[];
  canExport: boolean;
  canUpdate: boolean;
  /** payments.view — Balans ustunlari */
  canSeeMoney: boolean;
  /** payments.create — qatorda "To'lov" tugmasi */
  canPay: boolean;
}) {
  const t = useTranslations("students");
  const tw = useTranslations("weekdays");
  const tk = useTranslateKey();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [params, setParams] = useQueryStates(studentSearchParams, {
    shallow: false,
    startTransition,
  });
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>(DEFAULT_HIDDEN);
  const [busy, setBusy] = useState(false);

  // Ustunlar tanlovi shu brauzerda eslab qolinadi
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setColumnVisibility(JSON.parse(saved) as ColumnVisibilityState);
    } catch {
      // localStorage yo'q — default
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(columnVisibility));
    } catch {
      // e'tiborsiz
    }
  }, [columnVisibility]);

  // Sahifa yoki filtr o'zgarsa tanlov tozalanadi
  useEffect(() => setRowSelection({}), [rows]);

  const sortHeader = (key: StudentSort, label: string) => {
    const active = params.sort === key;
    const Icon = !active ? ArrowUpDown : params.dir === "asc" ? ArrowUp : ArrowDown;
    return (
      <button
        type="button"
        className="inline-flex items-center gap-1 hover:text-foreground"
        onClick={() =>
          void setParams({
            sort: key,
            dir: active && params.dir === "asc" ? "desc" : "asc",
            page: null,
          })
        }
      >
        {label}
        <Icon className={cn("size-3.5", !active && "opacity-40")} />
      </button>
    );
  };

  const columns = useMemo(
    () =>
      helper.columns([
        helper.display({
          id: "select",
          enableHiding: false,
          header: ({ table }) => (
            <Checkbox
              aria-label={t("list.selectAll")}
              checked={
                table.getIsAllPageRowsSelected()
                  ? true
                  : table.getIsSomePageRowsSelected()
                    ? "indeterminate"
                    : false
              }
              onCheckedChange={(v) => table.toggleAllPageRowsSelected(v === true)}
            />
          ),
          cell: ({ row }) => (
            <Checkbox
              aria-label={t("list.selectRow")}
              checked={row.getIsSelected()}
              onCheckedChange={(v) => row.toggleSelected(v === true)}
            />
          ),
        }),
        helper.accessor("fullName", {
          id: "name",
          enableHiding: false,
          header: () => sortHeader("name", t("list.name")),
          cell: ({ row }) => (
            <Link
              href={`/${branchId}/students/${row.original.id}`}
              className="font-medium hover:underline"
            >
              {row.original.fullName}
            </Link>
          ),
        }),
        helper.accessor("phone", {
          id: "phone",
          header: () => t("list.phone"),
          cell: ({ getValue }) => (
            <span className="whitespace-nowrap tabular-nums">{formatPhone(getValue())}</span>
          ),
        }),
        helper.accessor("groups", {
          id: "groups",
          header: () => t("list.groups"),
          cell: ({ getValue }) => (
            <div className="grid gap-1">
              {getValue().map((g) => (
                <div key={g.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-sm">{g.name}</span>
                  {g.status !== "active" && <EnrollmentStatusBadge status={g.status} />}
                  <span className="w-full text-xs text-muted-foreground">
                    {[
                      g.courseName,
                      g.teacherName,
                      formatWeekdays(g.weekdays, (d) => tw(`short.${d as Weekday}`)),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
              ))}
            </div>
          ),
        }),
        helper.accessor("status", {
          id: "status",
          header: () => t("list.status"),
          cell: ({ getValue }) => <StudentStatusBadge status={getValue()} />,
        }),
        helper.accessor("tags", {
          id: "tags",
          header: () => t("list.tags"),
          cell: ({ getValue }) => (
            <div className="flex flex-wrap gap-1">
              {getValue().map((tag) => (
                <TagBadge key={tag.id} name={tag.name} color={tag.color} />
              ))}
            </div>
          ),
        }),
        helper.accessor("branchId", {
          id: "branch",
          header: () => t("list.branch"),
          cell: ({ getValue }) => branchNames?.[getValue()] ?? "",
        }),
        helper.accessor("joinedAt", {
          id: "joinedAt",
          header: () => sortHeader("joined", t("list.joinedAt")),
          cell: ({ getValue }) => <span className="tabular-nums">{formatDate(getValue())}</span>,
        }),
        helper.accessor("balance", {
          id: "balance",
          header: () => sortHeader("balance", t("list.balance")),
          cell: ({ getValue }) => <MoneyAmount value={getValue()} />,
        }),
        helper.accessor("oldDebt", {
          id: "oldDebt",
          header: () => t("list.oldDebt"),
          cell: ({ getValue }) => <MoneyAmount value={getValue()} />,
        }),
        helper.display({
          id: "pay",
          enableHiding: false,
          header: () => <span className="sr-only">{t("list.pay")}</span>,
          cell: ({ row }) => (
            <PaymentButton
              studentId={row.original.id}
              label={t("list.pay")}
              variant="ghost"
              iconOnly
            />
          ),
        }),
        helper.accessor("parentPhone", {
          id: "parentPhone",
          header: () => t("list.parentPhone"),
          cell: ({ getValue }) => {
            const v = getValue();
            return v ? (
              <span className="whitespace-nowrap tabular-nums">{formatPhone(v)}</span>
            ) : (
              ""
            );
          },
        }),
      ]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [branchId, branchNames, params.sort, params.dir, t, tw],
  );

  const table = useTable({
    features,
    columns,
    data: rows,
    getRowId: (r) => r.id,
    enableRowSelection: canUpdate,
    state: {
      rowSelection,
      columnVisibility: {
        ...columnVisibility,
        ...(branchNames ? {} : { branch: false }),
        ...(canSeeMoney ? {} : { balance: false, oldDebt: false }),
        ...(canPay ? {} : { pay: false }),
        ...(canUpdate ? {} : { select: false }),
      },
    },
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
  });

  const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);

  function addTag(tagId: string) {
    setBusy(true);
    addTagToStudents(selectedIds, tagId).then((r) => {
      setBusy(false);
      if (!r.ok) {
        toast.error(tk(r.error));
        return;
      }
      toast.success(t("list.tagAdded"));
      setRowSelection({});
      router.refresh();
    });
  }

  function exportXlsx() {
    setBusy(true);
    exportStudents(branchId, window.location.search).then((r) => {
      setBusy(false);
      if (!r.ok) {
        toast.error(tk(r.error));
        return;
      }
      downloadBase64(r.data.fileName, r.data.base64, XLSX_TYPE);
    });
  }

  const hideable = HIDEABLE.filter(
    (id) =>
      (id !== "branch" || branchNames) && ((id !== "balance" && id !== "oldDebt") || canSeeMoney),
  );

  return (
    <div className="grid grid-cols-1 gap-3">
      <div className="flex min-h-8 flex-wrap items-center justify-between gap-2">
        {selectedIds.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2" data-testid="bulk-bar">
            <span className="text-sm font-medium">
              {t("list.selected", { count: selectedIds.length })}
            </span>
            {tags.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={busy}>
                    <Tag />
                    {t("list.addTag")}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {tags.map((tag) => (
                    <DropdownMenuItem key={tag.id} onSelect={() => addTag(tag.id)}>
                      <TagBadge name={tag.name} color={tag.color} />
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button variant="outline" size="sm" disabled title={t("list.smsSoon")}>
              <MessageSquare />
              {t("list.sendSms")}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setRowSelection({})}>
              {t("list.clearSelection")}
            </Button>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground" data-testid="students-total">
            {t("list.total", { count: total })}
          </span>
        )}
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Columns3 />
                <span className="max-sm:sr-only">{t("list.columns")}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {hideable.map((id) => (
                <DropdownMenuCheckboxItem
                  key={id}
                  checked={columnVisibility[id] !== false}
                  onCheckedChange={(v) => setColumnVisibility((s) => ({ ...s, [id]: v === true }))}
                  onSelect={(e) => e.preventDefault()}
                >
                  {t(`list.${id}`)}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {canExport && (
            <Button variant="outline" size="sm" onClick={exportXlsx} disabled={busy}>
              <Download />
              {t("list.export")}
            </Button>
          )}
        </div>
      </div>

      <div
        className={cn("min-w-0 rounded-lg border transition-opacity", pending && "opacity-60")}
        data-testid="students-table"
      >
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(header.column.id === "select" && "w-10")}
                  >
                    {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} data-state={row.getIsSelected() ? "selected" : undefined}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="align-top">
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || pending}
            onClick={() => void setParams({ page: page - 1 <= 1 ? null : page - 1 })}
          >
            <ChevronLeft />
            {t("list.prev")}
          </Button>
          <span className="text-sm tabular-nums">{t("list.page", { page, pages })}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pages || pending}
            onClick={() => void setParams({ page: page + 1 })}
          >
            {t("list.next")}
            <ChevronRight />
          </Button>
        </div>
      )}
    </div>
  );
}
