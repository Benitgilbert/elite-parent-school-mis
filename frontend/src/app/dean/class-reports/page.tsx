"use client";

import * as React from "react";
import { Container, Typography, Card, CardContent, Paper, Stack, TextField, Button, MenuItem } from "@mui/material";
import Grid from "@mui/material/Grid";

 type Report = {
  term?: string | null;
  class_name?: string | null;
  overall_average: number;
  overall_pass_rate: number;
  approx_class_size?: number | null;
  subjects: { subject: string; average: number; pass_rate: number; count: number }[];
 };

 export default function ClassReportsPage() {
   const [terms, setTerms] = React.useState<{ id: number; name: string }[]>([]);
   const [classes, setClasses] = React.useState<{ id: number; name: string }[]>([]);
   const [term, setTerm] = React.useState<string>("");
   const [klass, setKlass] = React.useState<string>("");
   const [report, setReport] = React.useState<Report | null>(null);
   const [error, setError] = React.useState<string | null>(null);
   const [loading, setLoading] = React.useState(false);

   const authHeaders = React.useMemo(() => {
     try { const t = localStorage.getItem("access_token"); return t ? { Authorization: `Bearer ${t}` } : {}; } catch { return {} as Record<string,string>; }
   }, []);

   React.useEffect(() => {
     (async () => {
       try {
         const [rt, rc] = await Promise.all([
           fetch(`/api/settings/academics/terms`, { credentials: "include", headers: authHeaders }),
           fetch(`/api/settings/academics/classes`, { credentials: "include", headers: authHeaders }),
         ]);
         if (rt.ok) setTerms(await rt.json());
         if (rc.ok) setClasses(await rc.json());
         try { const t = localStorage.getItem("dean_term"); if (t) setTerm(t); } catch {}
       } catch {}
     })();
   }, [authHeaders]);

   React.useEffect(() => { try { localStorage.setItem("dean_term", term); } catch {} }, [term]);

   async function load() {
     setError(null);
     setLoading(true);
     try {
       const qs = new URLSearchParams();
       if (term) qs.set("term", term);
       if (klass) qs.set("class_name", klass);
       const res = await fetch(`/api/analytics/class-report${qs.toString()?`?${qs}`:``}`, { credentials: "include", headers: authHeaders });
       if (!res.ok) throw new Error(`HTTP ${res.status}`);
       setReport(await res.json());
     } catch (e: any) {
       setError(e.message || "Failed to load report");
     } finally {
       setLoading(false);
     }
   }

   function downloadCSV() {
     const qs = new URLSearchParams();
     if (term) qs.set("term", term);
     if (klass) qs.set("class_name", klass);
     const url = `/api/analytics/class-report/export?${qs.toString()}`;
     // Use fetch to include auth header then force download
     fetch(url, { credentials: "include", headers: authHeaders })
       .then(r => r.text())
       .then(text => {
         const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
         const u = URL.createObjectURL(blob);
         const a = document.createElement("a");
         a.href = u; a.download = `class-report${term?`-${term}`:""}${klass?`-${klass}`:""}.csv`; a.click(); URL.revokeObjectURL(u);
       })
       .catch(() => {});
   }

   return (
     <Container maxWidth="lg" sx={{ py: 3 }}>
       <Typography variant="h5" sx={{ mb: 2 }}>Dean • Class Reports</Typography>
       {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}
       <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }}>
         <TextField select size="small" label="Term" value={term} onChange={(e) => setTerm(e.target.value)} sx={{ minWidth: 200 }}>
           <MenuItem value=""><em>All terms</em></MenuItem>
           {terms.map(t => (<MenuItem key={t.id} value={t.name}>{t.name}</MenuItem>))}
         </TextField>
         <TextField select size="small" label="Class" value={klass} onChange={(e) => setKlass(e.target.value)} sx={{ minWidth: 200 }}>
           <MenuItem value=""><em>All classes</em></MenuItem>
           {classes.map(c => (<MenuItem key={c.id} value={c.name}>{c.name}</MenuItem>))}
         </TextField>
         <Button variant="contained" onClick={load} disabled={loading}>{loading?"Loading...":"Load"}</Button>
         <Button variant="outlined" onClick={downloadCSV} disabled={!term && !klass}>Download Analytics CSV</Button>
         <Button variant="outlined" onClick={() => {
           const qs = new URLSearchParams();
           if (term) qs.set("term", term);
           if (klass) qs.set("class_name", klass);
           fetch(`/api/report-cards/class?${qs.toString()}`, { credentials: "include", headers: authHeaders })
             .then(r => r.text()).then(text => {
               const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
               const u = URL.createObjectURL(blob);
               const a = document.createElement("a"); a.href = u; a.download = `report-cards${term?`-${term}`:""}${klass?`-${klass}`:""}.csv`; a.click(); URL.revokeObjectURL(u);
             });
         }} disabled={!klass}>Download Report Cards CSV</Button>
       </Stack>

       {report && (
         <Grid container spacing={2}>
           <Grid item xs={12} md={6}>
             <Card>
               <CardContent>
                 <Typography variant="h6" gutterBottom>Overall</Typography>
                 <Paper variant="outlined" sx={{ p: 2 }}>
                   <Typography>Average: {report.overall_average}</Typography>
                   <Typography>Pass rate: {report.overall_pass_rate}%</Typography>
                   <Typography>Approx class size: {report.approx_class_size ?? "—"}</Typography>
                 </Paper>
               </CardContent>
             </Card>
           </Grid>
           <Grid item xs={12} md={6}>
             <Card>
               <CardContent>
                 <Typography variant="h6" gutterBottom>Subjects</Typography>
                 <Paper variant="outlined" sx={{ p: 2, maxHeight: 320, overflow: "auto" }}>
                   {report.subjects.map((s) => (
                     <Typography key={s.subject}>{s.subject}: Avg {s.average} • Pass {s.pass_rate}% • n={s.count}</Typography>
                   ))}
                   {report.subjects.length === 0 && <Typography color="text.secondary">No subject data</Typography>}
                 </Paper>
               </CardContent>
             </Card>
           </Grid>
         </Grid>
       )}
     </Container>
   );
 }
