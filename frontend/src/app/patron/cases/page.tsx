"use client";

import * as React from "react";
import { Container, Typography, Paper, Stack, TextField, Button, Alert, Table, TableHead, TableRow, TableCell, TableBody, MenuItem, Select, FormControl, InputLabel } from "@mui/material";

export default function PatronCasesPage() {
  const [authHeaders, setAuthHeaders] = React.useState<Record<string, string>>({});
  const [items, setItems] = React.useState<any[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [studentId, setStudentId] = React.useState<string>("");
  const [status, setStatus] = React.useState<string>("");
  const [severity, setSeverity] = React.useState<string>("");

  React.useEffect(() => { try { const t = localStorage.getItem("access_token"); if (t) setAuthHeaders({ Authorization: `Bearer ${t}` }); } catch {}; load(); }, []);

  async function load() {
    setError(null); setLoading(true);
    try {
      const url = new URL(`/api/discipline/cases`, location.origin);
      if (studentId) url.searchParams.set("student_id", studentId);
      if (status) url.searchParams.set("status", status);
      if (severity) url.searchParams.set("severity", severity);
      url.searchParams.set("limit", "200");
      url.searchParams.set("gender", "Male");
      const r = await fetch(url.toString(), { credentials: "include", headers: authHeaders });
      if (!r.ok) throw new Error(`Failed (${r.status})`);
      setItems(await r.json());
    } catch (e: any) { setError(e.message || "Failed to load cases"); }
    finally { setLoading(false); }
  }

  async function createCase(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      student_id: Number(fd.get("student_id")),
      category: String(fd.get("category") || "General"),
      severity: String(fd.get("severity") || "Minor"),
      status: String(fd.get("cstatus") || "open"),
      description: String(fd.get("description") || ""),
      actions_taken: String(fd.get("actions_taken") || ""),
      date: String(fd.get("date") || ""),
    };
    const r = await fetch(`/api/discipline/cases`, { method: "POST", credentials: "include", headers: { ...authHeaders, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!r.ok) { alert("Create failed (requires write role)"); return; }
    e.currentTarget.reset();
    load();
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Patron • Cases</Typography>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <TextField size="small" label="Student ID" value={studentId} onChange={(e) => setStudentId(e.target.value)} sx={{ maxWidth: 160 }} />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="st">Status</InputLabel>
            <Select labelId="st" value={status} label="Status" onChange={(e) => setStatus(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="open">open</MenuItem>
              <MenuItem value="closed">closed</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="sv">Severity</InputLabel>
            <Select labelId="sv" value={severity} label="Severity" onChange={(e) => setSeverity(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="Minor">Minor</MenuItem>
              <MenuItem value="Major">Major</MenuItem>
              <MenuItem value="Critical">Critical</MenuItem>
            </Select>
          </FormControl>
          <Button variant="outlined" onClick={load} disabled={loading}>{loading ? "Loading..." : "Refresh"}</Button>
        </Stack>
        {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Create Case</Typography>
        <form onSubmit={createCase}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField size="small" name="student_id" label="Student ID" required sx={{ maxWidth: 160 }} />
            <TextField size="small" name="category" label="Category" sx={{ maxWidth: 180 }} />
            <TextField size="small" name="severity" label="Severity" sx={{ maxWidth: 160 }} />
            <TextField size="small" name="cstatus" label="Status" sx={{ maxWidth: 140 }} />
            <TextField size="small" name="date" label="Date" type="datetime-local" InputLabelProps={{ shrink: true }} sx={{ maxWidth: 220 }} />
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1 }}>
            <TextField size="small" name="description" label="Description" sx={{ minWidth: 280 }} />
            <TextField size="small" name="actions_taken" label="Actions Taken" sx={{ minWidth: 280 }} />
            <Button type="submit" variant="contained">Save</Button>
          </Stack>
        </form>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Student</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Severity</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Description</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.id}</TableCell>
                <TableCell>{r.student_id}</TableCell>
                <TableCell>{r.date}</TableCell>
                <TableCell>{r.category}</TableCell>
                <TableCell>{r.severity}</TableCell>
                <TableCell>{r.status}</TableCell>
                <TableCell>{r.description || ""}</TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow><TableCell colSpan={7}><Typography color="text.secondary">No cases</Typography></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
}
