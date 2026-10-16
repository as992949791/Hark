import { HeadingSkeleton, Skeleton } from "@/components/Skeleton";

export default function FiltersLoading() {
  return (
    <div className="flex min-w-0 max-w-5xl flex-col gap-6" aria-busy="true" aria-label="Loading filters">
      <HeadingSkeleton />
      <Skeleton className="h-80 w-full rounded-card" />
      <Skeleton className="h-80 w-full rounded-card" />
    </div>
  );
}
