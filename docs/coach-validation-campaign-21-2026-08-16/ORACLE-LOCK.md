# Campaign 21 — expected-outcome oracle (Step 3)

Binding contract for scenario generation. One block per ledger rule. Locked
rows are the ONLY authority haiku scenario expansion may build from; a row
below LOCKED returns to the lead.

Authority hierarchy (highest first — every lock cites its source):
1. FOUNDER — explicit founder rulings (FOUNDER-RULINGS docs, D-register,
   CLAUDE.md Section 2 inviolables, campaign orders).
2. LAW — accepted product laws / campaign contracts (locked docs, design
   docs marked binding, the Campaign 21 brief's permanent-law list).
3. ARCH — current authoritative production architecture (the traced graph,
   where no higher authority speaks).
4. TEST — accepted existing tests (pins that survived founder review).
5. SCI — scientifically constrained implementation rules already adopted.

Rules: production behaviour that contradicts a HIGHER authority is locked to
the higher authority and marked SUSPECTED-DEFECT (expected outcome = the
higher authority's; the test is EXPECTED to fail against production until
Step 11 triage). Ambiguity with no higher authority locks to conservative
non-change/HOLD. Nothing here invents new coaching philosophy.

## Block format

```
RULE: <rule_id>
LOCK: <MUST behaviour, stated as testable outcomes; include HOLD/no-change
      behaviour explicitly; name senior gates that suppress it>
MUST_NOT: <forbidden actions, incl. what junior evidence must not do>
BOUNDARIES: <the exact threshold edges to test (below / at / above), from
      the graph's production values — never guessed>
SOURCE: <FOUNDER|LAW|ARCH|TEST|SCI> — <the specific document/ruling/pin>
DEFECT: <none | SUSPECTED: what production does vs what the lock requires>
```

<!-- LEAD-REVIEW: pending. Locks below this line are drafted by the Step 3
     sonnet pass and are NOT usable by scenario expansion until the lead
     review marker above flips to accepted. -->
