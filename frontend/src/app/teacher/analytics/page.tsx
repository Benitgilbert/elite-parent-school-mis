"use client";

import * as React from "react";
import {
  Container,
  Typography,
  Paper,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Alert,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Grid,
  Card,
  CardContent,
} from "@mui/material";

export default function TeacherAnalyticsPage() {
  const [classes, setClasses] = React.useState<any[]>([]);
  const [className, setClassName] = React.useState<string>("");
  const [term, setTerm] = React.useState<string>("");
  const [report, setReport] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const authHeaders = React.useMemo(() => {
    try { const t = localStorage.getItem("access_token"); return t ? { Authorization: `Bearer ${t}` } : {}; } catch { return {} as Record<string, string>; }
  }, []);

  async function loadClasses() {
    setError(null);
    try {
      const r = await fetch("/api/settings/academics/classes", { credentials: "include", headers: authHeaders });
      if (!r.ok) throw new Error("Failed to load classes");
      setClasses(await r.json());
    } catch (e: any) {
      setError(e.message || "Failed to load classes");
    }
  }

  React.useEffect(() => { loadClasses(); }, []);

  async function loadReport() {
    setLoading(true);
    setError(null);
    try {
      const url = new URL(`/api/analytics/class-report`, location.origin);
      if (term) url.searchParams.set("term", term);
      if (className) url.searchParams.set("class_name", className);
      const r = await fetch(url.toString(), { credentials: "include", headers: authHeaders });
      if (!r.ok) throw new Error(`Failed to load analytics (${r.status})`);
      setReport(await r.json());
    } catch (e: any) {
      setError(e.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }

  function exportCSV() {
    const url = new URL(`/api/analytics/class-report/export`, location.origin);
    if (term) url.searchParams.set("term", term);
    if (className) url.searchParams.set("class_name", className);
    window.open(url.toString(), "_blank");
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Teacher • Class Analytics</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="cls">Class</InputLabel>
            <Select labelId="cls" label="Class" value={className} onChange={(e) => setClassName(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              {classes.map((c: any) => (
                <MenuItem key={c.id} value={c.name}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField size="small" label="Term (optional)" value={term} onChange={(e) => setTerm(e.target.value)} sx={{ minWidth: 200 }} />
          <Button variant="contained" onClick={loadReport} disabled={loading}>{loading ? "Loading..." : "View Analytics"}</Button>
          <Button variant="outlined" onClick={exportCSV} disabled={!report}>Export CSV</Button>
        </Stack>
      </Paper>

      {report && (
        <>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="body2">Overall Average</Typography>
                  <Typography variant="h5">{report.overall_average}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="body2">Overall Pass Rate</Typography>
                  <Typography variant="h5">{report.overall_pass_rate}%</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="body2">Approx Class Size</Typography>
                  <Typography variant="h6">{report.approx_class_size ?? "-"}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Subject Breakdown</Typography>
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
                {(report.subjects || []).map((s: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell>{s.subject}</TableCell>
                    <TableCell align="right">{s.average}</TableCell>
                    <TableCell align="right">{s.pass_rate}%</TableCell>
                    <TableCell align="right">{s.count}</TableCell>
                  </TableRow>
                ))}
                {(!report.subjects || report.subjects.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4}>No subject data</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        </>
      )}
    </Container>
  );
}
