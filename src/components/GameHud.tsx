import { POWERUP_DURATION_SEC } from '../game/engine';
import type { HudSnapshot } from '../game/types';

interface GameHudProps {
  hud: HudSnapshot;
  muted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
}

export function GameHud({ hud, muted, onToggleMute, onPause }: GameHudProps) {
  const balancePct = Math.min(100, Math.max(0, Math.round(hud.speedMult * 100)));
  const isStumbling = hud.playerState === 'STUMBLE' || balancePct < 99;
  const platinumPct = Math.min(
    100,
    (hud.lifetimeDistanceMetres / hud.platinumThresholdMetres) * 100
  );

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-start p-3 sm:p-4">
      {/* Top perimeter HUD row inside upper sky band */}
      <div className="flex items-start justify-between gap-2 sm:gap-4">
        {/* Top-left: Score, Coins, Gold, Heritage & Locked Endless City / District */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-[#FFFDF7] border-2 border-zinc-900 shadow-[0_3px_0_#18181B]">
            {/* Score */}
            <div className="flex flex-col leading-none pr-1.5 border-r border-zinc-300" aria-label={`Score ${hud.score}`}>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">
                Score
              </span>
              <span className="font-mono-num text-base sm:text-lg font-extrabold text-zinc-900">
                {hud.score}
              </span>
            </div>

            {/* General Coins */}
            <div className="flex items-center gap-1" aria-label={`Coins ${hud.coins}`}>
              <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" aria-hidden="true">
                <circle cx="12" cy="12" r="9" fill="#F59E0B" stroke="#18181B" strokeWidth="2.2" />
                <ellipse cx="10.5" cy="10" rx="2.2" ry="3.6" fill="#FFFDF7" />
              </svg>
              <span className="font-mono-num text-base sm:text-lg font-bold text-zinc-900 leading-none">
                {hud.coins}
              </span>
            </div>

            <span className="text-zinc-300 font-bold" aria-hidden="true">/</span>

            {/* Gold & Historical Landmarks */}
            <div className="flex items-center gap-1" aria-label={`Gold ${hud.gold}`}>
              <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" aria-hidden="true">
                <polygon
                  points="12,2 15,8.5 22,9.5 17,14.5 18.2,21.5 12,18 5.8,21.5 7,14.5 2,9.5 9,8.5"
                  fill="#F59E0B"
                  stroke="#18181B"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="font-mono-num text-base sm:text-lg font-bold text-zinc-900 leading-none">
                {hud.gold}
              </span>
            </div>

            {/* Historical Heritage Coin Discovery Counter */}
            <div
              className="hidden sm:flex items-center gap-1 pl-1.5 border-l border-zinc-300"
              aria-label={`Heritage Coins ${hud.discoveredHistoricalIds.length} of ${hud.totalHistoricalCount}`}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden="true">
                <polygon
                  points="12,2 19,5 22,12 19,19 12,22 5,19 2,12 5,5"
                  fill="#B45309"
                  stroke="#18181B"
                  strokeWidth="2"
                />
                <circle cx="12" cy="12" r="5" fill="#D92638" />
              </svg>
              <span className="font-mono-num text-xs font-extrabold text-zinc-800 leading-none">
                {hud.discoveredHistoricalIds.length}/{hud.totalHistoricalCount}
              </span>
            </div>
          </div>

          {/* Locked Map, Current Neighborhood, Endless Distance & Platinum Progress */}
          <div className="px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-[#FFFDF7] border-2 border-zinc-900 shadow-[0_3px_0_#18181B] min-w-[190px] sm:min-w-[238px]">
            <div className="flex items-center justify-between gap-2 text-xs font-bold text-zinc-900">
              <span className="truncate">
                <span className="font-bengali text-[#059669] mr-1">{hud.mapNameBn}</span>
                <span>{hud.mapName}</span>
                <span className="text-zinc-500 mx-1">·</span>
                <span className="text-zinc-700">{hud.districtName}</span>
              </span>
              <span className="font-mono-num shrink-0">{hud.distanceTiles}m</span>
            </div>
            <div className="mt-0.5 flex items-center justify-between gap-2 text-[10px] font-bold text-zinc-500">
              <span className="font-bengali truncate">{hud.districtNameBn}</span>
              {hud.platinumUnlocked ? (
                <span className="px-1.5 py-0.2 rounded bg-[#0284C7] text-white uppercase tracking-wider shrink-0">
                  Platinum
                </span>
              ) : (
                <span className="font-mono-num text-zinc-600 shrink-0" title="Distance toward 916,000m Platinum Badge">
                  Pt {platinumPct.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Top-right: Active Power-ups (only when active) + Balance + Mute [M] + Pause [P] */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Active 2X Multiplier Pill */}
          {hud.doubleCoinsTimer > 0 && (
            <div
              role="status"
              aria-label={`2X Coins active ${Math.ceil(hud.doubleCoinsTimer)} seconds`}
              className="flex flex-col justify-center px-2.5 py-1 rounded-xl bg-[#2563EB] text-[#FFFDF7] border-2 border-zinc-900 shadow-[0_3px_0_#18181B] min-w-[78px]"
            >
              <div className="flex items-center justify-between gap-1.5 text-[11px] font-extrabold leading-tight">
                <span>2X</span>
                <span className="font-mono-num">{Math.ceil(hud.doubleCoinsTimer)}s</span>
              </div>
              <div className="mt-1 h-1 w-full rounded-full bg-blue-900/60 overflow-hidden">
                <div
                  className="h-full bg-[#FCD34D] origin-left"
                  style={{ transform: `scaleX(${Math.min(1, hud.doubleCoinsTimer / POWERUP_DURATION_SEC)})` }}
                />
              </div>
            </div>
          )}

          {/* Active Magnet Pill */}
          {hud.magnetTimer > 0 && (
            <div
              role="status"
              aria-label={`Magnet active ${Math.ceil(hud.magnetTimer)} seconds`}
              className="flex flex-col justify-center px-2.5 py-1 rounded-xl bg-[#0D9488] text-[#FFFDF7] border-2 border-zinc-900 shadow-[0_3px_0_#18181B] min-w-[88px]"
            >
              <div className="flex items-center justify-between gap-1.5 text-[11px] font-extrabold leading-tight">
                <span>MAGNET</span>
                <span className="font-mono-num">{Math.ceil(hud.magnetTimer)}s</span>
              </div>
              <div className="mt-1 h-1 w-full rounded-full bg-teal-950/60 overflow-hidden">
                <div
                  className="h-full bg-[#FDE68A] origin-left"
                  style={{ transform: `scaleX(${Math.min(1, hud.magnetTimer / POWERUP_DURATION_SEC)})` }}
                />
              </div>
            </div>
          )}

          {/* Balance / Bounce-Back Recovery Bar */}
          <div
            className={`hidden md:flex flex-col justify-center px-3 py-1.5 rounded-xl border-2 border-zinc-900 shadow-[0_3px_0_#18181B] min-w-[144px] ${
              isStumbling ? 'bg-[#FFF3E0]' : 'bg-[#FFFDF7]'
            }`}
            aria-label={`Balance ${balancePct}%`}
          >
            <div className="flex items-center justify-between gap-2 text-[11px] font-extrabold">
              <span className={isStumbling ? 'text-[#D92638]' : 'text-zinc-700'}>
                {isStumbling ? 'Bounce-Back' : 'Balance'}
              </span>
              <span className="font-mono-num text-zinc-900">{balancePct}%</span>
            </div>
            <div className="mt-1 h-1.5 w-full rounded-full bg-zinc-200 border border-zinc-900 overflow-hidden">
              <div
                className={`h-full origin-left ${isStumbling ? 'bg-[#D92638]' : 'bg-[#059669]'}`}
                style={{ transform: `scaleX(${balancePct / 100})` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleMute();
              }}
              aria-label={muted ? 'Unmute sound (M)' : 'Mute sound (M)'}
              title={muted ? 'Unmute (M)' : 'Mute (M)'}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#FFFDF7] hover:bg-amber-50 border-2 border-zinc-900 shadow-[0_3px_0_#18181B] flex items-center justify-center cursor-pointer text-zinc-900"
            >
              {muted ? (
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" strokeLinejoin="round" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" strokeLinejoin="round" />
                  <path d="M15.5 8.5a5 5 0 0 1 0 7" strokeLinecap="round" />
                  <path d="M19 5a9 9 0 0 1 0 14" strokeLinecap="round" />
                </svg>
              )}
            </button>

            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onPause();
              }}
              aria-label="Pause race (P)"
              title="Pause (P)"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#FFFDF7] hover:bg-amber-50 border-2 border-zinc-900 shadow-[0_3px_0_#18181B] flex items-center justify-center cursor-pointer text-zinc-900"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Transient sky-band notifications: stay in upper ~35% sky so road, obstacles & player stay unobstructed */}
      <div className="mt-2.5 flex flex-col items-center gap-2">
        {isStumbling && (
          <div className="md:hidden px-3 py-1 rounded-lg bg-[#D92638] text-[#FFFDF7] border-2 border-zinc-900 shadow-[0_2px_0_#18181B] text-xs font-bold font-mono-num">
            Bounce-Back ({balancePct}%)
          </div>
        )}

        {hud.achievementToast && (
          <div
            role="status"
            className="max-w-md w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-slate-100 via-sky-50 to-amber-50 border-2 border-zinc-900 shadow-[0_4px_0_#18181B] text-left"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-display font-extrabold text-sm sm:text-base text-zinc-900">
                {hud.achievementToast.title}
              </span>
              <span className="px-2 py-0.5 rounded bg-[#0284C7] text-white text-[10px] font-extrabold whitespace-nowrap">
                {hud.achievementToast.badge}
              </span>
            </div>
            <p className="mt-0.5 text-xs font-semibold text-zinc-700 leading-snug">
              {hud.achievementToast.subtitle}
            </p>
          </div>
        )}

        {hud.landmarkToast && (
          <div
            role="status"
            className="max-w-md w-full px-4 py-2 rounded-xl bg-[#FFFDF7] border-2 border-zinc-900 shadow-[0_4px_0_#18181B] text-left"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-display font-extrabold text-sm sm:text-base text-zinc-900">
                {hud.landmarkToast.name}
              </span>
              {hud.landmarkToast.badge && (
                <span className="text-[11px] font-extrabold text-[#059669] whitespace-nowrap">
                  {hud.landmarkToast.badge}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs font-medium text-zinc-700 leading-snug">
              {hud.landmarkToast.history}
            </p>
          </div>
        )}

        {hud.caption && (
          <div
            role="status"
            className={`max-w-md px-4 py-1.5 rounded-xl border-2 border-zinc-900 shadow-[0_3px_0_#18181B] text-center text-xs sm:text-sm font-bold ${
              hud.caption.kind === 'DEADLY'
                ? 'bg-[#D92638] text-[#FFFDF7]'
                : hud.caption.kind === 'STUMBLE'
                  ? 'bg-[#F59E0B] text-zinc-900'
                  : 'bg-[#059669] text-[#FFFDF7]'
            }`}
          >
            {hud.caption.text}
          </div>
        )}
      </div>
    </div>
  );
}
