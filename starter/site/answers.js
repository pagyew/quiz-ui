export const categories = [
  {
    id: "basket",
    label: "In the fruit bowl",
    description: "Everyday favorites.",
  },
  {
    id: "sunshine",
    label: "A little sunshine",
    description: "Sweet and bright.",
  },
];

export const answers = [
  {
    id: "apple",
    category: "basket",
    summary: "A crisp start. Try a few more fruits from your shopping list.",
  },
  { id: "pear", category: "basket" },
  { id: "peach", category: "basket" },
  { id: "plum", category: "basket" },
  { id: "grape", aliases: ["grapes"], category: "basket" },
  { id: "cherry", aliases: ["cherries"], category: "basket" },
  { id: "orange", category: "sunshine" },
  { id: "lemon", category: "sunshine" },
  { id: "lime", category: "sunshine" },
  { id: "banana", category: "sunshine" },
  { id: "mango", category: "sunshine" },
  { id: "pineapple", category: "sunshine" },
];
