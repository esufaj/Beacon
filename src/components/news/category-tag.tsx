"use client";

import { cn } from "@/lib/utils";
import { CATEGORY_CONFIG, type Category } from "@/types";

interface CategoryTagProps {
  category: Category;
  className?: string;
}

export function CategoryTag({ category, className }: CategoryTagProps) {
  const config = CATEGORY_CONFIG[category];

  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider",
        config.bgColor,
        className
      )}
      style={{ color: config.color }}
    >
      {config.label}
    </span>
  );
}
