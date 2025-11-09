"use client";

import * as React from "react";
import Grid from "@mui/material/Grid";
import { Container, Typography, Card, CardContent, Paper, Stack, TextField, Button, MenuItem, LinearProgress } from "@mui/material";

 type Assessment = { id: number; name: string; term?: string | null; class_name?: string | null; subject?: string | null; date?: string | null };
 type ResultRow = { student_id: number; score: number | null };

 export default function TeachersPerformancePage() {
   const [assessments, setAssessments] = React.useState<Assessment[]>([]);
   const [terms, setTerms] = React.useState<{ id: number; name: string }[]>([]);
   const [classes, setClasses] = React.useState<{ id: number; name: string }[]>([]);
   const [term, setTerm] = React.useState<string>("");
   const [klass, setKlass] = React.useState<string>("");
   const [subject, setSubject] = React.useState<string>("");
   const [loading, setLoading] = React.useState(false);
   const [error, setError] = React.useState<string | null>(null);

   const authHeaders = React.useMemo(() => {
     try { const t = localStorage.getItem("access_token"); return t ? { Authorization: `Bearer ${t}` } : {}; } catch { return {} as Record<string,string>; }
   }, []);

   async function load() {
     setError(null);
     setLoading(true);
     try {
       const [rt, rc] = await Promise.all([
         fetch(`/api/settings/academics/terms`, { credentials: "include", headers: authHeaders }),
         fetch(`/api/settings/academics/classes`, { credentials: "include", headers: authHeaders }),
       ]);
       if (rt.ok) setTerms(await rt.json());
       if (rc.ok) setClasses(await rc.json());

       const qs = new URLSearchParams();
       if (term) qs.set("term", term);
       if (klass) qs.set("class_name", klass);
       if (subject) qs.set("subject", subject);
       const ra = await fetch(`/api/exams/assessments${qs.toString() ? `?${qs}` : ""}`, { credentials: "include", headers: authHeaders });
       if (!ra.ok) throw new Error(`HTTP ${ra.status}`);
       const list: Assessment[] = await ra.json();

       // For each assessment, compute average and completion
       const enriched: any[] = [];
       for (const a of list) {
         const rr = await fetch(`/api/exams/results?assessment_id=${a.id}`, { credentials: "include", headers: authHeaders });
         let results: ResultRow[] = [];
         if (rr.ok) { const data = await rr.json(); results = data.items || []; }
         const completed = results.filter(r => r.score != null).length;
         const count = results.length;
         const avg = completed ? (results.filter(r=>r.score!=null).reduce((s,r)=>s+Number(r.score||0),0) / completed) : 0;
         enriched.push({ ...a, average: Number(avg.toFixed(1)), completed, total: count });
       }
       setAssessments(enriched);
     } catch (e: any) {
       setError(e.message || "Failed to load");
     } finally {
       setLoading(false);
     }
   }

   React.useEffect(() => { load(); }, []);
   React.useEffect(() => { load(); }, [term, klass, subject]);

   // Group aggregates by class and by subject (proxy for teacher until teacher mapping exists)
   const byClass = React.useMemo(() => {
     const map = new Map<string, { avgSum: number; n: number; completed: number; total: number }>();
     for (const a of assessments as any[]) {
       const key = a.class_name || "(none)";
       const cur = map.get(key) || { avgSum: 0, n: 0, completed: 0, total: 0 };
       cur.avgSum += a.average || 0; cur.n += a.average ? 1 : 0; cur.completed += a.completed || 0; cur.total += a.total || 0;
       map.set(key, cur);
     }
     return Array.from(map.entries()).map(([klass, v]) => ({ klass, average: v.n ? Number((v.avgSum / v.n).toFixed(1)) : 0, completion: v.total ? Math.round((v.completed / v.total) * 100) : 0 }));
   }, [assessments]);

   const bySubject = React.useMemo(() => {
     const map = new Map<string, { avgSum: number; n: number; completed: number; total: number }>();
     for (const a of assessments as any[]) {
       const key = a.subject || "(none)";
       const cur = map.get(key) || { avgSum: 0, n: 0, completed: 0, total: 0 };
       cur.avgSum += a.average || 0; cur.n += a.average ? 1 : 0; cur.completed += a.completed || 0; cur.total += a.total || 0;
       map.set(key, cur);
     }
     return Array.from(map.entries()).map(([subject, v]) => ({ subject, average: v.n ? Number((v.avgSum / v.n).toFixed(1)) : 0, completion: v.total ? Math.round((v.completed / v.total) * 100) : 0 }));
   }, [assessments]);

   function exportCSV(rows: any[], filename: string) {
     const headers = rows.length ? Object.keys(rows[0]) : [];
     const csv = [headers.join(","), ...rows.map(r => headers.map(h => JSON.stringify((r as any)[h] ?? "")).join(","))].join("\n");
     const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
     const url = URL.createObjectURL(blob);
     const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
   }

   return (
     <Container maxWidth="lg" sx={{ py: 3 }}>
       <Typography variant="h5" sx={{ mb: 2 }}>Dean • Teachers Performance</Typography>
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
         <TextField size="small" label="Subject (proxy for teacher)" value={subject} onChange={(e) => setSubject(e.target.value)} />
         <Button variant="outlined" onClick={() => exportCSV(byClass, `teachers-by-class${term?`-${term}`:""}${klass?`-${klass}`:""}.csv`)} disabled={byClass.length===0}>Export Classes CSV</Button>
         <Button variant="outlined" onClick={() => exportCSV(bySubject, `teachers-by-subject${term?`-${term}`:""}${subject?`-${subject}`:""}.csv`)} disabled={bySubject.length===0}>Export Subjects CSV</Button>
       </Stack>

       <Grid container spacing={2}>
         <Grid item xs={12} md={6}>
           <Card>
             <CardContent>
               <Typography variant="h6" gutterBottom>Class Averages & Completion</Typography>
               <Paper variant="outlined" sx={{ p: 2 }}>
                 {byClass.map((x) => (
                   <Stack key={x.klass} spacing={0.5} sx={{ mb: 1 }}>
                     <Typography>{x.klass} • Avg: {x.average}</Typography>
                     <LinearProgress variant="determinate" value={x.completion} />
                     <Typography color="text.secondary">{x.completion}% submitted</Typography>
                   </Stack>
                 ))}
                 {byClass.length === 0 && <Typography color="text.secondary">No data</Typography>}
               </Paper>
             </CardContent>
           </Card>
         </Grid>
         <Grid item xs={12} md={6}>
           <Card>
             <CardContent>
               <Typography variant="h6" gutterBottom>Subject Averages & Completion</Typography>
               <Paper variant="outlined" sx={{ p: 2 }}>
                 {bySubject.map((x) => (
                   <Stack key={x.subject} spacing={0.5} sx={{ mb: 1 }}>
                     <Typography>{x.subject} • Avg: {x.average}</Typography>
                     <LinearProgress variant="determinate" value={x.completion} />
                     <Typography color="text.secondary">{x.completion}% submitted</Typography>
                   </Stack>
                 ))}
                 {bySubject.length === 0 && <Typography color="text.secondary">No data</Typography>}
               </Paper>
             </CardContent>
           </Card>
         </Grid>
       </Grid>
     </Container>
   );
 }
