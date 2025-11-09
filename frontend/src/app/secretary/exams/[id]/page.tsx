"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Container, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, TextField, Stack, Button, Alert } from "@mui/material";

type Assessment = {
  id: number;
  name: string;
  term?: string | null;
  class_name?: string | null;
  subject?: string | null;
  weight: number;
  date?: string | null;
};

type ResultRow = {
  student_id: number;
  admission_no: string;
  full_name: string;
  score: number | null;
};

export default function ResultsEntryPage() {
  const p = useParams();
  const id = React.useMemo(() => Number((p as any)?.id), [p]);
  const [assessment, setAssessment] = React.useState<Assessment | null>(null);
  const [rows, setRows] = React.useState<ResultRow[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const authHeaders = React.useMemo(() => {
    try {
      const t = localStorage.getItem("access_token");
      return t ? { Authorization: `Bearer ${t}` } : {};
    } catch {
      return {} as Record<string, string>;
    }
  }, []);

  async function load() {
    if (!id) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/exams/results?assessment_id=${id}`, { credentials: "include", headers: authHeaders });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAssessment(data.assessment as Assessment);
      setRows((data.items as ResultRow[]) || []);
    } catch (e: any) {
      setError(e.message || "Failed to load results");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); }, [id]);

  function setScore(student_id: number, value: string) {
    const v = value.trim() === "" ? null : Number(value);
    setRows((arr) => arr.map((r) => (r.student_id === student_id ? { ...r, score: (v as any) } : r)));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const items = rows.map((r) => ({ student_id: r.student_id, score: r.score == null ? 0 : Number(r.score) }));
      const res = await fetch(`/api/exams/results`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ assessment_id: id, items }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e: any) {
      setError(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "stretch", sm: "center" }} justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h5">Exams • Results Entry</Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Button variant="outlined" onClick={load} disabled={loading}>{loading ? "Refreshing..." : "Refresh"}</Button>
          <Button variant="contained" onClick={save} disabled={saving || rows.length === 0}>{saving ? "Saving..." : "Save Results"}</Button>
        </Stack>
      </Stack>
      {assessment && (
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {assessment.name} • Term: {assessment.term || "—"} • Class: {assessment.class_name || "—"} • Subject: {assessment.subject || "—"}
        </Typography>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Admission</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Score</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.student_id}>
                <TableCell>{r.admission_no}</TableCell>
                <TableCell>{r.full_name}</TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    type="number"
                    inputProps={{ step: "0.01" }}
                    value={r.score ?? ""}
                    onChange={(e) => setScore(r.student_id, e.target.value)}
                  />
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={3}><Typography color="text.secondary">No students</Typography></TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
}
