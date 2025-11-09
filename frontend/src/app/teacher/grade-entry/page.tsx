"use client";

import * as React from "react";
import { Container, Typography, Paper, Stack, FormControl, InputLabel, Select, MenuItem, Alert, TextField, Button, Table, TableHead, TableRow, TableCell, TableBody } from "@mui/material";

export default function TeacherGradeEntryPage() {
  const [assessments, setAssessments] = React.useState<any[]>([]);
  const [aid, setAid] = React.useState<number | "">("");
  const [items, setItems] = React.useState<any[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [className, setClassName] = React.useState<string>("");
  const [subject, setSubject] = React.useState<string>("");
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement | null>(null);
  const saveTimer = React.useRef<any>(null);

  const authHeaders = React.useMemo(() => {
    try { const t = localStorage.getItem("access_token"); return t ? { Authorization: `Bearer ${t}` } : {}; } catch { return {} as Record<string, string>; }
  }, []);

  async function loadAssessments() {
    setError(null);
    try {
      const url = new URL(`/api/exams/assessments`, location.origin);
      if (className) url.searchParams.set("class_name", className);
      if (subject) url.searchParams.set("subject", subject);
      const r = await fetch(url.toString(), { credentials: "include", headers: authHeaders });
      if (!r.ok) throw new Error("Failed to load assessments");
      setAssessments(await r.json());
    } catch (e: any) {
      setError(e.message || "Failed to load assessments");
    }
  }

  async function loadResults(assessment_id: number) {
    setError(null);
    try {
      const r = await fetch(`/api/exams/results?assessment_id=${assessment_id}`, { credentials: "include", headers: authHeaders });
      if (!r.ok) throw new Error("Failed to load results");
      const data = await r.json();
      setItems(data.items || []);
    } catch (e: any) {
      setError(e.message || "Failed to load results");
    }
  }

  React.useEffect(() => { loadAssessments(); }, [className, subject]);
  React.useEffect(() => { if (typeof aid === "number") loadResults(aid); }, [aid]);

  async function save() {
    if (typeof aid !== "number") { setError("Select an assessment"); return; }
    setError(null);
    setSaving(true);
    try {
      const payload = {
        assessment_id: aid,
        items: items
          .filter((it: any) => it.score !== null && it.score !== undefined && `${it.score}` !== "")
          .map((it: any) => ({ student_id: it.student_id, score: Number(it.score) })),
      };
      const r = await fetch(`/api/exams/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body?.detail ?? `Save failed (${r.status})`);
      }
      await loadResults(aid);
    } catch (e: any) {
      setError(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function scheduleAutosave() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { save(); }, 600);
  }

  function downloadTemplate() {
    const headers = ["admission_no", "score"];
    const rows = items.map((it) => `${it.admission_no},`);
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "marks-template.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || typeof aid !== "number") return;
    setUploading(true);
    setError(null);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length === 0) throw new Error("Empty file");
      const hdrs = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const iAdm = hdrs.indexOf("admission_no");
      const iScore = hdrs.indexOf("score");
      if (iAdm === -1 || iScore === -1) throw new Error("CSV must have 'admission_no,score' headers");
      const byAdm: Record<string, any> = {};
      for (const it of items) byAdm[String(it.admission_no).trim()] = it;
      const updates: { student_id: number; score: number }[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",");
        if (cols.length < Math.max(iAdm, iScore) + 1) continue;
        const adm = String(cols[iAdm]).trim();
        const sc = cols[iScore].trim();
        if (!adm || sc === "") continue;
        const row = byAdm[adm];
        if (!row) continue;
        const num = Number(sc);
        if (Number.isNaN(num)) continue;
        updates.push({ student_id: row.student_id, score: num });
      }
      if (updates.length === 0) throw new Error("No matching rows to update");
      const r = await fetch(`/api/exams/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        credentials: "include",
        body: JSON.stringify({ assessment_id: aid, items: updates }),
      });
      if (!r.ok) throw new Error("Upload failed");
      await loadResults(aid);
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Teacher • Grade Entry</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "center" }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="cls">Class</InputLabel>
            <Select labelId="cls" label="Class" value={className} onChange={(e) => { setClassName(e.target.value); setAid(""); setItems([]); }}>
              <MenuItem value="">All</MenuItem>
              {[...new Set(assessments.map(a => a.class_name).filter(Boolean))].map((c) => (
                <MenuItem key={c} value={c}>{c}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="subj">Subject</InputLabel>
            <Select labelId="subj" label="Subject" value={subject} onChange={(e) => { setSubject(e.target.value); setAid(""); setItems([]); }}>
              <MenuItem value="">All</MenuItem>
              {[...new Set(assessments.map(a => a.subject).filter(Boolean))].map((s) => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 260, flexGrow: 1 }}>
            <InputLabel id="assess">Assessment</InputLabel>
            <Select labelId="assess" label="Assessment" value={aid as any} onChange={(e) => setAid(e.target.value as number)}>
              {assessments
                .filter(a => (!className || a.class_name === className) && (!subject || a.subject === subject))
                .map(a => (
                  <MenuItem key={a.id} value={a.id}>{a.name} • {a.class_name} • {a.subject}</MenuItem>
                ))}
            </Select>
          </FormControl>
          <Button onClick={downloadTemplate} disabled={items.length === 0}>Download CSV template</Button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={handleFile} />
          <Button variant="outlined" onClick={() => fileRef.current?.click()} disabled={uploading || typeof aid !== "number"}>{uploading ? "Uploading..." : "Upload CSV"}</Button>
        </Stack>
      </Paper>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "center" }} sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>Scores</Typography>
          <Button variant="contained" onClick={save} disabled={saving || typeof aid !== "number"}>{saving ? "Saving..." : "Save All"}</Button>
        </Stack>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Admission No</TableCell>
              <TableCell>Student</TableCell>
              <TableCell align="right" sx={{ width: 160 }}>Score</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((it: any, idx: number) => (
              <TableRow key={it.student_id} hover>
                <TableCell>{it.admission_no}</TableCell>
                <TableCell>{it.full_name}</TableCell>
                <TableCell align="right">
                  <TextField
                    size="small"
                    type="number"
                    inputProps={{ step: "0.1" }}
                    value={it.score ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setItems((arr) => arr.map((x, i) => i === idx ? { ...x, score: v === "" ? "" : Number(v) } : x));
                      scheduleAutosave();
                    }}
                    sx={{ width: 140 }}
                  />
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={3}>No results</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
}
