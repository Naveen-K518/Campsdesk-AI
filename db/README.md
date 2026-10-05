# Database (`db/`)

This directory contains database schemas, models, and seed data for the **CampusDesk AI** platform.

## Structure

```
db/
├── schemas/
│   └── schema.sql        # SQL DDL schemas for Students, Guidelines, Queries, Workflows, and Audits
├── seeds/
│   ├── guidelines.json   # Seed data for university bylaws and guidelines
│   └── students.json     # Sample student profiles for testing
└── README.md
```

## Tables Overview

1. **`students`**: Student details (roll number, program, year, contact, CGPA, attendance).
2. **`guidelines`**: University guidelines and policies (e.g., Sec 4.2 Medical Leave Condonation, Sec 6.1 Hostel Curfew).
3. **`queries`**: AI-generated dockets and student assistance tickets.
4. **`workflow_steps`**: Multi-step autonomous resolution execution steps.
5. **`audit_entries`**: Immutable audit logs of administrative actions.
