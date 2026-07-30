# Changelog

Every notable change to **Iro 色 — A Dictionary of Color Combinations**,
newest first.

## Why this file reads the way it does

The code in this project is written by an AI (Claude); the owner doesn't read
JavaScript, HTML, or CSS. It would be easy to call that "vibe coding" and
assume the machine just ran off on its own. It didn't. Every release below
started with a specific request from the owner — a feature to add, a bug that
annoyed them, a layout that felt wrong — and every design call was a human
decision: weighing options, previewing mockups, and sometimes reversing course.

So each entry pairs **what changed** with **the prompt that drove it** (quoted
verbatim — typos preserved — from [`PROMPTS.md`](PROMPTS.md), the append-only
log of the owner's words). Read top-to-bottom it's a release history; read the
quotes alone and it's a record of how one person steered an AI build, one
incremental, deliberate decision at a time. The guidance runs both ways, too —
the owner has explicitly asked Claude to *push back* when a request goes against
a standard (see the wheel-orientation work on 2026-07-20).

This project follows [Semantic Versioning]. The site redeploys on every push to
`main`, so a few improvements reached the live site *between* tagged versions;
those are grouped under dated headings in the right chronological place.

[Semantic Versioning]: https://semver.org/

---

## v1.9.1 — 2026-07-30 — The photo goes first, and the buttons travel

Two placement fixes on the **You** tab, both reported by the owner from using it.

**Take a photo was the last thing on the page.** That reads fine on an empty tab
— there is nothing else on it — and badly in every other state. Open a season
someone shared with you, or come back to a reading from earlier, and the page
fills with fifty colour swatches and a grid of plates; the one control a
first-time visitor actually needs was below all of it. It now sits directly
under the paragraph that explains it.

**And the "Browse / Start a palette" buttons now travel with you.** They kept
getting lost in the long lists, and the fix so far had been to repeat them —
one copy, then two, then briefly three. The owner named a better answer, and
there is now exactly **one set, pinned to the top of the screen** for as long as
there are colours or combinations left to scroll. The explanation that used to
wrap them stays down with the swatches, where "pick any swatch above" is true.

> **The owner's prompts** (from [`PROMPTS.md`](PROMPTS.md)):
>
> *"on the you page, the take a photo needs to be on the top, right now it
> current prepopulates with a season and the photo button on the bottom gets
> lost. we need the photo up at the top so it's a clear entry point. i also
> think we need another copy of the browse and start from pallete set of buttons
> around the your and season color palletes. when the colors return a lot of
> values, those buttons get lost from the long list"*
>
> *"actually, since i have those buttons repeated 3 times on the pages now.
> maybe we have those brose/start be a floating set of buttons so it's out of
> the way but travels with the user as they scroll on the desktop / phone"*

The bar pins to the **top** rather than floating at the bottom, because the
corner seal is fixed bottom-right and two things in one corner is how one of
them ends up underneath. Also fixed in passing: a line that told you to take
your photo "below", which had just stopped being true.

---

## v1.9.0 — 2026-07-30 — Every way into a colour, in one place

**Match > Colors was a dead end.** Its Shades and Families levels each have a
working picker; the Colors level had a sentence — *"Search a color name above,
or snap a color with the camera"* — which points at buttons somewhere else and
leaves you looking at an empty panel. It now shows the four ways in as cards:
**search by name, camera, upload a photo, pick a color**. Choosing one opens
that capture screen directly and lands on the same result screen as always.

**And the camera stopped hiding behind a pencil.** The button next to the search
box carried a pencil glyph, which means *edit* — its own accessible name said
"sample a color". It is now a camera, and it says **Sample** in words next to
it, because a bare icon is undiscoverable whichever glyph it wears.

Both places draw the same cards from one component, so they cannot drift apart.
Search is deliberately the odd one out: it focuses the search box that is always
in the header rather than opening a second one, which teaches where the
permanent one lives.

> **The owner's prompts** (from [`PROMPTS.md`](PROMPTS.md)):
>
> *"i want to change the pencil icon next to find a color to a camera icon …
> i think people will better grivitate to a camera knowing it's for a picture …
> the options under the pencil aren't that visable to the user and i want more
> ways to show that there is a camera option avaiable"*
>
> *"i also misspoke about the match > colors page. it only really populates
> after i come from the you page > browse a color. but on its own there's no way
> to get to a similar page. which is why i opted to fill it with some cards of
> other ways to get in a color"*

**What did NOT change, on purpose:** Match still opens on **Shades**. Colors
offers 157 options against 23, and Shades has a working picker — a builder that
narrows should not start at its widest. The dead end was the problem, not the
default.

Design: [`docs/superpowers/specs/2026-07-30-colour-entry-gallery-design.md`](docs/superpowers/specs/2026-07-30-colour-entry-gallery-design.md).

---

## v1.8.3 — 2026-07-30 — A mark that stays put, and a colour you choose

Four small things, all reported by the owner from actually using the site.

**The seal in the corner scrolled away.** It looked pinned everywhere else,
because on short pages a footer lands at the bottom of the window and there is
no way to tell the difference. The You tab — fifty colour swatches and a grid of
combinations — was the first page long enough to give it away. It is now
genuinely fixed, and it does not intercept clicks meant for the page beneath it.

**The version number sits next to it**, and links to its own entry in this file.
It is read from the project's own version at build time rather than typed into
the page, and a test now refuses to let the version, this changelog and the
README disagree with one another. That test exists because the release before
last found a hand-written number that had been wrong in three places for months
— and this number is on every screen, in front of everyone.

**The two "take these further" buttons now appear above the colours as well as
below them.** With fifty swatches and a combination grid in between, anyone
reading from the top had a long way to scroll before discovering there was
anywhere to go.

**And "Start a palette from …" now starts from a colour you choose.** It used to
pick the first one and hope. You can click any swatch — or arrow-key across them
— and the button retargets to it. The grid is a single stop when tabbing through
the page rather than fifty, which matters rather a lot when there are fifty.

One regression, caught by the site's own tests before it shipped: the new version
badge was smaller than the minimum size a finger can reliably hit, and the
phone-width suite failed the moment it was added. Its target is now bigger than
its text looks.

---

## v1.8.2 — 2026-07-30 — Taking all your colours with you

Reported by the owner, and diagnosed by them too:

> when i click build a palette in match or browse these in the book … the list
> of colors that's let's the user explore is only 1 color … it seems that the
> match and browse tabs are not made for the season and floor filters

They weren't. **The You tab worked out nineteen colours for you and then handed
exactly one of them to the rest of the site** — and not even a good one: it
picked whichever had the lowest number in the book, which needn't be a colour
you could see on screen. Both buttons said "these".

**Browse now takes the whole palette.** It arrives as a chip you can dismiss —
*"Your colours · 19 colours"* — with the same four-step control from the You tab
sitting beside it, so you can go from *anything with a match* down to *every
colour is yours* and watch the list narrow. Nineteen colours give thirty-four
combinations at "half or more", and two at the strictest setting.

**Match still takes one colour, and that turns out to be right.** Match works by
narrowing: it looks for combinations containing *every* colour you have added,
so handing it nineteen would have found **nothing at all**. More colours, fewer
results. What was wrong there was not the behaviour but the promise — so the
button now names the colour it will start from, and a line underneath explains
that Match narrows and you can add more once you are there.

Also fixed: changing a Browse dropdown used to silently throw away the palette
you had just carried in.

**One thing worth admitting**, since this file is meant to be honest about how
the work goes: the first version of this fix claimed the Match button now starts
from your *best* colour. That is true for a season palette, which arrives ranked,
and false for a measured one, which is not sorted at all. The claim was quietly
wrong in three places — the code comment, the button and the note under it — and
was corrected to what the code actually does before shipping. That is the same
failure the previous release spent six passes hunting, made again within a day,
which is a fair measure of how easy it is.

**One deliberate limit:** a palette-filtered Browse lasts your session but is not
shareable. Your measured colours are worked out from a photograph of your face,
and putting nineteen of them in a link is a quieter version of the thing this
site already refuses to do.

---

## v1.8.1 — 2026-07-29 — Checking the labels

A bug hunt and a documentation audit, on the owner's instruction to keep
looping until nothing turned up:

> do not assume that the code comments reflect what the actual code is doing

**The Back button worked, then didn't, then did.** Deep links taught the site to
respond to Back, and the rule agreed with the owner covered opening a panel and
changing a filter. It never mentioned switching tabs — so going to the You tab,
taking a photo and pressing Back left the site entirely and threw the reading
away. Back now returns to the tab you came from.

One related thing is **still not fixed, and is written down instead**: on a
phone, Back with the camera open leaves the site. There is no Escape key on a
phone and these screens fill the display, so Back is what "cancel" means. Two
attempts at it were reverted — one broke the photo flow outright, the other
looked fine and quietly did nothing. The cause turned out to be two parts of the
site each trying to own the same piece of browser history, which needs a design
rather than a third attempt. Both dead ends are recorded so the next go starts
informed.

**The site was telling everybody a wrong number.** For several releases the You
tab, the About panel and the README all said Wada's palette runs *"109 of its 157
colours warm against 48 cool"*. The rule the site actually uses to decide warm
from cool gives **110 and 47**. Nothing computed the 109 — somebody typed it, and
it was wrong in three places.

The fix was not a better number. **The number is gone**: the count is now worked
out from the book itself, by the same rule the palette uses, so the disclosure
and the feature cannot disagree again. A test fails if anyone types it back in.

That set the tone for the rest of the audit, which found a **stale coverage
figure, a stale test count in two files, a rule that said "both papers" when
there are three** — and, more importantly, that the paper it quoted numbers for
is not the one where the margin is tightest — **a command the README never
learned about**, and **two design documents that no longer matched the code they
described**. Those two were corrected the way this project requires: a dated note
at the top saying what changed and why, rather than a quiet edit that pretends
the original was always right.

The pattern is worth stating, because it will hold next time too: **every wrong
number in this release had been typed rather than measured.** Everything that was
measured — chroma, contrast ratios, palette sizes, caption widths — checked out
exactly.

**Also:** one screen that had grown to eight jobs was split into three, with no
change in behaviour — proved by 900-odd tests passing without one of them being
touched.

---

## v1.8.0 — 2026-07-29 — Every screen has an address now

The first feature since the owner set the rule that debt gets paid before
features do. Three bug-hunt patches cleared the way, and two of them turned out
to be load-bearing for this one.

> yes let's go and implment deep links so results are shareable

**Everything is linkable.** Open a colour, filter Browse to reds, build a
palette, find your season — the address bar keeps up, so copying it shares
exactly what you are looking at. There's a **Copy link** button on combinations,
on a built palette and on your season, because phone browsers hide the address
bar while you scroll, and the season feature is used on a phone by definition.

**Your season is shareable. Your measurements are not.** This was the design
question, and the owner chose the careful answer. A link to your season contains
the words `season=deep-autumn` and nothing else — not your skin tone, not your
hair colour, none of the numbers read off your face. Those would otherwise
travel into whatever chat you pasted the link into and sit on that company's
servers. The cost is accepted and real: the "Measured for you" palette can't
come back from a link, and you can't bookmark your own full result. Reloading
still means retaking the photo.

Someone who opens your link sees a plain note that it came from a link and that
nothing on the page is a measurement of *them*, with an invitation to try it
themselves. The whole risk of that screen is somebody mistaking a friend's
season for their own analysis.

**Back closes a panel** instead of dumping you off the site — what most people
expect, and what the Android back gesture means. Changing a filter doesn't add a
history entry, so browsing doesn't bury you in them.

**A shared palette is a saved palette.** This site has no accounts, so a link to
a palette you built is the closest thing to saving it — which quietly completes
the other half of a long-standing request.

**Old links still work, or explain themselves.** A link to a colour that isn't in
the book says so. A saved palette that has lost a colour opens with the rest of
it. That only works because of the three patches that came first: the bug where
an unrecognised id took down the *entire site* was fixed a few hours before this
feature made unrecognised ids reachable for the first time.

**The feature was finished, and then found to be broken.** After a capture the
screen said "Deep Autumn — our guess", but the guess only lived inside the
component and never reached the shareable state — so the link you'd copy was a
bare address with no season in it. *"Someone finds their season and the only way
to show a friend is to make them redo the photo"* — the exact sentence that
justified building any of this — was still true after it was built. Caught by a
test that read the real clipboard rather than trusting the code that fills it.

Also fixed on the way past: copying could fail silently in browsers missing both
clipboard routes, an old bug that had been reachable from every copy button on
the site.

---

## v1.7.3 — 2026-07-29 — The colour in the file you download

The hunt continued, on the owner's instruction:

> make the patch first then keep hunting

**Every image this site has ever exported had text that was too faint.** When you
download a combination as a PNG, the caption underneath it is drawn on a canvas —
and a canvas can't use the site's colour palette directly, so the values had been
copied in by hand. Back in v1.6.0 those colours were all recalculated to meet the
accessibility standard for readable text. The copy in the export was missed. So
the site got fixed and the *file you download* didn't, and it has been shipping
slightly-too-faint captions ever since.

It now reads the real colours at the moment it draws, so there is one source of
truth rather than a copy that can quietly fall behind. A test checks that too.

**A job came off the manual checklist — and turned out to have been aimed at the
wrong plate.** One item asked a human to download combination No. 331, the
five-colour one with the longest name, and check the text didn't run off the edge
of the image. That is now measured automatically for all 338 combinations, which
is the only way it could have been noticed that **No. 331 isn't the longest**.
No. 311 is, by two characters. Checking the plate the list named would never have
revealed it.

And the good news: **it fits.** The longest caption uses 955 pixels of the 1040
available. So the thing that item worried about was never actually happening.
There is now a guard so a longer colour name in some future edition can't start
it happening quietly.

**Also settled while looking around:** the one colour in the book that appears in
no combination at all already has a graceful page of its own — it says it
"appears in no combinations in the book — a wallflower". Somebody had thought
about that. And a sweep of the entire codebase for hand-written colour values
found seven, every one of them legitimate, which means the problem above was one
file rather than a habit.

---

## v1.7.2 — 2026-07-29 — Going looking for trouble

The first release under a rule the owner had just set: fix bugs and debt before
adding features, one feature at a time, with a hunt in between.

> let's go huntin'

The backlog had nothing actionable left on it. **Everything below was found by
looking anyway** — which is the argument for the rule.

**One bad link would have taken down the whole site.** Four screens looked up
what to show by an id and assumed it would be there. It always is today, because
every id comes from clicking something real. But the error net is cast around
the *entire* application, so a single unrecognised id wouldn't have emptied one
panel — it would have blanked the wheel, Browse, Match and everything else, and
left you to reload. That becomes reachable the moment the site learns to put
state in a link, which is the very next thing planned. All four now say "this
isn't in the book" and let you carry on.

**The site was failing the contrast standard it ships a feature to check —
again.** Two separate violations, on a screen that had never been audited:
reaching the season palette needs a photograph, so the automated audit had never
seen it. One was hours old (a "not close" label in the orange, at less than two
thirds of the required contrast); the other had been live since v1.5.0, where a
count badge was faded to 70% opacity and fell below the bar in its resting
state — but not when selected, which is exactly why nobody ever noticed.

The lesson is now written next to the code: **fading text with `opacity` is a
contrast change that no automated check on colours will ever catch**, because
the colour is still correct. The rest of the stylesheet was swept for the same
trick.

**Three core screens had never been audited at all** — a colour's detail panel,
a colour family's panel, and Match with a palette in it. All three pass. That is
worth stating rather than glossing: it means the two violations were specific to
the newest screen, not a problem with the whole design.

**What the site tells you about yourself depended on the order of lines in a
file.** When two seasons scored equally, the winner was whichever happened to be
listed first — in a file that is meant to be hand-edited. Swapping two lines
would have quietly changed a visitor's result. Now decided explicitly.

This was found by pulling a different thread: the analysis can read your
undertone as **neutral**, and all twelve seasons are warm or cool with nothing in
between — so a neutral reading matched none of them and ties became routine. That
turned out to be a second, separate honesty problem, and the page now admits it:
it says your undertone reads neutral, that this season was chosen by depth and
contrast alone, that one from the other side may suit you just as well, and
points at the dropdown. It used to state the same answer with the same
confidence as a clear reading.

**Also, on the value of doubting your own tools:** the new audit reported a
third contrast failure that turned out not to exist. Panels fade in, and the
check was measuring one mid-fade. An hour went into disbelieving it. Worth
spending — a checker that cries wolf about contrast, on a site whose whole
feature is contrast, is a checker everyone learns to ignore.

Nothing about the site looks different, except one label that is now bold rather
than orange, and one honest paragraph that wasn't there before.

---

## v1.7.1 — 2026-07-29 — Working the backlog

A tidying release. The owner pointed at the list of deferred items:

> let's loop over the TODOs and address them. clear out the tech dept and ideas

Fifty items. Nine were genuinely actionable and are now done; three turned out
to be *questions* rather than tasks and got answers instead of ticks; one had
already been finished a release ago and nobody had crossed it off. The rest are
features, product calls, or things that need a person — and are still there,
because pretending otherwise would be the opposite of what this file is for.

**The one that mattered was not on the list.** Writing the single test the
backlog asked for — "check the shade filter actually narrows the results" —
turned up a crash: an unrecognised colour-group id took the whole Browse page
down rather than showing an empty result. Unreachable today, because every
filter value comes from a dropdown. It would have become reachable the instant
the site learns to put state in the URL, which is the very next thing on the
list. Fixed, along with a companion function so labels can render whatever
state holds.

**Overlays now hand focus back.** They already trapped focus properly, but
opening one announced "Close" as the first thing a screen reader said, and
dismissing one dropped you at the top of the page — so a keyboard user had to
tab through the entire header to get back to where they were. Both fixed.

**Two questions answered with measurements rather than opinions.** A different
colour-difference formula (CIEDE2000) was on the list as a possible upgrade: it
was tested over 512 colours spanning the whole spectrum and **declined**, since
it reorders near-identical candidates without giving better answers. And the
low test-coverage numbers on three screens turned out to be a reporting blind
spot — the real-browser suite already exercises all three thoroughly.

**Also:** one control had three different names in three places and now has
two, the second being "the wheel", which is deliberately what visitors call it.
`make check` runs everything and keeps the full log, closing a process note
about how a previous bug hid for months behind a truncated test summary.

Nothing about the site looks different. That is what a tidying release is.

---

## v1.7.0 — 2026-07-29 — The seasons stop being made up

The twelve season palettes on the You tab were invented. This release replaces
them with rules from a published colour system — and the system turned out to
descend from the man who made the book.

The owner started by asking the obvious question:

> for the color analysis. the "seasons" i know it's something you made up, but
> are there standard colors for the season?

There aren't. Every colour-analysis school sells its own swatch book, they
disagree with each other, and none publish the recipe. A page titled *"The
Expanded Winter Colour Season Munsell Matrix"* turned out to contain no numbers
at all.

Claude's next suggestion — define each season by ten hand-picked example
swatches — was **wrong, and the owner said so**:

> examples approach might work. but i don't think i will know how to decide
> between them. maybe it is best to do it rules based? maybe you can go find
> color swatches from korean color analysis and try to find a ruleset for those?
> this is like the blind leading the blind here.

That refusal is what made this release work. Ten swatches nobody can evaluate
are no more auditable than a number nobody can evaluate. Following the owner's
pointer to Korean colour analysis led to **PCCS**, the Practical Color
Co-ordinate System — and then to this:

**Sanzo Wada founded the institute that published PCCS.** He established the
Japan Standard Color Association in 1927; it became the Japan Color Research
Institute, which published PCCS in 1964. He published *A Dictionary of Color
Combinations* in 1933. Korean personal colour analysis runs on PCCS today. The
ruleset and the book share an ancestor.

**What changed**

- **Seasons are computed, not curated.** Membership falls out of a season's
  temperature half of the PCCS hue circle and its set of PCCS tones. No
  hand-picked colour ids anywhere.
- **Two levels, marked differently, because they aren't equally solid.** The
  four parent seasons follow a published rule and are marked sourced with
  citations. The twelve sub-seasons are **ours** and say so. The owner was
  explicit:

  > let's keep the 12 labels snf label what's ours, but when we display it we
  > also aggregate up to the official 4 seasons … i'm all about the transparancy.

- **The fit is shown, not implied.** Each colour displays how close it actually
  is to the season's ideal, with the ideal beside it. Clear Winter gets **one**
  very-close match against twenty-five that aren't. That's not a bug — Wada's
  book is a 1933 pigment book with only eleven genuinely muted colours among
  157, and four seasons are *defined* by mutedness. The page says these are the
  nearest matches in the book, not season colours, on the owner's instruction:

  > we should also be clear that this is doing the closet match to the color
  > pallets in the book, so things will not map 100% … i think that's fair.

- **Six new datasets, each usable on its own**, because the owner asked for the
  data to outlive the website:

  > i'd love for this to become a larger resource. personally this has me
  > wanting to do more research into PCCS and that entire chain of work. really
  > cool set of breadcrumbs!

  Including `pccs-grid.json` — the PCCS hue/tone grid as 288 hex codes, which is
  otherwise hard to find.

- **Every source is verified.** `make check-links` checks each cited URL still
  resolves, on the owner's condition that links must be ones "a human can
  navigate to". It caught one site answering 200 to `curl` and 403 to `fetch` on
  the same day, now recorded as such.

- **New: [`docs/color-analysis-sources.md`](docs/color-analysis-sources.md)** —
  the whole chain with sources, and a plain table of what's sourced and what's
  ours.

**Also fixed, from mistakes made during this release:** the sub-seasons were at
first scored against their parent, which made all three siblings identical; the
tone swatches were drawn at the midpoint of their band, which rendered *bright*
as a washed-out pink; and the new datasets were bundled into the main chunk,
growing it 444 kB → 531 kB and timing out an accessibility audit on a screen
with no seasons on it. All three are now covered by tests. The full list,
including a verification that couldn't fail and had to be redone, is in
[`PROMPTS.md`](PROMPTS.md).

---

## v1.6.0 — 2026-07-29 — Paying down what we owed

**No new feature. On purpose.** This release started with the owner taking
stock:

> i think i've exhaused all the features i can think of from this color pallete
> and what peopel might want to do with it. what do you think?

The honest answer was *mostly yes* — nine ways into 157 colours is enough — but
that the remaining work was finishing, not inventing. The owner chose that over
another feature:

> let's go in and clear up all defects. let's take a pass and see if things also
> need to be refactored. we've built a lot of things from scratch. i know we've
> said not to have dependencies, but i really meant that as "i want this to be
> deployable via github pages" so if you think some parts are better served with
> external libraries, please refactor to use those.

**The site was claiming something the book never said.** For six releases,
Browse, the About panel and the README all told you that a plate's taller bars
mean the dominant colour — "the main garment, the page background". That was
invented. Checked against the data: all 338 multi-colour combinations are stored
in ascending colour-id order, and a combination record holds only its id,
colours, size and an excluded flag. There is no area or proportion field
anywhere. The bar heights are decorative and the order is an artifact of sorting
by id. The copy now says so, and points out that the proportions are yours to
choose.

**The site can now be used without a mouse.** The search type-ahead announced
nothing to a screen reader — no popup, no highlighted result. The nearest-colour
grid made every one of its twelve swatches a separate tab stop, with arrow keys
doing nothing. The colour wheel was silent when you moved it. All fixed, and the
seven full-screen overlays — camera, upload, picker, face capture, probe review
— became real modal dialogs, so Escape closes them and the keyboard can no
longer wander off into the page behind.

**The You tab stops sounding certain when it isn't.** Two guards, both prompted
by the owner's own first use of it — *"i think my camera and lightening isn't
great"*. If the hair probe lands on a forehead or a bald patch it now says so,
rather than quietly reporting the contrast between your face and your face. And
a dark, blown-out or unevenly lit photo now says so *before* you commit to the
reading, while Retake is still one tap away.

**A second test suite, because the first one is blind by construction.** The
fast tests run in a simulated browser that never draws anything, so it cannot
see fonts, colours, sizes or positions. Five defects had already reached the
live site past a fully green run of it. There is now a real-browser suite that
checks what the page actually looks like, and each of those five has a test that
would have caught it. The owner chose the more reproducible of the two options,
accepting a one-time browser download so results are identical everywhere:

> *(decision, from the options offered)* Playwright with its own browsers

It justified itself immediately by catching a bug in the very refactor that
prompted it — the new overlay was rendering as a 447×533 box instead of filling
the screen, and six hundred passing tests had no opinion about it.

**Also fixed:** a long-standing flaky test finally diagnosed (it was a timeout on
genuinely slow work, not a phantom); the upload picker now lets you sample the
edges of a landscape photo instead of cropping them out of reach; dead code and
duplicated constants removed; and the privacy guards strengthened, including
proof that they can actually detect what they forbid.

**A second pass, before shipping.** The owner asked for one:

> before we push. let's go through this all again and see if there are any more
> refactoring to be done and other libraries we can use

It turned up the two biggest gaps of the release. The project had **no linter at
all** — nothing checking twenty React effects or any accessibility rule — so one
was added, then configured down from about forty warnings to four real ones,
because a linter that cries wolf teaches you to ignore it. And measuring test
coverage showed that **copying a colour code and downloading a plate as a PNG
had no automated test whatsoever** — two things visitors genuinely do, untested
for exactly the same reason as the layout bugs, since the fast tests have no
clipboard and no downloads. Both are now covered by the real browser, right down
to checking the downloaded file really is a PNG and that its stripes match the
plate you clicked.

Most candidate libraries were turned down rather than adopted — a tooltip
library, a styling helper, two accessibility toolkits — because each would have
added weight to replace code that already works and is now tested. The two that
were added cost the visitor nothing: they are tools for building the site, not
part of it.

**Then six more passes, because the owner asked for all of it:**

> let's keep looping over and doing passes untill you don't find anything more
> to fix and test. this is goign to be the big maintence and bug fix release so
> let's make sure we pay off all our tech debt now

**The site failed the accessibility standard it ships a feature to enforce.**
This one stings: Iro has an "accessibility goggles" feature that judges Sanzo
Wada's colours against WCAG AA — and its own small text didn't meet WCAG AA. An
automated audit caught it on three screens. The three ink shades have been
re-solved together so all of them pass while staying visibly distinct from one
another; only their lightness changed, so the soft "Washi & Ink" look is intact.

**The wheel scrolled sideways on a phone.** At 375px the controls under the
wheel were 28px wider than the screen, so the whole page slid left and right.
Fixed, and every view is now checked at phone width.

**A blank white page was the worst thing that could happen, and now it can't.**
Any unexpected error used to leave nothing on screen at all, with the reason
visible only to someone who knows how to open a developer console. There's now a
proper "something went wrong" page that explains itself, offers a reload, and
shows the detail worth reporting.

**The photo flow is finally tested from end to end** — upload, review, tap to
correct a spot, adjust the white balance, confirm. That's the part of the site
with the most history of subtle bugs, and until now none of it could be tested
automatically. The test paints its own synthetic portrait rather than committing
a photograph, which felt like the right call for a feature whose whole promise
is that your photo never leaves your device. Chromium also pointed out a genuine
speed problem in the white-balance preview along the way, which is fixed.

**Also:** copying a colour and downloading a plate are tested for the first
time; the granularity crossfade could mis-open a colour if you clicked during
it; reduced-motion is verified rather than assumed; and a handful of quieter
assumptions now have tests holding them in place.

Two things were deliberately *not* changed after being measured. Splitting the
charting library apart to shrink the download saved 0.15% — not worth six new
dependencies. And a stricter type-checking setting produced 175 complaints that
were almost all noise; adopting it would have made the code less safe, not more.
Both measurements are written down so nobody repeats the experiment.

---

## v1.5.0 — 2026-07-28 — "You"

**A new tab that starts from your face.** Photograph yourself, and the site
measures three things about your colouring — whether you lean warm or cool, how
deep it is, and how much contrast there is between your skin and your hair —
then shows you the book colours that suit you and the combinations built from
them.

> yes i do want the ability (probably a new tab) that allows the user to take a
> photo of their face and then we pick out good matching colors from this
> pallete to go with their face. it's almost a combination of all the other
> features of the site that allow you to find a pactifular color, but now we are
> using the user's face to filter colors by hue, group, color. maybe we prompt
> the user to hold up a piece of white paper around their face so we can use it
> as white balance.

**Two palettes, honestly labelled.** The owner asked for the traditional
seasonal reading alongside the measured one:

> i'd also like the results to reutrn the seasonal anslysis as well.

Shown both methods run over the real 157 colours — where they agreed on only 9
of them — the owner chose to ship both rather than pick:

> i actually liked how you showed both side by side. this lets everyone explore
> different views

So the page carries a permanent provenance line. **Measured for you** comes from
your face by four stated rules, and hovering any colour tells you which. **The
season palette** says plainly that it comes from a table we wrote, with no
published source, offered as a second opinion. Any of the twelve is pickable
from a dropdown, so someone who has had a professional analysis can use theirs.

**The season lists are data, not code** — the owner's idea, and a better one
than the design had:

> maybe we create a separate dataset that maps color to season. this way i can
> easily change it or have another agent analyze it. and it'll update in the
> website.

They live in `data/curated/seasons.json`, hand-editable, validated on load. The
one part of the feature we admit is invented is now the part that is easiest to
inspect and correct — and correcting it needs no programmer.

**The dependency rule changed to allow this.** Face detection meant a new
package, which the old four-package budget forbade:

> let's think about the constraints for this app. we can use external libraries,
> but it needs to still run on github pages (static site). ... the original
> constraight was to make it so the app runs and launches easily, but i may have
> been tto strict in my words.

The audit that followed found the real constraint was never the package count
but four properties: static build, `make install` just works, nothing
user-derived leaves the device, and weight is paid by the feature that incurs
it. `CLAUDE.md` now states those instead. MediaPipe's BlazeFace satisfies all
four — ~3.5 MB, lazy-loaded only on entering the tab, and self-hosted so no
third-party request ever fires.

**Your photo never leaves your device**, is never saved, and is thrown away as
soon as it is measured. The owner asked for that to be stated plainly:

> i like the ability you're not capturing the photo for privacy. let's make sure
> that's documnted in the readme as a privacy statement.

The README now has a **Privacy** section, and two test files enforce it rather
than leaving it a promise.

**Six rounds of owner review found five real defects** that a passing test suite
had not — and the owner diagnosed most of them. Listing the five positions of
the sampling dots identified, precisely, that the detector's bounding box starts
at the brow rather than the top of the head, which had every probe sitting a
zone too low and reading hair colour off forehead skin:

> where are the dots supposed to be? i see them on my forehead, between the
> eyebrows, both cheeks and then my chin. i think it's tagging the wrong color
> for my hair

And a request for one small feature exposed a whole class of bug:

> we should also have a circle for where it's capturing the white
>
> ... when i correct the location/sample of the color, the circle should move to
> that location

Corrections had been keeping the colour and discarding the position, so the
markers would have gone stale the moment anyone touched one.

**"Confirm it, don't tell me."** Asked whether the white balance actually worked:

> can you confirm its whitebalance correcting correctly?

Simulating 48 illuminant-and-skin pairs showed the correction was being applied
to gamma-encoded values when light multiplies *linear* light — good enough under
mild casts, but wrong enough under strong ones to flip the warm/cool verdict
three times. Fixed, and pinned by tests that recreate the cast physically.

**White balance you can see and steer.** The photo now repaints corrected as you
adjust it, and there are Temperature and Tint sliders like a photo editor's:

> when i am picking the white balance. i think the photo should correct so the
> skin and hair colors update as well. this way i have a good sense if the white
> balance is being adjusted properly

> for correcting white balance can we also provide a ui slider? i still cant
> seem to color correct it properly. i'm used to white balance correcting
> filters from photography software

**Plain-English explanations.** Small **i** buttons beside undertone, depth and
contrast, sized for a fingertip:

> i'm thinking maybe we can have a little info icon next to the cool/wam medium,
> high contrast words, something small where the hover over/mouse click (or
> finger click on a phone) has a info pop up box that explains more about the
> terms

**Also in this release:** the combinations list is ranked rather than filtered,
with a four-step control for how strict it is, because demanding every colour be
yours leaves 12 of 338. Colours in a plate that aren't yours are outlined. And
the page discloses that Wada's palette leans warm — 109 colours to 48 — so a
cool-toned visitor's shorter list reads as the book rather than a fault.


## [1.4.0] — 2026-07-28 — Pick a color, in whatever language you have it

> **Owner asked for:** "i like that ability to pick hex. but now i like the
> idea you gave before about using the color wheel selector where users can
> find a color, provide a hex, RGB, or CYMK color. this all makes it easier to
> use for the end user to explore a color"

- **"Paste a hex" became "Pick a color".** The sampler's third source is now a
  color wheel with a brightness slider, alongside **HEX, RGB and CMYK** fields
  that all stay in sync — turn the wheel and all three update; type into any
  one and the wheel follows. Pasting a hex still works exactly as it did; it is
  simply no longer the only way in. Everything downstream is untouched: you
  still land on the 12 nearest book colors and jump into Match or Browse.
- **The CMYK numbers are exact, not approximate.** Converting the book's own
  stored CMYK back to color reproduces its RGB on every channel for 156 of the
  157 colors (the odd one out, *Dull Violet Black*, has a malformed value in
  the source data). So typing a CMYK build from the book lands dead-on that
  color rather than merely near it — and a test now pins that, so the day the
  upstream data changes, we hear about it.
- **A design the owner reversed after seeing it running.** The first plan was
  to plot all 157 book colors as dots on the wheel. It sounded good described
  in words and was chosen that way. Built as a live mockup against the real
  colors, it was wrong — on a control whose whole job is aiming at a color, the
  dots compete with the target:

  > "i like A - no overlay"

  The plot itself was worth keeping, just not there:

  > "fwiw i did like seeing the colors pointed on the circle. i liked how you
  > can plot all the points and then also points in same brightness. that would
  > be a cool thing to add to the color explorer page when you're looking at
  > all the raw individual colors"

  So it moves to the Browse page as its own feature, and all four mockup
  variants are kept in `docs/superpowers/specs/` as that work's starting point.
  This is the part worth noticing: the round trip from "sounds right" to
  "actually wrong" took one mockup and one look, and it happened *before* any
  of it was built.
- **Then the owner asked for the browser to be opened, and that caught five
  more things.** The feature had 199 passing tests and had been through a
  review after every step. It still shipped a wheel whose colors did not match
  the numbers printed underneath it (the white center faded out too early, so
  the outer fifth of the disc was one flat band), an "Explore this color"
  button that scrolled off the bottom of a phone in landscape and could not be
  reached at all, color codes set in the wrong typeface, a "BRIGHT" label
  running underneath its own slider, and — the worst of them — a focused text
  field that turned the same orange as an *invalid* one, so while you were
  typing there was no way to tell a good value from a bad one.

  None of that was catchable by the tests, because the tools that run them
  have no idea what a page looks like: no fonts, no layout, no notion that one
  style rule can quietly outrank another. They can only check that the logic is
  right, and the logic *was* right. Asking someone to go and look was the only
  thing that would have found it — which is why the checklist at the end of the
  plan is not a formality.

## [1.3.3] — 2026-07-28 — Counting visits, without counting the owner

> **Owner asked for:** "i want to add a google analytics tracker for the site:
> `<!-- Google tag (gtag.js) --> <script async
> src="https://www.googletagmanager.com/gtag/js?id=G-CHW8X8EX18"></script>…`"

- The published site now reports visits to **Google Analytics**. Nothing a
  visitor sees or interacts with changed — this is a patch release.
- **The tag ships only in the deployed site.** The owner pasted the snippet
  Google gives you, which would normally go straight into `index.html` — but
  that file is also what `make dev` serves, so every local development session
  would have shown up as real traffic. Offered the choice, the owner picked
  build-time injection instead, so the analytics property only ever sees actual
  visitors.
- **The privacy promise is unchanged, and now it's written down.** The site
  already guaranteed that uploaded photos and camera frames never leave your
  device; that's still true, since the analytics tag and the color sampler never
  touch each other. But shipping a third-party tracker silently would have left
  that framing misleading, so the owner chose to document it: the README now has
  an **Analytics** section saying plainly what's collected and how to switch it
  off. A visible in-page disclosure line and a cookie-consent banner were both
  put on the table, declined for now, and written into `TODO.md` — deferred on
  purpose, not forgotten.
- Under the hood: one small `apply: 'build'` plugin in `vite.config.ts`, nothing
  added to `src/`, and a test that fails if anyone ever removes the dev-traffic
  gate. The two privacy source-scan tests were left exactly as strict as they
  were.

_Design `44a27f7`; commit `e482edf`._

## [1.3.2] — 2026-07-23 — Lift your finger to open on the mobile wheel

> **Owner asked for:** "i can now use my fingerts to explor the colors of the
> wheel. however, when i lift my finger i would like that to actually register
> as a click… i would like to explore by holding and draging my finger, and then
> the lift would trigger the click when i find something i like"

- On a touchscreen you can now **hold and drag a finger** around the wheel to
  explore, then **lift to open** whatever's highlighted — no more needing a
  precise quick tap. It behaves like a desktop click, just at the end of a drag.
- **Changed your mind mid-drag?** Slide your finger off past the edge of the
  wheel and lift in the empty margin — nothing opens. The highlight clears while
  you're out there so you can see it won't select.
- This reverses the v1.3.1 rule where a drag only explored and never navigated;
  the owner decided lifting *should* commit, and chose the drag-off-to-cancel
  escape hatch over relying on the Back button. Desktop hover+click is unchanged.

_Commit `38376eb`._

## [1.3.1] — 2026-07-22 — Mobile wheel touch-scrub highlighting

> **Owner asked for:** "i want to improve the front page wheel mobile
> experience. when i finger over the figure it doesn't really do a good job
> highlighting the pairs."

- The chord wheel now responds to touch the way it responds to a mouse. **Press
  or drag a finger** over the wheel to scrub the highlight live — the nearest
  color/pair brightens, everything else dims, and the name shows in the center.
- **Tap to open** a color/pair; a **drag only explores** (no accidental
  navigation to wherever your finger lifts).
- Root cause of the old jank: the wheel had no `touch-action` rule, so the
  browser claimed finger-drags as page scrolls and starved the highlight of
  pointer events. Fixed with `touch-action: none` (the same fix the camera
  canvas already used) plus tap-vs-drag pointer handling.

_Commits `6956cbd`, `0726f35`._

## [1.3.0] — 2026-07-22 — Source-agnostic color sampler (hex · photo · camera)

> **Owner asked for:** "a new feature i'd like: is to provide a hex for a color
> and then explore similar colors… i'd like the ability for the user to provide
> a photo or a direct hex color code. user story, i wanted to pass in NYC orange
> or NYC blue, and wanted to see what colors are similar enough… when i'm
> picking pallets."
>
> On the photo path: "the image upload shold behave like the photo being taken
> where the use should also be able to eye drop a region of the photo."
>
> On the result design: "let's just go with the explore grid… i rather have a
> single unified interface. makes things simplier overall."

- One always-visible **"Sample a color"** button opens a picker with three ways
  to name a color, all landing on the same result: **Camera**, **Upload a
  photo** (tap/eyedrop a region), and **Paste a hex** (e.g. `#F26522`).
- The result is a unified **12-nearest-book-colors** explore grid with
  plain-language closeness labels → hand off to **Match** or **Browse**.
- The camera adopted the same grid — one result component, not two. Uploaded
  photos and camera frames never leave the device (guarded by a privacy test).
- Under the hood: a pure `parseHex` in the core kernel; zero new dependencies.

_Deferred by the owner ("the color wheel / rgb sliders is nice but we can do
that next time"): a color-wheel / RGB-slider source. Released `7dedf2b`._

## [1.2.1] — 2026-07-21 — Accessibility control UX + shorter wordmark

> **Owner asked for (placement, after trying several):** "i don't like the
> accessibilty in the top right menu. i'd like to have it float in the top right
> corner below the menu, if possible."
>
> **On the selected color:** "let's use the NYC blue in this example (this is
> where my personal flair comes in)."
>
> **On the title length:** "we might need to cut down the length of the title.
> 'A dictonary of color combinations' has too many characters." → chose
> **"Color Combinations"** (a Python-pun `{color combinations}` was tried and
> then pulled: "nvm i don't like it… i want it more wabi-sabi less playful").

- The accessibility goggles now sit in the **same spot on every page** —
  floating in the top-right of the content — instead of drifting between views.
  (The owner iterated here: drop-up menu → one shared control → floating corner.)
- The menu **closes when you click outside it**, and its selected lenses fill
  with the owner's **NYC blue** with properly inverted labels.
- **Restored the full-size chord wheel** — a regression from the goggles work
  had shrunk it. "i really liked it when the wheel was bigger… it made it seem
  more prominent that this is a color explorer."
- Shortened the wordmark to **"Color Combinations"** (the full title stays in
  the About panel and export credits).

_Commits `0bbdf69`, `8dcc38d`; released `cab89cd`._

## [1.2.0] — 2026-07-21 — Accessibility goggles

> **Owner started here:** "i'd like to have a dropdown on the top that let's you
> pick the underlying dataset… see if they pass a WCAG check for internet
> accessibilty."
>
> **…then reframed the whole feature (the key pivot):** "instead of dropdown i
> think we can make this a multi-select… these accessibilty goggles only filter
> on the current dataset, they're not really new datasets. we should make sure
> these options appear in the match and browse pages as well, not just the
> wheel."
>
> **Released with:** "oh push up the changes and deploy it officially."

- Added composable **accessibility "goggles"** — optional filters you can stack
  on the Wheel, Browse, and Match: **Web text-ready** (WCAG AA contrast),
  **Print & B&W safe** (grayscale-distinguishable), and **Color-blind safe**
  (distinct under red-green CVD simulation).
- Stacking is **AND** (turn several on → only combinations that pass *all*
  show), because the data showed OR barely narrowed anything.
- Honestly scoped: "print-friendly" means the B&W/grayscale check — true CMYK
  ink proofing isn't claimed. Color science stays isolated in `src/color/`; zero
  new dependencies.

_Built subagent-driven (`1c4272a..ff0af04`); released `5d2b5b2`._

## [1.1.1] — 2026-07-21 — Camera capture guidance + label legibility

> **Owner asked for:** "for the photo page. i think i need an instruction that
> tells the user that it is a 2 step process. take a photo then you can click
> around to pick a location / color. it' snot immediately obvious why the app
> seems like its frozen after you take a photo."

- Added explicit **two-step instructions** to the camera capture (take a photo,
  then tap the spot on it), since the freeze-then-tap flow wasn't self-evident.
- Drew a paper **halo behind the wheel's center hover-label** so a color's name
  stays readable over the busy ribbon crossings.

_Commits `c7e232c`, `129367b`; released `8ae02d1`._

## [1.1.0] — 2026-07-21 — Camera color capture

> **Owner asked for:** "let's give the ability to search for a color based on
> what the phone / webcam camera sees… have a camera look at an article of
> clothing (or object), find the color of the object, and then suggest the other
> matching color patterns… also. sometimes i may just want to point a camera at
> an object and then see color combinations as if i filtered it in the browse
> tab."
>
> **On privacy:** "yes the data privacy and no frames being saved anywhere is
> really important. let's check for this and also we should have a footer or some
> kind of note about this so users are not spooked."
>
> **Released with:** "ok go merge into main and push this is essentially another
> releaser version we're doing."

- Point your phone/webcam at something → **freeze a frame, tap the exact spot**
  → the site finds the nearest book colors and hands off to Match or Browse.
- **Privacy is mechanically enforced**: no upload, no storage, camera released on
  close — a build-failing source-scan test guards the camera code, and an
  on-page note reassures users.
- Matching uses **perceptual OKLab distance** (via the new `culori` dependency),
  isolated behind a one-file seam so the metric can be swapped later.
- To feed the camera, **Match gained a Colors level** and **Browse gained a
  shade filter** — the fuller grid the feature needed.

_Built subagent-driven; spec `67d41c8`, released `5536aa6`._

---

### 2026-07-20 — Wheel legibility & orientation _(shipped between v1.0.0 and v1.1.0, untagged)_

> **Owner asked for:** "improve the visualization on the main color wheel… when
> i hover over an individual color… the line between the 2 connecting colors are
> too thin… rare color links even when 'highlighted' are barely visable… i think
> you can make the lines thicker when i hover over the edge of the wheel… what do
> you think about making sure the colors for black are centered around the 12
> o'clock positoin?"
>
> **And, notably, asked for pushback:** "is there a more understood standard of
> how color wheels are placed? i rather go with industry and artistic standards
> than something i'm thinking of. you should defetnly always push back when i'm
> trying to do somethign against a standard or common practice."

- **Red now sits at 12 o'clock at every granularity** (the recognized screen
  convention), and the Colors level is re-sorted into family order so browns
  cluster instead of scattering — chosen over the owner's initial black-at-top
  idea after Claude pushed back with the standard and a before/after prototype.
- Highlighted links get a **stroke-width floor** so rare pairings stay visible
  when highlighted, without thickening the resting wheel; partner arcs brighten
  on hover.
- Top nav reordered to **Wheel · Match · Browse · About**, and the **"Iro"
  wordmark is now a clickable "home"** that returns to the wheel.

_Commits `972e10b..76ddf7f`, `5b209f4`, `87ffea2`._

### 2026-07-20 — Color matching & outfit builder _(shipped between v1.0.0 and v1.1.0, untagged)_

> **Owner asked for:** "i do like the ability where i can still click on a single
> shade… but i need a way to go from general and slowly drill down without
> drilling down to a single color… i like a combination of pivot + outfit
> builder. the goal is to be able to pick colors and be able to pick more than 2
> colors."

- New **Match page**: start from a color, shade, or family, see what the book
  pairs with it, and build a **3-, 4-, or more-color** outfit palette.
- The group detail panel gained a **breadcrumb, ranked partners, book palettes,
  a "narrow to a sub-group" control**, and a **"Build a palette from this →"**
  bridge into Match — so you can drill down gradually instead of jumping
  straight to one exact color.

_Commits `409dc5c..2f2dfa5`._

### 2026-07-20 — Wheel hover performance & Browse sections _(shipped after v1.0.0, untagged)_

> **Owner asked for:** "the wheel flickers a lot when hovering over. sometimes
> even flickering completely off where no wheel is seen. let's fix the weel hover
> performance… for the browse page. it would be good to have a header for the 2,
> 3, and 4+ colors so a 3 color palet isn't on the same line as the 2."
>
> **Follow-up (self-diagnosed the fix):** "let's have the mouse always snap to
> the nearest object (line inside or box outside)… i hinkt his will help. what do
> you think?"

- Killed the **hover flicker** (the wheel would sometimes vanish entirely): the
  old code attached listeners to ~1,150 tiny paths and restarted a full-scene
  fade on every crossing. Replaced with a few delegated, keyed listeners so the
  highlight glides instead of strobing.
- Implemented the owner's **snap-to-nearest-object** idea — a transparent hit
  disc plus geometry-based resolution (Delaunay index of ribbon centerlines) so
  a cursor in a gap never "falls through" and flashes the wheel back to full.
- **Browse now groups plates under 2 / 3 / 4+ color headers**, each its own grid
  with a count, so palettes of different sizes don't share a row.

_Commits `db37b1b`, `3cd01df`, `297ca7d`, `f3fa204`, `6f6b515`._

---

## [1.0.0] — 2026-07-19 — Initial release

> **The prompt that started everything:** "let's plan in interactive website. i
> want to visualize the 'A Dictionary of Color Combinations'… maybe first in a
> ciruclar chord diagram of the different color combinations. maybe as 2, 3, and
> 4 the way the book has them… i'll tell you right now i don't know anythign
> about javascript, html, and css, this will be a fully vibe coded project…
> finally i'd like to deploy this as a github pages site… group the colors
> together so all the different shades of pink, for exmaple, can be viewed as a
> single entity… picking colors for a website, presetnation… but also for picking
> out color combinations for what to wear."

The first version, designed across an interactive brainstorm (aesthetic mockup
rounds, a chosen tech stack, a written spec) and then built subagent-driven
through 18 test-driven tasks:

- **The color wheel** — a D3 chord diagram of all 348 combinations with **four
  granularity levels** (individual colors up to super-families), size filters
  (2/3/4-color), and hover highlighting.
- **Detail panels & combination plates** with **copy/export** to hex, CSS
  variables, JSON, and **PNG**.
- **Browse view** filtered by size, family, and contained color; **color
  search**; an **About panel** with usage recipes; a **"Surprise me"** animation.
- The **"Washi & Ink"** aesthetic (japandi/wabi-sabi with the owner's NYC
  orange/blue brand and a T3 hybrid of EB Garamond + Atkinson Hyperlegible),
  responsive layout, reduced-motion support, and a11y polish — all chosen
  through mockup rounds ("i do like an elegant and calm japandi / wabi-sabi
  feel"; "the more subtle orange/blue").
- **Continuous deploy** to GitHub Pages on every push to `main`.

_Built on branch, merged at `0ae7b32`; CI + docs true-up tagged `f1145e3` (v1.0.0)._
