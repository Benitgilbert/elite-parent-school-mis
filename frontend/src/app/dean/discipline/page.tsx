"use client";

import * as React from "react";
import Grid from "@mui/material/Grid";
import { Container, Typography, Card, CardContent, Paper, Stack, TextField, Button } from "@mui/material";

 type Summary = {
  student_id: number;
  recent: { id: number; date: string; category: string; severity: string; status: string }[];
  totals: { all: number; open: number };
 };

 type CaseRow = {
  id: number;
  date: string;
  category: string;
  severity: string;
  status: string;
  description?: string | null;
  actions_taken?: string | null;
 };

 export default function DeanDisciplinePage() {
   const [studentId, setStudentId] = React.useState<string>("");
   const [summary, setSummary] = React.useState<Summary | null>(null);
   const [report, setReport] = React.useState<CaseRow[] | null>(null);
   const [error, setError] = React.useState<string | null>(null);
   const [loading, setLoading] = React.useState(false);

   const authHeaders = React.useMemo(() => {
     try { const t = localStorage.getItem("access_token"); return t ? { Authorization: `Bearer ${t}` } : {}; } catch { return {} as Record<string,string>; }
   }, []);

   async function loadSummary() {
     setError(null); setLoading(true); setReport(null);
     try {
       const sid = Number(studentId);
       if (!sid) throw new Error("Enter student ID");
       const res = await fetch(`/api/discipline/summary?student_id=${sid}` , { credentials: "include", headers: authHeaders });
       if (!res.ok) throw new Error(`HTTP ${res.status}`);
       setSummary(await res.json());
     } catch (e: any) {
       setError(e.message || "Failed to load summary");
     } finally { setLoading(false); }
   }

   async function loadReport() {
     setError(null); setLoading(true);
     try {
       const sid = Number(studentId);
       if (!sid) throw new Error("Enter student ID");
       const res = await fetch(`/api/discipline/report?student_id=${sid}` , { credentials: "include", headers: authHeaders });
       if (!res.ok) throw new Error(`HTTP ${res.status}`);
       setReport(await res.json());
     } catch (e: any) {
       setError(e.message || "Failed to load report");
     } finally { setLoading(false); }
   }

   return (
     <Container maxWidth="lg" sx={{ py: 3 }}>
       <Typography variant="h5" sx={{ mb: 2 }}>Dean • Discipline (Read-only)</Typography>
       {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}

       <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }}>
         <TextField size="small" label="Student ID" value={studentId} onChange={(e) => setStudentId(e.target.value)} sx={{ minWidth: 160 }} />
         <Button variant="contained" onClick={loadSummary} disabled={loading}>Load Summary</Button>
         <Button variant="outlined" onClick={loadReport} disabled={loading || !summary}>Load Full Report</Button>
       </Stack>

       <Grid container spacing={2}>
         <Grid item xs={12} md={6}>
           <Card>
             <CardContent>
               <Typography variant="h6" gutterBottom>Summary</Typography>
               <Paper variant="outlined" sx={{ p: 2 }}>
                 {!summary && <Typography color="text.secondary">Enter a student ID and click Load Summary.</Typography>}
                 {summary && (
                   <Stack spacing={1}>
                     <Typography>Total cases: {summary.totals.all} • Open: {summary.totals.open}</Typography>
                     <Typography variant="subtitle2">Recent</Typography>
                     {summary.recent.map(r => (
                       <Typography key={r.id}>{new Date(r.date).toLocaleDateString()} • {r.category} • {r.severity} • {r.status}</Typography>
                     ))}
                     {summary.recent.length === 0 && <Typography color="text.secondary">No recent cases</Typography>}
                   </Stack>
                 )}
               </Paper>
             </CardContent>
           </Card>
         </Grid>

         <Grid item xs={12} md={6}>
           <Card>
             <CardContent>
               <Typography variant="h6" gutterBottom>Full Report</Typography>
               <Paper variant="outlined" sx={{ p: 2, maxHeight: 360, overflow: "auto" }}>
                 {!report && <Typography color="text.secondary">Load Full Report to see details.</Typography>}
                 {report && report.map(r => (
                   <Stack key={r.id} spacing={0.5} sx={{ mb: 1 }}>
                     <Typography>{new Date(r.date).toLocaleDateString()} • {r.category} • {r.severity} • {r.status}</Typography>
                     {r.description && <Typography color="text.secondary">{r.description}</Typography>}
                     {r.actions_taken && <Typography color="text.secondary">Action: {r.actions_taken}</Typography>}
                   </Stack>
                 ))}
                 {report && report.length === 0 && <Typography color="text.secondary">No cases found</Typography>}
               </Paper>
             </CardContent>
           </Card>
         </Grid>
       </Grid>
     </Container>
   );
 }
