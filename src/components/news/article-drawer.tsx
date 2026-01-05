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
import { Separator } from "@/components/ui/separator";
import { CategoryTag } from "./category-tag";
import { useNewsStore } from "@/stores/news-store";

export function ArticleDrawer() {
  const { selectedArticle, setSelectedArticle } = useNewsStore();

  const handleClose = () => {
    setSelectedArticle(null);
  };

  return (
    <Drawer open={!!selectedArticle} onOpenChange={(open) => !open && handleClose()}>
      <DrawerContent className="max-h-[85vh] bg-neutral-950/95 backdrop-blur-xl border-t border-white/10">
        <div className="mx-auto w-full max-w-4xl">
          <DrawerHeader className="relative">
            <DrawerClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-4 h-8 w-8 rounded-full hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>

            {selectedArticle && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <CategoryTag category={selectedArticle.category} />
                  <Separator orientation="vertical" className="h-4 bg-white/10" />
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {formatDistanceToNow(selectedArticle.timestamp, { addSuffix: true })}
                    </span>
                  </div>
                </div>

                <DrawerTitle className="text-2xl font-bold text-white leading-tight mb-3 pr-10">
                  {selectedArticle.headline}
                </DrawerTitle>

                <DrawerDescription className="text-neutral-400 text-base leading-relaxed">
                  {selectedArticle.summary}
                </DrawerDescription>

                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-1.5 text-sm text-neutral-400">
                    <MapPin className="w-4 h-4 text-blue-500" />
                    <span>
                      {selectedArticle.location.name}, {selectedArticle.location.country}
                    </span>
                  </div>
                  <Separator orientation="vertical" className="h-4 bg-white/10" />
                  <span className="text-sm text-neutral-400">
                    Source: <span className="text-white">{selectedArticle.source}</span>
                  </span>
                </div>
              </motion.div>
            )}
          </DrawerHeader>

          <Separator className="bg-white/5" />

          <ScrollArea className="h-[50vh] px-6">
            {selectedArticle && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="py-6"
              >
                <article className="prose prose-invert prose-sm max-w-none">
                  {selectedArticle.content.split("\n\n").map((paragraph, index) => (
                    <p
                      key={index}
                      className="text-neutral-300 leading-relaxed mb-4 last:mb-0"
                    >
                      {paragraph}
                    </p>
                  ))}
                </article>

                <div className="mt-8 pt-6 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-neutral-500">
                      Published {format(selectedArticle.timestamp, "MMMM d, yyyy 'at' h:mm a")}
                    </div>
                    {selectedArticle.url && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 border-white/10 hover:bg-white/5 text-neutral-300"
                        asChild
                      >
                        <a href={selectedArticle.url} target="_blank" rel="noopener noreferrer">
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
