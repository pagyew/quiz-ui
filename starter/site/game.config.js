import { answers, categories } from "./answers.js";
import { ru } from "./ru.js";

/** @type {import('@pagyew/quiz-ui').QuizConfig} */
export const config = {
  locale: "en",
  translations: { ru },
  id: "fruit-type",
  answers,
  categories,
  branding: {
    name: "Fruit Type",
    wordmark: ["fruit", "type"],
    mark: "(:)",
    eyebrow: "A LITTLE MEMORY GAME",
    title: ["How many fruits", "can you"],
    emphasis: "name?",
    description: [
      "A dozen familiar flavors. How many come to mind?",
      "Fill the bowl, one answer at a time.",
    ],
    footer: "Good things grow with practice.",
    footerNote: "MADE WITH QUIZ UI",
  },
  labels: {
    inputLabel: "Type a fruit",
    inputPlaceholder: "Type a fruit and press Enter…",
    resultUnit: "FRUITS\nFOUND",
    quizTimeDescription: "Two minutes by default",
  },
  board: {
    title: "The fruit bowl",
    description: "12 familiar fruits",
    sprintDescription: "6 random fruits",
  },
  howToPlay: {
    kicker: "A FRESH START",
    title: "Trust your taste.",
    steps: [
      { title: "Name a fruit.", description: "Type a name and press Enter." },
      {
        title: "Keep remembering.",
        description: "The clock starts with your first guess or hint.",
      },
      {
        title: "Try a hint.",
        description: "Reveal the first letter when you need a little help.",
      },
    ],
  },
  defaults: { durationSeconds: 120 },
  sprint: { size: 6, durationSeconds: 60 },
};
