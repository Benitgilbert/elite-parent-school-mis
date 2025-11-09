"use client";

import * as React from "react";
import Grid from "@mui/material/Grid";
import { Container, Typography, Card, CardContent, Paper, Stack, TextField, Button, MenuItem } from "@mui/material";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip } from "recharts";

 type Assessment = { id: number; name: string; term?: string | null; class_name?: string | null; subject?: string | null; date?: string | null };
 type ResultRow = { student_id: number; score: number | null };

 export default function AcademicPerformancePage() {
   const [term, setTerm] = React.useState("");
   const [klass, setKlass] = React.useState("");
   const [subject, setSubject] = React.useState("");
   const [assessments, setAssessments] = React.useState<Assessment[]>([]);
   const [selected, setSelected] = React.useState<number | "">("");
   const [results, setResults] = React.useState<ResultRow[]>([]);
   const [error, setError] = React.useState<string | null>(null);
   const [loading, setLoading] = React.useState(false);

   const authHeaders = React.useMemo(() => {
     try { const t = localStorage.getItem("access_token"); return t ? { Authorization: `Bearer ${t}` } : {}; } catch { return {} as Record<string,string>; }
   }, []);

   async function loadAssessments() {
     setError(null);
     setLoading(true);
     try {
       const qs = new URLSearchParams();
       if (term) qs.set("term", term);
       if (klass) qs.set("class_name", klass);
       if (subject) qs.set("subject", subject);
       const res = await fetch(`/api/exams/assessments${qs.toString() ? `?${qs}` : ""}`, { credentials: "include", headers: authHeaders });
       if (!res.ok) throw new Error(`HTTP ${res.status}`);
       setAssessments(await res.json());
     } catch (e: any) {
       setError(e.message || "Failed to load assessments");
     } finally {
       setLoading(false);
     }
   }

   async function loadResults(assessment_id: number) {
     setError(null);
     try {
       const res = await fetch(`/api/exams/results?assessment_id=${assessment_id}`, { credentials: "include", headers: authHeaders });
       if (!res.ok) throw new Error(`HTTP ${res.status}`);
       const data = await res.json();
       setResults(data.items || []);
     } catch (e: any) {
       setError(e.message || "Failed to load results");
     }
   }

   React.useEffect(() => { loadAssessments(); }, []);
   React.useEffect(() => { if (selected) loadResults(Number(selected)); }, [selected]);
   React.useEffect(() => { try { const t = localStorage.getItem("dean_term"); if (t) setTerm(t); } catch {} }, []);
   React.useEffect(() => { try { localStorage.setItem("dean_term", term); } catch {} }, [term]);

   // Build distribution buckets 0-9, 10-19, ... 90-100
   const buckets = React.useMemo(() => {
     const arr = new Array(11).fill(0);
     for (const r of results) {
       const v = Math.max(0, Math.min(100, Math.round((r.score ?? 0))));
       const idx = Math.min(10, Math.floor(v / 10));
       arr[idx] += 1;
     }
     return arr.map((count, i) => ({ range: i === 10 ? "100" : `${i*10}-${i*10+9}`, count }));
   }, [results]);

   function exportDistributionCSV() {
     const rows = buckets.map(b => ({ range: b.range, count: b.count }));
     const headers = rows.length ? Object.keys(rows[0]) : [];
     const csv = [headers.join(","), ...rows.map(r => headers.map(h => JSON.stringify((r as any)[h] ?? "")).join(","))].join("\n");
     const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
     const url = URL.createObjectURL(blob);
     const a = document.createElement("a"); a.href = url; a.download = `distribution${term?`-${term}`:""}${klass?`-${klass}`:""}${subject?`-${subject}`:""}.csv`; a.click(); URL.revokeObjectURL(url);
   }

   function exportRawResultsCSV() {
     const rows = results.map(r => ({ student_id: r.student_id, score: r.score ?? 0 }));
     const headers = rows.length ? Object.keys(rows[0]) : ["student_id","score"];
     const csv = [headers.join(","), ...rows.map(r => headers.map(h => JSON.stringify((r as any)[h] ?? "")).join(","))].join("\n");
     const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
     const url = URL.createObjectURL(blob);
     const a = document.createElement("a"); a.href = url; a.download = `raw-results${term?`-${term}`:""}${klass?`-${klass}`:""}${subject?`-${subject}`:""}.csv`; a.click(); URL.revokeObjectURL(url);
   }

   return (
     <Container maxWidth="lg" sx={{ py: 3 }}>
       <Typography variant="h5" sx={{ mb: 2 }}>Dean • Academic Performance</Typography>
       {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}

       <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }}>
         <TextField label="Term" size="small" value={term} onChange={(e) => setTerm(e.target.value)} />
         <TextField label="Class" size="small" value={klass} onChange={(e) => setKlass(e.target.value)} />
         <TextField label="Subject" size="small" value={subject} onChange={(e) => setSubject(e.target.value)} />
         <Button variant="outlined" onClick={loadAssessments} disabled={loading}>{loading ? "Loading..." : "Apply Filters"}</Button>
         <TextField select size="small" label="Assessment" value={selected} onChange={(e) => setSelected(e.target.value as any)} sx={{ minWidth: 220 }}>
           {assessments.map(a => (
             <MenuItem key={a.id} value={a.id}>{a.name} {a.term ? `• ${a.term}` : ""} {a.class_name ? `• ${a.class_name}` : ""} {a.subject ? `• ${a.subject}` : ""}</MenuItem>
           ))}
         </TextField>
         <Button variant="outlined" onClick={exportDistributionCSV} disabled={results.length === 0}>Export Distribution CSV</Button>
         <Button variant="outlined" onClick={exportRawResultsCSV} disabled={results.length === 0}>Export Raw Results CSV</Button>
       </Stack>

       <Grid container spacing={2}>
         <Grid item xs={12}>
           <Card>
             <CardContent>
               <Typography variant="h6" gutterBottom>Score Distribution</Typography>
               <Paper variant="outlined" sx={{ height: 360, p: 1 }}>
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={buckets}>
                     <XAxis dataKey="range" />
                     <YAxis allowDecimals={false} />
                     <RTooltip />
                     <Bar dataKey="count" fill="#1976d2" radius={[4,4,0,0]} />
                   </BarChart>
                 </ResponsiveContainer>
               </Paper>
             </CardContent>
           </Card>
         </Grid>
       </Grid>
     </Container>
   );
 }
