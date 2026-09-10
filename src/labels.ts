import type {
  Locale,
  QuizLabels,
  QuizResult,
  ResultPresentation,
} from "./types.js";

export const defaultLabels: QuizLabels = {
  language: "Language",
  colorTheme: "Color theme",
  settingsKicker: "GAME CONFIG",
  invalidSettings:
    "These settings could not be applied. Choose valid options and try again.",
  home: (name) => `${name} home`,
  randomEntries: (count) =>
    `${count} random ${count === 1 ? "entry" : "entries"}`,
  cardHint: (hint) => `Hint: ${hint}`,
  cardFound: (answer) => `${answer} — found`,
  cardAssisted: (answer) => `${answer} — found with a hint`,
  cardMissed: (answer) => `${answer} — missed`,
  shareTitle: (name) => `${name} result`,
  shareMessage: (result, name, grade) =>
    `I found ${result.score}/${result.total} answers in ${name} — ${grade}.`,
  sound: "Toggle sound",
  howToPlay: "How to play",
  lightTheme: "Light theme",
  systemTheme: "System theme",
  darkTheme: "Dark theme",
  discovered: "DISCOVERED",
  time: "TIME",
  submit: "Submit answer",
  inputLabel: "Type an answer",
  inputPlaceholder: "Type an answer and press Enter…",
  personalBest: "PERSONAL BEST",
  sprint: "Quick sprint",
  settings: "Settings",
  hint: "Reveal a hint",
  giveUp: "Give up",
  reset: "Reset",
  results: "View results",
  close: "Close",
  applySettings: "Apply & restart",
  startTyping: "Start typing",
  share: "Share result",
  playAgain: "Play again",
  quizTime: "Quiz time",
  quizTimeDescription: "Five minutes by default",
  shuffle: "Shuffle within categories",
  shuffleDescription: "Keep the map, change the order",
  noTimer: "No timer",
  reference: "Read the reference",
  settingsTitle: "Make it your quiz.",
  sessionComplete: "SESSION COMPLETE",
  resultUnit: "ANSWERS\nFOUND",
  copied: "Result copied to clipboard",
  shareUnavailable:
    "Sharing is unavailable in this browser. You can copy the result below.",
  noHints: "No more hints available",
  hiddenAnswer: "Undiscovered answer",
  progress: "Answers discovered",
  minutes: (minutes) => `${minutes} ${minutes === 1 ? "minute" : "minutes"}`,
  cooldown: (seconds) => `Hint in ${seconds}s`,
  duplicate: (answer) => `Already found ${answer}`,
  unknown: (answer) => `No ${answer} in this round`,
};

const russianPlural = new Intl.PluralRules("ru");
function plural(
  value: number,
  one: string,
  few: string,
  many: string,
  other = few,
): string {
  return ({ one, few, many, other } as Record<string, string>)[
    russianPlural.select(value)
  ]!;
}
export const russianLabels: QuizLabels = {
  language: "Язык",
  colorTheme: "Цветовая тема",
  settingsKicker: "НАСТРОЙКИ ИГРЫ",
  invalidSettings:
    "Не удалось применить настройки. Проверьте выбранные параметры и попробуйте ещё раз.",
  home: (name) => `${name} — главная`,
  randomEntries: (count) =>
    `${count} ${plural(count, "случайный ответ", "случайных ответа", "случайных ответов")}`,
  cardHint: (hint) => `Подсказка: ${hint}`,
  cardFound: (answer) => `${answer} — найдено`,
  cardAssisted: (answer) => `${answer} — найдено с подсказкой`,
  cardMissed: (answer) => `${answer} — пропущено`,
  shareTitle: (name) => `${name} — результат`,
  shareMessage: (result, name, grade) =>
    `Мой результат в ${name}: ${result.score}/${result.total} — ${grade}.`,
  sound: "Включить или выключить звук",
  howToPlay: "Как играть",
  lightTheme: "Светлая тема",
  systemTheme: "Системная тема",
  darkTheme: "Тёмная тема",
  discovered: "НАЙДЕНО",
  time: "ВРЕМЯ",
  submit: "Отправить ответ",
  inputLabel: "Введите ответ",
  inputPlaceholder: "Введите ответ и нажмите Enter…",
  personalBest: "РЕКОРД",
  sprint: "Быстрый раунд",
  settings: "Настройки",
  hint: "Подсказка",
  giveUp: "Сдаюсь",
  reset: "Заново",
  results: "Результаты",
  close: "Закрыть",
  applySettings: "Применить и начать заново",
  startTyping: "Начать игру",
  share: "Поделиться",
  playAgain: "Играть ещё",
  quizTime: "Время игры",
  quizTimeDescription: "По умолчанию — пять минут",
  shuffle: "Перемешать внутри категорий",
  shuffleDescription: "Категории те же, порядок другой",
  noTimer: "Без таймера",
  reference: "Открыть справку",
  settingsTitle: "Игра по вашим правилам.",
  sessionComplete: "РАУНД ЗАВЕРШЁН",
  resultUnit: "ОТВЕТОВ\nНАЙДЕНО",
  copied: "Результат скопирован",
  shareUnavailable:
    "В этом браузере нельзя поделиться автоматически. Скопируйте результат ниже.",
  noHints: "Подсказок больше нет",
  hiddenAnswer: "Неоткрытый ответ",
  progress: "Найденные ответы",
  minutes: (value) =>
    `${value.toLocaleString("ru")} ${plural(value, "минута", "минуты", "минут", "минуты")}`,
  cooldown: (value) =>
    `Подсказка через ${value} ${plural(value, "секунду", "секунды", "секунд")}`,
  duplicate: (answer) => `Уже найдено: ${answer}`,
  unknown: (answer) => `В этом раунде нет ответа «${answer}»`,
};
export const localeLabels: Readonly<Record<Locale, QuizLabels>> = {
  en: defaultLabels,
  ru: russianLabels,
};

export function formatTime(seconds: number | null): string {
  if (seconds === null) return "∞";
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function presentResult(
  result: QuizResult,
  locale: Locale = "en",
): ResultPresentation {
  const ratio = result.score / result.total;
  if (locale === "ru")
    return {
      title:
        result.reason === "won"
          ? "Вы вспомнили всё!"
          : "Продолжайте открывать новое.",
      description:
        result.reason === "won"
          ? `Вы назвали все ответы за ${formatTime(result.elapsedSeconds)}.`
          : `Найдено ${result.score} из ${result.total}. Пропущенные ответы выделены красным.`,
      grade:
        ratio === 1
          ? "БЕЗУПРЕЧНАЯ ПАМЯТЬ"
          : ratio >= 0.8
            ? "МАСТЕР ПАМЯТИ"
            : ratio >= 0.6
              ? "УВЕРЕННЫЕ ЗНАНИЯ"
              : ratio >= 0.35
                ? "ЛЮБОЗНАТЕЛЬНЫЙ ИССЛЕДОВАТЕЛЬ"
                : "ВПЕРЕДИ МНОГО ОТКРЫТИЙ",
    };
  return {
    title:
      result.reason === "won" ? "You found them all." : "Keep discovering.",
    description:
      result.reason === "won"
        ? `You named every answer in ${formatTime(result.elapsedSeconds)}.`
        : `You found ${result.score} of ${result.total}. Every missed answer is now shown in red.`,
    grade:
      ratio === 1
        ? "PERFECT RECALL"
        : ratio >= 0.8
          ? "MEMORY MASTER"
          : ratio >= 0.6
            ? "SOLID KNOWLEDGE"
            : ratio >= 0.35
              ? "CURIOUS EXPLORER"
              : "KEEP EXPLORING",
  };
}
