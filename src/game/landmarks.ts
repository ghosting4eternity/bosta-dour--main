import { PALETTE } from './palette';
import type { LandmarkDef, LandmarkEntity, LandmarkToast } from './types';

export type LandmarkGateStyle =
  | 'ahsan_manjil_palace'
  | 'lalbagh_fort_gate'
  | 'curzon_arch'
  | 'bridge'
  | 'clock'
  | 'coastal'
  | 'tea'
  | 'mughal';

export type GoldAwardStatus = 'pending' | 'awarded';

export interface GroundCoordinates {
  groundX: number;
  groundY: number;
  spanHalfY: number;
}

/**
 * Resource schema for LandmarkGate definitions inside the engine.
 */
export interface LandmarkGateResource extends LandmarkDef {
  checkpointId: string;
  groundCoordinates: GroundCoordinates;
  history: string;
  goldAward: number;
  goldAwardStatus: GoldAwardStatus;
  secondaryColor: string;
  gateHeight: number;
  gateSpanHalfY: number;
  triggerToleranceX: number;
  gateStyle: LandmarkGateStyle;
  districtId?: string;
  yearBuilt?: string;
}

export type LandmarkGateData = LandmarkGateResource;

export interface LandmarkPassResult {
  gate: LandmarkGate;
  checkpointId: string;
  goldAwarded: number;
  goldAwardStatus: GoldAwardStatus;
  checkpointX: number;
  checkpointName: string;
  toast: LandmarkToast;
}

export class LandmarkGate implements LandmarkEntity {
  public readonly id: string;
  public readonly checkpointId: string;
  public readonly name: string;
  public readonly nameBn: string;
  public readonly history: string;
  public readonly groundX: number;
  public readonly groundCoordinates: GroundCoordinates;
  public readonly accentColor: string;
  public readonly secondaryColor: string;
  public readonly goldAward: number;
  public readonly gateHeight: number;
  public readonly gateSpanHalfY: number;
  public readonly triggerToleranceX: number;
  public readonly archStyle?: LandmarkDef['archStyle'];
  public readonly gateStyle: LandmarkGateStyle;
  public readonly districtId?: string;
  public readonly yearBuilt?: string;

  public goldAwardStatus: GoldAwardStatus = 'pending';
  public triggered = false;
  public triggeredAtX: number | null = null;

  constructor(def: LandmarkDef | LandmarkGateResource) {
    const gateData = def as Partial<LandmarkGateResource>;
    const historyOneLiner = def.history.trim();
    if (!historyOneLiner) {
      throw new Error(`LandmarkGate "${def.id}" requires a non-empty history one-liner.`);
    }

    const spanHalfY = gateData.gateSpanHalfY ?? gateData.groundCoordinates?.spanHalfY ?? 1.72;
    const groundX = gateData.groundCoordinates?.groundX ?? def.groundX;
    const groundY = gateData.groundCoordinates?.groundY ?? 0;

    this.id = def.id;
    this.checkpointId = gateData.checkpointId ?? `cp_${def.id}`;
    this.name = def.name;
    this.nameBn = def.nameBn;
    this.history = historyOneLiner;
    this.groundX = groundX;
    this.groundCoordinates = {
      groundX,
      groundY,
      spanHalfY,
    };
    this.accentColor = def.accentColor;
    this.secondaryColor = gateData.secondaryColor ?? PALETTE.chalkWhite;
    this.goldAward = gateData.goldAward ?? 1;
    this.goldAwardStatus = gateData.goldAwardStatus ?? 'pending';
    this.gateHeight = gateData.gateHeight ?? 168;
    this.gateSpanHalfY = spanHalfY;
    this.triggerToleranceX = gateData.triggerToleranceX ?? 0;
    this.archStyle = def.archStyle;
    this.gateStyle =
      gateData.gateStyle ?? (def.archStyle === 'curzon' ? 'curzon_arch' : def.archStyle ?? 'mughal');
    this.districtId = gateData.districtId;
    this.yearBuilt = gateData.yearBuilt;
  }

  public canTrigger(playerX: number): boolean {
    return (
      !this.triggered &&
      this.goldAwardStatus === 'pending' &&
      playerX >= this.groundCoordinates.groundX - this.triggerToleranceX
    );
  }

  public tryPass(playerX: number): LandmarkPassResult | null {
    if (!this.canTrigger(playerX)) {
      return null;
    }

    this.triggered = true;
    this.goldAwardStatus = 'awarded';
    this.triggeredAtX = playerX;

    const goldLabel = `+${this.goldAward} Gold`;
    return {
      gate: this,
      checkpointId: this.checkpointId,
      goldAwarded: this.goldAward,
      goldAwardStatus: this.goldAwardStatus,
      checkpointX: this.groundCoordinates.groundX,
      checkpointName: this.name,
      toast: {
        name: `${this.nameBn} · ${this.name}`,
        history: this.history,
        badge: `${goldLabel} · Checkpoint Saved`,
        timer: 4.8,
      },
    };
  }

  public reset(): void {
    this.triggered = false;
    this.goldAwardStatus = 'pending';
    this.triggeredAtX = null;
  }
}

export const DHAKA_LANDMARK_GATES: LandmarkGateResource[] = [
  {
    id: 'ahsan_manjil',
    checkpointId: 'cp_dhaka_ahsan_manjil',
    name: 'Ahsan Manjil',
    nameBn: 'আহসান মঞ্জিল',
    history:
      'The iconic Pink Palace on the Buriganga at Sadarghat, completed in 1872 by Nawab Abdul Ghani.',
    groundX: 52,
    groundCoordinates: {
      groundX: 52,
      groundY: 0,
      spanHalfY: 1.76,
    },
    accentColor: '#DF6C7D',
    secondaryColor: '#FCE7EA',
    goldAward: 1,
    goldAwardStatus: 'pending',
    gateHeight: 184,
    gateSpanHalfY: 1.76,
    triggerToleranceX: 0.15,
    archStyle: 'mughal',
    gateStyle: 'ahsan_manjil_palace',
    districtId: 'dhaka_sadarghat',
    yearBuilt: '1872',
  },
  {
    id: 'lalbagh_fort',
    checkpointId: 'cp_dhaka_lalbagh_fort',
    name: 'Lalbagh Fort',
    nameBn: 'লালবাগ কেল্লা',
    history:
      '17th-century Mughal fort gateway begun in 1678 by Prince Muhammad Azam along Old Dhaka.',
    groundX: 92,
    groundCoordinates: {
      groundX: 92,
      groundY: 0,
      spanHalfY: 1.78,
    },
    accentColor: '#C24D3A',
    secondaryColor: '#F7E7CE',
    goldAward: 1,
    goldAwardStatus: 'pending',
    gateHeight: 186,
    gateSpanHalfY: 1.78,
    triggerToleranceX: 0.15,
    archStyle: 'mughal',
    gateStyle: 'lalbagh_fort_gate',
    districtId: 'dhaka_old_dhaka',
    yearBuilt: '1678',
  },
  {
    id: 'curzon_hall',
    checkpointId: 'cp_dhaka_curzon_hall',
    name: 'Curzon Hall · Dhaka University',
    nameBn: 'কার্জন হল · ঢাবি',
    history:
      'Iconic 1904 red-brick Indo-Saracenic academic hall at the heart of Dhaka University & Shahbagh.',
    groundX: 235,
    groundCoordinates: {
      groundX: 235,
      groundY: 0,
      spanHalfY: 1.74,
    },
    accentColor: '#B83A2D',
    secondaryColor: '#FDE6C4',
    goldAward: 1,
    goldAwardStatus: 'pending',
    gateHeight: 176,
    gateSpanHalfY: 1.74,
    triggerToleranceX: 0.15,
    archStyle: 'curzon',
    gateStyle: 'curzon_arch',
    districtId: 'dhaka_du',
    yearBuilt: '1904',
  },
];

export function createLandmarkGates(defs: LandmarkDef[], cycleOffsetX = 0, cycleIndex = 0): LandmarkGate[] {
  return defs.map((def) => {
    const shiftedX = def.groundX + cycleOffsetX;
    const baseCheckpointId = (def as Partial<LandmarkGateResource>).checkpointId ?? `cp_${def.id}`;
    const checkpointId = cycleIndex === 0 ? baseCheckpointId : `${baseCheckpointId}_loop_${cycleIndex}`;
    return new LandmarkGate({
      ...def,
      groundX: shiftedX,
      groundCoordinates: {
        groundX: shiftedX,
        groundY: 0,
        spanHalfY: (def as Partial<LandmarkGateResource>).gateSpanHalfY ?? 1.72,
      },
      checkpointId,
    });
  });
}
