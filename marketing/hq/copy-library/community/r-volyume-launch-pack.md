# r/Volyume: Launch Pack (draft for founder review and manual posting)

**Channel:** Reddit, r/Volyume (Volyume's official community).
**Posting rule:** FOUNDER-ONLY. Allan reviews, edits into his own words, and
posts every item personally. No agent or scheduler ever posts here
(reddit-uk-communities.md, Hard boundaries). The 90/10 rule does not apply in
Volyume's own space, but CLAIMS-STANDARDS gates every post.

---

## Claims table (claim → PRODUCT-FACTS section)

| Claim in this pack | PRODUCT-FACTS section |
| --- | --- |
| Volyume is a coaching system for serious self-coached lifters | A |
| Loggers and nutrition apps leave you to decide what to change each week; Volyume makes the weekly change-or-hold decision and explains it | A |
| The coaching is deterministic, rule-based and explainable, not conversational AI or a black box | A, §6 |
| The app holds a decision when there is not enough data, and never guesses | A, F |
| Weekly Precision Coaching is a Pro feature | B |
| Free tier: full workout logging, plan library, custom plan building, training history, progress tracking | B |
| Live on Google Play; iOS on TestFlight / coming soon | A, E |
| Local data encrypted on device, EU (Dublin) residency, no ads, no data sold, no PII to analytics | E, §6 |
| Same inputs give the same decision | §6 |
| Zero users at build; genuinely early days | A |
| Weekly check-in reads logged sets and bodyweight/food data | A, B |

No trial or price figures are stated in this pack, so §3 and §4 wording is not
invoked. Nothing here promises an outcome, a check-in count, or a Progress Scan
score.

---

## 1. Community description (under 500 characters)

> The official community for Volyume, a coaching system for self-coached
> lifters. Volyume makes the weekly call on whether to change your training or
> nutrition or hold steady, and shows the reasons. The coaching is
> rule-based and explainable, not a chatbot. This is the place for release
> notes, behind-the-decision explainers, tips, and your questions. Built by a
> UK lifter. Early days, and honest about it.

*(Character count: 462.)*

---

## 2. Community rules

1. **Be decent.** Disagree with the idea, not the person. No abuse, no
   pile-ons, no gatekeeping about who counts as a "real" lifter.
2. **No medical advice.** Share what worked for you, but do not diagnose,
   prescribe, or tell anyone to ignore a doctor. Volyume is a training tool,
   not a medical service.
3. **No before/after photos.** We do not run transformation posts here. Talk
   about training, food, and the decisions behind them instead.
4. **Self-promotion only in the monthly thread.** Your own app, channel,
   coaching, or affiliate link goes in the pinned monthly thread, nowhere
   else. Genuine discussion is always welcome outside it.
5. **Beginners can ask anything.** No question is too basic. If you are new to
   tracking or programming, ask, and expect a straight answer.

---

## 3. Pinned welcome post (from Allan)

**Title:** Welcome to r/Volyume. Here is who I am and why this exists.

I am Allan. I lift, I am based in the UK, and I built Volyume because I got
stuck on the same problem for years.

I tracked everything. Sets, weights, bodyweight, food. I had a logger and a
nutrition app and a notes file, and every Sunday I still sat there trying to
work out one thing: do I change something this week, or hold? More volume or
the same? Drop calories or wait another week? The data was all there. The
decision was still mine to make, and I was mostly guessing.

Volyume is my answer to that. It takes what you log and runs a weekly
check-in that tells you whether to change your training or nutrition or hold,
and then shows you why it said so [A]. The coaching is deterministic and
rule-based. Same inputs, same decision, and you can read the reasons every
time [§6]. It is not a chatbot and it is not a black box you have to trust on
faith [A].

One thing I care about a lot: when the data is thin, the app holds rather than
inventing a confident answer [A, F]. I would rather it say "not enough to act
on yet" than make something up.

The free tier is a real product on its own. Full workout logging, the plan
library, custom plan building, training history, and progress tracking, no
payment [B]. The weekly Precision Coaching and the nutrition side sit in Pro
[B]. It is live on Google Play now. iOS is on TestFlight and coming to the App
Store later, so I will not pretend it is there yet [A, E].

Your data is encrypted on your device, stored in the EU, and there are no ads
anywhere. I do not sell data and no personal identifiers go to analytics [E].

This community is where I will post release notes, explain the reasoning
behind decisions the coach makes, share tips for getting more out of the app,
and answer whatever you throw at me. I would rather you scrutinise how a
decision is made than take my word for it.

Fair warning: this is early. There are zero users as I write this, features I
still want to build, and rough edges I already know about [A]. If you are here
now, you are early with me. Ask hard questions.

Allan

---

## 4. First posts

### Post (a): How the weekly check-in decides change or hold

**Title:** How Volyume's weekly check-in actually decides "change or hold"

The core job of the app is one decision a week: do you change something, or do
you keep going as you are [A]. Here is how that call gets made, in plain terms.

Through the week you log your training and, on Pro, your food and bodyweight.
At your check-in, the coach reads that logged data and compares it against
what your plan expected to see [A, B]. It is looking at the direction things
are moving in and whether that lines up with the goal you set.

If the numbers say you are progressing the way the plan intends, the decision
is hold. No change for the sake of change. If they say progress has stalled or
drifted off the target, it proposes a specific change and tells you which
signal drove it [A].

The part I care most about: it is deterministic [§6]. There is no random
element and no model quietly rewriting your history. The same logged inputs
produce the same decision, and the reasons are laid out so you can check the
logic yourself [§6, A]. If you think it called wrong, you can see exactly what
it weighed.

Weekly Precision Coaching sits in Pro [B]. Happy to go deeper on any part of
the logic in the comments.

### Post (b): Why the app holds when the data is thin

**Title:** Why Volyume sometimes refuses to give you an answer

Most tools will always hand you a number. Ask them anything and they produce a
confident output, even when there genuinely is not enough behind it to be sure.

Volyume does the opposite when the data is thin. If it has not seen enough of
your logged training and weight to make an honest call, it holds and says so
rather than guessing [A, F].

The reason is simple. One odd week is noise. Bodyweight jumps around with water,
salt, sleep, and where you are in the week. If the coach reacted to every
wobble, it would have you chasing your own tail, cutting calories on a week you
did not actually stall. So it waits until it has enough observations to tell
signal from noise, then acts [A].

I know an app that occasionally says "not yet" is a harder sell than one that
always sounds certain. I would still rather it be honest about what it does not
know. A confident wrong answer costs you more than an honest "hold" [A, F].

This holds for the Progress Scan too. It can decline to give a score when the
photos or confidence are not good enough, instead of forcing one [F].

### Post (c): Open question: what do you track, and what do you ignore?

**Title:** Genuine question: what do you actually track, and what do you
deliberately ignore?

I want to hear how people here really run their own tracking, not the textbook
version.

For me it is every working set, bodyweight most mornings, and food when I am in
a focused block. What I have learned to mostly ignore is any single day's scale
reading. It moves too much to mean anything on its own.

What I am curious about from you:

- What do you log without fail, every session or every day?
- What did you used to track that you have since dropped because it was noise
  or not worth the effort?
- When you decide to change something in your training or diet, what actually
  triggers it? A number, a feel, a set time period?

I am asking partly out of genuine interest and partly because how people make
the weekly change-or-hold call is the exact problem I built Volyume around [A].
No pitch here, I just want to know how you do it. Tear into it in the comments.

*(End of pack. Founder edits freely before posting; the draft is a starting
point, not a script.)*
