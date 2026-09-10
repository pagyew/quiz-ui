import type {
  LegacyStorage,
  Mode,
  QuizDefinition,
  QuizSettings,
  StorageLike,
  Theme,
} from "./types.js";

export function createQuizStorage(
  definition: QuizDefinition,
  storage: StorageLike | null,
  legacy?: LegacyStorage,
) {
  const prefix = `quiz-ui:${definition.id}:v1`;
  const read = (key?: string): string | null => {
    try {
      return key ? (storage?.getItem(key) ?? null) : null;
    } catch {
      return null;
    }
  };
  const write = (key: string, value: string): void => {
    try {
      storage?.setItem(key, value);
    } catch {
      /* Private browsing and quota errors must not interrupt a game. */
    }
  };
  const defaults: QuizSettings = {
    durationSeconds: 300,
    enabledPacks: [],
    shuffle: false,
    ...definition.defaults,
  };
  function settings(): QuizSettings {
    let value: Partial<QuizSettings> = {};
    const stored = read(`${prefix}:settings`);
    try {
      const parsed = stored ? JSON.parse(stored) : null;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
        value = parsed;
    } catch {
      /* Fall back to defaults. */
    }
    if (!stored && legacy) {
      const duration = read(legacy.durationKey);
      value.durationSeconds =
        duration === null ? defaults.durationSeconds : Number(duration);
      value.shuffle = read(legacy.shuffleKey) === "true";
      value.enabledPacks = (definition.packs ?? [])
        .filter((pack) => read(legacy.packKeys?.[pack.id]) === "true")
        .map((pack) => pack.id);
    }
    const availablePacks = new Set(
      (definition.packs ?? []).map((pack) => pack.id),
    );
    return {
      durationSeconds:
        Number.isInteger(value.durationSeconds) && value.durationSeconds! >= 0
          ? value.durationSeconds!
          : defaults.durationSeconds,
      enabledPacks: Array.isArray(value.enabledPacks)
        ? [
            ...new Set(
              value.enabledPacks.filter((id) => availablePacks.has(id)),
            ),
          ]
        : [...defaults.enabledPacks],
      shuffle:
        typeof value.shuffle === "boolean" ? value.shuffle : defaults.shuffle,
    };
  }
  function bestKey(settings: QuizSettings, mode: Mode): string {
    const preset = JSON.stringify([
      mode,
      mode === "sprint"
        ? definition.sprint || { size: 20, durationSeconds: 120 }
        : settings.durationSeconds,
      [...settings.enabledPacks].sort(),
    ]);
    return `${prefix}:best:${preset}`;
  }
  function best(settings: QuizSettings, mode: Mode): number {
    const stored = read(bestKey(settings, mode));
    const value = Number(
      stored ?? read(legacy?.bestKey?.(settings, mode)) ?? 0,
    );
    return Number.isInteger(value) && value > 0 ? value : 0;
  }
  return {
    settings,
    saveSettings(value: QuizSettings) {
      write(`${prefix}:settings`, JSON.stringify(value));
    },
    theme(): Theme {
      const value = read(`${prefix}:theme`) ?? read(legacy?.themeKey);
      return value === "light" || value === "dark" ? value : "system";
    },
    saveTheme(value: Theme) {
      write(`${prefix}:theme`, value);
    },
    best,
    saveBest(settings: QuizSettings, mode: Mode, score: number) {
      const value = Math.max(best(settings, mode), score);
      write(bestKey(settings, mode), String(value));
      return value;
    },
  };
}
