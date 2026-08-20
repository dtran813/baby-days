import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import Auth from "./Auth.jsx";
import "./index.css";
import { supabase } from "./supabaseClient.js";
import { attachStorage, subscribeToSync } from "./storage-polyfill.js";

const loadingScreenStyle = {
  minHeight: "100dvh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#FBF6EF",
  fontFamily: "Inter, sans-serif",
  color: "#8A7A6D",
  fontSize: 14,
};

function Root() {
  const [session, setSession] = useState(undefined); // undefined = still checking
  const [storageReady, setStorageReady] = useState(false);
  const [syncTick, setSyncTick] = useState(0);

  // Track the auth session.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Once signed in, point window.storage at this user's Supabase rows and
  // listen for changes coming from other devices.
  useEffect(() => {
    if (!session) {
      setStorageReady(false);
      return;
    }
    attachStorage(session.user.id);
    setStorageReady(true);
    const unsubscribe = subscribeToSync(session.user.id, () => {
      // A change arrived from another device: remount App so it re-reads
      // everything fresh from Supabase.
      setSyncTick((t) => t + 1);
    });
    return unsubscribe;
  }, [session]);

  if (session === undefined) {
    return <div style={loadingScreenStyle}>Loading...</div>;
  }
  if (!session) {
    return <Auth />;
  }
  if (!storageReady) {
    return <div style={loadingScreenStyle}>Loading...</div>;
  }

  return <App key={syncTick} onSignOut={() => supabase.auth.signOut()} />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
