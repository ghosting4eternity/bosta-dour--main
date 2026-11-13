import type { HudSnapshot } from '../game/types';

interface StatusModalsProps {
  hud: HudSnapshot;
  onResume: () => void;
  onRestart: () => void;
  onReturnTitle: () => void;
  onRevive: () => void;
  onDeclineRevive: () => void;
  onOpenCollection: () => void;
}

export function StatusModals({
  hud,
  onResume,
  onRestart,
  onReturnTitle,
  onRevive,
  onDeclineRevive,
  onOpenCollection,
}: StatusModalsProps) {
  if (hud.phase === 'title' || hud.phase === 'playing') return null;

  const canAffordRevive = hud.coins >= hud.reviveCost;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-zinc-950/45">
      {hud.phase === 'paused' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pause-title"
          className="w-full max-w-sm rounded-2xl bg-[#FFFDF7] border-2 border-zinc-900 shadow-[0_6px_0_#18181B] p-6 text-center"
        >
          <h2 id="pause-title" className="font-display font-extrabold text-2xl text-zinc-900">
            Race Paused
          </h2>
          <p className="mt-1 text-sm font-medium text-zinc-600">
            {hud.mapName} · {hud.districtName} · {hud.distanceTiles}m
          </p>

          <div className="mt-6 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={onResume}
              className="w-full py-3 rounded-xl bg-[#059669] hover:bg-[#047857] text-[#FFFDF7] font-display font-bold text-base border-2 border-zinc-900 shadow-[0_3px_0_#18181B] cursor-pointer"
            >
              Resume
            </button>
            <button
              type="button"
              onClick={onRestart}
              className="w-full py-2.5 rounded-xl bg-[#F59E0B] hover:bg-amber-500 text-zinc-900 font-display font-bold text-sm border-2 border-zinc-900 shadow-[0_3px_0_#18181B] cursor-pointer"
            >
              Restart {hud.mapName}
            </button>
            <button
              type="button"
              onClick={onReturnTitle}
              className="w-full py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-semibold text-sm border-2 border-zinc-900 cursor-pointer"
            >
              Change Map (Title)
            </button>
          </div>
        </div>
      )}

      {hud.phase === 'revive' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="revive-title"
          className="w-full max-w-md rounded-2xl bg-[#FFFDF7] border-2 border-zinc-900 shadow-[0_6px_0_#18181B] p-6 text-center"
        >
          <h2 id="revive-title" className="font-display font-extrabold text-2xl text-[#D92638]">
            Bounce Back?
          </h2>
          <p className="mt-1.5 text-sm font-semibold text-zinc-700">
            {hud.deathReason}. Resume from <span className="font-bold text-zinc-900">{hud.lastCheckpointName}</span>!
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3 text-left">
            <div className="p-3 rounded-xl bg-amber-50 border-2 border-zinc-900">
              <div className="text-xs font-bold text-zinc-600">Revive Cost</div>
              <div className="font-mono-num text-xl font-extrabold text-zinc-900">
                {hud.reviveCost} Coins
              </div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 border-2 border-zinc-900">
              <div className="text-xs font-bold text-zinc-600">Your Coins</div>
              <div className="font-mono-num text-xl font-extrabold text-zinc-900">
                {hud.coins} Coins
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2.5">
            <button
              type="button"
              disabled={!canAffordRevive}
              onClick={onRevive}
              className={`w-full py-3 rounded-xl font-display font-extrabold text-base border-2 border-zinc-900 shadow-[0_3px_0_#18181B] ${
                canAffordRevive
                  ? 'bg-[#059669] hover:bg-[#047857] text-[#FFFDF7] cursor-pointer'
                  : 'bg-zinc-200 text-zinc-500 cursor-not-allowed shadow-none'
              }`}
            >
              {canAffordRevive
                ? `Bounce Back (-${hud.reviveCost} Coins)`
                : `Need ${hud.reviveCost - hud.coins} More Coins`}
            </button>
            <button
              type="button"
              onClick={onDeclineRevive}
              className="w-full py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-semibold text-sm border-2 border-zinc-900 cursor-pointer"
            >
              End Run
            </button>
          </div>
        </div>
      )}

      {hud.phase === 'gameover' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="gameover-title"
          className="w-full max-w-md rounded-2xl bg-[#FFFDF7] border-2 border-zinc-900 shadow-[0_6px_0_#18181B] p-6 text-center"
        >
          <h2 id="gameover-title" className="font-display font-extrabold text-2xl text-[#D92638]">
            Sack Tumbled
          </h2>
          <p className="mt-1 text-sm font-semibold text-zinc-700">
            {hud.mapName} · {hud.deathReason || 'Watch the road hazards ahead!'}
          </p>

          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2.5 rounded-xl bg-amber-50 border-2 border-zinc-900">
              <div className="text-xs font-bold text-zinc-600">Score</div>
              <div className="font-mono-num text-lg font-extrabold text-zinc-900">
                {hud.score}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-50 border-2 border-zinc-900">
              <div className="text-xs font-bold text-zinc-600">Distance</div>
              <div className="font-mono-num text-lg font-extrabold text-zinc-900">
                {hud.distanceTiles}m
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 border-2 border-zinc-900">
              <div className="text-xs font-bold text-zinc-600">Gold</div>
              <div className="font-mono-num text-lg font-extrabold text-zinc-900">
                {hud.gold}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 border-2 border-zinc-900">
              <div className="text-xs font-bold text-zinc-600">Coins</div>
              <div className="font-mono-num text-lg font-extrabold text-zinc-900">
                {hud.coins}
              </div>
            </div>
          </div>

          <div className="mt-3 px-3 py-2 rounded-xl bg-slate-50 border border-zinc-300 flex items-center justify-between text-xs font-bold text-zinc-700">
            <span>
              Heritage: <span className="font-mono-num text-zinc-900">{hud.discoveredHistoricalIds.length}/{hud.totalHistoricalCount}</span>
            </span>
            <span>
              Lifetime:{' '}
              <span className="font-mono-num text-zinc-900">
                {Math.floor(hud.lifetimeDistanceMetres).toLocaleString()}m
              </span>
              {hud.platinumUnlocked && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded bg-[#0284C7] text-white text-[10px]">
                  PLATINUM
                </span>
              )}
            </span>
          </div>

          <div className="mt-5 flex flex-col gap-2.5">
            <button
              type="button"
              data-start="true"
              onClick={onRestart}
              className="w-full py-3 rounded-xl bg-[#D92638] hover:bg-[#b91c2c] text-[#FFFDF7] font-display font-extrabold text-base border-2 border-zinc-900 shadow-[0_3px_0_#18181B] cursor-pointer"
            >
              Try {hud.mapName} Again
            </button>
            <button
              type="button"
              onClick={onOpenCollection}
              className="w-full py-2.5 rounded-xl bg-[#FFF6E0] hover:bg-amber-100 text-zinc-900 font-bold text-sm border-2 border-zinc-900 cursor-pointer"
            >
              Collection & Badges ({hud.discoveredHistoricalIds.length}/{hud.totalHistoricalCount})
            </button>
            <button
              type="button"
              onClick={onReturnTitle}
              className="w-full py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-semibold text-sm border-2 border-zinc-900 cursor-pointer"
            >
              Select Map (Title)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
