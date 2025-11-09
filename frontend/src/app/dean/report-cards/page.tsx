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
} from "@mui/material";

export default function DeanReportCardsPage() {
  const [terms, setTerms] = React.useState<any[]>([]);
  const [classes, setClasses] = React.useState<any[]>([]);
  const [termId, setTermId] = React.useState<number | "">("");
  const [className, setClassName] = React.useState<string>("");
  const [studentId, setStudentId] = React.useState<string>("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const authHeaders = React.useMemo(() => {
    try {
      const t = localStorage.getItem("access_token");
      return t ? { Authorization: `Bearer ${t}` } : {};
    } catch {
      return {} as Record<string, string>;
    }
  }, []);

  React.useEffect(() => {
    (async () => {
      setError(null);
      try {
        const [rt, rc] = await Promise.all([
          fetch("/api/settings/academics/terms", { credentials: "include", headers: authHeaders }),
          fetch("/api/settings/academics/classes", { credentials: "include", headers: authHeaders }),
        ]);
        if (!rt.ok || !rc.ok) throw new Error("Failed to load settings");
        const t = await rt.json();
        const c = await rc.json();
        setTerms(t);
        setClasses(c);
        // preselect first term/class if available
        if (t?.length && termId === "") setTermId(t[0].id);
        if (c?.length && !className) setClassName(c[0].name);
      } catch (e: any) {
        setError(e.message || "Failed to load settings");
      }
    })();
  }, [authHeaders]);

  async function download(url: string, filename: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, { credentials: "include", headers: authHeaders });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Download failed (${res.status}) ${body || ""}`);
      }
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e: any) {
      setError(e.message || "Download failed");
    } finally {
      setBusy(false);
    }
  }

  function onDownloadClass() {
    if (!termId || !className) { setError("Select term and class"); return; }
    const url = `/api/report-cards/class?term_id=${termId}&class_name=${encodeURIComponent(className)}`;
    const filename = `report-cards_${className}_term-${termId}.csv`;
    void download(url, filename);
  }

  function onDownloadStudent() {
    if (!termId || !studentId.trim()) { setError("Enter term and student ID"); return; }
    const sid = encodeURIComponent(studentId.trim());
    const url = `/api/report-cards/student?term_id=${termId}&student_id=${sid}`;
    const filename = `report-cards_student-${sid}_term-${termId}.csv`;
    void download(url, filename);
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Dean • Report Cards</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="term-label">Term</InputLabel>
            <Select labelId="term-label" label="Term" value={termId as any} onChange={(e) => setTermId(e.target.value as number)}>
              {terms.map((t) => (
                <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="class-label">Class</InputLabel>
            <Select labelId="class-label" label="Class" value={className} onChange={(e) => setClassName(e.target.value)}>
              {classes.map((c) => (
                <MenuItem key={c.id ?? c.name} value={c.name}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="contained" onClick={onDownloadClass} disabled={busy}>Download Class CSV</Button>
        </Stack>
      </Paper>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="term2-label">Term</InputLabel>
            <Select labelId="term2-label" label="Term" value={termId as any} onChange={(e) => setTermId(e.target.value as number)}>
              {terms.map((t) => (
                <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField size="small" label="Student ID" value={studentId} onChange={(e) => setStudentId(e.target.value)} />
          <Button variant="outlined" onClick={onDownloadStudent} disabled={busy}>Download Student CSV</Button>
        </Stack>
      </Paper>
    </Container>
  );
}
