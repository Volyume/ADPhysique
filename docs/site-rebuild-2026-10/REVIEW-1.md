# Compliance review 1 (2026-10-21): findings to fix

Reviewer: compliance-reviewer, read-only, on site/rebuild-2026-10 at 70f7fc03a.
Overall FAIL. Fix every finding below exactly as given unless it is marked
OWNER (those wait for the owner's answer and must not be changed yet).

F1 OWNER support:147 Beat note's first sentence about safety limits.
F2 index:7,21,29,75 "It then changes your plan or keeps it as it is, and tells you why in plain words." / "Then it changes your plan or keeps it, and tells you why." -> "Once a week it works out whether your plan should change, and tells you why in plain words. By default you tap to apply any change." (adapt the short form the same way).
F3 images (C1): today-720.jpg (hero of / and /get/) shows "4 morning weigh-ins this week" and "Morning weight 82.4 kg"; progress-720.jpg shows the BODY card "Trend 82.4 kg, +0.09 kg a week"; coaching-decision-720.jpg shows "Based on 7 morning weigh-ins". Re-crop (scripts/site/make-images.py) so weigh-in rows, the body card and that line are off screen; keep the crops honest (no edited UI).
F4 train-720.jpg shows "Injuries, pain, long-term conditions or disabilities that affect your training." (banned population term, 9A, C3): crop it off. index:130 (and alt index:140, title features:163) "Add any injuries or limitations, and your plan is built around how you train." -> "Tell the app what shapes your training, and your plan is built around how you train."
F5 features:145 "Plans are built from 923 exercises, and you can add your own." -> "The library holds 923 built-in exercises, and you can add your own." (keep the data-fact span).
F6 features:351 usage-data sentence -> "There are no third-party analytics or tracking tools, and usage data never contains your weights, foods or notes."
F7 index:132 and features:162 "When the plan builder could do better for you, it offers an update and changes nothing until you agree." -> "When your plan needs a decision from you, Today offers an Update your plan card, and nothing changes until you agree."
F8 features:331 gym challenge feature: remove (C15; no challenge is running).
F9 OWNER privacy legal text points.
F10 partner page: describes the retired Partners feature (title, meta, lines 87-92, 97-103, 113). Replace with: "Partner invites have moved into Community. Open the link in Volyume to follow each other." Drop both cards, the code line and the partnership line. Keep the page's script and the volyume://partner deep link working.
F11 c:111 "Volyume never reads what you ate or what you weigh." -> "The challenge never reads what you ate or what you weigh."
F12 c:20,27 "Score 70 and above for the main prize draw, or 50 and above for the second." -> "Train, check in and climb the board. Reach each prize draw's score to enter it."
F13 c:121 "Already have the app? Scan the code again." -> "If you already have the app, scan the code again."
F14 OWNER challenge-terms heading and second free-entry sentence and the safety-check line.
F15 email/preferences:78 -> "A short email with how many sessions you trained last week. Never weights, food or body details."
F16 u:20,27 "Training facts only, never body data." -> "See how they train and follow them in the app." Script-set jargon: u "PR: " -> "New best: "; s "Tonnage" -> "Total weight lifted".
F17 p:7 and p:20 -> "This link no longer works. Open Volyume to see Community." (both).
F18 how-the-coach-works:120 -> "A week with no changes is still a decision. Your coach has looked and found nothing to change." :123 -> "Your coach suggests a change to your calorie target or your training, with the reason beside it." Headings :158 and index:246 "Fixed rules, not a chatbot" -> "A coach that follows fixed rules". :147 "Every change comes with its reason" -> "Each decision shows what your coach read and why."
F18b survey:73 drop "your answers genuinely shape what gets built next."; :123 "stored on Volyume's EU database" -> add the Resend exception or reword to "stored on Volyume's database in the EU".
F19 black-box article :98 -> "A decision shows what your coach read and the reason for it." Rewrite the "not X, it is Y" pivots at :94, :100, :110 as plain positive sentences.
F20 volume article :115 -> "A lighter week lets tiredness clear. Research has not shown that it adds muscle." Rewrite the pivots at :85, :112, :117, :118.
F21 references: volume ref [2] (Grgic 2022, Sports Medicine) does not exist and PMID 35044672 is Moesgaard 2022 (periodization): replace with a correct citation of a real source that supports the sentence, or drop the sentence and the ref. Calories ref [1] Hall 2012 has the wrong PMID: correct is 22434603. Calories ref [2] Steinberg 2015 (Annals of Behavioral Medicine) does not exist (PMID 25683066 is a diabetes diet paper): drop it and the "kilogram or more within a day" claim unless a real source is found and verified on PubMed. Verify every remaining reference's PMID resolves to the cited title (fetch https://pubmed.ncbi.nlm.nih.gov/<id>/ and compare the title).
F22 OWNER calories article (weight is the thesis).
F23 volume :121 and calories :114 "your coach suggests" -> "By default, your coach suggests".
F24 articles/index:84 and meta "how many weigh-ins you need" -> "How to tell a real trend from day-to-day noise, and why holding is often the right call."
F25 index:200 and features:262 "They stay on your phone, with location data removed." -> "They stay on your phone unless you choose to share them, and location data is removed."
F26 index:239 -> "Your workouts and food logs are saved on your phone first, and backed up to your account".
F27 index:129 "Choose from 6 training styles." -> add "if you are not competing in a physique category" (keep the data-fact span).
F28 index:251 and features:353 account deletion: add that a one-way hash of the email and any prize-draw record are kept (privacy sections 9 and 10), in one plain sentence.
F29 features:74 and meta "Every feature in the app today" / "Everything Volyume does" -> "The features in the app today."
F30 features:369 "a colour-blind safe palette" -> "a palette for colour blindness"; support:74 "a person will reply" -> "we reply by email"; s/index.html:171 em dash in a script comment: replace.

## Owner answers (2026-10-21)
- F1: KEEP the Beat note exactly as it is (no change).
- F9: privacy policy stays word for word apart from section 6 (no change).
- F14: TRIM to approved. Keep only "Entry is free, and you can leave at any time." and the free-for-life sentence. Delete "Entry is free and no purchase is needed." Heading "9 Free for life" -> "9 Completing a challenge". "while Volyume's safety check has paused your calorie changes" -> "while your calorie changes are paused". Update the guard allow-list and challengeTermsPage.guard pins to match.
- F22: KEEP the calories article's weight-trend thesis. Still apply F21 (references), F23, F24 and its 9.3 pivot rewrites; do not rework the thesis.

# Compliance review 2 (2026-10-21): remaining findings and lead rulings

Reviewer: compliance-reviewer on site/rebuild-2026-10 @ 53470ed18. Apply all:
N1 survey:7,20,27 -> "A short, two-minute survey about how Volyume is working for you."
N2 public/screenshots/*.jpg (unlinked, still served; 02 shows "Morning weight 198 lbs" and weigh-ins): keep the four URLs working but REPLACE each file's contents with a current compliant crop from public/assets/screens/ (02 -> today, 03 -> train, 05 -> set logged, 06 -> nutrition), same filenames, JPEG.
N3 assets/share.png: redraw left-aligned and asymmetric (wordmark top-left, tagline left-aligned below), using the N9 tagline; under 150 KB.
N4 articles/training-volume :84, :90, :92, :110: rewrite the "not X" pivots as plain positives ("More sets help up to a limit."; "signs of tiredness across your whole body.").
N5 articles/why-explainable :88 and :100: delete "A coaching decision is not the same as an explanation." and "Rules are not cleverer than a large model."; start :100 "For a decision about your own training and food, ..."; drop ", every time" at :97.
N6 same article :88, :94, :100: "act on your body"/"acts on your health" -> "the one you act on" / "a decision about your training and food".
N7 articles/when-to-change-your-calories :110 drop the "does more than ... It also" construction (say plainly what weekly reviewing does); :84 -> "A consensus statement on energy balance explains that as your weight changes, the calories your body uses in a day change too [1]."
N8 index:251, features:352 -> two sentences: "We keep a one-way hash of your email address, to recognise an account that was deleted." and "The record of any prize draw is kept, and no longer links to you."
N9 "a coach that explains every change" (index H1, every footer partial, og:image:alt, share.png text, how-the-coach-works:21,29 "gives the reason for every change") -> "a coach that shows its reasons" (adapt grammar).
N10 progress-720.jpg (index:210): crop above "YOUR PROGRESS" so no "Strength up"/PR result shows; trim the alt; workout-summary image: crop off "Strongest workout in 4 weeks" if it is used anywhere.
N11 screen captions "from a demo account" -> "Screens rendered from the app with demo data."
N12 volume:84 -> "In young trained men, more than 20 hard sets a muscle a week made no clear difference to the front of the thigh or the biceps compared with 12 to 20, though the triceps gained more." (keep data-explains valid).
N13 partner -> "Open the link in Volyume, then find the person who sent it and follow each other." (all places).
N14 challenge-terms "Last updated" -> 21 October 2026 (and its test pin); public/.well-known/README.md: reword as a short plain note with no em dashes and no REPLACE_WITH text (keep the file, it is a served URL); assetlinks.json and AASA untouched.
