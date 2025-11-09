"use client";

import * as React from "react";
import { Container, Typography, Stack, Card, CardContent, Button, TextField, FormControlLabel, Switch, Alert, Chip, Box, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Paper } from "@mui/material";

type RoleAudit = {
  roles: { name: string; count: number }[];
  users_without_roles: number;
  admins: { id: number; email: string; full_name: string | null }[];
};

type Policy = { min_length: number; require_special: boolean };

export default function SecurityCenterPage() {
  const [audit, setAudit] = React.useState<RoleAudit | null>(null);
  const [policy, setPolicy] = React.useState<Policy>({ min_length: 8, require_special: false });
  const [loadingAudit, setLoadingAudit] = React.useState(false);
  const [loadingPolicy, setLoadingPolicy] = React.useState(false);
  const [savingPolicy, setSavingPolicy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  async function fetchAudit() {
    setLoadingAudit(true);
    setError(null);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
      const res = await fetch("/api/admin/security/role-audit", { credentials: "include", headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAudit(data as RoleAudit);
    } catch (e: any) {
      setError(e.message || "Failed to load role audit");
    } finally {
      setLoadingAudit(false);
    }
  }

  async function fetchPolicy() {
    setLoadingPolicy(true);
    setError(null);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
      const res = await fetch("/api/admin/security/policy", { credentials: "include", headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPolicy(data as Policy);
    } catch (e: any) {
      setError(e.message || "Failed to load policy");
    } finally {
      setLoadingPolicy(false);
    }
  }

  async function savePolicy() {
    setSavingPolicy(true);
    setError(null);
    setSuccess(null);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
      const res = await fetch("/api/admin/security/policy", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(policy),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPolicy(data as Policy);
      setSuccess("Policy saved");
    } catch (e: any) {
      setError(e.message || "Failed to save policy");
    } finally {
      setSavingPolicy(false);
    }
  }

  async function revokeAll() {
    setError(null);
    setSuccess(null);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
      const res = await fetch("/api/admin/security/revoke-all", { method: "POST", credentials: "include", headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (res.status === 501) {
        setSuccess("Revoke-all not implemented for stateless JWT. Consider key rotation or token blacklist.");
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSuccess("Sessions revoked");
    } catch (e: any) {
      setError(e.message || "Failed to revoke sessions");
    }
  }

  React.useEffect(() => {
    fetchAudit();
    fetchPolicy();
  }, []);

  return (
    <Container maxWidth="lg" sx={{ py: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Security Center</Typography>
      <Stack spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success" onClose={() => setSuccess(null)}>{success}</Alert>}
        <Card>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography variant="h6">Role Audit</Typography>
              <Button size="small" variant="outlined" onClick={fetchAudit} disabled={loadingAudit}>{loadingAudit ? "Refreshing..." : "Refresh"}</Button>
            </Box>
            {audit ? (
              <>
                <Box sx={{ mt: 1, display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {audit.roles.map((r) => (
                    <Chip key={r.name} label={`${r.name}: ${r.count}`} />
                  ))}
                  <Chip color="warning" label={`Users without roles: ${audit.users_without_roles}`} />
                </Box>
                <Typography variant="subtitle2" sx={{ mt: 2 }}>IT Support Admins</Typography>
                <TableContainer component={Paper} sx={{ mt: 1 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Full name</TableCell>
                        <TableCell>Email</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {audit.admins.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell>{a.full_name || "—"}</TableCell>
                          <TableCell>{a.email}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            ) : (
              <Typography color="text.secondary" sx={{ mt: 1 }}>Loading...</Typography>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6">Password Policy</Typography>
            <TextField
              label="Minimum length"
              type="number"
              size="small"
              sx={{ mt: 1, maxWidth: 220 }}
              value={policy.min_length}
              onChange={(e) => setPolicy({ ...policy, min_length: Number(e.target.value) })}
            />
            <FormControlLabel sx={{ mt: 1 }} control={<Switch checked={policy.require_special} onChange={(e) => setPolicy({ ...policy, require_special: e.target.checked })} />} label="Require special character" />
            <Button sx={{ mt: 1 }} variant="contained" onClick={savePolicy} disabled={savingPolicy || loadingPolicy}>{savingPolicy ? "Saving..." : "Save"}</Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6">Sessions</Typography>
            <Button size="small" variant="outlined" sx={{ mt: 1 }} onClick={revokeAll}>Revoke All</Button>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Note: With stateless JWT, revoke-all requires key rotation or token blacklist.</Typography>
          </CardContent>
        </Card>
      </Stack>
    </Container>
  );
}
