// Supabase-backed replacement for the window.storage API the app expects.
// Data lives in a single Postgres table (little_days_kv), scoped to the
// signed-in user via Row Level Security, so it survives browser data being
// cleared and syncs across every device that logs into the same account.

import { supabase } from "./supabaseClient.js";

const TABLE = "little_days_kv";

// Used to suppress the realtime echo of a device's own write (see
// subscribeToSync below) so a device doesn't jarringly reload right after
// it saves something itself.
let lastLocalWriteAt = 0;

export function attachStorage(userId) {
  window.storage = {
    async get(key, shared = false) {
      const { data, error } = await supabase
        .from(TABLE)
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
      const { error } = await supabase.from(TABLE).upsert(
        { user_id: userId, key, shared, value, updated_at: new Date().toISOString() },
        { onConflict: "user_id,key,shared" }
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
        .from(TABLE)
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
      let query = supabase.from(TABLE).select("key").eq("user_id", userId).eq("shared", shared);
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

// Subscribes to realtime changes on this user's rows (i.e. writes coming
// from another device/browser) and calls onRemoteChange when one arrives.
// Returns an unsubscribe function.
export function subscribeToSync(userId, onRemoteChange) {
  const channel = supabase
    .channel(`little-days-${userId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: TABLE, filter: `user_id=eq.${userId}` },
      () => {
        // If this device wrote very recently, this event is almost
        // certainly the echo of that write, not a change from elsewhere.
        if (Date.now() - lastLocalWriteAt < 2500) return;
        onRemoteChange();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
