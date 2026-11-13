import type { ShopIdentity } from './shops';

export type GamePhase =
  | 'title'
  | 'playing'
  | 'paused'
  | 'revive'
  | 'gameover';

export type PlayerState = 'HOP' | 'STUMBLE' | 'DEAD';

export type PlayerAnimState =
  | 'idle'
  | 'hopping'
  | 'jumping'
  | 'landing'
  | 'stumbling'
  | 'recovering'
  | 'gameover';

export type ObstacleKind =
  | 'POTHOLE'
  | 'MANHOLE'
  | 'BUS'
  | 'TRUCK'
  | 'CNG_TRAFFIC'
  | 'CAR'
  | 'MOTORCYCLE';

export type LaneIndex = -1 | 0 | 1;

export type MapId = 'dhaka' | 'chattogram' | 'sylhet';

export type PropKind =
  | 'BUILDING'
  | 'UNIVERSITY_HALL'
  | 'METRO_PILLAR'
  | 'TEA_STALL'
  | 'POLE'
  | 'RICKSHAW'
  | 'CNG'
  | 'BILLBOARD'
  | 'COCONUT_TREE'
  | 'PALM_TREE'
  | 'BANYAN_TREE'
  | 'MANGO_TREE'
  | 'TEA_SHADE_TREE'
  | 'TEA_BUSH'
  | 'BOAT'
  | 'PORT_CRANE'
  | 'PEDESTRIAN';

export interface LandmarkDef {
  id: string;
  name: string;
  nameBn: string;
  history: string;
  groundX: number;
  accentColor: string;
  archStyle?: 'mughal' | 'curzon' | 'bridge' | 'clock' | 'coastal' | 'tea';
  secondaryColor?: string;
  goldAward?: number;
  gateHeight?: number;
  gateSpanHalfY?: number;
  triggerToleranceX?: number;
  gateStyle?:
    | 'ahsan_manjil_palace'
    | 'lalbagh_fort_gate'
    | 'curzon_arch'
    | 'bridge'
    | 'clock'
    | 'coastal'
    | 'tea'
    | 'mughal';
  districtId?: string;
  yearBuilt?: string;
}

export interface DistrictSegmentDef {
  id: string;
  name: string;
  nameBn: string;
  subtitle: string;
  startX: number;
  endX: number;
  skyTop: string;
  skyBottom: string;
  fogColor: string;
  skylineColor: string;
  terrainColor: string;
  roadColor: string;
  roadAltColor: string;
  curbColor: string;
  foliageColor: string;
  /** Subtle hillside elevation pitch in Chattagram/Sylhet (-1..+1) */
  hillSlope: number;
  /** Road shoulder width multiplier */
  roadScale: number;
  /** Regional traffic frequency multiplier */
  trafficDensity: number;
  /** Architectural theme tag */
  archTheme:
    | 'riverfront'
    | 'commercial'
    | 'campus'
    | 'old_town'
    | 'flyover'
    | 'boulevard'
    | 'port'
    | 'coastal'
    | 'bazaar'
    | 'hills'
    | 'tea_valley';
  signsBn: string[];
  treeWeights: Array<'COCONUT_TREE' | 'PALM_TREE' | 'BANYAN_TREE' | 'MANGO_TREE' | 'TEA_SHADE_TREE'>;
}

export interface MapDef {
  id: MapId;
  name: string;
  nameBn: string;
  subtitle: string;
  cycleLengthTiles: number;
  baseSpeed: number;
  skyTop: string;
  skyBottom: string;
  fogColor: string;
  roadColor: string;
  roadAltColor: string;
  curbColor: string;
  foliageColor: string;
  districts: DistrictSegmentDef[];
  landmarks: LandmarkDef[];
}

export interface ObstacleEntity {
  id: number;
  kind: ObstacleKind;
  groundX: number;
  lane: LaneIndex;
  footprintX: number;
  height: number;
  caption: string;
  hit: boolean;
  vx: number;
  variant?: number;
}

export type CoinKind = 'GENERAL' | 'HISTORICAL' | 'DOUBLE_2X' | 'MAGNET';

export interface CoinEntity {
  id: number;
  kind: CoinKind;
  groundX: number;
  lane: LaneIndex;
  /** Continuous lateral ground position used when Magnet smoothly pulls coins */
  lanePos?: number;
  z: number;
  collected: boolean;
  /** Present on HISTORICAL coins tied to a specific landmark */
  landmarkId?: string;
  landmarkName?: string;
  landmarkNameBn?: string;
  goldValue?: number;
  attracted?: boolean;
}

export interface LandmarkEntity {
  id: string;
  name: string;
  nameBn: string;
  history: string;
  groundX: number;
  accentColor: string;
  secondaryColor?: string;
  goldAward?: number;
  gateHeight?: number;
  gateSpanHalfY?: number;
  archStyle?: 'mughal' | 'curzon' | 'bridge' | 'clock' | 'coastal' | 'tea';
  gateStyle?: LandmarkDef['gateStyle'];
  yearBuilt?: string;
  triggered: boolean;
}

export interface PropEntity {
  id: number;
  groundX: number;
  side: -1 | 1;
  kind: PropKind;
  variant: number;
  label?: string;
  archTheme?: DistrictSegmentDef['archTheme'];
  districtId?: string;
  shop?: ShopIdentity;
  lateralOffset?: number;
  hasTreePit?: boolean;
  hasTransformer?: boolean;
  hasCoiledCable?: boolean;
  crossRoadWire?: boolean;
}

export interface Particle {
  active: boolean;
  groundX: number;
  groundY: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export interface CaptionPopup {
  text: string;
  kind: 'STUMBLE' | 'DEADLY' | 'INFO';
  timer: number;
}

export interface LandmarkToast {
  name: string;
  history: string;
  badge?: string;
  timer: number;
}

export interface AchievementToast {
  title: string;
  subtitle: string;
  badge: string;
  timer: number;
}

export interface HudSnapshot {
  phase: GamePhase;
  mapId: MapId;
  lockedMapId: MapId | null;
  isMapLocked: boolean;
  mapName: string;
  mapNameBn: string;
  districtName: string;
  districtNameBn: string;
  score: number;
  coins: number;
  gold: number;
  distanceTiles: number;
  cycleLengthTiles: number;
  lastCheckpointX: number;
  lastCheckpointName: string;
  reviveCost: number;
  revivesUsed: number;
  speedMult: number;
  playerState: PlayerState;
  caption: CaptionPopup | null;
  landmarkToast: LandmarkToast | null;
  achievementToast: AchievementToast | null;
  doubleCoinsTimer: number;
  magnetTimer: number;
  discoveredHistoricalIds: string[];
  totalHistoricalCount: number;
  lifetimeDistanceMetres: number;
  platinumThresholdMetres: number;
  platinumUnlocked: boolean;
  bestDistance: number;
  deathReason: string;
}
