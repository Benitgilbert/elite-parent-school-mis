"use client";

import * as React from "react";
import Grid from "@mui/material/Grid";
import { Container, Typography, Tabs, Tab, Box, Paper, Stack, TextField, Button, Alert, Table, TableHead, TableRow, TableCell, TableBody, Card, CardContent } from "@mui/material";

// Helpers
function a11yProps(index: number) {
  return { id: `tab-${index}`, "aria-controls": `tabpanel-${index}` } as const;
}

export default function SecretarySettingsPage() {
  const [tab, setTab] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const gradingExample = React.useMemo(() => `[{"min":0, "max":39, "grade":"F", "point":0}, {"min":40, "max":49, "grade":"D", "point":1}]`, []);

  const authHeaders = React.useMemo(() => {
    try {
      const t = localStorage.getItem("access_token");
      return t ? { Authorization: `Bearer ${t}` } : {};
    } catch {
      return {} as Record<string, string>;
    }
  }, []);

  

  // Terms state
  const [terms, setTerms] = React.useState<any[]>([]);
  const [termForm, setTermForm] = React.useState({ name: "", start_date: "", end_date: "" });

  // Classes state
  const [classes, setClasses] = React.useState<any[]>([]);
  const [classForm, setClassForm] = React.useState({ name: "", capacity: "" });

  // Grading state
  const [scales, setScales] = React.useState<any[]>([]);
  const [scaleForm, setScaleForm] = React.useState({ name: "", items_json: "[]" });

  async function loadAll() {
    setError(null);
    try {
      const [rt, rc, rg] = await Promise.all([
        fetch("/api/settings/academics/terms", { credentials: "include", headers: authHeaders }),
        fetch("/api/settings/academics/classes", { credentials: "include", headers: authHeaders }),
        fetch("/api/settings/academics/grading-scales", { credentials: "include", headers: authHeaders }),
      ]);
      if (!rt.ok || !rc.ok || !rg.ok) throw new Error("Unauthorized or server error");
      setTerms(await rt.json());
      setClasses(await rc.json());
      setScales(await rg.json());
    } catch (e: any) {
      setError(e.message || "Failed to load settings");
    }
  }

  React.useEffect(() => { loadAll(); }, []);

  // CRUD handlers
  async function createTerm() {
    const res = await fetch("/api/settings/academics/terms", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", ...authHeaders }, body: JSON.stringify(termForm) });
    if (!res.ok) { setError(`Create term failed (${res.status})`); return; }
    setTermForm({ name: "", start_date: "", end_date: "" });
    await loadAll();
  }
  async function saveTerm(t: any) {
    const res = await fetch(`/api/settings/academics/terms/${t.id}`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json", ...authHeaders }, body: JSON.stringify(t) });
    if (!res.ok) { setError(`Save term failed (${res.status})`); return; }
    await loadAll();
  }
  async function deleteTerm(id: number) {
    const res = await fetch(`/api/settings/academics/terms/${id}`, { method: "DELETE", credentials: "include", headers: authHeaders });
    if (!res.ok && res.status !== 204) { setError(`Delete term failed (${res.status})`); return; }
    await loadAll();
  }

  async function createClass() {
    const payload = { name: classForm.name, capacity: classForm.capacity ? Number(classForm.capacity) : null };
    const res = await fetch("/api/settings/academics/classes", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", ...authHeaders }, body: JSON.stringify(payload) });
    if (!res.ok) { setError(`Create class failed (${res.status})`); return; }
    setClassForm({ name: "", capacity: "" });
    await loadAll();
  }
  async function saveClass(c: any) {
    const res = await fetch(`/api/settings/academics/classes/${c.id}`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json", ...authHeaders }, body: JSON.stringify(c) });
    if (!res.ok) { setError(`Save class failed (${res.status})`); return; }
    await loadAll();
  }
  async function deleteClass(id: number) {
    const res = await fetch(`/api/settings/academics/classes/${id}`, { method: "DELETE", credentials: "include", headers: authHeaders });
    if (!res.ok && res.status !== 204) { setError(`Delete class failed (${res.status})`); return; }
    await loadAll();
  }

  function isValidJSON(s: string) {
    try { JSON.parse(s); return true; } catch { return false; }
  }
  async function createScale() {
    if (!isValidJSON(scaleForm.items_json || "[]")) { setError("Invalid items JSON"); return; }
    const res = await fetch("/api/settings/academics/grading-scales", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", ...authHeaders }, body: JSON.stringify(scaleForm) });
    if (!res.ok) { setError(`Create grading scale failed (${res.status})`); return; }
    setScaleForm({ name: "", items_json: "[]" });
    await loadAll();
  }
  async function saveScale(gs: any) {
    if (!isValidJSON(gs.items_json || "[]")) { setError("Invalid items JSON"); return; }
    const res = await fetch(`/api/settings/academics/grading-scales/${gs.id}`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json", ...authHeaders }, body: JSON.stringify(gs) });
    if (!res.ok) { setError(`Save grading scale failed (${res.status})`); return; }
    await loadAll();
  }
  async function deleteScale(id: number) {
    const res = await fetch(`/api/settings/academics/grading-scales/${id}`, { method: "DELETE", credentials: "include", headers: authHeaders });
    if (!res.ok && res.status !== 204) { setError(`Delete grading scale failed (${res.status})`); return; }
    await loadAll();
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Settings • Academics</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Terms" {...a11yProps(0)} />
        <Tab label="Classes" {...a11yProps(1)} />
        <Tab label="Grading Scales" {...a11yProps(2)} />
      </Tabs>

      {tab === 0 && (
        <Box role="tabpanel" id="tabpanel-0">
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Create Term</Typography>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                    <TextField size="small" label="Name" value={termForm.name} onChange={(e) => setTermForm({ ...termForm, name: e.target.value })} />
                    <TextField size="small" label="Start" type="date" InputLabelProps={{ shrink: true }} value={termForm.start_date} onChange={(e) => setTermForm({ ...termForm, start_date: e.target.value })} />
                    <TextField size="small" label="End" type="date" InputLabelProps={{ shrink: true }} value={termForm.end_date} onChange={(e) => setTermForm({ ...termForm, end_date: e.target.value })} />
                    <Button variant="contained" onClick={createTerm} disabled={!termForm.name}>Create</Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid xs={12}>
              <Paper variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Start</TableCell>
                      <TableCell>End</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {terms.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>
                          <TextField size="small" value={t.name} onChange={(e) => setTerms((arr) => arr.map((x) => x.id === t.id ? { ...x, name: e.target.value } : x))} />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" type="date" InputLabelProps={{ shrink: true }} value={t.start_date || ""} onChange={(e) => setTerms((arr) => arr.map((x) => x.id === t.id ? { ...x, start_date: e.target.value } : x))} />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" type="date" InputLabelProps={{ shrink: true }} value={t.end_date || ""} onChange={(e) => setTerms((arr) => arr.map((x) => x.id === t.id ? { ...x, end_date: e.target.value } : x))} />
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button size="small" onClick={() => saveTerm(t)}>Save</Button>
                            <Button size="small" color="error" onClick={() => deleteTerm(t.id)}>Delete</Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                    {terms.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4}><Typography color="text.secondary">No terms</Typography></TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {tab === 1 && (
        <Box role="tabpanel" id="tabpanel-1">
          <Grid container spacing={2}>
            <Grid xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Create Class</Typography>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                    <TextField size="small" label="Name" value={classForm.name} onChange={(e) => setClassForm({ ...classForm, name: e.target.value })} />
                    <TextField size="small" label="Capacity" type="number" value={classForm.capacity} onChange={(e) => setClassForm({ ...classForm, capacity: e.target.value })} />
                    <Button variant="contained" onClick={createClass} disabled={!classForm.name}>Create</Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid xs={12}>
              <Paper variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Capacity</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {classes.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <TextField size="small" value={c.name} onChange={(e) => setClasses((arr) => arr.map((x) => x.id === c.id ? { ...x, name: e.target.value } : x))} />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" type="number" value={c.capacity ?? ""} onChange={(e) => setClasses((arr) => arr.map((x) => x.id === c.id ? { ...x, capacity: Number(e.target.value) } : x))} />
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button size="small" onClick={() => saveClass(c)}>Save</Button>
                            <Button size="small" color="error" onClick={() => deleteClass(c.id)}>Delete</Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                    {classes.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3}><Typography color="text.secondary">No classes</Typography></TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {tab === 2 && (
        <Box role="tabpanel" id="tabpanel-2">
          <Grid container spacing={2}>
            <Grid xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Create Grading Scale</Typography>
                  <Stack spacing={1}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                      <TextField size="small" label="Name" value={scaleForm.name} onChange={(e) => setScaleForm({ ...scaleForm, name: e.target.value })} />
                      <Button variant="contained" onClick={createScale} disabled={!scaleForm.name || !isValidJSON(scaleForm.items_json)}>Create</Button>
                    </Stack>
                    <TextField size="small" label="Items JSON" fullWidth multiline minRows={3} value={scaleForm.items_json} onChange={(e) => setScaleForm({ ...scaleForm, items_json: e.target.value })} helperText={gradingExample} />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid xs={12}>
              <Paper variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Items JSON</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {scales.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <TextField size="small" value={s.name} onChange={(e) => setScales((arr) => arr.map((x) => x.id === s.id ? { ...x, name: e.target.value } : x))} />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" fullWidth multiline minRows={3} value={s.items_json} onChange={(e) => setScales((arr) => arr.map((x) => x.id === s.id ? { ...x, items_json: e.target.value } : x))} />
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button size="small" onClick={() => saveScale(s)} disabled={!isValidJSON(s.items_json)}>Save</Button>
                            <Button size="small" color="error" onClick={() => deleteScale(s.id)}>Delete</Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                    {scales.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3}><Typography color="text.secondary">No grading scales</Typography></TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}
    </Container>
  );
}
