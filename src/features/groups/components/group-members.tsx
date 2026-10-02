import { Users } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { EmptyState } from "@/components/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EnrollmentStatusBadge } from "@/features/students/components/status-badge";
import { formatDate } from "@/lib/dates";
import { formatPhone } from "@/lib/phone";

import type { GroupMember } from "../queries";

export function GroupMembers({
  members,
  branchPath,
  action,
}: {
  members: GroupMember[];
  branchPath: string;
  action?: React.ReactNode;
}) {
  const t = useTranslations("groups.members");
  if (members.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title={t("emptyTitle")}
        description={t("emptyDescription")}
        action={action}
      />
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3">
      {action && <div>{action}</div>}
      <div className="min-w-0 rounded-lg border" data-testid="group-members">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("name")}</TableHead>
              <TableHead>{t("phone")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead>{t("since")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => (
              <TableRow key={m.id} className={m.status === "left" ? "opacity-60" : undefined}>
                <TableCell>
                  <Link
                    href={`${branchPath}/students/${m.student.id}`}
                    className="font-medium hover:underline"
                  >
                    {m.student.full_name}
                  </Link>
                </TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">
                  {formatPhone(m.student.phone)}
                </TableCell>
                <TableCell>
                  <EnrollmentStatusBadge status={m.status} />
                </TableCell>
                <TableCell className="tabular-nums">
                  {formatDate(
                    m.status === "left" && m.left_at ? m.left_at : (m.activated_at ?? m.joined_at),
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
