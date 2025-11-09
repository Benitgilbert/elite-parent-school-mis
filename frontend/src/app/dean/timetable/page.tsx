"use client";

import * as React from "react";
import Grid from "@mui/material/Grid";
import { Container, Typography, Tabs, Tab, Box, Stack, TextField, Button, MenuItem, Paper, Select, FormControl, InputLabel } from "@mui/material";

 type Config = { term: string; start_time: string; period_minutes: number; days: string[]; blocks: any[] } | null;
 type Allocation = { id: number; term: string; class_name: string; subject: string; required_per_week: number; teacher_id?: number | null };
 type Slot = { id: number; term: string; day_of_week: string; period_index: number; class_name: string; subject: string; room?: string | null; teacher_id?: number | null };

 export default function DeanTimetablePage() {
   const [tab, setTab] = React.useState(0);
   const [terms, setTerms] = React.useState<{ id: number; name: string }[]>([]);
   const [classes, setClasses] = React.useState<{ id: number; name: string }[]>([]);
   const [term, setTerm] = React.useState("");
   const [klass, setKlass] = React.useState("");

   const [config, setConfig] = React.useState<Config>(null);
  const [daysSel, setDaysSel] = React.useState<string[]>(["Mon","Tue","Wed","Thu","Fri"]);
  const [blocksUI, setBlocksUI] = React.useState<{ label: string; kind: "periods"|"minutes"; value: number }[]>([]);
   const [allocations, setAllocations] = React.useState<Allocation[]>([]);
   const [slots, setSlots] = React.useState<Slot[]>([]);
   const [conflicts, setConflicts] = React.useState<any[]>([]);
   const [error, setError] = React.useState<string | null>(null);

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

   async function loadConfig() {
    setError(null);
    if (!term) return;
    const res = await fetch(`/api/timetable/config?term=${encodeURIComponent(term)}`, { credentials: "include", headers: authHeaders });
    if (res.ok) {
      const cfg = await res.json();
      setConfig(cfg);
      const d = (cfg?.days as any) || ["Mon","Tue","Wed","Thu","Fri"];
      setDaysSel(d);
      const b = ((cfg?.blocks as any[]) || []).map((x:any)=> ({ label: String(x.label||""), kind: ("minutes" in x ? "minutes" : "periods") as any, value: Number(x.minutes ?? x.periods ?? 0) }));
      setBlocksUI(b);
    } else {
      setConfig(null);
      setDaysSel(["Mon","Tue","Wed","Thu","Fri"]);
      setBlocksUI([]);
    }
  }

   async function saveConfig(partial: Partial<NonNullable<Config>>) {
     const body = { term, start_time: config?.start_time || "08:30", period_minutes: config?.period_minutes || 40, days: daysSel, blocks: blocksUI.map(b => (b.kind === "minutes" ? { label: b.label, minutes: b.value } : { label: b.label, periods: b.value })), ...partial };
     const res = await fetch(`/api/timetable/config`, { method: "PUT", headers: { ...authHeaders, "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
     if (res.ok) loadConfig();
   }

   async function loadAllocations() {
     if (!term) return;
     const res = await fetch(`/api/timetable/allocations?term=${encodeURIComponent(term)}${klass?`&class_name=${encodeURIComponent(klass)}`:``}`, { credentials: "include", headers: authHeaders });
     if (res.ok) setAllocations(await res.json()); else setAllocations([]);
   }

   async function addAllocation(newItem: { class_name: string; subject: string; required_per_week: number }) {
     if (!term) return;
     await fetch(`/api/timetable/allocations`, { method: "POST", headers: { ...authHeaders, "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ term, ...newItem }) });
     loadAllocations();
   }

   async function loadSlots() {
     if (!term) return;
     const res = await fetch(`/api/timetable/slots?term=${encodeURIComponent(term)}${klass?`&class_name=${encodeURIComponent(klass)}`:``}`, { credentials: "include", headers: authHeaders });
     if (res.ok) setSlots(await res.json()); else setSlots([]);
     const cf = await fetch(`/api/timetable/conflicts?term=${encodeURIComponent(term)}`, { credentials: "include", headers: authHeaders });
     if (cf.ok) { const data = await cf.json(); setConflicts(data.conflicts || []); }
   }

   async function addSlot(day: string, period_index: number, subject: string) {
     if (!term || !klass || !subject) return;
     await fetch(`/api/timetable/slots`, { method: "POST", headers: { ...authHeaders, "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ term, day_of_week: day, period_index, class_name: klass, subject }) });
     loadSlots();
   }

   async function deleteSlot(slotId: number) {
     await fetch(`/api/timetable/slots/${slotId}` , { method: "DELETE", headers: { ...authHeaders }, credentials: "include" });
   }

   async function placeWednesdayAssembly() {
     if (!klass) return;
     await addSlot("Wed", 1, "School Assembly");
   }

   async function clearWedP1() {
     if (!klass) return;
     const targets = slots.filter(s => s.class_name === klass && s.day_of_week === "Wed" && s.period_index === 1);
     for (const s of targets) {
       await deleteSlot(s.id);
     }
     await loadSlots();
   }

   React.useEffect(() => { loadConfig(); loadAllocations(); loadSlots(); }, [term, klass]);

   // Build daily grid indexes based on config; if none, assume 10 periods
   const days = config?.days || ["Mon","Tue","Wed","Thu","Fri"];
   const periods = React.useMemo(() => {
     // derive from blocks: sum of periods in blocks with periods key
     const total = (config?.blocks || []).reduce((sum, b: any) => sum + (b.periods ? Number(b.periods) : 0), 0) || 10;
     return Array.from({ length: total }, (_, i) => i + 1);
   }, [config]);

   // Minimal subject entry for planner
   const [subjectInput, setSubjectInput] = React.useState("");

   return (
     <Container maxWidth="lg" sx={{ py: 3 }}>
       <Typography variant="h5" sx={{ mb: 2 }}>Dean • Timetable</Typography>
       {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}
       <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Filters</Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="term-label">Term</InputLabel>
            <Select labelId="term-label" id="term-select" label="Term" value={term} onChange={(e:any)=>setTerm(e.target.value)}>
              <MenuItem value=""><em>Select term</em></MenuItem>
              {terms.map(t => (<MenuItem key={t.id} value={t.name}>{t.name}</MenuItem>))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="class-label">Class</InputLabel>
            <Select labelId="class-label" id="class-select" label="Class" value={klass} onChange={(e:any)=>setKlass(e.target.value)}>
              <MenuItem value=""><em>All / None</em></MenuItem>
              {classes.map(c => (<MenuItem key={c.id} value={c.name}>{c.name}</MenuItem>))}
            </Select>
          </FormControl>
          <Box sx={{ flex: 1 }} />
          <Button variant="outlined" onClick={()=>{
            if (!term || !klass) return;
            const url = `/dean/timetable/print?term=${encodeURIComponent(term)}&class=${encodeURIComponent(klass)}`;
            window.open(url, "_blank");
          }} disabled={!term || !klass}>Open PDF</Button>
        </Stack>
      </Paper>

       <Paper variant="outlined" sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_,v)=>setTab(v)} textColor="primary" indicatorColor="primary" sx={{ px: 1 }}>
          <Tab label="Config" />
          <Tab label="Allocations" />
          <Tab label="Planner" />
        </Tabs>
      </Paper>

       {tab === 0 && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Config</Typography>
          <Stack spacing={2} sx={{ mb: 2 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField id="start-time" label="Start Time" size="small" type="time" value={config?.start_time || "08:30"} onChange={(e)=>setConfig(prev=>prev?{...prev,start_time:e.target.value}: { term, start_time: e.target.value, period_minutes: 40, days: daysSel, blocks: []})} sx={{ minWidth: 180 }} />
             <TextField id="period-minutes" label="Period Minutes" size="small" type="number" value={config?.period_minutes || 40} onChange={(e)=>setConfig(prev=>prev?{...prev,period_minutes:Number(e.target.value)}: { term, start_time: "08:30", period_minutes: Number(e.target.value), days: daysSel, blocks: []})} sx={{ minWidth: 180 }} />
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel id="days-label">Days</InputLabel>
                <Select labelId="days-label" multiple value={daysSel} label="Days" onChange={(e:any)=> setDaysSel(e.target.value as string[])}>
                  {["Mon","Tue","Wed","Thu","Fri"].map(d => (<MenuItem key={d} value={d}>{d}</MenuItem>))}
                </Select>
              </FormControl>
            </Stack>

             <Paper variant="outlined" sx={{ p: 2 }}>
               <Stack spacing={1}>
                 <Typography variant="subtitle2">Blocks</Typography>
                 {blocksUI.map((b, idx) => (
                   <Stack key={idx} direction={{ xs: "column", sm: "row" }} spacing={1}>
                     <TextField size="small" label="Label" value={b.label} onChange={(e)=>{
                       const next = [...blocksUI]; next[idx] = { ...next[idx], label: e.target.value }; setBlocksUI(next);
                     }} sx={{ minWidth: 180 }} />
                     <TextField select size="small" label="Type" value={b.kind} onChange={(e)=>{
                       const next = [...blocksUI]; next[idx] = { ...next[idx], kind: e.target.value as any }; setBlocksUI(next);
                     }} sx={{ minWidth: 140 }}>
                       <MenuItem value="periods">Periods</MenuItem>
                       <MenuItem value="minutes">Minutes</MenuItem>
                     </TextField>
                     <TextField size="small" type="number" label={b.kind === "minutes" ? "Minutes" : "Periods"} value={b.value} onChange={(e)=>{
                       const next = [...blocksUI]; next[idx] = { ...next[idx], value: Number(e.target.value) }; setBlocksUI(next);
                     }} sx={{ minWidth: 140 }} />
                     <Button variant="outlined" color="error" onClick={()=>{ const next = blocksUI.slice(); next.splice(idx,1); setBlocksUI(next); }}>Remove</Button>
                   </Stack>
                 ))}
                 <Button variant="outlined" onClick={()=> setBlocksUI([...blocksUI, { label: "", kind: "periods", value: 1 }])}>Add Block</Button>
               </Stack>
             </Paper>

             <Button variant="contained" disabled={!term} onClick={()=> saveConfig({ start_time: config?.start_time || "08:30", period_minutes: config?.period_minutes || 40 })}>Save Config</Button>
          </Stack>
        </Paper>
      )}

       {tab === 1 && (
         <Box>
           <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }}>
             <TextField size="small" label="Class" value={klass} onChange={(e)=>setKlass(e.target.value)} />
             <Button variant="contained" onClick={loadAllocations}>Refresh</Button>
           </Stack>
           <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
             <Typography variant="subtitle2">Add Allocation</Typography>
             <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1 }}>
               <TextField size="small" label="Class" value={klass} onChange={(e)=>setKlass(e.target.value)} />
               <TextField size="small" label="Subject" value={subjectInput} onChange={(e)=>setSubjectInput(e.target.value)} />
               <TextField size="small" type="number" label="Required / week" defaultValue={1} id="reqpw" />
               <Button variant="outlined" onClick={()=>{
                 const el = document.getElementById("reqpw") as HTMLInputElement | null; const n = Number(el?.value || 1);
                 addAllocation({ class_name: klass, subject: subjectInput, required_per_week: n });
               }} disabled={!klass || !subjectInput}>Add</Button>
             </Stack>
           </Paper>
           <Paper variant="outlined" sx={{ p: 2 }}>
             <Typography variant="subtitle2">Allocations</Typography>
             {allocations.length === 0 && <Typography color="text.secondary">No allocations</Typography>}
             {allocations.map(a => (
               <Typography key={a.id}>{a.class_name} • {a.subject} • {a.required_per_week}/wk</Typography>
             ))}
           </Paper>
         </Box>
       )}

       {tab === 2 && (
         <Box>
           <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }}>
             <TextField size="small" label="Subject to place" value={subjectInput} onChange={(e)=>setSubjectInput(e.target.value)} />
             <Button variant="contained" onClick={loadSlots}>Refresh Grid</Button>
             <Button variant="outlined" onClick={placeWednesdayAssembly} disabled={!klass}>Place Wed Assembly</Button>
             <Button variant="text" color="error" onClick={clearWedP1} disabled={!klass}>Clear Wed P1</Button>
           </Stack>
           <Grid container spacing={1}>
             <Grid item xs={12}>
               <Paper variant="outlined" sx={{ p: 1, overflow: "auto" }}>
                 <table style={{ width: "100%", borderCollapse: "collapse" }}>
                   <thead>
                     <tr>
                       <th style={{ textAlign:"left", padding:4 }}>Period</th>
                       {days.map(d => <th key={d} style={{ textAlign:"left", padding:4 }}>{d}</th>)}
                     </tr>
                   </thead>
                   <tbody>
                     {periods.map(p => (
                       <tr key={p}>
                         <td style={{ padding:4 }}>P{p}</td>
                         {days.map(d => {
                           const cell = slots.filter(s => (!klass || s.class_name===klass) && s.day_of_week===d && s.period_index===p);
                           return (
                             <td key={d+String(p)} style={{ padding:4, border:"1px solid #eee" }}>
                               <Stack spacing={0.5}>
                                 {cell.map(s => (<span key={s.id}>{s.class_name}: {s.subject}</span>))}
                                 <Button size="small" variant="outlined" onClick={()=>addSlot(d, p, subjectInput)} disabled={!subjectInput || !klass}>Add</Button>
                               </Stack>
                             </td>
                           );
                         })}
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </Paper>
             </Grid>
             <Grid item xs={12}>
               <Paper variant="outlined" sx={{ p: 2 }}>
                 <Typography variant="subtitle2">Conflicts</Typography>
                 {conflicts.length===0 && <Typography color="text.secondary">No conflicts</Typography>}
                 {conflicts.map((c, idx) => (
                   <Typography key={idx}>{c.type} • {c.class_name || c.teacher_id || c.room || ''} • {c.day ? `${c.day} P${c.period_index}` : ''}</Typography>
                 ))}
               </Paper>
             </Grid>
           </Grid>
         </Box>
       )}
     </Container>
   );
 }
