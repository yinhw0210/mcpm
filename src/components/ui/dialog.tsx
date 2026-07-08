// Dialog 组件 — SuperDesign 风格 (A2 Design)
// 简洁、功能优先的对话框设计

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

const Dialog: React.FC<DialogProps> = ({ open, onClose, children, className }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/40 transition-opacity"
        onClick={onClose}
      />

      {/* 对话框 */}
      <div
        className={cn(
          "relative z-50 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-lg",
          className,
        )}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
        >
          <X className="h-4 w-4" />
        </button>

        {children}
      </div>
    </div>
  );
};

const DialogHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex flex-col px-5 pt-4 pb-3 border-b border-[var(--border)]">
    {children}
  </div>
);

const DialogTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-base font-semibold">{children}</h2>
);

const DialogDescription: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-sm text-[var(--muted-foreground)] mt-1">{children}</p>
);

const DialogContent: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div className={cn("px-5 py-4", className)}>{children}</div>
);

const DialogFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn("flex justify-end gap-2 px-5 py-4 border-t border-[var(--border)]", className)}>
    {children}
  </div>
);

export { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter };
