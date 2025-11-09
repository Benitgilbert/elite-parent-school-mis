"use client";

import * as React from "react";
import { Container, Typography, Stack, Card, CardContent, TextField, Switch, FormControlLabel, Button, Alert } from "@mui/material";

type Settings = {
  maintenance_mode: boolean;
  cors_origins: string[];
  email_from: string | null;
};

export default function SystemSettingsPage() {
  const [data, setData] = React.useState<Settings>({ maintenance_mode: false, cors_origins: [], email_from: null });
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const corsText = React.useMemo(() => data.cors_origins.join(", "), [data.cors_origins]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
      const res = await fetch("/api/admin/settings", { credentials: "include", headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json as Settings);
    } catch (e: any) {
      setError(e.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json as Settings);
      setSuccess("Settings saved");
    } catch (e: any) {
      setError(e.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  return (
    <Container maxWidth="lg" sx={{ py: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>System Settings</Typography>
      <Stack spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success" onClose={() => setSuccess(null)}>{success}</Alert>}
        <Card>
          <CardContent>
            <Typography variant="h6">General</Typography>
            <FormControlLabel
              control={<Switch checked={data.maintenance_mode} onChange={(e) => setData({ ...data, maintenance_mode: e.target.checked })} />}
              label="Maintenance mode"
            />
            <TextField
              label="CORS Origins"
              fullWidth
              size="small"
              sx={{ mt: 2 }}
              value={corsText}
              onChange={(e) => setData({ ...data, cors_origins: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
              placeholder="http://localhost:3000, https://admin.example.com"
            />
            <Button sx={{ mt: 2 }} variant="contained" onClick={save} disabled={saving || loading}>Save</Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6">Email</Typography>
            <TextField
              label="Sender"
              fullWidth
              size="small"
              value={data.email_from || ""}
              onChange={(e) => setData({ ...data, email_from: e.target.value || null })}
              placeholder="no-reply@example.com"
            />
          </CardContent>
        </Card>
      </Stack>
    </Container>
  );
}
