import { createQuizEngine } from "./core.js";
import { createQuizUI } from "./ui.js";
import { createQuizStorage } from "./storage.js";
import { localizeConfig, requireLocale } from "./i18n.js";
import type {
  EngineOptions,
  Locale,
  QuizConfig,
  QuizSettings,
  StorageLike,
  Theme,
} from "./types.js";
export { createQuizEngine } from "./core.js";
export { createQuizUI } from "./ui.js";
export { supportedLocales } from "./i18n.js";
export {
  defaultLabels,
  russianLabels,
  localeLabels,
  presentResult,
  formatTime,
} from "./labels.js";
export { createQuizStorage } from "./storage.js";
export type * from "./types.js";

/** Mount a complete game. All resources are instance-scoped and released by destroy(). */
export function createQuiz(
  root: HTMLElement | string,
  config: QuizConfig,
  engineOptions?: EngineOptions,
) {
  const target =
    typeof root === "string"
      ? globalThis.document?.querySelector<HTMLElement>(root)
      : root;
  if (!target) throw new Error("Quiz mount element was not found");
  const document = target.ownerDocument;
  if (!document.defaultView)
    throw new Error("Quiz UI needs a browser document");
  const window = document.defaultView;
  const engine = createQuizEngine(config, engineOptions);
  let adapter: StorageLike | null = config.storage?.adapter ?? null;
  if (config.storage?.adapter === undefined) {
    try {
      adapter = window.localStorage;
    } catch {
      /* Storage can be unavailable. */
    }
  }
  const storage = createQuizStorage(config, adapter, config.storage?.legacy);
  try {
    engine.reset({ settings: storage.settings() });
  } catch {
    /* A removed pack must not prevent launching with valid defaults. */
  }
  let locale = storage.locale(requireLocale(config.locale ?? "en"));
  let localized = localizeConfig(config, locale);
  let labels = localized.labels;
  function setLocale(value: Locale) {
    requireLocale(value);
    if (destroyed || value === locale) return;
    locale = value;
    localized = localizeConfig(config, locale);
    labels = localized.labels;
    ui.setLocale(locale);
    storage.saveLocale(locale);
    config.onLocaleChange?.(locale);
  }
  let theme = storage.theme(),
    sound = true,
    destroyed = false;
  let audio: AudioContext | null = null;
  const scheme = window.matchMedia?.("(prefers-color-scheme: dark)");
  const themeMeta = config.themeColor
    ? document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    : null;
  const originalThemeColor = themeMeta?.content;
  let resultTimer: number | undefined;
  function beep(frequency: number) {
    if (!sound || destroyed) return;
    try {
      audio ??= new window.AudioContext();
      if (audio.state === "suspended") void audio.resume().catch(() => {});
      const oscillator = audio.createOscillator(),
        gain = audio.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.035, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.09);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start();
      oscillator.stop(audio.currentTime + 0.1);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    } catch {
      /* Sound is optional. */
    }
  }
  const applyTheme = () => {
    const dark =
      theme === "dark" || (theme === "system" && Boolean(scheme?.matches));
    ui.setTheme(theme, dark);
    if (themeMeta && config.themeColor)
      themeMeta.content = config.themeColor[dark ? "dark" : "light"];
  };
  const reset = (
    options: {
      mode?: "standard" | "sprint";
      settings?: Partial<QuizSettings>;
    } = {},
  ) => {
    if (destroyed) return;
    window.clearTimeout(resultTimer);
    engine.reset(options);
    ui.focusInput();
  };
  async function share() {
    const result = engine.getSnapshot().result;
    if (!result || destroyed) return;
    const sharedLocale = locale;
    const presentation = localized.presentResult(result);
    const text =
      localized.shareText?.(result, presentation) ??
      labels.shareMessage(result, localized.branding.name, presentation.grade);
    const url = window.location.href;
    const fullText = `${text} ${url}`;
    const navigator = window.navigator;
    if (navigator.share) {
      try {
        await navigator.share({
          title: labels.shareTitle(localized.branding.name),
          text,
          url,
        });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
      }
    }
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(fullText);
      if (!destroyed && locale === sharedLocale) ui.toast(labels.copied);
    } catch {
      if (!destroyed && locale === sharedLocale) ui.showShareFallback(fullText);
    }
  }
  const ui = createQuizUI(
    target,
    { ...config, locale },
    {
      locale: setLocale,
      submit: (value) => engine.submit(value),
      hint: () => engine.hint(),
      giveUp: () => engine.finish(),
      reset: () => reset(),
      sprint: () => reset({ mode: "sprint" }),
      settings(settings) {
        reset({ settings });
        storage.saveSettings(engine.getSnapshot().settings);
        return true;
      },
      theme(value) {
        theme = value;
        storage.saveTheme(theme);
        applyTheme();
      },
      sound() {
        sound = !sound;
        ui.setSound(sound);
      },
      share: () => {
        void share();
      },
    },
  );
  const unsubscribe = engine.subscribe((state, event) => {
    if (destroyed) return;
    if (event.type === "finish")
      storage.saveBest(state.settings, state.mode, event.result.score);
    ui.render(state, storage.best(state.settings, state.mode));
    if (event.type === "reset") {
      window.clearTimeout(resultTimer);
      ui.focusInput();
    }
    if (event.type === "guess") {
      if (event.guess.status === "accepted") {
        beep(620);
        ui.scrollToAnswer(event.guess.answerId!);
      }
      if (
        event.guess.status === "unknown" ||
        event.guess.status === "duplicate"
      ) {
        beep(180);
        ui.feedback(
          event.guess.status === "duplicate"
            ? labels.duplicate(event.value)
            : labels.unknown(event.value),
        );
      }
    }
    if (event.type === "hint") {
      if (event.answerId) ui.scrollToAnswer(event.answerId);
      else ui.feedback(labels.noHints);
    }
    if (event.type === "finish")
      resultTimer = window.setTimeout(() => {
        if (!destroyed && engine.getSnapshot().status === "finished")
          ui.showResults();
      }, 250);
  });
  const interval = window.setInterval(() => {
    if (engine.getSnapshot().status === "running") engine.tick();
  }, 250);
  const onSchemeChange = () => {
    if (theme === "system") applyTheme();
  };
  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") engine.tick();
  };
  scheme?.addEventListener("change", onSchemeChange);
  document.addEventListener("visibilitychange", onVisibilityChange);
  const state = engine.getSnapshot();
  ui.render(state, storage.best(state.settings, state.mode));
  ui.setSound(sound);
  applyTheme();
  ui.focusInput();
  config.onLocaleChange?.(locale);
  return {
    getLocale: () => locale,
    setLocale,
    engine,
    getSnapshot: engine.getSnapshot,
    submitAnswer(value: string) {
      if (destroyed) throw new Error("Quiz has been destroyed");
      return engine.submit(value);
    },
    reset,
    setTheme(value: Theme) {
      if (!["light", "system", "dark"].includes(value))
        throw new Error("Unknown theme");
      if (!destroyed) {
        theme = value;
        storage.saveTheme(theme);
        applyTheme();
      }
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      unsubscribe();
      window.clearInterval(interval);
      window.clearTimeout(resultTimer);
      scheme?.removeEventListener("change", onSchemeChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (audio) void audio.close().catch(() => {});
      ui.destroy();
      if (themeMeta && originalThemeColor !== undefined)
        themeMeta.content = originalThemeColor;
    },
  };
}
