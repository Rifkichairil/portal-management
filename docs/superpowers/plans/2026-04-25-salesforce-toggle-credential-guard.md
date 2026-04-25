# Salesforce Toggle Credential Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent enabling "Insert to Salesforce" unless API credentials are filled, and replace the disabled-state copy with a more general message.

**Architecture:** Enforce the rule in two layers: client-side guard for immediate UX feedback and server-side guard in `/api/settings` as the source-of-truth. Keep behavior minimal and localized to the existing settings page and settings API route.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Supabase JS, react-hot-toast.

---

## File Structure

- Modify: `src/app/dashboard/settings/page.tsx`
  - Add client-side guard that blocks enabling Salesforce when `clientId` or `clientSecret` is blank.
  - Replace disabled-state helper copy with a general sentence.
- Modify: `src/app/api/settings/route.ts`
  - Add server-side validation: reject `salesforce_enabled: true` when either credential is missing after trim.
- Verify: `src/app/api/cases/route.ts`
  - No functional change required; keep existing runtime guard for case creation.

### Task 1: Add server-side validation in settings API

**Files:**
- Modify: `src/app/api/settings/route.ts`

- [ ] **Step 1: Create failing behavior check (manual API reproduction)**

Run (with dev server running):

```bash
curl -s -X POST http://localhost:3000/api/settings \
  -H "Content-Type: application/json" \
  -d '{"client_id":"","client_secret":"","salesforce_enabled":true}'
```

Expected before change: request succeeds (incorrect behavior to fix).

- [ ] **Step 2: Implement minimal validation in `POST`**

Add validation near body parsing/update path:

```ts
const wantsEnable = salesforce_enabled === true;
const hasClientId = typeof client_id === "string" && client_id.trim().length > 0;
const hasClientSecret = typeof client_secret === "string" && client_secret.trim().length > 0;

if (wantsEnable && (!hasClientId || !hasClientSecret)) {
  return NextResponse.json(
    { error: "Fill API credentials before enabling Salesforce." },
    { status: 400 }
  );
}
```

Keep insert/update logic unchanged otherwise.

- [ ] **Step 3: Verify behavior is now rejected**

Run:

```bash
curl -i -X POST http://localhost:3000/api/settings \
  -H "Content-Type: application/json" \
  -d '{"client_id":"","client_secret":"","salesforce_enabled":true}'
```

Expected after change: `HTTP/1.1 400` with `{"error":"Fill API credentials before enabling Salesforce."}`.

- [ ] **Step 4: Verify valid payload still succeeds**

Run:

```bash
curl -i -X POST http://localhost:3000/api/settings \
  -H "Content-Type: application/json" \
  -d '{"client_id":"abc","client_secret":"xyz","salesforce_enabled":true}'
```

Expected: `HTTP/1.1 200` and JSON settings payload.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/settings/route.ts
git commit -m "fix: block enabling salesforce without credentials"
```

### Task 2: Add client-side toggle guard and general copy

**Files:**
- Modify: `src/app/dashboard/settings/page.tsx`

- [ ] **Step 1: Reproduce current UI behavior**

Manual check in browser:
1. Open `/dashboard/settings`.
2. Clear Client ID and Client Secret.
3. Toggle "Insert to Salesforce" ON.

Expected before change: toggle turns ON (incorrect behavior to fix).

- [ ] **Step 2: Add guarded toggle handler**

Create a handler and wire it to the toggle button:

```ts
const handleToggleSalesforce = () => {
  if (!salesforceEnabled) {
    const hasClientId = clientId.trim().length > 0;
    const hasClientSecret = clientSecret.trim().length > 0;

    if (!hasClientId || !hasClientSecret) {
      toast.error("Fill API credentials before enabling Salesforce.");
      return;
    }
  }

  setSalesforceEnabled((v) => !v);
};
```

Then replace:

```tsx
onClick={() => setSalesforceEnabled((v) => !v)}
```

with:

```tsx
onClick={handleToggleSalesforce}
```

- [ ] **Step 3: Replace disabled-state description copy with general wording**

Replace this disabled-state string:

```tsx
"Cases will be saved directly to Supabase. A random case number will be generated and case_sf_id will be null."
```

with:

```tsx
"Cases will be saved without Salesforce synchronization."
```

- [ ] **Step 4: Verify UI behavior**

Manual checks:
1. With empty credentials, toggle ON attempt shows toast and remains OFF.
2. After filling both credentials, toggle ON works.
3. Disabled copy renders as the new general sentence.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/settings/page.tsx
git commit -m "fix: gate salesforce toggle and generalize disabled copy"
```

### Task 3: Final verification pass

**Files:**
- Modify: none

- [ ] **Step 1: Run lint for changed files**

Run:

```bash
npm run lint
```

Expected: no new lint errors in modified files.

- [ ] **Step 2: End-to-end smoke in browser**

Verify save flow:
1. Toggle OFF + Save works.
2. Toggle ON + valid credentials + Save works.
3. Refresh page and confirm persisted values load correctly.

- [ ] **Step 3: Commit verification-only checkpoint if needed**

```bash
# No commit if no changes
```
