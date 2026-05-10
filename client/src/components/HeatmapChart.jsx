"use client";

export default function HeatmapChart({ heatmapData }) {
  const buckets = heatmapData?.buckets ?? [];
  const drops = buckets.slice(1).map((bucket, index) => ({
    index,
    drop: (buckets[index]?.percent ?? 0) - bucket.percent,
  }));
  const cliff = drops.sort((a, b) => b.drop - a.drop)[0]?.index + 1;

  return (
    <div className="rounded-[4px] border p-5" style={{ backgroundColor: "var(--bg2)", borderColor: "var(--border)" }}>
      <p className="text-sm font-bold" style={{ color: "var(--text2)" }}>
        {heatmapData?.totalReaders ?? 0} tracked readers
      </p>
      <div className="mt-4 space-y-2">
        {buckets.map((bucket, index) => (
          <div key={bucket.range} className="grid grid-cols-[4rem_1fr_3rem] items-center gap-3 text-xs">
            <span style={{ color: "var(--text3)" }}>{bucket.range}%</span>
            <div className="h-4 overflow-hidden rounded-[3px]" style={{ backgroundColor: "var(--bg4)" }}>
              <div
                className="h-full"
                style={{
                  width: `${bucket.percent}%`,
                  backgroundColor: `hsl(${Math.round(bucket.percent * 1.2)}, 60%, 45%)`,
                }}
              />
            </div>
            <span style={{ color: index === cliff ? "var(--red)" : "var(--text2)" }}>
              {bucket.percent}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
