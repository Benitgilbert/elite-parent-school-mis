"use client";

import * as React from "react";
import Link from "next/link";
import { Container, Grid, Card, CardContent, CardActions, Typography, Button, Stack, Paper, Table, TableHead, TableRow, TableCell, TableBody, Box } from "@mui/material";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RTooltip, Legend as RLegend, BarChart, Bar, XAxis, YAxis } from "recharts";

type Role = { id: number; name: string };
type User = { id: number };
type LogItem = { created: string; level: string; name: string; message: string; count?: number };
type RoleAudit = { roles: { name: string; count: number }[] };

export default function AdminIndex() {
  const [users, setUsers] = React.useState<User[]>([]);
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [logs, setLogs] = React.useState<LogItem[]>([]);
  const [audit, setAudit] = React.useState<RoleAudit | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const authHeaders = React.useMemo(() => {
    try {
      const t = localStorage.getItem("access_token");
      return t ? { Authorization: `Bearer ${t}` } : {};
    } catch {
      return {} as Record<string, string>;
    }
  }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [rUsers, rRoles, rLogs, rAudit] = await Promise.all([
        fetch("/api/admin/users", { credentials: "include", headers: authHeaders }),
        fetch("/api/admin/roles", { credentials: "include", headers: authHeaders }),
        fetch("/api/admin/logs?limit=20&dedup=true", { credentials: "include", headers: authHeaders }),
        fetch("/api/admin/security/role-audit", { credentials: "include", headers: authHeaders }),
      ]);
      if (!rUsers.ok || !rRoles.ok || !rLogs.ok || !rAudit.ok) throw new Error("Unauthorized or server error");
      setUsers(await rUsers.json());
      setRoles(await rRoles.json());
      const logsJson = await rLogs.json();
      setLogs(logsJson.items || []);
      setAudit(await rAudit.json());
    } catch (e: any) {
      setError(e.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { load(); }, []);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Admin Dashboard</Typography>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Total Users</Typography>
              <Typography variant="h4">{users.length}</Typography>
            </CardContent>
            <CardActions>
              <Button component={Link} href="/admin/users" size="small">Manage Users</Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Log Levels (Recent)</Typography>
              <Box sx={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={["DEBUG", "INFO", "WARNING", "ERROR"].map(l => ({ level: l, count: logs.filter(x => (x.level || "").toUpperCase() === l).length }))}
                    margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                  >
                    <XAxis dataKey="level" />
                    <YAxis allowDecimals={false} />
                    <RTooltip />
                    <Bar dataKey="count" fill="#1976d2" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Roles</Typography>
              <Stack direction="row" spacing={1} alignItems="baseline">
                <Typography variant="h4">{roles.length}</Typography>
              </Stack>
            </CardContent>
            <CardActions>
              <Button component={Link} href="/admin/users" size="small">Assign Roles</Button>
            </CardActions>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>System Health</Typography>
              <Typography variant="body2">Use Debug Tools to verify DB/Redis and purge cache.</Typography>
            </CardContent>
            <CardActions>
              <Button component={Link} href="/admin/tools/debug" size="small">Open Debug Tools</Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Role Distribution</Typography>
              <Box sx={{ height: 300 }}>
                {audit?.roles?.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={audit.roles}
                        dataKey="count"
                        nameKey="name"
                        innerRadius={70}
                        outerRadius={110}
                        paddingAngle={2}
                        label
                      >
                        {audit.roles.map((entry, index) => (
                          <Cell key={`cell-${entry.name}`} fill={["#1976d2", "#2e7d32", "#ed6c02", "#9c27b0", "#0288d1", "#7b1fa2"][index % 6]} />
                        ))}
                      </Pie>
                      <RTooltip />
                      <RLegend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Typography color="text.secondary">No data</Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="h6">Recent Logs</Typography>
                <Button size="small" onClick={load} disabled={loading}>{loading ? "Refreshing..." : "Refresh"}</Button>
              </Stack>
              <Paper variant="outlined" sx={{ maxHeight: 320, overflow: "auto" }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Time</TableCell>
                      <TableCell>Level</TableCell>
                      <TableCell>Logger</TableCell>
                      <TableCell>Message</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {logs.map((l, i) => (
                      <TableRow key={i}>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{l.created}</TableCell>
                        <TableCell>{l.level}</TableCell>
                        <TableCell>{l.name}</TableCell>
                        <TableCell sx={{ maxWidth: 380, overflow: "hidden", textOverflow: "ellipsis" }}>
                          {l.message}{l.count && l.count > 1 ? ` (x${l.count})` : ""}
                        </TableCell>
                      </TableRow>
                    ))}
                    {logs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <Typography color="text.secondary">No recent logs</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Paper>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
