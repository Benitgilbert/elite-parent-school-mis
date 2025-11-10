"use client";

import * as React from "react";
import { Container, Typography, Paper, Stack, Link as MuiLink } from "@mui/material";
import Link from "next/link";

export default function DirectorSettingsPage() {
  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Director Settings</Typography>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Available Administration Areas</Typography>
        <Stack>
          <MuiLink component={Link} href="/accountant/settings">Accounting Settings (Categories, Payment Methods)</MuiLink>
          <MuiLink component={Link} href="/dean/settings">Academics Settings (Terms, Classes, Grading Scales)</MuiLink>
          <MuiLink component={Link} href="/admin">Admin Tools</MuiLink>
        </Stack>
      </Paper>
    </Container>
  );
}
