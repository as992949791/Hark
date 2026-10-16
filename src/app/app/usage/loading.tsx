import { HeadingSkeleton, ListSkeleton, Skeleton } from "@/components/Skeleton";

export default function UsageLoading() {
  return (
    <div className="flex min-w-0 max-w-6xl flex-col gap-6" aria-busy="true" aria-label="Loading usage">
      <HeadingSkeleton />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-40" />)}
      </div>
      <ListSkeleton rows={5} />
    </div>
  );
}
