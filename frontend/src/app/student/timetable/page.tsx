"use client";

import * as React from "react";
import { Container, Typography, Paper, Stack, Button, TextField, Table, TableHead, TableRow, TableCell, TableBody, Alert } from "@mui/material";

export default function StudentTimetablePage() {
  const [authHeaders, setAuthHeaders] = React.useState<Record<string, string>>({});
  const [term, setTerm] = React.useState<string>("");
  const [items, setItems] = React.useState<Array<{ day_of_week: string; period_index: number; subject: string; room?: string | null }>>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    try {
      const token = localStorage.getItem("access_token");
      if (token) setAuthHeaders({ Authorization: `Bearer ${token}` });
    } catch {}
  }, []);

  async function load() {
    setError(null);
    setItems([]);
    if (!term.trim()) { setError("Enter term e.g., 2025-T1"); return; }
    setLoading(true);
    try {
      const url = new URL(`/api/timetable/my`, location.origin);
      url.searchParams.set("term", term.trim());
      const r = await fetch(url.toString(), { credentials: "include", headers: authHeaders });
      if (r.status === 403) throw new Error("Access denied or class not configured");
      if (!r.ok) throw new Error(`Failed (${r.status})`);
      const data = await r.json();
      setItems(data.items || []);
    } catch (e: any) {
      setError(e.message || "Failed to load timetable");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Timetable</Typography>
      <Paper variant="outlined" sx={{ p: 2 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }}>
          <TextField size="small" label="Term (e.g., 2025-T1)" value={term} onChange={(e) => setTerm(e.target.value)} sx={{ maxWidth: 220 }} />
          <Button size="small" variant="outlined" onClick={load} disabled={loading}>{loading ? "Loading..." : "Load"}</Button>
        </Stack>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Day</TableCell>
              <TableCell align="right">Period</TableCell>
              <TableCell>Subject</TableCell>
              <TableCell>Room</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((r, i) => (
              <TableRow key={i}>
                <TableCell>{r.day_of_week}</TableCell>
                <TableCell align="right">{r.period_index}</TableCell>
                <TableCell>{r.subject}</TableCell>
                <TableCell>{r.room || ""}</TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}><Typography color="text.secondary">No timetable loaded</Typography></TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
}
