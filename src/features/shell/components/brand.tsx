/* eslint-disable @next/next/no-img-element -- logo Supabase Storage'dan, o'lchami kichik */
import { GraduationCap } from "lucide-react";

export function Brand({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  return (
    <div className="flex min-w-0 items-center gap-2 px-3 font-semibold">
      {logoUrl ? (
        <img src={logoUrl} alt="" className="size-8 shrink-0 rounded-md object-contain" />
      ) : (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <GraduationCap className="size-5" />
        </span>
      )}
      <span className="truncate">{name}</span>
    </div>
  );
}
