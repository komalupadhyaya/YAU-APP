type Props = {
  size?: number;
  label?: string;
  onDark?: boolean;
};

export function BrandMark({ size = 36, label = "YAU Pickup", onDark = false }: Props) {
  return (
    <div className="inline-flex items-center gap-3 select-none">
      <div
        className="rounded-xl shadow-lg border border-white/25"
        style={{
          width: size,
          height: size,
          background: "linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)"
        }}
      >
        <div className="w-full h-full grid place-items-center">
          <span className="text-white font-extrabold tracking-tight" style={{ fontSize: Math.max(12, size * 0.42) }}>
            Y
          </span>
        </div>
      </div>
      <div className="leading-tight">
        <div className={["font-bold text-lg", onDark ? "text-white drop-shadow-sm" : "text-white"].join(" ")}>
          {onDark ? (
            <>
              <span className="text-white">YAU</span> <span className="text-white">Pickup</span>
            </>
          ) : (
            <>
              <span className="gradient-text">YAU</span> <span className="text-white">Pickup</span>
            </>
          )}
        </div>
        <div className={["text-xs", onDark ? "text-white/90 drop-shadow-sm" : "text-white/70"].join(" ")}>{label}</div>
      </div>
    </div>
  );
}

