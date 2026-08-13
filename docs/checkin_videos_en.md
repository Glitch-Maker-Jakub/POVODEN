# POVODEŇ — In-Game Check-In Videos (English, draft for review)

Two short companion pieces to `intro_video_script_en.md`. Same character (Old Fojtík), same visual
language, but a different register: these arrive **during** the campaign, at specific triggers, so they
play as short, direct messages rather than a return to the newsroom interview. Reporter Nováková appears
only briefly in Video 3, as a one-line hook back to the documentary frame.

Both are designed to require **no new stills beyond one hero image each** — cheap to produce, easy to slot
in without derailing pacing.

---

# VIDEO 2 — "The Calm Ends"

**Trigger (game state):** the transition into Round 3's preparation phase — i.e. right after the two
forced-calm on-ramp seasons end and the flood becomes genuinely possible for the first time. This is the
same moment the game currently shows a text-only advisor line (`advisor.3` in `GameScene.js`); this video
is meant to **replace or precede** that text, not duplicate it.
**Format:** single voiceover, no dialogue exchange, one still with a slow push-in (not a pan — the stakes
are rising, the camera tightens).
**Runtime target:** ~30–35s.

| | |
|---|---|
| **VISUAL** | STILL A — Old Fojtík alone on a dock at dusk, checking the mooring rope on a small boat. A dark line of storm cloud sits on the horizon behind him — distant, but unmistakably there. Cooler light than the interview scenes; this is present tense, not memory. |
| **FOJTÍK (V.O.)** | "Two seasons of calm. Don't mistake that for peace — it's just the river taking a breath." |
| | *(beat)* |
| **FOJTÍK (V.O.)** | "I've seen mayors spend those two seasons on speeches and parties, with nothing in the boathouse to show for it. Check your levees. Check your boats. Check who you can call on — and who's already calling on you." |
| | *(he pulls the rope tight, straightens)* |
| **FOJTÍK (V.O.)** | "From here on, the water means it." |
| **ON-SCREEN CAPTION** | *The calm seasons are over. Prepare, or hope.* |
| **DURATION** | ~30s |

---

# VIDEO 3 — "After the First Destruction"

**Trigger (game state):** the first round in which the flood causes real, felt loss — suggested definition:
the first `round_end` where `regionDeaths > 0`, **or** region-wide damage crosses a threshold (e.g. roughly
€100M+) if no deaths occur first, whichever comes first. Plays once per player, ideally right as the
newspaper/private-briefing screen for that round opens — before the numbers, so it frames how to read them,
not after, where it would just pile on.
**Format:** mostly voiceover; one short line from Reporter Nováková reopens the interview frame for a beat,
long enough to remind the player who's speaking and why it still matters, then closes again.
**Runtime target:** ~40–50s.

| | |
|---|---|
| **VISUAL** | STILL B — A flooded street being cleared: waterline visible on building fronts, a rescue boat pulled up onto a curb, a couple of figures working in the middle distance. Documentary/newsreel tone — matches the in-game newspaper's "disaster" photo register, not gorier than that. |
| **FOJTÍK (V.O.)** | "Every mayor remembers their first real flood." |
| | *(beat, harder)* |
| **FOJTÍK (V.O.)** | "The water doesn't care how well you meant it." |
| **REPORTER (V.O., brief return)** | "What do you tell a mayor, after that?" |
| **FOJTÍK (V.O.)** | "That the first flood isn't the one that defines you. The next nine are." |
| | *(the boat on the curb, held a beat longer)* |
| **FOJTÍK (V.O.)** | "Learn what that water was trying to tell you — where it came from, who it visited on the way. Then spend the next season answering it. Not with anger." |
| | *(pause)* |
| **FOJTÍK (V.O.)** | "With boats." |
| **ON-SCREEN CAPTION** | *Damage happened. What you do next round is what counts.* |
| **DURATION** | ~45s |

---

## Notes

- Both reuse Fojtík's established voice — no new voice casting needed beyond what Video 1 requires. Video 3
  needs one additional short reporter line (~4 words of new VO for Nováková).
- Neither video re-teaches a mechanic already covered in Video 1; both are **emotional pacing beats** — one
  raising tension before the danger starts, one reframing a loss instead of piling onto it. This intentionally
  echoes (without repeating) the in-game per-round private briefing, which already gives one actionable tip
  after a bad round — the video sets the tone, the briefing gives the specifics.
- **Skippable by default**, same as Video 1 — a returning player who has already seen these shouldn't be
  forced to sit through them on every campaign. Suggest a `localStorage` flag per video, same pattern already
  used for language/consent, so each plays once unless the player resets it.
- If produced with the same 9-still pipeline as Video 1, these add exactly **2 more stills** — 11 total for
  all three pieces combined.
