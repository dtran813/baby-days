import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  console.warn(
    "[Little Days] Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. " +
      "Copy .env.example to .env and fill in your Supabase project's values.",
  );
}

export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  publishableKey || "placeholder",
);
