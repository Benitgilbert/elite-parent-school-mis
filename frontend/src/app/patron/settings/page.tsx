"use client";

import * as React from "react";
import { Container, Typography, Paper } from "@mui/material";

export default function PatronSettingsPage() {
  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Patron Settings</Typography>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          No configurable items yet. Patrons can create/update discipline cases for boys; reports are available read-only for other roles.
        </Typography>
      </Paper>
    </Container>
  );
}
