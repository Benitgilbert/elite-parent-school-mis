"use client";

import { useState } from "react";

export default function ApplicationStatusPage() {
  const [ref, setRef] = useState("");
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setData(null);
    const base = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
    const res = await fetch(base + "/public/applications/status/" + encodeURIComponent(ref));
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.detail ?? `Lookup failed (${res.status})`);
      return;
    }
    setData(await res.json());
  };

  return (
    <main style={{ maxWidth: 640, margin: "40px auto", fontFamily: "system-ui, sans-serif" }}>
      <h1>Check Application Status</h1>
      <form onSubmit={submit} style={{ display: "flex", gap: 8 }}>
        <input placeholder="Reference code" value={ref} onChange={e => setRef(e.target.value)} required />
        <button type="submit">Check</button>
      </form>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {data && (
        <pre>{JSON.stringify(data, null, 2)}</pre>
      )}
    </main>
  );
}
