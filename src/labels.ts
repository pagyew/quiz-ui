import type { QuizLabels, QuizResult, ResultPresentation } from "./types.js";

export const defaultLabels: QuizLabels = {
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
  minutes: (minutes) => `${minutes} minutes`,
  cooldown: (seconds) => `Hint in ${seconds}s`,
  duplicate: (answer) => `Already found ${answer}`,
  unknown: (answer) => `No ${answer} in this round`,
};

export function formatTime(seconds: number | null): string {
  if (seconds === null) return "∞";
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function presentResult(result: QuizResult): ResultPresentation {
  const ratio = result.score / result.total;
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
