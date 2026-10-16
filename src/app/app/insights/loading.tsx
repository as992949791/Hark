import { HeadingSkeleton, PillsSkeleton, Skeleton } from "@/components/Skeleton";

export default function InsightsLoading() {
  return (
    <div className="flex min-w-0 max-w-6xl flex-col gap-6" aria-busy="true" aria-label="Loading insights">
      <HeadingSkeleton />
      <PillsSkeleton count={2} />
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="flex flex-col gap-4 rounded-card border bg-surface p-5">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-28 self-end" />
          </div>
        ))}
      </div>
    </div>
  );
}
