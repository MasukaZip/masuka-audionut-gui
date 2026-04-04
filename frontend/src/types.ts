export interface UploadRequest {
  path: string;
  tracker: string;
  category: string;
  screens: number;
  imageHost: string;
  tmdb: string;
  imdb: string;
  mal: string;
  tvdb: string;
  res: string;
  type: string;
  debug: boolean;
  internal: boolean;
  personal: boolean;
  keepImg: boolean;
  noSeed: boolean;
  skipDupe: boolean;
  cleanup: boolean;
  forceScreens: boolean;
  ffdebug: boolean;
  autoY: boolean;
  autoMove: boolean;
  destPath: string;
}

export interface ScreenshotResult {
  path: string;
  base64: string;
  index: number;
}
