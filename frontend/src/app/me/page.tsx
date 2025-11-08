"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function MePage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const base = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
        const res = await fetch(base + "/users/me", { credentials: "include" });
        if (!res.ok) {
          throw new Error(`Unauthorized (${res.status})`);
        }
        setData(await res.json());
      } catch (e: any) {
        setError(e.message ?? "Failed to load");
      }
    })();
  }, []);

  if (error) {
    return (
      <main style={{ maxWidth: 640, margin: "64px auto", fontFamily: "system-ui, sans-serif" }}>
        <p>{error}. <Link href="/login">Go to login</Link></p>
      </main>
    );
  }

  if (!data) {
    return <main style={{ maxWidth: 640, margin: "64px auto", fontFamily: "system-ui, sans-serif" }}>Loading...</main>;
  }

  return (
    <main style={{ maxWidth: 640, margin: "64px auto", fontFamily: "system-ui, sans-serif" }}>
      <h1>Me</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
      <form action={async () => {
        const base = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
        await fetch(base + "/auth/logout", { method: "POST", credentials: "include" });
        location.href = "/login";
      }}>
        <button type="submit">Logout</button>
      </form>
    </main>
  );
}
