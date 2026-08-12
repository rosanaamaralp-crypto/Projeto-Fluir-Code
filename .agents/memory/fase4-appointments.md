---
name: Fase 4 — Appointments module
description: Architecture decisions, concurrency strategy, and test slot rules for the appointments module.
---

## Modalidades
- DB accepts only `IN_PERSON` and `HOME_CARE` (not REMOTE)
- `chk_appt_modality_refs`: IN_PERSON → resource_id NOT NULL, address_id NULL; HOME_CARE → resource_id NULL, address_id NOT NULL
- Zod validator rejects anything else with 400 before reaching service

## addressId validation order
- The `HOME_CARE` + no addressId check (step 5.5) runs BEFORE availability window queries (step 9)
- **Why:** addressId absence is a validation error (400), not a conflict (409). If it ran after availability, slots outside business hours would return 409 instead of 400.

## Concurrency strategy
- Optimistic pre-checks (SELECTs) for user-friendly error messages
- EXCLUDE constraints (`excl_client_no_overlap`, `excl_professional_no_overlap`, `excl_resource_no_overlap`) as the definitive guard
- `23P01` → `ConflictError` (409) via `mapDbError()`
- No `SELECT FOR UPDATE` (doesn't prevent concurrent INSERTs)

## Test slot generator rule
- `uniqueSlot()` must produce times within 08:00–20:00 UTC and at least 2 days in the future
- Pattern: `dayOffset = 2 + floor(counter / 4)`, `hour = 10 + (counter % 4)` → hours 10, 11, 12, 13 UTC
- **Why:** raw hour offsets from `Date.now()` land outside business hours at night (e.g. 01:47 UTC + 46h = 23:47 UTC → 409 from availability check, masking real test failures)
- Concurrent test: fixed slot at d+10, 14:00 UTC

## Status transitions (RBAC)
- CONFIRMED → CANCELLED: all roles
- CONFIRMED → IN_PROGRESS: PROFESSIONAL, ADMIN
- IN_PROGRESS → COMPLETED/NO_SHOW: PROFESSIONAL, ADMIN
- IN_PROGRESS → CANCELLED: ADMIN only
- Terminal states (COMPLETED, CANCELLED, NO_SHOW): immutable

## Rescheduling
- No RESCHEDULED status; cancel original + create new in one transaction
- Uses `appointment_status_history` rescheduling fields

## Seed cleanup (Fase 4 addition)
- `cleanTestData()` now disables `trg_appt_history_no_delete` before deleting `appointment_status_history`
- Trigger is re-enabled immediately after DELETE, still inside the same BEGIN/COMMIT block
- Also deletes `appointments` records before clients/professionals (FK order)
- Cleanup of `resources WHERE name = 'Sala Teste Fase4'` added
