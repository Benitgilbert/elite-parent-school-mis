"use client";

import * as React from "react";
import { Container, Typography, Paper, Stack, Button, TextField, Table, TableHead, TableRow, TableCell, TableBody, IconButton, Alert } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";

export default function AccountantSettingsPage() {
  const [authHeaders, setAuthHeaders] = React.useState<Record<string, string>>({});

  const [cats, setCats] = React.useState<Array<{ id: number; name: string }>>([]);
  const [methods, setMethods] = React.useState<Array<{ id: number; name: string }>>([]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    try { const t = localStorage.getItem("access_token"); if (t) setAuthHeaders({ Authorization: `Bearer ${t}` }); } catch {}
    refreshAll();
  }, []);

  async function refreshAll() {
    setError(null);
    try {
      const [rc, rm] = await Promise.all([
        fetch(`/api/accounting/settings/categories`, { credentials: "include", headers: authHeaders }),
        fetch(`/api/accounting/settings/methods`, { credentials: "include", headers: authHeaders }),
      ]);
      if (!rc.ok || !rm.ok) throw new Error("Failed to load settings");
      setCats(await rc.json());
      setMethods(await rm.json());
    } catch (e: any) { setError(e.message || "Failed to load settings"); }
  }

  async function addCategory(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") || "").trim();
    if (!name) return;
    const r = await fetch(`/api/accounting/settings/categories`, { method: "POST", credentials: "include", headers: { ...authHeaders, "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    if (!r.ok) { alert("Failed to add category (need Accountant role)"); return; }
    e.currentTarget.reset();
    refreshAll();
  }

  async function deleteCategory(id: number) {
    const r = await fetch(`/api/accounting/settings/categories/${id}`, { method: "DELETE", credentials: "include", headers: authHeaders });
    if (!r.ok) { alert("Failed to delete category (need Accountant role)"); return; }
    refreshAll();
  }

  async function addMethod(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") || "").trim();
    if (!name) return;
    const r = await fetch(`/api/accounting/settings/methods`, { method: "POST", credentials: "include", headers: { ...authHeaders, "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    if (!r.ok) { alert("Failed to add method (need Accountant role)"); return; }
    e.currentTarget.reset();
    refreshAll();
  }

  async function deleteMethod(id: number) {
    const r = await fetch(`/api/accounting/settings/methods/${id}`, { method: "DELETE", credentials: "include", headers: authHeaders });
    if (!r.ok) { alert("Failed to delete method (need Accountant role)"); return; }
    refreshAll();
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Accounting Settings</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Expense Categories</Typography>
        <form onSubmit={addCategory}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }}>
            <TextField name="name" size="small" label="New Category" required sx={{ maxWidth: 260 }} />
            <Button type="submit" variant="contained">Add</Button>
          </Stack>
        </form>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cats.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.name}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => deleteCategory(c.id)}><DeleteIcon fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
            {cats.length === 0 && (
              <TableRow><TableCell colSpan={2}><Typography color="text.secondary">No categories</Typography></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Payment Methods</Typography>
        <form onSubmit={addMethod}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }}>
            <TextField name="name" size="small" label="New Method" required sx={{ maxWidth: 260 }} />
            <Button type="submit" variant="contained">Add</Button>
          </Stack>
        </form>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {methods.map((m) => (
              <TableRow key={m.id}>
                <TableCell>{m.name}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => deleteMethod(m.id)}><DeleteIcon fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
            {methods.length === 0 && (
              <TableRow><TableCell colSpan={2}><Typography color="text.secondary">No methods</Typography></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
}
