"use client";

import * as React from "react";
import { Container, Typography, Paper, Stack, Button, TextField, Alert, Table, TableHead, TableRow, TableCell, TableBody } from "@mui/material";

export default function DirectorReportCardsPage() {
  const [authHeaders, setAuthHeaders] = React.useState<Record<string, string>>({});
  const [term, setTerm] = React.useState<string>("");
  const [className, setClassName] = React.useState<string>("");
  const [rows, setRows] = React.useState<Array<{ student_id: string; assessment_id: string; subject: string; score: string }>>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => { try { const t = localStorage.getItem("access_token"); if (t) setAuthHeaders({ Authorization: `Bearer ${t}` }); } catch {} }, []);

  async function load() {
    setError(null); setRows([]); setLoading(true);
    try {
      const url = new URL(`/api/report-cards/class`, location.origin);
      if (term) url.searchParams.set("term", term);
      if (className) url.searchParams.set("class_name", className);
      const r = await fetch(url.toString(), { credentials: "include", headers: authHeaders });
      if (!r.ok) throw new Error(`Failed (${r.status})`);
      const csv = await r.text();
      const lines = csv.split(/\r?\n/).filter(Boolean);
      const out: Array<{ student_id: string; assessment_id: string; subject: string; score: string }> = [];
      for (let i = 1; i < lines.length; i++) {
        const [student_id = "", assessment_id = "", subject = "", score = ""] = lines[i].split(",");
        out.push({ student_id, assessment_id, subject, score });
      }
      setRows(out);
    } catch (e: any) { setError(e.message || "Failed to load"); }
    finally { setLoading(false); }
  }

  function downloadCSV() {
    const url = new URL(`/api/report-cards/class`, location.origin);
    if (term) url.searchParams.set("term", term);
    if (className) url.searchParams.set("class_name", className);
    window.open(url.toString(), "_blank");
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Report Cards</Typography>
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <TextField size="small" label="Term (optional)" value={term} onChange={(e) => setTerm(e.target.value)} sx={{ maxWidth: 200 }} />
          <TextField size="small" label="Class (optional)" value={className} onChange={(e) => setClassName(e.target.value)} sx={{ maxWidth: 200 }} />
          <Button variant="contained" onClick={load} disabled={loading}>{loading ? "Loading..." : "View"}</Button>
          <Button variant="outlined" onClick={downloadCSV}>Download CSV</Button>
        </Stack>
        {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
      </Paper>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Student ID</TableCell>
              <TableCell>Assessment ID</TableCell>
              <TableCell>Subject</TableCell>
              <TableCell align="right">Score</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell>{r.student_id}</TableCell>
                <TableCell>{r.assessment_id}</TableCell>
                <TableCell>{r.subject}</TableCell>
                <TableCell align="right">{r.score}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={4}><Typography color="text.secondary">No data</Typography></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
}
