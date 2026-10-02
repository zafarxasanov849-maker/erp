import { History } from "lucide-react";
import { useTranslations } from "next-intl";

import { EmptyState } from "@/components/empty-state";
import { formatDateTime } from "@/lib/dates";

import type { HistoryItem } from "../history";

export function HistoryList({ items }: { items: HistoryItem[] }) {
  const t = useTranslations("students.history");
  if (items.length === 0) {
    return (
      <EmptyState icon={History} title={t("emptyTitle")} description={t("emptyDescription")} />
    );
  }
  return (
    <ol className="grid gap-0 border-l pl-4" data-testid="history">
      {items.map((item) => (
        <li key={item.id} className="relative grid gap-1 pb-4" data-testid="history-item">
          <span className="absolute top-1.5 -left-[21px] size-2.5 rounded-full border-2 border-background bg-primary" />
          <div className="text-sm">
            <span className="font-medium">{t(`actions.${item.action}` as "actions.other")}</span>
            {item.subject && <span>: {item.subject}</span>}
          </div>
          {item.changes.length > 0 && (
            <ul className="grid gap-0.5 text-sm text-muted-foreground">
              {item.changes.map((c) => (
                <li key={c.field}>
                  {t.has(`fields.${c.field}` as "fields.full_name")
                    ? t(`fields.${c.field}` as "fields.full_name")
                    : c.field}
                  : {c.from !== null && <span className="line-through">{c.from}</span>}
                  {c.from !== null && " → "}
                  <span className="text-foreground">{c.to ?? "—"}</span>
                </li>
              ))}
            </ul>
          )}
          <span className="text-xs text-muted-foreground">
            {formatDateTime(item.createdAt)} · {item.actorName ?? t("system")}
          </span>
        </li>
      ))}
    </ol>
  );
}
