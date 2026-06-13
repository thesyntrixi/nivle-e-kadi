# 📁 NIVLE E-Kadi - PROJECT STRUCTURE & RULES

**This document defines folder structure and file organization rules**

---

## 🎯 FOLDER STRUCTURE (COMPLETE)

```
K:\nivle-e-kadi\
│
├── app/                              # NEXT.JS APP ROUTER (ALL PAGES & APIs)
│   │
│   ├── (auth)/                       # 🔐 AUTHENTICATION ROUTES
│   │   ├── login/
│   │   │   └── page.tsx              # Login page
│   │   └── layout.tsx                # Auth layout (no sidebar)
│   │
│   ├── (dashboard)/                  # 📊 PROTECTED DASHBOARD ROUTES
│   │   ├── layout.tsx                # Dashboard layout (with sidebar)
│   │   ├── page.tsx                  # Dashboard home/stats
│   │   │
│   │   ├── clients/                  # 👥 CLIENT MANAGEMENT
│   │   │   ├── page.tsx              # List all clients
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx          # Edit single client
│   │   │   └── new/
│   │   │       └── page.tsx          # Create new client
│   │   │
│   │   ├── events/                   # 📅 EVENT MANAGEMENT
│   │   │   ├── page.tsx              # List all events
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx          # Edit single event
│   │   │   └── new/
│   │   │       └── page.tsx          # Create new event
│   │   │
│   │   ├── cards/                    # 🎨 CARD MANAGEMENT
│   │   │   ├── page.tsx              # List/upload cards
│   │   │   └── [id]/
│   │   │       └── page.tsx          # Edit card
│   │   │
│   │   ├── guests/                   # 👤 GUEST MANAGEMENT
│   │   │   ├── page.tsx              # List all guests
│   │   │   ├── [eventId]/
│   │   │   │   └── page.tsx          # Guests for specific event
│   │   │   └── upload/
│   │   │       └── page.tsx          # Upload guest list
│   │   │
│   │   └── reports/                  # 📈 REPORTS & ANALYTICS
│   │       └── page.tsx              # Reports dashboard
│   │
│   ├── api/                          # 🔌 API ROUTES (BACKEND LOGIC)
│   │   │
│   │   ├── auth/                     # Authentication APIs
│   │   │   ├── login/
│   │   │   │   └── route.ts          # POST /api/auth/login
│   │   │   └── logout/
│   │   │       └── route.ts          # POST /api/auth/logout
│   │   │
│   │   ├── clients/                  # Client APIs
│   │   │   ├── route.ts              # GET /api/clients, POST create
│   │   │   └── [id]/
│   │   │       └── route.ts          # GET, PUT, DELETE single client
│   │   │
│   │   ├── events/                   # Event APIs
│   │   │   ├── route.ts              # GET /api/events, POST create
│   │   │   └── [id]/
│   │   │       └── route.ts          # GET, PUT, DELETE single event
│   │   │
│   │   ├── cards/                    # Card APIs
│   │   │   ├── upload/
│   │   │   │   └── route.ts          # POST upload card image
│   │   │   ├── personalize/
│   │   │   │   └── route.ts          # POST generate personalized cards
│   │   │   └── [id]/
│   │   │       └── route.ts          # GET, DELETE card
│   │   │
│   │   ├── guests/                   # Guest APIs
│   │   │   ├── route.ts              # GET all guests, POST create
│   │   │   ├── upload/
│   │   │   │   └── route.ts          # POST upload guest list (CSV)
│   │   │   └── [id]/
│   │   │       └── route.ts          # GET, PUT, DELETE single guest
│   │   │
│   │   ├── whatsapp/                 # WhatsApp/SMS APIs
│   │   │   ├── send/
│   │   │   │   └── route.ts          # POST send messages
│   │   │   └── status/
│   │   │       └── route.ts          # GET delivery status
│   │   │
│   │   └── reports/                  # Reports APIs
│   │       └── [eventId]/
│   │           └── route.ts          # GET event report
│   │
│   ├── layout.tsx                    # ROOT LAYOUT (global wrapper)
│   └── page.tsx                      # ROOT PAGE (redirect logic)
│
├── lib/                              # 📚 UTILITIES & HELPERS
│   │
│   ├── db.ts                         # PostgreSQL connection pool
│   ├── auth.ts                       # Authentication functions
│   ├── middleware.ts                 # Auth protection middleware
│   │
│   ├── database/                     # Database layer
│   │   ├── schema.sql                # Table definitions
│   │   ├── types.ts                  # TypeScript type definitions
│   │   └── queries.ts                # Reusable query functions
│   │
│   ├── services/                     # Business logic services
│   │   ├── client-service.ts         # Client CRUD logic
│   │   ├── event-service.ts          # Event CRUD logic
│   │   ├── card-service.ts           # Card processing logic
│   │   ├── guest-service.ts          # Guest management logic
│   │   └── whatsapp-service.ts       # WhatsApp integration
│   │
│   ├── constants.ts                  # App constants, config
│   ├── utils.ts                      # General utility functions
│   └── validation.ts                 # Input validation schemas
│
├── components/                       # ⚛️ REUSABLE REACT COMPONENTS
│   │
│   ├── ui/                           # Basic UI components (from shadcn/ui or custom)
│   │   ├── button.tsx                # Button component
│   │   ├── input.tsx                 # Input field component
│   │   ├── select.tsx                # Select dropdown
│   │   ├── table.tsx                 # Table component
│   │   ├── modal.tsx                 # Modal/dialog
│   │   ├── card.tsx                  # Card component
│   │   ├── badge.tsx                 # Badge/tag component
│   │   └── [more as needed]
│   │
│   ├── forms/                        # Form components (compound components)
│   │   ├── client-form.tsx           # Add/edit client form
│   │   ├── event-form.tsx            # Add/edit event form
│   │   ├── card-upload.tsx           # Card upload form
│   │   ├── guest-upload.tsx          # Guest list upload form
│   │   └── [more as needed]
│   │
│   ├── dashboard/                    # Dashboard-specific components
│   │   ├── sidebar.tsx               # Navigation sidebar
│   │   ├── header.tsx                # Top header/navbar
│   │   ├── stat-card.tsx             # Stats display card
│   │   ├── clients-table.tsx         # Clients data table
│   │   ├── events-table.tsx          # Events data table
│   │   └── [more as needed]
│   │
│   ├── shared/                       # Shared utility components
│   │   ├── loading-spinner.tsx       # Loading indicator
│   │   ├── error-message.tsx         # Error display
│   │   ├── empty-state.tsx           # Empty state UI
│   │   └── [more as needed]
│   │
│   └── layout/                       # Layout wrapper components
│       ├── dashboard-layout.tsx      # Dashboard page wrapper
│       └── auth-layout.tsx           # Auth page wrapper
│
├── scripts/                          # 🔧 UTILITY SCRIPTS
│   ├── init-db.ts                    # Database initialization
│   └── test-db.ts                    # Database testing
│
├── public/                           # 📦 STATIC ASSETS
│   ├── images/                       # Images
│   ├── icons/                        # SVG icons
│   ├── logos/                        # Logo files
│   └── [static files]
│
├── styles/                           # 🎨 GLOBAL STYLES
│   ├── globals.css                   # Global Tailwind + custom CSS
│   ├── variables.css                 # CSS variables
│   └── [theme styles]
│
├── hooks/                            # 🎣 CUSTOM REACT HOOKS
│   ├── useAuth.ts                    # Auth state hook
│   ├── useForm.ts                    # Form handling hook
│   ├── useFetch.ts                   # Data fetching hook
│   └── [more hooks]
│
├── types/                            # 📋 SHARED TYPE DEFINITIONS
│   ├── index.ts                      # Export all types
│   ├── api.ts                        # API response types
│   └── [domain types]
│
├── config/                           # ⚙️ CONFIGURATION FILES
│   └── constants.ts                  # App configuration
│
├── .env.local                        # 🔐 ENVIRONMENT VARIABLES (NOT IN GIT)
├── .env.example                      # Example env file
├── .cursorrules                      # Cursor AI rules
├── .gitignore                        # Git ignore rules
│
├── package.json                      # Dependencies & scripts
├── tsconfig.json                     # TypeScript config
├── tsconfig.scripts.json             # TypeScript config for scripts
├── next.config.ts                    # Next.js config
├── tailwind.config.ts                # Tailwind CSS config
├── .eslintrc.json                    # ESLint rules
│
├── README.md                         # Project documentation
└── docs/                             # 📚 DOCUMENTATION
    ├── SETUP.md                      # Setup guide
    ├── API.md                        # API documentation
    ├── COMPONENTS.md                 # Component library docs
    └── [guides]
```

---

## 📏 RULES BY FOLDER

### **app/ - Next.js Pages & APIs**
- ✅ Use folder-based routing
- ✅ (group) syntax for logical grouping
- ✅ [dynamic] syntax for dynamic routes
- ✅ page.tsx for pages, route.ts for APIs
- ❌ Don't put logic here - use lib/ or services/

### **lib/ - Utilities & Business Logic**
- ✅ Pure functions and helper utilities
- ✅ Database queries (lib/database/queries.ts)
- ✅ Authentication logic (lib/auth.ts)
- ✅ Service layer (lib/services/)
- ✅ Type definitions (lib/database/types.ts)
- ❌ Don't put React components here
- ❌ Don't put UI code here

### **components/ - React Components ONLY**
- ✅ UI components (buttons, inputs, etc.)
- ✅ Form components (client-form, event-form, etc.)
- ✅ Layout components (sidebar, header, etc.)
- ✅ Must be reusable
- ❌ Don't put business logic here
- ❌ Don't put database queries here
- ❌ Don't put API calls here (use hooks or API routes)

### **public/ - Static Assets**
- ✅ Images, icons, logos only
- ✅ Files that don't change
- ❌ Don't put code here
- ❌ Don't put environment secrets here

### **styles/ - Global CSS Only**
- ✅ Global Tailwind directives
- ✅ CSS variables
- ✅ Global resets
- ❌ Don't put component styles here (use Tailwind in components)

### **scripts/ - Utility Scripts**
- ✅ Database initialization
- ✅ One-time setup scripts
- ✅ Testing scripts
- ❌ Don't put app logic here

---

## 📝 NAMING CONVENTIONS

### **Folders**
- Use `kebab-case`: `client-management`, `form-components`
- Group related files: `dashboard/`, `components/`, `lib/`
- Dynamic routes: `[id]`, `[eventId]`, `[userId]`

### **Files**
- Components: `PascalCase.tsx`
  - Example: `ClientForm.tsx`, `EventCard.tsx`, `DashboardLayout.tsx`
- Utilities: `camelCase.ts`
  - Example: `auth.ts`, `clientService.ts`, `cardProcessor.ts`
- API routes: `route.ts` (always `route.ts`)
  - Path: `app/api/clients/route.ts`
- Pages: `page.tsx` (always `page.tsx`)
  - Path: `app/(dashboard)/clients/page.tsx`

### **Variables & Functions**
- Constants: `UPPER_SNAKE_CASE`
  - Example: `MAX_FILE_SIZE`, `API_BASE_URL`
- Functions: `camelCase`
  - Example: `authenticateUser()`, `generateQRCode()`
- React Components: `PascalCase`
  - Example: `ClientForm`, `StatCard`
- CSS classes: `kebab-case` (Tailwind)
  - Example: `bg-gray-900`, `text-white`, `rounded-lg`

### **Database**
- Tables: `snake_case`
  - Example: `users`, `client_sessions`, `invitation_codes`
- Columns: `snake_case`
  - Example: `user_id`, `created_at`, `is_active`
- Indexes: `idx_table_column`
  - Example: `idx_guests_event_id`, `idx_users_email`

---

## 🚀 WORKFLOW RULES

### **Adding a New Feature**
1. Create folder in `app/(dashboard)/` if it's a page
2. Create API routes in `app/api/` if needed
3. Create form/component in `components/forms/` or `components/dashboard/`
4. Add business logic in `lib/services/`
5. Add database queries in `lib/database/queries.ts`

### **Example: New "Reports" Feature**
```
Step 1: Page
  app/(dashboard)/reports/page.tsx

Step 2: API
  app/api/reports/[eventId]/route.ts

Step 3: Component
  components/dashboard/reports-table.tsx

Step 4: Service
  lib/services/report-service.ts

Step 5: Queries
  Add to lib/database/queries.ts
```

### **File Organization Checklist**
- [ ] Is it a page? → `app/(dashboard)/feature/page.tsx`
- [ ] Is it an API? → `app/api/feature/route.ts`
- [ ] Is it a React component? → `components/feature/FeatureName.tsx`
- [ ] Is it business logic? → `lib/services/feature-service.ts`
- [ ] Is it a database query? → `lib/database/queries.ts`
- [ ] Is it a utility function? → `lib/utils.ts` or `lib/helpers/`
- [ ] Is it a type definition? → `lib/database/types.ts`

---

## ⚠️ COMMON MISTAKES (DON'T DO THIS)

### ❌ WRONG
```
lib/client-form.tsx          ← Components don't go in lib/
app/api/all-logic.ts         ← Business logic in API route
components/query-users.ts    ← Database queries in components
public/config.json           ← Secrets in public folder
styles/button.css            ← Component styles as separate CSS
```

### ✅ CORRECT
```
components/forms/ClientForm.tsx
lib/services/client-service.ts
lib/database/queries.ts
app/api/clients/route.ts
lib/constants.ts
components/ui/button.tsx (with Tailwind)
```

---

## 📊 FOLDER SIZE GUIDELINES

- `app/` → Can grow big (multiple pages)
- `lib/` → Keep organized with sub-folders (services/, database/)
- `components/` → Can grow big (multiple component types)
- Each file → Max 300-400 lines (split if longer)
- Each folder → Max 15-20 files (organize further if needed)

---

## 🔒 FILE PERMISSIONS

| Folder | Read | Write | Notes |
|--------|------|-------|-------|
| app/ | ✅ | ✅ | Pages & APIs |
| lib/ | ✅ | ✅ | Utilities & logic |
| components/ | ✅ | ✅ | React components |
| public/ | ✅ | ⚠️ | Static files only |
| styles/ | ✅ | ⚠️ | Global CSS only |
| .env.local | ⚠️ | ⚠️ | Secrets only, NOT in git |
| scripts/ | ✅ | ⚠️ | Utility scripts |

---

## 🎯 QUICK REFERENCE

**Need to add something? Ask:**

1. "Is it a page users see?" → `app/(dashboard)/feature/page.tsx`
2. "Is it an API endpoint?" → `app/api/feature/route.ts`
3. "Is it a clickable component?" → `components/feature/FeatureName.tsx`
4. "Is it business/database logic?" → `lib/services/feature-service.ts`
5. "Is it a helper function?" → `lib/utils.ts` or `lib/helpers/`
6. "Is it a constant?" → `lib/constants.ts`
7. "Is it a type?" → `lib/database/types.ts`

---

## ✅ VERIFICATION CHECKLIST

Before starting development, verify:

- [ ] All folders created as per structure
- [ ] `.cursorrules` file present
- [ ] `.gitignore` configured properly
- [ ] `.env.local` exists (with secrets)
- [ ] `package.json` has all scripts
- [ ] No React components in `lib/`
- [ ] No business logic in `components/`
- [ ] No database queries in `app/`
- [ ] No API logic in components

---

**This structure ensures:**
- ✅ Easy to navigate
- ✅ Clear separation of concerns
- ✅ Cursor AI asigude files
- ✅ Scalable and maintainable
- ✅ Team-friendly organization

---

**Done!** Now Cursor knows exactly where to put each file! 🎯
