import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-slate-900 text-slate-50 dark:bg-slate-100 dark:text-slate-900",
        secondary:
          "border-slate-200 bg-slate-100 text-slate-900 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100",
        outline:
          "border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-200",
        warning:
          "border-transparent bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200",
        critical:
          "border-transparent bg-rose-100 text-rose-900 dark:bg-rose-500/20 dark:text-rose-200"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
