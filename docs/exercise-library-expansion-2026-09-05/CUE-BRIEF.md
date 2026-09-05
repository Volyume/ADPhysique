# Cue-authoring agent brief (shared)

Authority: `05-DECISIONS.md` EL-17; voice rules in
`docs/COACHING_VOICE_SYNTHESIS_LOCKED.md` (calm, plain, no shame, no
clipped commands); CLAUDE.md language rules (British English, no em
dash).

## Output
`data/cues-<group>.json`: `{ "<exact exercise name>": "<cue>", ... }` for
every name in your group, nothing else.

## Each cue
Two or three short sentences, 60 to 240 characters total: the setup,
the execution, and the one thing that most often goes wrong. Original
text written from your own understanding of the movement; never copied
or paraphrased from any app, site or book. Plain words a first-time gym
goer understands. No numbers of sets or reps. No diagnosis or safety
claims (banned words: safe, safely, injury, injure, rehab, arthritis,
pain, doctor, physio, therapy, medical, condition, hurt). No em dash.
British spelling (stabilise, centre, favour). Full stops at the end of
every sentence. No exclamation marks. Do not name muscles in Latin.
Example (Barbell Bench Press): "Lie back with your feet planted and the
bar over your eyes. Lower the bar to the lower chest with your elbows
tucked slightly, then press it back over your shoulders. Let the bar
drift towards your neck and the press gets harder, so keep the touch
point low."

## Hard bounds
Write only your JSON file. Do not touch src/. Do not commit, push,
stash or touch main.

## Final report (cap 20 lines)
Row count written; the ten cues you are least sure describe the movement
correctly (name and cue); any name you could not identify as a real
movement (leave it out and say so).
