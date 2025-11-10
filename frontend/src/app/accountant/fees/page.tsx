"use client";

import * as React from "react";
import { Container, Typography, Paper, Stack, Button, TextField, Table, TableHead, TableRow, TableCell, TableBody, Alert } from "@mui/material";

export default function AccountantFeesPage() {
  const [authHeaders, setAuthHeaders] = React.useState<Record<string, string>>({});
  const [term, setTerm] = React.useState<string>("");
  const [studentId, setStudentId] = React.useState<string>("");
  const [invoices, setInvoices] = React.useState<any[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => { try { const t = localStorage.getItem("access_token"); if (t) setAuthHeaders({ Authorization: `Bearer ${t}` }); } catch {}; load(); }, []);

  async function load() {
    setError(null); setLoading(true);
    try {
      const url = new URL(`/api/accounting/fees/invoices`, location.origin);
      if (term) url.searchParams.set("term", term);
      if (studentId) url.searchParams.set("student_id", studentId);
      const r = await fetch(url.toString(), { credentials: "include", headers: authHeaders });
      if (!r.ok) throw new Error(`Failed (${r.status})`);
      const data = await r.json();
      setInvoices(data.invoices || []);
    } catch (e: any) { setError(e.message || "Failed to load"); }
    finally { setLoading(false); }
  }

  async function createInvoice(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      student_id: Number(fd.get("student_id")),
      term: String(fd.get("inv_term")),
      amount: Number(fd.get("amount")),
    };
    const r = await fetch(`/api/accounting/fees/invoices`, { method: "POST", credentials: "include", headers: { ...authHeaders, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!r.ok) { alert("Failed to create invoice"); return; }
    await load();
    e.currentTarget.reset();
  }

  async function createPayment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      invoice_id: Number(fd.get("invoice_id")),
      amount: Number(fd.get("pay_amount")),
      method: String(fd.get("method")) || undefined,
      reference: String(fd.get("reference")) || undefined,
    };
    const r = await fetch(`/api/accounting/fees/payments`, { method: "POST", credentials: "include", headers: { ...authHeaders, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!r.ok) { alert("Failed to add payment"); return; }
    await load();
    e.currentTarget.reset();
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Fee Collection</Typography>
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <TextField size="small" label="Term" value={term} onChange={(e) => setTerm(e.target.value)} sx={{ maxWidth: 180 }} />
          <TextField size="small" label="Student ID" value={studentId} onChange={(e) => setStudentId(e.target.value)} sx={{ maxWidth: 160 }} />
          <Button variant="outlined" onClick={load} disabled={loading}>{loading ? "Loading..." : "Refresh"}</Button>
        </Stack>
        {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Create Invoice</Typography>
        <form onSubmit={createInvoice}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField size="small" name="student_id" label="Student ID" required sx={{ maxWidth: 160 }} />
            <TextField size="small" name="inv_term" label="Term" required sx={{ maxWidth: 160 }} />
            <TextField size="small" name="amount" label="Amount" required type="number" sx={{ maxWidth: 160 }} />
            <Button type="submit" variant="contained">Create</Button>
          </Stack>
        </form>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Add Payment</Typography>
        <form onSubmit={createPayment}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField size="small" name="invoice_id" label="Invoice ID" required sx={{ maxWidth: 160 }} />
            <TextField size="small" name="pay_amount" label="Amount" required type="number" sx={{ maxWidth: 160 }} />
            <TextField size="small" name="method" label="Method" sx={{ maxWidth: 160 }} />
            <TextField size="small" name="reference" label="Reference" sx={{ maxWidth: 200 }} />
            <Button type="submit" variant="contained">Record</Button>
          </Stack>
        </form>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Invoices</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Student</TableCell>
              <TableCell>Term</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell align="right">Balance</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Payments</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invoices.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell>{inv.id}</TableCell>
                <TableCell>{inv.student_id}</TableCell>
                <TableCell>{inv.term}</TableCell>
                <TableCell align="right">{inv.amount}</TableCell>
                <TableCell align="right">{inv.balance}</TableCell>
                <TableCell>{inv.status}</TableCell>
                <TableCell>{(inv.payments || []).map((p: any) => `${p.amount} (${p.date})`).join("; ")}</TableCell>
              </TableRow>
            ))}
            {invoices.length === 0 && (
              <TableRow><TableCell colSpan={7}><Typography color="text.secondary">No invoices</Typography></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
}
