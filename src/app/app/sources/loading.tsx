import { HeadingSkeleton, ListSkeleton } from "@/components/Skeleton";

export default function SourcesLoading() {
  return (
    <div className="flex max-w-5xl flex-col gap-6" aria-label="Loading sources">
      <HeadingSkeleton />
      <ListSkeleton rows={3} />
      <ListSkeleton rows={4} />
    </div>
  );
}
