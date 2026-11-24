export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <div
      className={`w-8 h-8 rounded-md bg-emerald-500 text-black flex items-center justify-center text-[13px] font-semibold tracking-tight ${className}`}
      aria-hidden
    >
      TL
    </div>
  );
}
