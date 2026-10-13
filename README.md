# CampusDesk AI 🎓⚡

> **Intelligent Autonomous Campus Assistance & Grievance Resolution Platform**  
> Built with React Native, Expo, TypeScript, and Agentic AI Architecture.

---

## 🌟 Overview

**CampusDesk AI** is a state-of-the-art mobile application designed to streamline student queries, administrative requests, and academic grievances through autonomous, multi-agent intelligence. From real-time query categorization and sentiment detection to automated multi-tier escalation timelines, CampusDesk AI provides students and university staff with an efficient, transparent, and responsive support ecosystem.

---

## ✨ Key Features

- **🤖 Multi-Agent AI System**: Real-time status reporting showing orchestrator and specialized agent tasks (routing, policy retrieval, sentiment analysis, escalation).
- **💬 Interactive AI Chat**: Natural language query submission with interactive suggested prompts, context-aware reasoning, and document attachment capabilities.
- **📊 Real-Time Query Tracking**: Instant visibility into query status (`Active`, `Escalated`, `Resolved`, `Pending Review`) with dynamic timeline milestones.
- **📈 Analytics Dashboard**: Live metrics for student engagement, resolution rates, pending queries, and active agent statuses.
- **📄 Document Uploads**: Seamlessly attach fee receipts, medical certificates, appeal letters, and PDF documents for AI analysis.
- **📑 Campus Guidelines & Policies**: Instant, AI-indexed access to university handbooks, exam policies, hostel regulations, and grading rubrics.
- **🔔 Notifications & Escalation Alerts**: Timely updates on ticket movements, committee reviews, and response timelines.
- **🎨 Premium Dark Theme**: Handcrafted cyber-modern aesthetic with glassmorphic cards, luminous gradients, and smooth micro-interactions.

---

## 🛠️ Tech Stack

- **Framework**: [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/) (SDK 52)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Navigation**: [React Navigation v7](https://reactnavigation.org/) (Native Stack & Bottom Tabs)
- **Styling & UI**: Custom Design System with Linear Gradients (`expo-linear-gradient`) and Lucide / Material Community Vectors (`@expo/vector-icons`)
- **State Management**: React Context API (`QueryContext`)
- **Persistence**: `@react-native-async-storage/async-storage`

---

## 📁 Project Structure

```text
Campsdesk-AI/
├── frontend/              # Mobile Client (React Native + Expo)
│   ├── android/           # Native Android configuration
│   ├── assets/            # App icons, splash screens, and images
│   ├── src/
│   │   ├── components/    # Reusable UI cards, chat bubbles, buttons
│   │   ├── context/       # Global QueryContext & State Handlers
│   │   ├── data/          # Academic fixtures & guidelines
│   │   ├── navigation/    # Stack & Tab Navigators
│   │   ├── screens/       # AskAI, Home, Guidelines, History, Profile
│   │   ├── theme/         # Color palette & styling tokens
│   │   └── types/         # TypeScript schemas & interfaces
│   ├── App.tsx            # App Entry Point & Provider Hierarchy
│   ├── app.json           # Expo Configuration
│   ├── package.json       # Frontend dependencies & scripts
│   └── tsconfig.json      # Frontend TypeScript configuration
├── admin-portal/          # Enterprise Administration Console (React + Vite + Tailwind + shadcn/ui)
│   ├── src/
│   │   ├── components/    # Layout, Sidebar, TopBar, shadcn/ui primitives
│   │   ├── context/       # AuthContext (admin-only barrier) & ThemeContext
│   │   ├── pages/         # Dashboard, Mentors, Students, Assignments, Queries, Documents, Settings
│   │   └── lib/           # Typed REST API client & utils
│   ├── package.json       # Admin portal dependencies
│   ├── vite.config.ts     # Vite bundler configuration
│   └── .env.example       # API endpoint template (VITE_API_URL)
├── backend/               # Server & AI Orchestration API
│   ├── src/
│   │   ├── routes/        # Auth, Queries, Mentors, AI & Guidelines endpoints
│   │   ├── services/      # Gemini AI & Socket.io real-time updates
│   │   └── server.ts      # Express application entry point
│   ├── package.json       # Backend dependencies
│   ├── tsconfig.json      # Backend TypeScript configuration
│   └── .env.example       # API keys configuration template
└── db/                    # Database Schemas & Seed Data
    ├── schemas/
    │   └── schema.sql     # SQL DDL schemas (students, queries, mentor_assignments, guidelines)
    ├── seeds/
    │   ├── guidelines.json# University bylaws & guidelines seed
    │   └── students.json  # Sample student profiles (~12 students)
    └── README.md          # Database documentation
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

---

### 1. Running the Backend API

```bash
cd backend
npm install
npm run dev
```

* Backend server runs on `http://localhost:5000` with SQLite database, Socket.io real-time feeds, and REST endpoints.

---

### 2. Running the Mobile Application (Student & Mentor Client)

```bash
cd frontend
npm install
npx expo start
```

* **Web**: Press `w` in terminal or open `http://localhost:8081`
* **Android**: Press `a` in terminal or run `npm run android`
* **iOS**: Press `i` in terminal or run `npm run ios`

---

### 3. Running the Admin Portal (Administrator Web Console)

```bash
cd admin-portal
npm install
npm run dev
```

* Launches at `http://localhost:5173`.
* Restricted to **admin** accounts (demo credentials: `admin@campus.edu` / `admin123`). Mentor and student accounts are strictly rejected.


---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
