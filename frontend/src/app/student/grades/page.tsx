"use client";

import * as React from "react";
import { Container, Typography, Paper, Stack, Button, TextField, Table, TableHead, TableRow, TableCell, TableBody, Alert } from "@mui/material";

export default function StudentGradesPage() {
  const [authHeaders, setAuthHeaders] = React.useState<Record<string, string>>({});
  const [term, setTerm] = React.useState<string>("");
  const [subject, setSubject] = React.useState<string>("");
  const [items, setItems] = React.useState<Array<{ assessment_id: number; name: string; term?: string | null; class_name?: string | null; subject?: string | null; weight: number; date?: string | null; score: number }>>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    try {
      const token = localStorage.getItem("access_token");
      if (token) setAuthHeaders({ Authorization: `Bearer ${token}` });
    } catch {}
    load();
  }, []);

  async function load() {
    setError(null);
    setItems([]);
    setLoading(true);
    try {
      const url = new URL(`/api/grades/my`, location.origin);
      if (term) url.searchParams.set("term", term);
      if (subject) url.searchParams.set("subject", subject);
      const r = await fetch(url.toString(), { credentials: "include", headers: authHeaders });
      if (r.status === 403) throw new Error("Access denied");
      if (!r.ok) throw new Error(`Failed (${r.status})`);
      const data = await r.json();
      setItems(data.items || []);
    } catch (e: any) {
      setError(e.message || "Failed to load grades");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>My Grades</Typography>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }}>
          <TextField size="small" label="Term (optional)" value={term} onChange={(e) => setTerm(e.target.value)} sx={{ maxWidth: 200 }} />
          <TextField size="small" label="Subject (optional)" value={subject} onChange={(e) => setSubject(e.target.value)} sx={{ maxWidth: 220 }} />
          <Button variant="contained" onClick={load} disabled={loading}>{loading ? "Loading..." : "Filter"}</Button>
        </Stack>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Assessment</TableCell>
              <TableCell>Subject</TableCell>
              <TableCell>Term</TableCell>
              <TableCell align="right">Weight</TableCell>
              <TableCell align="right">Score</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((r, i) => (
              <TableRow key={i}>
                <TableCell>{r.date || ""}</TableCell>
                <TableCell>{r.name}</TableCell>
                <TableCell>{r.subject || ""}</TableCell>
                <TableCell>{r.term || ""}</TableCell>
                <TableCell align="right">{r.weight}</TableCell>
                <TableCell align="right">{r.score}</TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}><Typography color="text.secondary">No grades</Typography></TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
}
