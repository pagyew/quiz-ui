import { createQuiz } from "./vendor/quiz-ui/index.js";
import { config } from "./game.config.js";

createQuiz("#quiz", {
  ...config,
  onLocaleChange(locale) {
    document.documentElement.lang = locale;
  },
});
