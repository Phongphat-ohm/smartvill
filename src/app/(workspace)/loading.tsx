export default function WorkspaceLoading() {
  return (
    <div role="status" aria-live="polite" aria-label="กำลังโหลดข้อมูล" className="animate-pulse space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-lg bg-slate-200" />
        <div className="h-4 w-full max-w-md rounded bg-slate-100" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
        <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 sm:flex-row sm:justify-between sm:p-5">
          <div className="h-10 w-full rounded-lg bg-slate-100 sm:max-w-sm" />
          <div className="h-10 w-32 rounded-lg bg-slate-100" />
        </div>
        <div className="space-y-1 p-4 sm:p-5">
          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} className="grid grid-cols-[1.4fr_1fr_0.7fr] gap-4 border-b border-slate-100 py-4 last:border-0">
              <div className="h-4 rounded bg-slate-100" />
              <div className="h-4 rounded bg-slate-100" />
              <div className="h-4 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">กำลังโหลดข้อมูล กรุณารอสักครู่</span>
    </div>
  );
}
