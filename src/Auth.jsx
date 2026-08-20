import React, { useState } from "react";
import { Sparkles } from "lucide-react";
import { supabase } from "./supabaseClient.js";

const C = {
  bg: "#FBF6EF",
  surface: "#FFFFFF",
  ink: "#34281F",
  inkMuted: "#8A7A6D",
  border: "#E9E0D3",
  primary: "#3F6F67",
  primaryLight: "#E4EFEC",
  danger: "#B04A3D",
  dangerLight: "#F7E7E3",
  successLight: "#E4EFEC",
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: `1.5px solid ${C.border}`,
  fontSize: 16,
  color: C.ink,
  background: C.surface,
  outline: "none",
  fontFamily: "Inter, sans-serif",
};

export default function Auth() {
  const [mode, setMode] = useState("signin"); // 'signin' | 'signup'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!email.trim() || password.length < 6) {
      setError("Enter an email and a password of at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else {
        const { error, data } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        if (data?.user && !data.session) {
          setInfo("Account created. Check your email to confirm it, then sign in.");
          setMode("signin");
        }
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: C.bg,
        fontFamily: "Inter, sans-serif",
        padding: "24px",
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Inter:wght@400;500;600;700&display=swap');`}</style>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              background: C.primaryLight,
              color: C.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Sparkles size={28} />
          </div>
        </div>
        <h1
          style={{
            fontFamily: "'Fraunces', serif",
            fontWeight: 600,
            fontSize: 28,
            textAlign: "center",
            color: C.ink,
            margin: "0 0 6px",
          }}
        >
          Little Days
        </h1>
        <p style={{ textAlign: "center", fontSize: 14, color: C.inkMuted, margin: "0 0 28px" }}>
          {mode === "signin" ? "Sign in to sync across your devices." : "Create an account to get started."}
        </p>

        <form onSubmit={submit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.inkMuted, marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              autoFocus
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.inkMuted, marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              style={inputStyle}
            />
          </div>

          {error && (
            <div style={{ background: C.dangerLight, color: C.danger, borderRadius: 12, padding: "10px 12px", fontSize: 13, marginBottom: 14 }}>
              {error}
            </div>
          )}
          {info && (
            <div style={{ background: C.successLight, color: C.primary, borderRadius: 12, padding: "10px 12px", fontSize: 13, marginBottom: 14 }}>
              {info}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 16,
              border: "none",
              background: loading ? "#B9AC9E" : C.primary,
              color: "#fff",
              fontWeight: 600,
              fontSize: 16,
              cursor: loading ? "default" : "pointer",
            }}
          >
            {loading ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: 13, color: C.inkMuted, marginTop: 18 }}>
          {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError("");
              setInfo("");
            }}
            style={{ background: "none", border: "none", color: C.primary, fontWeight: 600, cursor: "pointer", padding: 0, fontSize: 13 }}
          >
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
