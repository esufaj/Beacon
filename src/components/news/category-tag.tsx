"use client";

import { cn } from "@/lib/utils";
import { CATEGORY_CONFIG, type Category } from "@/types";

interface CategoryTagProps {
  category: Category;
  className?: string;
  variant?: "default" | "vibrant";
}

export function CategoryTag({ category, className, variant = "default" }: CategoryTagProps) {
  const config = CATEGORY_CONFIG[category];

  if (variant === "vibrant") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide",
          className
        )}
        style={{ 
          backgroundColor: `${config.color}20`, 
          color: config.color,
        }}
      >
        <span 
          className="w-1.5 h-1.5 rounded-full" 
          style={{ backgroundColor: config.color }}
        />
        {config.label}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide",
        className
      )}
      style={{ 
        backgroundColor: `${config.color}18`, 
        color: config.color,
      }}
    >
      <span 
        className="w-1.5 h-1.5 rounded-full" 
        style={{ backgroundColor: config.color }}
      />
      {config.label}
    </span>
  );
}
