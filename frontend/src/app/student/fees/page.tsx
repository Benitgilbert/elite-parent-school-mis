"use client";

import * as React from "react";
import { Container, Typography, Paper, Stack, Button, TextField, Table, TableHead, TableRow, TableCell, TableBody, Alert, Chip } from "@mui/material";

export default function StudentFeesPage() {
  const [authHeaders, setAuthHeaders] = React.useState<Record<string, string>>({});
  const [term, setTerm] = React.useState<string>("");
  const [invoices, setInvoices] = React.useState<Array<{ id: number; term: string; amount: number; balance: number; status: string; created_at: string; payments: Array<{ id: number; amount: number; date: string; method?: string | null; reference?: string | null }> }>>([]);
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
    setInvoices([]);
    setLoading(true);
    try {
      const url = new URL(`/api/fees/my`, location.origin);
      if (term) url.searchParams.set("term", term);
      const r = await fetch(url.toString(), { credentials: "include", headers: authHeaders });
      if (r.status === 403) throw new Error("Access denied");
      if (!r.ok) throw new Error(`Failed (${r.status})`);
      const data = await r.json();
      setInvoices(data.invoices || []);
    } catch (e: any) {
      setError(e.message || "Failed to load fees");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>School Fees</Typography>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }}>
          <TextField size="small" label="Term (optional)" value={term} onChange={(e) => setTerm(e.target.value)} sx={{ maxWidth: 200 }} />
          <Button variant="contained" onClick={load} disabled={loading}>{loading ? "Loading..." : "Filter"}</Button>
        </Stack>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {invoices.map((inv) => (
          <Paper key={inv.id} variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center" justifyContent="space-between">
              <Typography variant="subtitle1">Term {inv.term}</Typography>
              <Stack direction="row" spacing={1}>
                <Chip label={`Amount: ${inv.amount}`} size="small" />
                <Chip label={`Balance: ${inv.balance}`} size="small" color={inv.balance > 0 ? "warning" : "success"} />
                <Chip label={inv.status.toUpperCase()} size="small" color={inv.status === 'paid' ? 'success' : (inv.status === 'partial' ? 'warning' : 'default')} />
              </Stack>
            </Stack>
            <Table size="small" sx={{ mt: 1 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Method</TableCell>
                  <TableCell>Reference</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {inv.payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.date}</TableCell>
                    <TableCell align="right">{p.amount}</TableCell>
                    <TableCell>{p.method || ""}</TableCell>
                    <TableCell>{p.reference || ""}</TableCell>
                  </TableRow>
                ))}
                {inv.payments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4}><Typography color="text.secondary">No payments</Typography></TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        ))}
        {invoices.length === 0 && <Typography color="text.secondary">No invoices</Typography>}
      </Paper>
    </Container>
  );
}
