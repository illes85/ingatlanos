import { Skeleton } from "@/components/ui/feedback";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6 p-5 md:p-8" aria-busy="true">
      <Skeleton className="h-10 w-72" />
      <div className="flex gap-4 overflow-hidden">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-72 w-[300px] shrink-0" />
        ))}
      </div>
    </div>
  );
}
