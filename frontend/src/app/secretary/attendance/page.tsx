"use client";

import * as React from "react";
import { Container, Typography, Stack, TextField, Button, Alert, Paper, Table, TableHead, TableRow, TableCell, TableBody, Select, MenuItem } from "@mui/material";

type Row = {
  student_id: number;
  admission_no: string;
  full_name: string;
  class_name?: string | null;
  status?: string | null;
  remarks?: string | null;
};

export default function AttendancePage() {
  const [date, setDate] = React.useState<string>(new Date().toISOString().slice(0, 10));
  const [className, setClassName] = React.useState<string>("");
  const [rows, setRows] = React.useState<Row[]>([]);
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
    setError(null);
    setLoading(true);
    try {
      const params = new URLSearchParams({ date });
      if (className) params.set("class_name", className);
      const res = await fetch(`/api/attendance?${params.toString()}`, { credentials: "include", headers: authHeaders });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRows(data.items || []);
    } catch (e: any) {
      setError(e.message || "Failed to load attendance");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); }, []);

  function setRowStatus(id: number, status: string) {
    setRows((arr) => arr.map((r) => (r.student_id === id ? { ...r, status } : r)));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const items = rows.map((r) => ({ student_id: r.student_id, status: (r.status || "").toUpperCase() || "PRESENT", remarks: r.remarks || null }));
      const res = await fetch(`/api/attendance/mark`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ date, items }),
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
      <Typography variant="h5" sx={{ mb: 2 }}>Attendance • Daily Roll Call</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "center" }} sx={{ mb: 2 }}>
        <TextField type="date" label="Date" value={date} onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField label="Class (optional)" value={className} onChange={(e) => setClassName(e.target.value)} />
        <Button variant="outlined" onClick={load} disabled={loading}>{loading ? "Loading..." : "Load"}</Button>
        <Button variant="contained" onClick={save} disabled={saving || rows.length === 0}>{saving ? "Saving..." : "Save Marks"}</Button>
      </Stack>
      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Admission</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Class</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.student_id}>
                <TableCell>{r.admission_no}</TableCell>
                <TableCell>{r.full_name}</TableCell>
                <TableCell>{r.class_name || ""}</TableCell>
                <TableCell>
                  <Select size="small" value={(r.status || "").toUpperCase() || "PRESENT"} onChange={(e) => setRowStatus(r.student_id, String(e.target.value))}>
                    <MenuItem value="PRESENT">Present</MenuItem>
                    <MenuItem value="LATE">Late</MenuItem>
                    <MenuItem value="ABSENT">Absent</MenuItem>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}><Typography color="text.secondary">No students found for selection</Typography></TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
}
