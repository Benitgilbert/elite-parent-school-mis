"use client";

import * as React from "react";
import { Container, Typography, TextField, Stack, Card, CardContent, ToggleButtonGroup, ToggleButton, Button, Box, CircularProgress } from "@mui/material";

type LogItem = { created: string; level: string; name: string; message: string; count?: number };

export default function SystemLogsPage() {
  const [level, setLevel] = React.useState<string | null>("INFO");
  const [query, setQuery] = React.useState("");
  const [logs, setLogs] = React.useState<LogItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = React.useState(true);
  const [dedup, setDedup] = React.useState(true);

  const downloadHref = React.useMemo(() => {
    const params = new URLSearchParams();
    if (level) params.set("level", level);
    if (query) params.set("q", query);
    params.set("limit", "1000");
    return `/api/admin/logs/download?${params.toString()}`;
  }, [level, query]);

  const fetchLogs = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
      const params = new URLSearchParams();
      if (level) params.set("level", level);
      if (query) params.set("q", query);
      params.set("limit", "500");
      if (dedup) params.set("dedup", "true");
      const res = await fetch(`/api/admin/logs?${params.toString()}`, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLogs(data.items || []);
    } catch (e: any) {
      setError(e.message || "Failed to fetch logs");
    } finally {
      setLoading(false);
    }
  }, [level, query]);

  React.useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  React.useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetchLogs, 4000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchLogs]);

  return (
    <Container maxWidth="lg" sx={{ py: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>System Logs</Typography>
      <Stack spacing={2}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField label="Search" size="small" fullWidth value={query} onChange={(e) => setQuery(e.target.value)} />
          <ToggleButtonGroup size="small" exclusive value={level} onChange={(_, v) => setLevel(v)}>
            <ToggleButton value="DEBUG">DEBUG</ToggleButton>
            <ToggleButton value="INFO">INFO</ToggleButton>
            <ToggleButton value="WARNING">WARN</ToggleButton>
            <ToggleButton value="ERROR">ERROR</ToggleButton>
          </ToggleButtonGroup>
          <Button variant="outlined" onClick={() => setAutoRefresh((p) => !p)}>{autoRefresh ? "Pause" : "Auto"}</Button>
          <Button variant="outlined" color={dedup ? "primary" : "inherit"} onClick={() => setDedup((p) => !p)}>{dedup ? "Dedup On" : "Dedup Off"}</Button>
          <Button component="a" href={downloadHref} target="_blank" rel="noreferrer" variant="contained">Download</Button>
        </Stack>
        <Card>
          <CardContent>
            {loading ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CircularProgress size={18} />
                <Typography>Loading logs...</Typography>
              </Box>
            ) : error ? (
              <Typography color="error">{error}</Typography>
            ) : (
              <Box sx={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", fontSize: 12, whiteSpace: "pre-wrap" }}>
                {logs.map((r, idx) => {
                  const suffix = r.count && r.count > 1 ? ` (x${r.count})` : "";
                  return (
                    <div key={idx}>{`${r.created} ${r.level} [${r.name}] ${r.message}${suffix}`}</div>
                  );
                })}
              </Box>
            )}
          </CardContent>
        </Card>
      </Stack>
    </Container>
  );
}
