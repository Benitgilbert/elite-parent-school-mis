"use client";

import * as React from "react";
import { Container, Typography, Paper, Stack, Button, TextField, Alert, Table, TableHead, TableRow, TableCell, TableBody, Chip } from "@mui/material";

export default function DirectorAnalyticsPage() {
  const [authHeaders, setAuthHeaders] = React.useState<Record<string, string>>({});
  const [term, setTerm] = React.useState<string>("");
  const [className, setClassName] = React.useState<string>("");
  const [data, setData] = React.useState<any | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => { try { const t = localStorage.getItem("access_token"); if (t) setAuthHeaders({ Authorization: `Bearer ${t}` }); } catch {} }, []);

  async function load() {
    setError(null); setLoading(true);
    try {
      const url = new URL(`/api/analytics/class-report`, location.origin);
      if (term) url.searchParams.set("term", term);
      if (className) url.searchParams.set("class_name", className);
      const r = await fetch(url.toString(), { credentials: "include", headers: authHeaders });
      if (!r.ok) throw new Error(`Failed (${r.status})`);
      setData(await r.json());
    } catch (e: any) { setError(e.message || "Failed to load analytics"); }
    finally { setLoading(false); }
  }

  function downloadCSV() {
    const url = new URL(`/api/analytics/class-report/export`, location.origin);
    if (term) url.searchParams.set("term", term);
    if (className) url.searchParams.set("class_name", className);
    window.open(url.toString(), "_blank");
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Analytics</Typography>
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <TextField size="small" label="Term (optional)" value={term} onChange={(e) => setTerm(e.target.value)} sx={{ maxWidth: 200 }} />
          <TextField size="small" label="Class (optional)" value={className} onChange={(e) => setClassName(e.target.value)} sx={{ maxWidth: 200 }} />
          <Button variant="contained" onClick={load} disabled={loading}>{loading ? "Loading..." : "Load"}</Button>
          <Button variant="outlined" onClick={downloadCSV}>Download CSV</Button>
        </Stack>
        {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
      </Paper>

      {data && (
        <>
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Chip label={`Overall Avg: ${data.overall_average}`} color="info" />
              <Chip label={`Pass Rate: ${data.overall_pass_rate}%`} color="success" />
              {data.approx_class_size && <Chip label={`Approx Class Size: ${data.approx_class_size}`} />}
            </Stack>
          </Paper>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>Subjects</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Subject</TableCell>
                  <TableCell align="right">Average</TableCell>
                  <TableCell align="right">Pass Rate</TableCell>
                  <TableCell align="right">Count</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data.subjects || []).map((s: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell>{s.subject}</TableCell>
                    <TableCell align="right">{s.average}</TableCell>
                    <TableCell align="right">{s.pass_rate}%</TableCell>
                    <TableCell align="right">{s.count}</TableCell>
                  </TableRow>
                ))}
                {(!data.subjects || data.subjects.length === 0) && (
                  <TableRow><TableCell colSpan={4}><Typography color="text.secondary">No data</Typography></TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        </>
      )}
    </Container>
  );
}
