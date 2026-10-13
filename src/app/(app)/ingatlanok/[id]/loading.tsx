import { Skeleton } from "@/components/ui/feedback";

export default function PropertyLoading() {
  return (
    <div className="flex max-w-[1400px] flex-col gap-6 p-5 md:p-8" aria-busy="true">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-6 w-64 rounded-full" />
        <Skeleton className="h-11 w-[520px] max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Skeleton className="h-[420px] rounded-card-lg" />
        <Skeleton className="h-[520px] rounded-card-lg" />
      </div>
    </div>
  );
}
