import { Skeleton } from "@/components/ui/feedback";

/** Az irányítópult skeleton-betöltése — ugyanaz a rács, mint a kész oldalon. */
export default function TodayLoading() {
  const card = "rounded-card border border-line-card bg-surface p-5";
  return (
    <>
      <div className="flex flex-col gap-4 px-5 pt-2 md:hidden" aria-busy="true">
        <div className="flex gap-2.5">
          <Skeleton className="h-[92px] flex-1 rounded-card" />
          <Skeleton className="h-[92px] flex-1 rounded-card" />
        </div>
        <Skeleton className="h-[188px] rounded-card-lg" />
        <Skeleton className="h-[180px] rounded-card-lg" />
      </div>
      <div className="hidden max-w-[1240px] flex-col gap-6 p-8 md:flex" aria-busy="true">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-11 w-80" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-2 gap-5 xl:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className={`${card} flex flex-col gap-2`}>
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-8 w-36" />
              <Skeleton className="h-3.5 w-28" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
          <div className={`${card} flex flex-col gap-4`}>
            <Skeleton className="h-6 w-40" />
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-full" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton ai className="h-3.5 w-1/3" />
                  <Skeleton ai className="h-3 w-2/3" />
                </div>
                <Skeleton className="size-11 rounded-tile" />
              </div>
            ))}
          </div>
          <div className={`${card} flex flex-col gap-4`}>
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </div>
      </div>
    </>
  );
}
