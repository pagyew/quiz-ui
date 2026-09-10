import { test } from "node:test";
import assert from "node:assert/strict";
import { createQuizStorage } from "../dist/storage.js";
import { definition, memoryStorage } from "./fixture.mjs";

test("old game settings, themes and scores remain readable without deleting old data", () => {
  const adapter = memoryStorage({
    "tagtype-duration": "0",
    "tagtype-shuffle": "true",
    "tagtype-legacy": "true",
    "tagtype-theme": "dark",
    "tagtype-best-legacy": "37",
  });
  const storage = createQuizStorage(definition, adapter, {
    durationKey: "tagtype-duration",
    shuffleKey: "tagtype-shuffle",
    packKeys: { extra: "tagtype-legacy" },
    themeKey: "tagtype-theme",
    bestKey: () => "tagtype-best-legacy",
  });
  assert.deepEqual(storage.settings(), {
    durationSeconds: 0,
    shuffle: true,
    enabledPacks: ["extra"],
  });
  assert.equal(storage.theme(), "dark");
  assert.equal(storage.best(storage.settings(), "standard"), 37);
  storage.saveBest(storage.settings(), "standard", 12);
  assert.equal(storage.best(storage.settings(), "standard"), 37);
  assert.equal(adapter.getItem("tagtype-best-legacy"), "37");
});
test("new game identities, durations, packs and sprint scores are isolated", () => {
  const adapter = memoryStorage();
  const storage = createQuizStorage(definition, adapter);
  const settings = storage.settings();
  storage.saveBest(settings, "standard", 8);
  assert.equal(storage.best(settings, "standard"), 8);
  assert.equal(
    storage.best({ ...settings, durationSeconds: 0 }, "standard"),
    0,
  );
  assert.equal(
    storage.best({ ...settings, enabledPacks: ["extra"] }, "standard"),
    0,
  );
  assert.equal(storage.best(settings, "sprint"), 0);
  assert.equal(
    createQuizStorage({ ...definition, id: "another" }, adapter).best(
      settings,
      "standard",
    ),
    0,
  );
});
test("denied storage and malformed persisted data never prevent a playable round", () => {
  const broken = {
    getItem() {
      throw new Error("denied");
    },
    setItem() {
      throw new Error("quota");
    },
  };
  const safe = createQuizStorage(definition, broken);
  assert.equal(safe.settings().durationSeconds, 300);
  assert.doesNotThrow(() => safe.saveTheme("light"));
  const adapter = memoryStorage({
    "quiz-ui:letters:v1:settings": "{oops",
    "quiz-ui:letters:v1:theme": "nope",
  });
  assert.equal(
    createQuizStorage(definition, adapter).settings().durationSeconds,
    300,
  );
  assert.equal(createQuizStorage(definition, adapter).theme(), "system");
});
test("persisted pack ids removed by an update are filtered and settings round-trip", () => {
  const adapter = memoryStorage({
    "quiz-ui:letters:v1:settings": JSON.stringify({
      durationSeconds: -1,
      shuffle: true,
      enabledPacks: ["extra", "old"],
    }),
  });
  const storage = createQuizStorage(definition, adapter);
  assert.deepEqual(storage.settings(), {
    durationSeconds: 300,
    shuffle: true,
    enabledPacks: ["extra"],
  });
  storage.saveSettings({
    durationSeconds: 120,
    shuffle: false,
    enabledPacks: [],
  });
  assert.equal(storage.settings().durationSeconds, 120);
});
