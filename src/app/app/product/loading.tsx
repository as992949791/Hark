import { HeadingSkeleton, Skeleton } from "@/components/Skeleton";

/** The profile form. */
export default function ProductLoading() {
  return (
    <div className="flex max-w-5xl flex-col gap-6" aria-label="Loading product profile">
      <HeadingSkeleton />
      <div className="grid gap-4 rounded-card border bg-surface p-4 md:grid-cols-2 md:p-6">
        <Skeleton className="h-6 w-40 md:col-span-2" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-24 w-full md:col-span-2" />
        <Skeleton className="h-9 w-28" />
      </div>
    </div>
  );
}
