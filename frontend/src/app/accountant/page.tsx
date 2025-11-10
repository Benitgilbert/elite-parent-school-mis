"use client";

import * as React from "react";
import Link from "next/link";
import { Container, Typography, Paper, Stack, Button, TextField, Chip } from "@mui/material";

export default function AccountantOverviewPage() {
  const [authHeaders, setAuthHeaders] = React.useState<Record<string, string>>({});
  const [month, setMonth] = React.useState<string>("");
  const [summary, setSummary] = React.useState<{ fees_collected: number; expenses: number; payroll: number; net: number } | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    try { const t = localStorage.getItem("access_token"); if (t) setAuthHeaders({ Authorization: `Bearer ${t}` }); } catch {}
    load();
  }, []);

  async function load() {
    setError(null); setLoading(true);
    try {
      const url = new URL(`/api/accounting/summary`, location.origin);
      if (month) url.searchParams.set("month", month);
      const r = await fetch(url.toString(), { credentials: "include", headers: authHeaders });
      if (!r.ok) throw new Error(`Failed (${r.status})`);
      setSummary(await r.json());
    } catch (e: any) { setError(e.message || "Failed to load summary"); }
    finally { setLoading(false); }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Accountant • Overview</Typography>
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="center">
          <TextField size="small" label="Month (YYYY-MM, optional)" value={month} onChange={(e) => setMonth(e.target.value)} sx={{ maxWidth: 220 }} />
          <Button variant="outlined" onClick={load} disabled={loading}>{loading ? "Loading..." : "Refresh"}</Button>
          <Stack direction="row" spacing={1} sx={{ ml: { sm: 2 } }}>
            <Chip label={`Fees: ${summary?.fees_collected ?? 0}`} color="success" />
            <Chip label={`Expenses: ${summary?.expenses ?? 0}`} color="warning" />
            <Chip label={`Payroll: ${summary?.payroll ?? 0}`} color="info" />
            <Chip label={`Net: ${summary?.net ?? 0}`} color={(summary && summary.net >= 0) ? "success" : "error"} />
          </Stack>
        </Stack>
        {error && <Typography color="error" sx={{ mt: 1 }}>{error}</Typography>}
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Quick Links</Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Button component={Link as any} href="/accountant/fees" variant="contained">Fee Collection</Button>
          <Button component={Link as any} href="/accountant/expenses" variant="outlined">Expenses</Button>
          <Button component={Link as any} href="/accountant/payroll" variant="outlined">Payroll</Button>
          <Button component={Link as any} href="/accountant/reports" variant="outlined">Reports & Analytics</Button>
          <Button component={Link as any} href="/accountant/settings" variant="outlined">Settings</Button>
        </Stack>
      </Paper>
    </Container>
  );
}
