"use client";

import { useEffect, useMemo, useState } from "react";

type Role = { id: number; name: string };

type User = { id: number; email: string; full_name?: string | null; is_active?: boolean | null; roles: string[] };

def useApiBase() {
  return useMemo(() => process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000", []);
}

export default function AdminUsersPage() {
  const base = useApiBase();
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({ email: "", full_name: "", password: "", role_names: [] as string[] });
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    const [r1, r2] = await Promise.all([
      fetch(base + "/admin/roles", { credentials: "include" }),
      fetch(base + "/admin/users", { credentials: "include" }),
    ]);
    if (!r1.ok || !r2.ok) {
      throw new Error("Unauthorized or server error");
    }
    setRoles(await r1.json());
    setUsers(await r2.json());
  };

  useEffect(() => { load().catch(e => setError(String(e))); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await fetch(base + "/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({} as any));
      setError(body?.detail ?? `Error ${res.status}`);
      return;
    }
    setForm({ email: "", full_name: "", password: "", role_names: [] });
    await load();
  };

  const del = async (id: number) => {
    await fetch(base + `/admin/users/${id}`, { method: "DELETE", credentials: "include" });
    await load();
  };

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", fontFamily: "system-ui, sans-serif" }}>
      <h1>Admin: Users</h1>
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <section style={{ border: "1px solid #ddd", padding: 16, marginBottom: 24 }}>
        <h2>Create user</h2>
        <form onSubmit={submit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label>
              Email
              <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </label>
            <label>
              Full name
              <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
            </label>
            <label>
              Password
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            </label>
            <div>
              Roles
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {roles.map(r => (
                  <label key={r.id} style={{ display: "inline-flex", gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={form.role_names.includes(r.name)}
                      onChange={e => {
                        const next = new Set(form.role_names);
                        if (e.target.checked) next.add(r.name); else next.delete(r.name);
                        setForm({ ...form, role_names: Array.from(next) });
                      }}
                    />
                    {r.name}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <button type="submit">Create</button>
          </div>
        </form>
      </section>

      <section>
        <h2>Existing users</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th align="left">ID</th>
              <th align="left">Email</th>
              <th align="left">Name</th>
              <th align="left">Active</th>
              <th align="left">Roles</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.email}</td>
                <td>{u.full_name ?? ""}</td>
                <td>{String(u.is_active ?? true)}</td>
                <td>{u.roles.join(", ")}</td>
                <td>
                  <button onClick={() => del(u.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
