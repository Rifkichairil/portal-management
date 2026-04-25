# Active Cases Dummy Data Expansion Design

## Goal
Expand the Active Cases table dataset from 3 entries to 20 entries so the dashboard view looks realistic for UI testing and filtering behavior.

## Scope
- Update `mockCases` in `src/app/dashboard/case/page.tsx` only.
- Keep existing structure unchanged: `id`, `client`, `subject`, `date`, `status`, `priority`.
- Keep statuses aligned with current UI status mapping: `New`, `Open`, `In progress`, `Escalated`, `Solved`, `Closed`.

## Out of Scope
- No API integration.
- No backend or database changes.
- No component refactor or file split.

## Recommended Approach
Use a static hardcoded list of 20 mock cases directly in `mockCases`.

### Why this approach
- Fastest and most predictable for immediate UI needs.
- No additional abstraction for temporary/sample data.
- Zero impact to existing filtering and rendering flow.

## Data and Rendering Flow
1. `mockCases` (20 static rows) is the source dataset.
2. `dateFilteredCases` applies date range filters.
3. `filteredCases` applies status and search filters.
4. Active Cases table renders `filteredCases`.

No logic changes are required in filter functions; only the source data volume changes.

## UI/Behavior Expectations
- Active Cases table should show 20 rows on default view (subject to date filter state).
- Search still works on case `id` and `subject`.
- Status filter still works with existing badge styles.
- Empty state message still appears when no rows match filters.

## Validation Plan
- Open Case Management page.
- Confirm Active Cases table renders expanded dataset.
- Test search with known case id/subject substring.
- Test status filter for at least two statuses.
- Test date filter (`All`, `This month`, `This year`) to confirm behavior remains consistent.

## Risks
- If date values are outside active ranges, some filters may appear to return fewer records.
- If status string mismatch occurs, badge fallback style is used.

## Mitigation
- Use date values consistent with current mock format.
- Use status values only from existing `statusStyles` keys.
