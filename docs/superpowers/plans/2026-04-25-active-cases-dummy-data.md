# Active Cases Dummy Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand Active Cases mock dataset from 3 entries to exactly 20 entries without changing existing filtering/rendering logic.

**Architecture:** Keep all behavior in the existing Case Management page and only replace the `mockCases` source data with a larger static dataset. Preserve the current object shape and status vocabulary so existing `dateFilteredCases`, `filteredCases`, and badge styles continue to work unchanged.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, ESLint

---

## File Structure and Responsibilities

- Modify: `src/app/dashboard/case/page.tsx`  
  Responsibility: holds `mockCases` source data and table rendering/filter logic for Active Cases.
- Create: none
- Test artifacts: command-line validation using `node -e` (no new test framework introduced)

### Task 1: Expand `mockCases` to 20 entries (TDD sequence)

**Files:**
- Modify: `src/app/dashboard/case/page.tsx` (the `const mockCases = [...]` block)
- Test: command-only check against `src/app/dashboard/case/page.tsx`

- [ ] **Step 1: Write the failing test command**

```bash
node -e "const fs=require('fs'); const file='src/app/dashboard/case/page.tsx'; const s=fs.readFileSync(file,'utf8'); const start=s.indexOf('const mockCases = ['); const end=s.indexOf('];',start); const block=s.slice(start,end); const count=(block.match(/id:\s*\"CAS-/g)||[]).length; if(count!==20){console.error('FAIL expected 20 cases, got',count); process.exit(1)} console.log('PASS: mockCases has 20 entries');"
```

- [ ] **Step 2: Run test to verify it fails before implementation**

Run:
```bash
node -e "const fs=require('fs'); const file='src/app/dashboard/case/page.tsx'; const s=fs.readFileSync(file,'utf8'); const start=s.indexOf('const mockCases = ['); const end=s.indexOf('];',start); const block=s.slice(start,end); const count=(block.match(/id:\s*\"CAS-/g)||[]).length; if(count!==20){console.error('FAIL expected 20 cases, got',count); process.exit(1)} console.log('PASS: mockCases has 20 entries');"
```
Expected:
- Command exits non-zero
- Output contains: `FAIL expected 20 cases, got 3`

- [ ] **Step 3: Replace `mockCases` with a 20-entry static array**

In `src/app/dashboard/case/page.tsx`, replace the existing `mockCases` block with:

```tsx
const mockCases = [
  {
    id: "CAS-1001",
    client: { name: "Lena Harper", email: "lena.harper@example.com" },
    subject: "Cannot access portal dashboard",
    date: "May 21, 2026",
    status: "In progress",
    priority: "High",
  },
  {
    id: "CAS-1002",
    client: { name: "Sophie Kim", email: "sophie.kim@example.com" },
    subject: "Billing issue for last month",
    date: "May 11, 2026",
    status: "Open",
    priority: "Medium",
  },
  {
    id: "CAS-1003",
    client: { name: "Noah Bennett", email: "noah.b@example.com" },
    subject: "Feature request: Export to PDF",
    date: "May 19, 2026",
    status: "Solved",
    priority: "Low",
  },
  {
    id: "CAS-1004",
    client: { name: "Amelia Stone", email: "amelia.stone@example.com" },
    subject: "2FA code not received",
    date: "May 18, 2026",
    status: "New",
    priority: "High",
  },
  {
    id: "CAS-1005",
    client: { name: "Ethan Clarke", email: "ethan.clarke@example.com" },
    subject: "Unable to update company profile",
    date: "May 17, 2026",
    status: "Open",
    priority: "Medium",
  },
  {
    id: "CAS-1006",
    client: { name: "Mia Rodriguez", email: "mia.rodriguez@example.com" },
    subject: "Error while uploading invoice attachment",
    date: "May 16, 2026",
    status: "Escalated",
    priority: "High",
  },
  {
    id: "CAS-1007",
    client: { name: "Lucas Turner", email: "lucas.turner@example.com" },
    subject: "Notification emails delayed",
    date: "May 15, 2026",
    status: "In progress",
    priority: "Medium",
  },
  {
    id: "CAS-1008",
    client: { name: "Ava Nguyen", email: "ava.nguyen@example.com" },
    subject: "Need role-based access for team",
    date: "May 14, 2026",
    status: "Open",
    priority: "Low",
  },
  {
    id: "CAS-1009",
    client: { name: "Benjamin Lee", email: "ben.lee@example.com" },
    subject: "Dashboard metrics not refreshing",
    date: "May 13, 2026",
    status: "In progress",
    priority: "High",
  },
  {
    id: "CAS-1010",
    client: { name: "Chloe Adams", email: "chloe.adams@example.com" },
    subject: "CSV export includes wrong delimiter",
    date: "May 12, 2026",
    status: "Solved",
    priority: "Low",
  },
  {
    id: "CAS-1011",
    client: { name: "Henry Brooks", email: "henry.brooks@example.com" },
    subject: "Cannot reset password",
    date: "May 10, 2026",
    status: "New",
    priority: "High",
  },
  {
    id: "CAS-1012",
    client: { name: "Ella Foster", email: "ella.foster@example.com" },
    subject: "Duplicate billing line items",
    date: "May 9, 2026",
    status: "Escalated",
    priority: "High",
  },
  {
    id: "CAS-1013",
    client: { name: "Jackson Ward", email: "jackson.ward@example.com" },
    subject: "Need audit log for user actions",
    date: "May 8, 2026",
    status: "Open",
    priority: "Medium",
  },
  {
    id: "CAS-1014",
    client: { name: "Grace Hill", email: "grace.hill@example.com" },
    subject: "Mobile layout overlaps sidebar",
    date: "May 7, 2026",
    status: "In progress",
    priority: "Medium",
  },
  {
    id: "CAS-1015",
    client: { name: "Daniel Scott", email: "daniel.scott@example.com" },
    subject: "Webhook endpoint timeout",
    date: "May 6, 2026",
    status: "Escalated",
    priority: "High",
  },
  {
    id: "CAS-1016",
    client: { name: "Harper Evans", email: "harper.evans@example.com" },
    subject: "Need invoice date format customization",
    date: "May 5, 2026",
    status: "Solved",
    priority: "Low",
  },
  {
    id: "CAS-1017",
    client: { name: "Sebastian Perez", email: "sebastian.perez@example.com" },
    subject: "Session expired too quickly",
    date: "May 4, 2026",
    status: "Open",
    priority: "Medium",
  },
  {
    id: "CAS-1018",
    client: { name: "Zoe Collins", email: "zoe.collins@example.com" },
    subject: "Search results missing recent cases",
    date: "May 3, 2026",
    status: "In progress",
    priority: "Medium",
  },
  {
    id: "CAS-1019",
    client: { name: "Logan Morris", email: "logan.morris@example.com" },
    subject: "Need API key regeneration option",
    date: "May 2, 2026",
    status: "New",
    priority: "Low",
  },
  {
    id: "CAS-1020",
    client: { name: "Nora Price", email: "nora.price@example.com" },
    subject: "Case detail page loads slowly",
    date: "May 1, 2026",
    status: "Closed",
    priority: "Low",
  },
];
```

- [ ] **Step 4: Run test to verify it now passes**

Run:
```bash
node -e "const fs=require('fs'); const file='src/app/dashboard/case/page.tsx'; const s=fs.readFileSync(file,'utf8'); const start=s.indexOf('const mockCases = ['); const end=s.indexOf('];',start); const block=s.slice(start,end); const count=(block.match(/id:\s*\"CAS-/g)||[]).length; if(count!==20){console.error('FAIL expected 20 cases, got',count); process.exit(1)} console.log('PASS: mockCases has 20 entries');"
```
Expected:
- Command exits zero
- Output contains: `PASS: mockCases has 20 entries`

- [ ] **Step 5: Commit data expansion**

```bash
git add src/app/dashboard/case/page.tsx
git commit -m "feat: expand active cases mock dataset to 20 entries"
```

### Task 2: Verify UI behavior remains correct

**Files:**
- Modify: none expected
- Verify: `src/app/dashboard/case/page.tsx` through running app

- [ ] **Step 1: Run lint for static validation**

Run:
```bash
npm run lint
```
Expected:
- Exit code 0
- No new lint errors in `src/app/dashboard/case/page.tsx`

- [ ] **Step 2: Start dev server**

Run:
```bash
npm run dev
```
Expected:
- Next.js dev server starts successfully
- Local URL is printed (usually `http://localhost:3000`)

- [ ] **Step 3: Manual verification of Active Cases UI**

Verify in browser at `/dashboard/case`:
```text
1) Active Cases table renders with expanded data on default view.
2) Search works for:
   - "CAS-1015"
   - "dashboard"
3) Status filter works for at least:
   - "Open"
   - "Escalated"
4) Date filter toggles still behave as expected for:
   - All time
   - This month
   - This year
5) Row action button still links to /dashboard/case/<lowercase-id>.
```
Expected:
- No rendering errors
- Filters and search still update rows correctly

- [ ] **Step 4: Stop dev server and confirm clean state**

Run:
```bash
# In the running dev terminal: Ctrl+C
git status --short
```
Expected:
- Dev server stops cleanly
- No unintended file changes created by verification

- [ ] **Step 5: Commit only if verification introduced intentional code changes**

```bash
# Only if any intentional edits were made during verification
git add <intentional-files-only>
git commit -m "chore: finalize active cases dummy data verification adjustments"
```

## Notes for Execution

- Keep status strings exactly within: `New`, `Open`, `In progress`, `Escalated`, `Solved`, `Closed`.
- Preserve object shape used by table rendering (`id`, `client`, `subject`, `date`, `status`, `priority`).
- Do not add abstractions, utility generators, or new files for this change.

## Self-Review (Completed)

- **Spec coverage:** plan includes expanding data to 20 entries, preserving existing flow, and validating search/status/date behavior.
- **Placeholder scan:** no TBD/TODO/placeholders found; all steps include explicit commands/code.
- **Type consistency:** all entries follow the same object schema and status vocabulary used by the existing UI.
