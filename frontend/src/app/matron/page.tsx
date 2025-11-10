"use client";

import * as React from "react";
import Link from "next/link";
import { Container, Typography, Paper, Stack, Button, Chip, TextField } from "@mui/material";

export default function MatronOverviewPage() {
  const [authHeaders, setAuthHeaders] = React.useState<Record<string, string>>({});
  const [recentCount, setRecentCount] = React.useState<number>(0);
  const [openCount, setOpenCount] = React.useState<number>(0);
  const [studentId, setStudentId] = React.useState<string>("");

  React.useEffect(() => {
    try { const t = localStorage.getItem("access_token"); if (t) setAuthHeaders({ Authorization: `Bearer ${t}` }); } catch {}
    ;(async () => {
      try {
        const url = new URL(`/api/discipline/cases`, location.origin);
        url.searchParams.set("limit", "10");
        url.searchParams.set("gender", "Female");
        const r = await fetch(url.toString(), { credentials: "include", headers: authHeaders });
        if (r.ok) {
          const items = await r.json();
          setRecentCount(items.length || 0);
          setOpenCount(items.filter((x: any) => x.status === "open").length);
        }
      } catch {}
    })();
  }, []);

  function openStudentSummary() {
    if (!studentId) return;
    window.open(`/matron/reports?student_id=${encodeURIComponent(studentId)}`, "_self");
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Matron • Overview</Typography>
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Chip label={`Recent Cases: ${recentCount}`} />
          <Chip label={`Open Cases: ${openCount}`} color="warning" />
        </Stack>
      </Paper>
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Quick Links</Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Button component={Link as any} href="/matron/cases" variant="contained">Cases</Button>
          <Button component={Link as any} href="/matron/reports" variant="outlined">Reports</Button>
          <Button component={Link as any} href="/matron/settings" variant="outlined">Settings</Button>
        </Stack>
      </Paper>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Student Quick Summary</Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <TextField size="small" label="Student ID" value={studentId} onChange={(e)=>setStudentId(e.target.value)} sx={{ maxWidth: 160 }} />
          <Button variant="outlined" onClick={openStudentSummary}>Open</Button>
        </Stack>
      </Paper>
    </Container>
  );
}
