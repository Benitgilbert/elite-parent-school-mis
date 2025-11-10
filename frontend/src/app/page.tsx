"use client";

import * as React from "react";
import Link from "next/link";
import { Container, Box, Typography, Stack, Button, Paper, Grid, Chip } from "@mui/material";

export default function Home() {
  return (
    <main>
      <Box sx={{ bgcolor: "#0f172a", color: "#fff", py: 8 }}>
        <Container maxWidth="lg">
          <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>Elite Parent School MIS</Typography>
          <Typography variant="h6" sx={{ color: "#cbd5e1", mb: 3 }}>
            A modern, role-based school management system for academics, finance, discipline and more.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Button component={Link as any} href="/login" variant="contained" color="primary" size="large">Login</Button>
            <Button component={Link as any} href="/apply" variant="outlined" color="inherit" size="large">Apply for Admission</Button>
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 2 }}>
            <Button component={Link as any} href="/about" variant="text" color="inherit">About</Button>
            <Button component={Link as any} href="/admission" variant="text" color="inherit">Admission</Button>
            <Button component={Link as any} href="/contact" variant="text" color="inherit">Contact</Button>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Paper variant="outlined" sx={{ p: 2, height: "100%" }}>
              <Typography variant="h6" sx={{ mb: 1 }}>Academics</Typography>
              <Typography color="text.secondary">Assessments, report cards, and performance analytics to improve learning outcomes.</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper variant="outlined" sx={{ p: 2, height: "100%" }}>
              <Typography variant="h6" sx={{ mb: 1 }}>Accounting</Typography>
              <Typography color="text.secondary">Transparent school finance: fees, expenses, and payroll with clear reporting.</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper variant="outlined" sx={{ p: 2, height: "100%" }}>
              <Typography variant="h6" sx={{ mb: 1 }}>Discipline & Welfare</Typography>
              <Typography color="text.secondary">Track and resolve student cases with care and confidentiality.</Typography>
            </Paper>
          </Grid>
        </Grid>
        <Paper variant="outlined" sx={{ p: 3, mt: 4 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Get Started</Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button component={Link as any} href="/apply" variant="contained">Apply Now</Button>
            <Button component={Link as any} href="/apply/status" variant="outlined">Check Application Status</Button>
            <Button component={Link as any} href="/about" variant="text">Learn More</Button>
            <Button component={Link as any} href="/contact" variant="text">Contact</Button>
          </Stack>
        </Paper>
      </Container>
    </main>
  );
}
