"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try { localStorage.removeItem("access_token"); } catch {}
      try { await fetch("/api/auth/logout", { method: "POST", credentials: "include" }); } catch {}
      // Hard navigation to ensure all client state is reset
      window.location.href = "/login";
    })();
  }, [router]);

  return (
    <main style={{ maxWidth: 640, margin: "64px auto", fontFamily: "system-ui, sans-serif" }}>
      <p>Signing you out...</p>
    </main>
  );
}
