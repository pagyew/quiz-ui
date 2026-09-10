import { test } from "node:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";
import {
  createQuiz,
  createQuizStorage,
  localeLabels,
  presentResult,
} from "../dist/index.js";
import { createQuizUI, createAnswerCard, createDialog } from "../dist/ui.js";
import { createQuizEngine } from "../dist/core.js";
import { localizeConfig } from "../dist/i18n.js";
import { config, memoryStorage } from "./fixture.mjs";

const translations = {
  ru: {
    branding: {
      title: ["Сколько букв вы помните?"],
      emphasis: "",
      description: ["Назовите буквы."],
    },
    categories: {
      letters: { label: "Буквы", description: "Знакомые символы" },
    },
    packs: { extra: { label: "Больше букв", description: "Ещё один ответ" } },
    answers: { alpha: { summary: "Первая буква" } },
    howToPlay: {
      title: "Назовите буквы",
      steps: [{ title: "Введите ответ", description: "Нажмите Enter" }],
    },
  },
};
function mount(t, overrides = {}, engineOptions) {
  const window = new Window({ url: "https://example.test/game/" });
  const root = window.document.createElement("div");
  root.lang = "de";
  window.document.body.append(root);
  window.HTMLElement.prototype.scrollIntoView = function () {};
  const quiz = createQuiz(
    root,
    { ...config, translations, ...overrides },
    engineOptions,
  );
  t.after(async () => {
    quiz.destroy();
    await window.happyDOM.close();
  });
  const switchTo = (locale) => {
    const control = root.querySelector(".quiz-language");
    control.value = locale;
    control.dispatchEvent(new window.Event("change", { bubbles: true }));
  };
  return { window, root, quiz, switchTo };
}
test("English is the default, persisted supported locales win, and corrupt or denied storage falls back", (t) => {
  const storage = memoryStorage();
  const notifications = [];
  const first = mount(t, {
    storage: { adapter: storage },
    onLocaleChange: (value) => notifications.push(value),
  });
  assert.equal(first.quiz.getLocale(), "en");
  assert.equal(first.root.lang, "en");
  first.switchTo("ru");
  assert.deepEqual(notifications, ["en", "ru"]);
  assert.equal(storage.getItem("quiz-ui:letters:v1:locale"), "ru");
  const second = mount(t, { storage: { adapter: storage } });
  assert.equal(second.quiz.getLocale(), "ru");
  assert.equal(
    second.root.querySelector(".quiz-how-button").getAttribute("aria-label"),
    "Как играть",
  );
  storage.setItem("quiz-ui:letters:v1:locale", "fr");
  assert.equal(
    mount(t, { storage: { adapter: storage } }).quiz.getLocale(),
    "en",
  );
  const denied = createQuizStorage(config, {
    getItem() {
      throw Error();
    },
    setItem() {
      throw Error();
    },
  });
  assert.equal(denied.locale(), "en");
  assert.doesNotThrow(() => denied.saveLocale("ru"));
  assert.equal(mount(t, { locale: "ru" }).quiz.getLocale(), "ru");
});
test("language switching preserves the running round, typed draft, focus, cooldown and best score", (t) => {
  let now = 0;
  const storage = memoryStorage();
  createQuizStorage(config, storage).saveBest(
    createQuizEngine(config).getSnapshot().settings,
    "standard",
    2,
  );
  const { root, quiz, window, switchTo } = mount(
    t,
    { storage: { adapter: storage } },
    { now: () => now, random: () => 0 },
  );
  quiz.engine.hint();
  quiz.submitAnswer("alpha");
  now = 3000;
  quiz.engine.tick();
  const input = root.querySelector(".quiz-input");
  input.value = "be";
  input.focus();
  input.setSelectionRange(1, 2);
  const before = quiz.getSnapshot();
  switchTo("ru");
  assert.deepEqual(quiz.getSnapshot(), before);
  assert.equal(root.querySelector(".quiz-input"), input);
  assert.equal(input.value, "be");
  assert.equal(input.selectionStart, 1);
  assert.equal(window.document.activeElement, input);
  assert.equal(root.querySelector(".quiz-best b").textContent, "2");
  assert.match(root.querySelector("h1").textContent, /Сколько/);
  assert.match(
    root.querySelector('[data-answer="alpha"]').getAttribute("aria-label"),
    /найдено с подсказкой/,
  );
  assert.match(
    root.querySelector('[data-answer="beta"]').getAttribute("aria-label"),
    /Неоткрытый ответ — Буквы/,
  );
  assert.match(
    root.querySelector(".quiz-board-actions").textContent,
    /Подсказка через 7 секунд/,
  );
  quiz.submitAnswer("b");
  assert.equal(quiz.getSnapshot().result.reason, "won");
  switchTo("en");
  assert.match(root.querySelector("h1").textContent, /How many letters/);
  assert.equal(quiz.getSnapshot().status, "finished");
  assert.throws(() => quiz.setLocale("fr"), /Unsupported quiz locale/);
});
test("open settings keep draft choices and focus while labels, options and rules update", (t) => {
  const { root, quiz, window } = mount(t);
  [...root.querySelectorAll("button")]
    .find((b) => b.textContent.includes("Settings"))
    .click();
  const dialog = root.querySelector(".quiz-settings-dialog");
  const duration = dialog.querySelector("select");
  duration.value = "0";
  duration.focus();
  dialog.querySelector("input").checked = true;
  quiz.setLocale("ru");
  assert.equal(dialog.open, true);
  assert.equal(window.document.activeElement, duration);
  assert.equal(duration.value, "0");
  assert.equal(dialog.querySelector("input").checked, true);
  assert.match(dialog.textContent, /Больше букв/);
  assert.equal(duration.selectedOptions[0].textContent, "Без таймера");
  assert.equal(
    dialog.querySelector(".quiz-dialog-close").getAttribute("aria-label"),
    "Закрыть",
  );
  assert.match(root.querySelector("dialog ol").textContent, /Нажмите Enter/);
  dialog.querySelector(".quiz-primary").click();
  assert.equal(quiz.getSnapshot().remainingSeconds, null);
  assert.equal(quiz.getSnapshot().pool.length, 3);
});
test("references opened before or after switching read translated content; results and sharing follow locale", async (t) => {
  const { root, quiz, window } = mount(t);
  quiz.submitAnswer("alpha");
  const card = root.querySelector('[data-answer="alpha"]');
  card.click();
  const reference = root.querySelector(".quiz-reference-dialog");
  quiz.setLocale("ru");
  assert.equal(reference.open, true);
  assert.match(reference.textContent, /Первая буква/);
  reference.close();
  card.click();
  assert.match(reference.textContent, /Первая буква/);
  reference.close();
  quiz.engine.finish();
  await new Promise((resolve) => setTimeout(resolve, 280));
  const result = root.querySelector(".quiz-result-dialog");
  assert.match(result.textContent, /Найдено 1 из 2/);
  assert.match(
    root.querySelector('[data-answer="beta"]').getAttribute("aria-label"),
    /пропущено/,
  );
  const shared = [];
  Object.defineProperty(window.navigator, "share", {
    value: async (value) => shared.push(value),
  });
  result.querySelector(".quiz-primary").click();
  await Promise.resolve();
  assert.match(shared[0].title, /результат/);
  assert.match(shared[0].text, /Мой результат/);
  quiz.setLocale("en");
  assert.equal(result.open, true);
  assert.match(result.textContent, /You found 1 of 2/);
});
test("feedback uses the current language and transient old-language messages clear on switch", (t) => {
  const { root, quiz } = mount(t);
  quiz.submitAnswer("wrong");
  quiz.setLocale("ru");
  assert.equal(root.querySelector(".quiz-input-feedback").textContent, "");
  quiz.submitAnswer("wrong");
  assert.match(
    root.querySelector(".quiz-input-feedback").textContent,
    /В этом раунде нет/,
  );
  quiz.submitAnswer("alpha");
  quiz.submitAnswer("alpha");
  assert.match(
    root.querySelector(".quiz-input-feedback").textContent,
    /Уже найдено/,
  );
});
test("locale isolation, hidden host selector, and destroy restore the original lang attribute", (t) => {
  const first = mount(t, { showLanguageSwitcher: false });
  const second = mount(t);
  assert.equal(first.root.querySelector(".quiz-language").hidden, true);
  first.quiz.setLocale("ru");
  assert.equal(second.quiz.getLocale(), "en");
  assert.equal(first.window.document.documentElement.lang, "");
  first.quiz.destroy();
  assert.equal(first.root.lang, "de");
  first.quiz.setLocale("en");
  assert.equal(first.root.lang, "de");
});
test("partial translations fall back without mutating base config or accepting translated identity fields", () => {
  const base = structuredClone({ ...config, translations });
  base.translations.ru.answers.alpha.id = "changed";
  base.translations.ru.answers.alpha.aliases = ["новый ответ"];
  const ru = localizeConfig(base, "ru");
  assert.equal(ru.branding.name, config.branding.name);
  assert.equal(ru.labels.submit, "Отправить ответ");
  assert.equal(ru.answers[0].id, "alpha");
  assert.equal(ru.answers[0].aliases, undefined);
  assert.equal(base.categories[0].label, "Letters");
  assert.equal(localizeConfig(base, "en").categories[0].label, "Letters");
  assert.match(
    presentResult(
      { score: 0, total: 2, reason: "timeout", elapsedSeconds: 300 },
      "ru",
    ).description,
    /Найдено 0 из 2/,
  );
});
test("dictionaries have parity and Russian numbers use singular, few, many and fractional forms", () => {
  assert.deepEqual(
    Object.keys(localeLabels.en).sort(),
    Object.keys(localeLabels.ru).sort(),
  );
  for (const [number, word] of [
    [1, "минута"],
    [2, "минуты"],
    [5, "минут"],
    [11, "минут"],
    [21, "минута"],
    [22, "минуты"],
    [1.5, "минуты"],
  ])
    assert.equal(
      localeLabels.ru.minutes(number),
      `${number.toLocaleString("ru")} ${word}`,
    );
  assert.equal(localeLabels.en.minutes(1), "1 minute");
  assert.equal(localeLabels.ru.cooldown(1), "Подсказка через 1 секунду");
});
test("standalone UI and components support Russian without storage or an orchestrator", async (t) => {
  const window = new Window();
  const noop = () => {};
  const ui = createQuizUI(
    window.document.body,
    { ...config, translations },
    {
      submit: noop,
      hint: noop,
      reset: noop,
      sprint: noop,
      settings: () => true,
      theme: noop,
      sound: noop,
      share: noop,
      giveUp: noop,
    },
  );
  ui.render(createQuizEngine(config).getSnapshot());
  const control = window.document.querySelector(".quiz-language");
  control.value = "ru";
  control.dispatchEvent(new window.Event("change"));
  assert.equal(ui.getLocale(), "ru");
  assert.match(window.document.body.textContent, /Буквы/);
  for (const [state, label] of [
    ["hidden", "Неоткрытый"],
    ["hinted", "Подсказка"],
    ["found", "найдено"],
    ["found-with-hint", "с подсказкой"],
    ["missed", "пропущено"],
  ]) {
    const card = createAnswerCard(window.document, config.answers[0], {
      state,
      locale: "ru",
    });
    assert.ok(card.getAttribute("aria-label").includes(label));
  }
  const dialog = createDialog(window.document, {
    title: "Пример",
    locale: "ru",
  });
  assert.equal(dialog.closeButton.getAttribute("aria-label"), "Закрыть");
  t.after(async () => {
    dialog.destroy();
    ui.destroy();
    await window.happyDOM.close();
  });
});
