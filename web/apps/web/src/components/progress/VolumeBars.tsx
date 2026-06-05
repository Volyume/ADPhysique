import { volumeStatusColorVar, type MuscleVolume } from '@volyume/supabase';

// Per-muscle weekly volume against the MEV/MAV/MRV landmarks. The bar fills to
// the logged set count in the status colour; the hairlines mark MEV, MAV and
// MRV so you can read where a muscle sits in its productive band.
export function VolumeBars({ rows }: { rows: MuscleVolume[] }) {
  return (
    <div className="flex flex-col gap-sm">
      {rows.map((r) => {
        const max = Math.max(r.landmarks.mrv, r.sets, 1);
        const pct = (v: number) => `${Math.min(100, (v / max) * 100)}%`;
        const color = volumeStatusColorVar(r.status);
        return (
          <div key={r.muscle} className="grid grid-cols-[110px_1fr_84px] items-center gap-md">
            <span className="type-body text-textSecondary">{r.name}</span>
            <div className="relative h-4 overflow-hidden rounded-sm bg-surface2">
              <div
                className="absolute inset-y-0 left-0 rounded-sm"
                style={{ width: pct(r.sets), backgroundColor: color }}
              />
              {[r.landmarks.mev, r.landmarks.mav, r.landmarks.mrv].map((tk, i) =>
                tk > 0 ? (
                  <span key={i} className="absolute inset-y-0 w-px bg-borderLight" style={{ left: pct(tk) }} />
                ) : null,
              )}
            </div>
            <span className="type-body tnum text-right" style={{ color }}>
              {r.sets}
              <span className="text-textMuted"> / {r.landmarks.mrv}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
