export const PLATINUM_DISTANCE_THRESHOLD_M = 916_000;

const STORAGE_KEY = 'bounce_back_progress_v1';

export interface PersistentProgress {
  lifetimeDistanceMetres: number;
  bestSingleRunMetres: number;
  platinumUnlocked: boolean;
  platinumUnlockedAt: string | null;
  discoveredHistoricalIds: string[];
  totalCoinsCollected: number;
}

export interface ProgressStorageAdapter {
  load(): PersistentProgress;
  save(progress: PersistentProgress): void;
}

export function createEmptyProgress(): PersistentProgress {
  return {
    lifetimeDistanceMetres: 0,
    bestSingleRunMetres: 0,
    platinumUnlocked: false,
    platinumUnlockedAt: null,
    discoveredHistoricalIds: [],
    totalCoinsCollected: 0,
  };
}

export class LocalStorageProgressAdapter implements ProgressStorageAdapter {
  public load(): PersistentProgress {
    if (typeof window === 'undefined' || !window.localStorage) {
      return createEmptyProgress();
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return createEmptyProgress();
      const parsed = JSON.parse(raw) as Partial<PersistentProgress>;
      return {
        lifetimeDistanceMetres:
          typeof parsed.lifetimeDistanceMetres === 'number' &&
          Number.isFinite(parsed.lifetimeDistanceMetres) &&
          parsed.lifetimeDistanceMetres >= 0
            ? parsed.lifetimeDistanceMetres
            : 0,
        bestSingleRunMetres:
          typeof parsed.bestSingleRunMetres === 'number' &&
          Number.isFinite(parsed.bestSingleRunMetres) &&
          parsed.bestSingleRunMetres >= 0
            ? parsed.bestSingleRunMetres
            : 0,
        platinumUnlocked: Boolean(parsed.platinumUnlocked),
        platinumUnlockedAt:
          typeof parsed.platinumUnlockedAt === 'string' ? parsed.platinumUnlockedAt : null,
        discoveredHistoricalIds: Array.isArray(parsed.discoveredHistoricalIds)
          ? parsed.discoveredHistoricalIds.filter((id): id is string => typeof id === 'string')
          : [],
        totalCoinsCollected:
          typeof parsed.totalCoinsCollected === 'number' &&
          Number.isFinite(parsed.totalCoinsCollected) &&
          parsed.totalCoinsCollected >= 0
            ? parsed.totalCoinsCollected
            : 0,
      };
    } catch {
      return createEmptyProgress();
    }
  }

  public save(progress: PersistentProgress): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // Ignore storage quota errors gracefully
    }
  }
}

export class MemoryProgressAdapter implements ProgressStorageAdapter {
  private data: PersistentProgress;

  constructor(initial?: Partial<PersistentProgress>) {
    this.data = { ...createEmptyProgress(), ...initial };
  }

  public load(): PersistentProgress {
    return {
      ...this.data,
      discoveredHistoricalIds: [...this.data.discoveredHistoricalIds],
    };
  }

  public save(progress: PersistentProgress): void {
    this.data = {
      ...progress,
      discoveredHistoricalIds: [...progress.discoveredHistoricalIds],
    };
  }
}
