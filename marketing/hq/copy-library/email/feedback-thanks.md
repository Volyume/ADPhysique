# Email template: feedback-thanks

**Kind:** `feedback_thanks`
**Trigger:** a new `user_feedback` row (see `playbooks/retention-email-loop.md`).
**Subject:** Thank you for the feedback
**Preheader:** It gets read, and it shapes what gets built next.
**Trustpilot line:** omitted at send time until the Trustpilot business
profile is claimed and verified (see `FOUNDER-SETUP-PACK.md`); once live,
`{{trustpilot_link}}` resolves and the line below is included for every
recipient, never selectively.

---

Hi {{first_name|there}},

Thank you for taking the time to send that feedback. I want you to know it
does not vanish into a form somewhere. I read it, and it shapes what we build
next in Volyume.

Could I ask one thing back. We have a short survey, about two minutes, five
questions and only the first is needed. It helps me understand what is working,
what is not, and what you were hoping for that is not there yet.

{{survey_link}}

As a thank you for finishing it, you will get a free week of Volyume Pro,
sent to you as a Google Play code.

Whatever you write, plain and honest is the most useful kind. There is no
wrong answer.

Thanks again,

Allan
Founder of Volyume

If you would like to share your experience publicly, our Trustpilot page is
here: {{trustpilot_link}}

---

If you would rather not get emails like this, tap here and we will never send
another: {{unsubscribe_link}}
