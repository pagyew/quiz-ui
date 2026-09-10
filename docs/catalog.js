import {
  createAnswerCard,
  createCategorySection,
  createDialog,
} from "./vendor/quiz-ui/ui.js";

const root = document.querySelector("#componentsPreview");
const states = document.querySelector("#cardStates");
const names = {
  hidden: "Undiscovered",
  hinted: "A little help",
  found: "Found it",
  "found-with-hint": "Found with a hint",
  missed: "Still to discover",
};
for (const [state, label] of Object.entries(names)) {
  const item = document.createElement("div");
  const caption = document.createElement("p");
  caption.textContent = label;
  item.append(
    createAnswerCard(
      document,
      { id: "display", category: "layout" },
      { state, hint: "d······" },
    ),
    caption,
  );
  states.append(item);
}
const section = createCategorySection(document, {
  id: "layout",
  label: "A little collection",
});
section.count.textContent = "2/6";
["apple", "pear", "peach", "plum", "grape", "cherry"].forEach((id, index) =>
  section.grid.append(
    createAnswerCard(
      document,
      { id, category: "layout" },
      { state: index < 2 ? "found" : "hidden" },
    ),
  ),
);
document.querySelector("#categoryExample").append(section.element);
document.querySelector("#palette").onchange = (event) => {
  root.dataset.palette = event.target.value;
};
document.querySelector("#surface").onchange = (event) => {
  root.dataset.theme = event.target.value;
};
const reference = createDialog(document, {
  title: "display",
  kicker: "LAYOUT PROPERTY",
  className: "quiz-reference-dialog",
});
const referenceCopy = document.createElement("p");
referenceCopy.textContent =
  "Controls an element’s layout box and how its children are arranged.";
reference.content.append(referenceCopy);
root.append(reference.element);
document.querySelector("#referenceDemo").onclick = () => reference.open();
const result = createDialog(document, {
  title: "Keep discovering.",
  kicker: "SESSION COMPLETE",
  className: "quiz-result-dialog",
});
const copy = document.createElement("p");
copy.textContent =
  "You found 8 of 12 answers. Every round is a chance to remember a little more.";
const grade = document.createElement("div");
grade.className = "quiz-result-grade";
grade.textContent = "CURIOUS EXPLORER";
const close = document.createElement("button");
close.className = "quiz-primary";
close.textContent = "Back to the components";
close.onclick = () => result.close();
result.content.append(copy, grade, close);
root.append(result.element);
document.querySelector("#resultDemo").onclick = () => result.open();
