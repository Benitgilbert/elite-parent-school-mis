"use client";

import * as React from "react";
import Grid from "@mui/material/Grid";
import { Container, Typography, Card, CardContent, Paper, Stack, TextField, Button, MenuItem } from "@mui/material";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RTooltip, Legend as RLegend, BarChart, Bar, XAxis, YAxis } from "recharts";

 type Assessment = { id: number; term?: string | null; class_name?: string | null; subject?: string | null };
 type ResultRow = { student_id: number; score: number | null; full_name?: string; admission_no?: string };

 export default function DeanOverviewPage() {
   const [assessments, setAssessments] = React.useState<Assessment[]>([]);
   const [results, setResults] = React.useState<Record<number, ResultRow[]>>({});
   const [terms, setTerms] = React.useState<{ id: number; name: string; start_date?: string|null; end_date?: string|null }[]>([]);
  const [classes, setClasses] = React.useState<{ id: number; name: string }[]>([]);
  const [term, setTerm] = React.useState<string>("");
  const [klass, setKlass] = React.useState<string>("");
   const [error, setError] = React.useState<string | null>(null);

   const authHeaders = React.useMemo(() => {
     try { const t = localStorage.getItem("access_token"); return t ? { Authorization: `Bearer ${t}` } : {}; } catch { return {} as Record<string,string>; }
   }, []);

   function qsForAssessments() {
    const qs = new URLSearchParams();
    if (term) qs.set("term", term);
    if (klass) qs.set("class_name", klass);
    return qs.toString() ? `?${qs}` : "";
  }

   async function load() {
     setError(null);
     try {
       const tres = await fetch(`/api/settings/academics/terms`, { credentials: "include", headers: authHeaders });
      if (tres.ok) setTerms(await tres.json());
      const cres = await fetch(`/api/settings/academics/classes`, { credentials: "include", headers: authHeaders });
      if (cres.ok) setClasses(await cres.json());
      const ares = await fetch(`/api/exams/assessments${qsForAssessments()}`, { credentials: "include", headers: authHeaders });
       if (!ares.ok) throw new Error(`HTTP ${ares.status}`);
       const a: Assessment[] = await ares.json();
       setAssessments(a);
       // Pull results for up to 5 recent assessments for overview
       const pick = a.slice(-5);
       const map: Record<number, ResultRow[]> = {};
       for (const it of pick) {
         const r = await fetch(`/api/exams/results?assessment_id=${it.id}`, { credentials: "include", headers: authHeaders });
         if (!r.ok) continue;
         const data = await r.json();
         map[it.id] = data.items as ResultRow[];
       }
       setResults(map);
     } catch (e: any) {
       setError(e.message || "Failed to load overview");
     }
   }

   React.useEffect(() => {
    // restore last term
    try { const t = localStorage.getItem("dean_term"); if (t) setTerm(t); } catch {}
    load();
  }, []);
  React.useEffect(() => {
    try { localStorage.setItem("dean_term", term); } catch {}
    load();
  }, [term, klass]);

   const COLORS = ["#1976d2", "#2e7d32", "#ed6c02", "#9c27b0", "#0288d1"]; 

   // Build simple pass/fail donut on last assessment (threshold 50)
   const last = assessments.slice(-1)[0];
   const lastData = React.useMemo(() => {
     if (!last || !results[last.id]) return [] as any[];
     const rows = results[last.id];
     const pass = rows.filter(r => (r.score ?? 0) >= 50).length;
     const fail = rows.length - pass;
     return [{ name: "Pass", value: pass }, { name: "Fail", value: fail }];
   }, [assessments, results]);

   // Average by assessment for small bar chart
   const avgData = React.useMemo(() => {
     const items: { name: string; avg: number }[] = [];
     for (const a of assessments.slice(-5)) {
       const rows = results[a.id] || [];
       const vals = rows.map(r => r.score ?? 0);
       const avg = vals.length ? (vals.reduce((x,y)=>x+y,0) / vals.length) : 0;
       items.push({ name: (a.subject || a.class_name || `A${a.id}`) as string, avg: Number(avg.toFixed(1)) });
     }
     return items;
   }, [assessments, results]);

   // KPIs: Top classes by average
   const topClasses = React.useMemo(() => {
     const map = new Map<string, number[]>();
     for (const a of assessments) {
       if (!a.class_name) continue;
       const rows = results[a.id] || [];
       const vals = rows.map(r => r.score ?? 0);
       if (!map.has(a.class_name)) map.set(a.class_name, []);
       map.get(a.class_name)!.push(...vals);
     }
     const arr = Array.from(map.entries()).map(([klass, vals]) => {
       const avg = vals.length ? vals.reduce((x,y)=>x+y,0)/vals.length : 0;
       return { klass, avg: Number(avg.toFixed(1)) };
     }).sort((a,b) => b.avg - a.avg).slice(0, 5);
     return arr;
   }, [assessments, results]);

   // KPIs: Subjects needing support (lowest average subjects)
   const weakSubjects = React.useMemo(() => {
     const map = new Map<string, number[]>();
     for (const a of assessments) {
       if (!a.subject) continue;
       const rows = results[a.id] || [];
       const vals = rows.map(r => r.score ?? 0);
       if (!map.has(a.subject)) map.set(a.subject, []);
       map.get(a.subject)!.push(...vals);
     }
     const arr = Array.from(map.entries()).map(([subject, vals]) => {
       const avg = vals.length ? vals.reduce((x,y)=>x+y,0)/vals.length : 0;
       return { subject, avg: Number(avg.toFixed(1)) };
     }).sort((a,b) => a.avg - b.avg).slice(0, 5);
     return arr;
   }, [assessments, results]);

   // KPI: At-risk students (score < 40 in last assessment)
   const atRiskList = React.useMemo(() => {
    if (!last || !results[last.id]) return [] as { name: string; class_name: string; admission?: string; score: number }[];
    const rows = results[last.id];
    const cls = (last.class_name || klass || "");
    return rows
      .filter(r => (r.score ?? 0) < 40)
      .slice(0, 15)
      .map(r => ({ name: r.full_name || String(r.student_id), class_name: cls, admission: r.admission_no, score: Number(r.score ?? 0) }));
  }, [assessments, results, klass]);

   // CSV exports
   function downloadCSV(filename: string, rows: { [k: string]: any }[]) {
     const headers = rows.length ? Object.keys(rows[0]) : [];
     const csv = [headers.join(","), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? "")).join(","))].join("\n");
     const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
     const url = URL.createObjectURL(blob);
     const a = document.createElement("a");
     a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
   }

   function exportTopClasses() {
     downloadCSV(`top-classes${term ? `-${term}`:""}.csv`, topClasses.map(x => ({ class: x.klass, average: x.avg })));
   }
   function exportWeakSubjects() {
     downloadCSV(`subjects-support${term ? `-${term}`:""}.csv`, weakSubjects.map(x => ({ subject: x.subject, average: x.avg })));
   }
   function exportLastAssessment() {
     if (!last || !results[last.id]) return;
     const rows = results[last.id].map(r => ({ student_id: r.student_id, score: r.score ?? 0 }));
     downloadCSV(`last-assessment${term ? `-${term}`:""}.csv`, rows);
   }

   return (
     <Container maxWidth="lg" sx={{ py: 3 }}>
       <Typography variant="h5" sx={{ mb: 2 }}>Dean • Overview</Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }}>
        <TextField select size="small" label="Term" value={term} onChange={(e) => setTerm(e.target.value)} sx={{ minWidth: 200 }}>
          <MenuItem value="">
            <em>All terms</em>
          </MenuItem>
          {terms.map(t => (<MenuItem key={t.id} value={t.name}>{t.name}</MenuItem>))}
        </TextField>
        <TextField select size="small" label="Class" value={klass} onChange={(e) => setKlass(e.target.value)} sx={{ minWidth: 200 }}>
          <MenuItem value="">
            <em>All classes</em>
          </MenuItem>
          {classes.map(c => (<MenuItem key={c.id} value={c.name}>{c.name}</MenuItem>))}
        </TextField>
        <Button variant="outlined" onClick={exportTopClasses}>Export Top Classes CSV</Button>
      </Stack>
       {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}

       <Grid container spacing={2}>
         <Grid item xs={12} md={6}>
           <Card>
             <CardContent>
               <Typography variant="h6" gutterBottom>Last Assessment Pass Rate</Typography>
               <Paper variant="outlined" sx={{ height: 320, p: 1 }}>
                 <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                     <Pie data={lastData} dataKey="value" nameKey="name" outerRadius={110} label>
                       {lastData.map((entry, index) => (<Cell key={entry.name} fill={COLORS[index % COLORS.length]} />))}
                     </Pie>
                     <RTooltip />
                     <RLegend />
                   </PieChart>
                 </ResponsiveContainer>
               </Paper>
             </CardContent>
           </Card>
         </Grid>
         <Grid item xs={12} md={6}>
           <Card>
             <CardContent>
               <Typography variant="h6" gutterBottom>Recent Assessments Averages</Typography>
               <Paper variant="outlined" sx={{ height: 320, p: 1 }}>
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={avgData}>
                     <XAxis dataKey="name" />
                     <YAxis allowDecimals={false} domain={[0, 100]} />
                     <RTooltip />
                     <Bar dataKey="avg" fill="#1976d2" radius={[4,4,0,0]} />
                   </BarChart>
                 </ResponsiveContainer>
               </Paper>
             </CardContent>
           </Card>
         </Grid>
         <Grid item xs={12} md={6}>
           <Card>
             <CardContent>
               <Typography variant="h6" gutterBottom>Top Classes by Average</Typography>
               <Paper variant="outlined" sx={{ p: 2 }}>
                 {topClasses.map((x) => (
                   <Typography key={x.klass}>{x.klass}: {x.avg}</Typography>
                 ))}
                 {topClasses.length === 0 && <Typography color="text.secondary">No data</Typography>}
               </Paper>
             </CardContent>
           </Card>
         </Grid>
         <Grid item xs={12} md={6}>
           <Card>
             <CardContent>
               <Typography variant="h6" gutterBottom>Subjects Needing Support</Typography>
               <Paper variant="outlined" sx={{ p: 2 }}>
                 {weakSubjects.map((x) => (
                   <Typography key={x.subject}>{x.subject}: {x.avg}</Typography>
                 ))}
                 {weakSubjects.length === 0 && <Typography color="text.secondary">No data</Typography>}
               </Paper>
             </CardContent>
           </Card>
         </Grid>
         <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>At‑Risk Students (Last Assessment)</Typography>
              {atRiskList.length === 0 && <Typography color="text.secondary">No students found</Typography>}
              {atRiskList.map((s, idx) => (
                <Typography key={idx}>{s.name} {s.admission ? `(${s.admission})` : ""} • {s.class_name} • {s.score}</Typography>
              ))}
            </CardContent>
          </Card>
        </Grid>
       </Grid>
     </Container>
   );
 }
