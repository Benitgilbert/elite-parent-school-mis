"use client";

import * as React from "react";
import { Container, Typography, Paper, Stack, TextField, Button, Alert, Table, TableHead, TableRow, TableCell, TableBody } from "@mui/material";

export default function DirectorTeachersPage() {
  const [authHeaders, setAuthHeaders] = React.useState<Record<string, string>>({});
  const [items, setItems] = React.useState<any[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [q, setQ] = React.useState("");

  React.useEffect(() => { try { const t = localStorage.getItem("access_token"); if (t) setAuthHeaders({ Authorization: `Bearer ${t}` }); } catch {}; load(); }, []);

  async function load() {
    setError(null); setLoading(true);
    try {
      const url = new URL(`/api/teachers/`, location.origin);
      if (q) url.searchParams.set("q", q);
      const r = await fetch(url.toString(), { credentials: "include", headers: authHeaders });
      if (!r.ok) throw new Error("Failed to load teachers");
      setItems(await r.json());
    } catch (e: any) { setError(e.message || "Failed to load"); }
    finally { setLoading(false); }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Teachers</Typography>
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <TextField size="small" placeholder="Search name/email" value={q} onChange={(e) => setQ(e.target.value)} sx={{ maxWidth: 260 }} />
          <Button variant="outlined" onClick={load} disabled={loading}>{loading ? "Loading..." : "Refresh"}</Button>
        </Stack>
        {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
      </Paper>
      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((t: any) => (
              <TableRow key={t.id}>
                <TableCell>{t.full_name}</TableCell>
                <TableCell>{t.email || ""}</TableCell>
                <TableCell>{t.phone || ""}</TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow><TableCell colSpan={3}><Typography color="text.secondary">No teachers</Typography></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
}
