# Vite + React Setup (Admin-style) — Libraries + Styling Guide

This guide is for creating a new **Vite + React** app that matches the current YAU admin panel styling patterns:
- Tailwind utility styling
- `primary/secondary` theme colors
- `glass` cards
- `gradient-bg` background and `gradient-text`
- Lucide icons

---

## 1) Create project (Vite + React)

```bash
npm create vite@latest pickup-site -- --template react
cd pickup-site
npm install
```

---

## 2) Install libraries (matching current admin stack)

### Required (core)

```bash
npm i react-router-dom lucide-react
```

### Data/date utilities (used in admin)

```bash
npm i date-fns date-fns-tz papaparse
```

### Optional (only if you want the same MUI icon approach as admin)

```bash
npm i @mui/material @mui/icons-material @emotion/react @emotion/styled
```

---

## 3) Tailwind setup (same as admin)

### Install Tailwind + PostCSS

```bash
npm i -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### `tailwind.config.js` (copy admin theme tokens)

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f0f4ff",
          500: "#667eea",
          600: "#5a67d8",
          700: "#4c51bf",
        },
        secondary: {
          500: "#764ba2",
        },
      },
      backdropBlur: {
        xs: "2px",
      },
      animation: {
        in: "slideIn 0.3s ease-out",
      },
      keyframes: {
        slideIn: {
          "0%": { transform: "translateY(1rem)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
```

### `src/index.css` (copy admin utility classes)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html,
  body {
    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    overflow-x: hidden;
  }

  #root {
    width: 100%;
    min-height: 100vh;
  }
}

@layer components {
  .glass {
    @apply bg-white/95 backdrop-blur-md shadow-xl border border-white/20;
  }

  .gradient-bg {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    background-attachment: fixed;
    background-size: cover;
    background-repeat: no-repeat;
    width: 100vw;
    min-height: 100vh;
    position: relative;
  }

  .gradient-text {
    background: linear-gradient(135deg, #667eea, #764ba2);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  /* layering helpers (same idea as admin) */
  .z-dropdown {
    z-index: 1000;
  }
  .z-modal {
    z-index: 2000;
  }
  .z-tooltip {
    z-index: 3000;
  }

  @media (max-width: 768px) {
    .gradient-bg {
      background-attachment: scroll;
      min-height: 100dvh;
    }
  }
}
```

---

## 4) Styling rules to keep UI consistent with admin

### Layout
- Root page background wrapper: `gradient-bg`
- Main panels/cards: `glass rounded-2xl p-6`
- Section spacing: `space-y-6`

### Buttons (admin-like)
- Primary: `bg-primary-500 hover:bg-primary-600 text-white rounded-xl px-4 py-2`
- Secondary: `bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 rounded-xl px-4 py-2`
- Danger: `bg-red-600 hover:bg-red-700 text-white rounded-xl px-4 py-2`

### Inputs
- Text input: `w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500`
- Select: same as input (keep consistent)

### Tables (admin-like pattern)
- Wrap tables with: `overflow-x-auto`
- Header cell: `text-xs font-semibold uppercase tracking-wider text-gray-600`
- Row hover: `hover:bg-gray-50`

### Cards
- Metric card: `glass rounded-lg p-4`
- Badge:
  - success: `bg-green-100 text-green-800 text-xs rounded px-2 py-1`
  - info: `bg-blue-100 text-blue-800 text-xs rounded px-2 py-1`
  - warning: `bg-yellow-100 text-yellow-800 text-xs rounded px-2 py-1`

---

## 5) Routing baseline (pickup-site friendly)

Install `react-router-dom` then use a small route layout:
- `/login` (shared pickup login)
- `/rosters` (choose roster)
- `/rosters/:rosterId` (dismissal screen)

---

## 6) API config (Vite env pattern)

In Vite, use `VITE_` env vars:

Create `.env`:

```bash
VITE_API_BASE_URL=https://us-central1-yau-app.cloudfunctions.net/apis
```

Then read it in code:
- `const baseUrl = import.meta.env.VITE_API_BASE_URL;`

---

## 7) Run / build

```bash
npm run dev
npm run build
npm run preview
```

