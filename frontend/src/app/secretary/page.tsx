"use client";

import * as React from "react";
import Link from "next/link";
import { Container, Grid, Card, CardContent, CardActions, Typography, Button, Paper, Table, TableHead, TableRow, TableCell, TableBody } from "@mui/material";

type AppItem = { id: number; first_name: string; last_name: string; class_name?: string | null; email?: string | null; created_at?: string };
type Student = { id: number };

export default function SecretaryIndex() {
  const [pending, setPending] = React.useState<AppItem[]>([]);
  const [students, setStudents] = React.useState<Student[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const authHeaders = React.useMemo(() => {
    try {
      const t = localStorage.getItem("access_token");
      return t ? { Authorization: `Bearer ${t}` } : {};
    } catch {
      return {} as Record<string, string>;
    }
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [rApps, rStudents] = await Promise.all([
        fetch("/api/secretary/applications/?status=pending", { credentials: "include", headers: authHeaders }),
        fetch("/api/students/?skip=0&limit=200", { credentials: "include", headers: authHeaders }),
      ]);
      if (!rApps.ok || !rStudents.ok) throw new Error("Unauthorized or server error");
      setPending(await rApps.json());
      setStudents(await rStudents.json());
    } catch (e: any) {
      setError(e.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); }, []);

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Secretary • Overview</Typography>
      {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Pending Applications</Typography>
              <Typography variant="h4">{pending.length}</Typography>
            </CardContent>
            <CardActions>
              <Button component={Link} href="/secretary/applications" size="small">Review Applications</Button>
            </CardActions>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Total Students</Typography>
              <Typography variant="h4">{students.length}</Typography>
            </CardContent>
            <CardActions>
              <Button component={Link} href="/secretary/students" size="small">Open Students</Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Recent Applications</Typography>
              <Paper variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Requested Class</TableCell>
                      <TableCell>Email</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pending.slice(0, 8).map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>{a.id}</TableCell>
                        <TableCell>{a.first_name} {a.last_name}</TableCell>
                        <TableCell>{a.class_name ?? ""}</TableCell>
                        <TableCell>{a.email ?? ""}</TableCell>
                      </TableRow>
                    ))}
                    {pending.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4}><Typography color="text.secondary">No new applications</Typography></TableCell>
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
