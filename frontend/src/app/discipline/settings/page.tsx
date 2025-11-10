"use client";

import * as React from "react";
import { Container, Typography, Paper } from "@mui/material";

export default function DisciplineSettingsPage() {
  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Discipline Settings</Typography>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          No configurable items yet. Role-based access: Director of Discipline, Patron, and Matron may create/update cases. Dean/DOS have read-only access.
        </Typography>
      </Paper>
    </Container>
  );
}
