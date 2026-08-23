import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import Auth from "./Auth.jsx";
import "./index.css";
import { supabase } from "./supabaseClient.js";
import { attachStorage, attachCollections } from "./storage-polyfill.js";

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

  // Track the auth session.
  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, sess) => {
        setSession(sess);
      },
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  // Once signed in, point window.storage at this user's Supabase rows.
  // App itself manages loading data and subscribing to realtime changes
  // once it has the userId, so a change on another device only refetches
  // the specific list that changed instead of remounting everything.
  useEffect(() => {
    if (!session) {
      setStorageReady(false);
      return;
    }
    attachStorage(session.user.id);
    attachCollections(session.user.id);
    setStorageReady(true);
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

  return (
    <App userId={session.user.id} onSignOut={() => supabase.auth.signOut()} />
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
