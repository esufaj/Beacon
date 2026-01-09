"use client";

import { Radio } from "lucide-react";

export function BeaconLogo() {
  return (
    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary shadow-sm">
      <Radio className="w-4 h-4 text-primary-foreground" />
    </div>
  );
}
