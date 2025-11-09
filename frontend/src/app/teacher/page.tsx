"use client";

import * as React from "react";
import { Container, Typography, Paper, Stack, FormControl, InputLabel, Select, MenuItem, List, ListItem, ListItemText, Alert } from "@mui/material";

export default function TeacherOverviewPage() {
  const [assessments, setAssessments] = React.useState<any[]>([]);
  const [term, setTerm] = React.useState<string>("");
  const [className, setClassName] = React.useState<string>("");
  const [subject, setSubject] = React.useState<string>("");
  const [error, setError] = React.useState<string | null>(null);

  const authHeaders = React.useMemo(() => {
    try { const t = localStorage.getItem("access_token"); return t ? { Authorization: `Bearer ${t}` } : {}; } catch { return {} as Record<string, string>; }
  }, []);

  async function load() {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (term) params.set("term", term);
      if (className) params.set("class_name", className);
      if (subject) params.set("subject", subject);
      const r = await fetch(`/api/exams/assessments?${params.toString()}`, { credentials: "include", headers: authHeaders });
      if (!r.ok) throw new Error("Failed to load assessments");
      setAssessments(await r.json());
    } catch (e: any) {
      setError(e.message || "Failed to load overview");
    }
  }

  React.useEffect(() => { load(); }, [term, className, subject]);

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Teacher • Overview</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="term">Term</InputLabel>
            <Select labelId="term" label="Term" value={term} onChange={(e) => setTerm(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="T1">T1</MenuItem>
              <MenuItem value="T2">T2</MenuItem>
              <MenuItem value="T3">T3</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="class">Class</InputLabel>
            <Select labelId="class" label="Class" value={className} onChange={(e) => setClassName(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="S1A">S1A</MenuItem>
              <MenuItem value="S1B">S1B</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="subject">Subject</InputLabel>
            <Select labelId="subject" label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="Mathematics">Mathematics</MenuItem>
              <MenuItem value="English">English</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>Upcoming Assessments</Typography>
        <List dense>
          {assessments.map(a => (
            <ListItem key={a.id} divider>
              <ListItemText primary={`${a.name} • ${a.class_name || "-"} • ${a.subject || "-"}`} secondary={`Term: ${a.term || "-"}${a.date ? ` • Date: ${a.date}` : ""}`} />
            </ListItem>
          ))}
          {assessments.length === 0 && (
            <ListItem><ListItemText primary="No assessments" /></ListItem>
          )}
        </List>
      </Paper>
    </Container>
  );
}
