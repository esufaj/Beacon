"use client";

import { useState, useMemo, useRef } from "react";
import { Search, X, FileText, User, Building2, Tag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNewsStore } from "@/stores/news-store";
import { cn } from "@/lib/utils";
import { FilterButton } from "./filter-panel";
import type { NewsArticle } from "@/types";

interface SearchResult {
  article: NewsArticle;
  matchType: "headline" | "content" | "person" | "organization" | "keyword";
  matchText: string;
}

export function SearchCombobox() {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { setSearchQuery, clearFilters, articles, setSelectedArticle } =
    useNewsStore();

  // Search articles by content, people, organizations, keywords
  const searchResults = useMemo(() => {
    if (!inputValue || inputValue.length < 2) return [];

    const query = inputValue.toLowerCase();
    const results: SearchResult[] = [];
    const seenIds = new Set<string>();

    for (const article of articles) {
      if (seenIds.has(article.id)) continue;

      // Check headline
      if (article.headline.toLowerCase().includes(query)) {
        results.push({
          article,
          matchType: "headline",
          matchText: article.headline,
        });
        seenIds.add(article.id);
        continue;
      }

      // Check content/summary
      if (
        article.content.toLowerCase().includes(query) ||
        article.summary.toLowerCase().includes(query)
      ) {
        results.push({
          article,
          matchType: "content",
          matchText: article.summary.slice(0, 100) + "...",
        });
        seenIds.add(article.id);
        continue;
      }

      // Check people
      const matchedPerson = article.entitiesPeople?.find((p) =>
        p.toLowerCase().includes(query)
      );
      if (matchedPerson) {
        results.push({
          article,
          matchType: "person",
          matchText: matchedPerson,
        });
        seenIds.add(article.id);
        continue;
      }

      // Check organizations
      const matchedOrg = article.entitiesOrganizations?.find((o) =>
        o.toLowerCase().includes(query)
      );
      if (matchedOrg) {
        results.push({
          article,
          matchType: "organization",
          matchText: matchedOrg,
        });
        seenIds.add(article.id);
        continue;
      }

      // Check keywords
      const matchedKeyword = article.keywords?.find((k) =>
        k.toLowerCase().includes(query)
      );
      if (matchedKeyword) {
        results.push({
          article,
          matchType: "keyword",
          matchText: matchedKeyword,
        });
        seenIds.add(article.id);
        continue;
      }
    }

    return results.slice(0, 8);
  }, [inputValue, articles]);

  const handleArticleSelect = (result: SearchResult) => {
    setSelectedArticle(result.article);
    setInputValue("");
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    setInputValue("");
    setSearchQuery("");
    clearFilters();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setSearchQuery(value);
    if (!open && value) setOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
    if (e.key === "Enter" && searchResults.length > 0) {
      handleArticleSelect(searchResults[0]);
    }
  };

  const getMatchIcon = (matchType: SearchResult["matchType"]) => {
    switch (matchType) {
      case "headline":
      case "content":
        return <FileText className="w-3.5 h-3.5" />;
      case "person":
        return <User className="w-3.5 h-3.5" />;
      case "organization":
        return <Building2 className="w-3.5 h-3.5" />;
      case "keyword":
        return <Tag className="w-3.5 h-3.5" />;
    }
  };

  const getMatchLabel = (matchType: SearchResult["matchType"]) => {
    switch (matchType) {
      case "headline":
        return "Title";
      case "content":
        return "Content";
      case "person":
        return "Person";
      case "organization":
        return "Organization";
      case "keyword":
        return "Keyword";
    }
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
            open &&
              "border-primary/40 bg-background shadow-sm ring-2 ring-primary/10"
          )}
        >
          <Search
            className={cn(
              "w-3.5 h-3.5 shrink-0 transition-colors duration-200",
              open ? "text-primary" : "text-muted-foreground"
            )}
          />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search articles..."
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 200)}
            onKeyDown={handleKeyDown}
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

      <AnimatePresence>
        {open && inputValue.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className="absolute top-full left-0 right-0 mt-2 rounded-xl bg-popover/95 backdrop-blur-xl border border-border/80 shadow-lg shadow-black/5 z-50 overflow-hidden"
          >
            <div className="p-1.5">
              <div className="px-2.5 py-2">
                <span className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
                  {searchResults.length > 0
                    ? `${searchResults.length} result${searchResults.length === 1 ? "" : "s"}`
                    : "No results"}
                </span>
              </div>

              {searchResults.length === 0 ? (
                <div className="px-3 py-6 text-center text-muted-foreground text-sm">
                  No articles found for &quot;{inputValue}&quot;
                </div>
              ) : (
                <div className="space-y-0.5">
                  {searchResults.map((result, index) => (
                    <motion.button
                      key={result.article.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.15, delay: index * 0.02 }}
                      onMouseDown={() => handleArticleSelect(result)}
                      className={cn(
                        "w-full flex items-start gap-3 px-2.5 py-2.5 rounded-lg",
                        "hover:bg-accent/80 transition-all duration-150",
                        "text-left group/item"
                      )}
                    >
                      <div
                        className={cn(
                          "flex items-center justify-center w-7 h-7 rounded-lg shrink-0 mt-0.5",
                          "bg-primary/10 text-primary"
                        )}
                      >
                        {getMatchIcon(result.matchType)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                            {result.article.source}
                          </span>
                          <span className="text-[10px] text-muted-foreground/60">
                            •
                          </span>
                          <span className="text-[10px] text-primary/80 font-medium">
                            {getMatchLabel(result.matchType)}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-foreground line-clamp-1">
                          {result.article.headline}
                        </p>
                        {result.matchType !== "headline" && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {result.matchType === "person" ||
                            result.matchType === "organization" ||
                            result.matchType === "keyword"
                              ? `Matched: ${result.matchText}`
                              : result.matchText}
                          </p>
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      {/* Filter button - outside search bar */}
      <FilterButton />
    </div>
  );
}
