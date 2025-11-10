"use client";

import * as React from "react";
import { Container, Typography, Paper, Stack, Button, TextField, Table, TableHead, TableRow, TableCell, TableBody, Alert } from "@mui/material";

export default function AccountantExpensesPage() {
  const [authHeaders, setAuthHeaders] = React.useState<Record<string, string>>({});
  const [category, setCategory] = React.useState<string>("");
  const [fromDate, setFromDate] = React.useState<string>("");
  const [toDate, setToDate] = React.useState<string>("");
  const [items, setItems] = React.useState<any[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => { try { const t = localStorage.getItem("access_token"); if (t) setAuthHeaders({ Authorization: `Bearer ${t}` }); } catch {}; load(); }, []);

  async function load() {
    setError(null); setLoading(true);
    try {
      const url = new URL(`/api/accounting/expenses`, location.origin);
      if (category) url.searchParams.set("category", category);
      if (fromDate) url.searchParams.set("from_date", fromDate);
      if (toDate) url.searchParams.set("to_date", toDate);
      const r = await fetch(url.toString(), { credentials: "include", headers: authHeaders });
      if (!r.ok) throw new Error(`Failed (${r.status})`);
      setItems(await r.json());
    } catch (e: any) { setError(e.message || "Failed to load"); }
    finally { setLoading(false); }
  }

  async function createExpense(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      date: String(fd.get("date")),
      amount: Number(fd.get("amount")),
      category: String(fd.get("category")),
      description: String(fd.get("description")) || undefined,
      payee: String(fd.get("payee")) || undefined,
    };
    const r = await fetch(`/api/accounting/expenses`, { method: "POST", credentials: "include", headers: { ...authHeaders, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!r.ok) { alert("Failed to add expense"); return; }
    await load();
    e.currentTarget.reset();
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Expenses</Typography>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <form onSubmit={createExpense}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Record Expense</Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField size="small" name="date" label="Date" type="date" InputLabelProps={{ shrink: true }} required sx={{ maxWidth: 180 }} />
            <TextField size="small" name="amount" label="Amount" type="number" required sx={{ maxWidth: 160 }} />
            <TextField size="small" name="category" label="Category" required sx={{ maxWidth: 200 }} />
            <TextField size="small" name="payee" label="Payee" sx={{ maxWidth: 220 }} />
            <TextField size="small" name="description" label="Description" sx={{ minWidth: 260 }} />
            <Button type="submit" variant="contained">Save</Button>
          </Stack>
        </form>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Browse</Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }}>
          <TextField size="small" label="Category" value={category} onChange={(e) => setCategory(e.target.value)} sx={{ maxWidth: 200 }} />
          <TextField size="small" label="From" type="date" InputLabelProps={{ shrink: true }} value={fromDate} onChange={(e) => setFromDate(e.target.value)} sx={{ maxWidth: 180 }} />
          <TextField size="small" label="To" type="date" InputLabelProps={{ shrink: true }} value={toDate} onChange={(e) => setToDate(e.target.value)} sx={{ maxWidth: 180 }} />
          <Button variant="outlined" onClick={load} disabled={loading}>{loading ? "Loading..." : "Refresh"}</Button>
        </Stack>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Payee</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((r, i) => (
              <TableRow key={i}>
                <TableCell>{r.date}</TableCell>
                <TableCell align="right">{r.amount}</TableCell>
                <TableCell>{r.category}</TableCell>
                <TableCell>{r.description || ""}</TableCell>
                <TableCell>{r.payee || ""}</TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow><TableCell colSpan={5}><Typography color="text.secondary">No expenses</Typography></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
}
