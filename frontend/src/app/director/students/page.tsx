"use client";

import * as React from "react";
import { Container, Typography, Paper, Stack, TextField, Button, Alert, Table, TableHead, TableRow, TableCell, TableBody, TablePagination } from "@mui/material";

export default function DirectorStudentsPage() {
  const [authHeaders, setAuthHeaders] = React.useState<Record<string, string>>({});
  const [items, setItems] = React.useState<any[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  React.useEffect(() => {
    try { const t = localStorage.getItem("access_token"); if (t) setAuthHeaders({ Authorization: `Bearer ${t}` }); } catch {}
    load();
  }, []);

  async function load() {
    setError(null); setLoading(true);
    try {
      const res = await fetch(`/api/students/?skip=0&limit=200`, { credentials: "include", headers: authHeaders });
      if (!res.ok) throw new Error("Unauthorized or server error");
      setItems(await res.json());
    } catch (e: any) { setError(e.message || "Failed to load students"); }
    finally { setLoading(false); }
  }

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((s: any) =>
      (s.admission_no || "").toLowerCase().includes(q) ||
      (s.first_name || "").toLowerCase().includes(q) ||
      (s.last_name || "").toLowerCase().includes(q) ||
      (s.class_name || "").toLowerCase().includes(q)
    );
  }, [items, query]);

  const pageRows = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Students</Typography>
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <TextField size="small" placeholder="Search by name, admission, class" value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }} />
          <Button variant="outlined" onClick={load} disabled={loading}>{loading ? "Refreshing..." : "Refresh"}</Button>
        </Stack>
        {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
      </Paper>
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
            {pageRows.map((s: any) => (
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
                <TableCell colSpan={6}><Typography color="text.secondary">No students</Typography></TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination component="div" count={filtered.length} page={page} onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage} onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }} rowsPerPageOptions={[5, 10, 25, 50]} sx={{ px: 2 }} />
      </Paper>
    </Container>
  );
}
