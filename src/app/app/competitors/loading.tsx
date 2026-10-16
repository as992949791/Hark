import { HeadingSkeleton, ListSkeleton, PillsSkeleton, Skeleton } from "@/components/Skeleton";

export default function CompetitorsLoading() {
  return (
    <div className="flex min-w-0 max-w-6xl flex-col gap-6" aria-busy="true" aria-label="Loading competitors">
      <HeadingSkeleton />
      <PillsSkeleton count={3} />
      <Skeleton className="h-60 w-full rounded-card" />
      <ListSkeleton rows={4} />
    </div>
  );
}
