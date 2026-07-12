# Email template: day12-quiet

**Kind:** `day12_quiet`
**Trigger:** `users_profile.pro_trial_ends_at` falls between now+1d and now+3d,
and the user has gone quiet (see `playbooks/retention-email-loop.md`).
**Subject:** It looks like Volyume did not stick
**Preheader:** No pressure. We would just like to understand why.
**Trustpilot line:** SHELVED by founder decision 2026-07-12; not sent until
reactivated (see `FOUNDER-SETUP-PACK.md`). `{{trustpilot_link}}` stays
unresolved and the line below stays omitted for every recipient until then.

---

Hi {{first_name|there}},

It looks like Volyume did not stick for you, and that is genuinely useful for
us to understand. No guilt here, and nothing you need to explain or make up
for. Some apps are just not the right fit, and knowing why helps us make a
better one.

If you have a couple of minutes, we have a short survey, five questions and
only the first is needed. Mostly I would like to know what did not work, so it
can be fixed for the next person.

{{survey_link}}

As a thank you for finishing it, you will get a free week of Volyume Pro, sent
as a Google Play code, in case you fancy another look. No pressure at all if
you would rather leave it there.

Either way, thank you for giving Volyume a try,

Allan
Founder of Volyume

Whatever you decide, if you would like to share your experience publicly, our
Trustpilot page is here: {{trustpilot_link}}

---

If you would rather not get emails like this, tap here and we will never send
another: {{unsubscribe_link}}
