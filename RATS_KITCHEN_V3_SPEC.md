# RAT'S KITCHEN — v3 SPECIFICATION
Status: design draft, pre-playtest. Supersedes all earlier v3 drafts.
Every count in this document is provisional until paper-tested.

**All balance figures from v11 and Combined are VOID.** Those versions
tuned a game where rats were liabilities; v3 inverts that, so nothing
transfers. Likewise all simulation output produced before this draft — it
predates colour, the three-stat split, and the merged Bins.

---

## 1. THE ONE-LINE CHANGE

Rats invert from liability to stock. You farm them to take over the market;
every rat you hold is one more thing the inspector can fine you for. Win
and loss ride on the same resource.

---

## 2. LORE

You run an unlicensed night-market stall. Rats are literal vermin — on all
fours, no clothing, no weapons, never a gang. Every kitchen has them. You
have stopped fighting it and started farming it: rats are the cheapest
protein in the market and you intend to be the biggest supplier in it.

The Health Inspector (heron) shuts down whoever is filthiest, and the
filthiest stall is the one with the biggest operation. Authority tier
unchanged: Health Inspector (heron) > Auditor (owl) > Exterminator
(badger). No humans. The player-vendor is never depicted.

**The heron is colourblind.** This is the joke and it is load-bearing: it
is why an inspection only finds rats of the shade it came looking for, and
why a rat of the wrong colour walks straight past. Not a documentary — the
gag explains the entire colour rule in one line at the table.

**The naked mole rat is blind and colourblind.** It smells rats rather than
seeing them, so it knows something is there but cannot tell what or how
many. That is the whole mechanic of the Snap inspection.

**Preserved:** all 42 commissioned art pieces remain valid. Nothing in the
art depends on the player wanting rats gone — only motive inverts, and
motive is not drawn on the cards.

---

## 3. THE THREE STATS — READ THIS FIRST

"Weight" was previously overloaded across three jobs and caused repeated
confusion. Three stats, three names, no overlap:

| Stat | Name | Governs |
|---|---|---|
| How many rats you hold | **COUNT** | Swaps, trades, the one-rat-in invariant, trap triggers |
| Progress toward Rat King | **WEIGHT** | Win threshold of 5. Also what a rat pays when eaten |
| Inspection damage | **HEAT** | Scheduled inspection damage only |

**You need WEIGHT 5 to win — not 5 rats.** A kitchen of three rats can win
if their weight totals 5. Trades and swaps are counted by COUNT regardless
of weight. Inspections read HEAT, which is a separate low number.

---

## 4. RULES

### 4.1 Win / lose
- **Win:** hold WEIGHT ≥ 5. Checked instantly, no declare window.
- **Lose:** 0 Stars.
- Stars: 3 (confirmed by simulation — higher values suppress the attrition
  win route without lengthening games; see §10b).
- Threshold FIXED at WEIGHT 5 across all player counts.
- Total rats ≈ 5 + P, split ~60/40 between deck and Bins (§8.3, §10b).
- v11's "5 rats in a zone = instant death" overflow rule is **DROPPED** —
  it directly contradicts a win condition requiring a hoard.

### 4.2 Turn structure
1. Discard any of your own turn-duration cards (§9.3).
2. **Draw 1 card** from the deck. When Drawn triggers fire immediately on
   reveal, before actions.
3. **Actions:** 1 attack + 1 build. Reactives unlimited.
   **Or draw another card instead of taking an action.**
4. Discard to hand size (7).

Players start with 1 Food in hand.

### 4.3 Action classes

| Class | Includes | Limit |
|---|---|---|
| Attack | Hot Ratato, Poach, Switcheroo, nerfs, Hot Chilli, arming a Scheduled, Grease the Palm | 1/turn, zone-once per opponent |
| Build | Buffs, Food, eating a rat, Rat Trap, recovery | 1/turn |
| Reactive | Wok Block, Cat, Snitch, Sleeper, Milk-type Foods | Unlimited |
| Free | Firing an armed Scheduled | Any time legal |

**"Draw instead of acting"** replaces your ACTION, not your draw. This
exists to kill dead turns and permits cutting most dedicated draw cards.

### 4.4 The one-rat-in invariant
**No card effect may move more than one rat INTO your own kitchen per
turn.** Effects may move any number OUT, or between opponents. Exempt:
draws (so Runner Rat chains work), and the When Drawn rat release.

Switcheroo is exempt — equal-count swaps cannot increase your count.

Without this rule, instant win-checking makes any multi-rat card a win
button.

---

## 5. RATS

Every rat: COUNT 1, plus a WEIGHT and a HEAT. At most one static property.
No triggered abilities — triggered per-rat state caused the recirculation
bug in Combined, and rats move far more in v3.

| Rat | Weight | Heat | Property | Copies (6P) |
|---|---|---|---|---|
| Rat | 1 | 1 | — | 1 |
| Runner Rat | 1 | 1 | On entry: draw again | 1 |
| Fat Rat | 2 | 2 | — | 2 |
| The Sow | 2 | 2 | While held: +1 draw each turn | 1 |
| Alpha Rat | **3** | **3** | — | 1 |
| Sewer Rat | 1 | **0** | Colourless. Invisible to inspections | 1 |
| Toll Rat | 1 | 1 | If your kitchen is inspected, the inspecting player gives you a card from hand | 1 |
| Feral Rat | 1 | 1 | Cannot be **dumped** (Hot Ratato) | 1 |
| Spice Rat | 1 | 1 | Cannot be **exploded** (Hot Chilli) | 1 |
| Boiler Rat | 1 | 1 | Cannot be **stolen** (Poach) | 1 |
| Larder Rat | 1 | 1 | May eat itself without a Food card | 1 |

**12 rats, 17 weight, 16 heat at 6P.** (Verified: colour heat sums to
4/4/4/4 with Sewer Rat colourless.)

**Scarcity flag:** 17 total weight against a threshold of 5 means three
players could theoretically reach it. Scarcity is therefore NOT fully
binding at 6P — it constrains but does not alone prevent multiple players
finishing. Tightening to ~15 total weight would make it binding at two.
Leave as-is for the first paper test; this is a tuning dial, not a fault.

### 5.1 Design notes
- **Alpha Rat** is the marquee card. Alpha + any two rats = weight 5, so
  the fastest win in the game needs only three rats. Alpha + a Fat Rat is
  weight 5 from TWO rats — but heat 5 against 3 Stars, a one-shot death
  from full health. Fastest route is the most fragile. Self-balancing.
- **The three immunities are deliberately non-overlapping**, one attack
  vector each: Feral blocks dumping, Spice blocks exploding, Boiler blocks
  stealing. Boiler was re-roled from "immune to single-rat removal", which
  had silently swallowed Spice Rat's entire job.
- **Sewer Rat vs Toll Rat are NOT redundant.** Sewer avoids inspection
  (heat 0); Toll punishes it. Rat tax cannot live on Sewer Rat — a heat-0
  rat is never worth inspecting, so the text would be dead.
- **Larder Rat survives universal eating.** Eating any rat costs a Food
  card; Larder Rat eats itself for free. That is the distinction. 1 copy.
- **Weight-2+ rats capped at 4 of 12** (2 Fat, 1 Sow, 1 Alpha). More and
  eating becomes the dominant Star engine.

### 5.2 Eating
**Sacrifice a rat on your turn: regain Stars equal to its WEIGHT.** Costs
your build action and a Food card (except Larder Rat, which is free).

Weight therefore means "how much rat there is" in both directions —
damage when inspected, food when eaten. Fat Rat is dangerous under
inspection and valuable in the pan; Sewer Rat is safe but nearly worthless
eaten.

Two healing routes exist (Food pairs, §7.1; eating, here). Kept
deliberately: Food costs cards, eating costs progress. Different prices for
the same thing.

### 5.3 Colour
Four colours. Every rat carries one except Sewer Rat, which is colourless.

**Distribution is balanced by HEAT, not by count**, because Scheduled
damage reads the heat of matching rats — equal heat per colour means equal
expected damage per inspection colour. At 6P, 16 heat over 4 colours =
**4 heat per colour**:

| Colour | Rats | Heat |
|---|---|---|
| A | Alpha (3) + Rat (1) | 4 |
| B | Fat (2) + Runner (1) + Feral (1) | 4 |
| C | Sow (2) + Fat (2) | 4 |
| D | Spice (1) + Boiler (1) + Larder (1) + Toll (1) | 4 |

Uneven COUNTS per colour are a feature: colour D is four cheap bodies,
colour A is a single monster. Same inspection risk, different profile.

Match probability rises with hoard size automatically — 1 rat = 25%
exposure, 5 rats = 76% — so a bigger operation has more to find, with no
extra rule. Four colours chosen over three (saturates: 80% exposed by four
rats) and five (67% at threshold, so a third of inspections whiff at the
critical moment, which reads as luck).

Production cost nil — rat cards already carry a border-colour split.

Chosen over three-of-a-kind triggers, which require drawing matching cards
and so add variance to a mechanic meant to reduce it.

---

## 6. INSPECTIONS

Colour governs LEGALITY. The Scheduled family additionally scopes DAMAGE to
the colours it names.

| Type | Timing | Legal against | Damage |
|---|---|---|---|
| **Naked Mole Rat (Snap)** | Immediate, on your turn | **Any kitchen** — colour-agnostic | **Flat 1 Star** |
| **Scheduled, 1 colour** | Arms 1 round, fire at will | Kitchen holding that colour | Heat of that colour's rats |
| **Scheduled, 2 colours** | Arms 1 round, fire at will | Kitchen holding **either** colour | Heat of both named colours |

**Rats are never removed by inspection.** The inspector fines; only the
Exterminator clears. This is the pivotal change from v11/Combined, where
inspection both damaged and cleared — that dual role is why rats never
survived long enough to accumulate.

### 6.1 The Naked Mole Rat
Blind and colourblind: smells rats but cannot see how many. Colour-agnostic
and always exactly 1 Star, regardless of what is in the kitchen. This is
why a Fat Rat does not increase Snap damage — the mole rat never reads heat
at all.

### 6.2 The Scheduled spectrum
Legality widens with colour count while damage stays scoped to what is
named — three cards on one curve rather than one card with an exception:

| Variant | Legal against | Typical damage |
|---|---|---|
| 1 colour | ~1 kitchen in 4 | 1–2 |
| 2 colours | Most kitchens | 2–3 |

**Two-colour requires EITHER colour present, not both.** Requiring both
would make it harder to play than the strictly stronger all-colour version,
inverting the curve.

**CUT — all-colour Scheduled.** At 3 Stars it one-shot a developed kitchen
from full health. The Scheduled family is now 1-colour and 2-colour only.
Consequence: no inspection can now legally target a kitchen whose rats are
all of unnamed colours, and Sewer Rat is untouchable by Scheduled entirely.
The Naked Mole Rat is the only universal-legality inspection, which makes
its flat 1 Star the reliable chip damage in the game.

### 6.3 Counts
Total inspections ≈ **(P + 2) / 2** — 2 at 3P, 4 at 6P, 5 at 8P.

Derivation: Stars are 3, so a developed kitchen dies to roughly 1.5
inspections, and clearing a 6P field to last-standing costs ~7.5. Combined
ships NINE. That is precisely why attrition swamped collection there. For
collection to be the primary win route, inspections must sit well below the
field-clearing number.

Provisional 6P split: 2 Naked Mole Rat, 1 one-colour Scheduled, 1
two-colour Scheduled.

### 6.4 Wok Block
May reactively cancel the firing of **any** inspection type. Count: 1 per
~3 players, max 3 at 8P (3–5P: 1, 6–7P: 2, 8P: 3). Deliberately scarce —
sole general counter to the whole inspection family, so it should matter
when drawn rather than be reliably available.

### 6.5 Grease the Palm
Discards a target's armed Scheduled before it fires. A read, not a reflex.

### 6.6 CUT — Tip-Off / Steak Out
The global auto-trigger is rejected: reaching threshold in the open while
being shot at is an achievement, and a system-level backstop punishes it
while removing agency.

The proposed replacement (play on a kitchen; if they draw a rat next turn,
inspect) is **redundant with Rat Trap** — identical trigger condition, and
Rat Trap's payoff is more interesting. Cut. Three inspection types are
sufficient.

---

## 7. CARDS

### 7.1 Food
All Food cards boost. Beyond that:
- **2 Food = 1 Star.** (3-for-2 removed.)
- Some Food additionally **removes nerfs from your rats**.
- Some Food additionally **removes buffs from opponents' rats**.

Three Food types, one extra line each — split rather than stacked, so no
single card carries everything.

**CUT — Milk.** A Food that strips nerfs from your own rats already counters
Hot Chilli, generalised. A card answering exactly one other card is
strictly worse than one answering a category.

### 7.2 Rat movement — three directions, no overlap

| Card | Direction | Notes |
|---|---|---|
| **Hot Ratato** | Yours → theirs | Dump pressure. Reduced count |
| **Poach** (was The Sweep) | Theirs → yours, or theirs → Bins | Steal pressure. Increased count. Boost moves 2 |
| **Switcheroo** | Simultaneous, both ways | Swap 1 rat. Boost swaps equal COUNTS regardless of weight |

Renamed Sweep → **Poach**: culinary and larcenous simultaneously.

Splitting direction across cards lets dump pressure and steal pressure be
tuned independently by count — impossible if one card does both.

**CUT — all CW/CCW directional cards**, including WD variants. Directional
rotation adds table-position dependency that the zone-once rule already
handles better.

### 7.3 Protection — now distinct
- **Cat** — reactive. Blocks the next single attack on your rats (theft,
  dump, explode, removal). Does **not** block inspections; that is Wok
  Block's job. One-shot, then discarded.
- **Board Up** — no one may attack you for one turn.
- **Territorial** — played on a kitchen; that kitchen cannot RECEIVE rats
  on their turn, whether drawn, dumped, swept or delivered.

**RULED:** a Territorial'd player who draws a rat sends it to the Bins.
Territorial therefore destroys draws, not merely transfers.

**RULED:** When Drawn effects DO bypass Board Up.

### 7.4 Bins access
- **Trojan Rat** — Bins rat → an opponent's kitchen.
- **Special Delivery** — Bins rat → your kitchen.
- **Trash Diver** — recovers an **action card** only, no rats. Repurposed
  to remove overlap with the above.
- **When Drawn: Rat Release** — see §8.2.

**CUT — Inheritance.** Fires only on elimination; too narrow, and overlaps
the cluster above.

### 7.5 Other
- **Rat Trap** — played on any kitchen including your own. If the next card
  that player draws is a rat, you may keep it or discard it.
- **Hot Chilli** — explodes a rat. Rat removal ONLY, no Star damage. The
  removed rat goes to the Bins, making this a recycling valve. Blocked by
  Spice Rat.
- **Exterminator** — the only voluntary self-clear.
- **SIDELINED — Russian Roulette.** v11 text: pulls 1 rat from the pile,
  shuffles with 1 card from each opponent's hand, all draw blind; Boost
  stakes a rat from your own kitchen. Park until the core loop validates.
  Likely needs a 4P+ floor.

### 7.6 Unchanged
Cook the Books, Big Cheese, Kleptomaniac, Shakedown, Snitch, Sleeper,
WD: Audit.

---

## 8. THE BINS AND SUPPLY

### 8.1 Rats live in the DECK; Bins access is card-only
Making the Bins a draw-step option was tested against its own what-if and
fails: a guaranteed rat of your chosen colour beats a random action card
most turns, so nobody would ever draw from the deck and the action deck
would stop circulating.

### 8.2 The Bins IS the discard pile
One zone. Spent action cards and shed rats go to the same place; cards that
"take from the Bins" are rummaging through rubbish. At reshuffle the whole
pile — rats included — returns to the deck.

A separate static Bins reserve fails its what-if: rats would only flow out,
so it must start large enough to cover every pull (~8 at 6P), pushing total
reachable rats high enough that several players could finish
simultaneously. Merging removes the problem — the pile refills every time a
rat is removed from any kitchen, so outflow cannot outrun inflow.

Also removes a zone from the rules, fits the fiction (a night-market bin
holds rubbish and rats together), and gives Trash Diver a distinct job.

**Seed 6 rats at setup**, since the pile is otherwise empty and early
When Drawn releases would whiff.

**When Drawn: Rat Release.** Reveal the top card of the Bins. If a rat, it
joins the kitchen holding the most rats of that rat's colour. Ties, or no
holder, go to the drawer. Exempt from the one-rat-in invariant.
4 copies at 6P — it is the primary Bins drain, and works precisely because
a card whose only text is "gain a rat" would be filler in hand, but costs
nobody a turn when it fires on reveal.

### 8.3 Supply
Roughly **T + (P − 1)** rats: 7 at 3P, 12 at 6P, 14 at 8P. Keeping total
supply low enough that two players cannot both reach threshold is what
makes scarcity the balancing force, now that inspections no longer remove
rats.

---

## 9. TABLE-STATE HYGIENE

### 9.1 Zones are fully public. Hand is the only private information.
Face-down mechanics and hidden zone information are incompatible with the
game's design. Do not reintroduce them.

### 9.2 Zone-once
One interaction per opponent's kitchen per turn, across all cards.

### 9.3 Turn-duration card tracking
**Any card lasting a turn is placed in front of the PLAYER WHO PLAYED IT,
and is discarded at the start of that player's next turn** (step 1 of the
turn sequence). Cards affecting someone else still sit with the player who
played them, not the target.

This exists because a duration card nobody is watching lingers
indefinitely. Tying removal to the one player who cannot forget it is there
— because clearing it is how they start their turn — makes it
self-policing.

**Current turn-duration cards:** Board Up, Territorial, armed Scheduled
inspections. Keep this list current; every new duration card must be added
here.

---

## 10. OPEN ITEMS

1. Exact copy counts for non-rat cards at each player count.
2. Full card-text pass.
3. Total weight tuning (17 at 6P permits three finishers; ~15 binds at two).

---

## 10b. SIMULATION RESULTS — FINAL

Rebuilt on the current architecture (rk3b_sim.py). Bots use a fixed
priority policy, so structural conclusions (supply, Stars, threshold,
seeding) are reliable; card-count fine-tuning is not, and is left to the
paper prototype. Three sim bugs / non-implementable knobs were found and
corrected during tuning (see 10c).

### Locked structural settings
| Parameter | Value |
|---|---|
| Threshold | WEIGHT 5, fixed all player counts |
| Stars | 3 |
| Total rats | ≈ 5 + P |
| Deck / Bins split | ≈ 60 / 40 (rats seeded into the Bins at setup) |
| Deck size | ≈ 130 cards |
| Inspection damage | 2 minimum (via printed HEAT, not a multiplier) |

### Recommended per-count build
| P | Deck rats | Bins seed | Total | Winner med | p90 | All-player | Stalemate | Rat King | Last standing |
|---|---|---|---|---|---|---|---|---|---|
| 3 | 5 | 3 | 8 | 13 | 26 | 12 | 0.1% | 66% | 34% |
| 4 | 5 | 4 | 9 | 12 | 26 | 10 | 0.1% | 77% | 23% |
| 5 | 6 | 4 | 10 | 13 | 26 | 9 | 0.2% | 85% | 15% |
| 6 | 7 | 4 | 11 | 11 | 26 | 8 | 0.4% | 89% | 11% |
| 7 | 7 | 5 | 12 | 9 | 26 | 7 | 1.0% | 91% | 8% |
| 8 | 8 | 5 | 13 | 9 | 27 | 7 | 1.4% | 93% | 5% |

Stalemate ≤1.4% everywhere (was 10%+ at 8P). Winner turns 9–13, all-player
7–12. Rat King / last-standing split is healthiest at low player counts
(66/34 at 3P) and collection-dominated at high counts.

### The principle that drove every fix
Stalemate is starvation: the threshold is a large fraction of all the
weight in play, so nobody can reach it when rats spread evenly and the deck
is dry. Two rules follow:
1. **DENIAL moves rats; REMOVAL destroys supply.** Poach / Hot Ratato /
   Switcheroo redistribute and are safe to increase. Hot Chilli /
   Exterminator / Territorial drain the board and are the measured
   stalemate sources — keep them scarce.
2. **Elimination is the biggest recycling event** — a dead player's whole
   hoard hits the Bins at once. This is why inspections dealing 2 (not 1)
   cured stalemate: faster elimination unlocks frozen supply. It is also
   why raising Stars past 3 made things worse — it suppressed the
   eliminations that recycle rats and provide the attrition win route.

### The deck/Bins split resolves the Bins-card conflict
Bins-access cards (Trojan Rat, Special Delivery, Trash Diver, WD Release)
need a stocked Bins to function, but stocking the Bins by ADDING rats
inflates supply and collapses the game (seed 22 → 3-turn games). The fix is
to seed the Bins by MOVING rats out of the deck, holding total supply flat.
At the 60/40 split the Bins holds a rat 95%+ of the game while pacing is
unchanged.

## 10c. CORRECTIONS MADE DURING TUNING (what-if failures caught)
Recorded so they are not repeated:
1. **Inspection ×1.5 damage** — a multiplier cannot be printed on a card.
   Replaced with printed HEAT values (inspections deal 2 via rat heat).
2. **Deck sizes of 142–432 cards** — not manufacturable. Constrained to
   ~130. This had made "4 rats total" look viable; it was not.
3. **Bins-seeding bug** — seeding had REMOVED rats from the deck instead of
   adding them, so early low-supply results were a different game. Fixed;
   all seeding results above are post-fix.

## 10d. OPEN CARD-LIST QUESTIONS (for the paper build, not the sim)
The structural numbers are solid. These card-level details are not yet
pinned and the sim cannot settle them:
1. **Which rats print at HEAT 2**, and how many, to make a typical
   inspection deal 2. Currently modelled as a fraction, not a specified
   list.
2. **Actual inspection card count.** "×4.5" is a density multiplier
   standing in for ~12–15 inspection cards at 130 total — needs converting
   to real copies and checking against the colour split so every colour is
   inspectable.
3. **Denial-card copy counts** (Poach / Hot Ratato / Switcheroo), which set
   how fast the Bins refills from shed rats. Set by ratio in the sim, not
   by decided copies.
4. **Exterminator and Grease the Palm** fire <0.1×/game — either their
   trigger conditions are too narrow or they earn no slot. A table call.

## 10e. BUILD-READY NUMBERS (smart-bot sim, final)

The bot was rewritten to play defensively — fire armed inspections at close
rivals, strip a leader who is about to win, shed heat when overextended and
under lethal threat, board-up and heal when targeted, hold rats back when
grabbing one would be fatal. This is far closer to real play than the
earlier priority bot, and it revised the numbers: with smart play, MORE
rats shortens games (someone reaches 5 faster), so rat supply scales DOWN
per player as the count rises, expressed cleanly as a fixed DENSITY.

**Design decision: tune 3–6P cleanly; 7–8P is a bonus that need only avoid
stalemate. Threshold fixed at 5 (may go lower, never higher).**

### Rat density is the single lever
Rats as a fraction of the deck, held constant across player counts. Total
rats = density × deck; split ~60/40 deck/Bins.

| Density | Winner turns | Stalemate (7–8P) | Last-standing % |
|---|---|---|---|
| 10% | 8–9 | 0.4–1.0% | 9–18% |
| **13%** | **6–8** | **0.0–0.2%** | **4–14%** |
| 15% | 5–6 | 0.0% | 2–12% |

**Recommended: 13%.** Stalemate ~0 everywhere, winner turns 6–8, healthy
win-route split. Playtest in the 10–15% band — the exact value depends on
real deck movement, which the sim cannot fully predict.

### Recommended build (13% density)
| P | Rats total | Deck rats | Bins seed | Deck size | Winner | Stalemate | Rat King / Last |
|---|---|---|---|---|---|---|---|
| 3 | 15 | 9 | 6 | 107 | 7 | 0.0% | 89 / 11 |
| 4 | 16 | 10 | 6 | 116 | 7 | 0.0% | 86 / 14 |
| 5 | 16 | 10 | 6 | 116 | 8 | 0.0% | 90 / 10 |
| 6 | 16 | 10 | 6 | 116 | 7 | 0.0% | 94 / 6 |
| 7 | 16 | 10 | 6 | 116 | 7 | 0.2% | 95 / 4 |
| 8 | 16 | 10 | 6 | 116 | 6 | 0.2% | 96 / 4 |

Inspections: 14 at 3P, 22 at 4–8P (split 40/35/25 Snap / 1-colour / 2-colour
Scheduled). Denial: 12 cards (split 45/30/25 Poach / Hot Ratato /
Switcheroo). Stars: 3.

### Winner-turns is the honest metric; all-player-10 was unreachable
All-player turns ≈ winner turns, always, because every player plays roughly
the same number of rounds. Giving 8 players 10 turns each requires the
winner to take ~10 too, which needs threshold above 5 — ruled out. This is
normal genre behaviour: large-count games run faster per person (as in Uno,
Coup). Accepted rather than fought.

### Bluffing — flagged for v3.1, not built
The game currently has little bluffing (zones are public; only the hand is
hidden). A clean future addition: place an armed Scheduled FACE-DOWN —
opponents see something is armed and its colour requirement but not its
strength or exact colours, so they must decide whether to push toward the
threshold without knowing if the trap hits them. Real bluff, no new
hidden-zone mechanic. Test after the core loop.

## 11. READINESS

**Ready for paper prototype at 5–6P. Not ready for engine or simulator.**

Both need exact counts; building either before the loop is validated risks
tuning something that gets thrown out. A paper test answers the question
that matters first — is hoarding-under-threat fun? Does an armed Scheduled
on the table change how you play? Is dumping under duress a real dilemma?
Does the colour gate create decisions or just admin? None of that needs
final numbers.

**Watch specifically in session one:**
- Does the colour gate leave enough legal targets to keep inspections
  playable?
- Does "draw instead of acting" become the default turn? If players draw
  more than they act, the action cards are not pulling their weight.
- Does any player reach 4+ rats of one colour? If never, colour is purely
  a legality throttle and the spectrum can be simplified.
- Do turn-duration cards get forgotten despite §9.3?


## 12. POST-BUILD CHANGES & POTENTIAL LIST (latest playtest pass)

### Applied to the build
- **Alpha Rat: weight 3 → 2.** Data showed the winner held the single Alpha
  in 59% of Rat King wins — a near game-deciding draw. At weight 2 that
  drops to 33%: still the best rat, no longer a winner-flag. Heat stays 3.
- **Poach: can only take a WEIGHT-1 rat.** Lore — a poacher can only carry
  off so much. Also caps the biggest swing in the game (stealing a Fat/Alpha
  off a leader). Immunities (Boiler) still apply on top. Side effect:
  collection/attrition split improved to ~64/36 because leaders keep their
  heavy rats longer, so more games reach elimination.
- **Scheduled inspection must fire the turn AFTER it is armed, then it is
  discarded.** It can no longer sit indefinitely. Only whiffs if the target
  sheds the matching colour in the intervening turn. This fixes the sim
  loophole where inspections sat around; real inspection pressure is
  therefore higher than earlier tables showed.
- **A Scheduled cannot be armed if no opponent holds any colour** (nothing
  legal to point it at).

### Stars — confirmed 3 (not 5)
Reverted after the smart-bot run; higher Stars suppressed attrition without
lengthening games.

### Potential list (not built)
- **Face-down Scheduled inspections (×2 of them).** Played turned around so
  opponents see something is armed and must react before knowing its colour.
  Pairs naturally with fire-next-turn: a real bluff window. The strongest
  candidate to add next.
- **Switcheroo: swap by equal WEIGHT, not equal count.** Refinement to test
  after the core loop.
- Test whether adding a few rats brings Rat King vs attrition closer at high
  player counts.


## 13. ALPHA & FAT — SOLVED (latest data pass)

### Alpha Rat — final rule
- **Weight 2, heat 3, shown on ALL 4 colours** (largest inspection target).
- **Win path: hold Alpha + 3 other rats (4 total, any weights) = win.** This
  is Alpha's entire reason to exist — it is the only rat where COUNT beats
  WEIGHT. Without this rule a weight-2 Alpha is strictly worse than a Fat Rat
  (same weight, higher heat) and should just be a second Fat.
- **Placed randomly in the DECK**, not bottom-of-Bins. Bottom-of-Bins was
  tested and BACKFIRED: it made Alpha arrive late, so whoever was already
  winning grabbed it — pushing Alpha-in-winner UP to 50%. Random-in-deck
  plus the 4-rat requirement lands it at ~22%.
- **Hold-one-round retained**: an Alpha drawn this turn cannot complete a win
  until the owner's next turn, giving opponents a steal/inspect window.

Result: Alpha appears in ~18-26% of winning kitchens across 3-8P — a
distinct win path, no longer a kingmaker.

### Fat Rat — left at weight 2 / heat 2
Tested and REJECTED as changes:
- **Fat weight 3**: dominant — 83% of winning kitchens, crushes Alpha to 10%
  and shortens games to 7 turns. The only rat that matters. Rejected.
- **Fat heat 3**: no effect on Fat's popularity (57%→58%) and breaks the
  4/4/4/4 colour-heat balance. Not worth it.
- **More colours on Fat**: no effect (60%→61%). Colour is not a lever for
  Fat because its value is raw weight, not a disruptable win-setup.

**Finding: Fat being the most-wanted rat (~58-70%) is structural and
healthy.** Weight is intrinsically valuable; every attempt to tax it via
colour or heat either does nothing or unbalances the colour system. The
heavy rat should be the wanted one. If ever too high, the only working lever
is supply (one fewer Fat), not colour or heat.

### FINAL LOCKED VERIFICATION (all cards live, smart bot)
| P | Split (RK/last) | Stalemate | Winner med | p90 | Alpha % | Fat % |
|---|---|---|---|---|---|---|
| 3 | 73/27 | 0% | 8 | 13 | 18% | 59% |
| 4 | 57/43 | 0% | 8 | 13 | 22% | 59% |
| 5 | 58/42 | 0% | 9 | 14 | 24% | 61% |
| 6 | 63/38 | 0% | 9 | 15 | 26% | 59% |
| 7 | 58/42 | 0% | 10 | 17 | 22% | 63% |
| 8 | 51/49 | 0% | 12 | 18 | 17% | 70% |

Stalemate 0% everywhere. Winner turns 8-12. Collection/attrition split
51-73% (healthiest at low counts, near-even at 8P). Alpha 17-26%, Fat
59-70%.

### Other confirmed
- **Stars = 3** (not 5). Stars is the collection-vs-attrition dial: 3→5
  swings the split from 59/41 to 84/16 with almost no length change. 3 fits
  the cutthroat lore and keeps elimination a live threat. 5 is the dial to
  turn if playtesters find elimination too punishing.
- **Threshold = 5** confirmed. Threshold 6 flips the game to attrition-
  majority (39/61); 7 more so (28/72). 5 keeps Rat King the primary route.
