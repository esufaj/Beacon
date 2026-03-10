"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useNewsStore } from "@/stores/news-store";
import { cn } from "@/lib/utils";
import { FilterButton } from "./filter-panel";

export function SearchCombobox() {
  const [isFocused, setIsFocused] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const setSearchQuery = useNewsStore((s) => s.setSearchQuery);
  const clearFilters = useNewsStore((s) => s.clearFilters);

  const handleClear = () => {
    setInputValue("");
    setSearchQuery("");
    clearFilters();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setSearchQuery(value);
  };

  return (
    <div className="flex items-center gap-2 w-full">
      {/* Search input container */}
      <div className="relative flex-1 min-w-0">
        <div
          className={cn(
            "group flex items-center gap-2 h-8 px-2.5 rounded-lg",
            "bg-background/60 backdrop-blur-sm",
            "border border-border/60",
            "transition-all duration-200 ease-out",
            "hover:border-border hover:bg-background/80",
            isFocused &&
              "border-primary/40 bg-background shadow-sm ring-2 ring-primary/10"
          )}
        >
          <Search
            className={cn(
              "w-3.5 h-3.5 shrink-0 transition-colors duration-200",
              isFocused ? "text-primary" : "text-muted-foreground"
            )}
          />
          <input
            type="text"
            placeholder="Search articles..."
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={cn(
              "flex-1 min-w-0 bg-transparent text-sm text-foreground",
              "placeholder:text-muted-foreground/70",
              "outline-none border-none",
              "selection:bg-primary/20"
            )}
          />
          {/* Reserve space for X button to prevent layout shift */}
          <div className="w-5 h-5 shrink-0 flex items-center justify-center">
            <AnimatePresence>
              {inputValue && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  onClick={handleClear}
                  className="p-0.5 hover:bg-muted rounded transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Filter button - outside search bar */}
      <FilterButton />
    </div>
  );
}
