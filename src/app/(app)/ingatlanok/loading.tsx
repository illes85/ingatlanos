import { Skeleton } from "@/components/ui/feedback";

/** Az ingatlanlista skeleton-betöltése — ugyanaz a rács, mint a kész oldalon. */
export default function PropertiesLoading() {
  return (
    <div className="flex max-w-[1400px] flex-col gap-6 p-5 md:p-8" aria-busy="true">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-56" />
        <div className="flex gap-2.5">
          <Skeleton className="h-11 w-[280px] rounded-control" />
          <Skeleton className="h-10 w-24 rounded-full" />
          <Skeleton className="h-10 w-24 rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-[280px] rounded-card" />
        ))}
      </div>
    </div>
  );
}
