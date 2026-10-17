/* Volyume members page. Plain JavaScript, no libraries.
 * Every network call goes to the member-email-admin function with
 * { action, session, ... } (docs/member-email-2026-10-17/PLAN-V2.md, "Admin
 * page structure": Home, Emails, Automations, Surveys, People, More).
 * Text from the server is only ever written with textContent, never as HTML,
 * except the email preview, which goes into a sandboxed iframe. */
(function () {
  "use strict";

  var ADMIN_URL = "https://sujrylzzxcqxxfygptns.supabase.co/functions/v1/member-email-admin";
  var STORE_KEY = "volyume_members_session";
  var PAGE_SIZE = 50;
  var EM_DASH = new RegExp(String.fromCharCode(8212));

  var app = document.getElementById("app");
  var noticeArea = document.getElementById("notice-area");
  var who = document.getElementById("who");
  var whoEmail = document.getElementById("who-email");

  var state = {
    session: null,
    email: null,
    expiresAt: null,
    tab: "home",
    more: "menu",
    overview: null,
    exclusions: null,
    people: { query: "", offset: 0, total: 0, members: [], status: "", platform: "", segmentId: "" },
    member: null,
    segments: null,
    segmentEdit: null,
    campaign: null,
    campaignDirty: false,
    campaignFilter: "",
    automation: null,
    automationDirty: false,
    survey: null,
    results: null
  };

  /* ---------- small helpers ---------- */

  function h(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === "class") node.className = v;
        else if (k === "text") node.textContent = v;
        else if (k.indexOf("on") === 0) node.addEventListener(k.slice(2), v);
        else if (v === true) node.setAttribute(k, "");
        else node.setAttribute(k, String(v));
      });
    }
    (children || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  function pick(obj, names, fallback) {
    if (!obj) return fallback;
    for (var i = 0; i < names.length; i++) {
      if (obj[names[i]] !== undefined && obj[names[i]] !== null) return obj[names[i]];
    }
    return fallback;
  }

  function formatDate(value) {
    if (!value) return "";
    var d = new Date(typeof value === "number" && value < 1e12 ? value * 1000 : value);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  function formatDateTime(value) {
    if (!value) return "";
    var d = new Date(typeof value === "number" && value < 1e12 ? value * 1000 : value);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
  }

  // A calendar day with no year, for "Last used 12 Oct". A date-only value
  // (the app's check-in day) is read as UTC so the day never shifts with the
  // browser's time zone; a full timestamp is read in London time.
  function formatDayMonth(value) {
    if (!value) return "";
    var dateOnly = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
    var d = new Date(value);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: dateOnly ? "UTC" : "Europe/London" });
  }

  var PLATFORM_LABEL = { ios: "iPhone", android: "Android", other: "other device" };

  // Information only (founder order 2026-10-17): last day the app was
  // opened, its version and counts of workouts logged. Never what was in
  // them. None of this decides who is emailed.
  function lastUsedText(m) {
    var day = formatDayMonth(m.last_seen_day);
    return day ? "Last used " + day : "Not seen yet";
  }

  function versionText(m) {
    if (typeof m.app_version !== "string" || !m.app_version) return "";
    var where = PLATFORM_LABEL[m.platform];
    return "App version " + m.app_version + (where ? " on " + where : "");
  }

  function workoutsText(m) {
    if (typeof m.workouts_30d !== "number") return "";
    var last = formatDayMonth(m.last_workout_at);
    if (!m.workouts_30d && !last) return "Workouts: none logged yet";
    var week = typeof m.workouts_7d === "number" ? m.workouts_7d : 0;
    var text = "Workouts: " + week + " this week, " + m.workouts_30d + " in 30 days";
    return last ? text + ", last on " + last : text;
  }

  function plural(n, one, many) {
    return n + " " + (n === 1 ? one : many);
  }

  function readStore() {
    try {
      var raw = window.sessionStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_e) {
      return null;
    }
  }

  function writeStore(value) {
    try {
      if (value) window.sessionStorage.setItem(STORE_KEY, JSON.stringify(value));
      else window.sessionStorage.removeItem(STORE_KEY);
    } catch (_e) {
      /* Session storage can be blocked; the page then asks for a new link on reload. */
    }
  }

  function showNotice(kind, message) {
    noticeArea.textContent = "";
    if (!message) return;
    noticeArea.appendChild(h("p", { class: "notice " + kind, text: message }));
  }

  function clearNotice() {
    showNotice("", "");
  }

  function setBusy(button, busy, busyLabel) {
    if (!button) return;
    if (busy) {
      button.dataset.label = button.textContent;
      button.textContent = busyLabel || "Working";
      button.setAttribute("aria-disabled", "true");
      button.disabled = true;
    } else {
      if (button.dataset.label) button.textContent = button.dataset.label;
      button.removeAttribute("aria-disabled");
      button.disabled = false;
    }
  }

  function focusHeading() {
    var heading = app.querySelector("h1");
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    }
    window.scrollTo(0, 0);
  }

  /* ---------- network ---------- */

  function ApiError(status, code, message, key) {
    this.status = status;
    this.code = code;
    this.serverMessage = message;
    this.serverKey = key || "";
  }

  function call(action, payload, timeoutMs) {
    var body = { action: action };
    if (state.session) body.session = state.session;
    Object.keys(payload || {}).forEach(function (k) { body[k] = payload[k]; });

    var controller = typeof AbortController === "function" ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, timeoutMs || 45000) : null;

    var url = action === "upload_asset" ? ADMIN_URL + "?action=upload_asset" : ADMIN_URL;
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller ? controller.signal : undefined
    }).then(function (res) {
      if (timer) clearTimeout(timer);
      return res.text().then(function (text) {
        var data = null;
        try { data = text ? JSON.parse(text) : null; } catch (_e) { data = null; }
        if (!res.ok) {
          var code = data && typeof data.error === "string" ? data.error : "";
          var msg = data && (data.message || data.detail || data.error);
          throw new ApiError(res.status, code, typeof msg === "string" ? msg : "", data && typeof data.key === "string" ? data.key : "");
        }
        return data === null ? {} : data;
      });
    }, function () {
      if (timer) clearTimeout(timer);
      throw new ApiError(0, "network", "");
    });
  }


  // What the server's error codes mean, in plain words.
  var CODE_TEXT = {
    audience_changed: "The number of people changed. Check the audience number again.",
    kill_switch_on: "Sending is switched off in Settings.",
    daily_cap_reached: "The daily sending limit has been reached. Try again tomorrow.",
    lint_failed: "The wording check found problems. Fix them and save again.",
    test_not_sent: "Send a test of this exact version first.",
    no_recipients: "Nobody would receive this email.",
    no_seeds: "There are no seed addresses yet. Add some in Settings.",
    email_not_configured: "The email service key is not set up yet.",
    survey_not_open: "The survey in this email is not open yet. Open it first.",
    survey_not_found: "The survey in this email could not be found.",
    segment_in_use: "An email uses this group, so it cannot be deleted.",
    not_a_draft: "Only a draft can be changed.",
    not_cancellable: "That email can no longer be cancelled.",
    already_started: "That email has already started sending.",
    alarm_confirm_required: "This email was stopped by a safety check. Confirm before resuming.",
    image_alt_required: "Every image needs a short description.",
    link_not_https: "Every link must start with https.",
    image_url_not_https: "An image address must start with https.",
    one_survey_per_email: "An email can hold only one survey button.",
    bad_block_count: "An email needs between 1 and 60 blocks.",
    not_that_image_type: "Use a PNG, JPEG, GIF or WebP image.",
    bad_or_too_large: "That image is too large. Use one under 2 MB.",
    resend_exists: "A resend has already been made for this email.",
    too_many_seeds: "There are too many seed addresses. Remove one first.",
    bad_setting: "One of the settings was not accepted. Check the numbers.",
    domain_read_failed: "The domain could not be read from the email provider."
  };

  function friendly(err, what) {
    if (!(err instanceof ApiError)) return "Something went wrong. Please try again.";
    if (err.status === 0) return "Could not reach the server. Check your connection and try again.";
    if (err.status === 401) return "Your sign-in has ended. Ask for a new link.";
    if (err.status === 403) return "This email address is not allowed to use this page.";
    if (err.status === 429) return "Too many tries in a short time. Wait a few minutes and try again.";
    if (err.status === 404) return "That could not be found. It may have been removed. Go back and look again.";
    if (err.code && CODE_TEXT[err.code]) return CODE_TEXT[err.code];
    if (err.status === 409 || err.status === 400 || err.status === 422 || err.status === 413) {
      if (err.serverMessage && /\s/.test(err.serverMessage)) return err.serverMessage;
      return "That was not accepted. Check what you entered and try again.";
    }
    return what ? "Something went wrong " + what + ". Try again in a moment." : "Something went wrong on our side. Try again in a moment.";
  }

  function guarded(promise, fallbackWhat) {
    return promise.catch(function (err) {
      if (err instanceof ApiError && err.status === 401) {
        signOut("Your sign-in has ended. Ask for a new link.");
      } else {
        showNotice("error", friendly(err, fallbackWhat));
      }
      throw err;
    });
  }

  /* ---------- dialog ---------- */

  function ask(opts) {
    return new Promise(function (resolve) {
      var dlg = document.getElementById("dlg");
      if (!dlg || typeof dlg.showModal !== "function") {
        resolve(window.confirm(opts.title + "\n\n" + opts.body) ? { ok: true, value: "" } : { ok: false });
        return;
      }
      var ok = document.getElementById("dlg-ok");
      var cancel = document.getElementById("dlg-cancel");
      var field = document.getElementById("dlg-field");
      var input = document.getElementById("dlg-input");
      document.getElementById("dlg-title").textContent = opts.title;
      document.getElementById("dlg-body").textContent = opts.body;
      ok.textContent = opts.confirmLabel;
      ok.className = "btn " + (opts.danger ? "btn-danger" : "btn-primary");
      if (opts.inputLabel) {
        document.getElementById("dlg-input-label").textContent = opts.inputLabel;
        input.value = "";
        field.classList.remove("hidden");
      } else {
        field.classList.add("hidden");
      }
      var done = false;
      function finish(result) {
        if (done) return;
        done = true;
        ok.removeEventListener("click", onOk);
        cancel.removeEventListener("click", onCancel);
        dlg.removeEventListener("cancel", onCancel);
        if (dlg.open) dlg.close();
        resolve(result);
      }
      function onOk() { finish({ ok: true, value: input.value.trim() }); }
      function onCancel(e) { if (e && e.preventDefault) e.preventDefault(); finish({ ok: false }); }
      ok.addEventListener("click", onOk);
      cancel.addEventListener("click", onCancel);
      dlg.addEventListener("cancel", onCancel);
      dlg.showModal();
      cancel.focus();
    });
  }

  /* ---------- sign in ---------- */

  function signOut(message) {
    state.session = null;
    state.email = null;
    state.expiresAt = null;
    state.overview = null;
    state.exclusions = null;
    state.segments = null;
    resetViews();
    writeStore(null);
    who.classList.add("hidden");
    renderSignIn();
    if (message) showNotice("warn", message);
  }

  function startSession(data) {
    state.session = data.session;
    state.email = data.email || "";
    state.expiresAt = data.expires_at || null;
    writeStore({ session: state.session, email: state.email, expires_at: state.expiresAt });
    whoEmail.textContent = state.email;
    who.classList.remove("hidden");
    state.tab = "home";
    resetViews();
    renderShell();
  }

  function sessionStillValid(saved) {
    if (!saved || !saved.session) return false;
    if (!saved.expires_at) return true;
    var t = typeof saved.expires_at === "number"
      ? (saved.expires_at < 1e12 ? saved.expires_at * 1000 : saved.expires_at)
      : Date.parse(saved.expires_at);
    return isNaN(t) ? true : t > Date.now();
  }

  function renderSignIn(sent) {
    app.textContent = "";
    var form;
    if (sent) {
      app.appendChild(h("h1", { text: "Check your email" }));
      app.appendChild(h("p", { class: "muted", text: "If that address can sign in, a link is on its way. It works once and lasts 15 minutes. Open it on this device." }));
      app.appendChild(h("button", { type: "button", class: "btn", text: "Use a different address", onclick: function () { clearNotice(); renderSignIn(false); } }));
      focusHeading();
      return;
    }
    var input = h("input", { type: "email", id: "signin-email", autocomplete: "email", inputmode: "email", required: true });
    var button = h("button", { type: "submit", class: "btn btn-primary btn-block", text: "Send me a sign-in link" });
    form = h("form", { novalidate: true }, [
      h("label", { class: "field", for: "signin-email", text: "Your email address" }),
      input,
      h("div", { class: "row" }, [button])
    ]);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearNotice();
      var email = input.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showNotice("error", "Enter the email address you use for Volyume admin, for example name@example.com.");
        input.focus();
        return;
      }
      setBusy(button, true, "Sending");
      call("request_login", { email: email }).then(function () {
        renderSignIn(true);
      }, function (err) {
        setBusy(button, false);
        showNotice("error", friendly(err, "while sending the link"));
      });
    });
    app.appendChild(h("h1", { text: "Members" }));
    app.appendChild(h("p", { class: "muted", text: "A private page for the Volyume team. Enter your email address and we will send you a sign-in link." }));
    app.appendChild(form);
    focusHeading();
  }

  function exchangeLogin(login) {
    app.textContent = "";
    app.appendChild(h("h1", { text: "Signing you in" }));
    app.appendChild(h("p", { class: "muted", text: "One moment." }));
    call("exchange", { login: login }).then(function (data) {
      if (!data || !data.session) throw new ApiError(400, "", "");
      clearNotice();
      startSession(data);
    }, function (err) {
      renderSignIn(false);
      if (err instanceof ApiError && err.status === 0) {
        showNotice("error", friendly(err));
      } else if (err instanceof ApiError && err.status === 429) {
        showNotice("error", friendly(err));
      } else {
        showNotice("error", "That link has expired. Ask for a new one.");
      }
    });
  }

  /* ---------- shared pieces ---------- */

  var TOPIC_LABEL = {
    product_news: "Product news",
    surveys: "Surveys",
    weekly_summary: "Weekly summary",
    community_events: "Community and events"
  };

  var CAMPAIGN_STATUS = {
    draft: "Draft", queued: "Waiting to send", scheduled: "Scheduled", sending: "Sending",
    paused: "Paused", sent: "Sent", cancelled: "Cancelled", failed: "Failed"
  };

  var AUTOMATION_NAME = {
    welcome_1: "Welcome, day 0",
    welcome_2: "Welcome, day 3",
    welcome_3: "Welcome, day 7",
    win_back: "Win-back",
    update_nudge: "Update nudge",
    weekly_summary: "Weekly training summary",
    anniversary: "Account anniversary",
    review_ask: "Store review request",
    re_permission: "Still want these emails"
  };

  var CHECKLIST = [
    ["audience_confirmed", "I have checked the audience number above"],
    ["topic_confirmed", "I have checked the topic is the right one for this email"],
    ["test_sent", "I have sent a test of this version and read it on my phone"],
    ["links_checked", "I have opened every link and button in the test"]
  ];

  function num(v) { return Number(v) || 0; }

  function percentOf(a, b) {
    if (!b) return "0%";
    var p = (a / b) * 100;
    return (p >= 10 ? Math.round(p) : Math.round(p * 10) / 10) + "%";
  }

  function stat(n, what, extra) {
    return h("div", { class: "card stat" + (extra ? " " + extra : "") }, [
      h("div", { class: "num", text: String(n) }),
      h("div", { class: "what", text: what })
    ]);
  }

  function statGrid(items) {
    var grid = h("div", { class: "stats" });
    items.forEach(function (it) { grid.appendChild(stat(it[0], it[1])); });
    return grid;
  }

  function loadingBox() {
    return h("p", { class: "muted", text: "Loading." });
  }

  function retryButton(fn) {
    return h("button", { type: "button", class: "btn", text: "Try again", onclick: fn });
  }

  function backButton(label, fn) {
    return h("div", { class: "row" }, [h("button", { type: "button", class: "btn", text: label, onclick: fn })]);
  }

  function field(id, label, control, hint) {
    return h("div", {}, [
      h("label", { class: "field", for: id }, [label, hint ? h("span", { class: "hint", text: hint }) : null]),
      control
    ]);
  }

  function selectOf(id, options, value) {
    var sel = h("select", { id: id });
    options.forEach(function (o) {
      var opt = h("option", { value: o[0], text: o[1] });
      if (String(o[0]) === String(value)) opt.selected = true;
      sel.appendChild(opt);
    });
    return sel;
  }

  function download(filename, text, type) {
    var blob = new Blob([text], { type: type || "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  // UK time. A datetime-local value is read as London time, whatever the
  // browser's own zone is, and sent as UTC.
  function londonOffsetMinutes(utcMs) {
    var parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London", hourCycle: "h23", year: "numeric", month: "2-digit",
      day: "2-digit", hour: "2-digit", minute: "2-digit"
    }).formatToParts(new Date(utcMs));
    var v = {};
    parts.forEach(function (p) { v[p.type] = Number(p.value); });
    var asUtc = Date.UTC(v.year, v.month - 1, v.day, v.hour, v.minute);
    return Math.round((asUtc - Math.floor(utcMs / 60000) * 60000) / 60000);
  }

  function londonInputToIso(value) {
    var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value || "");
    if (!m) return null;
    var naive = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]));
    var t = naive - londonOffsetMinutes(naive) * 60000;
    t = naive - londonOffsetMinutes(t) * 60000;
    return new Date(t).toISOString();
  }

  function isoToLondonInput(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    var t = d.getTime() + londonOffsetMinutes(d.getTime()) * 60000;
    return new Date(t).toISOString().slice(0, 16);
  }

  // Server lint: { errors, warnings, manual_checks }. Errors block; warnings
  // are notes; manual checks are things only a person can judge.
  function lintText(item) {
    if (typeof item === "string") return item;
    return item && item.message ? String(item.message) : "";
  }

  function lintView(lint) {
    var box = h("div", { "aria-live": "polite" });
    if (!lint) return box;
    var errors = Array.isArray(lint.errors) ? lint.errors : [];
    var warnings = Array.isArray(lint.warnings) ? lint.warnings : [];
    var manual = Array.isArray(lint.manual_checks) ? lint.manual_checks : [];
    if (errors.length) {
      var el = h("ul", { class: "reasons" });
      errors.forEach(function (e) { el.appendChild(h("li", { text: lintText(e) })); });
      box.appendChild(h("div", { class: "notice error" }, [h("strong", { text: "This email cannot be sent yet. Fix these first." }), el]));
    } else {
      box.appendChild(h("p", { class: "notice good", text: "The automatic wording check passed." }));
    }
    if (warnings.length) {
      var wl = h("ul", { class: "notes" });
      warnings.forEach(function (w) { wl.appendChild(h("li", { text: lintText(w) })); });
      box.appendChild(h("div", { class: "notice warn" }, [h("strong", { text: "Worth a second look" }), wl]));
    }
    if (manual.length) {
      var ml = h("ul", { class: "notes" });
      manual.forEach(function (w) { ml.appendChild(h("li", { text: lintText(w) })); });
      box.appendChild(h("details", { class: "notice" }, [h("summary", { text: "Checks only you can make" }), ml]));
    }
    return box;
  }

  function lintBlocks(lint) {
    return !!(lint && Array.isArray(lint.errors) && lint.errors.length);
  }

  // The counts shared by an email, an automation and the Insights screen.
  function statsView(s, opts) {
    var wrap = h("div", {});
    if (!s) { wrap.appendChild(h("p", { class: "muted", text: "No figures yet." })); return wrap; }
    var sent = num(s.sent);
    var items = [
      [sent, "Sent"],
      [num(s.delivered), "Delivered (" + percentOf(num(s.delivered), sent) + ")"],
      [num(s.opened_unique), "Opened (" + percentOf(num(s.opened_unique), sent) + ")"],
      [num(s.clicked_unique), "Clicked (" + percentOf(num(s.clicked_unique), sent) + ")"],
      [num(s.bounced), "Bounced"],
      [num(s.complained), "Complaints"],
      [num(s.unsubscribed), "Turned off from this"],
      [num(s.failed), "Failed to send"]
    ];
    if (s.app_return_measured !== false) items.push([num(s.app_returned_7d), "Opened the app within 7 days"]);
    if (s.survey_answers !== undefined && s.survey_answers !== null) items.push([num(s.survey_answers), "Survey answers"]);
    wrap.appendChild(statGrid(items));
    if (s.opens_inflated) {
      wrap.appendChild(h("p", { class: "small", text: "Opens can read higher than the truth, because Apple Mail Privacy Protection opens emails for people. Clicks and app returns are the steadier signals." }));
    }
    if (s.small_sample) {
      wrap.appendChild(h("p", { class: "small", text: "This is a small number of emails, so treat the percentages as a rough guide." }));
    }
    if (s.app_return_measured === false) {
      wrap.appendChild(h("p", { class: "small", text: "App returns are not measured for this one yet." }));
    }
    if (Array.isArray(s.links) && s.links.length) {
      var table = h("table", { class: "t" }, [h("tr", {}, [h("th", { text: "Link" }), h("th", { text: "Clicks" }), h("th", { text: "People" })])]);
      s.links.forEach(function (l) {
        table.appendChild(h("tr", {}, [h("td", { text: String(l.url || "") }), h("td", { text: String(num(l.clicks)) }), h("td", { text: String(num(l.unique)) })]));
      });
      wrap.appendChild(h("h3", { text: "Clicks per link" }));
      wrap.appendChild(table);
    }
    if (s.variants && (s.variants.a || s.variants.b)) {
      wrap.appendChild(h("h3", { text: "Subject test" }));
      ["a", "b"].forEach(function (k) {
        var v = s.variants[k];
        if (!v) return;
        wrap.appendChild(h("p", { text: "Subject " + k.toUpperCase() + ": " + num(v.sent) + " sent, " + num(v.opened_unique) + " opened, " + num(v.clicked_unique) + " clicked." }));
      });
      if (s.ab && s.ab.phase) {
        wrap.appendChild(h("p", { class: "small", text: "Test stage: " + s.ab.phase + (s.ab.winner ? ". Winner: subject " + String(s.ab.winner).toUpperCase() : "") + (s.ab.reason ? ". " + s.ab.reason : "") }));
      }
    }
    if (s.holdout && num(s.holdout.members) > 0) {
      wrap.appendChild(h("h3", { text: "Held-back group" }));
      wrap.appendChild(h("p", { text: num(s.holdout.members) + " members were kept back to measure the effect. " + (s.holdout.measured ? num(s.holdout.app_returned_7d) + " of them opened the app within 7 days." : "Their app returns are not measured yet.") }));
    }
    if (opts && opts.reasons) wrap.appendChild(reasonsView(s.unsubscribe_reasons));
    return wrap;
  }

  var REASON_LABEL = { too_many: "Too many emails", not_relevant: "Not relevant", not_expected: "Did not expect them", other: "Another reason" };

  function reasonsView(r) {
    var entries = [];
    if (Array.isArray(r)) r.forEach(function (x) { entries.push([x.reason, num(x.count || x.n)]); });
    else if (r && typeof r === "object") Object.keys(r).forEach(function (k) { entries.push([k, num(r[k])]); });
    var box = h("div", {});
    box.appendChild(h("h3", { text: "Why people turned emails off" }));
    if (!entries.length) { box.appendChild(h("p", { class: "muted", text: "Nobody has given a reason yet." })); return box; }
    entries.forEach(function (e) { box.appendChild(h("p", { text: (REASON_LABEL[e[0]] || e[0]) + ": " + e[1] })); });
    return box;
  }

  function dailyBars(daily) {
    if (!Array.isArray(daily) || !daily.length) return null;
    var max = 1;
    daily.forEach(function (d) { max = Math.max(max, num(d.sent)); });
    var spark = h("div", { class: "spark", role: "img", "aria-label": "Emails sent each day. The busiest day was " + max + "." });
    daily.forEach(function (d) {
      spark.appendChild(h("span", { style: "height:" + Math.round((num(d.sent) / max) * 100) + "%", title: String(d.day) + ": " + num(d.sent) }));
    });
    return spark;
  }

  function quotaView(q) {
    if (!q) return null;
    var cap = num(q.daily_cap);
    var used = num(q.member_used_24h);
    var pct = cap ? Math.min(100, Math.round((used / cap) * 100)) : 0;
    return h("div", { class: "card" }, [
      h("h3", { text: "Today's sending" }),
      h("p", { text: used + " of " + cap + " member emails used in the last 24 hours. " + num(q.remaining) + " left." }),
      h("div", { class: "meter", role: "img", "aria-label": pct + " per cent of the daily limit used" }, [h("span", { style: "width:" + pct + "%" })]),
      h("p", { class: "small", text: "Member email stops at " + cap + " a day so sign-in and account emails always get through. Bigger sends spread over several days by themselves." })
    ]);
  }

  /* ---------- shell and tabs ---------- */

  var TABS = [
    ["home", "Home"],
    ["emails", "Emails"],
    ["automations", "Automations"],
    ["surveys", "Surveys"],
    ["people", "People"],
    ["more", "More"]
  ];

  function resetViews() {
    state.campaign = null; state.campaignDirty = false;
    state.automation = null; state.automationDirty = false;
    state.survey = null; state.results = null;
    state.member = null; state.segmentEdit = null;
    state.more = "menu";
  }

  function hasUnsaved() {
    return (state.campaign && state.campaignDirty) || (state.automation && state.automationDirty);
  }

  // Run fn now, or after the person agrees to leave unsaved changes.
  function leaveThen(fn) {
    if (hasUnsaved()) {
      ask({ title: "Leave without saving?", body: "Your changes to this email have not been saved.", confirmLabel: "Leave", danger: true })
        .then(function (r) { if (r.ok) fn(); });
    } else { fn(); }
  }

  function goTab(tab) {
    leaveThen(function () { clearNotice(); resetViews(); state.tab = tab; renderShell(); });
  }

  function renderShell() {
    app.textContent = "";
    var tabs = h("div", { class: "tabs", role: "tablist", "aria-label": "Sections" });
    TABS.forEach(function (t) {
      tabs.appendChild(h("button", {
        type: "button", class: "btn tab" + (state.tab === t[0] ? " on" : ""), role: "tab",
        "aria-selected": state.tab === t[0] ? "true" : "false", text: t[1],
        onclick: function () { goTab(t[0]); }
      }));
    });
    app.appendChild(tabs);
    var body = h("div", { id: "view" });
    app.appendChild(body);
    if (state.tab === "home") renderHome(body);
    else if (state.tab === "emails") renderEmails(body);
    else if (state.tab === "automations") renderAutomations(body);
    else if (state.tab === "surveys") renderSurveys(body);
    else if (state.tab === "people") renderPeople(body);
    else renderMore(body);
  }

  function loadOverview() {
    return guarded(call("overview", {}), "while loading the overview").then(function (data) {
      state.overview = data || {};
      return state.overview;
    });
  }

  function surveysList() {
    var list = pick(state.overview, ["surveys"], []);
    return Array.isArray(list) ? list : [];
  }

  /* ---------- home ---------- */

  function alertText(a) {
    var key = String(a.key || "");
    var when = a.created_at ? " (" + formatDateTime(a.created_at) + ")" : "";
    if (key.indexOf("finished-") === 0) return "An email finished sending." + when;
    if (key.indexOf("alarm-") === 0) return "An email was paused because bounces or complaints went above the safe level. Open Emails to look at it." + when;
    if (key.indexOf("quota-") === 0) return "The daily sending limit was reached on " + key.slice(6) + "." + when;
    if (key.indexOf("lint-auto-") === 0) return "An automatic email was turned off because its wording needs fixing. Open Automations." + when;
    return "Something needs a look." + when;
  }

  function renderHome(body) {
    body.appendChild(h("h1", { text: "Home" }));
    body.appendChild(loadingBox());
    Promise.all([
      guarded(call("home", {}), "while loading the dashboard"),
      guarded(call("insights", { days: 30 }), "while loading the figures").catch(function () { return null; })
    ]).then(function (res) {
      var home = res[0] || {};
      var ins = res[1] && res[1].insights ? res[1].insights : (home.last_30_days || null);
      body.textContent = "";
      body.appendChild(h("h1", { text: "Home" }));

      if (home.kill_switch && home.kill_switch.on) {
        body.appendChild(h("div", { class: "notice error" }, [
          h("strong", { text: "Sending is switched off." }),
          h("p", { text: home.kill_switch.reason ? "Reason: " + home.kill_switch.reason : "No member email is going out." }),
          h("button", { type: "button", class: "btn", text: "Open settings", onclick: function () { leaveThen(function () { resetViews(); state.tab = "more"; state.more = "settings"; renderShell(); }); } })
        ]));
      }
      if (home.resend_configured === false) body.appendChild(h("p", { class: "notice warn", text: "The email service key is not set up yet, so nothing can be sent." }));
      if (home.webhook_configured === false) body.appendChild(h("p", { class: "notice warn", text: "Delivery tracking is not connected yet, so opens, clicks and bounces will not appear." }));

      var alerts = Array.isArray(home.alerts) ? home.alerts : [];
      if (alerts.length) {
        var al = h("ul", { class: "notes" });
        alerts.forEach(function (a) { al.appendChild(h("li", { text: alertText(a) })); });
        body.appendChild(h("div", { class: "notice warn" }, [h("strong", { text: "This week" }), al]));
      }

      var health = home.delivery_health || {};
      var levelWord = { green: "Healthy", amber: "Watch closely", red: "Needs attention" }[health.level] || "Unknown";
      body.appendChild(h("div", { class: "card" }, [
        h("h3", { text: "Delivery health" }),
        h("p", {}, [h("span", { class: "chip " + (health.level === "green" ? "good" : (health.level === "red" ? "bad" : "warn")), text: levelWord })]),
        h("p", { class: "small", text: "Bounces " + (num(health.bounce_rate) * 100).toFixed(2) + " per cent. Complaints " + (num(health.complaint_rate) * 100).toFixed(2) + " per cent. Over the last 30 days." })
      ]));
      var qv = quotaView(home.quota);
      if (qv) body.appendChild(qv);

      if (ins) {
        body.appendChild(h("h2", { text: "Last 30 days" }));
        body.appendChild(statGrid([
          [num(ins.audience_now), "People who will receive news email"],
          [num(ins.sent), "Emails sent"],
          [num(ins.opened_unique), "Opened (" + percentOf(num(ins.opened_unique), num(ins.sent)) + ")"],
          [num(ins.clicked_unique), "Clicked (" + percentOf(num(ins.clicked_unique), num(ins.sent)) + ")"],
          [num(ins.unsubscribed), "Turned emails off"],
          [num(ins.app_returned_7d), "Opened the app within 7 days of an email"]
        ]));
        var bars = dailyBars(ins.daily);
        if (bars) body.appendChild(bars);
        if (ins.opens_inflated) body.appendChild(h("p", { class: "small", text: "Opens can read high because Apple Mail Privacy Protection opens emails for people." }));
      }

      body.appendChild(h("p", { class: "small", text: num(home.automations_on) + " automatic emails are on." }));
      var active = Array.isArray(home.campaigns_active) ? home.campaigns_active : [];
      if (active.length) {
        body.appendChild(h("h2", { text: "Going out" }));
        active.forEach(function (c) { body.appendChild(campaignItem(c)); });
      }
      body.appendChild(h("div", { class: "row" }, [
        h("button", { type: "button", class: "btn btn-primary", text: "Write an email", onclick: function () { resetViews(); state.tab = "emails"; state.campaign = newCampaign(); renderShell(); } }),
        h("button", { type: "button", class: "btn", text: "Make a survey", onclick: function () { resetViews(); state.tab = "surveys"; state.survey = newSurvey(); renderShell(); } })
      ]));
      focusHeading();
    }, function () {
      body.textContent = "";
      body.appendChild(h("h1", { text: "Home" }));
      body.appendChild(retryButton(renderShell));
    });
  }

  /* ---------- block editor (emails and automations) ---------- */

  var BLOCK_TYPES = [
    ["heading", "Heading"],
    ["paragraph", "Paragraph"],
    ["image", "Image"],
    ["button", "Button"],
    ["divider", "Divider line"],
    ["spacer", "Space"],
    ["survey", "Survey button"],
    ["update_prompt", "New version prompt"],
    ["share", "Share Volyume"],
    ["preferences", "Email preferences link"]
  ];

  var BLOCK_NOTE = {
    divider: "A thin line between two parts of the email.",
    update_prompt: "Shown only to members on an older app version: \"A new version of Volyume is ready\", with a link to update.",
    share: "A short line inviting members to share Volyume, linking the store pages.",
    preferences: "A line linking to the email preferences page, where each member chooses their topics."
  };

  function newBlock(type) {
    if (type === "heading") return { type: type, text: "", level: 1 };
    if (type === "paragraph") return { type: type, text: "" };
    if (type === "image") return { type: type, url: "", alt: "", width: "", link: "" };
    if (type === "button") return { type: type, label: "", url: "" };
    if (type === "spacer") return { type: type, size: "medium" };
    if (type === "survey") return { type: type, survey_id: "", label: "" };
    return { type: type };
  }

  // The exact shape the server accepts for each block.
  function cleanBlock(b) {
    if (b.type === "heading") return { type: "heading", text: String(b.text || "").trim(), level: Number(b.level) === 2 ? 2 : 1 };
    if (b.type === "paragraph") return { type: "paragraph", text: String(b.text || "").trim() };
    if (b.type === "image") {
      var out = { type: "image", url: String(b.url || "").trim(), alt: String(b.alt || "").trim() };
      var w = parseInt(b.width, 10);
      if (w) out.width = w;
      if (String(b.link || "").trim()) out.link = String(b.link).trim();
      return out;
    }
    if (b.type === "button") return { type: "button", label: String(b.label || "").trim(), url: String(b.url || "").trim() };
    if (b.type === "spacer") return { type: "spacer", size: b.size || "medium" };
    if (b.type === "survey") {
      var s = { type: "survey", survey_id: String(b.survey_id || "") };
      if (String(b.label || "").trim()) s.label = String(b.label).trim();
      return s;
    }
    return { type: b.type };
  }

  function blockFromServer(b) {
    var out = newBlock(b.type);
    Object.keys(out).forEach(function (k) { if (b[k] !== undefined && b[k] !== null) out[k] = b[k]; });
    return out;
  }

  function isHttps(url) { return /^https:\/\/[^\s]+$/i.test(String(url || "").trim()); }

  function blockProblems(blocks, allowEmpty) {
    var problems = [];
    if (!blocks.length && !allowEmpty) problems.push("Add at least one block.");
    if (blocks.length > 60) problems.push("An email can have at most 60 blocks.");
    var surveys = 0;
    blocks.forEach(function (b, i) {
      var n = "Block " + (i + 1) + " (" + (BLOCK_TYPES.filter(function (t) { return t[0] === b.type; })[0] || ["", b.type])[1].toLowerCase() + ")";
      function dash(text) { if (text && EM_DASH.test(text)) problems.push(n + " has an em dash. Use a comma, a full stop or a colon instead."); }
      if (b.type === "heading") {
        if (!String(b.text).trim()) problems.push(n + " needs its words.");
        dash(b.text);
      } else if (b.type === "paragraph") {
        if (!String(b.text).trim()) problems.push(n + " needs its words.");
        dash(b.text);
      } else if (b.type === "image") {
        if (!isHttps(b.url)) problems.push(n + " needs an image. Upload one.");
        if (!String(b.alt).trim()) problems.push(n + " needs a short description for people who cannot see it.");
        if (String(b.link || "").trim() && !isHttps(b.link)) problems.push(n + " has a link that does not start with https.");
        var w = parseInt(b.width, 10);
        if (String(b.width || "").trim() && (isNaN(w) || w < 40 || w > 560)) problems.push(n + " has a width outside 40 to 560.");
        dash(b.alt);
      } else if (b.type === "button") {
        if (!String(b.label).trim()) problems.push(n + " needs a label.");
        else if (String(b.label).trim().length > 40) problems.push(n + " has a label longer than 40 characters.");
        if (!isHttps(b.url)) problems.push(n + " needs a link that starts with https.");
        dash(b.label);
      } else if (b.type === "survey") {
        surveys += 1;
        if (!b.survey_id) problems.push(n + " needs a survey chosen.");
        dash(b.label);
      }
    });
    if (surveys > 1) problems.push("An email can hold only one survey button.");
    return problems;
  }

  function readFileAsBase64(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var s = String(reader.result || "");
        var i = s.indexOf(",");
        resolve(i >= 0 ? s.slice(i + 1) : s);
      };
      reader.onerror = function () { reject(new Error("read")); };
      reader.readAsDataURL(file);
    });
  }

  // blocks is edited in place; opts: { onChange, allowSurvey, surveys, allowEmpty }
  function blockEditor(blocks, opts) {
    var root = h("div", {});
    var uid = 0;

    function changed() { if (opts.onChange) opts.onChange(); }

    function input(b, key, label, type, hint, extra) {
      uid += 1;
      var id = "blk-" + uid;
      var el = type === "textarea"
        ? h("textarea", { id: id, rows: "5", maxlength: "5000" })
        : h("input", Object.assign({ id: id, type: type || "text", autocomplete: "off" }, extra || {}));
      el.value = b[key] === undefined || b[key] === null ? "" : b[key];
      el.addEventListener("input", function () { b[key] = el.value; changed(); });
      return field(id, label, el, hint);
    }

    function move(i, d) {
      var j = i + d;
      if (j < 0 || j >= blocks.length) return;
      var t = blocks[i]; blocks[i] = blocks[j]; blocks[j] = t;
      draw(); changed();
    }

    function imageControls(b, card) {
      var preview = h("div", {});
      function showImage() {
        preview.textContent = "";
        if (isHttps(b.url)) preview.appendChild(h("img", { src: b.url, alt: b.alt || "Chosen image", style: "max-width:100%;max-height:160px;border-radius:8px;display:block;margin:8px 0" }));
      }
      showImage();
      uid += 1;
      var fid = "blk-file-" + uid;
      var file = h("input", { id: fid, type: "file", accept: "image/png,image/jpeg,image/gif,image/webp" });
      file.addEventListener("change", function () {
        var f = file.files && file.files[0];
        if (!f) return;
        if (f.size > 2 * 1024 * 1024) { showNotice("error", "That image is larger than 2 MB. Choose a smaller one."); return; }
        clearNotice();
        showNotice("warn", "Uploading the image.");
        readFileAsBase64(f).then(function (b64) {
          return guarded(call("upload_asset", { content_type: f.type, data_base64: b64 }, 90000), "while uploading the image");
        }).then(function (res) {
          b.url = res.url || "";
          showNotice("good", "Image uploaded.");
          draw(); changed();
        }).catch(function () { file.value = ""; });
      });
      card.appendChild(field(fid, "Upload an image", file, "PNG, JPEG, GIF or WebP, up to 2 MB."));
      var earlier = h("button", { type: "button", class: "btn", text: "Choose an earlier image" });
      var earlierBox = h("div", {});
      earlier.addEventListener("click", function () {
        earlierBox.textContent = "";
        earlierBox.appendChild(loadingBox());
        guarded(call("list_assets", {}), "while loading images").then(function (res) {
          earlierBox.textContent = "";
          var assets = Array.isArray(res.assets) ? res.assets : [];
          if (!assets.length) earlierBox.appendChild(h("p", { class: "muted", text: "No images uploaded yet." }));
          assets.forEach(function (a) {
            earlierBox.appendChild(h("button", { type: "button", class: "item", onclick: function () { b.url = a.url; draw(); changed(); } }, [
              h("img", { src: a.url, alt: "Earlier upload", style: "max-height:64px;max-width:100%;border-radius:6px" }),
              h("div", { class: "m", text: Math.round(num(a.bytes) / 1024) + " KB, " + formatDate(a.created_at) })
            ]));
          });
        }).catch(function () { earlierBox.textContent = ""; });
      });
      card.appendChild(h("div", { class: "row" }, [earlier]));
      card.appendChild(earlierBox);
      card.appendChild(preview);
      card.appendChild(input(b, "alt", "Description of the image", "text", "Required. Read aloud to people using a screen reader, and shown when images are off.", { maxlength: "200" }));
      card.appendChild(input(b, "width", "Width in pixels", "number", "Optional, 40 to 560. Leave empty for full width."));
      card.appendChild(input(b, "link", "Link when tapped", "url", "Optional. Must start with https."));
    }

    function draw() {
      root.textContent = "";
      uid = 0;
      blocks.forEach(function (b, i) {
        var label = (BLOCK_TYPES.filter(function (t) { return t[0] === b.type; })[0] || ["", b.type])[1];
        var card = h("div", { class: "block" }, [h("div", { class: "bhead", text: (i + 1) + ". " + label })]);
        if (b.type === "heading") {
          card.appendChild(input(b, "text", "Heading", "text", null, { maxlength: "150" }));
          uid += 1;
          var lv = selectOf("blk-level-" + uid, [["1", "Large"], ["2", "Smaller"]], b.level);
          lv.addEventListener("change", function () { b.level = Number(lv.value); changed(); });
          card.appendChild(field("blk-level-" + uid, "Size", lv));
        } else if (b.type === "paragraph") {
          card.appendChild(input(b, "text", "Words", "textarea", "A link is written [words](https://volyume.app). To use a first name, write {{first_name|there}}."));
        } else if (b.type === "image") {
          imageControls(b, card);
        } else if (b.type === "button") {
          card.appendChild(input(b, "label", "Button label", "text", "Up to 40 characters.", { maxlength: "40" }));
          card.appendChild(input(b, "url", "Link", "url", "Must start with https."));
        } else if (b.type === "spacer") {
          uid += 1;
          var sz = selectOf("blk-size-" + uid, [["small", "Small"], ["medium", "Medium"], ["large", "Large"]], b.size);
          sz.addEventListener("change", function () { b.size = sz.value; changed(); });
          card.appendChild(field("blk-size-" + uid, "Size", sz));
        } else if (b.type === "survey") {
          uid += 1;
          var opts2 = [["", "Choose a survey"]];
          (opts.surveys || []).forEach(function (s) { opts2.push([s.id, (s.title || "Untitled survey") + (s.status === "open" ? "" : " (not open yet)")]); });
          var sel = selectOf("blk-survey-" + uid, opts2, b.survey_id);
          sel.addEventListener("change", function () { b.survey_id = sel.value; changed(); });
          card.appendChild(field("blk-survey-" + uid, "Survey", sel, "The survey must be open before the email can be sent."));
          card.appendChild(input(b, "label", "Button label", "text", "Optional, up to 40 characters.", { maxlength: "40" }));
        } else if (BLOCK_NOTE[b.type]) {
          card.appendChild(h("p", { class: "small", text: BLOCK_NOTE[b.type] }));
        }
        var up = h("button", { type: "button", class: "btn", text: "Move up", onclick: function () { move(i, -1); } });
        var down = h("button", { type: "button", class: "btn", text: "Move down", onclick: function () { move(i, 1); } });
        var rm = h("button", { type: "button", class: "btn btn-danger", text: "Remove", onclick: function () { blocks.splice(i, 1); draw(); changed(); } });
        if (i === 0) up.disabled = true;
        if (i === blocks.length - 1) down.disabled = true;
        card.appendChild(h("div", { class: "row" }, [up, down, rm]));
        root.appendChild(card);
      });
      if (!blocks.length) root.appendChild(h("p", { class: "muted", text: "No blocks yet. Add one below." }));
      var types = BLOCK_TYPES.filter(function (t) { return t[0] !== "survey" || opts.allowSurvey; });
      var addSel = selectOf("blk-add-type", types, "paragraph");
      var addBtn = h("button", { type: "button", class: "btn", text: "Add this block", onclick: function () {
        blocks.push(newBlock(addSel.value));
        draw(); changed();
      } });
      root.appendChild(field("blk-add-type", "Add a block", addSel));
      root.appendChild(h("div", { class: "row" }, [addBtn]));
    }
    draw();
    return root;
  }

  /* ---------- preview panel (emails and automations) ---------- */

  // opts: { load(flags) -> Promise of { subject, html, text, lint }, ab, onLint }
  function previewPanel(opts) {
    var flags = { device: "phone", dark: false, below: false, variant: "a", sample: true, firstName: "" };
    var out = h("div", {});
    var frameBox = h("div", { "aria-live": "polite" });
    var device = selectOf("pv-device", [["phone", "Phone"], ["desktop", "Desktop"]], "phone");
    var dark = h("input", { type: "checkbox", id: "pv-dark" });
    var below = h("input", { type: "checkbox", id: "pv-below" });
    var name = h("input", { type: "text", id: "pv-name", maxlength: "40", autocomplete: "off" });
    var variant = opts.ab ? selectOf("pv-variant", [["a", "Subject A"], ["b", "Subject B"]], "a") : null;
    var go = h("button", { type: "button", class: "btn btn-primary", text: "Show preview" });
    var last = null;

    function draw() {
      frameBox.textContent = "";
      if (!last) return;
      frameBox.appendChild(h("p", { class: "card" }, [h("strong", { text: "Subject: " }), last.subject || ""]));
      frameBox.appendChild(h("iframe", {
        class: "preview " + (flags.device === "phone" ? "phone" : "") + (flags.dark ? " dark" : ""),
        sandbox: "", srcdoc: last.html || "", title: "Email preview"
      }));
      if (last.text) {
        frameBox.appendChild(h("details", {}, [h("summary", { text: "Plain text version" }), h("pre", { class: "plain", text: last.text })]));
      }
    }
    function run() {
      flags.device = device.value; flags.dark = dark.checked; flags.below = below.checked;
      flags.firstName = name.value.trim(); flags.variant = variant ? variant.value : "a";
      setBusy(go, true, "Preparing");
      Promise.resolve(opts.load(flags)).then(function (res) {
        setBusy(go, false);
        last = res || null;
        if (last && opts.onLint) opts.onLint(last.lint);
        draw();
      }).catch(function () { setBusy(go, false); });
    }
    go.addEventListener("click", run);
    device.addEventListener("change", function () { flags.device = device.value; draw(); });
    out.appendChild(h("div", { class: "grid2" }, [
      field("pv-device", "Show it as a", device),
      field("pv-name", "First name to try", name, "Optional. Leave empty to see the fallback word.")
    ]));
    if (variant) out.appendChild(field("pv-variant", "Subject to show", variant));
    out.appendChild(h("label", { class: "check", for: "pv-dark" }, [dark, "Dark mode"]));
    out.appendChild(h("label", { class: "check", for: "pv-below" }, [below, "As a member below the latest version (shows the update prompt)"]));
    out.appendChild(h("div", { class: "row" }, [go]));
    out.appendChild(frameBox);
    return out;
  }

  /* ---------- emails ---------- */

  function newCampaign(tpl) {
    state.campaignDirty = false;
    return {
      id: null, subject: tpl ? tpl.subject || "" : "", preheader: tpl ? tpl.preheader || "" : "", topic: "product_news", segment_id: "",
      ab_subject_b: "", ab_test_percent: 20, ab_wait_hours: 4, holdout_percent: 0,
      blocks: tpl && Array.isArray(tpl.blocks) && tpl.blocks.length ? tpl.blocks.map(blockFromServer) : [newBlock("heading"), newBlock("paragraph")],
      status: "draft", lint: null, count: null, ticks: {}
    };
  }

  function campaignFromServer(c, extra) {
    var blocks = Array.isArray(c.blocks) && c.blocks.length ? c.blocks.map(blockFromServer) : [];
    if (!blocks.length && c.body) {
      blocks.push({ type: "paragraph", text: c.body });
      if (c.button_label && c.button_url) blocks.push({ type: "button", label: c.button_label, url: c.button_url });
    }
    var m = {
      id: c.id, subject: c.subject || "", preheader: c.preheader || "", topic: c.topic || "product_news",
      segment_id: c.segment_id || "", ab_subject_b: c.ab_subject_b || "",
      ab_test_percent: c.ab_test_percent || 20, ab_wait_hours: c.ab_wait_hours || 4, holdout_percent: c.holdout_percent || 0,
      blocks: blocks, status: c.status || "draft", scheduled_at: c.scheduled_at, undo_until: c.undo_until,
      paused_reason: c.paused_reason, recipient_count: c.recipient_count, sent_count: c.sent_count, failed_count: c.failed_count,
      started_at: c.started_at, finished_at: c.finished_at, kind: c.kind, lint: null, count: null, ticks: {}
    };
    if (extra) { m.lint = extra.lint || null; m.count = extra.count || null; }
    state.campaignDirty = false;
    return m;
  }

  function openCampaign(id) {
    clearNotice();
    guarded(call("get_campaign", { id: id }), "while opening the email").then(function (res) {
      state.campaign = campaignFromServer(res.campaign, res);
      if (state.tab !== "emails") { resetViewsExceptCampaign(); state.tab = "emails"; }
      renderShell();
    }).catch(function () {});
  }

  function resetViewsExceptCampaign() {
    state.automation = null; state.survey = null; state.results = null; state.member = null; state.more = "menu";
  }

  function campaignItem(c) {
    var meta = [CAMPAIGN_STATUS[c.status] || c.status, TOPIC_LABEL[c.topic] || ""];
    if (c.status === "scheduled" && c.scheduled_at) meta.push("for " + formatDateTime(c.scheduled_at) + " UK time");
    else if (c.status === "queued" && c.undo_until) meta.push("starts " + formatDateTime(c.undo_until) + " UK time");
    else if (c.recipient_count) meta.push(num(c.sent_count) + " of " + num(c.recipient_count) + " sent");
    else if (c.created_at) meta.push(formatDate(c.created_at));
    if (c.kind === "resend") meta.push("resend");
    return h("button", { type: "button", class: "item", onclick: function () { openCampaign(c.id); } }, [
      h("div", { class: "t", text: c.subject || "No subject yet" }),
      h("div", { class: "m", text: meta.filter(Boolean).join(". ") })
    ]);
  }

  function renderEmails(body) {
    if (state.campaign) { renderCampaignEditor(body); return; }
    body.appendChild(h("h1", { text: "Emails" }));
    body.appendChild(h("div", { class: "row" }, [
      h("button", { type: "button", class: "btn btn-primary", text: "Write an email", onclick: function () { state.campaign = newCampaign(); renderShell(); } })
    ]));
    var filter = selectOf("em-filter", [["", "All emails"], ["draft", "Drafts"], ["queued", "Waiting to send"], ["scheduled", "Scheduled"], ["sending", "Sending"], ["paused", "Paused"], ["sent", "Sent"], ["cancelled", "Cancelled"]], state.campaignFilter);
    body.appendChild(field("em-filter", "Show", filter));
    var list = h("div", { "aria-live": "polite" }, [loadingBox()]);
    body.appendChild(list);
    var tplBox = h("div", {});
    body.appendChild(tplBox);

    var offset = 0;
    function load() {
      list.textContent = "";
      list.appendChild(loadingBox());
      var payload = { offset: offset };
      if (state.campaignFilter) payload.status = state.campaignFilter;
      guarded(call("list_campaigns", payload), "while loading emails").then(function (res) {
        list.textContent = "";
        var items = Array.isArray(res.campaigns) ? res.campaigns : [];
        if (!items.length) list.appendChild(h("p", { class: "muted", text: offset ? "No more emails." : "No emails here yet." }));
        items.forEach(function (c) { list.appendChild(campaignItem(c)); });
        var prev = h("button", { type: "button", class: "btn", text: "Newer", onclick: function () { offset = Math.max(0, offset - 50); load(); } });
        var next = h("button", { type: "button", class: "btn", text: "Older", onclick: function () { offset += 50; load(); } });
        if (offset <= 0) prev.disabled = true;
        if (items.length < 50) next.disabled = true;
        list.appendChild(h("div", { class: "pager" }, [prev, next]));
        focusHeading();
      }).catch(function () { list.textContent = ""; list.appendChild(retryButton(load)); });
    }
    filter.addEventListener("change", function () { state.campaignFilter = filter.value; offset = 0; load(); });
    load();

    guarded(call("list_templates", {}), "while loading templates").then(function (res) {
      var items = Array.isArray(res.templates) ? res.templates : [];
      if (!items.length) return;
      tplBox.appendChild(h("h2", { text: "Saved templates" }));
      items.forEach(function (t) {
        var use = h("button", { type: "button", class: "btn", text: "Start an email from this", onclick: function () { state.campaign = newCampaign(t); state.campaignDirty = true; renderShell(); } });
        var del = h("button", { type: "button", class: "btn btn-danger", text: "Delete template" });
        del.addEventListener("click", function () {
          ask({ title: "Delete this template?", body: "Emails already made from it are not changed.", confirmLabel: "Delete", danger: true }).then(function (r) {
            if (!r.ok) return null;
            return guarded(call("delete_template", { id: t.id }), "while deleting the template").then(function () { renderShell(); });
          }).catch(function () {});
        });
        tplBox.appendChild(h("div", { class: "card" }, [h("div", { class: "t", text: t.name || "Template" }), h("div", { class: "small", text: t.subject || "" }), h("div", { class: "row" }, [use, del])]));
      });
    }).catch(function () {});
  }

  function campaignProblems(c) {
    var problems = [];
    if (!c.subject.trim()) problems.push("Add a subject.");
    else if (c.subject.length > 150) problems.push("The subject is longer than 150 characters.");
    if (EM_DASH.test(c.subject)) problems.push("The subject has an em dash. Use a comma, a full stop or a colon instead.");
    if (EM_DASH.test(c.preheader)) problems.push("The preview line has an em dash. Use a comma, a full stop or a colon instead.");
    if (c.ab_subject_b.trim() && EM_DASH.test(c.ab_subject_b)) problems.push("Subject B has an em dash. Use a comma, a full stop or a colon instead.");
    if (c.preheader.length > 200) problems.push("The preview line is longer than 200 characters.");
    return problems.concat(blockProblems(c.blocks, false));
  }

  function campaignPayload(c) {
    var p = {
      subject: c.subject.trim(), preheader: c.preheader.trim(), topic: c.topic,
      blocks: c.blocks.map(cleanBlock), segment_id: c.segment_id || null,
      ab_subject_b: c.ab_subject_b.trim() || null,
      ab_test_percent: parseInt(c.ab_test_percent, 10) || 20,
      ab_wait_hours: parseInt(c.ab_wait_hours, 10) || 4,
      holdout_percent: parseInt(c.holdout_percent, 10) || 0
    };
    if (c.id) p.id = c.id;
    return p;
  }

  function saveCampaign() {
    var c = state.campaign;
    var problems = campaignProblems(c);
    if (problems.length) { showNotice("error", problems[0]); return Promise.reject(new Error("invalid")); }
    return guarded(call("save_campaign", campaignPayload(c)), "while saving").then(function (res) {
      var saved = res.campaign || {};
      if (saved.id) c.id = saved.id;
      c.lint = res.lint || null;
      c.ticks = {};
      state.campaignDirty = false;
      return c;
    });
  }

  function ensureSaved() {
    var c = state.campaign;
    return (!c.id || state.campaignDirty) ? saveCampaign() : Promise.resolve(c);
  }

  function loadSegments() {
    return guarded(call("list_segments", {}), "while loading segments").then(function (res) {
      state.segments = Array.isArray(res.segments) ? res.segments : [];
      return state.segments;
    });
  }

  function countView(count) {
    if (!count) return h("p", { class: "muted", text: "The audience number has not been checked yet." });
    var lines = [
      num(count.will_receive) + " will receive this."
    ];
    if (num(count.holdout)) lines.push(num(count.holdout) + " are kept back as the held-back group.");
    if (num(count.already_sent)) lines.push(num(count.already_sent) + " already got it.");
    lines.push("The daily limit is " + num(count.daily_cap) + ", so this takes about " + plural(Math.max(1, num(count.days_needed)), "day", "days") + ".");
    return h("div", { class: "card stat" }, [
      h("div", { class: "num", text: String(num(count.will_receive)) }),
      h("div", { class: "what", text: lines.join(" ") })
    ]);
  }

  function undoPanel(c, onDone) {
    var box = h("div", { class: "notice warn", role: "status" });
    var text = h("p", {});
    var cancel = h("button", { type: "button", class: "btn btn-danger", text: "Cancel the send" });
    box.appendChild(h("strong", { text: "Waiting to send" }));
    box.appendChild(text);
    box.appendChild(h("div", { class: "row" }, [cancel]));
    function tick() {
      var left = c.undo_until ? Date.parse(c.undo_until) - Date.now() : 0;
      if (!box.isConnected && box.dataset.seen) { clearInterval(timer); return; }
      box.dataset.seen = "1";
      if (left > 0) text.textContent = "Sending starts at " + formatDateTime(c.undo_until) + " UK time, in about " + Math.max(1, Math.ceil(left / 60000)) + " minutes. Until then you can cancel and the email goes back to a draft.";
      else text.textContent = "The undo window has ended. Sending is starting.";
    }
    var timer = setInterval(tick, 15000);
    tick();
    cancel.addEventListener("click", function () {
      setBusy(cancel, true, "Cancelling");
      guarded(call("undo_send", { id: c.id }), "while cancelling").then(function (res) {
        clearInterval(timer);
        showNotice("good", res.status === "cancelled" ? "The send was stopped." : "Cancelled. The email is a draft again.");
        onDone();
      }).catch(function () { setBusy(cancel, false); });
    });
    return box;
  }

  function ticksView(ticks, onChange) {
    var box = h("div", {});
    CHECKLIST.forEach(function (item, i) {
      var cb = h("input", { type: "checkbox", id: "tick-" + i });
      cb.checked = !!ticks[item[0]];
      cb.addEventListener("change", function () { ticks[item[0]] = cb.checked; onChange(); });
      box.appendChild(h("label", { class: "check", for: "tick-" + i }, [cb, item[1]]));
    });
    return box;
  }

  function allTicked(ticks) {
    return CHECKLIST.every(function (i) { return !!ticks[i[0]]; });
  }

  function checklistPayload() {
    var o = {};
    CHECKLIST.forEach(function (i) { o[i[0]] = true; });
    return o;
  }

  function renderCampaignEditor(body) {
    var c = state.campaign;
    body.appendChild(h("h1", { text: c.id ? (c.status === "draft" ? "Edit email" : c.subject || "Email") : "New email" }));
    body.appendChild(backButton("Back to emails", function () { leaveThen(function () { clearNotice(); state.campaign = null; state.campaignDirty = false; renderShell(); }); }));
    var holder = h("div", {}, [loadingBox()]);
    body.appendChild(holder);
    Promise.all([loadSegments().catch(function () { return []; }), loadOverview().catch(function () { return null; })]).then(function () {
      holder.textContent = "";
      if (c.status === "draft") buildDraftEditor(holder, c); else buildSentView(holder, c);
      focusHeading();
    });
  }

  function buildDraftEditor(box, c) {
    function dirty() { state.campaignDirty = true; c.ticks = {}; refreshProblems(); refreshSend(); }

    var subject = h("input", { id: "c-subject", type: "text", maxlength: "150", autocomplete: "off" });
    subject.value = c.subject;
    subject.addEventListener("input", function () { c.subject = subject.value; dirty(); });
    var pre = h("input", { id: "c-pre", type: "text", maxlength: "200", autocomplete: "off" });
    pre.value = c.preheader;
    pre.addEventListener("input", function () { c.preheader = pre.value; dirty(); });
    var topic = selectOf("c-topic", Object.keys(TOPIC_LABEL).map(function (k) { return [k, TOPIC_LABEL[k]]; }), c.topic);
    topic.addEventListener("change", function () { c.topic = topic.value; dirty(); });
    var segOptions = [["", "Everyone who receives this topic"]];
    (state.segments || []).forEach(function (s) {
      var n = s.count && s.count.will_receive !== undefined ? " (" + num(s.count.will_receive) + " would receive)" : "";
      segOptions.push([s.id, (s.name || "Segment") + n]);
    });
    var seg = selectOf("c-seg", segOptions, c.segment_id);
    seg.addEventListener("change", function () { c.segment_id = seg.value; dirty(); });

    box.appendChild(field("c-subject", "Subject", subject, "What people see first. Up to 150 characters."));
    box.appendChild(field("c-pre", "Preview line", pre, "Optional. The grey text after the subject in most inboxes."));
    box.appendChild(h("div", { class: "grid2" }, [
      field("c-topic", "Topic", topic, "Only members with this topic on will receive it."),
      field("c-seg", "Who gets it", seg, "Segments are made on the People screen.")
    ]));

    var abB = h("input", { id: "c-ab", type: "text", maxlength: "150", autocomplete: "off" });
    abB.value = c.ab_subject_b;
    abB.addEventListener("input", function () { c.ab_subject_b = abB.value; dirty(); });
    var abPct = h("input", { id: "c-abp", type: "number", min: "10", max: "50", inputmode: "numeric" });
    abPct.value = c.ab_test_percent;
    abPct.addEventListener("input", function () { c.ab_test_percent = abPct.value; dirty(); });
    var abWait = h("input", { id: "c-abw", type: "number", min: "1", max: "48", inputmode: "numeric" });
    abWait.value = c.ab_wait_hours;
    abWait.addEventListener("input", function () { c.ab_wait_hours = abWait.value; dirty(); });
    var hold = h("input", { id: "c-hold", type: "number", min: "0", max: "50", inputmode: "numeric" });
    hold.value = c.holdout_percent;
    hold.addEventListener("input", function () { c.holdout_percent = hold.value; dirty(); });
    var adv = h("details", { open: (c.ab_subject_b || num(c.holdout_percent)) ? true : false }, [
      h("summary", { text: "Test two subjects, or keep a group back" }),
      field("c-ab", "Subject B", abB, "Optional. A share of members get subject B, the rest wait, then the better subject goes to everyone else. The winner is the one with more opens, then clicks."),
      h("div", { class: "grid2" }, [
        field("c-abp", "Share used for the test (10 to 50 per cent)", abPct),
        field("c-abw", "Hours to wait for a winner (1 to 48)", abWait)
      ]),
      field("c-hold", "Held-back group (0 to 50 per cent)", hold, "A share of members who are not emailed at all, so you can see whether the email brings people back to the app.")
    ]);
    box.appendChild(adv);

    box.appendChild(h("h2", { text: "Content" }));
    var surveys = surveysList();
    box.appendChild(blockEditor(c.blocks, { onChange: dirty, allowSurvey: true, surveys: surveys }));

    var problemsBox = h("div", { "aria-live": "polite" });
    var lintBox = h("div", {});
    box.appendChild(problemsBox);
    box.appendChild(lintBox);
    function drawLint() { lintBox.textContent = ""; if (c.lint) lintBox.appendChild(lintView(c.lint)); }
    drawLint();

    var saveBtn = h("button", { type: "button", class: "btn btn-primary", text: "Save draft" });
    var tplBtn = h("button", { type: "button", class: "btn", text: "Save as template" });
    var dupBtn = h("button", { type: "button", class: "btn", text: "Duplicate" });
    var delBtn = h("button", { type: "button", class: "btn btn-danger", text: "Delete draft" });
    var rowA = h("div", { class: "row" }, [saveBtn, tplBtn]);
    if (c.id) { rowA.appendChild(dupBtn); rowA.appendChild(delBtn); }
    box.appendChild(rowA);

    function refreshProblems() {
      problemsBox.textContent = "";
      var problems = campaignProblems(c);
      if (problems.length) {
        var list = h("ul", { class: "reasons" });
        problems.forEach(function (p) { list.appendChild(h("li", { text: p })); });
        problemsBox.appendChild(h("div", { class: "notice error" }, [h("strong", { text: "This email cannot be saved yet." }), list]));
      }
      saveBtn.disabled = problems.length > 0;
      tplBtn.disabled = problems.length > 0;
    }

    saveBtn.addEventListener("click", function () {
      clearNotice();
      setBusy(saveBtn, true, "Saving");
      saveCampaign().then(function () {
        setBusy(saveBtn, false);
        drawLint();
        showNotice(lintBlocks(c.lint) ? "warn" : "good", lintBlocks(c.lint) ? "Saved, but the wording check found problems. Fix them before sending." : "Draft saved.");
        refreshSend();
      }).catch(function () { setBusy(saveBtn, false); });
    });
    tplBtn.addEventListener("click", function () {
      ask({ title: "Save as a template", body: "Keeps the subject and the blocks so you can start a new email from them.", inputLabel: "Template name", confirmLabel: "Save template" }).then(function (r) {
        if (!r.ok) return null;
        if (!r.value) { showNotice("error", "Give the template a name."); return null; }
        return guarded(call("save_template", { name: r.value, subject: c.subject.trim(), preheader: c.preheader.trim(), blocks: c.blocks.map(cleanBlock) }), "while saving the template").then(function () {
          showNotice("good", "Template saved.");
        });
      }).catch(function () {});
    });
    dupBtn.addEventListener("click", function () {
      leaveThen(function () {
        guarded(call("duplicate_campaign", { id: c.id }), "while duplicating").then(function (res) {
          state.campaign = campaignFromServer(res.campaign || {});
          showNotice("good", "A copy was made as a new draft.");
          renderShell();
        }).catch(function () {});
      });
    });
    delBtn.addEventListener("click", function () {
      ask({ title: "Delete this draft?", body: "It cannot be brought back.", confirmLabel: "Delete", danger: true }).then(function (r) {
        if (!r.ok) return null;
        return guarded(call("delete_campaign", { id: c.id }), "while deleting").then(function () {
          showNotice("good", "The draft was deleted.");
          state.campaign = null; state.campaignDirty = false; renderShell();
        });
      }).catch(function () {});
    });

    /* preview */
    box.appendChild(h("h2", { text: "Preview" }));
    box.appendChild(previewPanel({
      ab: true,
      onLint: function (lint) { c.lint = lint || c.lint; drawLint(); refreshSend(); },
      load: function (f) {
        return ensureSaved().then(function () {
          var p = { id: c.id, dark: f.dark, below_latest: f.below, variant: f.variant };
          if (f.firstName) p.first_name = f.firstName;
          return guarded(call("preview", p), "while preparing the preview");
        });
      }
    }));

    /* tests */
    box.appendChild(h("h2", { text: "Test it" }));
    box.appendChild(h("p", { class: "muted", text: "A test goes to your own address. It counts towards the daily limit. When two subjects are set, you get both." }));
    var testBelow = h("input", { type: "checkbox", id: "t-below" });
    box.appendChild(h("label", { class: "check", for: "t-below" }, [testBelow, "Send it as a member below the latest version would see it"]));
    var testBtn = h("button", { type: "button", class: "btn btn-primary", text: "Send a test to me" });
    var seedBtn = h("button", { type: "button", class: "btn", text: "Send to the seed list" });
    box.appendChild(h("div", { class: "row" }, [testBtn, seedBtn]));
    testBtn.addEventListener("click", function () {
      clearNotice();
      setBusy(testBtn, true, "Sending");
      ensureSaved().then(function () {
        return guarded(call("send_test", { id: c.id, below_latest: testBelow.checked }), "while sending the test");
      }).then(function () {
        setBusy(testBtn, false);
        drawLint();
        showNotice("good", "The test is on its way to you. Read it on your phone, then tick the list below.");
      }).catch(function () { setBusy(testBtn, false); });
    });
    seedBtn.addEventListener("click", function () {
      clearNotice();
      ask({ title: "Send to the seed list?", body: "The seed addresses are your own test inboxes, set in Settings. Each one gets a copy.", confirmLabel: "Send copies" }).then(function (r) {
        if (!r.ok) return null;
        setBusy(seedBtn, true, "Sending");
        return ensureSaved().then(function () {
          return guarded(call("send_seed", { id: c.id }), "while sending to the seed list");
        }).then(function () { showNotice("good", "Copies are on their way to the seed list."); });
      }).then(function () { setBusy(seedBtn, false); }, function () { setBusy(seedBtn, false); });
    });

    /* send */
    box.appendChild(h("h2", { text: "Send" }));
    var countBox = h("div", { "aria-live": "polite" });
    var countBtn = h("button", { type: "button", class: "btn", text: "Check the audience number" });
    var sendMsg = h("div", { "aria-live": "polite" });
    box.appendChild(countBox);
    box.appendChild(h("div", { class: "row" }, [countBtn]));
    box.appendChild(h("p", { class: "muted", text: "Tick each one once it is true. They clear if you change the email." }));
    var ticksBox = h("div", {});
    box.appendChild(ticksBox);
    var sendBtn = h("button", { type: "button", class: "btn btn-primary", text: "Send now" });
    var when = h("input", { id: "c-when", type: "datetime-local" });
    var schedBtn = h("button", { type: "button", class: "btn", text: "Schedule" });
    box.appendChild(h("div", { class: "row" }, [sendBtn]));
    box.appendChild(field("c-when", "Or choose a day and time (UK time)", when, "The email waits until then. Schedules are checked every five minutes."));
    box.appendChild(h("div", { class: "row" }, [schedBtn]));
    box.appendChild(sendMsg);

    function drawCount() { countBox.textContent = ""; countBox.appendChild(countView(c.count)); }
    function drawTicks() {
      ticksBox.textContent = "";
      ticksBox.appendChild(ticksView(c.ticks, refreshSend));
    }
    function refreshSend() {
      var reasons = [];
      if (!c.id || state.campaignDirty) reasons.push("Save the draft first.");
      if (campaignProblems(c).length) reasons.push("Fix the problems listed above.");
      if (lintBlocks(c.lint)) reasons.push("The wording check found problems.");
      if (!allTicked(c.ticks)) reasons.push("Tick all four items.");
      sendMsg.textContent = "";
      if (reasons.length) sendMsg.appendChild(h("p", { class: "small", text: "Send is switched off for now. " + reasons.join(" ") }));
      var off = reasons.length > 0;
      sendBtn.disabled = off;
      schedBtn.disabled = off || !when.value;
    }
    when.addEventListener("input", refreshSend);

    function fetchCount() {
      return guarded(call("campaign_count", { id: c.id }), "while counting the audience").then(function (res) {
        c.count = res.count || null;
        drawCount();
        return c.count;
      });
    }
    countBtn.addEventListener("click", function () {
      clearNotice();
      setBusy(countBtn, true, "Counting");
      ensureSaved().then(fetchCount).then(function () { setBusy(countBtn, false); refreshSend(); }).catch(function () { setBusy(countBtn, false); });
    });

    function audienceChanged(err) {
      if (err && err.code === "audience_changed") {
        showNotice("warn", "The number of people changed while you were checking. The number above is now up to date. Check it and try again.");
        fetchCount().catch(function () {});
        return true;
      }
      return false;
    }

    sendBtn.addEventListener("click", function () {
      clearNotice();
      setBusy(sendBtn, true, "Checking");
      var live = 0;
      ensureSaved().then(fetchCount).then(function (count) {
        live = num(count && count.will_receive);
        setBusy(sendBtn, false);
        if (!live) { showNotice("error", "Nobody would receive this email. Check the topic and the group."); return null; }
        var n = live;
        return ask({
          title: "Send to " + plural(live, "member", "members") + "?",
          body: "After you press Send there is a short undo window and you can cancel. Then the email goes out to " + plural(n, "member", "members") + (num(count.days_needed) > 1 ? ", spread over about " + num(count.days_needed) + " days because of the daily limit" : "") + ".",
          confirmLabel: "Send to " + plural(n, "member", "members")
        }).then(function (r) {
          if (!r.ok) return null;
          setBusy(sendBtn, true, "Sending");
          return call("send_campaign", { id: c.id, expected_recipients: live, checklist: checklistPayload() }).then(function (res) {
            c.status = "queued"; c.undo_until = res.undo_until;
            showNotice("good", "Queued for " + plural(num(res.recipients), "member", "members") + ". You can cancel until the undo window ends.");
            renderShell();
          }, function (err) {
            setBusy(sendBtn, false);
            if (!audienceChanged(err)) showNotice("error", friendly(err, "while sending"));
          });
        });
      }).catch(function () { setBusy(sendBtn, false); });
    });

    schedBtn.addEventListener("click", function () {
      clearNotice();
      var iso = londonInputToIso(when.value);
      if (!iso || Date.parse(iso) < Date.now() + 60000) { showNotice("error", "Choose a time in the future."); return; }
      setBusy(schedBtn, true, "Checking");
      ensureSaved().then(fetchCount).then(function (count) {
        setBusy(schedBtn, false);
        var live = num(count && count.will_receive);
        if (!live) { showNotice("error", "Nobody would receive this email. Check the topic and the group."); return null; }
        return ask({
          title: "Schedule for " + plural(live, "member", "members") + "?",
          body: "It will go out on " + formatDateTime(iso) + " UK time. You can cancel it any time before then.",
          confirmLabel: "Schedule"
        }).then(function (r) {
          if (!r.ok) return null;
          setBusy(schedBtn, true, "Scheduling");
          return call("schedule_campaign", { id: c.id, scheduled_at: iso, expected_recipients: live, checklist: checklistPayload() }).then(function (res) {
            c.status = "scheduled"; c.scheduled_at = res.scheduled_at;
            showNotice("good", "Scheduled for " + plural(num(res.recipients), "member", "members") + ".");
            renderShell();
          }, function (err) {
            setBusy(schedBtn, false);
            if (!audienceChanged(err)) showNotice("error", friendly(err, "while scheduling"));
          });
        });
      }).catch(function () { setBusy(schedBtn, false); });
    });

    drawCount();
    drawTicks();
    refreshProblems();
    refreshSend();
    if (c.id && !c.count) fetchCount().then(refreshSend).catch(function () {});
  }

  // An email that has left the draft stage: what happened, and what can still be done.
  function buildSentView(box, c) {
    var meta = [CAMPAIGN_STATUS[c.status] || c.status, TOPIC_LABEL[c.topic] || ""];
    if (c.recipient_count) meta.push(num(c.sent_count) + " of " + num(c.recipient_count) + " sent" + (num(c.failed_count) ? ", " + num(c.failed_count) + " failed" : ""));
    if (c.scheduled_at && c.status === "scheduled") meta.push("goes out " + formatDateTime(c.scheduled_at) + " UK time");
    if (c.finished_at) meta.push("finished " + formatDateTime(c.finished_at));
    box.appendChild(h("p", { class: "muted", text: meta.filter(Boolean).join(". ") }));
    if (c.paused_reason) box.appendChild(h("p", { class: "notice warn", text: "Paused: " + c.paused_reason }));

    function reload() { openCampaign(c.id); }
    var actions = h("div", { class: "row" });
    if (c.status === "queued") box.appendChild(undoPanel(c, function () { openCampaign(c.id); }));
    if (c.status === "scheduled") {
      actions.appendChild(h("button", { type: "button", class: "btn btn-danger", text: "Cancel the schedule", onclick: function () {
        guarded(call("cancel_campaign", { id: c.id }), "while cancelling").then(function () { showNotice("good", "Cancelled. The email is a draft again."); reload(); }).catch(function () {});
      } }));
    }
    if (c.status === "sending") {
      actions.appendChild(h("button", { type: "button", class: "btn", text: "Pause sending", onclick: function () {
        guarded(call("pause_campaign", { id: c.id }), "while pausing").then(function () { showNotice("good", "Sending is paused."); reload(); }).catch(function () {});
      } }));
    }
    if (c.status === "paused") {
      actions.appendChild(h("button", { type: "button", class: "btn btn-primary", text: "Resume sending", onclick: function () {
        function resume(confirm) {
          var p = { id: c.id };
          if (confirm) p.confirm_alarm = true;
          return call("resume_campaign", p).then(function () { showNotice("good", "Sending has resumed."); reload(); }, function (err) {
            if (err && err.code === "alarm_confirm_required" && !confirm) {
              return ask({ title: "Resume after a safety stop?", body: "This email was paused because bounces or complaints went above the safe level. Resume only if you have looked at why.", confirmLabel: "Resume anyway", danger: true }).then(function (r) { if (r.ok) return resume(true); return null; });
            }
            showNotice("error", friendly(err, "while resuming"));
            return null;
          });
        }
        resume(false);
      } }));
    }
    if (c.status === "sending" || c.status === "paused") {
      actions.appendChild(h("button", { type: "button", class: "btn btn-danger", text: "Stop for good", onclick: function () {
        ask({ title: "Stop this send for good?", body: "People who have not been emailed yet will not get it. This cannot be undone.", confirmLabel: "Stop", danger: true }).then(function (r) {
          if (!r.ok) return null;
          return guarded(call("cancel_campaign", { id: c.id }), "while stopping").then(function () { showNotice("good", "The send was stopped."); reload(); });
        }).catch(function () {});
      } }));
    }
    actions.appendChild(h("button", { type: "button", class: "btn", text: "Duplicate as a new draft", onclick: function () {
      guarded(call("duplicate_campaign", { id: c.id }), "while duplicating").then(function (res) {
        state.campaign = campaignFromServer(res.campaign || {});
        showNotice("good", "A copy was made as a new draft.");
        renderShell();
      }).catch(function () {});
    } }));
    box.appendChild(actions);

    if (c.status !== "queued" && c.status !== "scheduled") {
      box.appendChild(h("h2", { text: "Results" }));
      var statsBox = h("div", {}, [loadingBox()]);
      box.appendChild(statsBox);
      guarded(call("campaign_stats", { id: c.id }), "while loading the results").then(function (res) {
        statsBox.textContent = "";
        statsBox.appendChild(statsView(res.stats));
      }).catch(function () { statsBox.textContent = ""; statsBox.appendChild(retryButton(reload)); });
    }

    if (c.status === "sent" && c.kind !== "resend") buildResend(box, c);

    box.appendChild(h("h2", { text: "How it looked" }));
    box.appendChild(previewPanel({
      ab: !!c.ab_subject_b,
      load: function (f) {
        var p = { id: c.id, dark: f.dark, below_latest: f.below, variant: f.variant };
        if (f.firstName) p.first_name = f.firstName;
        return guarded(call("preview", p), "while preparing the preview");
      }
    }));
  }

  function buildResend(box, c) {
    box.appendChild(h("h2", { text: "Send again to people who did not open it" }));
    box.appendChild(h("p", { class: "muted", text: "Once only, after a wait, with a new subject. It goes to members who did not open this email and still receive the topic." }));
    var subj = h("input", { id: "rs-subject", type: "text", maxlength: "150", autocomplete: "off" });
    var days = h("input", { id: "rs-days", type: "number", min: "1", max: "14", inputmode: "numeric" });
    days.value = "3";
    box.appendChild(field("rs-subject", "New subject", subj));
    box.appendChild(field("rs-days", "Wait this many days (1 to 14)", days));
    var ticks = {};
    var btn = h("button", { type: "button", class: "btn btn-primary", text: "Schedule the resend" });
    function refresh() { btn.disabled = !allTicked(ticks) || !subj.value.trim(); }
    box.appendChild(ticksView(ticks, refresh));
    subj.addEventListener("input", refresh);
    box.appendChild(h("div", { class: "row" }, [btn]));
    refresh();
    btn.addEventListener("click", function () {
      clearNotice();
      if (EM_DASH.test(subj.value)) { showNotice("error", "The subject has an em dash. Use a comma, a full stop or a colon instead."); return; }
      setBusy(btn, true, "Scheduling");
      guarded(call("schedule_resend", { id: c.id, subject: subj.value.trim(), after_days: parseInt(days.value, 10) || 3, checklist: checklistPayload() }), "while scheduling the resend").then(function (res) {
        showNotice("good", "The resend is scheduled as its own email.");
        if (res.campaign && res.campaign.id) openCampaign(res.campaign.id); else setBusy(btn, false);
      }).catch(function () { setBusy(btn, false); });
    });
  }

  /* ---------- automations ---------- */

  // The keys the server accepts (v2.ts validParams, migrate_199): welcome_1..3
  // delay_days 0-30, win_back days 14 or 30, update_nudge after_days 1-90,
  // re_permission grace_days 7-60. Nothing else is saved.
  var PARAM_LABEL = {
    delay_days: "Days to wait after joining", days: "Days without opening the app (14 or 30)",
    after_days: "Days after a new version is out", grace_days: "Days to wait after the reminder"
  };
  var PARAM_RANGE = { delay_days: [0, 30], days: [14, 30], after_days: [1, 90], grace_days: [7, 60] };


  function automationFromServer(a) {
    var params = a.params && typeof a.params === "object" && !Array.isArray(a.params) ? JSON.parse(JSON.stringify(a.params)) : {};
    state.automationDirty = false;
    return {
      key: a.key, enabled: !!a.enabled, subject: a.subject || "", preheader: a.preheader || "", topic: a.topic || "product_news",
      blocks: Array.isArray(a.blocks) ? a.blocks.map(blockFromServer) : [], params: params, lint: a.lint || null, stats: a.stats_30d || null
    };
  }

  function renderAutomations(body) {
    if (state.automation) { renderAutomationEditor(body); return; }
    body.appendChild(h("h1", { text: "Automations" }));
    body.appendChild(h("p", { class: "muted", text: "Emails that send by themselves when something happens. Each one follows the same rules as any email: topic, opt-out, quiet hours, the weekly limit per member and the daily cap." }));
    var list = h("div", { "aria-live": "polite" }, [loadingBox()]);
    body.appendChild(list);
    guarded(call("list_automations", {}), "while loading automations").then(function (res) {
      list.textContent = "";
      var items = Array.isArray(res.automations) ? res.automations : [];
      if (!items.length) list.appendChild(h("p", { class: "muted", text: "No automatic emails are set up yet." }));
      items.forEach(function (a) {
        var s = a.stats_30d || {};
        var meta = [a.enabled ? "On" : "Off", num(s.sent) + " sent in 30 days"];
        if (a.lint && lintBlocks(a.lint)) meta.push("wording needs fixing");
        list.appendChild(h("button", { type: "button", class: "item", onclick: function () { state.automation = automationFromServer(a); renderShell(); } }, [
          h("div", { class: "t", text: AUTOMATION_NAME[a.key] || a.key }),
          h("div", { class: "m", text: meta.join(". ") })
        ]));
      });
      focusHeading();
    }).catch(function () { list.textContent = ""; list.appendChild(retryButton(renderShell)); });
  }

  function automationPayload(a) {
    var params = {};
    Object.keys(a.params).forEach(function (k) {
      var v = a.params[k];
      params[k] = typeof v === "number" ? v : v;
    });
    return {
      key: a.key, subject: a.subject.trim(), preheader: a.preheader.trim(),
      blocks: a.blocks.map(cleanBlock), topic: a.topic, params: params
    };
  }

  function automationProblems(a) {
    var problems = [];
    if (!a.subject.trim()) problems.push("Add a subject.");
    if (EM_DASH.test(a.subject)) problems.push("The subject has an em dash. Use a comma, a full stop or a colon instead.");
    if (EM_DASH.test(a.preheader)) problems.push("The preview line has an em dash. Use a comma, a full stop or a colon instead.");
    Object.keys(a.params || {}).forEach(function (k) {
      var r = PARAM_RANGE[k], v = a.params[k];
      if (!r || typeof v !== "number") return;
      var bad = v !== Math.floor(v) || v < r[0] || v > r[1] || (a.key === "win_back" && k === "days" && v !== 14 && v !== 30);
      if (bad) problems.push((PARAM_LABEL[k] || k) + " must be " + (a.key === "win_back" && k === "days" ? "14 or 30." : "a whole number from " + r[0] + " to " + r[1] + "."));
    });
    return problems.concat(blockProblems(a.blocks, a.key === "weekly_summary"));
  }

  function renderAutomationEditor(body) {
    var a = state.automation;
    body.appendChild(h("h1", { text: AUTOMATION_NAME[a.key] || a.key }));
    body.appendChild(backButton("Back to automations", function () { leaveThen(function () { clearNotice(); state.automation = null; state.automationDirty = false; renderShell(); }); }));

    var statusLine = h("p", {});
    function drawStatus() {
      statusLine.textContent = "";
      statusLine.appendChild(document.createTextNode("Status: "));
      statusLine.appendChild(h("span", { class: "chip" + (a.enabled ? " good" : ""), text: a.enabled ? "On" : "Off" }));
    }
    drawStatus();
    body.appendChild(statusLine);
    var toggle = h("button", { type: "button", class: "btn" + (a.enabled ? "" : " btn-primary"), text: a.enabled ? "Turn off" : "Turn on" });
    toggle.addEventListener("click", function () {
      clearNotice();
      var turningOn = !a.enabled;
      var go = turningOn
        ? (state.automationDirty ? Promise.resolve({ ok: false, unsaved: true }) : ask({ title: "Turn this on?", body: "It starts emailing members as soon as the next check runs (every five minutes), within the daily cap and quiet hours.", confirmLabel: "Turn on" }))
        : Promise.resolve({ ok: true });
      go.then(function (r) {
        if (r.unsaved) { showNotice("error", "Save your changes first, then turn it on."); return null; }
        if (!r.ok) return null;
        setBusy(toggle, true, "Working");
        return guarded(call("set_automation", { key: a.key, enabled: turningOn }), "while changing the automation").then(function (res) {
          a.enabled = !!(res.automation ? res.automation.enabled : turningOn);
          showNotice("good", a.enabled ? "Turned on." : "Turned off.");
          renderShell();
        });
      }).catch(function () { setBusy(toggle, false); });
    });
    body.appendChild(h("div", { class: "row" }, [toggle]));

    var subject = h("input", { id: "a-subject", type: "text", maxlength: "150", autocomplete: "off" });
    subject.value = a.subject;
    var pre = h("input", { id: "a-pre", type: "text", maxlength: "200", autocomplete: "off" });
    pre.value = a.preheader;
    function dirty() { state.automationDirty = true; refresh(); }
    subject.addEventListener("input", function () { a.subject = subject.value; dirty(); });
    pre.addEventListener("input", function () { a.preheader = pre.value; dirty(); });
    body.appendChild(field("a-subject", "Subject", subject));
    body.appendChild(field("a-pre", "Preview line", pre, "Optional."));

    var paramKeys = Object.keys(a.params).filter(function (k) { return typeof a.params[k] === "number" || typeof a.params[k] === "string"; });
    if (paramKeys.length) {
      body.appendChild(h("h2", { text: "When it sends" }));
      paramKeys.forEach(function (k) {
        var isNum = typeof a.params[k] === "number";
        var el = h("input", { id: "a-p-" + k, type: isNum ? "number" : "text", inputmode: isNum ? "numeric" : null, autocomplete: "off" });
        el.value = a.params[k];
        el.addEventListener("input", function () { a.params[k] = isNum ? (el.value === "" ? 0 : Number(el.value)) : el.value; dirty(); });
        body.appendChild(field("a-p-" + k, PARAM_LABEL[k] || k.replace(/_/g, " "), el));
      });
    }

    body.appendChild(h("h2", { text: "Content" }));
    if (a.key === "weekly_summary") {
      body.appendChild(h("p", { class: "muted", text: "The summary itself is built for each member each week: their workout count, sessions and streak. Never weights, food or body. Anything you add below goes after it." }));
    }
    body.appendChild(blockEditor(a.blocks, { onChange: dirty, allowSurvey: false, allowEmpty: a.key === "weekly_summary" }));

    var problemsBox = h("div", { "aria-live": "polite" });
    var lintBox = h("div", {});
    body.appendChild(problemsBox);
    body.appendChild(lintBox);
    function drawLint() { lintBox.textContent = ""; if (a.lint) lintBox.appendChild(lintView(a.lint)); }
    drawLint();
    var saveBtn = h("button", { type: "button", class: "btn btn-primary", text: "Save changes" });
    body.appendChild(h("div", { class: "row" }, [saveBtn]));
    function refresh() {
      problemsBox.textContent = "";
      var problems = automationProblems(a);
      if (problems.length) {
        var list = h("ul", { class: "reasons" });
        problems.forEach(function (p) { list.appendChild(h("li", { text: p })); });
        problemsBox.appendChild(h("div", { class: "notice error" }, [h("strong", { text: "This cannot be saved yet." }), list]));
      }
      saveBtn.disabled = problems.length > 0;
    }
    refresh();
    function save() {
      return guarded(call("save_automation", automationPayload(a)), "while saving").then(function (res) {
        if (res.automation) a.enabled = !!res.automation.enabled;
        a.lint = res.lint || null;
        state.automationDirty = false;
        drawLint();
        return res;
      });
    }
    saveBtn.addEventListener("click", function () {
      clearNotice();
      setBusy(saveBtn, true, "Saving");
      save().then(function () {
        setBusy(saveBtn, false);
        if (lintBlocks(a.lint) && !a.enabled) showNotice("warn", "Saved, and it stays off until the wording check passes.");
        else showNotice("good", "Saved.");
        renderShell();
      }).catch(function () { setBusy(saveBtn, false); });
    });

    body.appendChild(h("h2", { text: "Preview and test" }));
    var sample = h("input", { type: "checkbox", id: "a-sample" });
    sample.checked = true;
    body.appendChild(h("label", { class: "check", for: "a-sample" }, [sample, "Use sample numbers (for the weekly summary and anniversary)"]));
    body.appendChild(previewPanel({
      load: function (f) {
        var p = { key: a.key, sample: sample.checked, dark: f.dark, below_latest: f.below };
        if (f.firstName) p.first_name = f.firstName;
        var go = state.automationDirty ? save() : Promise.resolve();
        return go.then(function () { return guarded(call("preview_automation", p), "while preparing the preview"); });
      }
    }));
    var testBtn = h("button", { type: "button", class: "btn btn-primary", text: "Send a test to me" });
    testBtn.addEventListener("click", function () {
      clearNotice();
      setBusy(testBtn, true, "Sending");
      var go = state.automationDirty ? save() : Promise.resolve();
      go.then(function () { return guarded(call("test_automation", { key: a.key, sample: sample.checked }), "while sending the test"); }).then(function () {
        setBusy(testBtn, false);
        showNotice("good", "The test is on its way to you.");
      }).catch(function () { setBusy(testBtn, false); });
    });
    body.appendChild(h("div", { class: "row" }, [testBtn]));

    body.appendChild(h("h2", { text: "Results" }));
    var days = selectOf("a-days", [["7", "Last 7 days"], ["30", "Last 30 days"], ["90", "Last 90 days"]], "30");
    var statsBox = h("div", {});
    body.appendChild(field("a-days", "Period", days));
    body.appendChild(statsBox);
    function loadStats() {
      statsBox.textContent = "";
      statsBox.appendChild(loadingBox());
      guarded(call("automation_stats", { key: a.key, days: parseInt(days.value, 10) }), "while loading the results").then(function (res) {
        statsBox.textContent = "";
        statsBox.appendChild(statsView(res.stats));
      }).catch(function () { statsBox.textContent = ""; statsBox.appendChild(retryButton(loadStats)); });
    }
    days.addEventListener("change", loadStats);
    loadStats();
    focusHeading();
  }

  /* ---------- surveys ---------- */

  var SURVEY_STATUS = { draft: "Draft", open: "Open", closed: "Closed" };
  var TYPE_LABEL = { single: "One answer", multi: "Several answers", text: "Written answer", nps: "Score from 0 to 10", rating: "Rating from 1 to 5" };

  function hasOptions(type) { return type === "single" || type === "multi"; }

  function newSurvey() {
    return { id: null, title: "", intro: "", status: "draft", closes_at: "", anonymous: false, questions: [blankQuestion([])] };
  }

  function blankQuestion(existing) {
    var n = 1;
    var used = {};
    existing.forEach(function (q) { used[q.id] = true; });
    while (used["q" + n]) n++;
    return { id: "q" + n, type: "single", prompt: "", optionsText: "", required: false };
  }

  function surveyFromServer(s) {
    return {
      id: s.id, title: s.title || "", intro: s.intro || "", status: s.status || "draft",
      closes_at: isoToLondonInput(s.closes_at), anonymous: !!s.anonymous,
      questions: (Array.isArray(s.questions) ? s.questions : []).map(function (q) {
        return { id: q.id, type: q.type, prompt: q.prompt || "", optionsText: (q.options || []).join("\n"), required: !!q.required };
      })
    };
  }

  function surveyItem(s) {
    var count = Number(pick(s, ["response_count", "responses", "answer_count", "total_responses"], 0)) || 0;
    var meta = [SURVEY_STATUS[s.status] || s.status, plural(count, "answer", "answers")];
    if (s.anonymous) meta.push("anonymous");
    if (s.closes_at) meta.push("closes " + formatDateTime(s.closes_at));
    if (s.created_at) meta.push(formatDate(s.created_at));
    return h("button", {
      type: "button", class: "item",
      onclick: function () { state.survey = surveyFromServer(s); state.results = null; renderShell(); }
    }, [h("div", { class: "t", text: s.title || "Untitled survey" }), h("div", { class: "m", text: meta.join(". ") })]);
  }

  function renderSurveys(body) {
    if (state.survey) { renderSurveyEditor(body); return; }
    body.appendChild(h("h1", { text: "Surveys" }));
    body.appendChild(h("div", { class: "row" }, [
      h("button", { type: "button", class: "btn btn-primary", text: "New survey", onclick: function () { state.survey = newSurvey(); renderShell(); } })
    ]));
    var list = h("div", { "aria-live": "polite" }, [h("p", { class: "muted", text: "Loading." })]);
    body.appendChild(list);
    loadOverview().then(function () {
      list.textContent = "";
      var items = surveysList();
      if (!items.length) list.appendChild(h("p", { class: "muted", text: "No surveys yet. Press New survey to make one." }));
      items.forEach(function (s) { list.appendChild(surveyItem(s)); });
      focusHeading();
    }, function () {
      list.textContent = "";
      list.appendChild(h("button", { type: "button", class: "btn", text: "Try again", onclick: renderShell }));
    });
  }

  function parseOptions(text) {
    var seen = {};
    var out = [];
    String(text || "").split("\n").forEach(function (line) {
      var t = line.trim();
      if (t && !seen[t]) { seen[t] = true; out.push(t); }
    });
    return out;
  }

  function surveyProblems(s) {
    var problems = [];
    function dash(label, text) { if (text && EM_DASH.test(text)) problems.push("The " + label + " has an em dash. Use a comma, a full stop or a colon instead."); }
    if (!s.title.trim()) problems.push("Add a title.");
    else if (s.title.length > 120) problems.push("The title is longer than 120 characters.");
    if (s.intro.length > 1000) problems.push("The introduction is longer than 1,000 characters.");
    dash("title", s.title);
    dash("introduction", s.intro);
    if (s.questions.length < 1) problems.push("Add at least one question.");
    if (s.questions.length > 20) problems.push("A survey can have at most 20 questions.");
    s.questions.forEach(function (q, i) {
      var n = "Question " + (i + 1);
      if (!q.prompt.trim()) problems.push(n + " needs its wording.");
      else if (q.prompt.length > 300) problems.push(n + " is longer than 300 characters.");
      dash(n.toLowerCase(), q.prompt);
      if (hasOptions(q.type)) {
        var opts = parseOptions(q.optionsText);
        if (opts.length < 1) problems.push(n + " needs at least one option, one per line.");
        if (opts.length > 10) problems.push(n + " can have at most 10 options.");
        opts.forEach(function (o) {
          if (o.length > 120) problems.push(n + " has an option longer than 120 characters.");
          dash(n.toLowerCase() + " option", o);
        });
      }
    });
    return problems;
  }

  function surveyPayload(s) {
    var p = {
      title: s.title.trim(), intro: s.intro.trim(),
      questions: s.questions.map(function (q) {
        var out = { id: q.id, type: q.type, prompt: q.prompt.trim(), required: !!q.required };
        if (hasOptions(q.type)) out.options = parseOptions(q.optionsText);
        return out;
      })
    };
    if (s.id) p.id = s.id;
    return p;
  }

  function renderSurveyEditor(body) {
    var s = state.survey;
    var editable = s.status === "draft";
    if (state.results && state.results.surveyId === s.id) { renderResults(body); return; }

    body.appendChild(h("h1", { text: s.id ? (editable ? "Edit survey" : s.title || "Survey") : "New survey" }));
    body.appendChild(h("div", { class: "row" }, [
      h("button", { type: "button", class: "btn", text: "Back to surveys", onclick: function () { state.survey = null; renderShell(); } })
    ]));
    if (s.id) {
      body.appendChild(h("p", { class: "muted" }, ["Status: ", h("span", { class: "chip" + (s.status === "open" ? " good" : ""), text: SURVEY_STATUS[s.status] || s.status })]));
      if (!editable) body.appendChild(h("p", { class: "small", text: "Questions can only change while a survey is a draft, so the answers always match the questions." }));
    }

    var title = h("input", { id: "s-title", type: "text", maxlength: "200", autocomplete: "off" });
    title.value = s.title;
    var intro = h("textarea", { id: "s-intro", rows: "3", maxlength: "1500" });
    intro.value = s.intro;
    if (!editable) { title.disabled = true; intro.disabled = true; }
    title.addEventListener("input", function () { s.title = title.value; refresh(); });
    intro.addEventListener("input", function () { s.intro = intro.value; refresh(); });
    body.appendChild(h("label", { class: "field", for: "s-title", text: "Title" }));
    body.appendChild(title);
    body.appendChild(h("label", { class: "field", for: "s-intro" }, ["Introduction", h("span", { class: "hint", text: "Optional. A sentence or two before the questions." })]));
    body.appendChild(intro);

    body.appendChild(h("h2", { text: "Questions" }));
    var qbox = h("div", {});
    body.appendChild(qbox);

    function drawQuestions() {
      qbox.textContent = "";
      s.questions.forEach(function (q, i) {
        var card = h("div", { class: "qcard" });
        card.appendChild(h("div", { class: "qhead", text: "Question " + (i + 1) }));
        var prompt = h("textarea", { id: "q-" + i + "-prompt", rows: "2", maxlength: "500" });
        prompt.value = q.prompt;
        var type = h("select", { id: "q-" + i + "-type" });
        Object.keys(TYPE_LABEL).forEach(function (k) {
          var o = h("option", { value: k, text: TYPE_LABEL[k] });
          if (k === q.type) o.selected = true;
          type.appendChild(o);
        });
        var opts = h("textarea", { id: "q-" + i + "-opts", rows: "4", maxlength: "1500" });
        opts.value = q.optionsText;
        var optsWrap = h("div", {}, [
          h("label", { class: "field", for: "q-" + i + "-opts" }, ["Options", h("span", { class: "hint", text: "One option per line. Between 1 and 10." })]),
          opts
        ]);
        if (!hasOptions(q.type)) optsWrap.classList.add("hidden");
        var req = h("input", { type: "checkbox", id: "q-" + i + "-req" });
        req.checked = !!q.required;
        if (!editable) { prompt.disabled = true; type.disabled = true; opts.disabled = true; req.disabled = true; }
        prompt.addEventListener("input", function () { q.prompt = prompt.value; refresh(); });
        opts.addEventListener("input", function () { q.optionsText = opts.value; refresh(); });
        req.addEventListener("change", function () { q.required = req.checked; });
        type.addEventListener("change", function () {
          q.type = type.value;
          if (!hasOptions(q.type)) optsWrap.classList.add("hidden"); else optsWrap.classList.remove("hidden");
          refresh();
        });
        card.appendChild(h("label", { class: "field", for: "q-" + i + "-prompt", text: "Wording" }));
        card.appendChild(prompt);
        card.appendChild(h("label", { class: "field", for: "q-" + i + "-type", text: "Type of answer" }));
        card.appendChild(type);
        card.appendChild(optsWrap);
        card.appendChild(h("label", { class: "check", for: "q-" + i + "-req" }, [req, "Must be answered"]));
        if (editable) {
          var up = h("button", { type: "button", class: "btn", text: "Move up", onclick: function () { move(i, -1); } });
          var down = h("button", { type: "button", class: "btn", text: "Move down", onclick: function () { move(i, 1); } });
          var rm = h("button", { type: "button", class: "btn btn-danger", text: "Remove", onclick: function () { s.questions.splice(i, 1); drawQuestions(); refresh(); } });
          if (i === 0) up.disabled = true;
          if (i === s.questions.length - 1) down.disabled = true;
          card.appendChild(h("div", { class: "row" }, [up, down, rm]));
        }
        qbox.appendChild(card);
      });
    }
    function move(i, delta) {
      var j = i + delta;
      if (j < 0 || j >= s.questions.length) return;
      var t = s.questions[i]; s.questions[i] = s.questions[j]; s.questions[j] = t;
      drawQuestions();
      refresh();
    }
    drawQuestions();

    var addBtn = h("button", { type: "button", class: "btn", text: "Add a question", onclick: function () {
      s.questions.push(blankQuestion(s.questions)); drawQuestions(); refresh();
      var last = document.getElementById("q-" + (s.questions.length - 1) + "-prompt");
      if (last) last.focus();
    } });
    if (editable) body.appendChild(h("div", { class: "row" }, [addBtn]));

    body.appendChild(h("h2", { text: "Options" }));
    var closes = h("input", { id: "s-closes", type: "datetime-local" });
    closes.value = s.closes_at || "";
    closes.addEventListener("input", function () { s.closes_at = closes.value; });
    var anonBox = h("input", { type: "checkbox", id: "s-anonBox" });
    anonBox.checked = !!s.anonymous;
    anonBox.addEventListener("change", function () { s.anonymous = anonBox.checked; });
    body.appendChild(field("s-closes", "Closes on (UK time)", closes, "Optional. After this the survey stops taking answers by itself. Clear it to keep the survey open."));
    body.appendChild(h("label", { class: "check", for: "s-anonBox" }, [anonBox, "Anonymous: answers are never tied to a member, even from an email link"]));
    var optBtn = h("button", { type: "button", class: "btn", text: "Save options" });
    if (s.id && !editable) body.appendChild(h("div", { class: "row" }, [optBtn]));
    function saveOptions(id) {
      return guarded(call("set_survey_options", { id: id, closes_at: s.closes_at ? londonInputToIso(s.closes_at) : null, anonymous: !!s.anonymous }), "while saving the options");
    }
    optBtn.addEventListener("click", function () {
      clearNotice();
      setBusy(optBtn, true, "Saving");
      saveOptions(s.id).then(function () { showNotice("good", "Options saved."); return loadOverview(); }).then(function () { renderShell(); }).catch(function () { setBusy(optBtn, false); });
    });

    var problemsBox = h("div", { "aria-live": "polite" });
    body.appendChild(problemsBox);
    var saveBtn = h("button", { type: "button", class: "btn btn-primary", text: "Save survey" });
    if (editable) body.appendChild(h("div", { class: "row" }, [saveBtn]));

    function refresh() {
      problemsBox.textContent = "";
      if (!editable) return;
      var problems = surveyProblems(s);
      if (problems.length) {
        var list = h("ul", { class: "reasons" });
        problems.forEach(function (p) { list.appendChild(h("li", { text: p })); });
        problemsBox.appendChild(h("div", { class: "notice error" }, [h("strong", { text: "This survey cannot be saved yet." }), list]));
      }
      saveBtn.disabled = problems.length > 0;
    }
    refresh();

    saveBtn.addEventListener("click", function () {
      clearNotice();
      setBusy(saveBtn, true, "Saving");
      guarded(call("save_survey", surveyPayload(s)), "while saving").then(function (data) {
        var saved = pick(data, ["survey"], data) || {};
        if (saved.id) s.id = saved.id;
        return s.id && (s.closes_at || s.anonymous || saved.closes_at || saved.anonymous) ? saveOptions(s.id) : null;
      }).then(function () {
        showNotice("good", "Survey saved.");
        return loadOverview();
      }).then(function () { renderShell(); }).catch(function () { setBusy(saveBtn, false); });
    });

    if (s.id) {
      body.appendChild(h("h2", { text: "Open or close" }));
      var statusRow = h("div", { class: "row" });
      function statusButton(label, status, primary) {
        var b = h("button", { type: "button", class: "btn" + (primary ? " btn-primary" : ""), text: label });
        b.addEventListener("click", function () {
          clearNotice();
          var go = status === "open"
            ? ask({ title: "Open this survey?", body: "Anyone with the link can answer it, and a survey button in an email will work.", confirmLabel: "Open survey" })
            : Promise.resolve({ ok: true });
          go.then(function (r) {
            if (!r.ok) return null;
            setBusy(b, true, "Working");
            return guarded(call("set_survey_status", { id: s.id, status: status }), "while changing the survey").then(function () {
              s.status = status;
              showNotice("good", status === "open" ? "The survey is open." : "The survey is closed.");
              return loadOverview();
            }).then(function () { renderShell(); });
          }).catch(function () { setBusy(b, false); });
        });
        return b;
      }
      if (s.status === "draft") statusRow.appendChild(statusButton("Open survey", "open", true));
      if (s.status === "open") statusRow.appendChild(statusButton("Close survey", "closed", false));
      if (s.status === "closed") statusRow.appendChild(statusButton("Open again", "open", true));
      statusRow.appendChild(h("button", { type: "button", class: "btn", text: "Results", onclick: function () { loadResults(s); } }));
      body.appendChild(statusRow);
      if (s.status === "open") {
        var link = "https://volyume.app/survey/?id=" + encodeURIComponent(s.id);
        body.appendChild(h("p", { class: "small", text: "Link anyone can use. Answers from this link are not tied to a member:" }));
        body.appendChild(h("p", { class: "card", text: link }));
        body.appendChild(h("div", { class: "row" }, [h("button", { type: "button", class: "btn", text: "Copy link", onclick: function (e) { copyText(link, e.currentTarget); } })]));
      }
    }
    focusHeading();
  }

  function copyText(text, button) {
    function done(ok) { showNotice(ok ? "good" : "error", ok ? "Link copied." : "Could not copy. Press and hold the link to copy it."); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
    } else {
      done(false);
    }
    if (button) button.blur();
  }

  function loadResults(s) {
    clearNotice();
    guarded(call("survey_results", { id: s.id }), "while loading the results").then(function (data) {
      state.results = { surveyId: s.id, data: data || {} };
      renderShell();
    }).catch(function () {});
  }

  function normaliseCounts(q) {
    var raw = pick(q, ["counts", "options", "tally"], null);
    var out = [];
    if (Array.isArray(raw)) {
      raw.forEach(function (r) {
        out.push({ label: String(pick(r, ["option", "label", "value", "name"], "")), count: Number(pick(r, ["count", "n", "total"], 0)) || 0 });
      });
    } else if (raw && typeof raw === "object") {
      Object.keys(raw).forEach(function (k) { out.push({ label: k, count: Number(raw[k]) || 0 }); });
    }
    return out;
  }

  function renderResults(body) {
    var s = state.survey;
    var data = state.results.data;
    var total = Number(pick(data, ["total", "total_responses", "responses"], 0)) || 0;
    body.appendChild(h("h1", { text: "Results" }));
    body.appendChild(h("div", { class: "row" }, [
      h("button", { type: "button", class: "btn", text: "Back to survey", onclick: function () { state.results = null; renderShell(); } })
    ]));
    body.appendChild(h("p", { class: "muted", text: (s.title || "Survey") + ": " + plural(total, "answer", "answers") + "." }));

    var qs = pick(data, ["questions", "results", "per_question"], []) || [];
    qs.forEach(function (q, i) {
      var meta = s.questions.filter(function (m) { return m.id === q.id; })[0] || {};
      var type = q.type || meta.type;
      var card = h("div", { class: "qcard" });
      card.appendChild(h("div", { class: "qhead", text: "Question " + (i + 1) }));
      card.appendChild(h("p", { text: q.prompt || meta.prompt || "" }));
      if (type === "text") {
        var answers = pick(q, ["answers", "texts", "text_answers"], []) || [];
        if (!answers.length) card.appendChild(h("p", { class: "muted", text: "No written answers yet." }));
        answers.forEach(function (a) {
          card.appendChild(h("div", { class: "answer", text: typeof a === "string" ? a : String(pick(a, ["text", "answer", "value"], "")) }));
        });
      } else {
        var counts = normaliseCounts(q);
        var sum = counts.reduce(function (acc, c) { return acc + c.count; }, 0);
        var denominator = total || sum || 1;
        if (typeof q.nps === "number") card.appendChild(h("p", { class: "qhead", text: "Net Promoter Score: " + q.nps }));
        if (typeof q.average === "number") card.appendChild(h("p", { class: "qhead", text: "Average rating: " + q.average.toFixed(1) + " out of 5" }));
        counts.forEach(function (c) {
          var pct = Math.round((c.count / denominator) * 100);
          card.appendChild(h("div", { text: c.label + ": " + c.count + " (" + pct + "%)" }));
          var bar = h("div", { class: "bar", role: "img", "aria-label": c.label + " " + pct + " per cent" }, [h("span", { style: "width:" + Math.min(100, pct) + "%" })]);
          card.appendChild(bar);
        });
        if (!counts.length) card.appendChild(h("p", { class: "muted", text: "No answers yet." }));
      }
      body.appendChild(card);
    });
    if (!qs.length) body.appendChild(h("p", { class: "muted", text: "No answers yet." }));

    var dl = h("button", { type: "button", class: "btn btn-primary", text: "Download CSV" });
    dl.addEventListener("click", function () {
      clearNotice();
      setBusy(dl, true, "Preparing");
      guarded(call("export_survey", { id: s.id }), "while preparing the file").then(function (res) {
        setBusy(dl, false);
        var csv = typeof res === "string" ? res : String(pick(res, ["csv", "text", "data"], ""));
        download(res && res.filename ? res.filename : "volyume-survey-" + (s.title || "answers").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") + ".csv", csv);
      }).catch(function () { setBusy(dl, false); });
    });
    body.appendChild(h("div", { class: "row" }, [dl]));
    focusHeading();
  }

  /* ---------- people, groups and exclusions ---------- */

  function renderPeople(body) {
    if (state.member) { renderMemberPage(body); return; }
    if (state.segmentEdit) { renderSegmentEditor(body); return; }
    body.appendChild(h("h1", { text: "People" }));
    body.appendChild(h("p", { class: "muted", text: "Find a member by email address, open their page, or exclude test accounts and anyone else you do not want to email." }));

    var searchInput = h("input", { type: "search", id: "people-search", value: state.people.query, autocomplete: "off", inputmode: "email" });
    var searchForm = h("form", { role: "search" }, [
      h("label", { class: "field", for: "people-search", text: "Search by email" }),
      searchInput,
      h("div", { class: "row" }, [h("button", { type: "submit", class: "btn btn-primary", text: "Search" })])
    ]);
    searchForm.addEventListener("submit", function (e) {
      e.preventDefault();
      state.people.query = searchInput.value.trim();
      state.people.offset = 0;
      loadPeople();
    });
    body.appendChild(searchForm);

    var statusSel = selectOf("pf-status", [["", "Everyone shown"], ["receives", "Receives emails"], ["excluded", "Excluded by you"], ["turned_off", "Turned off"], ["paused", "Paused"], ["unconfirmed", "Email not confirmed"]], state.people.status);
    var platSel = selectOf("pf-plat", [["", "Any device"], ["ios", "iPhone"], ["android", "Android"], ["other", "Other"]], state.people.platform);
    var useSel = selectOf("pf-use", [["", "Any last used day"], ["30", "Not used in 30 days"], ["14", "Not used in 14 days"], ["never", "Never seen"]], state.people.use || "");
    var wkSel = selectOf("pf-wk", [["", "Any number of workouts"], ["none", "No workouts in 30 days"], ["some", "Some workouts in 30 days"]], state.people.workouts || "");
    function setFilters() {
      state.people.status = statusSel.value; state.people.platform = platSel.value;
      state.people.use = useSel.value; state.people.workouts = wkSel.value;
      drawPeople();
    }
    [statusSel, platSel, useSel, wkSel].forEach(function (s) { s.addEventListener("change", setFilters); });
    body.appendChild(h("details", { open: !!(state.people.status || state.people.platform || state.people.use || state.people.workouts) }, [
      h("summary", { text: "Filters" }),
      h("div", { class: "grid2" }, [
        field("pf-status", "Status", statusSel), field("pf-plat", "Device", platSel),
        field("pf-use", "Last used", useSel), field("pf-wk", "Workouts", wkSel)
      ]),
      h("p", { class: "small", text: "Filters apply to the people shown on this page. To count a whole group, make a group below." })
    ]));

    body.appendChild(h("div", { id: "people-list", "aria-live": "polite" }));

    body.appendChild(h("h2", { text: "Groups" }));
    body.appendChild(h("p", { class: "muted", text: "A group is a saved set of rules, such as members on an older app version. Pick one when you write an email." }));
    body.appendChild(h("div", { id: "segment-list", "aria-live": "polite" }));
    body.appendChild(h("div", { class: "row" }, [h("button", { type: "button", class: "btn", text: "Make a group", onclick: function () { state.segmentEdit = { id: null, name: "", rules: [] }; renderShell(); } })]));

    body.appendChild(h("h2", { text: "Exclude an email address" }));
    body.appendChild(h("p", { class: "muted", text: "This works even if no account has that address yet." }));
    var exEmail = h("input", { type: "email", id: "ex-email", autocomplete: "off", inputmode: "email" });
    var exNote = h("input", { type: "text", id: "ex-note", maxlength: "120", autocomplete: "off" });
    var exBtn = h("button", { type: "submit", class: "btn btn-primary", text: "Exclude this address" });
    var exForm = h("form", { novalidate: true }, [
      h("label", { class: "field", for: "ex-email", text: "Email address" }), exEmail,
      h("label", { class: "field", for: "ex-note" }, ["Note", h("span", { class: "hint", text: "Optional, for example Test account." })]), exNote,
      h("div", { class: "row" }, [exBtn])
    ]);
    exForm.addEventListener("submit", function (e) {
      e.preventDefault();
      clearNotice();
      var email = exEmail.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showNotice("error", "Enter a full email address, for example name@example.com.");
        exEmail.focus();
        return;
      }
      setBusy(exBtn, true, "Saving");
      var payload = { email: email };
      if (exNote.value.trim()) payload.note = exNote.value.trim();
      guarded(call("exclude", payload), "while excluding that address").then(function () {
        showNotice("good", email + " is excluded. It will not get news emails.");
        exEmail.value = "";
        exNote.value = "";
        setBusy(exBtn, false);
        return loadExclusions();
      }).then(function () {
        drawExclusions();
        loadPeople();
      }).catch(function () { setBusy(exBtn, false); });
    });
    body.appendChild(exForm);

    body.appendChild(h("h2", { text: "Excluded" }));
    body.appendChild(h("div", { id: "excluded-list", "aria-live": "polite" }));

    loadExclusions().then(function () { drawExclusions(); }, function () {});
    loadSegments().then(drawSegments, function () {});
    loadPeople();
    focusHeading();
  }

  function loadPeople() {
    var box = document.getElementById("people-list");
    if (!box) return;
    box.textContent = "";
    box.appendChild(loadingBox());
    var payload = { offset: state.people.offset, limit: PAGE_SIZE };
    if (state.people.query) payload.query = state.people.query;
    guarded(call("list_members", payload), "while loading members").then(function (data) {
      state.people.total = num(pick(data, ["total"], 0));
      state.people.members = pick(data, ["members"], []) || [];
      return state.exclusions ? null : loadExclusions();
    }).then(drawPeople, function () {
      if (box.parentNode) { box.textContent = ""; box.appendChild(retryButton(loadPeople)); }
    });
  }

  function personMatches(m) {
    var f = state.people;
    if (f.status && m.status !== f.status) return false;
    if (f.platform && (m.platform || "other") !== f.platform) return false;
    if (f.use) {
      if (f.use === "never") { if (m.last_seen_day) return false; }
      else {
        var t = m.last_seen_day ? Date.parse(m.last_seen_day) : NaN;
        var limit = Date.now() - parseInt(f.use, 10) * 86400000;
        if (!isNaN(t) && t >= limit) return false;
      }
    }
    if (f.workouts === "none" && num(m.workouts_30d) > 0) return false;
    if (f.workouts === "some" && num(m.workouts_30d) === 0) return false;
    return true;
  }

  function drawPeople() {
    var box = document.getElementById("people-list");
    if (!box) return;
    box.textContent = "";
    var p = state.people;
    if (!p.members.length) {
      box.appendChild(h("p", { class: "muted", text: p.query ? "Nobody matches that search." : "There are no members to show." }));
      return;
    }
    var shown = p.members.filter(personMatches);
    var from = p.offset + 1;
    var to = p.offset + p.members.length;
    box.appendChild(h("p", { class: "small", text: "Showing " + from + " to " + to + " of " + p.total + (shown.length !== p.members.length ? ". " + shown.length + " match the filters." : "") }));
    var card = h("div", { class: "card" });
    if (!shown.length) card.appendChild(h("p", { class: "muted", text: "Nobody on this page matches the filters." }));
    shown.forEach(function (m) {
      var status = STATUS_LABEL[m.status] || "Unknown";
      var chipClass = "chip" + (m.status === "receives" ? " good" : (m.status === "excluded" ? " warn" : ""));
      var action;
      if (m.status === "excluded") {
        action = h("button", { type: "button", class: "btn", text: "Include", "aria-label": "Include " + m.email });
        action.addEventListener("click", function () {
          var id = exclusionFor(m);
          if (!id) { showNotice("error", "Could not find that exclusion. Reload the page and try again."); return; }
          includeExclusion(id, m.email, action);
        });
      } else {
        action = h("button", { type: "button", class: "btn", text: "Exclude", "aria-label": "Exclude " + m.email });
        action.addEventListener("click", function () { excludeMember(m, action); });
      }
      var open = h("button", { type: "button", class: "btn", text: "Open", "aria-label": "Open the page for " + m.email, onclick: function () { openMember(m.user_id); } });
      card.appendChild(h("div", { class: "person" }, [
        h("div", { class: "em", text: m.email || "No email address" }),
        h("div", { class: "small", text: m.created_at ? "Joined " + formatDate(m.created_at) : "" }),
        h("div", { class: "small", text: lastUsedText(m) }),
        versionText(m) ? h("div", { class: "small", text: versionText(m) }) : null,
        workoutsText(m) ? h("div", { class: "small", text: workoutsText(m) }) : null,
        h("div", {}, [h("span", { class: chipClass, text: status })]),
        m.status === "paused" ? h("div", { class: "small", text: "Volyume holds emails for this person for now." }) : null,
        h("div", { class: "row" }, [open, action])
      ]));
    });
    box.appendChild(card);
    var prev = h("button", { type: "button", class: "btn", text: "Previous 50", onclick: function () { state.people.offset = Math.max(0, p.offset - PAGE_SIZE); loadPeople(); } });
    var next = h("button", { type: "button", class: "btn", text: "Next 50", onclick: function () { state.people.offset = p.offset + PAGE_SIZE; loadPeople(); } });
    if (p.offset <= 0) prev.disabled = true;
    if (p.offset + PAGE_SIZE >= p.total) next.disabled = true;
    box.appendChild(h("div", { class: "pager" }, [prev, next]));
  }

  function excludeMember(m, button) {
    clearNotice();
    ask({
      title: "Exclude " + m.email + "?",
      body: "They will not get news emails from Volyume. You can include them again at any time.",
      inputLabel: "Note (optional, for example Test account)",
      confirmLabel: "Exclude"
    }).then(function (r) {
      if (!r.ok) return null;
      setBusy(button, true, "Working");
      var payload = {};
      if (m.user_id) payload.user_id = m.user_id; else payload.email = m.email;
      if (r.value) payload.note = r.value;
      return guarded(call("exclude", payload), "while excluding that person").then(function () {
        showNotice("good", m.email + " is excluded.");
        return loadExclusions();
      }).then(function () { drawExclusions(); if (state.member) openMember(m.user_id); else loadPeople(); });
    }).catch(function () { setBusy(button, false); });
  }

  /* ---------- the member page ---------- */

  function openMember(userId) {
    clearNotice();
    guarded(call("member_detail", { user_id: userId }), "while opening the member").then(function (res) {
      state.member = res.member || {};
      return state.exclusions ? null : loadExclusions();
    }).then(function () { renderShell(); }).catch(function () {});
  }

  function renderMemberPage(body) {
    var m = state.member;
    body.appendChild(h("h1", { text: m.email || "Member" }));
    body.appendChild(backButton("Back to people", function () { state.member = null; renderShell(); }));
    var status = STATUS_LABEL[m.status] || "Unknown";
    body.appendChild(h("p", {}, [h("span", { class: "chip" + (m.status === "receives" ? " good" : (m.status === "excluded" ? " warn" : "")), text: status })]));
    if (m.status === "paused") body.appendChild(h("p", { class: "small", text: "Volyume holds emails for this person for now." }));
    var rows = [];
    if (m.created_at) rows.push("Joined " + formatDate(m.created_at));
    rows.push(lastUsedText(m));
    if (versionText(m)) rows.push(versionText(m));
    if (workoutsText(m)) rows.push(workoutsText(m));
    rows.push(m.community ? "Takes part in Community" : "Not in Community");
    var card = h("div", { class: "card" });
    rows.forEach(function (r) { card.appendChild(h("div", { text: r })); });
    body.appendChild(card);

    var prefs = m.preferences || {};
    var topics = prefs.topics && typeof prefs.topics === "object" ? prefs.topics : null;
    if (topics || prefs.subscribed !== undefined) {
      var tcard = h("div", { class: "card" }, [h("h3", { text: "Email choices" })]);
      if (prefs.subscribed !== undefined) tcard.appendChild(h("div", { text: prefs.subscribed ? "News email is on." : "News email is off." }));
      if (topics) Object.keys(TOPIC_LABEL).forEach(function (k) {
        if (topics[k] !== undefined) tcard.appendChild(h("div", { class: "small", text: TOPIC_LABEL[k] + ": " + (topics[k] ? "on" : "off") }));
      });
      body.appendChild(tcard);
    }
    if (m.suppression && m.suppression.since) body.appendChild(h("p", { class: "notice warn", text: "Email to this address has been stopped since " + formatDate(m.suppression.since) + " (a bounce or a complaint)." }));
    if (m.sunset && (m.sunset.re_permission_at || m.sunset.sunset_at)) {
      body.appendChild(h("p", { class: "notice", text: m.sunset.sunset_at ? "No opens or clicks for a long time, so marketing email stopped on " + formatDate(m.sunset.sunset_at) + " until they open the app or turn it back on." : "No opens or clicks for a long time. A single reminder email was sent on " + formatDate(m.sunset.re_permission_at) + "." }));
    }

    var actions = h("div", { class: "row" });
    var exBtn;
    if (m.excluded) {
      exBtn = h("button", { type: "button", class: "btn", text: "Include again", onclick: function () {
        var id = exclusionFor({ user_id: m.user_id, email: m.email });
        if (!id) { showNotice("error", "Could not find that exclusion. Reload the page and try again."); return; }
        guarded(call("include", { id: id }), "while including that person").then(function () { showNotice("good", "Included again."); return loadExclusions(); }).then(function () { openMember(m.user_id); }).catch(function () {});
      } });
    } else {
      exBtn = h("button", { type: "button", class: "btn", text: "Exclude", onclick: function () { excludeMember({ user_id: m.user_id, email: m.email }, exBtn); } });
    }
    var exp = h("button", { type: "button", class: "btn", text: "Download their email records" });
    exp.addEventListener("click", function () {
      setBusy(exp, true, "Preparing");
      guarded(call("export_member", { user_id: m.user_id }), "while preparing the file").then(function (res) {
        setBusy(exp, false);
        download(res.filename || "member-email-records.json", String(res.json || "{}"), "application/json;charset=utf-8");
      }).catch(function () { setBusy(exp, false); });
    });
    actions.appendChild(exBtn); actions.appendChild(exp);
    body.appendChild(actions);

    body.appendChild(h("h2", { text: "Emails sent to them" }));
    var hist = Array.isArray(m.history) ? m.history : [];
    if (!hist.length) body.appendChild(h("p", { class: "muted", text: "No emails yet." }));
    hist.forEach(function (x) {
      var what = x.campaign_subject || (x.automation ? (AUTOMATION_NAME[x.automation] || x.automation) : (x.kind || "Email"));
      var bits = [formatDateTime(x.at), x.status];
      if (Array.isArray(x.events) && x.events.length) bits.push(x.events.join(", "));
      if (x.app_returned) bits.push("opened the app afterwards");
      body.appendChild(h("div", { class: "person" }, [h("div", { class: "em", text: what }), h("div", { class: "small", text: bits.filter(Boolean).join(". ") })]));
    });
    body.appendChild(h("h2", { text: "Their choices over time" }));
    var ph = Array.isArray(m.preference_history) ? m.preference_history : [];
    if (!ph.length) body.appendChild(h("p", { class: "muted", text: "No changes recorded." }));
    ph.forEach(function (x) {
      body.appendChild(h("div", { class: "person" }, [
        h("div", { text: (x.topic ? (TOPIC_LABEL[x.topic] || x.topic) + " " : "News email ") + (x.subscribed ? "turned on" : "turned off") }),
        h("div", { class: "small", text: formatDateTime(x.at) + (x.source ? ", from " + x.source : "") })
      ]));
    });
    focusHeading();
  }

  /* ---------- groups (segments) ---------- */

  var RULES = {
    joined: { label: "Joined", ops: [["before", "before"], ["after", "after"]], kind: "date" },
    last_used: { label: "Last used the app", ops: [["within", "within the last"], ["over", "more than"]], kind: "days", unit: "days ago" },
    last_workout: { label: "Last workout", ops: [["within", "within the last"], ["over", "more than"]], kind: "days", unit: "days ago" },
    app_version: { label: "App version", ops: [["below", "is below"], ["at_least", "is at least"]], kind: "version" },
    platform: { label: "Device", ops: [["is", "is"], ["is_not", "is not"]], kind: "platform" },
    workouts_30d: { label: "Workouts in 30 days", ops: [["at_least", "at least"], ["at_most", "at most"]], kind: "number" },
    community: { label: "Community", ops: [["is", "is a member"], ["is_not", "is not a member"]], kind: "none" },
    email_received: { label: "Got the email", ops: [["yes", "yes"], ["no", "no"]], kind: "campaign" },
    email_opened: { label: "Opened the email", ops: [["yes", "yes"], ["no", "no"]], kind: "campaign" },
    email_clicked: { label: "Clicked in the email", ops: [["yes", "yes"], ["no", "no"]], kind: "campaign" },
    topic: { label: "Topic", ops: [["on", "is on"], ["off", "is off"]], kind: "topic" }
  };

  function ruleSummary(r) {
    var def = RULES[r.field];
    if (!def) return r.field;
    var op = (def.ops.filter(function (o) { return o[0] === r.op; })[0] || ["", r.op])[1];
    var v = r.value === undefined || r.value === null ? "" : " " + (def.kind === "topic" ? TOPIC_LABEL[r.value] || r.value : r.value) + (def.unit ? " " + def.unit.replace(" ago", "") : "");
    return def.label + " " + op + v;
  }

  function drawSegments() {
    var box = document.getElementById("segment-list");
    if (!box) return;
    box.textContent = "";
    var list = state.segments || [];
    if (!list.length) { box.appendChild(h("p", { class: "muted", text: "No groups yet." })); return; }
    list.forEach(function (s) {
      var count = s.count ? num(s.count.matching) + " match, " + num(s.count.will_receive) + " would receive news email" : "";
      var rules = (Array.isArray(s.rules) ? s.rules : []).map(ruleSummary).join("; ");
      box.appendChild(h("button", { type: "button", class: "item", onclick: function () {
        state.segmentEdit = { id: s.id, name: s.name || "", rules: (Array.isArray(s.rules) ? s.rules : []).map(function (r) { return { field: r.field, op: r.op, value: r.value === undefined ? "" : r.value }; }) };
        renderShell();
      } }, [h("div", { class: "t", text: s.name || "Group" }), h("div", { class: "m", text: [count, rules].filter(Boolean).join(". ") })]));
    });
  }

  function renderSegmentEditor(body) {
    var g = state.segmentEdit;
    body.appendChild(h("h1", { text: g.id ? "Edit group" : "New group" }));
    body.appendChild(backButton("Back to people", function () { state.segmentEdit = null; renderShell(); }));
    var holder = h("div", {}, [loadingBox()]);
    body.appendChild(holder);
    guarded(call("list_campaigns", { status: "sent" }), "while loading emails").catch(function () { return {}; }).then(function (res) {
      holder.textContent = "";
      buildSegmentEditor(holder, g, Array.isArray(res.campaigns) ? res.campaigns : []);
      focusHeading();
    });
  }

  function buildSegmentEditor(box, g, sentEmails) {
    var name = h("input", { id: "g-name", type: "text", maxlength: "80", autocomplete: "off" });
    name.value = g.name;
    name.addEventListener("input", function () { g.name = name.value; refresh(); });
    box.appendChild(field("g-name", "Name", name, "For example: On an older version."));
    box.appendChild(h("p", { class: "muted", text: "A member is in the group when every rule below is true." }));
    var rulesBox = h("div", {});
    box.appendChild(rulesBox);
    var countBox = h("div", { "aria-live": "polite" });
    var countBtn = h("button", { type: "button", class: "btn", text: "Count who matches" });
    var saveBtn = h("button", { type: "button", class: "btn btn-primary", text: "Save group" });
    var delBtn = h("button", { type: "button", class: "btn btn-danger", text: "Delete group" });

    function ruleValue(r, i) {
      var def = RULES[r.field];
      var id = "g-v-" + i;
      var el;
      if (def.kind === "none") return null;
      if (def.kind === "platform") el = selectOf(id, [["ios", "iPhone"], ["android", "Android"], ["other", "Other"], ["unknown", "Unknown"]], r.value || "ios");
      else if (def.kind === "topic") el = selectOf(id, Object.keys(TOPIC_LABEL).map(function (k) { return [k, TOPIC_LABEL[k]]; }), r.value || "product_news");
      else if (def.kind === "campaign") {
        var opts = [["", "Choose an email"]];
        sentEmails.forEach(function (c) { opts.push([c.id, c.subject || "Email"]); });
        el = selectOf(id, opts, r.value);
      } else if (def.kind === "date") el = h("input", { id: id, type: "date" });
      else if (def.kind === "version") el = h("input", { id: id, type: "text", placeholder: "1.2.0", autocomplete: "off" });
      else el = h("input", { id: id, type: "number", min: "0", inputmode: "numeric" });
      if (def.kind === "date" || def.kind === "version" || def.kind === "days" || def.kind === "number") el.value = r.value === undefined ? "" : r.value;
      el.addEventListener(el.tagName === "SELECT" ? "change" : "input", function () { r.value = el.value; refresh(); });
      if (el.tagName === "SELECT" && (r.value === undefined || r.value === "")) { if (def.kind !== "campaign") r.value = el.value; }
      return field(id, def.kind === "days" ? "Number of days" : "Value", el);
    }

    function drawRules() {
      rulesBox.textContent = "";
      g.rules.forEach(function (r, i) {
        var def = RULES[r.field];
        var fsel = selectOf("g-f-" + i, Object.keys(RULES).map(function (k) { return [k, RULES[k].label]; }), r.field);
        fsel.addEventListener("change", function () {
          r.field = fsel.value; r.op = RULES[r.field].ops[0][0]; r.value = "";
          drawRules(); refresh();
        });
        var osel = selectOf("g-o-" + i, def.ops, r.op);
        osel.addEventListener("change", function () { r.op = osel.value; refresh(); });
        rulesBox.appendChild(h("div", { class: "block" }, [
          h("div", { class: "bhead", text: "Rule " + (i + 1) }),
          field("g-f-" + i, "About", fsel), field("g-o-" + i, "Is", osel), ruleValue(r, i),
          h("div", { class: "row" }, [h("button", { type: "button", class: "btn btn-danger", text: "Remove rule", onclick: function () { g.rules.splice(i, 1); drawRules(); refresh(); } })])
        ]));
      });
      if (!g.rules.length) rulesBox.appendChild(h("p", { class: "muted", text: "No rules yet, so the group is everyone." }));
    }
    box.appendChild(h("div", { class: "row" }, [h("button", { type: "button", class: "btn", text: "Add a rule", onclick: function () {
      g.rules.push({ field: "last_used", op: "over", value: "30" }); drawRules(); refresh();
    } })]));
    box.appendChild(countBox);
    box.appendChild(h("div", { class: "row" }, [countBtn]));
    var problems = h("div", { "aria-live": "polite" });
    box.appendChild(problems);
    box.appendChild(h("div", { class: "row" }, g.id ? [saveBtn, delBtn] : [saveBtn]));

    function cleanRules() {
      return g.rules.map(function (r) {
        var def = RULES[r.field];
        var out = { field: r.field, op: r.op };
        if (def.kind === "days" || def.kind === "number") out.value = parseInt(r.value, 10);
        else if (def.kind !== "none") out.value = r.value;
        return out;
      });
    }
    function rulesProblems() {
      var p = [];
      if (!g.name.trim()) p.push("Give the group a name.");
      g.rules.forEach(function (r, i) {
        var def = RULES[r.field];
        var n = "Rule " + (i + 1);
        if (def.kind === "days" && !(parseInt(r.value, 10) >= 1)) p.push(n + " needs a number of days, 1 or more.");
        if (def.kind === "number" && isNaN(parseInt(r.value, 10))) p.push(n + " needs a number.");
        if (def.kind === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(r.value || "")) p.push(n + " needs a date.");
        if (def.kind === "version" && !/^\d{1,4}\.\d{1,4}\.\d{1,4}$/.test(r.value || "")) p.push(n + " needs a version like 1.2.0.");
        if (def.kind === "campaign" && !r.value) p.push(n + " needs an email chosen.");
      });
      return p;
    }
    function refresh() {
      problems.textContent = "";
      var p = rulesProblems();
      if (p.length) {
        var list = h("ul", { class: "reasons" });
        p.forEach(function (x) { list.appendChild(h("li", { text: x })); });
        problems.appendChild(h("div", { class: "notice error" }, [h("strong", { text: "This group cannot be saved yet." }), list]));
      }
      saveBtn.disabled = p.length > 0;
      countBtn.disabled = p.length > 0 && rulesProblems().some(function (x) { return x.indexOf("name") < 0; });
    }
    countBtn.addEventListener("click", function () {
      setBusy(countBtn, true, "Counting");
      guarded(call("segment_count", { rules: cleanRules() }), "while counting").then(function (res) {
        setBusy(countBtn, false);
        countBox.textContent = "";
        countBox.appendChild(h("div", { class: "card stat" }, [
          h("div", { class: "num", text: String(num(res.matching)) }),
          h("div", { class: "what", text: "match. " + num(res.will_receive) + " of them would receive news email." })
        ]));
      }).catch(function () { setBusy(countBtn, false); });
    });
    saveBtn.addEventListener("click", function () {
      clearNotice();
      setBusy(saveBtn, true, "Saving");
      var p = { name: g.name.trim(), rules: cleanRules() };
      if (g.id) p.id = g.id;
      guarded(call("save_segment", p), "while saving the group").then(function () {
        showNotice("good", "Group saved.");
        state.segmentEdit = null; state.segments = null; renderShell();
      }).catch(function () { setBusy(saveBtn, false); });
    });
    delBtn.addEventListener("click", function () {
      ask({ title: "Delete this group?", body: "Emails that use it must be changed first.", confirmLabel: "Delete", danger: true }).then(function (r) {
        if (!r.ok) return null;
        return call("delete_segment", { id: g.id }).then(function () {
          showNotice("good", "Group deleted.");
          state.segmentEdit = null; state.segments = null; renderShell();
        }, function (err) {
          if (err && err.code === "segment_in_use") showNotice("error", "An email uses this group. Change that email first, then delete the group.");
          else showNotice("error", friendly(err, "while deleting"));
        });
      }).catch(function () {});
    });
    drawRules();
    refresh();
  }

  var STATUS_LABEL = {
    receives: "Receives emails",
    excluded: "Excluded by you",
    turned_off: "Turned off",
    paused: "Paused",
    unconfirmed: "Email not confirmed"
  };

  function loadExclusions() {
    return guarded(call("list_exclusions", {}), "while loading the excluded list").then(function (data) {
      var list = Array.isArray(data) ? data : pick(data, ["exclusions", "items"], []);
      state.exclusions = Array.isArray(list) ? list : [];
      return state.exclusions;
    });
  }

  function exclusionFor(member) {
    var direct = pick(member, ["exclusion_id"], null);
    if (direct) return direct;
    var list = state.exclusions || [];
    var email = String(member.email || "").toLowerCase();
    for (var i = 0; i < list.length; i++) {
      if ((member.user_id && list[i].user_id === member.user_id) ||
          (email && String(list[i].email || "").toLowerCase() === email)) return list[i].id;
    }
    return null;
  }

  function drawExclusions() {
    var box = document.getElementById("excluded-list");
    if (!box) return;
    box.textContent = "";
    var list = state.exclusions || [];
    if (!list.length) {
      box.appendChild(h("p", { class: "muted", text: "Nobody is excluded." }));
      return;
    }
    list.forEach(function (x) {
      var bits = [];
      if (x.note) bits.push(x.note);
      if (x.created_at) bits.push("Excluded " + formatDate(x.created_at));
      var btn = h("button", { type: "button", class: "btn", text: "Include", "aria-label": "Include " + (x.email || "this person") });
      btn.addEventListener("click", function () { includeExclusion(x.id, x.email, btn); });
      box.appendChild(h("div", { class: "card" }, [
        h("div", { class: "em", text: x.email || "Account without an email address" }),
        bits.length ? h("div", { class: "small", text: bits.join(". ") }) : null,
        h("div", { class: "row" }, [btn])
      ]));
    });
  }

  function includeExclusion(id, email, button) {
    clearNotice();
    setBusy(button, true, "Working");
    guarded(call("include", { id: id }), "while including that person").then(function () {
      showNotice("good", (email || "That person") + " is included again.");
      return Promise.all([loadExclusions(), loadOverview()]);
    }).then(function () {
      drawExclusions();
      loadPeople();
    }).catch(function () { setBusy(button, false); });
  }

  /* ---------- more: insights, records, settings ---------- */

  function renderMore(body) {
    if (state.more === "insights") { renderInsights(body); return; }
    if (state.more === "records") { renderRecords(body); return; }
    if (state.more === "settings") { renderSettings(body); return; }
    body.appendChild(h("h1", { text: "More" }));
    [
      ["insights", "Insights", "How emails are doing over time, why people turn them off, and who is reached."],
      ["records", "Records", "Everything done on this page, and files of consent and suppression records."],
      ["settings", "Settings", "Sending limits, quiet hours, the kill switch, the seed list and the domain checks."]
    ].forEach(function (it) {
      body.appendChild(h("button", { type: "button", class: "item", onclick: function () { state.more = it[0]; renderShell(); } }, [
        h("div", { class: "t", text: it[1] }), h("div", { class: "m", text: it[2] })
      ]));
    });
    focusHeading();
  }

  function moreBack() {
    return backButton("Back to More", function () { state.more = "menu"; renderShell(); });
  }

  function renderInsights(body) {
    body.appendChild(h("h1", { text: "Insights" }));
    body.appendChild(moreBack());
    var days = selectOf("in-days", [["7", "Last 7 days"], ["30", "Last 30 days"], ["90", "Last 90 days"], ["365", "Last year"]], "30");
    body.appendChild(field("in-days", "Period", days));
    var box = h("div", { "aria-live": "polite" });
    body.appendChild(box);
    function load() {
      box.textContent = "";
      box.appendChild(loadingBox());
      guarded(call("insights", { days: parseInt(days.value, 10) }), "while loading insights").then(function (res) {
        var s = res.insights || {};
        box.textContent = "";
        box.appendChild(statGrid([[num(s.audience_now), "People who receive news email now"], [num(s.suppressed), "Held back by a rule"], [num(s.delayed), "Delayed by the mail provider"]]));
        box.appendChild(statsView(s, { reasons: true }));
        var bars = dailyBars(s.daily);
        if (bars) { box.appendChild(h("h3", { text: "Emails sent each day" })); box.appendChild(bars); }
        var qv = quotaView(s.quota);
        if (qv) box.appendChild(qv);
      }).catch(function () { box.textContent = ""; box.appendChild(retryButton(load)); });
    }
    days.addEventListener("change", load);
    load();
    focusHeading();
  }

  var ACTION_WORD = {
    request_login: "Signed in", exchange: "Signed in", send_campaign: "Sent an email", schedule_campaign: "Scheduled an email",
    cancel_campaign: "Cancelled an email", undo_send: "Undid a send", pause_campaign: "Paused an email", resume_campaign: "Resumed an email",
    send_test: "Sent a test", send_seed: "Sent to the seed list", save_campaign: "Saved an email", delete_campaign: "Deleted a draft",
    set_kill_switch: "Changed the kill switch", save_settings: "Changed settings", exclude: "Excluded someone", include: "Included someone",
    set_automation: "Turned an automation on or off", save_automation: "Saved an automation", export_member: "Downloaded a member record",
    export_records: "Downloaded records", set_domain_tracking: "Changed domain tracking", add_seed: "Added a seed address",
    remove_seed: "Removed a seed address", save_survey: "Saved a survey", set_survey_status: "Changed a survey", save_segment: "Saved a group"
  };

  function renderRecords(body) {
    body.appendChild(h("h1", { text: "Records" }));
    body.appendChild(moreBack());
    body.appendChild(h("h2", { text: "Downloads" }));
    body.appendChild(h("p", { class: "muted", text: "Plain files you can keep or hand to a member who asks what you hold. They hold ids and dates, not what anyone logged." }));
    var kind = selectOf("rec-kind", [
      ["audit", "What was done on this page"], ["pref_events", "Each time someone turned emails on or off"],
      ["suppressions", "Addresses we stopped emailing"], ["unsub_reasons", "Reasons given for turning emails off"]
    ], "audit");
    var dl = h("button", { type: "button", class: "btn btn-primary", text: "Download the file" });
    dl.addEventListener("click", function () {
      setBusy(dl, true, "Preparing");
      guarded(call("export_records", { kind: kind.value }), "while preparing the file").then(function (res) {
        setBusy(dl, false);
        download(res.filename || "records.csv", String(res.csv || ""));
      }).catch(function () { setBusy(dl, false); });
    });
    body.appendChild(field("rec-kind", "Which records", kind));
    body.appendChild(h("div", { class: "row" }, [dl]));

    body.appendChild(h("h2", { text: "What was done on this page" }));
    var list = h("div", { "aria-live": "polite" });
    body.appendChild(list);
    var offset = 0;
    function load() {
      list.textContent = "";
      list.appendChild(loadingBox());
      guarded(call("audit_log", { offset: offset, limit: 50 }), "while loading the log").then(function (res) {
        list.textContent = "";
        var entries = Array.isArray(res.entries) ? res.entries : [];
        if (!entries.length) list.appendChild(h("p", { class: "muted", text: offset ? "No more entries." : "Nothing recorded yet." }));
        entries.forEach(function (e) {
          list.appendChild(h("div", { class: "person" }, [
            h("div", { class: "em", text: ACTION_WORD[e.action] || String(e.action || "").replace(/_/g, " ") }),
            h("div", { class: "small", text: [formatDateTime(e.created_at), e.admin_email, e.status ? "result " + e.status : ""].filter(Boolean).join(". ") })
          ]));
        });
        var prev = h("button", { type: "button", class: "btn", text: "Newer", onclick: function () { offset = Math.max(0, offset - 50); load(); } });
        var next = h("button", { type: "button", class: "btn", text: "Older", onclick: function () { offset += 50; load(); } });
        if (offset <= 0) prev.disabled = true;
        if (entries.length < 50) next.disabled = true;
        list.appendChild(h("div", { class: "pager" }, [prev, next]));
        focusHeading();
      }).catch(function () { list.textContent = ""; list.appendChild(retryButton(load)); });
    }
    load();
  }

  var SETTING_FIELDS = [
    ["daily_cap", "Member emails a day", "number", "At most 60 per cent of the provider limit, so account emails always get through."],
    ["provider_daily_limit", "Email provider daily limit", "number", "The plan limit at Resend. The free plan is 100."],
    ["weekly_member_cap", "Marketing emails per member each week", "number", "1 to 14. The weekly summary counts too."],
    ["quiet_hours_start", "Quiet hours start (UK time)", "text", "Hours and minutes, for example 21:00."],
    ["quiet_hours_end", "Quiet hours end (UK time)", "text", "For example 08:00."],
    ["latest_app_version", "Latest app version in the stores", "text", "For example 1.31.0. Decides who sees the update prompt."],
    ["alarm_complaint_rate", "Stop a send above this complaint rate", "text", "A decimal. 0.003 means 0.3 per cent."],
    ["alarm_bounce_rate", "Stop a send above this bounce rate", "text", "A decimal. 0.05 means 5 per cent."],
    ["retention_months", "Keep send records for (months)", "number", "Older rows are deleted automatically."],
    ["undo_minutes", "Undo window after Send (minutes)", "number", "How long you can cancel a send."],
    ["sunset_days", "Stop marketing after no opens or clicks for (days)", "number", "One reminder is sent first."],
    ["review_ask_workouts", "Ask for a store review after this many workouts", "number", "Never sent to someone whose emails are held."]
  ];

  function renderSettings(body) {
    body.appendChild(h("h1", { text: "Settings" }));
    body.appendChild(moreBack());
    var holder = h("div", { "aria-live": "polite" }, [loadingBox()]);
    body.appendChild(holder);
    function load() {
      guarded(call("get_settings", {}), "while loading settings").then(function (res) {
        holder.textContent = "";
        buildSettings(holder, res, load);
        focusHeading();
      }).catch(function () { holder.textContent = ""; holder.appendChild(retryButton(load)); });
    }
    load();
  }

  function buildSettings(box, res, reload) {
    var s = res.settings || {};

    box.appendChild(h("div", { class: "card" }, [
      h("h3", { text: "Sender" }),
      h("p", { text: "Emails come from " + (res.sender || "the news address") + ". Times are " + (res.timezone === "Europe/London" ? "UK time" : res.timezone || "UK time") + "." }),
      h("p", { class: "small", text: "The email service key is " + (res.resend_configured ? "set up." : "not set up yet.") + " Delivery tracking is " + (res.webhook_configured ? "connected." : "not connected yet.") })
    ]));
    if (res.webhook_url) {
      box.appendChild(h("p", { class: "small", text: "Address to give the email provider for delivery tracking:" }));
      box.appendChild(h("p", { class: "card", text: res.webhook_url }));
      box.appendChild(h("div", { class: "row" }, [h("button", { type: "button", class: "btn", text: "Copy address", onclick: function (e) { copyText(res.webhook_url, e.currentTarget); } })]));
    }
    var qv = quotaView(res.quota);
    if (qv) box.appendChild(qv);

    /* kill switch */
    var ks = s.kill_switch === "on";
    box.appendChild(h("h2", { text: "Kill switch" }));
    box.appendChild(h("p", { class: "notice " + (ks ? "error" : ""), text: ks ? "Sending is switched off." + (s.kill_switch_reason ? " Reason: " + s.kill_switch_reason : "") : "Sending is on." }));
    var ksBtn = h("button", { type: "button", class: "btn " + (ks ? "btn-primary" : "btn-danger"), text: ks ? "Switch sending back on" : "Stop all member email now" });
    ksBtn.addEventListener("click", function () {
      ask({
        title: ks ? "Switch sending back on?" : "Stop all member email?",
        body: ks ? "Emails already queued will go out again, within the daily cap." : "Nothing will be sent, and sends in progress pause, until you switch it back on.",
        inputLabel: ks ? null : "Reason (optional)", confirmLabel: ks ? "Switch on" : "Stop sending", danger: !ks
      }).then(function (r) {
        if (!r.ok) return null;
        var p = { on: !ks };
        if (!ks && r.value) p.reason = r.value;
        return guarded(call("set_kill_switch", p), "while changing the kill switch").then(function () {
          showNotice("good", ks ? "Sending is on again." : "Sending is switched off.");
          reload();
        });
      }).catch(function () {});
    });
    box.appendChild(h("div", { class: "row" }, [ksBtn]));

    /* limits */
    box.appendChild(h("h2", { text: "Limits and timing" }));
    var form = h("form", { novalidate: true });
    var inputs = {};
    SETTING_FIELDS.forEach(function (f) {
      var el = h("input", { id: "set-" + f[0], type: f[2], inputmode: f[2] === "number" ? "numeric" : null, autocomplete: "off" });
      el.value = s[f[0]] === undefined || s[f[0]] === null ? "" : s[f[0]];
      inputs[f[0]] = el;
      form.appendChild(field("set-" + f[0], f[1], el, f[3]));
    });
    var saveBtn = h("button", { type: "submit", class: "btn btn-primary", text: "Save settings" });
    form.appendChild(h("div", { class: "row" }, [saveBtn]));
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearNotice();
      var out = {};
      SETTING_FIELDS.forEach(function (f) {
        var v = inputs[f[0]].value.trim();
        if (f[0] === "latest_app_version" || v !== "") out[f[0]] = v;
      });
      setBusy(saveBtn, true, "Saving");
      call("save_settings", { settings: out }).then(function () {
        showNotice("good", "Settings saved.");
        reload();
      }, function (err) {
        setBusy(saveBtn, false);
        var key = err && err.serverKey ? err.serverKey : "";
        showNotice("error", key ? "That value was not accepted for: " + ((SETTING_FIELDS.filter(function (f) { return f[0] === key; })[0] || [0, key])[1]) + "." : friendly(err, "while saving"));
      });
    });
    box.appendChild(form);

    /* seed list */
    box.appendChild(h("h2", { text: "Seed list" }));
    box.appendChild(h("p", { class: "muted", text: "Your own test inboxes. Send to the seed list from an email to see it in several mail apps." }));
    var seeds = Array.isArray(res.seeds) ? res.seeds : [];
    if (!seeds.length) box.appendChild(h("p", { class: "muted", text: "No seed addresses yet." }));
    seeds.forEach(function (sd) {
      var rm = h("button", { type: "button", class: "btn btn-danger", text: "Remove", "aria-label": "Remove " + sd.email });
      rm.addEventListener("click", function () {
        guarded(call("remove_seed", { email: sd.email }), "while removing").then(function () { reload(); }).catch(function () {});
      });
      box.appendChild(h("div", { class: "card" }, [h("div", { class: "em", text: sd.email }), h("div", { class: "row" }, [rm])]));
    });
    var seedIn = h("input", { id: "seed-email", type: "email", autocomplete: "off", inputmode: "email" });
    var seedBtn = h("button", { type: "button", class: "btn", text: "Add this address" });
    seedBtn.addEventListener("click", function () {
      var email = seedIn.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showNotice("error", "Enter a full email address."); return; }
      setBusy(seedBtn, true, "Adding");
      guarded(call("add_seed", { email: email }), "while adding").then(function () { reload(); }).catch(function () { setBusy(seedBtn, false); });
    });
    box.appendChild(field("seed-email", "Add a seed address", seedIn));
    box.appendChild(h("div", { class: "row" }, [seedBtn]));

    /* domain */
    box.appendChild(h("h2", { text: "Domain checks" }));
    box.appendChild(h("p", { class: "muted", text: "Whether the sending domain is set up so mail providers trust it." }));
    var domBox = h("div", { "aria-live": "polite" });
    var domBtn = h("button", { type: "button", class: "btn", text: "Check the domain" });
    box.appendChild(h("div", { class: "row" }, [domBtn]));
    box.appendChild(domBox);
    function loadDomain() {
      setBusy(domBtn, true, "Checking");
      guarded(call("domain_status", {}), "while checking the domain").then(function (r2) {
        setBusy(domBtn, false);
        domBox.textContent = "";
        var domains = Array.isArray(r2.domains) ? r2.domains : [];
        if (!domains.length) domBox.appendChild(h("p", { class: "muted", text: "No domains found." }));
        domains.forEach(function (d) {
          var recs = Array.isArray(d.records) ? d.records : [];
          var card = h("div", { class: "card" }, [
            h("h3", { text: d.name || "Domain" }),
            h("p", {}, [h("span", { class: "chip " + (d.status === "verified" ? "good" : "warn"), text: String(d.status || "unknown") })])
          ]);
          recs.forEach(function (rc) {
            card.appendChild(h("div", { class: "small", text: [rc.record || rc.type, rc.name, rc.status].filter(Boolean).join(": ") }));
          });
          if (d.dmarc) card.appendChild(h("p", { class: "small", text: "DMARC: " + (d.dmarc.status || "unknown") + (d.dmarc.policy ? ", policy " + d.dmarc.policy : "") }));
          var oc = h("input", { type: "checkbox", id: "dom-open-" + d.name });
          oc.checked = !!d.open_tracking;
          var cc = h("input", { type: "checkbox", id: "dom-click-" + d.name });
          cc.checked = !!d.click_tracking;
          card.appendChild(h("label", { class: "check", for: "dom-open-" + d.name }, [oc, "Track opens"]));
          card.appendChild(h("label", { class: "check", for: "dom-click-" + d.name }, [cc, "Track clicks"]));
          var trackBtn = h("button", { type: "button", class: "btn", text: "Save tracking choice" });
          trackBtn.addEventListener("click", function () {
            ask({
              title: "Change tracking for " + (d.name || "this domain") + "?",
              body: "This setting belongs to the whole domain, so it also applies to sign-in emails, not only news emails. Turning it off stops open and click figures from appearing.",
              confirmLabel: "Change tracking"
            }).then(function (r) {
              if (!r.ok) return null;
              setBusy(trackBtn, true, "Saving");
              return guarded(call("set_domain_tracking", { domain: d.name, open: oc.checked, click: cc.checked }), "while saving the tracking choice").then(function () {
                showNotice("good", "Tracking saved.");
                loadDomain();
              });
            }).catch(function () { setBusy(trackBtn, false); });
          });
          card.appendChild(h("div", { class: "row" }, [trackBtn]));
          domBox.appendChild(card);
        });
      }).catch(function () { setBusy(domBtn, false); });
    }
    domBtn.addEventListener("click", loadDomain);
  }

  /* ---------- start ---------- */

  document.getElementById("sign-out").addEventListener("click", function () { clearNotice(); signOut(); });

  (function init() {
    var params = new URLSearchParams(window.location.search);
    var login = params.get("login");
    if (login) {
      // Take the one-time code out of the address bar straight away.
      try { window.history.replaceState(null, "", window.location.pathname); } catch (_e) { /* Not essential. */ }
      exchangeLogin(login.trim());
      return;
    }
    var saved = readStore();
    if (sessionStillValid(saved)) {
      state.session = saved.session;
      state.email = saved.email || "";
      whoEmail.textContent = state.email;
      who.classList.remove("hidden");
      renderShell();
    } else {
      writeStore(null);
      renderSignIn(false);
      if (saved) showNotice("warn", "Your sign-in has ended. Ask for a new link.");
    }
  })();
})();
