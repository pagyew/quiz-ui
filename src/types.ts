export type Theme = "light" | "system" | "dark";
export type Mode = "standard" | "sprint";
export type FinishReason = "won" | "timeout" | "give-up";
export type CardState =
  "hidden" | "hinted" | "found" | "found-with-hint" | "missed";

/** SVG geometry only; markup and event handlers are never inserted. */
export interface IconShape {
  tag: "path" | "circle" | "rect" | "line" | "polyline";
  attrs: Record<string, string | number>;
}
export interface Category {
  id: string;
  label: string;
  description?: string;
  icon?: readonly IconShape[];
}
export interface Answer {
  id: string;
  category: string;
  value?: string;
  aliases?: readonly string[];
  summary?: string;
  docsUrl?: string;
  pack?: string;
}
export interface AnswerPack {
  id: string;
  label: string;
  description?: string;
}
export interface QuizSettings {
  durationSeconds: number;
  enabledPacks: string[];
  shuffle: boolean;
}
export interface QuizDefinition {
  id: string;
  answers: readonly Answer[];
  categories: readonly Category[];
  packs?: readonly AnswerPack[];
  defaults?: Partial<QuizSettings>;
  normalizeAnswer?: (value: string) => string;
  sprint?: { size: number; durationSeconds: number } | false;
  hintCooldownSeconds?: number;
}
export interface QuizResult {
  reason: FinishReason;
  score: number;
  total: number;
  hintedCount: number;
  elapsedSeconds: number;
  mode: Mode;
}
export interface QuizSnapshot {
  status: "idle" | "running" | "finished";
  mode: Mode;
  settings: QuizSettings;
  pool: string[];
  found: string[];
  hinted: string[];
  activeHint: string | null;
  remainingSeconds: number | null;
  elapsedSeconds: number;
  hintCooldownSeconds: number;
  result: QuizResult | null;
}
export type GuessStatus =
  "accepted" | "duplicate" | "unknown" | "empty" | "finished";
export interface GuessResult {
  status: GuessStatus;
  answerId?: string;
}
export type QuizEvent =
  | { type: "reset" | "tick" }
  | { type: "guess"; guess: GuessResult; value: string }
  | { type: "hint"; answerId: string | null }
  | { type: "finish"; result: QuizResult };
export interface EngineOptions {
  now?: () => number;
  random?: () => number;
}
export interface QuizEngine {
  getSnapshot(): QuizSnapshot;
  subscribe(
    listener: (snapshot: QuizSnapshot, event: QuizEvent) => void,
  ): () => void;
  submit(value: string): GuessResult;
  hint(): string | null;
  tick(): void;
  finish(reason?: "give-up"): void;
  reset(options?: { mode?: Mode; settings?: Partial<QuizSettings> }): void;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export interface LegacyStorage {
  themeKey?: string;
  durationKey?: string;
  shuffleKey?: string;
  packKeys?: Record<string, string>;
  bestKey?: (settings: QuizSettings, mode: Mode) => string;
}
export interface ResultPresentation {
  title: string;
  description: string;
  grade: string;
}
export interface QuizLabels {
  sound: string;
  howToPlay: string;
  lightTheme: string;
  systemTheme: string;
  darkTheme: string;
  discovered: string;
  time: string;
  submit: string;
  inputLabel: string;
  inputPlaceholder: string;
  personalBest: string;
  sprint: string;
  settings: string;
  hint: string;
  giveUp: string;
  reset: string;
  results: string;
  close: string;
  applySettings: string;
  startTyping: string;
  share: string;
  playAgain: string;
  quizTime: string;
  quizTimeDescription: string;
  shuffle: string;
  shuffleDescription: string;
  noTimer: string;
  reference: string;
  settingsTitle: string;
  sessionComplete: string;
  resultUnit: string;
  copied: string;
  shareUnavailable: string;
  noHints: string;
  hiddenAnswer: string;
  progress: string;
  minutes: (minutes: number) => string;
  cooldown: (seconds: number) => string;
  duplicate: (answer: string) => string;
  unknown: (answer: string) => string;
}
export interface QuizConfig extends QuizDefinition {
  branding: {
    name: string;
    wordmark?: readonly [string, string];
    mark: string;
    eyebrow: string;
    title: readonly string[];
    emphasis?: string;
    description: readonly string[];
    footer: string;
    footerNote?: string;
    homeUrl?: string;
    inputPrompt?: string;
    palette?: string;
  };
  labels?: Partial<QuizLabels>;
  board: { title: string; description?: string; sprintDescription?: string };
  howToPlay: {
    kicker?: string;
    title: string;
    steps: readonly { title: string; description: string }[];
  };
  formatAnswer?: (answer: Answer) => string;
  formatHint?: (answer: Answer) => string;
  referenceLabel?: (answer: Answer, category: Category) => string;
  presentResult?: (result: QuizResult) => ResultPresentation;
  shareText?: (result: QuizResult, presentation: ResultPresentation) => string;
  durationOptions?: readonly number[];
  storage?: { adapter?: StorageLike | null; legacy?: LegacyStorage };
  /** Only a full-page app should update the host document's theme-color. */
  themeColor?: { light: string; dark: string };
}
