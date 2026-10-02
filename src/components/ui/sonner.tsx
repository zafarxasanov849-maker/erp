"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

// shadcn "toast" komponenti o'rniga sonner (shadcn'ning hozirgi tavsiyasi).
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };
