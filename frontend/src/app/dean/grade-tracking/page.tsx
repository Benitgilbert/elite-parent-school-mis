"use client";

import * as React from "react";
import Grid from "@mui/material/Grid";
import { Container, Typography, Card, CardContent, Paper, Stack, TextField, Button, MenuItem, LinearProgress } from "@mui/material";

 type Assessment = { id: number; name: string; term?: string | null; class_name?: string | null; subject?: string | null; date?: string | null };
 type ResultRow = { student_id: number; score: number | null };

 export default function GradeTrackingPage() {
   const [assessments, setAssessments] = React.useState<Assessment[]>([]);
   const [terms, setTerms] = React.useState<{ id: number; name: string }[]>([]);
   const [classes, setClasses] = React.useState<{ id: number; name: string }[]>([]);
   const [term, setTerm] = React.useState<string>("");
   const [klass, setKlass] = React.useState<string>("");
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
       const ra = await fetch(`/api/exams/assessments${qs.toString() ? `?${qs}` : ""}`, { credentials: "include", headers: authHeaders });
       if (!ra.ok) throw new Error(`HTTP ${ra.status}`);
       const list: Assessment[] = await ra.json();

       // For each assessment, compute completion = results count / student count (if class is set) or results count only
       const enriched: any[] = [];
       for (const a of list) {
         const rr = await fetch(`/api/exams/results?assessment_id=${a.id}`, { credentials: "include", headers: authHeaders });
         let results: ResultRow[] = [];
         if (rr.ok) { const data = await rr.json(); results = data.items || []; }
         const completed = results.filter(r => r.score != null).length;
         // If class_name provided, approximate class size by max student_id count; otherwise unknown
         const total = results.length || null; // results endpoint returns rows for class students when class set
         enriched.push({ ...a, completed, total });
       }
       setAssessments(enriched);
     } catch (e: any) {
       setError(e.message || "Failed to load");
     } finally {
       setLoading(false);
     }
   }

   React.useEffect(() => { load(); }, []);
   React.useEffect(() => { load(); }, [term, klass]);

   function pct(a: any) {
     if (!a.total || a.total === 0) return 0;
     return Math.round((a.completed / a.total) * 100);
   }

   function exportCSV() {
     const rows = assessments.map((a: any) => ({
       id: a.id,
       name: a.name,
       term: a.term || "",
       class: a.class_name || "",
       subject: a.subject || "",
       completed: a.completed,
       total: a.total ?? "",
       percent: pct(a),
     }));
     const headers = rows.length ? Object.keys(rows[0]) : [];
     const csv = [headers.join(","), ...rows.map(r => headers.map(h => JSON.stringify((r as any)[h] ?? "")).join(","))].join("\n");
     const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
     const url = URL.createObjectURL(blob);
     const a = document.createElement("a"); a.href = url; a.download = `grade-tracking${term?`-${term}`:""}${klass?`-${klass}`:""}.csv`; a.click(); URL.revokeObjectURL(url);
   }

   return (
     <Container maxWidth="lg" sx={{ py: 3 }}>
       <Typography variant="h5" sx={{ mb: 2 }}>Dean • Grade Entry Tracking</Typography>
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
         <Button variant="outlined" onClick={exportCSV} disabled={assessments.length === 0}>Export CSV</Button>
       </Stack>

       <Grid container spacing={2}>
         {assessments.map((a: any) => (
           <Grid item xs={12} md={6} key={a.id}>
             <Card>
               <CardContent>
                 <Typography variant="subtitle1">{a.name} {a.term ? `• ${a.term}` : ""} {a.class_name ? `• ${a.class_name}` : ""} {a.subject ? `• ${a.subject}` : ""}</Typography>
                 {a.total ? (
                   <Stack spacing={1} sx={{ mt: 1 }}>
                     <LinearProgress variant="determinate" value={pct(a)} />
                     <Typography color="text.secondary">{a.completed}/{a.total} ({pct(a)}%) submitted</Typography>
                   </Stack>
                 ) : (
                   <Typography color="text.secondary" sx={{ mt: 1 }}>Completed: {a.completed}</Typography>
                 )}
               </CardContent>
             </Card>
           </Grid>
         ))}
       </Grid>
     </Container>
   );
 }
