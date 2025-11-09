"use client";

import * as React from "react";
import { Box, Container, Typography, Button, Stack, Card, CardContent, TextField } from "@mui/material";

export default function DebugToolsPage() {
  const [healthLoading, setHealthLoading] = React.useState(false);
  const [healthResult, setHealthResult] = React.useState<any | null>(null);
  const [purgeLoading, setPurgeLoading] = React.useState(false);
  const [purgePrefix, setPurgePrefix] = React.useState("");
  const [purgeResult, setPurgeResult] = React.useState<any | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function runHealth() {
    setError(null);
    setHealthLoading(true);
    setHealthResult(null);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
      const res = await fetch("/api/admin/health", {
        method: "GET",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setHealthResult(data);
    } catch (e: any) {
      setError(e.message || "Health check failed");
    } finally {
      setHealthLoading(false);
    }
  }

  async function purgeCache() {
    setError(null);
    setPurgeLoading(true);
    setPurgeResult(null);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
      const url = purgePrefix ? `/api/admin/cache/purge?prefix=${encodeURIComponent(purgePrefix)}` : "/api/admin/cache/purge";
      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPurgeResult(data);
    } catch (e: any) {
      setError(e.message || "Cache purge failed");
    } finally {
      setPurgeLoading(false);
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Debug Tools</Typography>
      <Stack spacing={2}>
        <Card>
          <CardContent>
            <Typography variant="h6">Health Checks</Typography>
            <Typography color="text.secondary" sx={{ mb: 1 }}>Backend, Database, and Redis status</Typography>
            <Stack direction="row" spacing={1}>
              <Button variant="contained" onClick={runHealth} disabled={healthLoading}>
                {healthLoading ? "Checking..." : "Run Health Check"}
              </Button>
            </Stack>
            {healthResult && (
              <Box sx={{ mt: 2, fontFamily: "monospace", fontSize: 13 }}>
                {JSON.stringify(healthResult)}
              </Box>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6">Cache</Typography>
            <Typography color="text.secondary" sx={{ mb: 1 }}>Purge Redis keys by prefix</Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <TextField size="small" label="Prefix (optional)" value={purgePrefix} onChange={(e) => setPurgePrefix(e.target.value)} />
              <Button variant="outlined" onClick={purgeCache} disabled={purgeLoading}>
                {purgeLoading ? "Purging..." : "Purge Cache"}
              </Button>
            </Stack>
            {purgeResult && (
              <Box sx={{ mt: 2, fontFamily: "monospace", fontSize: 13 }}>
                {JSON.stringify(purgeResult)}
              </Box>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6">Feature Flags</Typography>
            <Typography color="text.secondary">Toggle features (UI only placeholder)</Typography>
            <Box sx={{ mt: 1 }}>
              <Button size="small" variant="outlined">Open Flags</Button>
            </Box>
          </CardContent>
        </Card>
        {error && (
          <Typography color="error" sx={{ mt: 1 }}>{error}</Typography>
        )}
      </Stack>
    </Container>
  );
}
