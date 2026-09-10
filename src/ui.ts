import { localizeConfig, requireLocale, supportedLocales } from "./i18n.js";
import {
  button,
  createAnswerCard,
  createCategorySection,
  createDialog,
  element,
  safeUrl,
  updateAnswerCard,
} from "./components.js";
import { formatTime } from "./labels.js";
import type {
  Answer,
  Locale,
  CardState,
  QuizConfig,
  QuizSettings,
  QuizSnapshot,
  Theme,
} from "./types.js";
export {
  createAnswerCard,
  createCategorySection,
  createDialog,
  createIcon,
  updateAnswerCard,
} from "./components.js";
export {
  defaultLabels,
  russianLabels,
  localeLabels,
  formatTime,
  presentResult,
} from "./labels.js";
export type { AnswerCardOptions } from "./components.js";
export { supportedLocales } from "./i18n.js";
export type {
  CardState,
  Locale,
  QuizConfig,
  QuizLabels,
  QuizTranslation,
  Theme,
} from "./types.js";

export interface QuizUIActions {
  submit(value: string): void;
  hint(): void;
  reset(): void;
  sprint(): void;
  settings(settings: QuizSettings): boolean;
  theme(theme: Theme): void;
  locale?(locale: Locale): void;
  sound(): void;
  share(): void;
  giveUp(): void;
}
export interface QuizUI {
  render(snapshot: QuizSnapshot, best?: number): void;
  setTheme(theme: Theme, dark: boolean): void;
  getLocale(): Locale;
  setLocale(locale: Locale): void;
  setSound(enabled: boolean): void;
  feedback(text: string): void;
  toast(text: string): void;
  focusInput(): void;
  scrollToAnswer(id: string): void;
  showResults(): void;
  showShareFallback(text: string): void;
  destroy(): void;
}

const mounted = new WeakSet<HTMLElement>();

/** Render with any state manager. No timers, storage, or game engine are created here. */
export function createQuizUI(
  root: HTMLElement,
  baseConfig: QuizConfig,
  actions: QuizUIActions,
): QuizUI {
  if (mounted.has(root))
    throw new Error("This element already contains a Quiz UI instance");
  const document = root.ownerDocument;
  const window = document.defaultView;
  if (!window) throw new Error("Quiz UI needs a browser document");
  let locale = requireLocale(baseConfig.locale ?? "en");
  let config = localizeConfig(baseConfig, locale);
  let labels = config.labels;
  const abort = new window.AbortController();
  const on = (target: EventTarget, event: string, handler: EventListener) =>
    target.addEventListener(event, handler, { signal: abort.signal });
  const savedNodes = [...root.childNodes];
  const savedAttributes = new Map(
    ["class", "data-theme", "data-palette", "lang"].map((key) => [
      key,
      root.getAttribute(key),
    ]),
  );
  const byId = new Map(config.answers.map((answer) => [answer.id, answer]));
  const categoryById = new Map(
    config.categories.map((category) => [category.id, category]),
  );
  let snapshot: QuizSnapshot | null = null;
  let lastBest = 0;
  let referenceId: string | null = null;
  let destroyed = false;
  let feedbackTimer: number | undefined;
  let toastTimer: number | undefined;
  let scrollFrame: number | undefined;
  const formatAnswer =
    config.formatAnswer ?? ((answer: Answer) => answer.value ?? answer.id);
  const formatHint =
    config.formatHint ??
    ((answer: Answer) =>
      `${[...(answer.value ?? answer.id)][0]}${"·".repeat(Math.max(3, [...(answer.value ?? answer.id)].length - 1))}`);
  // Text bindings update existing nodes, preserving focus, input and modal drafts.
  const bindings: (() => void)[] = [];
  const bind = (update: () => void) => {
    bindings.push(update);
    update();
  };
  type Copy = string | (() => string | undefined);
  const appendCopy = (node: Node, copy?: Copy) => {
    if (copy === undefined) return;
    const text = document.createTextNode("");
    node.appendChild(text);
    if (typeof copy === "function")
      bind(() => {
        text.textContent = copy() ?? "";
      });
    else text.textContent = copy;
  };
  const attr = (node: Element, name: string, value: () => string) =>
    bind(() => node.setAttribute(name, value()));
  const e = <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className = "",
    text?: Copy,
  ) => {
    const node = element(document, tag, className);
    appendCopy(node, text);
    return node;
  };
  const b = (className: string, text: Copy, icon?: string) => {
    const node = button(document, className, "", icon);
    appendCopy(node.lastElementChild!, text);
    return node;
  };
  const brand = () => {
    const node = e("span", "quiz-brand");
    const mark = e("span", "quiz-brand-mark", () => config.branding.mark);
    mark.setAttribute("aria-hidden", "true");
    const word = e("span");
    bind(() => {
      word.replaceChildren();
      if (config.branding.wordmark)
        word.append(
          document.createTextNode(config.branding.wordmark[0]),
          e("span", "", config.branding.wordmark[1]),
        );
      else word.textContent = config.branding.name;
    });
    node.append(mark, word);
    return node;
  };
  const glyph = () => e("div", "quiz-glyph", () => config.branding.mark);
  const header = e("header", "quiz-topbar");
  const home = e("a");
  attr(
    home,
    "href",
    () =>
      safeUrl(config.branding.homeUrl ?? "#", document.baseURI, true) ?? "#",
  );
  attr(home, "aria-label", () => labels.home(config.branding.name));
  home.append(brand());
  const headerActions = e("div", "quiz-top-actions");
  const sound = b("quiz-icon-button", "♪");
  attr(sound, "aria-label", () => labels.sound);
  const themes = e("div", "quiz-themes");
  themes.setAttribute("role", "group");
  attr(themes, "aria-label", () => labels.colorTheme);
  const themeButtons = new Map<Theme, HTMLButtonElement>();
  for (const [theme, symbol, label] of [
    ["light", "☼", "lightTheme"],
    ["system", "◐", "systemTheme"],
    ["dark", "☾", "darkTheme"],
  ] as const) {
    const control = b("", symbol);
    attr(control, "aria-label", () => labels[label]);
    attr(control, "title", () => labels[label]);
    on(control, "click", () => actions.theme(theme));
    themeButtons.set(theme, control);
    themes.append(control);
  }
  const howButton = b("quiz-how-button", () => labels.howToPlay, "?");
  attr(howButton, "aria-label", () => labels.howToPlay);
  const language = e("select", "quiz-language");
  attr(language, "aria-label", () => labels.language);
  attr(language, "title", () => labels.language);
  language.hidden = baseConfig.showLanguageSwitcher === false;
  for (const value of supportedLocales) {
    const option = e("option", "", value.toUpperCase());
    option.value = value;
    option.lang = value;
    language.append(option);
  }
  language.value = locale;
  on(language, "change", () => {
    const value = requireLocale(language.value);
    if (actions.locale) actions.locale(value);
    else ui.setLocale(value);
  });
  headerActions.append(sound, themes, language, howButton);
  header.append(home, headerActions);
  const main = e("main");
  const hero = e("section", "quiz-hero");
  const eyebrow = e("div", "quiz-eyebrow");
  eyebrow.append(
    e("i"),
    e("span", "", () => config.branding.eyebrow),
  );
  const title = e("h1");
  bind(() => {
    title.replaceChildren();
    config.branding.title.forEach((line, index) => {
      if (index) title.append(e("br"));
      title.append(document.createTextNode(line));
    });
    if (config.branding.emphasis)
      title.append(
        document.createTextNode(" "),
        e("em", "", config.branding.emphasis),
      );
  });
  const description = e("p");
  bind(() => {
    description.replaceChildren();
    config.branding.description.forEach((line, index) => {
      if (index)
        description.append(
          document.createTextNode(" "),
          e("br", "quiz-desktop-only"),
        );
      description.append(document.createTextNode(line));
    });
  });
  hero.append(eyebrow, title, description);
  const shell = e("section", "quiz-shell");
  attr(shell, "aria-label", () => config.branding.name);
  const gameHead = e("div", "quiz-game-head");
  const scoreBlock = e("div", "quiz-status");
  const score = e("span", "", "0");
  const total = e("span", "", "0");
  const fraction = e("strong");
  fraction.append(score, e("b", "", "/"), total);
  scoreBlock.append(
    e("small", "", () => labels.discovered),
    fraction,
  );
  const form = e("form", "quiz-input-wrap");
  const prompt = e(
    "span",
    "quiz-prompt",
    () => config.branding.inputPrompt ?? ">",
  );
  prompt.setAttribute("aria-hidden", "true");
  const input = e("input", "quiz-input");
  attr(input, "aria-label", () => labels.inputLabel);
  input.autocomplete = "off";
  input.autocapitalize = "none";
  input.spellcheck = false;
  attr(input, "placeholder", () => labels.inputPlaceholder);
  input.enterKeyHint = "go";
  const submit = b("quiz-enter-key", "↵");
  submit.type = "submit";
  attr(submit, "aria-label", () => labels.submit);
  const feedback = e("div", "quiz-input-feedback");
  feedback.setAttribute("role", "status");
  feedback.setAttribute("aria-live", "polite");
  form.append(prompt, input, submit, feedback);
  const timerBlock = e("div", "quiz-status quiz-timer");
  const timer = e("strong", "", "05:00");
  timerBlock.append(
    e("small", "", () => labels.time),
    timer,
  );
  gameHead.append(scoreBlock, form, timerBlock);
  const progress = e("div", "quiz-progress");
  progress.setAttribute("role", "progressbar");
  attr(progress, "aria-label", () => labels.progress);
  progress.setAttribute("aria-valuemin", "0");
  const progressFill = e("div");
  progress.append(progressFill);
  const boardWrap = e("div", "quiz-board-wrap");
  const toolbar = e("div", "quiz-board-toolbar");
  const modeDescription = e("span");
  const modeTitle = e("b");
  const modeInfo = e("div");
  modeInfo.append(e("span", "quiz-live-dot"), modeTitle, modeDescription);
  const bestBlock = e("div", "quiz-best", () => labels.personalBest);
  const bestScore = e("b", "", "—");
  bestBlock.append(bestScore);
  toolbar.append(modeInfo, bestBlock);
  const boardActions = e("div", "quiz-board-actions");
  const sprint = b("quiz-action", () => labels.sprint, "⚡");
  sprint.hidden = config.sprint === false;
  const settingsButton = b("quiz-action", () => labels.settings, "⚙");
  const hint = b("quiz-action", () => labels.hint, "✦");
  const hintText = hint.lastElementChild!;
  hint.append(e("kbd", "", "H"));
  const giveUp = b("quiz-action quiz-danger", () => labels.giveUp);
  const reset = b("quiz-action", () => labels.reset, "↻");
  const resultsButton = b(
    "quiz-action quiz-results-button",
    () => labels.results,
    "↗",
  );
  resultsButton.hidden = true;
  boardActions.append(
    sprint,
    settingsButton,
    hint,
    giveUp,
    reset,
    resultsButton,
  );
  const board = e("div", "quiz-board");
  boardWrap.append(toolbar, boardActions, board);
  shell.append(gameHead, progress, boardWrap);
  main.append(hero, shell);
  const footer = e("footer", "quiz-footer");
  const footerBrand = brand();
  footerBrand.classList.add("quiz-muted");
  footer.append(
    footerBrand,
    e("p", "", () => config.branding.footer),
    e("span", "", () => config.branding.footerNote ?? ""),
  );
  const how = createDialog(document, {
    title: config.howToPlay.title,
    kicker: config.howToPlay.kicker,
    closeLabel: labels.close,
  });
  const steps = e("ol");
  bind(() => {
    steps.replaceChildren();
    for (const step of config.howToPlay.steps) {
      const item = e("li");
      item.append(e("b", "", step.title), e("span", "", step.description));
      steps.append(item);
    }
  });
  const start = b("quiz-primary", () => labels.startTyping, "→");
  how.content.append(steps, start);
  const settingsDialog = createDialog(document, {
    title: labels.settingsTitle,
    kicker: labels.settingsKicker,
    className: "quiz-settings-dialog",
    closeLabel: labels.close,
  });
  const durationRow = e("label", "quiz-setting-row");
  const durationCopy = e("span");
  durationCopy.append(
    e("b", "", () => labels.quizTime),
    e("span", "", () => labels.quizTimeDescription),
  );
  const durationSelect = e("select");
  attr(durationSelect, "aria-label", () => labels.quizTime);
  const durationValues = new Set([
    ...(config.durationOptions ?? [120, 300, 600, 900, 0]),
    config.defaults?.durationSeconds ?? 300,
  ]);
  for (const seconds of durationValues) {
    const option = e("option", "", () =>
      seconds ? labels.minutes(seconds / 60) : labels.noTimer,
    );
    option.value = String(seconds);
    durationSelect.append(option);
  }
  durationRow.append(durationCopy, durationSelect);
  settingsDialog.content.append(durationRow);
  const toggle = (title: Copy, copy: Copy) => {
    const row = e("label", "quiz-setting-row");
    const text = e("span");
    text.append(e("b", "", title), e("span", "", copy));
    const checkbox = e("input");
    checkbox.type = "checkbox";
    checkbox.setAttribute("role", "switch");
    row.append(text, checkbox);
    settingsDialog.content.append(row);
    return checkbox;
  };
  const packs = new Map(
    (config.packs ?? []).map((pack) => [
      pack.id,
      toggle(
        () => config.packs!.find((item) => item.id === pack.id)!.label,
        () =>
          config.packs!.find((item) => item.id === pack.id)!.description ?? "",
      ),
    ]),
  );
  const shuffle = toggle(
    () => labels.shuffle,
    () => labels.shuffleDescription,
  );
  const settingsError = e("p", "quiz-settings-error");
  settingsError.setAttribute("role", "alert");
  const apply = b("quiz-primary", () => labels.applySettings, "→");
  settingsDialog.content.append(settingsError, apply);
  const reference = createDialog(document, {
    title: "",
    className: "quiz-reference-dialog",
    closeLabel: labels.close,
  });
  reference.element.insertBefore(glyph(), reference.kicker);
  const referenceDescription = e("p");
  const docs = e("a", "quiz-docs-link", () => labels.reference);
  docs.target = "_blank";
  docs.rel = "noreferrer noopener";
  reference.content.append(referenceDescription, docs);
  const results = createDialog(document, {
    title: "",
    kicker: labels.sessionComplete,
    className: "quiz-result-dialog",
    closeLabel: labels.close,
  });
  results.element.insertBefore(glyph(), results.kicker);
  const resultCopy = e("p");
  const resultScore = e("strong");
  const resultScoreBlock = e("div", "quiz-result-score");
  resultScoreBlock.append(
    resultScore,
    e("span", "", () => labels.resultUnit),
  );
  const grade = e("div", "quiz-result-grade");
  const resultActions = e("div", "quiz-result-actions");
  const share = b("quiz-primary", () => labels.share, "↗");
  const again = b("quiz-primary quiz-secondary", () => labels.playAgain, "↻");
  resultActions.append(share, again);
  const fallback = e("div", "quiz-share-fallback");
  fallback.hidden = true;
  const fallbackText = e("textarea");
  fallbackText.readOnly = true;
  attr(fallbackText, "aria-label", () => labels.share);
  fallback.append(
    e("p", "", () => labels.shareUnavailable),
    fallbackText,
  );
  const resultNotice = e("p", "quiz-share-notice");
  resultNotice.setAttribute("role", "status");
  results.content.append(
    resultCopy,
    resultScoreBlock,
    grade,
    resultActions,
    resultNotice,
    fallback,
  );
  const toast = e("div", "quiz-toast");
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  const dialogs = [how, settingsDialog, reference, results];
  for (const dialog of dialogs)
    attr(dialog.closeButton, "aria-label", () => labels.close);
  bind(() => {
    how.heading.textContent = config.howToPlay.title;
    how.kicker.textContent = config.howToPlay.kicker ?? "";
    settingsDialog.heading.textContent = labels.settingsTitle;
    settingsDialog.kicker.textContent = labels.settingsKicker;
    results.kicker.textContent = labels.sessionComplete;
  });
  const closeDialogs = () => dialogs.forEach((dialog) => dialog.close());
  const focusInput = () => {
    if (
      !destroyed &&
      !input.disabled &&
      !dialogs.some((dialog) => dialog.element.open)
    )
      input.focus({ preventScroll: true });
  };
  const renderReference = (answer: Answer) => {
    reference.heading.textContent = formatAnswer(answer);
    const category = categoryById.get(answer.category)!;
    reference.kicker.textContent =
      config.referenceLabel?.(answer, category) ?? category.label.toUpperCase();
    referenceDescription.textContent =
      answer.summary ?? category.description ?? "";
    const url = safeUrl(answer.docsUrl, document.baseURI);
    docs.hidden = !url;
    if (url) docs.href = url;
    else docs.removeAttribute("href");
  };
  const openReference = (answer: Answer) => {
    referenceId = answer.id;
    renderReference(byId.get(answer.id)!);
    reference.open();
  };
  const cards = new Map<string, HTMLButtonElement>();
  const sections = new Map<string, ReturnType<typeof createCategorySection>>();
  let poolKey = "";
  let boardStateKey = "";
  function renderBoard(state: QuizSnapshot) {
    const nextStateKey = JSON.stringify([
      state.pool,
      state.found,
      state.hinted,
      state.activeHint,
      state.status,
    ]);
    if (boardStateKey === nextStateKey) return;
    boardStateKey = nextStateKey;
    const nextPoolKey = JSON.stringify(state.pool);
    if (poolKey !== nextPoolKey) {
      poolKey = nextPoolKey;
      cards.clear();
      sections.clear();
      board.replaceChildren();
      for (const category of config.categories) {
        const ids = state.pool.filter(
          (id) => byId.get(id)?.category === category.id,
        );
        if (!ids.length) continue;
        const section = createCategorySection(document, category);
        for (const id of ids) {
          const card = createAnswerCard(document, byId.get(id)!, {
            onOpen: openReference,
          });
          cards.set(id, card);
          section.grid.append(card);
        }
        sections.set(category.id, section);
        board.append(section.element);
      }
    }
    const found = new Set(state.found),
      hinted = new Set(state.hinted);
    for (const [id, card] of cards) {
      const answer = byId.get(id)!;
      const cardState: CardState = found.has(id)
        ? hinted.has(id)
          ? "found-with-hint"
          : "found"
        : state.status === "finished"
          ? "missed"
          : hinted.has(id)
            ? "hinted"
            : "hidden";
      updateAnswerCard(card, answer, {
        state: cardState,
        locale,
        labels,
        label: formatAnswer(answer),
        hint: formatHint(answer),
        hiddenLabel: `${labels.hiddenAnswer} — ${categoryById.get(answer.category)!.label}`,
      });
      card.classList.toggle(
        "quiz-hint-pulse",
        state.activeHint === id && !found.has(id),
      );
    }
    for (const [id, section] of sections) {
      section.label.textContent = categoryById.get(id)!.label;
      const ids = state.pool.filter(
        (answer) => byId.get(answer)?.category === id,
      );
      section.count.textContent = `${ids.filter((answer) => found.has(answer)).length}/${ids.length}`;
    }
  }
  on(form, "submit", (event) => {
    event.preventDefault();
    if (destroyed) return;
    const value = input.value;
    input.value = "";
    actions.submit(value);
  });
  on(input, "keydown", (event) => {
    if (
      (event as KeyboardEvent).key === "Enter" &&
      (event as KeyboardEvent).isComposing
    )
      event.preventDefault();
  });
  on(sound, "click", () => actions.sound());
  on(hint, "click", () => actions.hint());
  on(giveUp, "click", () => actions.giveUp());
  on(reset, "click", () => actions.reset());
  on(sprint, "click", () => actions.sprint());
  on(howButton, "click", () => how.open());
  on(start, "click", () => {
    how.close(false);
    focusInput();
  });
  on(resultsButton, "click", () => results.open());
  on(share, "click", () => actions.share());
  on(again, "click", () => {
    results.close(false);
    actions.reset();
  });
  on(settingsButton, "click", () => {
    if (!snapshot) return;
    const value = snapshot.settings.durationSeconds;
    if (
      ![...durationSelect.options].some(
        (option) => option.value === String(value),
      )
    ) {
      const option = e("option", "", () =>
        value ? labels.minutes(value / 60) : labels.noTimer,
      );
      option.value = String(value);
      durationSelect.append(option);
    }
    durationSelect.value = String(value);
    shuffle.checked = snapshot.settings.shuffle;
    for (const [id, checkbox] of packs)
      checkbox.checked = snapshot.settings.enabledPacks.includes(id);
    settingsError.textContent = "";
    settingsDialog.open();
  });
  on(apply, "click", () => {
    try {
      if (
        actions.settings({
          durationSeconds: Number(durationSelect.value),
          shuffle: shuffle.checked,
          enabledPacks: [...packs]
            .filter(([, checkbox]) => checkbox.checked)
            .map(([id]) => id),
        })
      ) {
        settingsDialog.close(false);
        focusInput();
      }
    } catch {
      settingsError.textContent = labels.invalidSettings;
    }
  });
  on(document, "keydown", (event) => {
    const key = event as KeyboardEvent;
    const target = document.activeElement;
    if (
      !target ||
      !root.contains(target) ||
      key.isComposing ||
      key.ctrlKey ||
      key.altKey ||
      key.metaKey ||
      dialogs.some((dialog) => dialog.element.open)
    )
      return;
    if (
      target.matches(
        'input, textarea, select, [contenteditable]:not([contenteditable="false"])',
      )
    )
      return;
    if (key.key.toLowerCase() === "h") {
      key.preventDefault();
      actions.hint();
    }
  });
  const grain = e("div", "quiz-grain");
  grain.setAttribute("aria-hidden", "true");
  root.replaceChildren(
    grain,
    header,
    main,
    footer,
    ...dialogs.map((dialog) => dialog.element),
    toast,
  );
  root.classList.add("quiz-ui");
  root.dataset.palette = config.branding.palette ?? "mint";
  root.lang = locale;
  mounted.add(root);
  const ui: QuizUI = {
    render(state, best = 0) {
      if (destroyed) return;
      const resetRound =
        state.status === "idle" &&
        (!snapshot || snapshot.status !== "idle" || state.found.length === 0);
      snapshot = state;
      lastBest = best;
      score.textContent = String(state.found.length);
      total.textContent = String(state.pool.length);
      timer.textContent = formatTime(state.remainingSeconds);
      timer.classList.toggle(
        "quiz-time-warning",
        state.remainingSeconds !== null && state.remainingSeconds <= 30,
      );
      input.disabled = submit.disabled = state.status === "finished";
      giveUp.disabled = state.status === "finished";
      progress.setAttribute("aria-valuenow", String(state.found.length));
      progress.setAttribute("aria-valuemax", String(state.pool.length));
      progressFill.style.width = `${state.pool.length ? (state.found.length / state.pool.length) * 100 : 0}%`;
      bestScore.textContent = best ? String(best) : "—";
      modeTitle.textContent =
        state.mode === "sprint" ? labels.sprint : config.board.title;
      modeDescription.textContent = ` · ${state.mode === "sprint" ? (config.board.sprintDescription ?? labels.randomEntries(Math.min((config.sprint && config.sprint.size) || 20, state.pool.length))) : (config.board.description ?? "")}`;
      sprint.setAttribute("aria-pressed", String(state.mode === "sprint"));
      hint.disabled =
        state.status === "finished" || state.hintCooldownSeconds > 0;
      hintText.textContent = state.hintCooldownSeconds
        ? labels.cooldown(state.hintCooldownSeconds)
        : labels.hint;
      resultsButton.hidden = !state.result;
      renderBoard(state);
      if (state.result) {
        const result = config.presentResult(state.result);
        results.heading.textContent = result.title;
        resultCopy.textContent = result.description;
        resultScore.textContent = String(state.result.score);
        grade.textContent = result.grade;
      }
      if (resetRound) {
        feedback.textContent = "";
        feedback.classList.remove("is-visible");
        fallback.hidden = true;
        resultNotice.textContent = "";
      }
    },
    getLocale: () => locale,
    setLocale(value) {
      requireLocale(value);
      if (destroyed || locale === value) return;
      locale = value;
      config = localizeConfig(baseConfig, locale);
      labels = config.labels;
      root.lang = locale;
      root.dataset.palette = config.branding.palette ?? "mint";
      language.value = locale;
      for (const answer of config.answers) byId.set(answer.id, answer);
      for (const category of config.categories)
        categoryById.set(category.id, category);
      bindings.forEach((update) => update());
      boardStateKey = "";
      if (snapshot) ui.render(snapshot, lastBest);
      if (referenceId) renderReference(byId.get(referenceId)!);
      // Transient notices describe the previous interaction in the old language.
      feedback.textContent = toast.textContent = resultNotice.textContent = "";
      feedback.classList.remove("is-visible");
      toast.classList.remove("is-visible");
      if (settingsError.textContent)
        settingsError.textContent = labels.invalidSettings;
      fallback.hidden = true;
    },
    setTheme(theme, dark) {
      root.dataset.theme = dark ? "dark" : "light";
      for (const [value, control] of themeButtons)
        control.setAttribute("aria-pressed", String(value === theme));
    },
    setSound(enabled) {
      sound.firstElementChild!.textContent = enabled ? "♪" : "×";
      sound.setAttribute("aria-pressed", String(enabled));
    },
    feedback(text) {
      window.clearTimeout(feedbackTimer);
      feedback.textContent = text;
      feedback.classList.add("is-visible");
      feedbackTimer = window.setTimeout(
        () => feedback.classList.remove("is-visible"),
        1800,
      );
    },
    toast(text) {
      window.clearTimeout(toastTimer);
      if (results.element.open) resultNotice.textContent = text;
      else {
        toast.textContent = text;
        toast.classList.add("is-visible");
      }
      toastTimer = window.setTimeout(() => {
        toast.classList.remove("is-visible");
        resultNotice.textContent = "";
      }, 2400);
    },
    focusInput,
    scrollToAnswer(id) {
      if (scrollFrame !== undefined) window.cancelAnimationFrame(scrollFrame);
      scrollFrame = window.requestAnimationFrame(() => {
        const reduce = window.matchMedia?.(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        cards.get(id)?.scrollIntoView({
          block: "center",
          behavior: reduce ? "auto" : "smooth",
        });
      });
    },
    showResults() {
      closeDialogs();
      results.open();
    },
    showShareFallback(text) {
      fallback.hidden = false;
      fallbackText.value = text;
      fallbackText.focus();
      fallbackText.select();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      abort.abort();
      window.clearTimeout(feedbackTimer);
      window.clearTimeout(toastTimer);
      if (scrollFrame !== undefined) window.cancelAnimationFrame(scrollFrame);
      dialogs.forEach((dialog) => dialog.destroy());
      root.replaceChildren(...savedNodes);
      for (const [key, value] of savedAttributes) {
        if (value === null) root.removeAttribute(key);
        else root.setAttribute(key, value);
      }
      mounted.delete(root);
    },
  };
  return ui;
}
