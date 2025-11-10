"use client";

import * as React from "react";
import { Container, Typography, Paper, Stack, Button, TextField, Table, TableHead, TableRow, TableCell, TableBody, Alert } from "@mui/material";

export default function StudentReportCardsPage() {
  const [authHeaders, setAuthHeaders] = React.useState<Record<string, string>>({});
  const [term, setTerm] = React.useState<string>("");
  const [rows, setRows] = React.useState<Array<{ assessment_id: string; subject: string; score: string }>>([]);
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
    setRows([]);
    setLoading(true);
    try {
      const url = new URL(`/api/report-cards/my`, location.origin);
      if (term) url.searchParams.set("term", term);
      const r = await fetch(url.toString(), { credentials: "include", headers: authHeaders });
      if (r.status === 403) throw new Error("Access denied");
      if (!r.ok) throw new Error(`Failed (${r.status})`);
      const csv = await r.text();
      const lines = csv.split(/\r?\n/).filter(Boolean);
      const out: Array<{ assessment_id: string; subject: string; score: string }> = [];
      for (let i = 1; i < lines.length; i++) {
        const [assessment_id = "", subject = "", score = ""] = lines[i].split(",");
        out.push({ assessment_id, subject, score });
      }
      setRows(out);
    } catch (e: any) {
      setError(e.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Report Cards</Typography>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }}>
          <TextField size="small" label="Term (optional)" value={term} onChange={(e) => setTerm(e.target.value)} sx={{ maxWidth: 200 }} />
          <Button variant="contained" onClick={load} disabled={loading}>{loading ? "Loading..." : "View Report"}</Button>
        </Stack>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Assessment ID</TableCell>
              <TableCell>Subject</TableCell>
              <TableCell align="right">Score</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell>{r.assessment_id}</TableCell>
                <TableCell>{r.subject}</TableCell>
                <TableCell align="right">{r.score}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={3}>
                  <Typography color="text.secondary">No report data</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
}
