"use client";

import * as React from "react";
import { Container, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, TextField, Stack, Button, Alert, TablePagination } from "@mui/material";

type Student = {
  id: number;
  admission_no: string;
  first_name: string;
  last_name: string;
  class_name?: string | null;
  gender?: string | null;
  guardian_contact?: string | null;
};

export default function SecretaryStudentsPage() {
  const [items, setItems] = React.useState<Student[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

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
      const res = await fetch(`/api/students/?skip=0&limit=200`, { credentials: "include", headers: authHeaders });
      if (!res.ok) throw new Error("Unauthorized or server error");
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
    if (!q) return items;
    return items.filter((s) =>
      (s.admission_no || "").toLowerCase().includes(q) ||
      (s.first_name || "").toLowerCase().includes(q) ||
      (s.last_name || "").toLowerCase().includes(q) ||
      (s.class_name || "").toLowerCase().includes(q)
    );
  }, [items, query]);

  const pageRows = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h5">Students Records</Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="center">
          <TextField size="small" placeholder="Search by name, admission, class" value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }} />
          <Button variant="outlined" onClick={load} disabled={loading}>{loading ? "Refreshing..." : "Refresh"}</Button>
        </Stack>
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Admission No</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Class</TableCell>
              <TableCell>Gender</TableCell>
              <TableCell>Guardian</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pageRows.map((s) => (
              <TableRow key={s.id} hover>
                <TableCell>{s.id}</TableCell>
                <TableCell>{s.admission_no}</TableCell>
                <TableCell>{s.first_name} {s.last_name}</TableCell>
                <TableCell>{s.class_name ?? ""}</TableCell>
                <TableCell>{s.gender ?? ""}</TableCell>
                <TableCell>{s.guardian_contact ?? ""}</TableCell>
              </TableRow>
            ))}
            {pageRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography color="text.secondary">No students</Typography>
                </TableCell>
              </TableRow>
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
