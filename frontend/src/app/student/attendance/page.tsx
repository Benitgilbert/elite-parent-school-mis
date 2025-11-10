"use client";

import * as React from "react";
import { Container, Typography, Paper, Stack, Button, Table, TableHead, TableRow, TableCell, TableBody, Alert, Chip } from "@mui/material";

export default function StudentAttendancePage() {
  const [authHeaders, setAuthHeaders] = React.useState<Record<string, string>>({});
  const [items, setItems] = React.useState<Array<{ date: string; status: string; remarks?: string | null }>>([]);
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
    setLoading(true);
    try {
      const url = new URL(`/api/attendance/my`, location.origin);
      url.searchParams.set("limit", "30");
      const r = await fetch(url.toString(), { credentials: "include", headers: authHeaders });
      if (r.status === 403) throw new Error("Access denied");
      if (!r.ok) throw new Error(`Failed (${r.status})`);
      const data = await r.json();
      setItems(data.items || []);
    } catch (e: any) {
      setError(e.message || "Failed to load attendance");
    } finally {
      setLoading(false);
    }
  }

  const present = items.filter(i => i.status === 'PRESENT').length;
  const late = items.filter(i => i.status === 'LATE').length;
  const absent = items.filter(i => i.status === 'ABSENT').length;

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Attendance</Typography>
      <Paper variant="outlined" sx={{ p: 2 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }}>
          <Button size="small" variant="outlined" onClick={load} disabled={loading}>{loading ? "Loading..." : "Refresh"}</Button>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip label={`Present: ${present}`} size="small" color="success" />
            <Chip label={`Late: ${late}`} size="small" color="warning" />
            <Chip label={`Absent: ${absent}`} size="small" color="error" />
          </Stack>
        </Stack>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Remarks</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((r, i) => (
              <TableRow key={i}>
                <TableCell>{r.date}</TableCell>
                <TableCell>{r.status}</TableCell>
                <TableCell>{r.remarks || ""}</TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={3}><Typography color="text.secondary">No recent attendance</Typography></TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
}
