# POVODEŇ — moderated playtest protocol (draft)

A 45–60 minute session template for facilitated playtests. Goal: measure
whether players *understand* the systems the game is built to teach — not
whether they enjoyed it (ask that too, but separately). Content wording should
be reviewed by the study owner before first use; this draft pairs each
question with the mechanic it probes and the telemetry that can corroborate it.

## Session outline

1. **Pre-questions (5 min, before any play)** — see below.
2. **Unguided campaign (20–25 min)** — player picks any municipality, plays a
   full 10-round campaign. Facilitator observes silently using the checklist.
3. **Debrief interview (10 min)** — walk back through 2–3 concrete moments of
   the campaign ("in round 6 you built a levee — who paid for that downstream?").
4. **Post-questions (5 min)** — same comprehension items as pre, reworded.
5. **Optional second campaign (15 min)** — measures behaviour change, not just
   stated understanding (does the cooperation ratio rise?).

## Comprehension questions (pre AND post, reworded variants)

| # | Question probes | Mechanic |
|---|---|---|
| Q1 | "If a town upstream of you builds a levee, what happens to your flood risk?" | levee deflection (the core externality) |
| Q2 | "Does last season's flood tell you anything about this season's?" | i.i.d. severity draw / gambler's fallacy |
| Q3 | "What does leaving Greenhaven un-walled do for the towns below it?" | absorptive floodplain |
| Q4 | "Name two things that reduce deaths (not damage) when the flood hits." | boats/kits/morale vs levees |
| Q5 | "Why would helping a neighbouring town ever be in *your* interest?" | reciprocity, deals, regional score |

Score each answer 0 (wrong) / 1 (partial) / 2 (correct mechanism named).
A useful session shows post − pre gain on Q1–Q3; Q2 is the hardest to move.

## Observation checklist (facilitator, during play)

- [ ] Reads the forecast band before buying; sharpens it at least once.
- [ ] Notices the "deflects water downstream" warning before the 3rd levee.
- [ ] Convenes at least one Regional Meeting; can say what it bought them.
- [ ] Accepts or declines a deal deliberately (asks about the reward), not reflexively.
- [ ] Spends political capital on another town at least once, unprompted.
- [ ] Reaction to first casualty round: revises strategy vs repeats it.
- [ ] Confuses damage (€) with deaths at any point (note the moment).

## Telemetry ↔ hypothesis map (opt-in participants only)

| Event | Hypothesis it can support |
|---|---|
| `invest` with `own: false` | H1: cooperation ratio rises across repeated campaigns |
| `card` plays per tier | H2: players discover cards before round 5; rares mostly unused |
| deal accept/decline + fulfilment | H3: players who break a deal once are punished (relationship) and cooperate more after |
| forecast sharpen count | H4: forecast buyers suffer fewer own-town deaths |
| campaign number (longitudinal) | H5: regional score improves from campaign 1 → 2 for the same participant |

Use only events already collected under the existing explicit consent; no new
collection is introduced by this protocol.

## Notes

- Pair this with `docs/balance/baseline-2026-07.md` (simulated baselines): if a
  playtester lands far outside the simulated strategy envelope, the interesting
  question is *which* mental model produced that.
- The pre/post questions measure understanding, not enjoyment; add a separate
  short SUS-style enjoyment block at the very end if desired.
