/* eslint-disable @next/next/no-img-element -- logo Supabase Storage'dan */
"use client";

import { ImageIcon, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef } from "react";
import { toast } from "sonner";

import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { useServerAction } from "@/hooks/use-server-action";

import { removeLogo, uploadLogo } from "../actions";
import { LOGO_TYPES } from "../schema";

export function LogoUpload({ logoUrl }: { logoUrl: string | null }) {
  const t = useTranslations("settings.organization");
  const tc = useTranslations("common");
  const inputRef = useRef<HTMLInputElement>(null);
  const { error, pending, run } = useServerAction();

  function onFile(file: File | undefined) {
    if (!file) return;
    const data = new FormData();
    data.set("file", file);
    run(
      () => uploadLogo(data),
      () => toast.success(tc("saved")),
    );
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="grid max-w-lg gap-2">
      <span className="text-sm font-medium">{t("logo")}</span>
      <div className="flex items-center gap-4">
        <div className="flex size-16 items-center justify-center overflow-hidden rounded-lg border bg-muted">
          {logoUrl ? (
            <img src={logoUrl} alt={t("logo")} className="size-full object-contain" />
          ) : (
            <ImageIcon className="size-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={Object.keys(LOGO_TYPES).join(",")}
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
          >
            <Upload />
            {t("uploadLogo")}
          </Button>
          {logoUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => run(() => removeLogo())}
            >
              <Trash2 />
              {tc("remove")}
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{t("logoHint")}</p>
      <FormError error={error} />
    </div>
  );
}
