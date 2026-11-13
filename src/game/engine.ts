import {
  createLandmarkGates,
  DHAKA_LANDMARK_GATES,
  type GoldAwardStatus,
  type GroundCoordinates,
  LandmarkGate,
  type LandmarkGateData,
  type LandmarkGateResource,
  type LandmarkGateStyle,
} from './landmarks';
import { MAP_IDS, MAPS } from './maps';
import { PALETTE } from './palette';
import {
  LocalStorageProgressAdapter,
  PLATINUM_DISTANCE_THRESHOLD_M,
  type PersistentProgress,
  type ProgressStorageAdapter,
} from './persistence';
import {
  BUILDING_SLOT_SPACING_X,
  getPermanentShopForSlot,
  type ShopIdentity,
} from './shops';
import type {
  AchievementToast,
  CaptionPopup,
  CoinEntity,
  DistrictSegmentDef,
  GamePhase,
  HudSnapshot,
  LandmarkToast,
  LaneIndex,
  MapDef,
  MapId,
  ObstacleEntity,
  ObstacleKind,
  Particle,
  PlayerState,
  PropEntity,
  PropKind,
} from './types';
import {
  getDistrictInfrastructureProfile,
  MAP_DISTRICTS,
  sampleEnvironmentAt,
} from './worldSegments';

export {
  BUILDING_SLOT_SPACING_X,
  createLandmarkGates,
  DHAKA_LANDMARK_GATES,
  getPermanentShopForSlot,
  LandmarkGate,
  MAP_IDS,
  type GoldAwardStatus,
  type GroundCoordinates,
  type LandmarkGateData,
  type LandmarkGateResource,
  type LandmarkGateStyle,
  type ShopIdentity,
};

// Physics & feel constants
export const GRAVITY = 1520;
export const AUTO_HOP_VZ = 405;
export const HIGH_HOP_VZ = 615;
export const FAST_FALL_VZ = -860;
export const LANE_LERP_SPEED = 14;
export const PLAYER_HALF_X = 0.26;

export const OBSTACLE_CONFIG: Record<
  ObstacleKind,
  { footprintX: number; height: number; deathLabel: string; captions: string[] }
> = {
  POTHOLE: {
    footprintX: 0.56,
    height: 18,
    deathLabel: 'Tripped in a pothole',
    captions: [
      'Monsoon potholes slow every journey—mind your step!',
      'Broken asphalt hits hard—watch for potholes ahead!',
    ],
  },
  MANHOLE: {
    footprintX: 0.62,
    height: 44,
    deathLabel: 'Fell into an open manhole',
    captions: [
      'Open manholes: a real danger on our roads.',
      'Missing manhole covers turn daily walks into hazards.',
    ],
  },
  BUS: {
    footprintX: 1.5,
    height: 145,
    deathLabel: 'Hit by a speeding bus',
    captions: [
      'Reckless bus overtaking leaves zero room on the road.',
      'Speeding city buses claim the lane—dodge sideways!',
    ],
  },
  TRUCK: {
    footprintX: 1.45,
    height: 140,
    deathLabel: 'Blocked by a cargo truck',
    captions: [
      'Overloaded cargo trucks rumble through tight city corridors!',
      'Watch the lane—highway trucks take wide turns!',
    ],
  },
  CNG_TRAFFIC: {
    footprintX: 0.95,
    height: 92,
    deathLabel: 'Collided with a weaving CNG',
    captions: [
      'CNG auto-rickshaws weave sharply through traffic gaps!',
      'Sudden lane switches by CNGs demand quick reflexes.',
    ],
  },
  CAR: {
    footprintX: 1.1,
    height: 82,
    deathLabel: 'Collided with a sedan',
    captions: [
      'Double-parked commuter cars squeeze busy intersections!',
      'Peak-hour gridlock leaves narrow escape lanes.',
    ],
  },
  MOTORCYCLE: {
    footprintX: 0.72,
    height: 86,
    deathLabel: 'Clipped by a weaving motorbike',
    captions: [
      'Motorbikes darting between lanes catch walkers off-guard!',
      'Keep clear of fast commuter bikes weaving down the road.',
    ],
  },
};

export interface GameEvents {
  onHop?: (high: boolean) => void;
  onLaneSwitch?: () => void;
  onCoin?: () => void;
  onHistoricalCoin?: () => void;
  onDouble2X?: () => void;
  onMagnet?: () => void;
  onPlatinumUnlock?: () => void;
  onStumble?: () => void;
  onCrash?: () => void;
  onLandmark?: () => void;
  onRevive?: () => void;
}

export const POWERUP_DURATION_SEC = 10;
export const MAGNET_RADIUS_X = 7.5;
export const MAGNET_RADIUS_Y = 2.3;
export const HISTORICAL_COIN_GOLD_AWARD = 2;

export function getTotalHistoricalCatalogCount(): number {
  return MAP_IDS.reduce((sum, id) => sum + MAPS[id].landmarks.length, 0);
}

const PARTICLE_POOL_SIZE = 96;

export class BostaEngine {
  public phase: GamePhase = 'title';
  public lockedMapId: MapId | null = null;
  public currentMap: MapDef = MAPS.dhaka;
  public currentDistrict: DistrictSegmentDef = MAP_DISTRICTS.dhaka[0];

  // Player state in ground space
  public playerX = 0;
  public lane: LaneIndex = 0;
  public lanePos = 0;
  public z = 0;
  public vz = AUTO_HOP_VZ;
  public playerState: PlayerState = 'HOP';
  public scaleX = 1;
  public scaleY = 1;

  // Input buffers
  private hopBufferTimer = 0;
  private fastFallRequested = false;

  // Progression & bounce-back state
  public coins = 0;
  public gold = 0;
  public totalDistanceRun = 0;
  public lastCheckpointX = 0;
  public lastCheckpointId = 'start';
  public lastCheckpointName = 'Start Line';
  public triggeredCheckpointIds: string[] = [];
  public triggeredHistoricalGateIds: string[] = [];
  public revivesUsed = 0;
  public bestDistance = 0;

  // Power-ups & persistent milestone state
  public doubleCoinsTimer = 0;
  public magnetTimer = 0;
  public lifetimeDistanceMetres = 0;
  public platinumUnlocked = false;
  public platinumUnlockedAt: string | null = null;
  public discoveredHistoricalIds: string[] = [];
  public totalCoinsCollectedLifetime = 0;

  // Speed & recovery timers
  public speedMult = 1;
  private stumbleHoldTimer = 0;
  private stumbleRecoverTimer = 0;
  public invulnTimer = 0;
  private deathDelayTimer = 0;
  public deathReason = '';

  // Camera & juice
  public hitstopTimer = 0;
  public trauma = 0;
  public hitFlashTimer = 0;
  public titleScrollX = 0;

  // World entities
  public obstacles: ObstacleEntity[] = [];
  public coinItems: CoinEntity[] = [];
  public landmarks: LandmarkGate[] = [];
  public props: PropEntity[] = [];
  public particles: Particle[] = [];

  // UI notifications
  public caption: CaptionPopup | null = null;
  public landmarkToast: LandmarkToast | null = null;
  public achievementToast: AchievementToast | null = null;

  private nextEntityId = 1;
  private spawnedUntilX = 0;
  private nextPropSlotIndex = -2;
  private nextLandmarkCycle = 0;
  private nextDoubleSpawnX = 62;
  private nextMagnetSpawnX = 88;
  private particleCursor = 0;
  private rngSeed = 1337;
  private events: GameEvents;
  private lastDistrictId = '';
  private progressStorage: ProgressStorageAdapter;
  private unsavedDistanceAccum = 0;

  constructor(events: GameEvents = {}, progressStorage?: ProgressStorageAdapter) {
    this.events = events;
    this.progressStorage = progressStorage ?? new LocalStorageProgressAdapter();
    const saved = this.progressStorage.load();
    this.lifetimeDistanceMetres = saved.lifetimeDistanceMetres;
    this.bestDistance = saved.bestSingleRunMetres;
    this.platinumUnlocked = saved.platinumUnlocked;
    this.platinumUnlockedAt = saved.platinumUnlockedAt;
    this.discoveredHistoricalIds = [...saved.discoveredHistoricalIds];
    this.totalCoinsCollectedLifetime = saved.totalCoinsCollected;

    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      this.particles.push({
        active: false,
        groundX: 0,
        groundY: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.4,
        size: 4,
        color: PALETTE.marigoldGold,
      });
    }
    this.setupMap('dhaka', true);
  }

  private persistProgress(): void {
    const data: PersistentProgress = {
      lifetimeDistanceMetres: this.lifetimeDistanceMetres,
      bestSingleRunMetres: this.bestDistance,
      platinumUnlocked: this.platinumUnlocked,
      platinumUnlockedAt: this.platinumUnlockedAt,
      discoveredHistoricalIds: [...this.discoveredHistoricalIds],
      totalCoinsCollected: this.totalCoinsCollectedLifetime,
    };
    this.progressStorage.save(data);
  }

  public isMapLocked(): boolean {
    return (
      this.lockedMapId !== null &&
      (this.phase === 'playing' || this.phase === 'paused' || this.phase === 'revive')
    );
  }

  private nextRandom(): number {
    this.rngSeed = (this.rngSeed * 1664525 + 1013904223) >>> 0;
    return this.rngSeed / 4294967296;
  }

  public startNewRun(startMapId: MapId = 'dhaka'): void {
    const validMapId: MapId = MAPS[startMapId] ? startMapId : 'dhaka';
    this.coins = 0;
    this.gold = 0;
    this.totalDistanceRun = 0;
    this.doubleCoinsTimer = 0;
    this.magnetTimer = 0;
    this.revivesUsed = 0;
    this.deathReason = '';
    this.achievementToast = null;
    this.unsavedDistanceAccum = 0;
    this.lockedMapId = validMapId;
    this.setupMap(validMapId, false);
    this.phase = 'playing';
  }

  public returnToTitle(previewMapId?: MapId): void {
    this.persistProgress();
    const targetMap = previewMapId && MAPS[previewMapId] ? previewMapId : this.currentMap.id;
    this.lockedMapId = null;
    this.phase = 'title';
    this.setupMap(targetMap, true);
  }

  public selectTitleMap(mapId: MapId): boolean {
    if (this.phase !== 'title' || this.isMapLocked()) {
      return false;
    }
    if (!MAPS[mapId]) return false;
    this.setupMap(mapId, true);
    return true;
  }

  public setupMap(mapId: MapId, isTitlePreview: boolean): void {
    // Enforce map lock while a run is active
    if (!isTitlePreview && this.isMapLocked() && this.lockedMapId && mapId !== this.lockedMapId) {
      return;
    }

    const mapIndex = MAP_IDS.indexOf(mapId);
    this.currentMap = MAPS[mapId];
    this.currentDistrict = MAP_DISTRICTS[mapId][0];
    this.lastDistrictId = this.currentDistrict.id;
    this.rngSeed = 4099 + Math.max(0, mapIndex) * 7919;
    this.playerX = 0;
    this.lane = 0;
    this.lanePos = 0;
    this.z = 0;
    this.vz = AUTO_HOP_VZ;
    this.playerState = 'HOP';
    this.scaleX = 1;
    this.scaleY = 1;
    this.speedMult = 1;
    this.stumbleHoldTimer = 0;
    this.stumbleRecoverTimer = 0;
    this.invulnTimer = 0;
    this.deathDelayTimer = 0;
    this.hitstopTimer = 0;
    this.trauma = 0;
    this.hitFlashTimer = 0;
    this.hopBufferTimer = 0;
    this.fastFallRequested = false;
    this.titleScrollX = 0;
    this.lastCheckpointX = 0;
    this.lastCheckpointId = `${mapId}_start`;
    this.lastCheckpointName = `${this.currentMap.name} Start`;
    this.triggeredCheckpointIds = [];
    this.triggeredHistoricalGateIds = [];
    this.caption = null;
    this.landmarkToast = isTitlePreview
      ? null
      : {
          name: `${this.currentMap.nameBn} · ${this.currentMap.name}`,
          history: `${this.currentDistrict.nameBn} (${this.currentDistrict.name}) — ${this.currentDistrict.subtitle}`,
          badge: 'Endless City · Locked',
          timer: 3.0,
        };

    this.obstacles = [];
    this.coinItems = [];
    this.props = [];
    this.landmarks = [];
    this.nextLandmarkCycle = 0;
    this.nextDoubleSpawnX = 62;
    this.nextMagnetSpawnX = 88;
    this.spawnedUntilX = 6;
    this.nextPropSlotIndex = -2;
    this.clearParticles();

    if (!isTitlePreview) {
      this.ensureLandmarksAhead(this.currentMap.cycleLengthTiles);
      this.ensurePropsAhead(44);
      this.ensureWorldAhead(36);
    } else {
      this.ensurePropsAhead(44);
    }
  }

  private clearParticles(): void {
    for (const p of this.particles) {
      p.active = false;
    }
  }

  public spawnParticles(
    groundX: number,
    groundY: number,
    z: number,
    count: number,
    color: string,
    speed = 1.6
  ): void {
    for (let i = 0; i < count; i++) {
      const p = this.particles[this.particleCursor];
      this.particleCursor = (this.particleCursor + 1) % PARTICLE_POOL_SIZE;
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const spd = speed * (0.45 + Math.random() * 0.75);
      p.active = true;
      p.groundX = groundX;
      p.groundY = groundY;
      p.z = z;
      p.vx = Math.cos(angle) * spd * 0.4;
      p.vy = Math.sin(angle) * spd * 0.7;
      p.vz = 90 + Math.random() * 140;
      p.maxLife = 0.34 + Math.random() * 0.28;
      p.life = p.maxLife;
      p.size = 4 + Math.random() * 4;
      p.color = color;
    }
  }

  public requestHighHop(): void {
    if (this.phase !== 'playing' || this.playerState === 'DEAD') return;
    if (this.z < 28 && this.vz > 0 && this.vz < HIGH_HOP_VZ * 0.9) {
      this.vz = HIGH_HOP_VZ;
      this.scaleX = 0.84;
      this.scaleY = 1.18;
      this.hopBufferTimer = 0;
      this.events.onHop?.(true);
      this.spawnParticles(this.playerX, this.lanePos, this.z + 6, 5, PALETTE.chalkWhite, 1.1);
    } else {
      this.hopBufferTimer = 0.16;
    }
  }

  public requestLaneSwitch(delta: -1 | 1): void {
    if (this.phase !== 'playing' || this.playerState === 'DEAD') return;
    const next = Math.max(-1, Math.min(1, this.lane + delta)) as LaneIndex;
    if (next !== this.lane) {
      this.lane = next;
      this.events.onLaneSwitch?.();
    }
  }

  public requestFastFall(): void {
    if (this.phase !== 'playing' || this.playerState === 'DEAD') return;
    if (this.z > 4) {
      this.vz = Math.min(this.vz, FAST_FALL_VZ);
      this.fastFallRequested = true;
    }
  }

  public getReviveCost(): number {
    return 10 + this.revivesUsed * 5;
  }

  public canRevive(): boolean {
    return (
      this.phase === 'revive' &&
      this.lastCheckpointX > 0 &&
      this.coins >= this.getReviveCost()
    );
  }

  public performRevive(): boolean {
    if (!this.canRevive()) return false;
    this.coins -= this.getReviveCost();
    this.revivesUsed += 1;
    this.playerX = Math.max(0, this.lastCheckpointX - 1);
    this.lane = 0;
    this.lanePos = 0;
    this.z = 0;
    this.vz = AUTO_HOP_VZ;
    this.playerState = 'HOP';
    this.speedMult = 1;
    this.invulnTimer = 2.0;
    this.deathDelayTimer = 0;
    this.caption = {
      text: `Bounced back at ${this.lastCheckpointName}!`,
      kind: 'INFO',
      timer: 2.6,
    };
    this.obstacles = this.obstacles.filter(
      (o) => o.groundX < this.playerX - 2 || o.groundX > this.playerX + 7
    );
    this.phase = 'playing';
    this.events.onRevive?.();
    this.spawnParticles(this.playerX, this.lanePos, 10, 18, PALETTE.emeraldGreen, 1.8);
    return true;
  }

  public declineRevive(): void {
    if (this.phase === 'revive') {
      this.persistProgress();
      this.lockedMapId = null;
      this.phase = 'gameover';
    }
  }

  public step(rawDt: number): void {
    const dt = Math.min(rawDt, 0.05);

    this.updateParticles(dt);
    this.trauma = Math.max(0, this.trauma - dt * 1.8);
    this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt);

    if (this.caption) {
      this.caption.timer -= dt;
      if (this.caption.timer <= 0) this.caption = null;
    }
    if (this.landmarkToast) {
      this.landmarkToast.timer -= dt;
      if (this.landmarkToast.timer <= 0) this.landmarkToast = null;
    }
    if (this.achievementToast) {
      this.achievementToast.timer -= dt;
      if (this.achievementToast.timer <= 0) this.achievementToast = null;
    }

    if (this.phase === 'title') {
      this.titleScrollX += 2.6 * dt;
      const env = sampleEnvironmentAt(this.currentMap.id, this.titleScrollX);
      this.currentDistrict = env.district;
      this.ensurePropsAhead(this.titleScrollX + 44);
      this.props = this.props.filter((p) => p.groundX > this.titleScrollX - 6.0);
      this.vz -= GRAVITY * dt;
      this.z += this.vz * dt;
      if (this.z <= 0) {
        this.z = 0;
        this.vz = AUTO_HOP_VZ;
        this.scaleX = 1.2;
        this.scaleY = 0.8;
      }
      this.scaleX += (1 - this.scaleX) * Math.min(1, dt * 12);
      this.scaleY += (1 - this.scaleY) * Math.min(1, dt * 12);
      return;
    }

    if (this.phase !== 'playing') return;

    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      return;
    }

    if (this.playerState === 'DEAD') {
      this.deathDelayTimer -= dt;
      this.scaleX += (1.15 - this.scaleX) * Math.min(1, dt * 10);
      this.scaleY += (0.72 - this.scaleY) * Math.min(1, dt * 10);
      if (this.deathDelayTimer <= 0) {
        this.persistProgress();
        if (this.lastCheckpointX > 0) {
          this.phase = 'revive';
        } else {
          this.lockedMapId = null;
          this.phase = 'gameover';
        }
      }
      return;
    }

    if (this.hopBufferTimer > 0) this.hopBufferTimer -= dt;
    if (this.invulnTimer > 0) this.invulnTimer -= dt;
    if (this.doubleCoinsTimer > 0) {
      this.doubleCoinsTimer = Math.max(0, this.doubleCoinsTimer - dt);
    }
    if (this.magnetTimer > 0) {
      this.magnetTimer = Math.max(0, this.magnetTimer - dt);
    }

    if (this.playerState === 'STUMBLE') {
      if (this.stumbleHoldTimer > 0) {
        this.stumbleHoldTimer -= dt;
        this.speedMult = 0.6;
      } else if (this.stumbleRecoverTimer > 0) {
        this.stumbleRecoverTimer = Math.max(0, this.stumbleRecoverTimer - dt);
        const progress = 1 - this.stumbleRecoverTimer / 2.0;
        this.speedMult = 0.6 + 0.4 * progress;
      } else {
        this.speedMult = 1.0;
        this.playerState = 'HOP';
      }
    }

    this.lanePos += (this.lane - this.lanePos) * Math.min(1, dt * LANE_LERP_SPEED);

    const ramp =
      1 + Math.min(0.42, (this.playerX / (this.currentMap.cycleLengthTiles * 1.5)) * 0.42);
    const speedTilesPerSec = this.currentMap.baseSpeed * ramp * this.speedMult;
    const dx = speedTilesPerSec * dt;
    this.playerX += dx;
    this.totalDistanceRun += dx;
    this.bestDistance = Math.max(this.bestDistance, Math.round(this.totalDistanceRun));
    this.advanceGenuineDistance(dx);

    // Update active neighborhood within the locked endless map (never transitions to another city)
    const env = sampleEnvironmentAt(this.currentMap.id, this.playerX);
    this.currentDistrict = env.district;
    if (env.district.id !== this.lastDistrictId) {
      this.lastDistrictId = env.district.id;
      this.lastCheckpointX = Math.max(this.lastCheckpointX, Math.floor(this.playerX));
      this.lastCheckpointId = `district_${this.currentMap.id}_${env.district.id}_${Math.floor(this.playerX / this.currentMap.cycleLengthTiles)}`;
      this.lastCheckpointName = `${env.district.name} (${this.currentMap.name})`;
      if (!this.landmarkToast) {
        this.landmarkToast = {
          name: `${env.district.nameBn} · ${env.district.name}`,
          history: env.district.subtitle,
          badge: this.currentMap.name,
          timer: 2.8,
        };
      }
    }

    this.vz -= GRAVITY * dt;
    this.z += this.vz * dt;
    if (this.z <= 0) {
      this.z = 0;
      const wasFastFall = this.fastFallRequested;
      this.fastFallRequested = false;

      if (this.hopBufferTimer > 0) {
        this.vz = HIGH_HOP_VZ;
        this.hopBufferTimer = 0;
        this.scaleX = 0.84;
        this.scaleY = 1.18;
        this.events.onHop?.(true);
        this.spawnParticles(this.playerX, this.lanePos, 2, 6, PALETTE.chalkWhite, 1.2);
      } else {
        this.vz = AUTO_HOP_VZ;
        this.scaleX = wasFastFall ? 1.32 : 1.22;
        this.scaleY = wasFastFall ? 0.68 : 0.78;
        this.events.onHop?.(false);
        this.spawnParticles(
          this.playerX,
          this.lanePos,
          2,
          wasFastFall ? 7 : 3,
          PALETTE.juteSack,
          0.9
        );
      }
    }

    this.scaleX += (1 - this.scaleX) * Math.min(1, dt * 11);
    this.scaleY += (1 - this.scaleY) * Math.min(1, dt * 11);

    for (const obs of this.obstacles) {
      if (obs.vx !== 0) {
        obs.groundX += obs.vx * dt;
      }
    }

    if (this.magnetTimer > 0) {
      this.updateMagnetAttraction(dt);
    }

    this.checkCoins();
    this.checkObstacles();
    this.checkLandmarks();

    this.ensureLandmarksAhead(this.playerX + 60);
    this.ensurePropsAhead(this.playerX + 44);
    this.ensureWorldAhead(this.playerX + 34);
    this.cullBehind(this.playerX - 3.5);
  }

  /**
   * Advances real world-distance travelled independently of score/coins and awards Platinum Badge strictly after > 916,000m.
   */
  public advanceGenuineDistance(metresDelta: number): void {
    if (metresDelta <= 0 || !Number.isFinite(metresDelta)) return;
    this.lifetimeDistanceMetres += metresDelta;
    this.unsavedDistanceAccum += metresDelta;

    if (!this.platinumUnlocked && this.lifetimeDistanceMetres > PLATINUM_DISTANCE_THRESHOLD_M) {
      this.platinumUnlocked = true;
      this.platinumUnlockedAt = new Date().toISOString();
      this.achievementToast = {
        title: 'Platinum Badge Unlocked!',
        subtitle: 'Journeyed over 916,000 metres (916 km) across Bangladesh!',
        badge: 'PLATINUM · 916 KM',
        timer: 6.5,
      };
      this.events.onPlatinumUnlock?.();
      this.spawnParticles(this.playerX, this.lanePos, this.z + 45, 24, '#E2E8F0', 2.4);
      this.spawnParticles(this.playerX, this.lanePos, this.z + 55, 16, PALETTE.marigoldGold, 2.0);
      this.persistProgress();
      this.unsavedDistanceAccum = 0;
    } else if (this.unsavedDistanceAccum >= 25) {
      this.persistProgress();
      this.unsavedDistanceAccum = 0;
    }
  }

  private updateMagnetAttraction(dt: number): void {
    const pullRate = 14.5;
    for (const c of this.coinItems) {
      if (c.collected || c.kind !== 'GENERAL') continue;
      const curLat = c.lanePos ?? c.lane;
      const dx = this.playerX - c.groundX;
      const dy = this.lanePos - curLat;

      const withinRange =
        c.attracted ||
        (c.groundX >= this.playerX - 1.0 &&
          c.groundX <= this.playerX + MAGNET_RADIUS_X &&
          Math.abs(dy) <= MAGNET_RADIUS_Y);

      if (!withinRange) continue;
      c.attracted = true;

      const dist = Math.hypot(dx, dy);
      if (dist > 0.01) {
        const stepDist = Math.min(dist, pullRate * dt);
        c.groundX += (dx / dist) * stepDist;
        c.lanePos = curLat + (dy / dist) * stepDist;
      } else {
        c.groundX = this.playerX;
        c.lanePos = this.lanePos;
      }

      // Smoothly lift coin over nearby obstacles along pull trajectory rather than clipping through vehicles
      let targetZ = Math.max(14, this.z + 14);
      for (const obs of this.obstacles) {
        if (
          Math.abs(obs.groundX - c.groundX) < 1.25 &&
          Math.abs(obs.lane - (c.lanePos ?? c.lane)) < 0.65
        ) {
          targetZ = Math.max(targetZ, obs.height * 0.78);
        }
      }
      c.z += (targetZ - c.z) * Math.min(1, dt * 10);
    }
  }

  private checkCoins(): void {
    for (const c of this.coinItems) {
      if (c.collected) continue;
      const lat = c.lanePos ?? c.lane;
      const latTol = c.attracted ? 0.65 : 0.45;
      const xTol = c.attracted ? 0.65 : 0.48;
      if (
        Math.abs(this.lanePos - lat) < latTol &&
        Math.abs(this.playerX - c.groundX) < xTol &&
        Math.abs(this.z - c.z) < (c.attracted ? 62 : 42)
      ) {
        c.collected = true;

        if (c.kind === 'HISTORICAL') {
          const gateKey = `${c.landmarkId ?? 'lm'}_${Math.round(c.groundX)}`;
          const alreadyAwardedThisInstance = this.triggeredHistoricalGateIds.includes(gateKey);
          if (!alreadyAwardedThisInstance) {
            this.triggeredHistoricalGateIds.push(gateKey);
            const goldAward = c.goldValue ?? HISTORICAL_COIN_GOLD_AWARD;
            this.gold += goldAward;
            if (c.landmarkId && !this.discoveredHistoricalIds.includes(c.landmarkId)) {
              this.discoveredHistoricalIds.push(c.landmarkId);
            }
            this.persistProgress();
            this.landmarkToast = {
              name: `Heritage Coin · ${c.landmarkNameBn ?? c.landmarkName ?? 'Landmark'}`,
              history: `Discovered ${c.landmarkName ?? 'historical heritage site'} collectible coin!`,
              badge: `+${goldAward} Gold · Heritage Coin`,
              timer: 4.2,
            };
          }
          this.events.onHistoricalCoin?.();
          this.spawnParticles(c.groundX, lat, c.z + 18, 12, PALETTE.marigoldGold, 1.8);
          this.spawnParticles(c.groundX, lat, c.z + 22, 8, PALETTE.rickshawCrimson, 1.5);
          continue;
        }

        if (c.kind === 'DOUBLE_2X') {
          this.doubleCoinsTimer = POWERUP_DURATION_SEC;
          this.events.onDouble2X?.();
          this.caption = {
            text: `2X Coin Multiplier Active! (${POWERUP_DURATION_SEC}s)`,
            kind: 'INFO',
            timer: 2.2,
          };
          this.spawnParticles(c.groundX, lat, c.z + 18, 12, '#3B82F6', 1.7);
          this.spawnParticles(c.groundX, lat, c.z + 20, 6, PALETTE.marigoldGold, 1.5);
          continue;
        }

        if (c.kind === 'MAGNET') {
          this.magnetTimer = POWERUP_DURATION_SEC;
          this.events.onMagnet?.();
          this.caption = {
            text: `Coin Magnet Active! (${POWERUP_DURATION_SEC}s)`,
            kind: 'INFO',
            timer: 2.2,
          };
          this.spawnParticles(c.groundX, lat, c.z + 18, 12, PALETTE.peacockTeal, 1.7);
          this.spawnParticles(c.groundX, lat, c.z + 20, 6, PALETTE.rickshawCrimson, 1.5);
          continue;
        }

        // GENERAL COIN: eligible for 2X multiplier
        const value = this.doubleCoinsTimer > 0 ? 2 : 1;
        this.coins += value;
        this.totalCoinsCollectedLifetime += value;
        this.events.onCoin?.();
        this.spawnParticles(
          c.groundX,
          lat,
          c.z + 16,
          value > 1 ? 10 : 7,
          value > 1 ? '#3B82F6' : PALETTE.marigoldGold,
          1.45
        );
        this.spawnParticles(c.groundX, lat, c.z + 20, 3, PALETTE.emeraldGreen, 1.1);
      }
    }
  }

  private checkObstacles(): void {
    for (const obs of this.obstacles) {
      if (obs.hit) continue;
      const sameLane = Math.abs(this.lanePos - obs.lane) < 0.4;
      const xOverlap = Math.abs(this.playerX - obs.groundX) < obs.footprintX * 0.5 + PLAYER_HALF_X;
      const heightHit = this.z < obs.height;

      if (sameLane && xOverlap && heightHit) {
        if (obs.kind === 'POTHOLE') {
          if (this.invulnTimer > 0) continue;
          obs.hit = true;
          this.coins = Math.max(0, this.coins - 5);
          this.playerState = 'STUMBLE';
          this.speedMult = 0.6;
          this.stumbleHoldTimer = 0.6;
          this.stumbleRecoverTimer = 2.0;
          this.invulnTimer = 0.85;
          this.hitstopTimer = 0.035;
          this.trauma = Math.min(1, this.trauma + 0.4);
          this.hitFlashTimer = 0.06;
          this.caption = { text: obs.caption, kind: 'STUMBLE', timer: 3.2 };
          this.events.onStumble?.();
          this.spawnParticles(this.playerX, this.lanePos, 8, 12, PALETTE.curbBrick, 1.6);
        } else {
          if (this.invulnTimer > 1.0) continue;
          obs.hit = true;
          this.playerState = 'DEAD';
          this.deathDelayTimer = 0.48;
          this.hitstopTimer = 0.065;
          this.trauma = 0.85;
          this.hitFlashTimer = 0.08;
          this.caption = { text: obs.caption, kind: 'DEADLY', timer: 4.0 };
          this.deathReason = OBSTACLE_CONFIG[obs.kind].deathLabel;
          this.events.onCrash?.();
          this.spawnParticles(this.playerX, this.lanePos, 18, 22, PALETTE.rickshawCrimson, 2.2);
          break;
        }
      }
    }
  }

  private checkLandmarks(): void {
    for (const gate of this.landmarks) {
      if (this.triggeredCheckpointIds.includes(gate.checkpointId)) continue;
      const result = gate.tryPass(this.playerX);
      if (!result) continue;

      this.triggeredCheckpointIds.push(result.checkpointId);
      this.gold += result.goldAwarded;
      this.lastCheckpointX = result.checkpointX;
      this.lastCheckpointId = result.checkpointId;
      this.lastCheckpointName = result.checkpointName;
      this.landmarkToast = result.toast;
      this.events.onLandmark?.();
      this.spawnParticles(gate.groundX, -0.7, 52, 10, PALETTE.marigoldGold, 2.2);
      this.spawnParticles(gate.groundX, 0.7, 52, 10, gate.accentColor, 2.2);
    }
  }

  private ensureLandmarksAhead(targetX: number): void {
    const cycleLen = this.currentMap.cycleLengthTiles;
    while (this.nextLandmarkCycle * cycleLen <= targetX) {
      const cycle = this.nextLandmarkCycle;
      const cycleGates = createLandmarkGates(
        this.currentMap.landmarks,
        cycle * cycleLen,
        cycle
      );
      this.landmarks.push(...cycleGates);

      // Pair each verified Landmark with its dedicated Historical Heritage Coin positioned ahead of the gate
      for (const gate of cycleGates) {
        this.coinItems.push({
          id: this.nextEntityId++,
          kind: 'HISTORICAL',
          groundX: Math.max(14, gate.groundX - 2.4),
          lane: 0,
          z: 20,
          collected: false,
          landmarkId: gate.id,
          landmarkName: gate.name,
          landmarkNameBn: gate.nameBn,
          goldValue: HISTORICAL_COIN_GOLD_AWARD,
        });
      }

      this.nextLandmarkCycle += 1;
    }
  }

  private isNearLandmark(x: number): boolean {
    return this.landmarks.some((lm) => Math.abs(x - lm.groundX) < 5.0);
  }

  private ensurePropsAhead(targetX: number): void {
    while (this.nextPropSlotIndex * BUILDING_SLOT_SPACING_X < targetX) {
      const slotIdx = this.nextPropSlotIndex;
      const gx = slotIdx * BUILDING_SLOT_SPACING_X;
      const env = sampleEnvironmentAt(this.currentMap.id, Math.max(0, gx));
      const dist = env.district;
      const infra = getDistrictInfrastructureProfile(this.currentMap.id, dist);

      for (const side of [-1, 1] as const) {
        const poleInterval = infra.poleModulo;
        const polePhase = (((slotIdx + (side === 1 ? 1 : 0)) % poleInterval) + poleInterval) % poleInterval;
        if (polePhase === 0) {
          // Slight natural variation in pole placement at building seams, never uniform clones
          const jitter = ((Math.abs(slotIdx * 7 + (side === 1 ? 3 : 1)) % 3) - 1) * 0.06;
          this.props.push({
            id: this.nextEntityId++,
            groundX: gx + 2.38 + jitter,
            side,
            kind: 'POLE',
            variant: Math.abs(slotIdx + (side === 1 ? 1 : 0)) % 3,
            archTheme: dist.archTheme,
            districtId: dist.id,
            hasTransformer:
              infra.hasTransformers && Math.abs(slotIdx) % (poleInterval * 2) === 0,
            hasCoiledCable:
              infra.hasCoiledTelecomBundles && Math.abs(slotIdx + (side === 1 ? 2 : 0)) % 2 === 0,
            crossRoadWire:
              infra.hasCrossStreetSpans && side === -1 && Math.abs(slotIdx) % (poleInterval * 2) === 0,
          });
        }

        // Permanent shopfront / building along outer corridor — zero gaps, deterministic identity
        const shop = getPermanentShopForSlot(this.currentMap.id, slotIdx, side);
        this.props.push({
          id: this.nextEntityId++,
          groundX: gx,
          side,
          kind: shop.appearance.isUniversityHall ? 'UNIVERSITY_HALL' : 'BUILDING',
          variant: Math.abs(slotIdx) % 5,
          label: shop.nameBn,
          archTheme: dist.archTheme,
          districtId: dist.id,
          shop,
        });

        // Metro viaduct pillars in Mirpur alongside the continuous shopfront
        if (dist.archTheme === 'flyover' && ((slotIdx % 3) + 3) % 3 === 0) {
          this.props.push({
            id: this.nextEntityId++,
            groundX: gx + 0.6,
            side,
            kind: 'METRO_PILLAR',
            variant: Math.abs(slotIdx) % 3,
            archTheme: dist.archTheme,
            districtId: dist.id,
          });
        }

        // Port cranes in Chattagram Port & Agrabad
        if (dist.archTheme === 'port' && ((slotIdx % 5) + 5) % 5 === 1 && side === 1) {
          this.props.push({
            id: this.nextEntityId++,
            groundX: gx + 0.8,
            side: 1,
            kind: 'PORT_CRANE',
            variant: Math.abs(slotIdx) % 2,
            districtId: dist.id,
          });
        }

        // Curated street life:
        // Trees sit ONLY in dedicated curb-edge planting pits / green verges at building seams (gx + 2.42)
        // NEVER in the middle of pedestrian footpaths or directly in front of shop entrances/signboards.
        const treeIdx =
          (((slotIdx + (side === 1 ? 1 : 0)) % dist.treeWeights.length) + dist.treeWeights.length) %
          dist.treeWeights.length;
        const treeKind = dist.treeWeights[treeIdx];
        const mod = (((slotIdx + (side === 1 ? 2 : 0)) % 6) + 6) % 6;

        if (mod === 3 || mod === 5) {
          if (mod === 5 && (dist.archTheme === 'riverfront' || dist.archTheme === 'coastal')) {
            this.props.push({
              id: this.nextEntityId++,
              groundX: gx + 1.25,
              side,
              kind: 'BOAT',
              variant: Math.abs(slotIdx) % 4,
              archTheme: dist.archTheme,
              districtId: dist.id,
            });
          } else if (dist.archTheme === 'tea_valley') {
            this.props.push({
              id: this.nextEntityId++,
              groundX: gx + (mod === 3 ? 2.42 : 1.25),
              side,
              kind: mod === 3 ? 'TEA_SHADE_TREE' : 'TEA_BUSH',
              variant: Math.abs(slotIdx) % 4,
              archTheme: dist.archTheme,
              districtId: dist.id,
              lateralOffset: infra.treeLateralFactor,
              hasTreePit: infra.useTreePit,
            });
          } else if (
            polePhase !== 0 &&
            (infra.allowRoadsideTrees || Math.abs(slotIdx) % 10 === 4)
          ) {
            this.props.push({
              id: this.nextEntityId++,
              groundX: gx + 2.42, // Building boundary seam — clear of shop doors, signboards & utility poles
              side,
              kind: treeKind,
              variant: Math.abs(slotIdx) % 4,
              archTheme: dist.archTheme,
              districtId: dist.id,
              lateralOffset: infra.treeLateralFactor,
              hasTreePit: infra.useTreePit,
            });
          }
        } else {
          let streetKind: PropKind = 'PEDESTRIAN';
          if (mod === 0) streetKind = 'TEA_STALL';
          else if (mod === 1) streetKind = 'RICKSHAW';
          else if (mod === 2) streetKind = 'CNG';
          else if (mod === 4) {
            streetKind =
              dist.archTheme === 'campus' || dist.archTheme === 'riverfront'
                ? 'PEDESTRIAN'
                : 'BILLBOARD';
          }

          this.props.push({
            id: this.nextEntityId++,
            groundX: gx + 1.2 + (side === 1 ? 0.2 : 0),
            side,
            kind: streetKind,
            variant: Math.abs(slotIdx) % 4,
            label: streetKind === 'TEA_STALL' ? 'চা ও নাস্তা' : undefined,
            archTheme: dist.archTheme,
            districtId: dist.id,
          });
        }
      }

      this.nextPropSlotIndex += 1;
    }
  }

  private pickRegionalVehicle(dist: DistrictSegmentDef): { kind: ObstacleKind; vx: number } {
    const r = this.nextRandom();
    // City-authentic traffic composition
    if (this.currentMap.id === 'chattogram') {
      if (dist.archTheme === 'port' || dist.archTheme === 'coastal') {
        if (r < 0.42) return { kind: 'TRUCK', vx: -1.12 };
        if (r < 0.68) return { kind: 'BUS', vx: -1.25 };
        if (r < 0.86) return { kind: 'CNG_TRAFFIC', vx: -0.95 };
        return { kind: 'MOTORCYCLE', vx: -1.6 };
      }
      if (r < 0.34) return { kind: 'BUS', vx: -1.25 };
      if (r < 0.58) return { kind: 'TRUCK', vx: -1.05 };
      if (r < 0.82) return { kind: 'CNG_TRAFFIC', vx: -0.95 };
      return { kind: 'CAR', vx: -1.0 };
    }

    if (this.currentMap.id === 'sylhet') {
      if (r < 0.44) return { kind: 'CNG_TRAFFIC', vx: -0.92 };
      if (r < 0.68) return { kind: 'CAR', vx: -0.95 };
      if (r < 0.86) return { kind: 'BUS', vx: -1.12 };
      return { kind: 'MOTORCYCLE', vx: -1.5 };
    }

    // Dhaka
    if (dist.archTheme === 'flyover' || dist.archTheme === 'commercial') {
      if (r < 0.36) return { kind: 'BUS', vx: -1.28 };
      if (r < 0.6) return { kind: 'CAR', vx: -1.02 };
      if (r < 0.82) return { kind: 'CNG_TRAFFIC', vx: -0.95 };
      return { kind: 'MOTORCYCLE', vx: -1.7 };
    }
    if (r < 0.34) return { kind: 'CNG_TRAFFIC', vx: -0.9 };
    if (r < 0.62) return { kind: 'BUS', vx: -1.16 };
    if (r < 0.82) return { kind: 'MOTORCYCLE', vx: -1.55 };
    return { kind: 'CAR', vx: -0.95 };
  }

  private ensureWorldAhead(targetX: number): void {
    while (this.spawnedUntilX < targetX) {
      const chunkStart = this.spawnedUntilX;

      if (chunkStart < 12) {
        for (let i = 0; i < 3; i++) {
          this.coinItems.push({
            id: this.nextEntityId++,
            kind: 'GENERAL',
            groundX: chunkStart + i * 1.8,
            lane: 0,
            z: 14,
            collected: false,
          });
        }
        this.spawnedUntilX += 7;
        continue;
      }

      const env = sampleEnvironmentAt(this.currentMap.id, chunkStart);
      const pattern = Math.floor(this.nextRandom() * 4);
      const lanes: LaneIndex[] = [-1, 0, 1];
      const primaryLane = lanes[Math.floor(this.nextRandom() * 3)];
      const secondaryLane =
        lanes[(lanes.indexOf(primaryLane) + 1 + Math.floor(this.nextRandom() * 2)) % 3];
      const safeLane = lanes.find((l) => l !== primaryLane && l !== secondaryLane) ?? 0;

      if (pattern === 0) {
        for (let i = 0; i < 3; i++) {
          this.coinItems.push({
            id: this.nextEntityId++,
            kind: 'GENERAL',
            groundX: chunkStart + i * 1.4,
            lane: secondaryLane,
            z: 14,
            collected: false,
          });
        }
        if (!this.isNearLandmark(chunkStart + 2)) {
          this.spawnObstacle('POTHOLE', chunkStart + 2.2, primaryLane);
        }
        if (!this.isNearLandmark(chunkStart + 6.5)) {
          this.spawnObstacle('MANHOLE', chunkStart + 6.5, secondaryLane);
        }
      } else if (pattern === 1) {
        if (!this.isNearLandmark(chunkStart + 4)) {
          const v = this.pickRegionalVehicle(env.district);
          this.spawnObstacle(v.kind, chunkStart + 5.6, primaryLane, v.vx);
        }
        for (let i = 0; i < 4; i++) {
          this.coinItems.push({
            id: this.nextEntityId++,
            kind: 'GENERAL',
            groundX: chunkStart + 1.5 + i * 1.3,
            lane: secondaryLane,
            z: i === 1 || i === 2 ? 48 : 16,
            collected: false,
          });
        }
      } else if (pattern === 2) {
        if (!this.isNearLandmark(chunkStart + 2.5)) {
          this.spawnObstacle('POTHOLE', chunkStart + 2.5, secondaryLane);
        }
        if (!this.isNearLandmark(chunkStart + 6)) {
          const v = this.pickRegionalVehicle(env.district);
          this.spawnObstacle(v.kind, chunkStart + 6.2, primaryLane, v.vx);
        }
        for (let i = 0; i < 3; i++) {
          this.coinItems.push({
            id: this.nextEntityId++,
            kind: 'GENERAL',
            groundX: chunkStart + 2 + i * 1.6,
            lane: safeLane,
            z: 14,
            collected: false,
          });
        }
      } else {
        if (!this.isNearLandmark(chunkStart + 3.5)) {
          this.spawnObstacle('MANHOLE', chunkStart + 3.5, primaryLane);
          this.coinItems.push({
            id: this.nextEntityId++,
            kind: 'GENERAL',
            groundX: chunkStart + 3.5,
            lane: primaryLane,
            z: 74,
            collected: false,
          });
        }
        if (!this.isNearLandmark(chunkStart + 7)) {
          if (env.district.trafficDensity > 1.05 && this.nextRandom() < 0.65) {
            const v = this.pickRegionalVehicle(env.district);
            this.spawnObstacle(v.kind, chunkStart + 7.2, secondaryLane, v.vx);
          } else {
            this.spawnObstacle('POTHOLE', chunkStart + 7, secondaryLane);
          }
        }
      }

      // Periodically spawn 2X or Magnet power-ups on a clear safe lane away from landmarks
      if (chunkStart >= this.nextDoubleSpawnX && !this.isNearLandmark(chunkStart + 4.5)) {
        this.coinItems.push({
          id: this.nextEntityId++,
          kind: 'DOUBLE_2X',
          groundX: chunkStart + 4.5,
          lane: safeLane,
          z: 22,
          collected: false,
        });
        this.nextDoubleSpawnX = chunkStart + 68 + Math.floor(this.nextRandom() * 18);
      } else if (chunkStart >= this.nextMagnetSpawnX && !this.isNearLandmark(chunkStart + 4.5)) {
        this.coinItems.push({
          id: this.nextEntityId++,
          kind: 'MAGNET',
          groundX: chunkStart + 4.5,
          lane: safeLane,
          z: 22,
          collected: false,
        });
        this.nextMagnetSpawnX = chunkStart + 78 + Math.floor(this.nextRandom() * 20);
      }

      this.spawnedUntilX += 10.5;
    }
  }

  private spawnObstacle(
    kind: ObstacleKind,
    groundX: number,
    lane: LaneIndex,
    vx = 0
  ): void {
    const cfg = OBSTACLE_CONFIG[kind];
    const caption = cfg.captions[Math.floor(this.nextRandom() * cfg.captions.length)];
    this.obstacles.push({
      id: this.nextEntityId++,
      kind,
      groundX,
      lane,
      footprintX: cfg.footprintX,
      height: cfg.height,
      caption,
      hit: false,
      vx,
      variant: Math.floor(this.nextRandom() * 4),
    });
  }

  private cullBehind(minX: number): void {
    this.obstacles = this.obstacles.filter((o) => o.groundX > minX);
    this.coinItems = this.coinItems.filter((c) => c.groundX > minX && !c.collected);
    this.landmarks = this.landmarks.filter((lm) => lm.groundX > minX - 2.0);
    // Keep buildings/props alive until their full 2.5-tile depth has completely exited behind the camera
    this.props = this.props.filter((p) => p.groundX > minX - 2.5);
  }

  private updateParticles(dt: number): void {
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.vz -= 640 * dt;
      p.groundX += p.vx * dt;
      p.groundY += p.vy * dt;
      p.z = Math.max(0, p.z + p.vz * dt);
    }
  }

  public getScore(): number {
    return Math.round(
      this.totalDistanceRun * 10 + this.coins * 25 + this.gold * 250
    );
  }

  public getSnapshot(): HudSnapshot {
    return {
      phase: this.phase,
      mapId: this.currentMap.id,
      lockedMapId: this.lockedMapId,
      isMapLocked: this.isMapLocked(),
      mapName: this.currentMap.name,
      mapNameBn: this.currentMap.nameBn,
      districtName: this.currentDistrict.name,
      districtNameBn: this.currentDistrict.nameBn,
      score: this.getScore(),
      coins: this.coins,
      gold: this.gold,
      distanceTiles: Math.floor(this.playerX),
      cycleLengthTiles: this.currentMap.cycleLengthTiles,
      lastCheckpointX: this.lastCheckpointX,
      lastCheckpointName: this.lastCheckpointName,
      reviveCost: this.getReviveCost(),
      revivesUsed: this.revivesUsed,
      speedMult: this.speedMult,
      playerState: this.playerState,
      caption: this.caption ? { ...this.caption } : null,
      landmarkToast: this.landmarkToast ? { ...this.landmarkToast } : null,
      achievementToast: this.achievementToast ? { ...this.achievementToast } : null,
      doubleCoinsTimer: this.doubleCoinsTimer,
      magnetTimer: this.magnetTimer,
      discoveredHistoricalIds: [...this.discoveredHistoricalIds],
      totalHistoricalCount: getTotalHistoricalCatalogCount(),
      lifetimeDistanceMetres: Math.floor(this.lifetimeDistanceMetres),
      platinumThresholdMetres: PLATINUM_DISTANCE_THRESHOLD_M,
      platinumUnlocked: this.platinumUnlocked,
      bestDistance: this.bestDistance,
      deathReason: this.deathReason,
    };
  }
}
