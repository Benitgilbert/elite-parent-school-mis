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
  Button,
  Alert,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField,
} from "@mui/material";

export default function TeacherReportCardsPage() {
  const [students, setStudents] = React.useState<any[]>([]);
  const [className, setClassName] = React.useState<string>("");
  const [studentId, setStudentId] = React.useState<number | "">("");
  const [term, setTerm] = React.useState<string>("");
  const [rows, setRows] = React.useState<Array<{ assessment_id: string; subject: string; score: string }>>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const authHeaders = React.useMemo(() => {
    try { const t = localStorage.getItem("access_token"); return t ? { Authorization: `Bearer ${t}` } : {}; } catch { return {} as Record<string, string>; }
  }, []);

  async function loadStudents() {
    setError(null);
    try {
      const all: any[] = [];
      let skip = 0;
      while (skip < 1000) {
        const r = await fetch(`/api/students/?skip=${skip}&limit=200`, { credentials: "include", headers: authHeaders });
        if (!r.ok) throw new Error("Failed to load students");
        const page = await r.json();
        all.push(...page);
        if (page.length < 200) break;
        skip += 200;
      }
      setStudents(all);
    } catch (e: any) {
      setError(e.message || "Failed to load students");
    }
  }

  React.useEffect(() => { loadStudents(); }, []);

  const classOptions = React.useMemo(() => {
    const set = new Set<string>();
    for (const s of students) if (s.class_name) set.add(s.class_name);
    return Array.from(set).sort();
  }, [students]);

  async function loadReport() {
    if (typeof studentId !== "number") { setError("Select a student"); return; }
    setLoading(true);
    setError(null);
    try {
      const url = new URL(`/api/report-cards/student`, location.origin);
      url.searchParams.set("student_id", String(studentId));
      if (term) url.searchParams.set("term", term);
      const r = await fetch(url.toString(), { credentials: "include", headers: authHeaders });
      if (!r.ok) throw new Error("Failed to load report");
      const csv = await r.text();
      // Parse simple CSV: header: assessment_id,subject,score
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

  function downloadCSV() {
    if (typeof studentId !== "number") return;
    const url = new URL(`/api/report-cards/student`, location.origin);
    url.searchParams.set("student_id", String(studentId));
    if (term) url.searchParams.set("term", term);
    window.open(url.toString(), "_blank");
  }

  const filteredStudents = React.useMemo(() => {
    return students.filter((s) => !className || s.class_name === className);
  }, [students, className]);

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Teacher • Report Cards</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="cls">Class</InputLabel>
            <Select labelId="cls" label="Class" value={className} onChange={(e) => { setClassName(e.target.value); setStudentId(""); setRows([]); }}>
              <MenuItem value="">All</MenuItem>
              {classOptions.map((c) => (
                <MenuItem key={c} value={c}>{c}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 260 }}>
            <InputLabel id="student">Student</InputLabel>
            <Select labelId="student" label="Student" value={studentId as any} onChange={(e) => setStudentId(e.target.value as number)}>
              {filteredStudents.map((s) => (
                <MenuItem key={s.id} value={s.id}>{s.admission_no} • {s.first_name} {s.last_name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField size="small" label="Term (optional)" value={term} onChange={(e) => setTerm(e.target.value)} sx={{ minWidth: 180 }} />
          <Button variant="contained" onClick={loadReport} disabled={loading || typeof studentId !== "number"}>{loading ? "Loading..." : "View Report"}</Button>
          <Button variant="outlined" onClick={downloadCSV} disabled={typeof studentId !== "number"}>Download CSV</Button>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>Report</Typography>
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
                <TableCell colSpan={3}>No data</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
}
