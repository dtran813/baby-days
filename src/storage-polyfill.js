// Data layer for the deployed app.
//
// `profile` and `active-timer` are small, single-object values, so they
// stay in the original key/value table (little_days_kv) — one row per
// user per key, whole-value read/write is fine at that size.
//
// Events, growth measurements, and journal entries are collections that
// grow over time, so each item gets its OWN row in its own table
// (events / growth_entries / journal_entries). This is the important
// part: an insert, update, or delete only ever touches ONE row. A failed
// or empty read can never cause a save to overwrite anyone else's
// history, because saves are never "rewrite the whole collection" — they
// operate on a single record.

import { supabase } from "./supabaseClient.js";

const KV_TABLE = "little_days_kv";

// Used to suppress the realtime echo of a device's own write, so a
// device doesn't reload right after it saves something itself.
let lastLocalWriteAt = 0;

/* ------------------------------------------------------------------ */
/* Singleton key/value store — profile, active-timer                   */
/* ------------------------------------------------------------------ */
export function attachStorage(userId) {
  window.storage = {
    async get(key, shared = false) {
      const { data, error } = await supabase
        .from(KV_TABLE)
        .select("value")
        .eq("user_id", userId)
        .eq("key", key)
        .eq("shared", shared)
        .maybeSingle();
      if (error) {
        console.error("[Little Days] storage.get failed", key, error);
        throw error;
      }
      if (!data) return null;
      return { key, value: data.value, shared };
    },

    async set(key, value, shared = false) {
      lastLocalWriteAt = Date.now();
      const { error } = await supabase
        .from(KV_TABLE)
        .upsert(
          {
            user_id: userId,
            key,
            shared,
            value,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,key,shared" },
        );
      if (error) {
        console.error("[Little Days] storage.set failed", key, error);
        throw error;
      }
      return { key, value, shared };
    },

    async delete(key, shared = false) {
      lastLocalWriteAt = Date.now();
      const { error, count } = await supabase
        .from(KV_TABLE)
        .delete({ count: "exact" })
        .eq("user_id", userId)
        .eq("key", key)
        .eq("shared", shared);
      if (error) {
        console.error("[Little Days] storage.delete failed", key, error);
        throw error;
      }
      return { key, deleted: (count || 0) > 0, shared };
    },

    async list(prefix = "", shared = false) {
      let query = supabase
        .from(KV_TABLE)
        .select("key")
        .eq("user_id", userId)
        .eq("shared", shared);
      if (prefix) query = query.like("key", `${prefix}%`);
      const { data, error } = await query;
      if (error) {
        console.error("[Little Days] storage.list failed", prefix, error);
        throw error;
      }
      return { keys: (data || []).map((r) => r.key), prefix, shared };
    },
  };
}

/* ------------------------------------------------------------------ */
/* Per-row collections — events, growth, journal                       */
/* ------------------------------------------------------------------ */
function makeCollection(table, dateColumn, userId) {
  return {
    async list() {
      const { data, error } = await supabase
        .from(table)
        .select("data")
        .eq("user_id", userId)
        .order(dateColumn, { ascending: true });
      if (error) {
        console.error(`[Little Days] ${table}.list failed`, error);
        throw error;
      }
      return (data || []).map((r) => r.data);
    },

    async put(item) {
      lastLocalWriteAt = Date.now();
      const row = {
        user_id: userId,
        id: item.id,
        data: item,
        updated_at: new Date().toISOString(),
        [dateColumn]: item[dateColumn],
      };
      if (table === "events") row.type = item.type;
      const { error } = await supabase
        .from(table)
        .upsert(row, { onConflict: "user_id,id" });
      if (error) {
        console.error(`[Little Days] ${table}.put failed`, item.id, error);
        throw error;
      }
    },

    async remove(id) {
      lastLocalWriteAt = Date.now();
      const { error } = await supabase
        .from(table)
        .delete()
        .eq("user_id", userId)
        .eq("id", id);
      if (error) {
        console.error(`[Little Days] ${table}.remove failed`, id, error);
        throw error;
      }
    },
  };
}

export function attachCollections(userId) {
  window.storage.eventsApi = makeCollection("events", "timestamp", userId);
  window.storage.growthApi = makeCollection("growth_entries", "date", userId);
  window.storage.journalApi = makeCollection(
    "journal_entries",
    "timestamp",
    userId,
  );
}

/* ------------------------------------------------------------------ */
/* Realtime sync                                                       */
/* ------------------------------------------------------------------ */
// Subscribes to changes on this user's rows across the KV table and the
// three collection tables. Each callback only refetches its own slice of
// data — never a full-app remount — so a change on another device just
// quietly updates the relevant list instead of jarring the UI.
export function subscribeAll(
  userId,
  { onKvChange, onEventsChange, onGrowthChange, onJournalChange },
) {
  const isEcho = () => Date.now() - lastLocalWriteAt < 2500;

  const channel = supabase
    .channel(`little-days-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: KV_TABLE,
        filter: `user_id=eq.${userId}`,
      },
      () => {
        if (!isEcho() && onKvChange) onKvChange();
      },
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "events",
        filter: `user_id=eq.${userId}`,
      },
      () => {
        if (!isEcho() && onEventsChange) onEventsChange();
      },
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "growth_entries",
        filter: `user_id=eq.${userId}`,
      },
      () => {
        if (!isEcho() && onGrowthChange) onGrowthChange();
      },
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "journal_entries",
        filter: `user_id=eq.${userId}`,
      },
      () => {
        if (!isEcho() && onJournalChange) onJournalChange();
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
