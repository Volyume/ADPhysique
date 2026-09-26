# Plain English for everyone (founder order 2026-09-26)

Founder, verbatim, on the Coaching decision screen: "'Getting back to your
full week is the thing that makes the rest readable' is not understandable
plain British English to normal end users. It might make technical sense to
you but this uninformed end users to understand. We need a sweep and a
correction on any language like this. It needs to be understanding."

This rule layers on `docs/COACHING_VOICE_SYNTHESIS_LOCKED.md` (honesty test,
numbers before narrative, plain-mechanism language, no fake autonomy, the two
registers, the safety carve-out) and on CLAUDE.md's language rules (British
English, no em dash, calm, no shame, no clipped commands). Nothing here
relaxes any of them. Register D207.

## The test

Read the sentence as an adult who has never lifted, never counted calories
and has not read any other screen. If they cannot say back what it means
after one read, it fails. Rewrite it until they can.

- Say what happened, what it means, and what happens next, in everyday words.
- Name who acts, by the voice doc's actor rule (founder override 2026-06-03
  and the 2026-07-09 actor-naming addendum): "your coach" in running
  coaching prose, or an impersonal sentence; "Precision Coaching" only where
  the feature is named or explained, never in a per-week message body; "you"
  for things the person does. Never a collaborative "we" for a coaching
  decision, never "the engine", "the system" or "The Coach". "Volyume" names
  the app only.
- Whole sentences. The precise register may still lead with a label and a
  number ("Sessions: 2 of 4.") but every word after it passes the test.
- Keep the meaning exactly. Never change a number, a decision, a threshold,
  a condition or what is claimed, and never add advice the original did not
  give. Describe; do not tell people to train easier or harder (D204).

## Coach shorthand that fails the test

These read as normal words to the people who built the engine and as nothing
to everyone else. Replace them with what they mean.

| Shorthand | Say instead |
| --- | --- |
| "the next read", "a clear read", "the read" | "next week's check-in", "enough information", "what your coach can see" |
| "readable", "makes the rest readable" | "lets your coach see whether ... is working" |
| "sized cautiously", "changes are sized" | "any change is kept small" |
| "thin" data, "the data was thin" | "less information than usual", "only N weigh-ins" |
| "tunes against", "tunes" | "is adjusted using" |
| "on rate", "off rate", "back on rate" | "moving at the planned rate", "not moving at the planned rate" |
| "trend responded" | "your weight changed the way we expected" |
| "sharpen the read" | "make the check-in more accurate" |
| "signal", "evidence", "coverage", "execution", "limiter" (as nouns in copy) | the plain thing: "information", "how many days you logged", "the sessions you did" |
| "land" / "landed" for a change | "take effect", "start" |
| "the ask" | "what we're asking" |

App vocabulary that IS explained where it appears (volume, recovery week,
block, 7-day trend) may stay, with its existing gloss.

## Worked examples (real strings)

| Before | After |
| --- | --- |
| Getting back to your full week is the thing that makes the rest readable. | Once you're doing all your planned sessions again, your coach can see whether the rest of your plan is working. |
| Next check-in: Saturday. Sessions in, and the next read shows it. | Next check-in: Saturday. It will show how this week's sessions went. |
| Next read: trend against the new target. | Next week's check-in will show how your weight responds to the new target. |
| Daily weigh-ins sharpen the next read. | Weighing yourself each morning makes the next check-in more accurate. |
| Confidence: medium. Some data was thin this week, so changes are sized cautiously. | Confidence: medium. There was less information than usual this week, so any change is kept small. |
| Last 250 kcal increase: trend responded, back on rate. | Last change, 250 kcal more a day: your weight is now moving at the planned rate. |
| Food logs: missing. The calorie target only tunes against real intake. | Food logs: missing. Your calorie target can only be adjusted using what you actually eat. |

## Out of scope for any sweep (ask the founder instead)

- ED-safety copy: the ED-pattern lockout and cleared copy, the calorie-floor,
  lean-mass-floor and rapid-loss clinical lines, calm mode, Beat UK
  signposting. It is clinical by design and "do not touch" under CLAUDE.md
  Section 2. If one of these fails the test, list it for the founder.
- Legal, consent (Article 9) and medical-disclaimer text.
- LOCKED surface text in the voice doc (its Section 5 surfaces, and the
  Surface 6 notification strings, which `docs/NOTIFICATIONS_LOCKED.md` also
  carries). Changing one is a dated amendment to both locked docs, recorded
  in the register (the D15 and D17 precedent), never a silent edit.
- Identifiers, telemetry strings, placeholders and code comments.

## Checks that still bind every rewrite

- The jargon check (`checkJargon`, pinned by `jargonBlocklist.test.js`)
  must pass on every engine string; the blocklist is never edited to let a
  rewrite through.
- The two registers (supportive and precise) stay distinct; the precise
  register may stay short, but not cryptic.
- D204: describe, never tell the athlete to train easier or harder, rest,
  or take a lighter week.
