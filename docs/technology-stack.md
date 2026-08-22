# CMADMS — Technology Stack

This table documents the actual technology stack and libraries utilized in CMADMS, based on `package.json` and system configuration.

---

| Layer / Subsystem | Actual Technology | Version | Purpose in CMADMS |
| :--- | :--- | :---: | :--- |
| **Frontend Framework** | React | `^19.2.0` | UI component rendering engine |
| **Meta-Framework** | TanStack Start | `1.168.32` | Full-stack SSR and server functions framework |
| **Routing** | TanStack React Router | `1.170.18` | Type-safe file-based client & server routing |
| **Styling & Design** | Tailwind CSS | `^4.2.1` | Utility-first CSS framework |
| **UI Components** | Radix UI | Various | Accessible primitive UI components (Dialog, Tabs, Accordion, Select, Switch, Popover) |
| **Icons** | Lucide React | `^0.575.0` | High-quality iconography across all portals |
| **Notifications / Toasts** | Sonner | `^2.0.7` | In-app toast notifications |
| **Database** | PostgreSQL | `^8.23.0` (`pg`) | Relational database tier with connection pool |
| **Data Validation** | Zod | `^3.24.2` | Type-safe schema validation for APIs, forms, and environment variables |
| **Forms** | React Hook Form | `^7.71.2` | Form state management and Zod resolver integration |
| **QR Code Generation** | `qrcode` | `^1.5.4` | Server-side & client-side QR pass token encoding |
| **QR Code Scanner** | `jsqr` | `^1.4.0` | Client-side camera QR code scanning engine |
| **Charts & Analytics** | Recharts | `^2.15.4` | Analytics charts for HOD and Admin dashboards |
| **Server / Bundler** | Vite & Nitro | `^8.2.0` | Fast dev server, HMR, and production bundle compiler |
| **Type Checking** | TypeScript | `^5.8.3` | Strict static type checking |
| **Formatting & Linting** | ESLint & Prettier | `^9.32.0` | Code quality enforcement and styling |
