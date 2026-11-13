import { useCallback, useEffect, useRef, useState } from 'react';
import { CollectionModal } from './components/CollectionModal';
import { GameHud } from './components/GameHud';
import { StatusModals } from './components/StatusModals';
import { TitleOverlay } from './components/TitleOverlay';
import { preloadGameAssets } from './game/assets';
import { soundEngine } from './game/audio';
import { BostaEngine, MAP_IDS } from './game/engine';
import { renderGame } from './game/renderer';
import type { HudSnapshot, MapId } from './game/types';

const SWIPE_THRESHOLD_PX = 34;
const TAP_MAX_MS = 260;

function bodyStateForPhase(phase: HudSnapshot['phase']): string {
  if (phase === 'title') return 'title';
  if (phase === 'playing') return 'playing';
  if (phase === 'paused') return 'paused';
  return 'gameover';
}

function hudChanged(prev: HudSnapshot, next: HudSnapshot): boolean {
  return (
    prev.phase !== next.phase ||
    prev.mapId !== next.mapId ||
    prev.lockedMapId !== next.lockedMapId ||
    prev.districtName !== next.districtName ||
    prev.score !== next.score ||
    prev.coins !== next.coins ||
    prev.gold !== next.gold ||
    prev.distanceTiles !== next.distanceTiles ||
    prev.playerState !== next.playerState ||
    prev.revivesUsed !== next.revivesUsed ||
    Math.round(prev.speedMult * 20) !== Math.round(next.speedMult * 20) ||
    Math.ceil(prev.doubleCoinsTimer * 4) !== Math.ceil(next.doubleCoinsTimer * 4) ||
    Math.ceil(prev.magnetTimer * 4) !== Math.ceil(next.magnetTimer * 4) ||
    prev.discoveredHistoricalIds.length !== next.discoveredHistoricalIds.length ||
    Math.floor(prev.lifetimeDistanceMetres) !== Math.floor(next.lifetimeDistanceMetres) ||
    prev.platinumUnlocked !== next.platinumUnlocked ||
    prev.caption?.text !== next.caption?.text ||
    prev.landmarkToast?.name !== next.landmarkToast?.name ||
    prev.achievementToast?.title !== next.achievementToast?.title ||
    Boolean(prev.caption) !== Boolean(next.caption) ||
    Boolean(prev.landmarkToast) !== Boolean(next.landmarkToast) ||
    Boolean(prev.achievementToast) !== Boolean(next.achievementToast)
  );
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<BostaEngine | null>(null);

  if (!engineRef.current) {
    engineRef.current = new BostaEngine({
      onHop: (high) => soundEngine.playHop(high),
      onLaneSwitch: () => soundEngine.playLaneSwitch(),
      onCoin: () => soundEngine.playCoin(),
      onHistoricalCoin: () => soundEngine.playHistoricalCoin(),
      onDouble2X: () => soundEngine.playDouble2X(),
      onMagnet: () => soundEngine.playMagnet(),
      onPlatinumUnlock: () => soundEngine.playPlatinumBadge(),
      onStumble: () => soundEngine.playStumble(),
      onCrash: () => soundEngine.playCrash(),
      onLandmark: () => soundEngine.playLandmark(),
      onRevive: () => soundEngine.playRevive(),
    });
  }

  const [selectedMap, setSelectedMap] = useState<MapId>('dhaka');
  const [muted, setMuted] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [hud, setHud] = useState<HudSnapshot>(() => engineRef.current!.getSnapshot());
  const selectedMapRef = useRef<MapId>(selectedMap);
  selectedMapRef.current = selectedMap;

  const syncHudImmediate = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const snap = engine.getSnapshot();
    document.body.dataset.state = bodyStateForPhase(snap.phase);
    document.body.dataset.mapId = snap.mapId;
    setHud(snap);
  }, []);

  const handleStart = useCallback(() => {
    soundEngine.unlock();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    const engine = engineRef.current;
    if (!engine) return;
    engine.startNewRun(selectedMapRef.current);
    syncHudImmediate();
    canvasRef.current?.focus();
  }, [syncHudImmediate]);

  const handleSelectMap = useCallback(
    (mapId: MapId) => {
      const engine = engineRef.current;
      if (!engine || engine.isMapLocked() || engine.phase !== 'title') return;
      setSelectedMap(mapId);
      selectedMapRef.current = mapId;
      engine.selectTitleMap(mapId);
      syncHudImmediate();
    },
    [syncHudImmediate]
  );

  const handlePause = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (engine.phase === 'playing') {
      engine.phase = 'paused';
      syncHudImmediate();
    } else if (engine.phase === 'paused') {
      engine.phase = 'playing';
      syncHudImmediate();
      canvasRef.current?.focus();
    }
  }, [syncHudImmediate]);

  const handleRestart = useCallback(() => {
    soundEngine.unlock();
    const engine = engineRef.current;
    if (!engine) return;
    engine.startNewRun(engine.lockedMapId ?? selectedMapRef.current);
    syncHudImmediate();
    canvasRef.current?.focus();
  }, [syncHudImmediate]);

  const handleReturnTitle = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.returnToTitle(selectedMapRef.current);
    syncHudImmediate();
  }, [syncHudImmediate]);

  const handleRevive = useCallback(() => {
    soundEngine.unlock();
    const engine = engineRef.current;
    if (!engine) return;
    if (engine.performRevive()) {
      syncHudImmediate();
      canvasRef.current?.focus();
    }
  }, [syncHudImmediate]);

  const handleDeclineRevive = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.declineRevive();
    syncHudImmediate();
  }, [syncHudImmediate]);

  const handleToggleMute = useCallback(() => {
    soundEngine.unlock();
    const next = soundEngine.toggleMute();
    setMuted(next);
  }, []);

  // Support ?autostart=1 and optional ?map=dhaka|chattogram|sylhet, preload sprite assets, and initial body state
  useEffect(() => {
    preloadGameAssets();
    const params = new URLSearchParams(window.location.search);
    const paramMap = params.get('map') as MapId | null;
    const validParamMap: MapId =
      paramMap && MAP_IDS.includes(paramMap) ? paramMap : 'dhaka';

    if (paramMap && MAP_IDS.includes(paramMap)) {
      setSelectedMap(validParamMap);
      selectedMapRef.current = validParamMap;
      engineRef.current?.selectTitleMap(validParamMap);
    }

    if (params.get('autostart') === '1') {
      engineRef.current?.startNewRun(validParamMap);
    }
    syncHudImmediate();
  }, [syncHudImmediate]);

  // Canvas ResizeObserver & 60fps simulation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const engine = engineRef.current;
    if (!canvas || !container || !engine) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let cssW = container.clientWidth || window.innerWidth;
    let cssH = container.clientHeight || window.innerHeight;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      cssW = Math.max(320, rect.width || window.innerWidth);
      cssH = Math.max(240, rect.height || window.innerHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    let rafId = 0;
    let lastTime = performance.now();
    let prevSnap = engine.getSnapshot();
    let lastRenderedPhase = engine.phase;
    let needsStaticRender = true;

    const frame = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;

      const prevPhase = engine.phase;
      engine.step(rawDt);

      const hasActiveFx =
        engine.trauma > 0.01 ||
        engine.hitFlashTimer > 0 ||
        engine.particles.some((p) => p.active);

      const isAnimatingPhase = engine.phase === 'title' || engine.phase === 'playing';
      if (isAnimatingPhase || hasActiveFx || prevPhase !== lastRenderedPhase || needsStaticRender) {
        renderGame(ctx, cssW, cssH, engine, now / 1000);
        lastRenderedPhase = engine.phase;
        needsStaticRender = false;
      }

      const nextSnap = engine.getSnapshot();
      if (hudChanged(prevSnap, nextSnap)) {
        prevSnap = nextSnap;
        document.body.dataset.state = bodyStateForPhase(nextSnap.phase);
        document.body.dataset.mapId = nextSnap.mapId;
        setHud(nextSnap);
        needsStaticRender = true;
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  // Unified Keyboard Input Router (edge-triggered actions)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;

      if (e.repeat) return;

      if (collectionOpen) {
        if (e.code === 'Escape') {
          e.preventDefault();
          setCollectionOpen(false);
        }
        return;
      }

      if (engine.phase === 'title') {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          handleStart();
        }
        return;
      }

      if (e.code === 'KeyM') {
        e.preventDefault();
        handleToggleMute();
        return;
      }

      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (engine.phase === 'playing' || engine.phase === 'paused') {
          e.preventDefault();
          handlePause();
        }
        return;
      }

      if (engine.phase !== 'playing') return;

      soundEngine.unlock();

      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        engine.requestHighHop();
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        engine.requestLaneSwitch(-1);
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        engine.requestLaneSwitch(1);
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        engine.requestFastFall();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [collectionOpen, handlePause, handleStart, handleToggleMute]);

  // Unified Touch & Pointer Gesture Router on canvas
  const touchStartRef = useRef<{ x: number; y: number; time: number; handled: boolean } | null>(
    null
  );

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const engine = engineRef.current;
    if (!engine || engine.phase !== 'playing') return;
    soundEngine.unlock();
    touchStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: performance.now(),
      handled: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const engine = engineRef.current;
    const start = touchStartRef.current;
    if (!engine || !start || start.handled || engine.phase !== 'playing') return;

    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;

    if (Math.abs(dx) >= SWIPE_THRESHOLD_PX && Math.abs(dx) > Math.abs(dy)) {
      start.handled = true;
      engine.requestLaneSwitch(dx > 0 ? 1 : -1);
    } else if (dy >= SWIPE_THRESHOLD_PX && Math.abs(dy) > Math.abs(dx)) {
      start.handled = true;
      engine.requestFastFall();
    } else if (dy <= -SWIPE_THRESHOLD_PX && Math.abs(dy) > Math.abs(dx)) {
      start.handled = true;
      engine.requestHighHop();
    }
  };

  const onPointerUp = () => {
    const engine = engineRef.current;
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!engine || !start || start.handled || engine.phase !== 'playing') return;

    if (performance.now() - start.time <= TAP_MAX_MS) {
      engine.requestHighHop();
    }
  };

  return (
    <main
      id="game-shell"
      data-phase={hud.phase}
      className="relative w-full h-full overflow-hidden bg-[#F6EFE0]"
    >
      <div ref={containerRef} className="w-full h-full">
        <canvas
          ref={canvasRef}
          data-testid="game-canvas"
          tabIndex={0}
          aria-label="BOUNCE BACK 2D street runner canvas"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            touchStartRef.current = null;
          }}
          className="block w-full h-full outline-none touch-none"
        />
      </div>

      {hud.phase === 'title' && (
        <TitleOverlay
          selectedMap={selectedMap}
          onSelectMap={handleSelectMap}
          onStart={handleStart}
          onOpenCollection={() => setCollectionOpen(true)}
          bestDistance={hud.bestDistance}
          discoveredHistoricalCount={hud.discoveredHistoricalIds.length}
          totalHistoricalCount={hud.totalHistoricalCount}
          platinumUnlocked={hud.platinumUnlocked}
        />
      )}

      {hud.phase !== 'title' && (
        <GameHud
          hud={hud}
          muted={muted}
          onToggleMute={handleToggleMute}
          onPause={handlePause}
        />
      )}

      <StatusModals
        hud={hud}
        onResume={handlePause}
        onRestart={handleRestart}
        onReturnTitle={handleReturnTitle}
        onRevive={handleRevive}
        onDeclineRevive={handleDeclineRevive}
        onOpenCollection={() => setCollectionOpen(true)}
      />

      <CollectionModal
        open={collectionOpen}
        hud={hud}
        onClose={() => setCollectionOpen(false)}
      />
    </main>
  );
}
