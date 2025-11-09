"use client";

import * as React from "react";
import Grid from "@mui/material/Grid";
import { Container, Typography, Card, CardContent, Paper, Table, TableHead, TableRow, TableCell, TableBody, TextField, Stack, Button, Alert } from "@mui/material";

 type Template = { id: number; key: string; description?: string | null; subject: string; text_body?: string | null; html_body?: string | null };

 export default function CommunicationsPage() {
   const [items, setItems] = React.useState<Template[]>([]);
   const [error, setError] = React.useState<string | null>(null);
   const [loading, setLoading] = React.useState(false);
   const [form, setForm] = React.useState<Partial<Template>>({ key: "", subject: "", description: "", text_body: "", html_body: "" });

   const [sendTo, setSendTo] = React.useState("");
   const [sendKey, setSendKey] = React.useState("");
   const [sendSubject, setSendSubject] = React.useState("");
   const [sendText, setSendText] = React.useState("");
   const [sendHtml, setSendHtml] = React.useState("");
   const [sendParams, setSendParams] = React.useState("{}");
   const [sending, setSending] = React.useState(false);

   const authHeaders = React.useMemo(() => {
     try {
       const t = localStorage.getItem("access_token");
       return t ? { Authorization: `Bearer ${t}` } : {};
     } catch {
       return {} as Record<string, string>;
     }
   }, []);

   async function load() {
     setError(null);
     setLoading(true);
     try {
       const res = await fetch(`/api/comm/templates`, { credentials: "include", headers: authHeaders });
       if (!res.ok) throw new Error(`HTTP ${res.status}`);
       setItems(await res.json());
     } catch (e: any) {
       setError(e.message || "Failed to load templates");
     } finally {
       setLoading(false);
     }
   }

   React.useEffect(() => { load(); }, []);

   async function create() {
     setError(null);
     const payload = { ...form } as any;
     const res = await fetch(`/api/comm/templates`, {
       method: "POST",
       credentials: "include",
       headers: { "Content-Type": "application/json", ...authHeaders },
       body: JSON.stringify(payload),
     });
     if (!res.ok) {
       const body = await res.json().catch(() => ({}));
       setError(body?.detail ?? `Create failed (${res.status})`);
       return;
     }
     setForm({ key: "", subject: "", description: "", text_body: "", html_body: "" });
     await load();
   }

   async function update(t: Template) {
     const res = await fetch(`/api/comm/templates/${t.id}`, {
       method: "PUT",
       credentials: "include",
       headers: { "Content-Type": "application/json", ...authHeaders },
       body: JSON.stringify(t),
     });
     if (!res.ok) {
       const body = await res.json().catch(() => ({}));
       setError(body?.detail ?? `Update failed (${res.status})`);
     } else {
       await load();
     }
   }

   async function del(id: number) {
     const res = await fetch(`/api/comm/templates/${id}`, { method: "DELETE", credentials: "include", headers: authHeaders });
     if (!res.ok && res.status !== 204) {
       setError(`Delete failed (${res.status})`);
     } else {
       await load();
     }
   }

   async function send() {
     setSending(true);
     setError(null);
     try {
       const params = JSON.parse(sendParams || "{}");
       const payload: any = { to: sendTo, params };
       if (sendKey) payload.key = sendKey; else { payload.subject = sendSubject; payload.text_body = sendText; payload.html_body = sendHtml; }
       const res = await fetch(`/api/comm/send`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", ...authHeaders }, body: JSON.stringify(payload) });
       if (!res.ok) throw new Error(`HTTP ${res.status}`);
     } catch (e: any) {
       setError(e.message || "Failed to send");
     } finally {
       setSending(false);
     }
   }

   return (
     <Container maxWidth="lg" sx={{ py: 3 }}>
       <Typography variant="h5" sx={{ mb: 2 }}>Communications</Typography>
       {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
       <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
           <Card>
             <CardContent>
               <Typography variant="h6" gutterBottom>Templates</Typography>
               <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                 <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                   <TextField label="Key" size="small" value={form.key || ""} onChange={(e) => setForm({ ...form, key: e.target.value })} />
                   <TextField label="Subject" size="small" value={form.subject || ""} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
                   <TextField label="Description" size="small" value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                   <Button variant="contained" onClick={create} disabled={!form.key || !form.subject}>Create</Button>
                 </Stack>
                 <Stack sx={{ mt: 1 }} spacing={1}>
                   <TextField label="Text Body" size="small" fullWidth multiline minRows={2} value={form.text_body || ""} onChange={(e) => setForm({ ...form, text_body: e.target.value })} />
                   <TextField label="HTML Body" size="small" fullWidth multiline minRows={2} value={form.html_body || ""} onChange={(e) => setForm({ ...form, html_body: e.target.value })} />
                 </Stack>
               </Paper>
               <Paper variant="outlined">
                 <Table size="small">
                   <TableHead>
                     <TableRow>
                       <TableCell>Key</TableCell>
                       <TableCell>Subject</TableCell>
                       <TableCell>Description</TableCell>
                       <TableCell align="right">Actions</TableCell>
                     </TableRow>
                   </TableHead>
                   <TableBody>
                     {items.map((t) => (
                       <TableRow key={t.id}>
                         <TableCell>
                           <TextField size="small" value={t.key} onChange={(e) => setItems((arr) => arr.map((x) => x.id === t.id ? { ...x, key: e.target.value } : x))} />
                         </TableCell>
                         <TableCell>
                           <TextField size="small" value={t.subject} onChange={(e) => setItems((arr) => arr.map((x) => x.id === t.id ? { ...x, subject: e.target.value } : x))} />
                         </TableCell>
                         <TableCell>
                           <TextField size="small" value={t.description || ""} onChange={(e) => setItems((arr) => arr.map((x) => x.id === t.id ? { ...x, description: e.target.value } : x))} />
                         </TableCell>
                         <TableCell align="right">
                           <Stack direction="row" spacing={1} justifyContent="flex-end">
                             <Button size="small" onClick={() => update(t)}>Save</Button>
                             <Button size="small" color="error" onClick={() => del(t.id)}>Delete</Button>
                           </Stack>
                         </TableCell>
                       </TableRow>
                     ))}
                     {items.length === 0 && (
                       <TableRow>
                         <TableCell colSpan={4}><Typography color="text.secondary">No templates</Typography></TableCell>
                       </TableRow>
                     )}
                   </TableBody>
                 </Table>
               </Paper>
             </CardContent>
           </Card>
         </Grid>
        <Grid item xs={12} md={5}>
           <Card>
             <CardContent>
               <Typography variant="h6" gutterBottom>Send Test</Typography>
               <Stack spacing={1}>
                 <TextField label="To (email)" size="small" value={sendTo} onChange={(e) => setSendTo(e.target.value)} />
                 <TextField label="Template Key (optional)" size="small" value={sendKey} onChange={(e) => setSendKey(e.target.value)} />
                 <TextField label="Subject (if no key)" size="small" value={sendSubject} onChange={(e) => setSendSubject(e.target.value)} />
                 <TextField label="Text Body (optional)" size="small" multiline minRows={2} value={sendText} onChange={(e) => setSendText(e.target.value)} />
                 <TextField label="HTML Body (optional)" size="small" multiline minRows={2} value={sendHtml} onChange={(e) => setSendHtml(e.target.value)} />
                 <TextField label="Params JSON (optional)" size="small" multiline minRows={2} value={sendParams} onChange={(e) => setSendParams(e.target.value)} />
                 <Button variant="contained" onClick={send} disabled={sending || !sendTo}>Send</Button>
               </Stack>
             </CardContent>
           </Card>
         </Grid>
       </Grid>
     </Container>
   );
 }
