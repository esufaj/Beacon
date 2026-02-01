"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Cute ASCII loading characters
const LOADING_FRAMES = ["◐", "◓", "◑", "◒"];
const MESSAGES = [
  "Scanning the globe...",
  "Finding stories...",
  "Gathering insights...",
  "Almost there...",
];

export function NewsCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={cn(
        "px-4 py-3 mx-2 my-1 rounded-xl",
        "bg-gradient-to-r from-muted/30 via-muted/50 to-muted/30",
        "bg-[length:200%_100%]",
        "animate-shimmer"
      )}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 mb-2.5">
        <div className="h-5 w-16 bg-muted/80 rounded-full" />
        <div className="w-px h-3.5 bg-muted/50" />
        <div className="h-3.5 w-20 bg-muted/60 rounded-md" />
      </div>

      {/* Title */}
      <div className="space-y-2 mb-3">
        <div className="h-4 w-full bg-muted/70 rounded-md" />
        <div className="h-4 w-4/5 bg-muted/60 rounded-md" />
      </div>

      {/* Summary */}
      <div className="space-y-1.5 mb-3">
        <div className="h-3 w-full bg-muted/50 rounded" />
        <div className="h-3 w-11/12 bg-muted/40 rounded" />
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3">
        <div className="h-3 w-24 bg-muted/30 rounded" />
        <div className="h-3 w-16 bg-muted/30 rounded" />
      </div>
    </motion.div>
  );
}

export function NewsCardSkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="py-1">
      {Array.from({ length: count }).map((_, i) => (
        <NewsCardSkeleton key={i} index={i} />
      ))}
    </div>
  );
}

// Delightful ASCII-style loader
export function LoadingState() {
  const [frame, setFrame] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const frameInterval = setInterval(() => {
      setFrame((f) => (f + 1) % LOADING_FRAMES.length);
    }, 120);

    const messageInterval = setInterval(() => {
      setMessageIndex((m) => (m + 1) % MESSAGES.length);
    }, 2000);

    return () => {
      clearInterval(frameInterval);
      clearInterval(messageInterval);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-12 px-4"
    >
      {/* Animated dots */}
      <div className="flex items-center gap-1.5 mb-4">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-primary"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* ASCII spinner */}
      <div className="font-mono text-3xl text-primary mb-3 select-none">
        {LOADING_FRAMES[frame]}
      </div>

      {/* Message */}
      <motion.p
        key={messageIndex}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.2 }}
        className="text-sm text-muted-foreground"
      >
        {MESSAGES[messageIndex]}
      </motion.p>
    </motion.div>
  );
}

// Minimal inline loader
export function InlineLoader() {
  return (
    <span className="inline-flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1 h-1 rounded-full bg-current"
          animate={{
            opacity: [0.3, 1, 0.3],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.1,
          }}
        />
      ))}
    </span>
  );
}
