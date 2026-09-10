import type { Answer, CardState, Category, IconShape } from "./types.js";

export function element<K extends keyof HTMLElementTagNameMap>(
  document: Document,
  tag: K,
  className = "",
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
export function button(
  document: Document,
  className: string,
  text: string,
  icon?: string,
): HTMLButtonElement {
  const node = element(document, "button", className);
  node.type = "button";
  if (icon) {
    const mark = element(document, "span", "quiz-button-icon", icon);
    mark.setAttribute("aria-hidden", "true");
    node.append(mark);
  }
  node.append(element(document, "span", "", text));
  return node;
}
export function createIcon(
  document: Document,
  shapes: readonly IconShape[] = [
    { tag: "path", attrs: { d: "M4 4h16v16H4zM4 10h16M10 4v16" } },
  ],
): SVGSVGElement {
  const namespace = "http://www.w3.org/2000/svg";
  const icon = document.createElementNS(namespace, "svg");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("aria-hidden", "true");
  const tags = new Set(["path", "circle", "rect", "line", "polyline"]);
  const attributes = new Set([
    "d",
    "cx",
    "cy",
    "r",
    "x",
    "y",
    "x1",
    "x2",
    "y1",
    "y2",
    "width",
    "height",
    "rx",
    "ry",
    "points",
  ]);
  for (const shape of shapes) {
    if (!tags.has(shape.tag)) continue;
    const child = document.createElementNS(namespace, shape.tag);
    for (const [key, value] of Object.entries(shape.attrs))
      if (attributes.has(key)) child.setAttribute(key, String(value));
    icon.append(child);
  }
  return icon;
}
export interface AnswerCardOptions {
  state?: CardState;
  label?: string;
  hint?: string;
  hiddenLabel?: string;
  onOpen?: (answer: Answer) => void;
}
export function createAnswerCard(
  document: Document,
  answer: Answer,
  options: AnswerCardOptions = {},
): HTMLButtonElement {
  const card = button(document, "quiz-card", "");
  card.dataset.answer = answer.id;
  card.addEventListener("click", () => options.onOpen?.(answer));
  updateAnswerCard(card, answer, options);
  return card;
}
export function updateAnswerCard(
  card: HTMLButtonElement,
  answer: Answer,
  options: AnswerCardOptions,
): void {
  const state = options.state ?? "hidden";
  const label = options.label ?? answer.value ?? answer.id;
  card.dataset.state = state;
  card.disabled = state !== "found" && state !== "found-with-hint";
  const display =
    state === "hidden"
      ? "••••••"
      : state === "hinted"
        ? (options.hint ?? `${[...label][0]}·····`)
        : label;
  card.querySelector("span")!.textContent = display;
  card.setAttribute(
    "aria-label",
    state === "hidden"
      ? (options.hiddenLabel ?? "Undiscovered answer")
      : state === "hinted"
        ? `Hint: ${display}`
        : `${label}${state === "missed" ? " — missed" : state === "found-with-hint" ? " — found with a hint" : " — found"}`,
  );
}
export function createCategorySection(document: Document, category: Category) {
  const section = element(document, "section", "quiz-category");
  section.dataset.category = category.id;
  const heading = element(document, "h3");
  const icon = element(document, "span", "quiz-category-icon");
  icon.append(createIcon(document, category.icon));
  const count = element(document, "small", "", "0/0");
  heading.append(icon, element(document, "span", "", category.label), count);
  const grid = element(document, "div", "quiz-category-grid");
  section.append(heading, grid);
  return { element: section, grid, count };
}

let nextDialogId = 0;
export function createDialog(
  document: Document,
  options: {
    title: string;
    kicker?: string;
    className?: string;
    closeLabel?: string;
    onClose?: () => void;
  },
) {
  const dialog = element(
    document,
    "dialog",
    `quiz-dialog ${options.className ?? ""}`,
  );
  const closeButton = button(document, "quiz-dialog-close", "×");
  closeButton.setAttribute("aria-label", options.closeLabel ?? "Close");
  const kicker = element(document, "div", "quiz-kicker", options.kicker ?? "");
  const heading = element(document, "h2", "", options.title);
  heading.id = `quiz-dialog-title-${++nextDialogId}`;
  dialog.setAttribute("aria-labelledby", heading.id);
  const content = element(document, "div", "quiz-dialog-content");
  dialog.append(closeButton, kicker, heading, content);
  let returnFocus: HTMLElement | null = null;
  let restoreFocus = true;
  let disposed = false;
  closeButton.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    )
      dialog.close();
  });
  dialog.addEventListener("close", () => {
    if (disposed || document.querySelector("dialog[open]")) return;
    if (
      restoreFocus &&
      returnFocus?.isConnected &&
      !returnFocus.hasAttribute("disabled")
    )
      returnFocus.focus({ preventScroll: true });
    options.onClose?.();
  });
  return {
    element: dialog,
    heading,
    kicker,
    content,
    open() {
      if (disposed || dialog.open) return;
      returnFocus = document.activeElement as HTMLElement | null;
      restoreFocus = true;
      dialog.showModal();
    },
    close(restore = true) {
      if (dialog.open) {
        restoreFocus = restore;
        dialog.close();
      }
    },
    destroy() {
      disposed = true;
      if (dialog.open) dialog.close();
      dialog.remove();
    },
  };
}

export function safeUrl(
  value: string | undefined,
  base: string,
  allowRelative = false,
): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, base);
    if (
      url.protocol === "https:" ||
      url.protocol === "http:" ||
      (allowRelative && value.startsWith("#"))
    )
      return url.href;
  } catch {
    /* Invalid destinations are not rendered as links. */
  }
  return null;
}
