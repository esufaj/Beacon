import { Suspense } from "react";
import { DashboardClient } from "@/components/dashboard-client";
import { getInitialArticlesFromRedis } from "@/lib/news-service";

function DashboardSkeleton() {
  return (
    <main className="flex h-[100dvh] w-full overflow-hidden bg-background">
      <div className="w-[380px] h-full bg-background border-r border-border animate-pulse" />
      <div className="flex-1 bg-background" />
    </main>
  );
}

async function DashboardLoader() {
  const { articles, totalCount } = await getInitialArticlesFromRedis(50);

  return (
    <DashboardClient
      initialArticles={articles}
      totalCount={totalCount}
    />
  );
}

export default function Page() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardLoader />
    </Suspense>
  );
}
