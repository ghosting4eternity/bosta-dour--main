export const ASSET_PATHS = {
  playerCharacter: '/assets/aistudio/image_7259759b.png',
} as const;

let cachedPlayerImage: HTMLImageElement | null = null;
let loadAttempted = false;

export function getPlayerCharacterImage(): HTMLImageElement | null {
  if (typeof Image === 'undefined') {
    return null;
  }

  if (!loadAttempted) {
    loadAttempted = true;
    const img = new Image();
    img.decoding = 'async';
    img.src = ASSET_PATHS.playerCharacter;
    cachedPlayerImage = img;
  }

  if (
    cachedPlayerImage &&
    cachedPlayerImage.complete &&
    cachedPlayerImage.naturalWidth > 0 &&
    cachedPlayerImage.naturalHeight > 0
  ) {
    return cachedPlayerImage;
  }

  return null;
}

export function preloadGameAssets(): void {
  getPlayerCharacterImage();
}
