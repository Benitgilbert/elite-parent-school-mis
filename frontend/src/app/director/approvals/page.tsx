"use client";

import * as React from "react";
import { Container, Typography, Paper, Stack, TextField, Button, Alert, Table, TableHead, TableRow, TableCell, TableBody, Chip } from "@mui/material";

export default function DirectorApprovalsPage() {
  const [authHeaders, setAuthHeaders] = React.useState<Record<string, string>>({});
  const [items, setItems] = React.useState<any[]>([]);
  const [status, setStatus] = React.useState<string>("pending");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => { try { const t = localStorage.getItem("access_token"); if (t) setAuthHeaders({ Authorization: `Bearer ${t}` }); } catch {}; load(); }, []);

  async function load() {
    setError(null); setLoading(true);
    try {
      const url = new URL(`/api/secretary/applications/`, location.origin);
      if (status) url.searchParams.set("status", status);
      const r = await fetch(url.toString(), { credentials: "include", headers: authHeaders });
      if (!r.ok) throw new Error(`Failed (${r.status})`);
      setItems(await r.json());
    } catch (e: any) { setError(e.message || "Failed to load applications"); }
    finally { setLoading(false); }
  }

  async function approve(appId: number, admission_no: string, class_name: string) {
    const payload = { admission_no, class_name };
    const r = await fetch(`/api/secretary/applications/${appId}/approve`, { method: "POST", credentials: "include", headers: { ...authHeaders, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!r.ok) { alert("Approve failed"); return; }
    load();
  }

  async function reject(appId: number, reason: string) {
    const payload = { reason };
    const r = await fetch(`/api/secretary/applications/${appId}/reject`, { method: "POST", credentials: "include", headers: { ...authHeaders, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!r.ok) { alert("Reject failed"); return; }
    load();
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Approvals</Typography>
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <TextField size="small" label="Status" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ maxWidth: 180 }} />
          <Button variant="outlined" onClick={load} disabled={loading}>{loading ? "Loading..." : "Refresh"}</Button>
        </Stack>
        {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
      </Paper>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Reference</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Class</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((a: any) => (
              <TableRow key={a.id}>
                <TableCell>{a.id}</TableCell>
                <TableCell>{a.reference}</TableCell>
                <TableCell>{a.first_name} {a.last_name}</TableCell>
                <TableCell>{a.class_name || ""}</TableCell>
                <TableCell><Chip label={a.status} size="small" /></TableCell>
                <TableCell>
                  {a.status === 'pending' ? (
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                      <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget as HTMLFormElement); approve(a.id, String(fd.get('admission_no')), String(fd.get('class_name') || '')); }}>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                          <TextField size="small" name="admission_no" label="Admission No" required sx={{ maxWidth: 160 }} />
                          <TextField size="small" name="class_name" label="Class (optional)" sx={{ maxWidth: 160 }} />
                          <Button type="submit" variant="contained">Approve</Button>
                        </Stack>
                      </form>
                      <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget as HTMLFormElement); reject(a.id, String(fd.get('reason') || '')); }}>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                          <TextField size="small" name="reason" label="Reason" required sx={{ maxWidth: 260 }} />
                          <Button type="submit" variant="outlined" color="error">Reject</Button>
                        </Stack>
                      </form>
                    </Stack>
                  ) : (
                    <span>-</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow><TableCell colSpan={6}><Typography color="text.secondary">No applications</Typography></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
}
