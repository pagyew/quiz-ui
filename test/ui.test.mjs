import { test } from "node:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";
import { createQuiz } from "../dist/index.js";
import { createQuizUI, createAnswerCard, createDialog } from "../dist/ui.js";
import { createQuizEngine } from "../dist/core.js";
import { config, memoryStorage } from "./fixture.mjs";

function setup(t, overrides = {}, options) {
  const window = new Window({ url: "https://example.test/game/" });
  window.document.body.innerHTML =
    '<div id="quiz"></div><button id="outside">Outside</button>';
  window.HTMLElement.prototype.scrollIntoView = function () {};
  const root = window.document.querySelector("#quiz");
  const quiz = createQuiz(root, { ...config, ...overrides }, options);
  t.after(async () => {
    quiz.destroy();
    await window.happyDOM.close();
  });
  const submit = (value) => {
    root.querySelector("input.quiz-input").value = value;
    root
      .querySelector("form")
      .dispatchEvent(
        new window.Event("submit", { bubbles: true, cancelable: true }),
      );
  };
  const click = (text) =>
    [...root.querySelectorAll("button")]
      .find((button) => button.textContent.trim() === text)
      ?.click();
  return { window, root, quiz, submit, click };
}

test("the real form drives score, progress, repeat feedback, and card states", (t) => {
  const { root, quiz, submit } = setup(t);
  submit("alpha");
  assert.equal(quiz.getSnapshot().found.length, 1);
  assert.equal(
    root.querySelector('[data-answer="alpha"]').dataset.state,
    "found",
  );
  assert.equal(
    root.querySelector('[role="progressbar"]').getAttribute("aria-valuenow"),
    "1",
  );
  submit("alpha");
  assert.match(
    root.querySelector('[role="status"]').textContent,
    /Already found/,
  );
  submit("wrong");
  assert.match(root.querySelector('[role="status"]').textContent, /No wrong/);
});
test("hinted, assisted and missed cards survive the finish flow and results can reopen", async (t) => {
  const { root, quiz, submit, click } = setup(t, {}, { random: () => 0 });
  quiz.engine.hint();
  assert.equal(
    root.querySelector('[data-answer="alpha"]').dataset.state,
    "hinted",
  );
  submit("alpha");
  assert.equal(
    root.querySelector('[data-answer="alpha"]').dataset.state,
    "found-with-hint",
  );
  click("Give up");
  await new Promise((resolve) => setTimeout(resolve, 280));
  assert.equal(
    root.querySelector('[data-answer="beta"]').dataset.state,
    "missed",
  );
  assert.equal(root.querySelector(".quiz-result-dialog").open, true);
  assert.equal(root.querySelector(".quiz-input").disabled, true);
  root.querySelector(".quiz-result-dialog .quiz-dialog-close").click();
  root.querySelector(".quiz-results-button").click();
  assert.equal(root.querySelector(".quiz-result-dialog").open, true);
});
test("a reset cancels delayed result opening and restores the input", async (t) => {
  const { root, quiz, click } = setup(t);
  click("Give up");
  quiz.reset();
  await new Promise((resolve) => setTimeout(resolve, 280));
  assert.equal(root.querySelector(".quiz-result-dialog").open, false);
  assert.equal(root.querySelector(".quiz-input").disabled, false);
});
test("settings are applied through UI, retain untimed mode and include optional packs", (t) => {
  const { root, quiz, click } = setup(t);
  click("⚙Settings");
  const dialog = root.querySelector(".quiz-settings-dialog");
  assert.equal(dialog.open, true);
  dialog.querySelector("select").value = "0";
  dialog.querySelector('[role="switch"]').checked = true;
  dialog.querySelector(".quiz-primary").click();
  assert.equal(quiz.getSnapshot().remainingSeconds, null);
  assert.equal(quiz.getSnapshot().pool.length, 3);
  assert.equal(dialog.open, false);
});
test("hotkeys do not fire while typing, inside a modal, or outside the owning game", (t) => {
  const { window, root, quiz, click } = setup(t, {}, { random: () => 0 });
  const press = () =>
    window.document.dispatchEvent(
      new window.KeyboardEvent("keydown", { key: "h", bubbles: true }),
    );
  root.querySelector("input").focus();
  press();
  assert.equal(quiz.getSnapshot().hinted.length, 0);
  click("⚙Settings");
  press();
  assert.equal(quiz.getSnapshot().hinted.length, 0);
  root.querySelector(".quiz-settings-dialog").close();
  window.document.querySelector("#outside").focus();
  press();
  assert.equal(quiz.getSnapshot().hinted.length, 0);
  root.querySelector(".quiz-action").focus();
  press();
  assert.equal(quiz.getSnapshot().hinted.length, 1);
});
test("multiple instances isolate input, dialogs, state and storage", (t) => {
  const { window, root, quiz, submit } = setup(t);
  const second = window.document.createElement("div");
  window.document.body.append(second);
  const other = createQuiz(second, { ...config, id: "another" });
  t.after(() => other.destroy());
  submit("alpha");
  assert.equal(quiz.getSnapshot().found.length, 1);
  assert.equal(other.getSnapshot().found.length, 0);
  assert.equal(
    second.querySelector('[data-answer="alpha"]').dataset.state,
    "hidden",
  );
  const ids = [...window.document.querySelectorAll("[id]")].map(
    (element) => element.id,
  );
  assert.equal(new Set(ids).size, ids.length);
  assert.throws(() => createQuiz(root, config), /already contains/);
});
test("content is rendered as text and unsafe reference URLs never become clickable", (t) => {
  const { root, submit } = setup(t, {
    ...config,
    answers: [
      {
        id: "<img src=x onerror=alert(1)>",
        category: "letters",
        docsUrl: "javascript:alert(1)",
      },
      { id: "beta", category: "letters" },
    ],
  });
  submit("<img src=x onerror=alert(1)>");
  root.querySelector(".quiz-card:not(:disabled)").click();
  assert.equal(root.querySelectorAll("img").length, 0);
  assert.equal(root.querySelector(".quiz-docs-link").hidden, true);
  assert.equal(
    root.querySelector(".quiz-docs-link").hasAttribute("href"),
    false,
  );
});
test("destroy restores host content and listeners and allows a clean remount", async (t) => {
  const { window, root, quiz } = setup(t);
  quiz.engine.finish();
  quiz.destroy();
  assert.equal(root.classList.contains("quiz-ui"), false);
  assert.equal(root.children.length, 0);
  await new Promise((resolve) => setTimeout(resolve, 280));
  assert.equal(root.querySelector("dialog"), null);
  const mounted = createQuiz(root, config);
  mounted.destroy();
  assert.equal(root.childNodes.length, 0);
  assert.throws(() => quiz.submitAnswer("alpha"), /destroyed/);
});
test("dark preference migrates to a scoped theme and never changes the host body", (t) => {
  const storage = memoryStorage({ "old-theme": "dark" });
  const { root, window, quiz } = setup(t, {
    storage: { adapter: storage, legacy: { themeKey: "old-theme" } },
  });
  assert.equal(root.dataset.theme, "dark");
  assert.equal(window.document.body.className, "");
  quiz.setTheme("light");
  assert.equal(root.dataset.theme, "light");
  assert.equal(storage.getItem("quiz-ui:letters:v1:theme"), "light");
});
test("UI components also work with a caller-owned engine", async (t) => {
  const window = new Window({ url: "https://example.test/" });
  const root = window.document.body;
  const engine = createQuizEngine(config);
  const noop = () => {};
  const ui = createQuizUI(root, config, {
    submit: (value) => engine.submit(value),
    hint: noop,
    reset: noop,
    sprint: noop,
    settings: () => true,
    theme: noop,
    sound: noop,
    share: noop,
    giveUp: noop,
  });
  ui.render(engine.getSnapshot());
  engine.submit("alpha");
  ui.render(engine.getSnapshot());
  assert.equal(
    root.querySelector('[data-answer="alpha"]').dataset.state,
    "found",
  );
  t.after(async () => {
    ui.destroy();
    await window.happyDOM.close();
  });
});
test("standalone answer cards expose every visual state without an engine", async (t) => {
  const window = new Window();
  for (const state of [
    "hidden",
    "hinted",
    "found",
    "found-with-hint",
    "missed",
  ]) {
    const card = createAnswerCard(
      window.document,
      { id: "alpha", category: "letters" },
      { state },
    );
    assert.equal(card.dataset.state, state);
    assert.equal(card.disabled, !["found", "found-with-hint"].includes(state));
  }
  t.after(() => window.happyDOM.close());
});
test("clicking dialog padding does not dismiss it; clicking outside the surface does", async (t) => {
  const window = new Window();
  const dialog = createDialog(window.document, { title: "Example" });
  window.document.body.append(dialog.element);
  dialog.open();
  dialog.element.getBoundingClientRect = () => ({
    left: 100,
    right: 500,
    top: 100,
    bottom: 500,
  });
  dialog.element.dispatchEvent(
    new window.MouseEvent("click", { clientX: 120, clientY: 120 }),
  );
  assert.equal(dialog.element.open, true);
  dialog.element.dispatchEvent(
    new window.MouseEvent("click", { clientX: 10, clientY: 10 }),
  );
  assert.equal(dialog.element.open, false);
  t.after(() => window.happyDOM.close());
});

test("starting from a dialog keeps the input focused after the close event", async (t) => {
  const { root, window, click } = setup(t);
  const opener = root.querySelector(".quiz-how-button");
  opener.focus();
  opener.click();
  click("→Start typing");
  // Browsers queue the native close event; emulate that timing explicitly.
  root.querySelector("dialog").dispatchEvent(new window.Event("close"));
  assert.equal(
    window.document.activeElement,
    root.querySelector(".quiz-input"),
  );
  opener.focus();
  opener.click();
  root.querySelector(".quiz-dialog-close").click();
  root.querySelector("dialog").dispatchEvent(new window.Event("close"));
  assert.equal(window.document.activeElement, opener);
});
