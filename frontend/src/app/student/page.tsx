"use client";

import * as React from "react";
import Link from "next/link";
import { Container, Typography, Paper, Stack, Divider, Button, TextField, Table, TableHead, TableRow, TableCell, TableBody, Alert, Chip } from "@mui/material";

export default function StudentDashboardPage() {
  const [me, setMe] = React.useState<any | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [authHeaders, setAuthHeaders] = React.useState<Record<string, string>>({});

  const [term, setTerm] = React.useState<string>("");
  const [reportRows, setReportRows] = React.useState<Array<{ assessment_id: string; subject: string; score: string }>>([]);
  const [reportError, setReportError] = React.useState<string | null>(null);
  const [reportLoading, setReportLoading] = React.useState(false);

  const [attLoading, setAttLoading] = React.useState(false);
  const [attError, setAttError] = React.useState<string | null>(null);
  const [attItems, setAttItems] = React.useState<Array<{ date: string; status: string; remarks?: string | null }>>([]);

  const [ttLoading, setTtLoading] = React.useState(false);
  const [ttError, setTtError] = React.useState<string | null>(null);
  const [ttTerm, setTtTerm] = React.useState<string>("");
  const [ttItems, setTtItems] = React.useState<Array<{ day_of_week: string; period_index: number; subject: string; room?: string | null }>>([]);

  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        let headers: Record<string, string> = {};
        try {
          const token = localStorage.getItem("access_token");
          if (token) headers["Authorization"] = `Bearer ${token}`;
        } catch {}
        setAuthHeaders(headers);
        const res = await fetch("/api/users/me", { credentials: "include", headers });
        if (!res.ok) throw new Error(`Unauthorized (${res.status})`);
        setMe(await res.json());
      } catch (e: any) {
        setError(e.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function doLogout() {
    try { localStorage.removeItem("access_token"); } catch {}
    try { await fetch("/api/auth/logout", { method: "POST", credentials: "include" }); } catch {}
    location.href = "/login";
  }

  async function loadReport() {
    setReportError(null);
    setReportRows([]);
    setReportLoading(true);
    try {
      const url = new URL(`/api/report-cards/my`, location.origin);
      if (term) url.searchParams.set("term", term);
      const r = await fetch(url.toString(), { credentials: "include", headers: authHeaders });
      if (r.status === 403) {
        throw new Error("Access denied. Ask admin to enable Student access to report cards.");
      }
      if (!r.ok) throw new Error(`Failed to load report (${r.status})`);
      const csv = await r.text();
      const lines = csv.split(/\r?\n/).filter(Boolean);
      const out: Array<{ assessment_id: string; subject: string; score: string }> = [];
      for (let i = 1; i < lines.length; i++) {
        const [assessment_id = "", subject = "", score = ""] = lines[i].split(",");
        out.push({ assessment_id, subject, score });
      }
      setReportRows(out);
    } catch (e: any) {
      setReportError(e.message || "Failed to load report");
    } finally {
      setReportLoading(false);
    }
  }

  async function loadAttendance() {
    setAttError(null);
    setAttLoading(true);
    try {
      const url = new URL(`/api/attendance/my`, location.origin);
      url.searchParams.set("limit", "30");
      const r = await fetch(url.toString(), { credentials: "include", headers: authHeaders });
      if (r.status === 403) throw new Error("Attendance access denied.");
      if (!r.ok) throw new Error(`Failed to load attendance (${r.status})`);
      const data = await r.json();
      setAttItems(data.items || []);
    } catch (e: any) {
      setAttError(e.message || "Failed to load attendance");
    } finally {
      setAttLoading(false);
    }
  }

  async function loadTimetable() {
    setTtError(null);
    setTtItems([]);
    if (!ttTerm.trim()) { setTtError("Enter term e.g., 2025-T1"); return; }
    setTtLoading(true);
    try {
      const url = new URL(`/api/timetable/my`, location.origin);
      url.searchParams.set("term", ttTerm.trim());
      const r = await fetch(url.toString(), { credentials: "include", headers: authHeaders });
      if (r.status === 403) throw new Error("Timetable access denied or class not configured.");
      if (!r.ok) throw new Error(`Failed to load timetable (${r.status})`);
      const data = await r.json();
      setTtItems(data.items || []);
    } catch (e: any) {
      setTtError(e.message || "Failed to load timetable");
    } finally {
      setTtLoading(false);
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Student Dashboard</Typography>

      {error && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      )}

      <Stack spacing={2}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Profile</Typography>
          {loading && <Typography color="text.secondary">Loading...</Typography>}
          {!loading && me && (
            <>
              <Typography>Name: {me.full_name || me.email}</Typography>
              <Typography>Email: {me.email}</Typography>
              <Typography>Roles: {(me.roles || []).join(", ")}</Typography>
            </>
          )}
        </Paper>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Quick Actions</Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Link href="/logout">Logout</Link>
            <Divider flexItem orientation="vertical" />
            <Button size="small" variant="outlined" onClick={() => location.reload()}>Refresh</Button>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Use the quick links below to access your sections.
          </Typography>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Quick Links</Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button component={Link as any} href="/student/report-cards" variant="contained">Report Cards</Button>
            <Button component={Link as any} href="/student/attendance" variant="outlined">Attendance</Button>
            <Button component={Link as any} href="/student/timetable" variant="outlined">Timetable</Button>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
