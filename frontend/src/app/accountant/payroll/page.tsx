"use client";

import * as React from "react";
import { Container, Typography, Paper, Stack, Button, TextField, Table, TableHead, TableRow, TableCell, TableBody, Alert } from "@mui/material";

export default function AccountantPayrollPage() {
  const [authHeaders, setAuthHeaders] = React.useState<Record<string, string>>({});
  const [month, setMonth] = React.useState<string>("");
  const [items, setItems] = React.useState<any[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => { try { const t = localStorage.getItem("access_token"); if (t) setAuthHeaders({ Authorization: `Bearer ${t}` }); } catch {}; load(); }, []);

  async function load() {
    setError(null); setLoading(true);
    try {
      const url = new URL(`/api/accounting/payroll`, location.origin);
      if (month) url.searchParams.set("month", month);
      const r = await fetch(url.toString(), { credentials: "include", headers: authHeaders });
      if (!r.ok) throw new Error(`Failed (${r.status})`);
      setItems(await r.json());
    } catch (e: any) { setError(e.message || "Failed to load"); }
    finally { setLoading(false); }
  }

  async function createPayroll(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      staff_name: String(fd.get("staff_name")),
      month: String(fd.get("pay_month")),
      gross: Number(fd.get("gross")),
      deductions: Number(fd.get("deductions")) || 0,
      reference: String(fd.get("reference")) || undefined,
    };
    const r = await fetch(`/api/accounting/payroll`, { method: "POST", credentials: "include", headers: { ...authHeaders, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!r.ok) { alert("Failed to create payroll"); return; }
    await load();
    e.currentTarget.reset();
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Payroll</Typography>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <form onSubmit={createPayroll}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Create Payroll</Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField size="small" name="staff_name" label="Staff Name" required sx={{ minWidth: 220 }} />
            <TextField size="small" name="pay_month" label="Month (YYYY-MM)" required sx={{ maxWidth: 160 }} />
            <TextField size="small" name="gross" label="Gross" required type="number" sx={{ maxWidth: 160 }} />
            <TextField size="small" name="deductions" label="Deductions" type="number" sx={{ maxWidth: 160 }} />
            <TextField size="small" name="reference" label="Reference" sx={{ maxWidth: 200 }} />
            <Button type="submit" variant="contained">Save</Button>
          </Stack>
        </form>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Browse</Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }}>
          <TextField size="small" label="Month (YYYY-MM)" value={month} onChange={(e) => setMonth(e.target.value)} sx={{ maxWidth: 160 }} />
          <Button variant="outlined" onClick={load} disabled={loading}>{loading ? "Loading..." : "Refresh"}</Button>
        </Stack>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Staff</TableCell>
              <TableCell>Month</TableCell>
              <TableCell align="right">Gross</TableCell>
              <TableCell align="right">Deductions</TableCell>
              <TableCell align="right">Net</TableCell>
              <TableCell>Paid Date</TableCell>
              <TableCell>Reference</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((r, i) => (
              <TableRow key={i}>
                <TableCell>{r.staff_name}</TableCell>
                <TableCell>{r.month}</TableCell>
                <TableCell align="right">{r.gross}</TableCell>
                <TableCell align="right">{r.deductions}</TableCell>
                <TableCell align="right">{r.net}</TableCell>
                <TableCell>{r.paid_date || ""}</TableCell>
                <TableCell>{r.reference || ""}</TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow><TableCell colSpan={7}><Typography color="text.secondary">No payroll records</Typography></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
}
