import { HeadingSkeleton, ListSkeleton } from "@/components/Skeleton";

/** The ranking weights and the filters. */
export default function FiltersLoading() {
  return (
    <div className="flex flex-col gap-5">
      <HeadingSkeleton />
      <ListSkeleton rows={5} />
    </div>
  );
}
