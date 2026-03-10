"use client";

import { useState } from "react";
import {
  MapPin,
  Clock,
  ExternalLink,
  X,
  Sparkles,
  Shield,
  Gauge,
  AlertTriangle,
  Timer,
  FileText,
  User,
  Building2,
  ChevronDown,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CategoryTag } from "./category-tag";
import { useNewsStore } from "@/stores/news-store";
import { cn } from "@/lib/utils";
import type { NewsArticle } from "@/types";
import { formatLocationLabel } from "@/lib/location-utils";

const BIAS_COLORS: Record<string, { bg: string; text: string }> = {
  left: { bg: "bg-blue-500/15", text: "text-blue-600 dark:text-blue-400" },
  "center-left": {
    bg: "bg-sky-500/15",
    text: "text-sky-600 dark:text-sky-400",
  },
  center: {
    bg: "bg-slate-500/15",
    text: "text-slate-600 dark:text-slate-400",
  },
  "center-right": {
    bg: "bg-orange-500/15",
    text: "text-orange-600 dark:text-orange-400",
  },
  right: { bg: "bg-red-500/15", text: "text-red-600 dark:text-red-400" },
};

const SENTIMENT_COLORS: Record<string, { bg: string; text: string }> = {
  positive: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  negative: { bg: "bg-red-500/15", text: "text-red-600 dark:text-red-400" },
  neutral: {
    bg: "bg-slate-500/15",
    text: "text-slate-600 dark:text-slate-400",
  },
  mixed: { bg: "bg-amber-500/15", text: "text-amber-600 dark:text-amber-400" },
};

const URGENCY_COLORS: Record<
  string,
  { bg: string; text: string; dot: string }
> = {
  critical: {
    bg: "bg-red-500/15",
    text: "text-red-600 dark:text-red-400",
    dot: "bg-red-500",
  },
  high: {
    bg: "bg-orange-500/15",
    text: "text-orange-600 dark:text-orange-400",
    dot: "bg-orange-500",
  },
  medium: {
    bg: "bg-amber-500/15",
    text: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  low: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
};

function CredibilityMeter({ score }: { score: number }) {
  const getColor = () => {
    if (score >= 8) return "bg-emerald-500";
    if (score >= 6) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-[2px]">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-[4px] h-3 rounded-[2px]",
              i < score ? getColor() : "bg-muted-foreground/20"
            )}
          />
        ))}
      </div>
      <span className="text-[11px] font-medium tabular-nums">{score}/10</span>
    </div>
  );
}

// Unified AI Insights component - combines summary and analysis
function AIInsights({ article }: { article: NewsArticle }) {
  const [showDetails, setShowDetails] = useState(false);

  const hasAnalysisData =
    article.credibilityScore !== undefined ||
    article.biasRating ||
    article.sentiment ||
    article.urgency ||
    article.keywords?.length ||
    article.entitiesPeople?.length ||
    article.entitiesOrganizations?.length ||
    article.readingTime ||
    article.articleType;

  return (
    <div className="rounded-xl bg-muted/40 border border-border/60 overflow-hidden">
      {/* Header with icon */}
      <div className="flex items-start gap-3 p-4 pb-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-[13px] font-semibold text-foreground mb-2">
            AI Insights
          </h4>
          <p className="text-[14px] text-foreground/85 leading-relaxed">
            {article.summary}
          </p>
        </div>
      </div>

      {/* Analysis toggle - only show if there's analysis data */}
      {hasAnalysisData && (
        <>
          <div className="h-px bg-border/50 mx-4" />

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-muted/60 transition-colors"
          >
            <span className="text-[12px] font-medium text-muted-foreground">
              {showDetails ? "Hide analysis" : "Show detailed analysis"}
            </span>
            <ChevronDown
              className={cn(
                "w-3.5 h-3.5 text-muted-foreground transition-transform duration-200",
                showDetails && "rotate-180"
              )}
            />
          </button>

          {/* Expanded analysis content */}
          <AnimatePresence initial={false}>
            {showDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 pt-1 space-y-3">
                  {/* Main metrics row */}
                  <div className="flex flex-wrap gap-2">
                    {article.credibilityScore !== undefined && (
                      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-background/60 border border-border/40">
                        <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-[11px] text-muted-foreground mr-1">
                          Credibility
                        </span>
                        <CredibilityMeter score={article.credibilityScore} />
                      </div>
                    )}
                    {article.biasRating && (
                      <div
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/40",
                          BIAS_COLORS[article.biasRating]?.bg
                        )}
                      >
                        <Gauge className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-[11px] text-muted-foreground">
                          Bias
                        </span>
                        <span
                          className={cn(
                            "text-xs font-medium capitalize",
                            BIAS_COLORS[article.biasRating]?.text
                          )}
                        >
                          {article.biasRating.replace("-", " ")}
                        </span>
                      </div>
                    )}
                    {article.sentiment && (
                      <div
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/40",
                          SENTIMENT_COLORS[article.sentiment]?.bg
                        )}
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-[11px] text-muted-foreground">
                          Sentiment
                        </span>
                        <span
                          className={cn(
                            "text-xs font-medium capitalize",
                            SENTIMENT_COLORS[article.sentiment]?.text
                          )}
                        >
                          {article.sentiment}
                        </span>
                      </div>
                    )}
                    {article.urgency && (
                      <div
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/40",
                          URGENCY_COLORS[article.urgency]?.bg
                        )}
                      >
                        <div
                          className={cn(
                            "w-2 h-2 rounded-full",
                            URGENCY_COLORS[article.urgency]?.dot
                          )}
                        />
                        <span className="text-[11px] text-muted-foreground">
                          Urgency
                        </span>
                        <span
                          className={cn(
                            "text-xs font-medium capitalize",
                            URGENCY_COLORS[article.urgency]?.text
                          )}
                        >
                          {article.urgency}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Reading time & Article type */}
                  {(article.readingTime || article.articleType) && (
                    <div className="flex flex-wrap gap-2">
                      {article.readingTime && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-background/60 border border-border/40">
                          <Timer className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-[11px] text-muted-foreground">
                            Read time
                          </span>
                          <span className="text-xs font-medium">
                            {article.readingTime} min
                          </span>
                        </div>
                      )}
                      {article.articleType && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-background/60 border border-border/40">
                          <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-[11px] text-muted-foreground">
                            Type
                          </span>
                          <span className="text-xs font-medium capitalize">
                            {article.articleType.replace("_", " ")}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Keywords */}
                  {article.keywords && article.keywords.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] text-muted-foreground font-medium">
                        Keywords
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {article.keywords.map((keyword, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 text-[11px] bg-primary/10 text-primary/90 rounded-md font-medium"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Entities */}
                  {(article.entitiesPeople?.length ||
                    article.entitiesOrganizations?.length) && (
                    <div className="flex flex-wrap gap-4">
                      {article.entitiesPeople &&
                        article.entitiesPeople.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                              <User className="w-3 h-3" />
                              People
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {article.entitiesPeople.map((person, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 text-[11px] bg-muted text-foreground/80 rounded-md"
                                >
                                  {person}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      {article.entitiesOrganizations &&
                        article.entitiesOrganizations.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                              <Building2 className="w-3 h-3" />
                              Organizations
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {article.entitiesOrganizations.map((org, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 text-[11px] bg-muted text-foreground/80 rounded-md"
                                >
                                  {org}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

function buildExcerptParagraphs(
  text: string,
  maxParagraphs = 3,
  sentencesPerParagraph = 3
): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const sentences =
    trimmed.match(/[^.!?]+[.!?]+(?:\s|$)/g)?.map((s) => s.trim()) || [];

  if (sentences.length === 0) {
    return [trimmed];
  }

  const paragraphs: string[] = [];
  for (let i = 0; i < sentences.length && paragraphs.length < maxParagraphs; i += sentencesPerParagraph) {
    const chunk = sentences.slice(i, i + sentencesPerParagraph).join(" ");
    if (chunk) paragraphs.push(chunk);
  }

  return paragraphs;
}

function getArticleExcerpt(article: NewsArticle): string[] {
  const baseText = article.content || article.summary || article.headline;
  return buildExcerptParagraphs(baseText, 3, 3);
}

export function ArticleDrawer() {
  const selectedArticle = useNewsStore((s) => s.selectedArticle);
  const setSelectedArticle = useNewsStore((s) => s.setSelectedArticle);

  const handleClose = () => {
    setSelectedArticle(null);
  };

  return (
    <Drawer
      open={!!selectedArticle}
      onOpenChange={(open) => !open && handleClose()}
    >
      <DrawerContent className="h-[85vh] bg-card border-t border-border">
        <div className="mx-auto w-full max-w-3xl h-full flex flex-col overflow-hidden">
          {/* Header - fixed, minimal content */}
          <DrawerHeader className="relative px-6 pt-6 pb-4 shrink-0">
            <DrawerClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-4 h-8 w-8 rounded-lg hover:bg-accent z-10"
              >
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>

            {selectedArticle && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-3"
              >
                {/* Title */}
                <DrawerTitle className="text-xl font-semibold text-foreground leading-snug pr-10 tracking-[-0.01em]">
                  {selectedArticle.headline}
                </DrawerTitle>

                {/* Meta: Category, Date, Location, Source - centered */}
                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[13px]">
                  <CategoryTag category={selectedArticle.category} />
                  <div className="w-px h-3.5 bg-border" />
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {formatDistanceToNow(selectedArticle.timestamp, {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <div className="w-px h-3.5 bg-border" />
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>
                      {formatLocationLabel(selectedArticle.location)}
                    </span>
                  </div>
                  <div className="w-px h-3.5 bg-border" />
                  <span className="text-foreground font-medium">
                    {selectedArticle.source}
                  </span>
                </div>
              </motion.div>
            )}
          </DrawerHeader>

          {/* Divider */}
          <div className="h-px bg-border mx-6 shrink-0" />

          {/* Scrollable content area - takes remaining height */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              {selectedArticle && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{
                    duration: 0.25,
                    delay: 0.1,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="px-6 py-5"
                >
                  <div className="space-y-5">
                    {/* Unified AI Insights section */}
                    <AIInsights article={selectedArticle} />

                    {/* Article body */}
                    <div className="pt-1">
                      <div className="space-y-4 text-foreground/80 text-[15px] leading-[1.75]">
                        {getArticleExcerpt(selectedArticle).map((paragraph, index) => (
                          <p key={index}>{paragraph}</p>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Footer - scrolls with content */}
                  <div className="mt-6 pt-4 border-t border-border">
                    <div className="flex items-center justify-between">
                      <div className="text-[12px] text-muted-foreground">
                        Published{" "}
                        {format(
                          selectedArticle.timestamp,
                          "MMMM d, yyyy 'at' h:mm a"
                        )}
                      </div>
                      {selectedArticle.url && (
                        <Button
                          size="sm"
                          className="gap-2 h-9 px-4 rounded-lg font-medium"
                          asChild
                        >
                          <a
                            href={selectedArticle.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Read Full Article
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
