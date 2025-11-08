"use client";

import { useEffect, useMemo, useState } from "react";

export default function SecretaryApplicationsPage() {
  const base = useMemo(() => process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000", []);
  const [apps, setApps] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [admission, setAdmission] = useState<Record<number, string>>({});
  const [klass, setKlass] = useState<Record<number, string>>({});

  const load = async () => {
    setError(null);
    const res = await fetch(base + "/secretary/applications/?status=pending", { credentials: "include" });
    if (!res.ok) {
      setError("Unauthorized or server error");
      return;
    }
    setApps(await res.json());
  };

  useEffect(() => { load(); }, []);

  const approve = async (id: number) => {
    const res = await fetch(base + `/secretary/applications/${id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ admission_no: admission[id], class_name: klass[id] || null }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.detail ?? `Approve failed (${res.status})`);
      return;
    }
    await load();
  };

  const reject = async (id: number) => {
    const res = await fetch(base + `/secretary/applications/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ reason: "Not eligible" }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.detail ?? `Reject failed (${res.status})`);
      return;
    }
    await load();
  };

  return (
    <main style={{ maxWidth: 960, margin: "40px auto", fontFamily: "system-ui, sans-serif" }}>
      <h1>Secretary: Applications</h1>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th align="left">ID</th>
            <th align="left">Name</th>
            <th align="left">DOB</th>
            <th align="left">Gender</th>
            <th align="left">Class</th>
            <th align="left">Guardian</th>
            <th align="left">Email</th>
            <th align="left">Decision</th>
          </tr>
        </thead>
        <tbody>
          {apps.map(a => (
            <tr key={a.id}>
              <td>{a.id}</td>
              <td>{a.first_name} {a.last_name}</td>
              <td>{a.date_of_birth ?? ""}</td>
              <td>{a.gender ?? ""}</td>
              <td>{a.class_name ?? ""}</td>
              <td>{a.guardian_contact ?? ""}</td>
              <td>{a.email ?? ""}</td>
              <td>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input placeholder="Admission No" value={admission[a.id] ?? ""} onChange={e => setAdmission({ ...admission, [a.id]: e.target.value })} />
                  <input placeholder="Class" value={klass[a.id] ?? ""} onChange={e => setKlass({ ...klass, [a.id]: e.target.value })} />
                  <button onClick={() => approve(a.id)} disabled={!admission[a.id]}>Approve</button>
                  <button onClick={() => reject(a.id)}>Reject</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
