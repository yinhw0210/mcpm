// shadcn/ui Checkbox 组件

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const Checkbox = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { checked?: boolean }>(
  ({ className, checked, ...props }, ref) => (
    <button
      ref={ref}
      role="checkbox"
      aria-checked={checked}
      className={cn(
        "peer h-4 w-4 shrink-0 rounded-sm border border-[var(--primary)] ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        checked && "bg-[var(--primary)] text-[var(--primary-foreground)]",
        className,
      )}
      {...props}
    >
      {checked && <Check className="h-3 w-3" />}
    </button>
  ),
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
