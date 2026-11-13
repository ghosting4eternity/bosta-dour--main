import { MAP_IDS, MAPS } from '../game/maps';
import type { HudSnapshot } from '../game/types';

interface CollectionModalProps {
  open: boolean;
  hud: HudSnapshot;
  onClose: () => void;
}

export function CollectionModal({ open, hud, onClose }: CollectionModalProps) {
  if (!open) return null;

  const discoveredSet = new Set(hud.discoveredHistoricalIds);
  const lifetimeRounded = Math.floor(hud.lifetimeDistanceMetres);
  const progressPct = Math.min(
    100,
    Math.max(0, (hud.lifetimeDistanceMetres / hud.platinumThresholdMetres) * 100)
  );

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-5 bg-zinc-950/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="collection-modal-title"
    >
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-[#FFFDF7] border-2 border-zinc-900 shadow-[0_6px_0_#18181B] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 bg-[#FFF6E0] border-b-2 border-zinc-900 shrink-0">
          <div>
            <h2
              id="collection-modal-title"
              className="font-display font-extrabold text-lg sm:text-xl text-zinc-900"
            >
              Coins, Heritage & Platinum Milestone
            </h2>
            <p className="text-xs font-semibold text-zinc-600">
              Explore all 3 cities · Collect Heritage Coins at landmarks · Reach 916,000m on foot
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close collection modal"
            className="px-3 py-1.5 rounded-lg bg-[#FFFDF7] hover:bg-zinc-100 border-2 border-zinc-900 shadow-[0_2px_0_#18181B] text-xs font-extrabold text-zinc-900 cursor-pointer"
          >
            Close
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Platinum 916,000m Milestone Card */}
          <section
            aria-label="Platinum Distance Milestone"
            className={`p-4 rounded-xl border-2 border-zinc-900 ${
              hud.platinumUnlocked
                ? 'bg-gradient-to-r from-slate-100 via-sky-50 to-amber-50 shadow-[0_4px_0_#18181B]'
                : 'bg-slate-50'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {/* Platinum Crest SVG */}
                <svg viewBox="0 0 48 48" className="w-12 h-12 shrink-0" aria-hidden="true">
                  <polygon
                    points="24,3 42,13 42,35 24,45 6,35 6,13"
                    fill={hud.platinumUnlocked ? '#E2E8F0' : '#D4D4D8'}
                    stroke="#18181B"
                    strokeWidth="2.5"
                  />
                  <polygon
                    points="24,8 37,16 37,32 24,40 11,32 11,16"
                    fill={hud.platinumUnlocked ? '#F8FAFC' : '#E4E4E7'}
                    stroke={hud.platinumUnlocked ? '#0284C7' : '#71717A'}
                    strokeWidth="1.8"
                  />
                  <polygon
                    points="24,14 29,24 24,34 19,24"
                    fill={hud.platinumUnlocked ? '#38BDF8' : '#A1A1AA'}
                    stroke="#18181B"
                    strokeWidth="1.6"
                  />
                </svg>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display font-extrabold text-base sm:text-lg text-zinc-900">
                      Platinum Distance Badge
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border border-zinc-900 ${
                        hud.platinumUnlocked
                          ? 'bg-[#0284C7] text-white'
                          : 'bg-zinc-200 text-zinc-700'
                      }`}
                    >
                      {hud.platinumUnlocked ? 'Unlocked' : 'Locked · Distance Only'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs font-medium text-zinc-600">
                    Awarded exclusively for surpassing{' '}
                    <span className="font-mono-num font-bold text-zinc-900">
                      {hud.platinumThresholdMetres.toLocaleString()} m
                    </span>{' '}
                    (916 km) of genuine distance travelled across Dhaka, Chattagram & Sylhet.
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <div className="font-mono-num text-base sm:text-lg font-extrabold text-zinc-900">
                  {lifetimeRounded.toLocaleString()}m
                </div>
                <div className="font-mono-num text-[11px] font-bold text-zinc-500">
                  / {hud.platinumThresholdMetres.toLocaleString()}m ({progressPct.toFixed(2)}%)
                </div>
              </div>
            </div>

            <div className="mt-3 h-2.5 w-full rounded-full bg-zinc-200 border border-zinc-900 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  hud.platinumUnlocked ? 'bg-[#0284C7]' : 'bg-[#059669]'
                }`}
                style={{ width: `${Math.max(hud.platinumUnlocked ? 100 : 1.5, progressPct)}%` }}
              />
            </div>
          </section>

          {/* Four Coin Types Guide */}
          <section aria-label="Collectible Coin Types">
            <h3 className="font-display font-extrabold text-sm uppercase tracking-wider text-zinc-700 mb-2">
              Collectible Coin System
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* General Coin */}
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-amber-50/70 border-2 border-zinc-900">
                <svg viewBox="0 0 28 28" className="w-8 h-8 shrink-0" aria-hidden="true">
                  <circle cx="14" cy="14" r="11" fill="#F59E0B" stroke="#18181B" strokeWidth="2" />
                  <circle cx="14" cy="14" r="7.5" fill="#FDE68A" stroke="#B45309" strokeWidth="1.2" />
                  <circle cx="14" cy="14" r="2.5" fill="#059669" />
                </svg>
                <div className="text-xs">
                  <div className="font-extrabold text-zinc-900">General Coin</div>
                  <p className="text-zinc-600 leading-snug">
                    +1 Coin (+2 under 2X). Pulled smoothly by Magnet. Used to Bounce Back!
                  </p>
                </div>
              </div>

              {/* Historical Coin */}
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-rose-50/70 border-2 border-zinc-900">
                <svg viewBox="0 0 28 28" className="w-8 h-8 shrink-0" aria-hidden="true">
                  <polygon
                    points="14,2 22,5 26,14 22,23 14,26 6,23 2,14 6,5"
                    fill="#B45309"
                    stroke="#18181B"
                    strokeWidth="2"
                  />
                  <circle cx="14" cy="14" r="7" fill="#D92638" stroke="#FCD34D" strokeWidth="1.5" />
                  <polygon points="14,9 16,13 20,14 16,15 14,19 12,15 8,14 12,13" fill="#FFFDF7" />
                </svg>
                <div className="text-xs">
                  <div className="font-extrabold text-zinc-900">Historical Heritage Coin</div>
                  <p className="text-zinc-600 leading-snug">
                    +2 Gold at landmark gates. Rare & immune to 2X multiplier and Magnet.
                  </p>
                </div>
              </div>

              {/* 2X Coin */}
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-blue-50/70 border-2 border-zinc-900">
                <svg viewBox="0 0 28 28" className="w-8 h-8 shrink-0" aria-hidden="true">
                  <circle cx="14" cy="14" r="11" fill="#2563EB" stroke="#18181B" strokeWidth="2" />
                  <circle cx="14" cy="14" r="8" fill="#1D4ED8" stroke="#FCD34D" strokeWidth="1.4" />
                  <text
                    x="14"
                    y="17.5"
                    textAnchor="middle"
                    fill="#FFFDF7"
                    fontSize="9.5"
                    fontWeight="900"
                  >
                    2X
                  </text>
                </svg>
                <div className="text-xs">
                  <div className="font-extrabold text-zinc-900">2X Multiplier Coin</div>
                  <p className="text-zinc-600 leading-snug">
                    Doubles General Coin collection for 10 seconds across all lanes.
                  </p>
                </div>
              </div>

              {/* Magnet Coin */}
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-teal-50/70 border-2 border-zinc-900">
                <svg viewBox="0 0 28 28" className="w-8 h-8 shrink-0" aria-hidden="true">
                  <circle cx="14" cy="14" r="11" fill="#0D9488" stroke="#18181B" strokeWidth="2" />
                  <path
                    d="M9.5 10 v5 a4.5 4.5 0 0 0 9 0 v-5"
                    fill="none"
                    stroke="#DC2626"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />
                  <rect x="8" y="8.5" width="3" height="2.8" fill="#E2E8F0" />
                  <rect x="17" y="8.5" width="3" height="2.8" fill="#E2E8F0" />
                </svg>
                <div className="text-xs">
                  <div className="font-extrabold text-zinc-900">Magnet Coin</div>
                  <p className="text-zinc-600 leading-snug">
                    Pulls nearby General Coins smoothly toward your sack for 10 seconds.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Historical Heritage Coin Album */}
          <section aria-label="Historical Heritage Coins">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display font-extrabold text-sm uppercase tracking-wider text-zinc-700">
                Historical Heritage Coins ({hud.discoveredHistoricalIds.length}/
                {hud.totalHistoricalCount})
              </h3>
            </div>

            <div className="space-y-3">
              {MAP_IDS.map((mapId) => {
                const mapDef = MAPS[mapId];
                return (
                  <div key={mapId} className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-zinc-900">
                      <span className="font-bengali text-[#059669]">{mapDef.nameBn}</span>
                      <span>{mapDef.name}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {mapDef.landmarks.map((lm) => {
                        const found = discoveredSet.has(lm.id);
                        return (
                          <div
                            key={lm.id}
                            className={`p-2.5 rounded-xl border-2 transition-colors ${
                              found
                                ? 'bg-[#FFFDF7] border-zinc-900 shadow-[0_2px_0_#18181B]'
                                : 'bg-zinc-100 border-zinc-400 text-zinc-500'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-xs font-extrabold truncate text-zinc-900">
                                  {lm.name}
                                </div>
                                <div className="font-bengali text-[11px] font-bold text-[#059669] truncate">
                                  {lm.nameBn}
                                </div>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold shrink-0 border ${
                                  found
                                    ? 'bg-[#F59E0B] text-zinc-900 border-zinc-900'
                                    : 'bg-zinc-200 text-zinc-600 border-zinc-400'
                                }`}
                              >
                                {found ? 'Collected' : 'Undiscovered'}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] leading-snug text-zinc-600">
                              {found
                                ? lm.history
                                : `Hop past ${lm.name} in ${mapDef.name} to collect this Heritage Coin.`}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
