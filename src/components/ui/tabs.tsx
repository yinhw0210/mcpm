// shadcn/ui Tabs 组件 (简化版)

import * as React from "react";
import { cn } from "@/lib/utils";

interface TabsContextType {
  value: string;
  onChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextType | null>(null);

const Tabs: React.FC<{ value: string; onValueChange: (v: string) => void; children: React.ReactNode; className?: string }> = ({
  value,
  onValueChange,
  children,
  className,
}) => (
  <TabsContext.Provider value={{ value, onChange: onValueChange }}>
    <div className={className}>{children}</div>
  </TabsContext.Provider>
);

const TabsList: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn("inline-flex h-9 items-center justify-center rounded-lg bg-[var(--muted)] p-1", className)}>
    {children}
  </div>
);

const TabsTrigger: React.FC<{ value: string; children: React.ReactNode; className?: string }> = ({ value, children, className }) => {
  const ctx = React.useContext(TabsContext);
  if (!ctx) return null;
  const active = ctx.value === value;
  return (
    <button
      onClick={() => ctx.onChange(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all cursor-pointer",
        active
          ? "bg-[var(--background)] text-[var(--foreground)] shadow"
          : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
        className,
      )}
    >
      {children}
    </button>
  );
};

const TabsContent: React.FC<{ value: string; children: React.ReactNode; className?: string }> = ({ value, children, className }) => {
  const ctx = React.useContext(TabsContext);
  if (!ctx || ctx.value !== value) return null;
  return <div className={className}>{children}</div>;
};

export { Tabs, TabsList, TabsTrigger, TabsContent };
