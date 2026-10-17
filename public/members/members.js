/* Volyume members page. Plain JavaScript, no libraries.
 * Every network call goes to the member-email-admin function with
 * { action, session, ... } (docs/member-email-2026-10-17/SPEC.md section 2).
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
    tab: "overview",
    overview: null,
    exclusions: null,
    people: { query: "", offset: 0, total: 0, members: [] },
    campaign: null,
    campaignDirty: false,
    preview: null,
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
    return d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
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

  function ApiError(status, code, message) {
    this.status = status;
    this.code = code;
    this.serverMessage = message;
  }

  function call(action, payload, timeoutMs) {
    var body = { action: action };
    if (state.session) body.session = state.session;
    Object.keys(payload || {}).forEach(function (k) { body[k] = payload[k]; });

    var controller = typeof AbortController === "function" ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, timeoutMs || 45000) : null;

    return fetch(ADMIN_URL, {
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
          throw new ApiError(res.status, code, typeof msg === "string" ? msg : "");
        }
        return data === null ? {} : data;
      });
    }, function () {
      if (timer) clearTimeout(timer);
      throw new ApiError(0, "network", "");
    });
  }

  function friendly(err, what) {
    if (!(err instanceof ApiError)) return "Something went wrong. Please try again.";
    if (err.status === 0) return "Could not reach the server. Check your connection and try again.";
    if (err.status === 401) return "Your sign-in has ended. Ask for a new link.";
    if (err.status === 403) return "This email address is not allowed to use this page.";
    if (err.status === 429) return "Too many tries in a short time. Wait a few minutes and try again.";
    if (err.status === 404) return "That could not be found. It may have been removed. Go back and look again.";
    if (err.status === 409 || err.status === 400 || err.status === 422) {
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
    state.campaign = null;
    state.survey = null;
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
    state.tab = "overview";
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

  /* ---------- shell and tabs ---------- */

  var TABS = [
    ["overview", "Overview"],
    ["people", "People"],
    ["emails", "Emails"],
    ["surveys", "Surveys"]
  ];

  function renderShell() {
    app.textContent = "";
    var tabs = h("div", { class: "tabs", role: "tablist", "aria-label": "Sections" });
    TABS.forEach(function (t) {
      var btn = h("button", {
        type: "button", class: "btn tab" + (state.tab === t[0] ? " on" : ""), role: "tab",
        "aria-selected": state.tab === t[0] ? "true" : "false", text: t[1],
        onclick: function () {
          function go() { clearNotice(); state.tab = t[0]; state.campaign = null; state.campaignDirty = false; state.survey = null; state.results = null; renderShell(); }
          if (state.campaign && state.campaignDirty) {
            ask({ title: "Leave without saving?", body: "Your changes to this email have not been saved.", confirmLabel: "Leave", danger: true }).then(function (r) { if (r.ok) go(); });
          } else { go(); }
        }
      });
      tabs.appendChild(btn);
    });
    app.appendChild(tabs);
    var body = h("div", { id: "view" });
    app.appendChild(body);
    if (state.tab === "overview") renderOverview(body);
    else if (state.tab === "people") renderPeople(body);
    else if (state.tab === "emails") renderEmails(body);
    else renderSurveys(body);
  }

  function loadOverview() {
    return guarded(call("overview", {}), "while loading the overview").then(function (data) {
      state.overview = data || {};
      return state.overview;
    });
  }

  function audienceCount() {
    return Number(pick(state.overview, ["audience", "audience_count", "audience_total"], 0)) || 0;
  }

  function surveysList() {
    var list = pick(state.overview, ["surveys"], []);
    return Array.isArray(list) ? list : [];
  }

  function campaignsList() {
    var list = pick(state.overview, ["campaigns"], []);
    return Array.isArray(list) ? list : [];
  }

  /* ---------- overview ---------- */

  function stat(num, what, extra) {
    return h("div", { class: "card stat" + (extra ? " " + extra : "") }, [
      h("div", { class: "num", text: String(num) }),
      h("div", { class: "what", text: what })
    ]);
  }

  function renderOverview(body) {
    body.appendChild(h("h1", { text: "Overview" }));
    body.appendChild(h("p", { class: "muted", text: "Loading." }));
    loadOverview().then(function () {
      body.textContent = "";
      var n = audienceCount();
      body.appendChild(h("h1", { text: "Overview" }));
      body.appendChild(h("div", { class: "stats" }, [
        stat(n, plural(n, "member", "members").replace(/^\d+ /, "") + " will receive this", "big"),
        stat(Number(pick(state.overview, ["turned_off", "subscribed_off", "consent_off", "optouts", "opt_outs", "optout_count"], 0)) || 0, "Turned off"),
        stat(Number(pick(state.overview, ["excluded", "excluded_count"], 0)) || 0, "Excluded")
      ]));
      body.appendChild(h("p", { class: "small", text: "Turned off means people who unsubscribed or switched news emails off. Excluded means people you chose to leave out. Nobody is emailed while calm mode is on or while Volyume holds emails for them for their wellbeing." }));
      body.appendChild(h("div", { class: "row" }, [
        h("button", { type: "button", class: "btn btn-primary", text: "Write an email", onclick: function () { state.tab = "emails"; state.campaign = newCampaign(); renderShell(); } }),
        h("button", { type: "button", class: "btn", text: "Make a survey", onclick: function () { state.tab = "surveys"; state.survey = newSurvey(); renderShell(); } })
      ]));
      var recent = campaignsList().slice(0, 3);
      if (recent.length) {
        body.appendChild(h("h2", { text: "Latest emails" }));
        recent.forEach(function (c) { body.appendChild(campaignItem(c)); });
      }
      focusHeading();
    }, function () {
      body.textContent = "";
      body.appendChild(h("h1", { text: "Overview" }));
      body.appendChild(h("button", { type: "button", class: "btn", text: "Try again", onclick: renderShell }));
    });
  }

  /* ---------- people and exclusions ---------- */

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

  function renderPeople(body) {
    body.appendChild(h("h1", { text: "People" }));
    body.appendChild(h("p", { class: "muted", text: "Find a member by email address. Exclude test accounts and anyone else you do not want to email." }));

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

    var list = h("div", { id: "people-list", "aria-live": "polite" });
    body.appendChild(list);

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
        return Promise.all([loadExclusions(), loadOverview()]);
      }).then(function () {
        drawExclusions();
        loadPeople();
      }).catch(function () { setBusy(exBtn, false); });
    });
    body.appendChild(exForm);

    body.appendChild(h("h2", { text: "Excluded" }));
    body.appendChild(h("div", { id: "excluded-list", "aria-live": "polite" }));

    loadExclusions().then(function () { drawExclusions(); }, function () {});
    loadOverview().catch(function () {});
    loadPeople();
    focusHeading();
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

  function loadPeople() {
    var box = document.getElementById("people-list");
    if (!box) return;
    box.textContent = "";
    box.appendChild(h("p", { class: "muted", text: "Loading." }));
    var payload = { offset: state.people.offset, limit: PAGE_SIZE };
    if (state.people.query) payload.query = state.people.query;
    guarded(call("list_members", payload), "while loading members").then(function (data) {
      state.people.total = Number(pick(data, ["total"], 0)) || 0;
      state.people.members = pick(data, ["members"], []) || [];
      return state.exclusions ? null : loadExclusions();
    }).then(drawPeople, function () {
      if (box.parentNode) { box.textContent = ""; box.appendChild(h("button", { type: "button", class: "btn", text: "Try again", onclick: loadPeople })); }
    });
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
    var from = p.offset + 1;
    var to = p.offset + p.members.length;
    box.appendChild(h("p", { class: "small", text: "Showing " + from + " to " + to + " of " + p.total }));
    var card = h("div", { class: "card" });
    p.members.forEach(function (m) {
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
      card.appendChild(h("div", { class: "person" }, [
        h("div", { class: "em", text: m.email || "No email address" }),
        h("div", { class: "small", text: m.created_at ? "Joined " + formatDate(m.created_at) : "" }),
        h("div", {}, [h("span", { class: chipClass, text: status })]),
        m.status === "paused" ? h("div", { class: "small", text: "Volyume holds emails for this person for now." }) : null,
        h("div", { class: "row" }, [action])
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
        return Promise.all([loadExclusions(), loadOverview()]);
      }).then(function () { drawExclusions(); loadPeople(); });
    }).catch(function () { setBusy(button, false); });
  }

  /* ---------- emails ---------- */

  function newCampaign() {
    state.campaignDirty = false;
    state.preview = null;
    return { id: null, subject: "", preheader: "", body: "", button_label: "", button_url: "", survey_id: "", status: "draft" };
  }

  var CAMPAIGN_STATUS = { draft: "Draft", sending: "Sending", sent: "Sent", partial: "Partly sent" };

  function campaignItem(c) {
    var meta = [CAMPAIGN_STATUS[c.status] || c.status];
    if (c.status === "sent" || c.status === "partial" || c.status === "sending") {
      var sent = Number(pick(c, ["sent_count"], 0)) || 0;
      var total = pick(c, ["recipient_count"], null);
      meta.push(total !== null ? sent + " of " + total + " sent" : sent + " sent");
      var failed = Number(pick(c, ["failed_count"], 0)) || 0;
      if (failed) meta.push(failed + " not sent");
    }
    var when = c.sent_at || c.updated_at || c.created_at;
    if (when) meta.push(formatDate(when));
    return h("button", {
      type: "button", class: "item",
      onclick: function () { state.tab = "emails"; state.campaign = copyCampaign(c); state.campaignDirty = false; state.preview = null; renderShell(); }
    }, [h("div", { class: "t", text: c.subject || "No subject" }), h("div", { class: "m", text: meta.join(". ") })]);
  }

  function copyCampaign(c) {
    return {
      id: c.id, subject: c.subject || "", preheader: c.preheader || "", body: c.body || "",
      button_label: c.button_label || "", button_url: c.button_url || "", survey_id: c.survey_id || "",
      status: c.status || "draft", recipient_count: c.recipient_count, sent_count: c.sent_count,
      failed_count: c.failed_count, sent_at: c.sent_at
    };
  }

  function renderEmails(body) {
    if (state.campaign) { renderCampaignEditor(body); return; }
    body.appendChild(h("h1", { text: "Emails" }));
    body.appendChild(h("div", { class: "row" }, [
      h("button", { type: "button", class: "btn btn-primary", text: "New email", onclick: function () { state.campaign = newCampaign(); renderShell(); } })
    ]));
    var list = h("div", { "aria-live": "polite" }, [h("p", { class: "muted", text: "Loading." })]);
    body.appendChild(list);
    loadOverview().then(function () {
      list.textContent = "";
      var items = campaignsList();
      if (!items.length) list.appendChild(h("p", { class: "muted", text: "No emails yet. Press New email to write the first one." }));
      items.forEach(function (c) { list.appendChild(campaignItem(c)); });
      focusHeading();
    }, function () {
      list.textContent = "";
      list.appendChild(h("button", { type: "button", class: "btn", text: "Try again", onclick: renderShell }));
    });
  }

  /* The same checks the server makes (SPEC section 2), so the reason is
   * shown before anything is sent. */
  function campaignProblems(c) {
    var problems = [];
    var fields = [["subject", c.subject], ["preview line", c.preheader], ["body", c.body], ["button label", c.button_label], ["button link", c.button_url]];
    fields.forEach(function (f) {
      if (f[1] && EM_DASH.test(f[1])) problems.push("The " + f[0] + " has an em dash. Use a comma, a full stop or a colon instead.");
    });
    if (!c.subject.trim()) problems.push("Add a subject.");
    else if (c.subject.length > 150) problems.push("The subject is longer than 150 characters.");
    if (c.preheader.length > 200) problems.push("The preview line is longer than 200 characters.");
    if (!c.body.trim()) problems.push("Write the body of the email.");
    else if (c.body.length > 20000) problems.push("The body is longer than 20,000 characters.");
    var hasLabel = c.button_label.trim().length > 0;
    var hasUrl = c.button_url.trim().length > 0;
    if (hasLabel !== hasUrl) problems.push("A button needs both a label and a link.");
    if (c.button_label.length > 40) problems.push("The button label is longer than 40 characters.");
    if (hasUrl && !/^https:\/\//i.test(c.button_url.trim())) problems.push("The button link must start with https://.");
    return problems;
  }

  function campaignPayload(c) {
    var p = {
      subject: c.subject.trim(), preheader: c.preheader.trim() || null, body: c.body,
      button_label: c.button_label.trim() || null, button_url: c.button_url.trim() || null,
      survey_id: c.survey_id || null
    };
    if (c.id) p.id = c.id;
    return p;
  }

  function saveCampaign() {
    var c = state.campaign;
    return guarded(call("save_campaign", campaignPayload(c)), "while saving").then(function (data) {
      var saved = pick(data, ["campaign"], data) || {};
      if (saved.id) c.id = saved.id;
      state.campaignDirty = false;
      return c;
    });
  }

  function renderCampaignEditor(body) {
    var c = state.campaign;
    var editable = c.status === "draft";
    var locked = !editable;

    body.appendChild(h("h1", { text: c.id ? (editable ? "Edit email" : "Email") : "New email" }));
    body.appendChild(h("div", { class: "row" }, [
      h("button", { type: "button", class: "btn", text: "Back to emails", onclick: function () { leaveCampaign(); } })
    ]));

    if (locked) {
      var sent = Number(c.sent_count || 0);
      var failed = Number(c.failed_count || 0);
      var lines = [CAMPAIGN_STATUS[c.status] || c.status];
      if (c.recipient_count !== undefined && c.recipient_count !== null) lines.push(sent + " of " + c.recipient_count + " sent");
      if (failed) lines.push(failed + " did not send");
      if (c.sent_at) lines.push(formatDateTime(c.sent_at));
      body.appendChild(h("p", { class: "notice " + (c.status === "partial" ? "warn" : "good"), text: lines.join(". ") + "." }));
    }

    var fields = {};
    function textField(key, label, hint, type, max) {
      var id = "f-" + key;
      var el = type === "textarea"
        ? h("textarea", { id: id, rows: "10", maxlength: max })
        : h("input", { id: id, type: type || "text", maxlength: max, autocomplete: "off" });
      el.value = c[key] || "";
      if (locked) el.disabled = true;
      el.addEventListener("input", function () { c[key] = el.value; state.campaignDirty = true; state.preview = null; refreshCampaignControls(); });
      fields[key] = el;
      body.appendChild(h("label", { class: "field", for: id }, [label, hint ? h("span", { class: "hint", text: hint }) : null]));
      body.appendChild(el);
    }
    textField("subject", "Subject", "What people see in their inbox.", "text", "300");
    textField("preheader", "Preview line", "Optional. The short line after the subject.", "text", "400");
    textField("body", "Body", "Leave a blank line between paragraphs. Use **bold** for bold text and [link text](https://example.com) for a link.", "textarea", "30000");
    textField("button_label", "Button label", "Optional, for example See what is new.", "text", "100");
    textField("button_url", "Button link", "Optional. Must start with https://", "url", "500");

    var select = h("select", { id: "f-survey" });
    select.appendChild(h("option", { value: "", text: "No survey" }));
    var chosenKnown = false;
    surveysList().forEach(function (s) {
      var label = (s.title || "Untitled survey") + (s.status && s.status !== "open" ? " (" + s.status + ")" : "");
      var opt = h("option", { value: s.id, text: label });
      if (s.id === c.survey_id) { opt.selected = true; chosenKnown = true; }
      select.appendChild(opt);
    });
    if (c.survey_id && !chosenKnown) { select.appendChild(h("option", { value: c.survey_id, text: "Chosen survey", selected: true })); }
    if (locked) select.disabled = true;
    select.addEventListener("change", function () { c.survey_id = select.value; state.campaignDirty = true; state.preview = null; refreshCampaignControls(); });
    body.appendChild(h("label", { class: "field", for: "f-survey" }, ["Survey button", h("span", { class: "hint", text: "Optional. Adds a button that opens the survey. Only open surveys can be answered." })]));
    body.appendChild(select);

    var problemsBox = h("div", { id: "problems", "aria-live": "polite" });
    body.appendChild(problemsBox);

    var saveBtn = h("button", { type: "button", class: "btn", text: "Save" });
    var previewBtn = h("button", { type: "button", class: "btn", text: "Preview" });
    var testBtn = h("button", { type: "button", class: "btn", text: "Send me a test" });
    var sendBtn = h("button", { type: "button", class: "btn btn-primary", text: "Send to 0 members" });
    var delBtn = h("button", { type: "button", class: "btn btn-danger", text: "Delete draft" });

    var actions = [];
    if (editable) actions.push(saveBtn);
    actions.push(previewBtn, testBtn);
    body.appendChild(h("div", { class: "row" }, actions));
    var sendBox = h("div", { class: "row" }, [sendBtn]);
    if (c.status !== "sent") body.appendChild(sendBox);
    if (editable && c.id) body.appendChild(h("div", { class: "row" }, [delBtn]));

    var previewBox = h("div", { id: "preview-box" });
    body.appendChild(previewBox);

    function refreshCampaignControls() {
      var problems = campaignProblems(c);
      problemsBox.textContent = "";
      var reasons = problems.slice();
      var n = audienceCount();
      var canSend = c.status === "draft" || c.status === "partial";
      if (editable && state.campaignDirty) reasons.push("Save your changes before sending.");
      if (!c.id && editable) reasons.push("Save the email before sending.");
      if (canSend && n === 0) reasons.push("No members would receive this email right now.");
      if (c.status === "sending") reasons.push("This email is being sent.");
      sendBtn.textContent = "Send to " + plural(n, "member", "members");
      var disabled = !canSend || reasons.length > 0;
      sendBtn.disabled = disabled;
      sendBtn.setAttribute("aria-disabled", disabled ? "true" : "false");
      var shown = editable ? reasons : (canSend ? reasons : []);
      if (shown.length) {
        var list = h("ul", { class: "reasons" });
        shown.forEach(function (p) { list.appendChild(h("li", { text: p })); });
        var heading = problems.length ? "This email cannot be saved or sent yet." : "Send is switched off for now.";
        problemsBox.appendChild(h("div", { class: "notice " + (problems.length ? "error" : "warn") }, [h("strong", { text: heading }), list]));
      }
      var blocked = editable && problems.length > 0;
      saveBtn.disabled = blocked;
      previewBtn.disabled = blocked;
      testBtn.disabled = blocked;
      delBtn.disabled = !c.id;
    }
    refreshCampaignControls();

    function ensureSaved() {
      if (!editable) return Promise.resolve(c);
      var hard = campaignProblems(c).filter(function (p) { return /em dash|longer than|must start|needs both|Add a subject|Write the body/.test(p); });
      if (hard.length) { showNotice("error", hard[0]); return Promise.reject(new Error("invalid")); }
      if (c.id && !state.campaignDirty) return Promise.resolve(c);
      return saveCampaign();
    }

    saveBtn.addEventListener("click", function () {
      clearNotice();
      setBusy(saveBtn, true, "Saving");
      ensureSaved().then(function () {
        setBusy(saveBtn, false);
        showNotice("good", "Saved.");
        refreshCampaignControls();
      }).catch(function () { setBusy(saveBtn, false); });
    });

    previewBtn.addEventListener("click", function () {
      clearNotice();
      setBusy(previewBtn, true, "Preparing");
      ensureSaved().then(function () {
        return guarded(call("preview", { id: c.id }), "while preparing the preview");
      }).then(function (data) {
        setBusy(previewBtn, false);
        refreshCampaignControls();
        previewBox.textContent = "";
        var frame = h("iframe", { class: "preview", title: "Preview of the email", sandbox: "" });
        frame.srcdoc = String(pick(data, ["html"], ""));
        previewBox.appendChild(h("h2", { text: "Preview" }));
        previewBox.appendChild(h("p", { class: "small", text: "Subject: " + String(pick(data, ["subject"], c.subject)) }));
        previewBox.appendChild(frame);
        var text = pick(data, ["text"], "");
        if (text) {
          previewBox.appendChild(h("h2", { text: "Plain text version" }));
          previewBox.appendChild(h("pre", { class: "plain", text: String(text) }));
        }
        previewBox.scrollIntoView({ block: "start" });
      }).catch(function () { setBusy(previewBtn, false); });
    });

    testBtn.addEventListener("click", function () {
      clearNotice();
      setBusy(testBtn, true, "Sending");
      ensureSaved().then(function () {
        return guarded(call("send_test", { id: c.id }), "while sending the test");
      }).then(function () {
        setBusy(testBtn, false);
        refreshCampaignControls();
        showNotice("good", "A test is on its way to " + state.email + ". It can take a minute to arrive.");
      }).catch(function () { setBusy(testBtn, false); });
    });

    delBtn.addEventListener("click", function () {
      clearNotice();
      ask({ title: "Delete this draft?", body: "The draft will be removed. This cannot be undone.", confirmLabel: "Delete draft", danger: true }).then(function (r) {
        if (!r.ok) return;
        setBusy(delBtn, true, "Deleting");
        return guarded(call("delete_campaign", { id: c.id }), "while deleting").then(function () {
          state.campaign = null;
          state.campaignDirty = false;
          showNotice("good", "Draft deleted.");
          renderShell();
        });
      }).catch(function () { setBusy(delBtn, false); });
    });

    sendBtn.addEventListener("click", function () {
      clearNotice();
      var shown = audienceCount();
      setBusy(sendBtn, true, "Checking the number");
      loadOverview().then(function () {
        setBusy(sendBtn, false);
        var live = audienceCount();
        refreshCampaignControls();
        if (live !== shown) {
          showNotice("warn", "The number of members changed to " + live + ". Check the new number and press send again.");
          return null;
        }
        if (live === 0) return null;
        var more = c.status === "partial" ? " Anyone who already has it will not get it again." : "";
        return ask({
          title: "Send to " + plural(live, "member", "members") + "?",
          body: "\"" + c.subject + "\" will be emailed to " + plural(live, "member", "members") + ". This cannot be undone." + more,
          confirmLabel: "Send to " + plural(live, "member", "members"),
          danger: false
        }).then(function (r) {
          if (!r.ok) return null;
          setBusy(sendBtn, true, "Sending. Keep this page open");
          return call("send_campaign", { id: c.id, expected_recipients: live }, 170000).then(function (data) {
            return afterSend(data);
          }, function (err) {
            if (err instanceof ApiError && err.status === 401) { signOut("Your sign-in has ended. Ask for a new link."); throw err; }
            return loadOverview().then(function () {
              var fresh = campaignsList().filter(function (x) { return x.id === c.id; })[0];
              if (fresh) { var keep = c.body; Object.assign(c, copyCampaign(fresh)); c.body = fresh.body || keep; }
              var text;
              if (err instanceof ApiError && err.status === 409) text = "The number of members changed, so nothing was sent. Check the new number and press send again.";
              else if (err instanceof ApiError && err.status === 0) text = "The connection dropped while sending. Check the status below before you try again.";
              else text = friendly(err, "while sending") + " Check the status below before you try again.";
              showNotice("error", text);
              renderShell();
            });
          });
        });
      }).catch(function () { setBusy(sendBtn, false); });
    });

    function afterSend(data) {
      return loadOverview().then(function () {
        var fresh = campaignsList().filter(function (x) { return x.id === c.id; })[0];
        if (fresh) Object.assign(c, copyCampaign(fresh), { body: c.body });
        var sentCount = Number(pick(data, ["sent", "sent_count"], c.sent_count)) || 0;
        var failedCount = Number(pick(data, ["failed", "failed_count"], c.failed_count)) || 0;
        if (failedCount > 0 || c.status === "partial") {
          showNotice("warn", "Sent to " + plural(sentCount, "member", "members") + ". " + failedCount + " did not send. Press send again to try only those who have not had it.");
        } else {
          showNotice("good", "Sent to " + plural(sentCount, "member", "members") + ".");
        }
        renderShell();
      });
    }

    focusHeading();
    // Keep the live number fresh when the editor opens.
    var hadOverview = !!state.overview;
    loadOverview().then(function () {
      if (!document.getElementById("f-survey")) return;
      if (hadOverview) refreshCampaignControls(); else renderShell();
    }, function () {});
  }

  function leaveCampaign() {
    function go() { state.campaign = null; state.campaignDirty = false; state.preview = null; renderShell(); }
    if (state.campaign && state.campaignDirty) {
      ask({ title: "Leave without saving?", body: "Your changes to this email have not been saved.", confirmLabel: "Leave", danger: true }).then(function (r) { if (r.ok) go(); });
    } else {
      go();
    }
  }

  /* ---------- surveys ---------- */

  var SURVEY_STATUS = { draft: "Draft", open: "Open", closed: "Closed" };
  var TYPE_LABEL = { single: "One answer", multi: "Several answers", text: "Written answer" };

  function newSurvey() {
    return { id: null, title: "", intro: "", status: "draft", questions: [blankQuestion([])] };
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
      questions: (Array.isArray(s.questions) ? s.questions : []).map(function (q) {
        return { id: q.id, type: q.type, prompt: q.prompt || "", optionsText: (q.options || []).join("\n"), required: !!q.required };
      })
    };
  }

  function surveyItem(s) {
    var count = Number(pick(s, ["response_count", "responses", "answer_count", "total_responses"], 0)) || 0;
    var meta = [SURVEY_STATUS[s.status] || s.status, plural(count, "answer", "answers")];
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
      if (q.type !== "text") {
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
        if (q.type !== "text") out.options = parseOptions(q.optionsText);
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
        if (q.type === "text") optsWrap.classList.add("hidden");
        var req = h("input", { type: "checkbox", id: "q-" + i + "-req" });
        req.checked = !!q.required;
        if (!editable) { prompt.disabled = true; type.disabled = true; opts.disabled = true; req.disabled = true; }
        prompt.addEventListener("input", function () { q.prompt = prompt.value; refresh(); });
        opts.addEventListener("input", function () { q.optionsText = opts.value; refresh(); });
        req.addEventListener("change", function () { q.required = req.checked; });
        type.addEventListener("change", function () {
          q.type = type.value;
          if (q.type === "text") optsWrap.classList.add("hidden"); else optsWrap.classList.remove("hidden");
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
        var blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "volyume-survey-" + (s.title || "answers").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") + ".csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      }).catch(function () { setBusy(dl, false); });
    });
    body.appendChild(h("div", { class: "row" }, [dl]));
    focusHeading();
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
