# ⚙️ CURSOR AI - STRUCTURE RULES PROMPT

**Copy this and paste into Cursor BEFORE pasting AUTH_SYSTEM_CURSOR_PROMPT.md**

---

## INSTRUCTIONS FOR CURSOR AI - READ THIS FIRST

Before you start creating ANY files, read and understand these rules:

### RULE 1: FILE ORGANIZATION
- **Pages**: Go in `app/(dashboard)/` or `app/(auth)/`
- **APIs**: Go in `app/api/`
- **Components**: Go in `components/` (NOT lib/)
- **Utilities**: Go in `lib/` (NOT components/)
- **Database**: Go in `lib/database/`
- **Services**: Go in `lib/services/`

### RULE 2: NAMING
- **Folders**: kebab-case (e.g., `client-form`)
- **Components**: PascalCase (e.g., `ClientForm.tsx`)
- **Functions/Utils**: camelCase (e.g., `authenticateUser()`)
- **Database tables**: snake_case (e.g., `users`, `client_sessions`)
- **API routes**: Always `route.ts`
- **Pages**: Always `page.tsx`

### RULE 3: SEPARATION OF CONCERNS
- 🚫 DON'T put React components in lib/
- 🚫 DON'T put database queries in components/
- 🚫 DON'T put business logic in app/api/ (use services/)
- 🚫 DON'T put secrets in public/
- ✅ DO put UI in components/
- ✅ DO put logic in lib/services/
- ✅ DO put queries in lib/database/queries.ts
- ✅ DO put APIs as thin handlers (call services)

### RULE 4: FILE STRUCTURE EXAMPLE

**Adding a "Clients" feature:**
```
✅ Page:        app/(dashboard)/clients/page.tsx
✅ API:         app/api/clients/route.ts
✅ Component:   components/forms/ClientForm.tsx
✅ Service:     lib/services/client-service.ts
✅ Query:       lib/database/queries.ts (add ClientQuery)
✅ Type:        lib/database/types.ts (already has Client type)
```

**NOT:**
```
❌ lib/ClientForm.tsx (components don't go in lib)
❌ components/client-service.ts (services don't go in components)
❌ app/api/AllLogic.ts (logic goes in services/)
```

### RULE 5: FOLDER ORGANIZATION
```
K:\nivle-e-kadi\
├── app/                     ← Pages and APIs ONLY
├── lib/                     ← Logic, utilities, database
│   ├── database/            ← Queries and types
│   └── services/            ← Business logic
├── components/              ← React components ONLY
│   ├── forms/               ← Form components
│   ├── dashboard/           ← Dashboard widgets
│   ├── ui/                  ← Base UI components
│   └── shared/              ← Shared utilities
├── public/                  ← Static files (images, icons)
└── styles/                  ← Global CSS only
```

### RULE 6: BEFORE CREATING FILES
Ask yourself:
1. "Is this a React component?" → Goes in `components/`
2. "Is this a page users see?" → Goes in `app/(dashboard)/` or `app/(auth)/`
3. "Is this an API endpoint?" → Goes in `app/api/`
4. "Is this business logic?" → Goes in `lib/services/`
5. "Is this a database query?" → Goes in `lib/database/queries.ts`
6. "Is this a utility function?" → Goes in `lib/utils.ts` or `lib/`

### RULE 7: CODE ORGANIZATION
- Max 300-400 lines per file (split if larger)
- One main export per file (except types)
- Group related functions (all user functions together, etc.)
- Use TypeScript types everywhere
- No `any` types allowed

### RULE 8: IMPORT PATHS
- Use absolute imports: `import { Button } from '@/components/ui/button'`
- NOT relative: `import { Button } from '../../../components/ui/button'`
- Always use `@/` prefix for consistency

### RULE 9: API ROUTES PATTERN
```typescript
// app/api/feature/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { featureService } from '@/lib/services/feature-service';

export async function GET(request: NextRequest) {
  try {
    const data = await featureService.getAll();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Error message' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Similar pattern
}
```

### RULE 10: COMPONENT PATTERN
```typescript
// components/forms/ClientForm.tsx
'use client';

import { FormEvent, useState } from 'react';

interface ClientFormProps {
  initialData?: ClientType;
  onSubmit: (data: ClientType) => Promise<void>;
}

export function ClientForm({ initialData, onSubmit }: ClientFormProps) {
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e: FormEvent) => {
    // Form logic
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

### RULE 11: SERVICE PATTERN
```typescript
// lib/services/client-service.ts
import { query } from '@/lib/db';
import { ClientType } from '@/lib/database/types';

export const clientService = {
  async getAll() {
    // Query and return
  },

  async getById(id: string) {
    // Query and return
  },

  async create(data: ClientType) {
    // Insert and return
  }
};
```

---

## VERIFICATION BEFORE WRITING CODE

Before you create any file, answer YES to all:

- [ ] Do I know which folder this goes in?
- [ ] Is my filename in the correct format (PascalCase/camelCase)?
- [ ] Is this file responsibility clear (component/logic/API)?
- [ ] Am I following the structure document?
- [ ] Have I checked the PROJECT_STRUCTURE_RULES.md file?

---

## SUMMARY

**When Cursor asks "where should I put this file?"**
- Read PROJECT_STRUCTURE_RULES.md
- Find the category (page, API, component, service, etc.)
- Put it in the correct folder
- Use correct naming convention
- Don't mix concerns (keep components separate from logic)

---

**NOW:** Read `PROJECT_STRUCTURE_RULES.md` document for complete reference.

Then proceed with AUTH_SYSTEM_CURSOR_PROMPT.md

---

Done! Cursor now knows the rules! 🎯
