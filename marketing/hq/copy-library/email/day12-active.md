# Email template: day12-active

**Kind:** `day12_active`
**Trigger:** `users_profile.pro_trial_ends_at` falls between now+1d and now+3d,
and the user is active (see `playbooks/retention-email-loop.md`).
**Subject:** Your Pro trial and what happens next
**Preheader:** A quick service note, plus one small question.
**Trustpilot line:** omitted at send time until the Trustpilot business
profile is claimed and verified (see `FOUNDER-SETUP-PACK.md`); once live,
`{{trustpilot_link}}` resolves and the line below is included for every
recipient, never selectively.

---

Hi {{first_name|there}},

A quick note so nothing takes you by surprise. Your 14 days of full Volyume
Pro end in about two days.

If you would like to carry on, you opt into the subscription through Google
Play, and Google Play's introductory offer then adds a further 7 free days
before your first payment is taken. You can cancel in Google Play at any time
before the charge.

If Pro is not for you right now, that is genuinely fine, and the free training
core stays yours to keep.

One small question either way. We have a short survey, about two minutes, five
questions and only the first is needed. It helps me understand what worked in
your trial and what did not.

{{survey_link}}

As a thank you for finishing it, you will get a free week of Volyume Pro,
sent to you as a Google Play code.

Thanks for giving Volyume a proper try,

Allan
Founder of Volyume

If you would like to share your experience publicly, you can do so on our
Trustpilot page: {{trustpilot_link}}

---

If you would rather not get emails like this, tap here and we will never send
another: {{unsubscribe_link}}
