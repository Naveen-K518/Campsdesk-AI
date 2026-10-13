# CampusDesk AI - Administrative Console 🛡️🏛️

> **Enterprise Administrative Web Application for CampusDesk AI**  
> Built with React + Vite, TypeScript, Tailwind CSS, shadcn/ui components, React Router, TanStack Query, and Lucide icons.

---

## 🌟 Overview

The **CampusDesk AI Admin Portal** provides university administration with centralized oversight and control across:
- **Faculty Mentors**: Monitor academic mentor quotas and load distributions (`MAX_MENTEES_PER_MENTOR = 20`).
- **Enrolled Students**: Track student records, program details, and 1:1 mentor assignments.
- **Mentor Assignments**: Interactive pairing engine with automatic enforcement of the 20-mentee cap.
- **Queries & Docket Triage**: Universal ticket queue with instant alerting for unassigned student queries and administrative status overrides.
- **Documents & Bylaws**: University regulations, attendance condonation criteria, and exam guidelines.
- **System Settings**: Topology and environment inspection for the 3-role engine (`student`, `mentor`, `admin`).

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Framework & Build** | [React 19 / 18](https://react.dev/) + [Vite](https://vite.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| **Styling** | [Tailwind CSS v3.4](https://tailwindcss.com/) + PostCSS + Autoprefixer |
| **Component Architecture** | [shadcn/ui](https://ui.shadcn.com/) design system tokens & primitives |
| **Navigation** | [React Router v6](https://reactrouter.com/) (Browser Router, Protected Routes) |
| **Data Fetching & Cache** | [TanStack React Query v5](https://tanstack.com/query/latest) |
| **Iconography** | [Lucide React](https://lucide.dev/) |
| **Theme System** | Dual Light & Dark mode with persistent CSS variables |

---

## 🚀 Getting Started

### 1. Environment Configuration

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Ensure `VITE_API_URL` points to your running backend:
```env
VITE_API_URL=http://localhost:5000
```

### 2. Install Dependencies

```bash
cd admin-portal
npm install
```

### 3. Run Development Server

```bash
npm run dev
```

The portal will launch at:  
👉 **`http://localhost:5173`**

### 4. Build for Production

```bash
npm run build
```

---

## 🛡️ Authentication & Role Security

This portal is **strictly restricted to users with the `admin` role**.

- **Protected Route Guards**: Unauthenticated requests are immediately redirected to `/login`.
- **Role Rejection Barrier**: Attempting to authenticate with `student` or `mentor` credentials will be rejected with an explicit security alert:  
  *"Access Denied: You are signed in as a [Role]. This administrative portal is strictly restricted to System Administrators. Mentors and Students must use the CampusDesk mobile application."*

### Demo Credentials

| Role | Email | Password | Allowed? |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@campus.edu` | `admin123` | ✅ **Authorized** |
| **Mentor (Test)** | `faculty@campus.edu` | `faculty123` | ❌ Rejected (Mobile only) |
| **Student (Test)** | `kishorkumarp.cs24@bitsathy.ac.in` | `password123` | ❌ Rejected (Mobile only) |

*(Quick-autofill buttons for each account are available on the login page for testing).*

---

## 📁 Application Structure

```text
admin-portal/
├── public/                 # Favicons & static assets
├── src/
│   ├── components/
│   │   ├── auth/           # ProtectedRoute wrapper
│   │   ├── common/         # StateView (Loading skeletons, empty & error states)
│   │   ├── layout/         # AppLayout, Sidebar (fixed left), TopBar
│   │   └── ui/             # shadcn/ui components (Button, Input, Card, Badge, Table)
│   ├── context/
│   │   ├── AuthContext.tsx # JWT token management & admin role validation
│   │   └── ThemeContext.tsx# Dark/Light mode theme state
│   ├── lib/
│   │   ├── api.ts          # Typed REST API client for backend
│   │   └── utils.ts        # cn helper (clsx + tailwind-merge)
│   ├── pages/
│   │   ├── Assignments/    # 1:1 mentor assignment management & quota rejection
│   │   ├── Dashboard/      # Live KPI metrics, capacity roster, triage alerts
│   │   ├── Documents/      # Guidelines & bylaws viewer
│   │   ├── Login/          # Admin-only authentication screen
│   │   ├── Mentors/        # Faculty mentors list & progress bars
│   │   ├── Queries/        # Universal docket triage queue
│   │   ├── Settings/       # Environment & role engine configuration
│   │   └── Students/       # Student roster & mentor pairing status
│   ├── App.tsx             # Root router & QueryClientProvider
│   ├── index.css           # Institutional slate + deep blue design tokens
│   └── main.tsx            # Entry point
├── index.html              # HTML document template
├── tailwind.config.js      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
└── vite.config.ts          # Vite configuration
```
