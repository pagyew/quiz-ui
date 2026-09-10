export const definition = {
  id: "letters",
  categories: [{ id: "letters", label: "Letters" }],
  answers: [
    { id: "alpha", category: "letters" },
    { id: "beta", aliases: ["b"], category: "letters" },
    { id: "gamma", category: "letters", pack: "extra" },
  ],
  packs: [{ id: "extra", label: "More letters" }],
  defaults: { durationSeconds: 300 },
};
export const config = {
  ...definition,
  branding: {
    name: "Letter Type",
    mark: "Aa",
    eyebrow: "A MEMORY GAME",
    title: ["How many letters", "can you"],
    emphasis: "name?",
    description: ["Type every letter you remember."],
    footer: "Keep learning.",
  },
  board: { title: "Letters by category", description: "A memory map" },
  howToPlay: {
    title: "Name the letters.",
    steps: [
      { title: "Type an answer.", description: "Press Enter to submit." },
    ],
  },
  storage: { adapter: null },
};
export function memoryStorage(values = {}) {
  const data = new Map(Object.entries(values));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)),
  };
}
