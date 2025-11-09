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
} from "@mui/material";

export default function TeacherAttendancePage() {
  const [classes, setClasses] = React.useState<any[]>([]);
  const [className, setClassName] = React.useState<string>("");
  const [dateStr, setDateStr] = React.useState<string>(() => new Date().toISOString().slice(0, 10));
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
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

  async function loadAttendance() {
    if (!dateStr) { setError("Pick a date"); return; }
    if (!className) { setItems([]); return; }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ date: dateStr, class_name: className });
      const r = await fetch(`/api/attendance?${params.toString()}`, { credentials: "include", headers: authHeaders });
      if (!r.ok) {
        const txt = await r.text().catch(() => "");
        throw new Error(`Failed to load attendance (${r.status}) ${txt || ""}`.trim());
      }
      const data = await r.json();
      setItems(data.items || []);
    } catch (e: any) {
      setError(e.message || "Failed to load attendance");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { loadClasses(); }, []);
  React.useEffect(() => { if (dateStr && className) loadAttendance(); }, [className, dateStr]);

  function setAll(status: "PRESENT" | "LATE" | "ABSENT" | null) {
    setItems((arr) => arr.map((it) => ({ ...it, status })));
  }

  async function save() {
    if (!dateStr) { setError("Pick a date"); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        date: dateStr,
        items: items
          .filter((it) => it.status && typeof it.student_id === "number")
          .map((it) => ({ student_id: it.student_id, status: String(it.status).toUpperCase(), remarks: it.remarks || null })),
      };
      const r = await fetch("/api/attendance/mark", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body?.detail || "Failed to save attendance");
      }
      await loadAttendance();
    } catch (e: any) {
      setError(e.message || "Failed to save attendance");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Teacher • Attendance</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="cls">Class</InputLabel>
            <Select labelId="cls" label="Class" value={className} onChange={(e) => setClassName(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              {classes.map((c: any) => (
                <MenuItem key={c.id} value={c.name}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField size="small" label="Date" type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} InputLabelProps={{ shrink: true }} />
          <Button variant="outlined" color="success" onClick={() => setAll("PRESENT")}>All Present</Button>
          <Button variant="outlined" color="error" onClick={() => setAll("ABSENT")}>All Absent</Button>
          <Button variant="contained" onClick={save} disabled={saving || loading}>{saving ? "Saving..." : "Save"}</Button>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        {!className && (
          <Typography variant="body2" sx={{ mb: 1 }}>Select a class to start roll call.</Typography>
        )}
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Admission No</TableCell>
              <TableCell>Student</TableCell>
              <TableCell>Class</TableCell>
              <TableCell>Mark</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((it, idx) => (
              <TableRow key={it.student_id} hover>
                <TableCell>{it.admission_no}</TableCell>
                <TableCell>{it.full_name}</TableCell>
                <TableCell>{it.class_name}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant={it.status === "PRESENT" ? "contained" : "outlined"}
                      color="success"
                      onClick={() => setItems((arr) => arr.map((x, i) => i === idx ? { ...x, status: "PRESENT" } : x))}
                    >
                      Present
                    </Button>
                    <Button
                      size="small"
                      variant={it.status === "ABSENT" ? "contained" : "outlined"}
                      color="error"
                      onClick={() => setItems((arr) => arr.map((x, i) => i === idx ? { ...x, status: "ABSENT" } : x))}
                    >
                      Absent
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>No students for selection</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
}
