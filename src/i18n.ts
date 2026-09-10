import { localeLabels, presentResult } from "./labels.js";
import type { Locale, QuizConfig } from "./types.js";

export const supportedLocales = ["en", "ru"] as const;
export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "ru";
}
export function requireLocale(value: unknown): Locale {
  if (!isLocale(value))
    throw new Error(`Unsupported quiz locale: ${String(value)}`);
  return value;
}
/** Resolve presentation from the base config each time; never mutate game data. */
export function localizeConfig(base: QuizConfig, locale: Locale) {
  const translated = base.translations?.[locale];
  return {
    ...base,
    locale,
    branding: { ...base.branding, ...translated?.branding },
    board: { ...base.board, ...translated?.board },
    howToPlay: { ...base.howToPlay, ...translated?.howToPlay },
    labels: { ...localeLabels[locale], ...base.labels, ...translated?.labels },
    categories: base.categories.map((item) => ({
      ...item,
      label: translated?.categories?.[item.id]?.label ?? item.label,
      description:
        translated?.categories?.[item.id]?.description ?? item.description,
    })),
    packs: base.packs?.map((item) => ({
      ...item,
      label: translated?.packs?.[item.id]?.label ?? item.label,
      description:
        translated?.packs?.[item.id]?.description ?? item.description,
    })),
    answers: base.answers.map((item) => ({
      ...item,
      summary: translated?.answers?.[item.id]?.summary ?? item.summary,
      docsUrl: translated?.answers?.[item.id]?.docsUrl ?? item.docsUrl,
    })),
    referenceLabel: translated?.referenceLabel ?? base.referenceLabel,
    presentResult:
      translated?.presentResult ??
      base.presentResult ??
      ((result) => presentResult(result, locale)),
    shareText: translated?.shareText ?? base.shareText,
  } satisfies QuizConfig;
}
