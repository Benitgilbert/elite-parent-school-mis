"use client";

import * as React from "react";
import { Container, Typography, Stack, Card, CardContent, TextField, Button, Chip, Box, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Paper, Alert, CircularProgress } from "@mui/material";

type QueryResult = { columns: string[]; rows: Array<Record<string, any>> };

export default function DatabasePage() {
  const [tables, setTables] = React.useState<string[]>([]);
  const [loadingTables, setLoadingTables] = React.useState(false);
  const [sql, setSql] = React.useState("SELECT table_name, table_schema FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name LIMIT 50");
  const [result, setResult] = React.useState<QueryResult | null>(null);
  const [running, setRunning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function fetchTables() {
    setLoadingTables(true);
    setError(null);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
      const res = await fetch("/api/admin/db/tables", { credentials: "include", headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTables(data.tables || []);
    } catch (e: any) {
      setError(e.message || "Failed to load tables");
    } finally {
      setLoadingTables(false);
    }
  }

  async function runQuery() {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
      const params = new URLSearchParams({ sql, limit: "200" });
      const res = await fetch(`/api/admin/db/query?${params.toString()}`, { credentials: "include", headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResult(data as QueryResult);
    } catch (e: any) {
      setError(e.message || "Query failed");
    } finally {
      setRunning(false);
    }
  }

  function exportTable(name: string) {
    const params = new URLSearchParams({ table: name });
    const url = `/api/admin/db/export?${params.toString()}`;
    window.open(url, "_blank");
  }

  React.useEffect(() => {
    fetchTables();
  }, []);

  return (
    <Container maxWidth="lg" sx={{ py: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Database</Typography>
      <Stack spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}
        <Card>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
              <Typography variant="h6">Tables</Typography>
              <Button size="small" variant="outlined" onClick={fetchTables} disabled={loadingTables}>
                {loadingTables ? "Refreshing..." : "Refresh"}
              </Button>
            </Box>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {loadingTables ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}><CircularProgress size={16} /> Loading...</Box>
              ) : (
                tables.map((t) => (
                  <Chip key={t} label={t} onClick={() => setSql(`SELECT * FROM ${t} LIMIT 50`)} onDelete={() => exportTable(t)} deleteIcon={<span style={{ fontSize: 12 }}>CSV</span> as any} />
                ))
              )}
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6">Query Console</Typography>
            <TextField label="SELECT ..." fullWidth size="small" multiline minRows={4} value={sql} onChange={(e) => setSql(e.target.value)} />
            <Button sx={{ mt: 1 }} variant="contained" onClick={runQuery} disabled={running}>
              {running ? "Running..." : "Run"}
            </Button>
            {result && (
              <TableContainer component={Paper} sx={{ mt: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {result.columns.map((c) => (
                        <TableCell key={c}>{c}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result.rows.map((r, idx) => (
                      <TableRow key={idx}>
                        {result.columns.map((c) => (
                          <TableCell key={c}>{String(r[c])}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Stack>
    </Container>
  );
}
