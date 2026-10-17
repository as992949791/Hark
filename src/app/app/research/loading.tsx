import { HeadingSkeleton, Skeleton } from "@/components/Skeleton";

export default function ResearchLoading() {
  return <div className="flex min-w-0 max-w-6xl flex-col gap-6" aria-busy="true" aria-label="正在加载研究"><HeadingSkeleton /><div className="grid gap-6 lg:grid-cols-[19rem_minmax(0,1fr)]"><div className="rounded-card border bg-surface p-5"><Skeleton className="h-8 w-2/3" /><Skeleton className="mt-5 h-10 w-full" /><Skeleton className="mt-4 h-28 w-full" /><Skeleton className="mt-5 h-11 w-full" /></div><div className="rounded-card border bg-surface p-6"><Skeleton className="h-8 w-1/2" /><Skeleton className="mt-6 h-16 w-full" /><Skeleton className="mt-6 h-40 w-full" /></div></div></div>;
}
