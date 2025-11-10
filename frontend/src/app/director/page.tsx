"use client";

import * as React from "react";
import Link from "next/link";
import { Container, Typography, Paper, Stack, Button, Chip } from "@mui/material";

export default function DirectorOverviewPage() {
  const [authHeaders, setAuthHeaders] = React.useState<Record<string, string>>({});
  const [summary, setSummary] = React.useState<{ students: number; teachers: number } | null>(null);

  React.useEffect(() => {
    try { const t = localStorage.getItem("access_token"); if (t) setAuthHeaders({ Authorization: `Bearer ${t}` }); } catch {}
    (async () => {
      try {
        const s = await fetch(`/api/students/?skip=0&limit=1`, { credentials: "include", headers: authHeaders });
        const t = await fetch(`/api/teachers/`, { credentials: "include", headers: authHeaders });
        const students = s.ok ? (await s.json()).length : 0;
        const teachers = t.ok ? (await t.json()).length : 0;
        setSummary({ students, teachers });
      } catch {}
    })();
  }, []);

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Director • Overview</Typography>
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Chip label={`Students: ${summary?.students ?? "-"}`} />
          <Chip label={`Teachers: ${summary?.teachers ?? "-"}`} />
        </Stack>
      </Paper>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Quick Links</Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Button component={Link as any} href="/director/students" variant="contained">Students</Button>
          <Button component={Link as any} href="/director/teachers" variant="outlined">Teachers</Button>
          <Button component={Link as any} href="/director/report-cards" variant="outlined">Report Cards</Button>
          <Button component={Link as any} href="/director/approvals" variant="outlined">Approvals</Button>
          <Button component={Link as any} href="/director/analytics" variant="outlined">Analytics</Button>
          <Button component={Link as any} href="/director/settings" variant="outlined">Settings</Button>
        </Stack>
      </Paper>
    </Container>
  );
}
