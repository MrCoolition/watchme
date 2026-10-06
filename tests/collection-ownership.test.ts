import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName, SQL } from "drizzle-orm";
import { PgDialect, type PgTable } from "drizzle-orm/pg-core";
import { PRESETS } from "../src/lib/presets";
import { DEFAULT_PREFERENCES } from "../src/lib/types";

const state = vi.hoisted(() => ({ userId: "", authenticated: true, db: {} as unknown }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../src/lib/db", () => ({ getDb: () => state.db }));
vi.mock("../src/lib/auth", () => {
  class AuthError extends Error { constructor() { super("Sign in to continue."); } }
  class SetupRequiredError extends Error {}
  return { AuthError, SetupRequiredError, requireSession: async () => {
    if (!state.authenticated) throw new AuthError();
    return { userId: state.userId, account: { id: state.userId, username: state.userId === USER_A ? "alice" : "bob", isOwner: false, hasRecoveryCode: true } };
  } };
});
import { deleteWatch, loadStudio, savePreferences, saveWatch, setFavorite } from "../src/app/actions";

const USER_A = "a1111111-1111-4111-8111-111111111111";
const USER_B = "b2222222-2222-4222-8222-222222222222";
const WATCH_A = "a3333333-3333-4333-8333-333333333333";
const WATCH_B = "b4444444-4444-4444-8444-444444444444";
type Row = Record<string, unknown>;
const rows: Record<string, Row[]> = {};
const dialect = new PgDialect();
const queries: { table: string; operation: string; condition?: string; params?: unknown[] }[] = [];

/** Execute the real Drizzle equality predicates against two accounts' fixture rows. */
class Query implements PromiseLike<Row[]> {
  private table?: PgTable;
  private condition?: SQL;
  private fields: Row = {};
  private upsert?: Row;
  constructor(private operation: "select" | "insert" | "update" | "delete", table?: PgTable) { this.table = table; }
  from(table: PgTable) { this.table = table; return this; }
  where(condition: SQL) { this.condition = condition; return this; }
  orderBy() { return this; }
  limit() { return this; }
  values(fields: Row) { this.fields = fields; return this; }
  set(fields: Row) { this.fields = fields; return this; }
  returning() { return this; }
  onConflictDoUpdate(input: { set: Row }) { this.upsert = input.set; return this; }
  private matches(row: Row) {
    if (!this.condition) return true;
    const { sql, params } = dialect.sqlToQuery(this.condition);
    for (const match of sql.matchAll(/"[a-z_]+"\."([a-z_]+)" = \$(\d+)/g)) {
      const property = match[1].replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
      if (row[property] !== params[Number(match[2]) - 1]) return false;
    }
    const active = sql.match(/->>'activeWatchId' = \$(\d+)/);
    if (active && (row.value as Row)?.activeWatchId !== params[Number(active[1]) - 1]) return false;
    return true;
  }
  private execute(): Row[] {
    const table = getTableName(this.table!);
    const condition = this.condition ? dialect.sqlToQuery(this.condition) : undefined;
    queries.push({ table, operation: this.operation, condition: condition?.sql, params: condition?.params });
    const available = rows[table] ??= [];
    if (this.operation === "insert") {
      const previous = this.upsert && available.find(row => row.userId === this.fields.userId);
      if (previous) { Object.assign(previous, this.upsert); return [previous]; }
      const row = { favorite: false, createdAt: new Date(), updatedAt: new Date(), ...this.fields };
      available.push(row); return [row];
    }
    const matched = available.filter(row => this.matches(row));
    if (this.operation === "delete") rows[table] = available.filter(row => !this.matches(row));
    if (this.operation === "update") for (const row of matched) {
      for (const [key, value] of Object.entries(this.fields)) row[key] = value instanceof SQL && key === "value" ? { ...(row.value as Row), activeWatchId: "monolith" } : value;
    }
    return matched;
  }
  then<T = Row[], U = never>(resolve?: ((value: Row[]) => T | PromiseLike<T>) | null, reject?: ((reason: unknown) => U | PromiseLike<U>) | null): PromiseLike<T | U> { return Promise.resolve().then(() => this.execute()).then(resolve, reject); }
}

beforeEach(() => {
  state.userId = USER_A; state.authenticated = true; queries.length = 0;
  rows.user_watches = [
    { id: WATCH_A, userId: USER_A, name: "Alice private", design: PRESETS[0].design, favorite: false, createdAt: new Date(), updatedAt: new Date() },
    { id: WATCH_B, userId: USER_B, name: "Bob private", design: PRESETS[1].design, favorite: false, createdAt: new Date(), updatedAt: new Date() },
  ];
  rows.user_preferences = [
    { userId: USER_A, value: { ...DEFAULT_PREFERENCES, activeWatchId: WATCH_A }, updatedAt: new Date() },
    { userId: USER_B, value: { ...DEFAULT_PREFERENCES, activeWatchId: WATCH_B, unit: "celsius" }, updatedAt: new Date() },
  ];
  state.db = { select: () => new Query("select"), insert: (table: PgTable) => new Query("insert", table), update: (table: PgTable) => new Query("update", table), delete: (table: PgTable) => new Query("delete", table), batch: (items: Query[]) => Promise.all(items) };
});

describe("authenticated collection ownership", () => {
  it("returns only each signed-in user's collection and preferences", async () => {
    const alice = await loadStudio();
    expect(alice).toMatchObject({ ok: true, data: { account: { id: USER_A }, preferences: { activeWatchId: WATCH_A } } });
    if (alice.ok) { expect(alice.data.watches.map(watch => watch.id)).toEqual([WATCH_A]); expect(alice.data.watches[0]).not.toHaveProperty("userId"); }
    state.userId = USER_B;
    const bob = await loadStudio();
    if (!bob.ok) throw new Error(bob.error);
    expect(bob.data.watches.map(watch => watch.id)).toEqual([WATCH_B]);
    expect(bob.data.preferences.unit).toBe("celsius");
    expect(queries.every(query => query.condition?.includes('"user_id"') && query.params?.includes(query.params[0] === USER_A ? USER_A : USER_B))).toBe(true);
  });
  it("rejects another user's UUID for edit, favorite, delete and active-watch selection", async () => {
    expect((await saveWatch({ id: WATCH_B, name: "Stolen", design: PRESETS[2].design }, USER_A)).ok).toBe(false);
    expect((await setFavorite(WATCH_B, true, USER_A)).ok).toBe(false);
    expect((await deleteWatch(WATCH_B, USER_A)).ok).toBe(false);
    expect((await savePreferences({ ...DEFAULT_PREFERENCES, activeWatchId: WATCH_B }, USER_A)).ok).toBe(false);
    expect(rows.user_watches.find(watch => watch.id === WATCH_B)).toMatchObject({ name: "Bob private", favorite: false, design: PRESETS[1].design });
    expect(rows.user_preferences.find(row => row.userId === USER_B)?.value).toMatchObject({ activeWatchId: WATCH_B, unit: "celsius" });
    for (const query of queries) {
      expect(query.condition).toContain('"user_id"');
      expect(query.params).toContain(USER_A);
    }
  });
  it("derives new ownership from the session and rejects injected owner fields", async () => {
    expect((await saveWatch({ name: "Mine", design: PRESETS[0].design, userId: USER_B } as Parameters<typeof saveWatch>[0], USER_A)).ok).toBe(false);
    const result = await saveWatch({ name: "Mine", design: PRESETS[0].design }, USER_A);
    expect(result.ok).toBe(true);
    expect(rows.user_watches.at(-1)).toMatchObject({ userId: USER_A, name: "Mine" });
  });
  it("updates and deletes own watches while preserving the other user's settings", async () => {
    expect((await saveWatch({ id: WATCH_A, name: "Alice renamed", design: PRESETS[2].design }, USER_A)).ok).toBe(true);
    expect((await setFavorite(WATCH_A, true, USER_A)).ok).toBe(true);
    expect((await savePreferences({ ...DEFAULT_PREFERENCES, activeWatchId: WATCH_A, unit: "celsius" }, USER_A)).ok).toBe(true);
    expect((await deleteWatch(WATCH_A, USER_A)).ok).toBe(true);
    expect(rows.user_watches.map(watch => watch.id)).toEqual([WATCH_B]);
    expect(rows.user_preferences.find(row => row.userId === USER_A)?.value).toMatchObject({ activeWatchId: "monolith", unit: "celsius" });
    expect(rows.user_preferences.find(row => row.userId === USER_B)?.value).toMatchObject({ activeWatchId: WATCH_B, unit: "celsius" });
  });
  it("rejects unauthenticated direct calls before accessing any collection table", async () => {
    state.authenticated = false;
    for (const result of await Promise.all([loadStudio(), saveWatch({ name: "No", design: PRESETS[0].design }, USER_A), deleteWatch(WATCH_A, USER_A), setFavorite(WATCH_A, true, USER_A), savePreferences(DEFAULT_PREFERENCES, USER_A)])) expect(result.ok).toBe(false);
    expect(queries).toHaveLength(0);
  });
  it("blocks stale account-A tabs after another tab signs in as B, including new saves and preferences", async () => {
    state.userId = USER_B;
    const before = structuredClone(rows);
    const results = await Promise.all([
      saveWatch({ name: "Alice private draft", design: PRESETS[2].design }, USER_A),
      saveWatch({ id: WATCH_A, name: "Alice draft", design: PRESETS[2].design }, USER_A),
      deleteWatch(WATCH_A, USER_A), setFavorite(WATCH_A, true, USER_A),
      savePreferences({ ...DEFAULT_PREFERENCES, unit: "celsius" }, USER_A),
    ]);
    for (const result of results) expect(result).toMatchObject({ ok: false, error: expect.stringContaining("account changed") });
    expect(queries).toHaveLength(0);
    expect(rows).toEqual(before);
  });
});
