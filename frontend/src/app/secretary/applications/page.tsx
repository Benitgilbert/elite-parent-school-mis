"use client";

import * as React from "react";
import { Box, Container, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, TextField, Button, Alert, Stack } from "@mui/material";

type AppItem = {
  id: number;
  first_name: string;
  last_name: string;
  date_of_birth?: string | null;
  gender?: string | null;
  class_name?: string | null;
  guardian_contact?: string | null;
  email?: string | null;
};

export default function SecretaryApplicationsPage() {
  const [apps, setApps] = React.useState<AppItem[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [admission, setAdmission] = React.useState<Record<number, string>>({});
  const [klass, setKlass] = React.useState<Record<number, string>>({});
  const [loading, setLoading] = React.useState(false);

  const authHeaders = React.useMemo(() => {
    try {
      const t = localStorage.getItem("access_token");
      return t ? { Authorization: `Bearer ${t}` } : {};
    } catch {
      return {} as Record<string, string>;
    }
  }, []);

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/secretary/applications/?status=pending", { credentials: "include", headers: authHeaders });
      if (!res.ok) throw new Error("Unauthorized or server error");
      setApps(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { load(); }, []);

  const approve = async (id: number) => {
    setError(null);
    const res = await fetch(`/api/secretary/applications/${id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      credentials: "include",
      body: JSON.stringify({ admission_no: admission[id], class_name: klass[id] || null }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.detail ?? `Approve failed (${res.status})`);
      return;
    }
    await load();
  };

  const reject = async (id: number) => {
    setError(null);
    const res = await fetch(`/api/secretary/applications/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      credentials: "include",
      body: JSON.stringify({ reason: "Not eligible" }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.detail ?? `Reject failed (${res.status})`);
      return;
    }
    await load();
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h5">Admissions • Pending Applications</Typography>
        <Button onClick={load} disabled={loading} variant="outlined">{loading ? "Refreshing..." : "Refresh"}</Button>
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>DOB</TableCell>
              <TableCell>Gender</TableCell>
              <TableCell>Requested Class</TableCell>
              <TableCell>Guardian</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Decision</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {apps.map((a) => (
              <TableRow key={a.id} hover>
                <TableCell>{a.id}</TableCell>
                <TableCell>{a.first_name} {a.last_name}</TableCell>
                <TableCell>{a.date_of_birth ?? ""}</TableCell>
                <TableCell>{a.gender ?? ""}</TableCell>
                <TableCell>{a.class_name ?? ""}</TableCell>
                <TableCell>{a.guardian_contact ?? ""}</TableCell>
                <TableCell>{a.email ?? ""}</TableCell>
                <TableCell>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="center">
                    <TextField size="small" label="Admission No" value={admission[a.id] ?? ""} onChange={(e) => setAdmission({ ...admission, [a.id]: e.target.value })} />
                    <TextField size="small" label="Class" value={klass[a.id] ?? ""} onChange={(e) => setKlass({ ...klass, [a.id]: e.target.value })} />
                    <Button size="small" variant="contained" onClick={() => approve(a.id)} disabled={!admission[a.id]}>Approve</Button>
                    <Button size="small" color="error" variant="outlined" onClick={() => reject(a.id)}>Reject</Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {apps.length === 0 && (
              <TableRow>
                <TableCell colSpan={8}>
                  <Typography color="text.secondary">No pending applications</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
}
