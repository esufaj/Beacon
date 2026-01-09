"use client";

import { MapPin, Clock, ExternalLink, X } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { motion } from "framer-motion";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CategoryTag } from "./category-tag";
import { useNewsStore } from "@/stores/news-store";

export function ArticleDrawer() {
  const { selectedArticle, setSelectedArticle } = useNewsStore();

  const handleClose = () => {
    setSelectedArticle(null);
  };

  return (
    <Drawer
      open={!!selectedArticle}
      onOpenChange={(open) => !open && handleClose()}
    >
      <DrawerContent className="max-h-[85vh] bg-card border-t border-border">
        <div className="mx-auto w-full max-w-3xl">
          <DrawerHeader className="relative px-6 pt-6 pb-4">
            <DrawerClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-4 h-8 w-8 rounded-lg hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>

            {selectedArticle && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <CategoryTag category={selectedArticle.category} />
                  <div className="w-px h-3.5 bg-border" />
                  <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {formatDistanceToNow(selectedArticle.timestamp, {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>

                <DrawerTitle className="text-xl font-semibold text-foreground leading-snug mb-3 pr-10 tracking-[-0.01em]">
                  {selectedArticle.headline}
                </DrawerTitle>

                <DrawerDescription className="text-muted-foreground text-[15px] leading-relaxed">
                  {selectedArticle.summary}
                </DrawerDescription>

                <div className="flex items-center gap-3 mt-4 text-[13px]">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 text-primary/70" />
                    <span>
                      {selectedArticle.location.name},{" "}
                      {selectedArticle.location.country}
                    </span>
                  </div>
                  <div className="w-px h-3.5 bg-border" />
                  <span className="text-muted-foreground">
                    <span className="text-muted-foreground/60">Source:</span>{" "}
                    <span className="text-foreground">
                      {selectedArticle.source}
                    </span>
                  </span>
                </div>
              </motion.div>
            )}
          </DrawerHeader>

          <div className="h-px bg-border mx-6" />
          <ScrollArea className="h-[50vh] px-6">
            {selectedArticle && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{
                  duration: 0.25,
                  delay: 0.1,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="py-6"
              >
                <article className="space-y-4">
                  {selectedArticle.content
                    .split("\n\n")
                    .map((paragraph, index) => (
                      <p
                        key={index}
                        className="text-foreground text-[15px] leading-[1.7]"
                      >
                        {paragraph}
                      </p>
                    ))}
                </article>

                <div className="mt-8 pt-5 border-t border-border">
                  <div className="flex items-center justify-between">
                    <div className="text-[12px] text-muted-foreground">
                      Published
                      {format(
                        selectedArticle.timestamp,
                        "MMMM d, yyyy 'at' h:mm a"
                      )}
                    </div>
                    {selectedArticle.url && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 h-8 text-[13px] rounded-lg"
                        asChild
                      >
                        <a
                          href={selectedArticle.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Read full article
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </ScrollArea>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
