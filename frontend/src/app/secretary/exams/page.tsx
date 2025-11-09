"use client";

import * as React from "react";
import { Container, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, TextField, Stack, Button, Alert } from "@mui/material";
import Link from "next/link";

type Assessment = {
  id: number;
  name: string;
  term?: string | null;
  class_name?: string | null;
  subject?: string | null;
  weight: number;
  date?: string | null;
};

export default function ExamsPage() {
  const [items, setItems] = React.useState<Assessment[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const [form, setForm] = React.useState<Partial<Assessment>>({ name: "", term: "", class_name: "", subject: "", weight: 1, date: "" });

  const authHeaders = React.useMemo(() => {
    try {
      const t = localStorage.getItem("access_token");
      return t ? { Authorization: `Bearer ${t}` } : {};
    } catch {
      return {} as Record<string, string>;
    }
  }, []);

  async function load() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/exams/assessments`, { credentials: "include", headers: authHeaders });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setItems(await res.json());
    } catch (e: any) {
      setError(e.message || "Failed to load assessments");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); }, []);

  async function create() {
    setError(null);
    const payload = { ...form, weight: Number(form.weight || 1) };
    const res = await fetch(`/api/exams/assessments`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.detail ?? `Create failed (${res.status})`);
      return;
    }
    setForm({ name: "", term: form.term || "", class_name: form.class_name || "", subject: form.subject || "", weight: 1, date: "" });
    await load();
  }

  async function del(id: number) {
    if (!confirm("Delete this assessment and its results?")) return;
    const res = await fetch(`/api/exams/assessments/${id}`, { method: "DELETE", credentials: "include", headers: authHeaders });
    if (!res.ok && res.status !== 204) {
      setError(`Delete failed (${res.status})`);
      return;
    }
    await load();
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Exams • Assessments</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Create Assessment</Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <TextField size="small" label="Name" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <TextField size="small" label="Term" value={form.term || ""} onChange={(e) => setForm({ ...form, term: e.target.value })} />
          <TextField size="small" label="Class" value={form.class_name || ""} onChange={(e) => setForm({ ...form, class_name: e.target.value })} />
          <TextField size="small" label="Subject" value={form.subject || ""} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          <TextField size="small" label="Weight" type="number" value={form.weight ?? 1} onChange={(e) => setForm({ ...form, weight: Number(e.target.value) })} />
          <TextField size="small" label="Date" type="date" InputLabelProps={{ shrink: true }} value={form.date || ""} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <Button variant="contained" onClick={create} disabled={!form.name}>Create</Button>
        </Stack>
      </Paper>

      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Term</TableCell>
              <TableCell>Class</TableCell>
              <TableCell>Subject</TableCell>
              <TableCell>Weight</TableCell>
              <TableCell>Date</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((a) => (
              <TableRow key={a.id} hover>
                <TableCell>{a.id}</TableCell>
                <TableCell>{a.name}</TableCell>
                <TableCell>{a.term || ""}</TableCell>
                <TableCell>{a.class_name || ""}</TableCell>
                <TableCell>{a.subject || ""}</TableCell>
                <TableCell>{a.weight}</TableCell>
                <TableCell>{a.date || ""}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button size="small" component={Link} href={`/secretary/exams/${a.id}`}>Enter Results</Button>
                    <Button size="small" color="error" onClick={() => del(a.id)}>Delete</Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={8}><Typography color="text.secondary">No assessments</Typography></TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
}
