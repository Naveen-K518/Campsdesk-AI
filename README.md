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
campsdesk-ai/
├── android/               # Native Android configuration & build wrapper
├── assets/                # App icons, splash screens, and image assets
├── src/
│   ├── components/
│   │   ├── cards/         # QueryCard, UploadCard
│   │   ├── chat/          # ChatBubble, SuggestedPromptChips
│   │   ├── common/        # AgenticStatusBar, GlobalTopBar, PrimaryButton, StatusChip, etc.
│   │   ├── navigation/    # Custom BottomTabBar, TabButtons
│   │   └── workflow/      # EscalationTimeline, WorkflowStepList
│   ├── context/           # Global QueryContext & State Handlers
│   ├── data/              # Initial Mock Data & Academic Fixtures
│   ├── navigation/        # RootNavigator, BottomTabNavigator, Param Types
│   ├── screens/
│   │   ├── AskAI/         # AI Chat & Multimodal Query Interface
│   │   ├── Auth/          # Campus SSO / Student Login
│   │   ├── Detail/        # Detailed Query & Multi-Agent Escalation View
│   │   ├── Guidelines/    # Academic Policy & Rulebook Explorer
│   │   ├── History/       # Searchable Past Queries & Filtering
│   │   ├── Home/          # Executive Dashboard & Live Agent Monitor
│   │   ├── Profile/       # Student Information & Preferences
│   │   └── Splash/        # Animated Cyber Splash Screen
│   ├── theme/             # Color Palette, Typography & Component Tokens
│   └── types/             # TypeScript Schemas & Type Definitions
├── App.tsx                # App Entry Point & Provider Hierarchy
├── app.json               # Expo Configuration
├── package.json           # Dependencies & Scripts
└── tsconfig.json          # TypeScript Compiler Options
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Expo Go](https://expo.dev/client) app on your mobile device (iOS or Android) OR an Android/iOS Emulator

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Naveen-K518/Campsdesk-AI.git
   cd Campsdesk-AI
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npx expo start
   ```

4. **Run on specific platforms**:
   - **Android**: Press `a` in the terminal or run `npm run android`
   - **iOS**: Press `i` in the terminal or run `npm run ios`
   - **Web**: Press `w` in the terminal or run `npm run web`

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
