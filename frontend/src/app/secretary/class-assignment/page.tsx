"use client";

import * as React from "react";
import { Container, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, TextField, Stack, Button, Alert, Checkbox, TablePagination } from "@mui/material";

type Student = {
  id: number;
  admission_no: string;
  first_name: string;
  last_name: string;
  class_name?: string | null;
  gender?: string | null;
};

export default function ClassAssignmentPage() {
  const [items, setItems] = React.useState<Student[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [selection, setSelection] = React.useState<Record<number, boolean>>({});
  const [targetClass, setTargetClass] = React.useState("");
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

  const toggle = (id: number) => setSelection((s) => ({ ...s, [id]: !s[id] }));
  const allOnPageSelected = pageRows.length > 0 && pageRows.every((r) => selection[r.id]);
  const toggleAllOnPage = () => {
    const next = { ...selection };
    if (allOnPageSelected) {
      pageRows.forEach((r) => { next[r.id] = false; });
    } else {
      pageRows.forEach((r) => { next[r.id] = true; });
    }
    setSelection(next);
  };

  async function applyAssignment() {
    setError(null);
    if (!targetClass.trim()) { setError("Enter a target class"); return; }
    const ids = Object.keys(selection).filter((k) => selection[Number(k)]).map(Number);
    if (ids.length === 0) { setError("Select at least one student"); return; }
    for (const id of ids) {
      const res = await fetch(`/api/students/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders },
        credentials: "include",
        body: JSON.stringify({ class_name: targetClass.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.detail ?? `Failed to assign class for ${id}`);
        break;
      }
    }
    setSelection({});
    await load();
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "center" }} justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h5">Class Assignment</Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="center">
          <TextField size="small" placeholder="Search (name/admission/class)" value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }} />
          <TextField size="small" label="Target Class" value={targetClass} onChange={(e) => setTargetClass(e.target.value)} />
          <Button variant="contained" onClick={applyAssignment} disabled={loading}>Assign Selected</Button>
          <Button variant="outlined" onClick={load} disabled={loading}>{loading ? "Refreshing..." : "Refresh"}</Button>
        </Stack>
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox"><Checkbox checked={allOnPageSelected} indeterminate={!allOnPageSelected && pageRows.some(r => selection[r.id])} onChange={toggleAllOnPage} /></TableCell>
              <TableCell>ID</TableCell>
              <TableCell>Admission No</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Class</TableCell>
              <TableCell>Gender</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pageRows.map((s) => (
              <TableRow key={s.id} hover>
                <TableCell padding="checkbox"><Checkbox checked={!!selection[s.id]} onChange={() => toggle(s.id)} /></TableCell>
                <TableCell>{s.id}</TableCell>
                <TableCell>{s.admission_no}</TableCell>
                <TableCell>{s.first_name} {s.last_name}</TableCell>
                <TableCell>{s.class_name ?? ""}</TableCell>
                <TableCell>{s.gender ?? ""}</TableCell>
              </TableRow>
            ))}
            {pageRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}><Typography color="text.secondary">No students</Typography></TableCell>
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
