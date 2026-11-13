import { MAPS } from '../game/maps';
import type { MapId } from '../game/types';

interface TitleOverlayProps {
  selectedMap: MapId;
  onSelectMap: (mapId: MapId) => void;
  onStart: () => void;
  onOpenCollection: () => void;
  bestDistance: number;
  discoveredHistoricalCount: number;
  totalHistoricalCount: number;
  platinumUnlocked: boolean;
}

const MAP_OPTIONS: Array<{ id: MapId; labelBn: string; label: string }> = [
  { id: 'dhaka', labelBn: 'ঢাকা', label: 'Dhaka' },
  { id: 'chattogram', labelBn: 'চট্টগ্রাম', label: 'Chattagram' },
  { id: 'sylhet', labelBn: 'সিলেট', label: 'Sylhet' },
];

export function TitleOverlay({
  selectedMap,
  onSelectMap,
  onStart,
  onOpenCollection,
  bestDistance,
  discoveredHistoricalCount,
  totalHistoricalCount,
  platinumUnlocked,
}: TitleOverlayProps) {
  const activeMapDef = MAPS[selectedMap];

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-3 sm:px-7 sm:py-4">
      {/* Upper sky band composition above the ~36% horizon */}
      <div className="w-full flex flex-col md:flex-row md:items-start md:justify-between gap-2.5">
        {/* Top-left: BOUNCE BACK (বাউন্স ব্যাক) Title Lockup */}
        <div className="pointer-events-auto flex flex-col items-start">
          <div className="inline-flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-[#FFFDF7] border-2 border-zinc-900 shadow-[0_4px_0_#18181B]">
            <svg viewBox="0 0 44 44" className="w-9 h-9 sm:w-10 sm:h-10 shrink-0" aria-hidden="true">
              <rect x="2" y="2" width="40" height="40" rx="10" fill="#D92638" stroke="#18181B" strokeWidth="2.5" />
              <polygon points="22,7 36,22 22,37 8,22" fill="#F59E0B" stroke="#18181B" strokeWidth="2" />
              <circle cx="22" cy="22" r="6" fill="#059669" stroke="#18181B" strokeWidth="2" />
            </svg>

            <div className="leading-none">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <h1 className="font-display font-extrabold text-xl sm:text-3xl tracking-tight text-zinc-900">
                  BOUNCE BACK
                </h1>
                <span className="font-bengali font-extrabold text-lg sm:text-2xl text-[#D92638]">
                  বাউন্স ব্যাক
                </span>
              </div>
              <p className="mt-1 text-[10px] sm:text-xs font-bold tracking-wide text-[#059669] uppercase">
                Three Endless Cities · Independent Bosta Dour Worlds
              </p>
            </div>
          </div>

          <p className="hidden sm:block mt-1.5 max-w-lg text-xs font-semibold text-zinc-900 leading-snug bg-[#FFFDF7]/85 px-2.5 py-1 rounded-lg border border-zinc-900/20">
            <span className="font-bengali text-[#059669] mr-1">{activeMapDef.nameBn}</span>
            <span className="font-bold">{activeMapDef.name}:</span>{' '}
            <span>{activeMapDef.subtitle}</span>
          </p>
        </div>

        {/* Top-right: Exactly 3 Independent Map Selector & Start CTA */}
        <div className="pointer-events-auto flex flex-col items-start md:items-end gap-2">
          <div
            className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#FFFDF7] border-2 border-zinc-900 shadow-[0_3px_0_#18181B]"
            role="group"
            aria-label="Select endless city map"
          >
            {MAP_OPTIONS.map((opt) => {
              const active = selectedMap === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  data-map-id={opt.id}
                  aria-pressed={active}
                  onClick={() => onSelectMap(opt.id)}
                  className={`px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    active ? 'bg-[#059669] text-[#FFFDF7]' : 'text-zinc-800 hover:bg-amber-100'
                  }`}
                >
                  <span className="font-bengali mr-1">{opt.labelBn}</span>
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-collection="true"
              onClick={onOpenCollection}
              className="px-3 py-2 rounded-xl bg-[#FFFDF7] hover:bg-amber-50 text-zinc-900 text-xs font-extrabold border-2 border-zinc-900 shadow-[0_3px_0_#18181B] cursor-pointer whitespace-nowrap flex items-center gap-1.5"
            >
              <span>Collection & Badges</span>
              <span className="font-mono-num text-[#059669]">
                {discoveredHistoricalCount}/{totalHistoricalCount}
              </span>
              {platinumUnlocked && (
                <span className="px-1.5 py-0.5 rounded bg-[#0284C7] text-white text-[10px]">
                  PT
                </span>
              )}
            </button>

            {bestDistance > 0 && (
              <div className="px-2.5 py-1.5 rounded-lg bg-[#FFFDF7]/90 border border-zinc-900 text-xs font-bold text-zinc-900 font-mono-num">
                Best: {bestDistance}m
              </div>
            )}

            <button
              type="button"
              data-start="true"
              onClick={onStart}
              className="px-6 py-2 sm:px-7 sm:py-2.5 rounded-xl bg-[#D92638] hover:bg-[#b91c2c] active:translate-y-0.5 text-[#FFFDF7] font-display font-extrabold text-base sm:text-lg border-2 border-zinc-900 shadow-[0_4px_0_#18181B] transition-transform cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
            >
              Start {activeMapDef.name}
            </button>
          </div>
        </div>
      </div>

      {/* Control hint line tucked neatly at bottom-left sidewalk margin */}
      <div className="self-start text-left text-[11px] sm:text-xs font-bold text-zinc-900 bg-[#FFFDF7]/90 border border-zinc-900/30 px-2.5 py-1 rounded-md tracking-tight">
        <span>← → / A D Switch Lane</span>
        <span aria-hidden="true"> · </span>
        <span>Space / Tap High Hop</span>
        <span aria-hidden="true"> · </span>
        <span>↓ / S Fast Fall</span>
        <span aria-hidden="true"> · </span>
        <span>P Pause</span>
      </div>
    </div>
  );
}
