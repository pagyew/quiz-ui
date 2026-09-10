import type {
  Answer,
  EngineOptions,
  GuessResult,
  Mode,
  QuizDefinition,
  QuizEngine,
  QuizEvent,
  QuizResult,
  QuizSettings,
  QuizSnapshot,
} from "./types.js";
export type {
  Answer,
  AnswerPack,
  Category,
  EngineOptions,
  GuessResult,
  QuizDefinition,
  QuizEngine,
  QuizResult,
  QuizSettings,
  QuizSnapshot,
} from "./types.js";

export const normalizeAnswer = (value: string): string =>
  value.trim().toLocaleLowerCase("en-US");

function seconds(value: number, name: string): number {
  if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value))
    throw new Error(`${name} must be a non-negative integer`);
  return value;
}

/** A synchronous engine: callers supply a clock, schedule tick(), and render snapshots. */
export function createQuizEngine(
  definition: QuizDefinition,
  options: EngineOptions = {},
): QuizEngine {
  const now = options.now ?? Date.now;
  const random = options.random ?? Math.random;
  const normalize = definition.normalizeAnswer ?? normalizeAnswer;
  if (!definition.id.trim()) throw new Error("A quiz id is required");
  if (!definition.answers.length)
    throw new Error("A quiz needs at least one answer");
  const categories = new Set(
    definition.categories.map((category) => category.id),
  );
  if (categories.size !== definition.categories.length)
    throw new Error("Category ids must be unique");
  const packIds = new Set((definition.packs ?? []).map((pack) => pack.id));
  if (packIds.size !== (definition.packs ?? []).length)
    throw new Error("Pack ids must be unique");
  const answers = definition.answers.map((answer) => ({
    ...answer,
    aliases: [...(answer.aliases ?? [])],
  }));
  const byId = new Map<string, Answer>();
  const lookup = new Map<string, string>();
  for (const answer of answers) {
    if (!answer.id || byId.has(answer.id))
      throw new Error(`Duplicate or empty answer id: ${answer.id}`);
    if (!categories.has(answer.category))
      throw new Error(`Unknown category: ${answer.category}`);
    if (answer.pack && !packIds.has(answer.pack))
      throw new Error(`Unknown pack: ${answer.pack}`);
    byId.set(answer.id, answer);
    for (const value of [answer.value ?? answer.id, ...answer.aliases]) {
      const key = normalize(value);
      if (!key) throw new Error(`Empty normalized answer: ${answer.id}`);
      if (lookup.has(key) && lookup.get(key) !== answer.id)
        throw new Error(`Ambiguous answer or alias: ${value}`);
      lookup.set(key, answer.id);
    }
  }
  const sprint =
    definition.sprint === false
      ? null
      : (definition.sprint ?? { size: 20, durationSeconds: 120 });
  if (sprint && (!Number.isInteger(sprint.size) || sprint.size < 1))
    throw new Error("Sprint size must be a positive integer");
  if (sprint) seconds(sprint.durationSeconds, "Sprint duration");
  const cooldown = seconds(
    definition.hintCooldownSeconds ?? 10,
    "Hint cooldown",
  );
  const defaults: QuizSettings = {
    durationSeconds: 300,
    enabledPacks: [],
    shuffle: false,
    ...definition.defaults,
  };
  let settings: QuizSettings;
  let mode: Mode = "standard";
  let pool: string[] = [];
  let poolIds = new Set<string>();
  let found = new Set<string>();
  let hinted = new Set<string>();
  let activeHint: string | null = null;
  let status: QuizSnapshot["status"] = "idle";
  let startedAt: number | null = null;
  let finishedAt: number | null = null;
  let hintReadyAt = 0;
  let duration = 300;
  let result: QuizResult | null = null;
  const listeners = new Set<
    (snapshot: QuizSnapshot, event: QuizEvent) => void
  >();

  function shuffled<T>(items: readonly T[]): T[] {
    const output = [...items];
    for (let i = output.length - 1; i > 0; i--) {
      const value = random();
      if (value < 0 || value >= 1 || !Number.isFinite(value))
        throw new Error("random() must return a value in [0, 1)");
      const j = Math.floor(value * (i + 1));
      [output[i], output[j]] = [output[j]!, output[i]!];
    }
    return output;
  }
  function elapsed(): number {
    if (startedAt === null) return 0;
    const time = Math.max(0, (finishedAt ?? now()) - startedAt);
    return Math.floor(
      (duration > 0 ? Math.min(time, duration * 1000) : time) / 1000,
    );
  }
  function remaining(): number | null {
    if (duration === 0) return null;
    if (startedAt === null) return duration;
    return Math.max(
      0,
      Math.ceil((startedAt + duration * 1000 - (finishedAt ?? now())) / 1000),
    );
  }
  function getSnapshot(): QuizSnapshot {
    return {
      status,
      mode,
      settings: { ...settings, enabledPacks: [...settings.enabledPacks] },
      pool: [...pool],
      found: [...found],
      hinted: [...hinted],
      activeHint,
      remainingSeconds: remaining(),
      elapsedSeconds: elapsed(),
      hintCooldownSeconds:
        status === "finished"
          ? 0
          : Math.max(0, Math.ceil((hintReadyAt - now()) / 1000)),
      result: result ? { ...result } : null,
    };
  }
  function emit(event: QuizEvent): void {
    for (const listener of listeners) listener(getSnapshot(), event);
  }
  function finish(reason: QuizResult["reason"]): void {
    if (status === "finished") return;
    finishedAt = now();
    status = "finished";
    activeHint = null;
    result = {
      reason,
      score: found.size,
      total: pool.length,
      hintedCount: [...found].filter((id) => hinted.has(id)).length,
      elapsedSeconds: elapsed(),
      mode,
    };
    emit({ type: "finish", result: { ...result } });
  }
  function expire(): boolean {
    if (status === "running" && remaining() === 0) finish("timeout");
    return status === "finished";
  }
  function start(): void {
    if (status === "idle") {
      startedAt = now();
      status = "running";
    }
  }
  function reset(
    next: { mode?: Mode; settings?: Partial<QuizSettings> } = {},
  ): void {
    const nextMode = next.mode ?? "standard";
    if (nextMode !== "standard" && nextMode !== "sprint")
      throw new Error("Unknown quiz mode");
    if (nextMode === "sprint" && !sprint) throw new Error("Sprint is disabled");
    const nextSettings = { ...(settings ?? defaults), ...next.settings };
    seconds(nextSettings.durationSeconds, "Quiz duration");
    if (typeof nextSettings.shuffle !== "boolean")
      throw new Error("shuffle must be a boolean");
    if (
      !Array.isArray(nextSettings.enabledPacks) ||
      nextSettings.enabledPacks.some((id) => !packIds.has(id))
    )
      throw new Error("Unknown enabled pack");
    nextSettings.enabledPacks = [...new Set(nextSettings.enabledPacks)];
    const selected = answers.filter(
      (answer) =>
        !answer.pack || nextSettings.enabledPacks.includes(answer.pack),
    );
    if (!selected.length) throw new Error("Enable at least one answer pack");
    let nextPool: string[];
    if (nextMode === "sprint")
      nextPool = shuffled(selected)
        .slice(0, sprint!.size)
        .map((answer) => answer.id);
    else
      nextPool = definition.categories.flatMap((category) => {
        const group = selected
          .filter((answer) => answer.category === category.id)
          .map((answer) => answer.id);
        return nextSettings.shuffle ? shuffled(group) : group;
      });
    // Validate and construct before changing the current round.
    settings = nextSettings;
    mode = nextMode;
    pool = nextPool;
    poolIds = new Set(pool);
    found = new Set();
    hinted = new Set();
    activeHint = null;
    startedAt = null;
    finishedAt = null;
    hintReadyAt = 0;
    result = null;
    duration =
      mode === "sprint" ? sprint!.durationSeconds : settings.durationSeconds;
    status = "idle";
    emit({ type: "reset" });
  }
  function submit(raw: string): GuessResult {
    if (expire()) return { status: "finished" };
    const value = normalize(raw);
    if (!value) return { status: "empty" };
    start();
    const answerId = lookup.get(value);
    const guess: GuessResult =
      !answerId || !poolIds.has(answerId)
        ? { status: "unknown" }
        : { status: found.has(answerId) ? "duplicate" : "accepted", answerId };
    if (guess.status === "accepted") {
      found.add(answerId!);
      activeHint = null;
    }
    emit({ type: "guess", guess, value });
    if (found.size === pool.length) finish("won");
    return guess;
  }
  reset();
  return {
    getSnapshot,
    reset,
    submit,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    tick() {
      if (!expire()) emit({ type: "tick" });
    },
    finish() {
      if (!expire()) finish("give-up");
    },
    hint() {
      if (expire() || now() < hintReadyAt) return null;
      start();
      const candidates = pool.filter((id) => !found.has(id) && !hinted.has(id));
      if (!candidates.length) {
        emit({ type: "hint", answerId: null });
        return null;
      }
      const value = random();
      if (value < 0 || value >= 1 || !Number.isFinite(value))
        throw new Error("random() must return a value in [0, 1)");
      const answerId = candidates[Math.floor(value * candidates.length)]!;
      hinted.add(answerId);
      activeHint = answerId;
      hintReadyAt = now() + cooldown * 1000;
      emit({ type: "hint", answerId });
      return answerId;
    },
  };
}
