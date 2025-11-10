"use client";

import * as React from "react";
import { Container, Typography, Paper } from "@mui/material";

export default function AboutPage() {
  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>About Elite Parent School MIS</Typography>
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography paragraph>
          Elite Parent School MIS is a modern, modular management system designed to streamline academic and administrative workflows.
        </Typography>
        <Typography paragraph>
          It supports role-based access for Directors, Dean (Director of Studies), Teachers, Secretary, Accountants, Discipline team, Patrons and Matrons, and Students.
        </Typography>
        <Typography paragraph>
          Modules include Admissions, Academics (assessments and report cards), Accounting (fees, expenses, payroll), Discipline & Welfare, and Analytics.
        </Typography>
      </Paper>
    </Container>
  );
}
