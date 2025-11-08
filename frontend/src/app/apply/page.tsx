"use client";

import { useState } from "react";

export default function ApplyPage() {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    date_of_birth: "",
    gender: "",
    class_name: "",
    guardian_contact: "",
    email: "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setStatus(null);
    const base = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
    const res = await fetch(base + "/public/applications/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        date_of_birth: form.date_of_birth || null,
        gender: form.gender || null,
        class_name: form.class_name || null,
        guardian_contact: form.guardian_contact || null,
        email: form.email || null,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.detail ?? `Submission failed (${res.status})`);
    } else {
      setStatus("Application submitted. We will contact you.");
      setForm({ first_name: "", last_name: "", date_of_birth: "", gender: "", class_name: "", guardian_contact: "", email: "" });
    }
  };

  return (
    <main style={{ maxWidth: 640, margin: "40px auto", fontFamily: "system-ui, sans-serif" }}>
      <h1>Student Application</h1>
      {status && <p style={{ color: "green" }}>{status}</p>}
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        <label>First Name<input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} required /></label>
        <label>Last Name<input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} required /></label>
        <label>Date of Birth<input type="date" value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} /></label>
        <label>Gender<input value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} placeholder="M/F" /></label>
        <label>Class Applying For<input value={form.class_name} onChange={e => setForm({ ...form, class_name: e.target.value })} /></label>
        <label>Guardian Contact<input value={form.guardian_contact} onChange={e => setForm({ ...form, guardian_contact: e.target.value })} /></label>
        <label>Email<input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
        <button type="submit">Submit Application</button>
      </form>
    </main>
  );
}
