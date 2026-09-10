import { test } from "node:test";
import assert from "node:assert/strict";
import { createQuizEngine } from "../dist/core.js";
import { definition } from "./fixture.mjs";

test("empty input does not start the round; aliases and duplicates have distinct outcomes", () => {
  const game = createQuizEngine(definition);
  assert.equal(game.submit("  ").status, "empty");
  assert.equal(game.getSnapshot().status, "idle");
  assert.deepEqual(game.submit(" B "), {
    status: "accepted",
    answerId: "beta",
  });
  assert.equal(game.submit("beta").status, "duplicate");
  assert.equal(game.submit("gamma").status, "unknown");
  assert.deepEqual(game.getSnapshot().found, ["beta"]);
});
test("a non-empty wrong guess starts the clock, matching the original games", () => {
  const game = createQuizEngine(definition);
  game.submit("unknown");
  assert.equal(game.getSnapshot().status, "running");
});
test("elapsed wall time is authoritative even when ticks are delayed in a background tab", () => {
  let clock = 1000;
  const game = createQuizEngine(
    { ...definition, defaults: { durationSeconds: 2 } },
    { now: () => clock },
  );
  game.submit("unknown");
  clock += 2500;
  assert.equal(game.submit("alpha").status, "finished");
  assert.equal(game.getSnapshot().result.reason, "timeout");
  assert.equal(game.getSnapshot().result.elapsedSeconds, 2);
  assert.deepEqual(game.getSnapshot().found, []);
});
test("finishing is idempotent and final elapsed time is frozen", () => {
  let clock = 0,
    finishes = 0;
  const game = createQuizEngine(definition, { now: () => clock });
  game.subscribe((_, event) => {
    if (event.type === "finish") finishes++;
  });
  game.submit("alpha");
  clock = 3000;
  game.submit("beta");
  clock = 20000;
  game.finish();
  game.tick();
  assert.equal(finishes, 1);
  assert.equal(game.getSnapshot().result.reason, "won");
  assert.equal(game.getSnapshot().result.elapsedSeconds, 3);
});
test("untimed rounds still measure elapsed time and finish only on a player action", () => {
  let clock = 0;
  const game = createQuizEngine(
    { ...definition, defaults: { durationSeconds: 0 } },
    { now: () => clock },
  );
  game.submit("alpha");
  clock = 3600000;
  game.tick();
  assert.equal(game.getSnapshot().remainingSeconds, null);
  assert.equal(game.getSnapshot().status, "running");
  game.finish();
  assert.equal(game.getSnapshot().result.elapsedSeconds, 3600);
});
test("hints start the round, cannot repeat, and respect a ten-second cooldown", () => {
  let clock = 0;
  const game = createQuizEngine(definition, {
    now: () => clock,
    random: () => 0,
  });
  assert.equal(game.hint(), "alpha");
  assert.equal(game.hint(), null);
  assert.equal(game.getSnapshot().status, "running");
  clock = 9999;
  assert.equal(game.hint(), null);
  clock = 10000;
  assert.equal(game.hint(), "beta");
  game.submit("alpha");
  game.submit("beta");
  assert.equal(game.getSnapshot().result.hintedCount, 2);
});
test("reset clears cooldown, results, and time and restores a full standard pool after sprint", () => {
  const game = createQuizEngine(
    { ...definition, sprint: { size: 1, durationSeconds: 30 } },
    { random: () => 0 },
  );
  game.reset({ mode: "sprint" });
  game.hint();
  game.finish();
  game.reset();
  const state = game.getSnapshot();
  assert.equal(state.mode, "standard");
  assert.equal(state.status, "idle");
  assert.equal(state.remainingSeconds, 300);
  assert.equal(state.hintCooldownSeconds, 0);
  assert.equal(state.result, null);
  assert.deepEqual(state.pool, ["alpha", "beta"]);
});
test("sprint samples without duplicates and clamps its size to the available answers", () => {
  const game = createQuizEngine(definition, { random: () => 0 });
  game.reset({ mode: "sprint" });
  const state = game.getSnapshot();
  assert.equal(state.pool.length, 2);
  assert.equal(new Set(state.pool).size, 2);
  assert.equal(state.remainingSeconds, 120);
});
test("shuffle changes the actual pool order within each category", () => {
  const game = createQuizEngine(definition, { random: () => 0 });
  game.reset({ settings: { shuffle: true, enabledPacks: ["extra"] } });
  assert.deepEqual(game.getSnapshot().pool, ["beta", "gamma", "alpha"]);
});
test("invalid settings are rejected before modifying the active round", () => {
  const game = createQuizEngine(definition);
  game.submit("alpha");
  const before = game.getSnapshot();
  assert.throws(
    () => game.reset({ settings: { enabledPacks: ["missing"] } }),
    /Unknown enabled pack/,
  );
  assert.equal(game.getSnapshot().status, before.status);
  assert.deepEqual(game.getSnapshot().found, before.found);
  assert.throws(
    () => game.reset({ settings: { durationSeconds: -1 } }),
    /non-negative/,
  );
});
test("empty optional-only pools and ambiguous aliases are diagnosed", () => {
  assert.throws(
    () =>
      createQuizEngine({
        ...definition,
        answers: [{ id: "gamma", category: "letters", pack: "extra" }],
      }),
    /at least one answer pack/,
  );
  assert.throws(
    () =>
      createQuizEngine({
        ...definition,
        answers: [
          ...definition.answers,
          { id: "other", category: "letters", aliases: ["B"] },
        ],
      }),
    /Ambiguous/,
  );
});
test("snapshots cannot mutate the engine and unsubscribed listeners are released", () => {
  const game = createQuizEngine(definition);
  const snapshot = game.getSnapshot();
  snapshot.pool.length = 0;
  snapshot.settings.enabledPacks.push("extra");
  assert.deepEqual(game.getSnapshot().pool, ["alpha", "beta"]);
  let count = 0;
  const off = game.subscribe(() => count++);
  game.submit("wrong");
  off();
  game.tick();
  assert.equal(count, 1);
});
test("caller normalization supports domain-specific syntax without adding that domain to the engine", () => {
  const game = createQuizEngine({
    ...definition,
    normalizeAnswer: (value) =>
      value.toLowerCase().replace(/[<>/]/g, "").trim(),
  });
  assert.equal(game.submit("</ALPHA>").status, "accepted");
});
