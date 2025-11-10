"use client";

import * as React from "react";
import { Container, Typography, Paper, Stack, Button, TextField, Alert } from "@mui/material";

export default function StudentProgressPage() {
  const [authHeaders, setAuthHeaders] = React.useState<Record<string, string>>({});
  const [subject, setSubject] = React.useState<string>("");
  const [series, setSeries] = React.useState<Array<{ term: string; average: number }>>([]);
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
    setSeries([]);
    setLoading(true);
    try {
      const url = new URL(`/api/grades/my/progress`, location.origin);
      if (subject) url.searchParams.set("subject", subject);
      const r = await fetch(url.toString(), { credentials: "include", headers: authHeaders });
      if (r.status === 403) throw new Error("Access denied");
      if (!r.ok) throw new Error(`Failed (${r.status})`);
      const data = await r.json();
      setSeries(data.series || []);
    } catch (e: any) {
      setError(e.message || "Failed to load progress");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Progress Tracking</Typography>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }}>
          <TextField size="small" label="Subject (optional)" value={subject} onChange={(e) => setSubject(e.target.value)} sx={{ maxWidth: 220 }} />
          <Button variant="contained" onClick={load} disabled={loading}>{loading ? "Loading..." : "Load"}</Button>
        </Stack>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <div>
          {series.length === 0 ? (
            <Typography color="text.secondary">No data</Typography>
          ) : (
            <ul>
              {series.map((p, i) => (
                <li key={i}>{p.term}: average {p.average.toFixed(2)}</li>
              ))}
            </ul>
          )}
        </div>
      </Paper>
    </Container>
  );
}
