import { HeadingSkeleton, PillsSkeleton, Skeleton } from "@/components/Skeleton";

export default function SettingsLoading() {
  return (
    <div className="flex min-w-0 max-w-3xl flex-col gap-6" aria-busy="true" aria-label="Loading settings">
      <HeadingSkeleton />
      <PillsSkeleton count={3} />
      <Skeleton className="h-40 w-full rounded-card" />
      <Skeleton className="h-64 w-full rounded-card" />
    </div>
  );
}
