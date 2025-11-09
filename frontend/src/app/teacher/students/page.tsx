"use client";

import * as React from "react";
import { Container, Typography, Paper, Stack, TextField, Alert, Table, TableHead, TableRow, TableCell, TableBody, TablePagination, Button } from "@mui/material";

export default function TeacherStudentsPage() {
  const [items, setItems] = React.useState<any[]>([]);
  const [query, setQuery] = React.useState("");
  const [klass, setKlass] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  const authHeaders = React.useMemo(() => {
    try { const t = localStorage.getItem("access_token"); return t ? { Authorization: `Bearer ${t}` } : {}; } catch { return {} as Record<string, string>; }
  }, []);

  async function load() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/students/?skip=0&limit=200`, { credentials: "include", headers: authHeaders });
      if (!res.ok) throw new Error("Failed to load students");
      setItems(await res.json());
    } catch (e: any) {
      setError(e.message || "Failed to load students");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); }, []);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((s) =>
      (!klass || (s.class_name || "").toLowerCase() === klass.trim().toLowerCase()) &&
      (
        !q ||
        (s.admission_no || "").toLowerCase().includes(q) ||
        (s.first_name || "").toLowerCase().includes(q) ||
        (s.last_name || "").toLowerCase().includes(q)
      )
    );
  }, [items, query, klass]);

  const pageRows = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Teacher • My Students</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField size="small" label="Filter by Class" value={klass} onChange={(e) => { setKlass(e.target.value); setPage(0); }} />
          <TextField size="small" label="Search (name/admission)" value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }} />
          <Button variant="outlined" onClick={load} disabled={loading}>{loading ? "Refreshing..." : "Refresh"}</Button>
        </Stack>
      </Paper>
      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Admission</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Class</TableCell>
              <TableCell>Gender</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pageRows.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.id}</TableCell>
                <TableCell>{s.admission_no}</TableCell>
                <TableCell>{s.first_name} {s.last_name}</TableCell>
                <TableCell>{s.class_name || ""}</TableCell>
                <TableCell>{s.gender || ""}</TableCell>
              </TableRow>
            ))}
            {pageRows.length === 0 && (
              <TableRow><TableCell colSpan={5}>No students</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[5, 10, 25, 50]}
          sx={{ px: 2 }}
        />
      </Paper>
    </Container>
  );
}
