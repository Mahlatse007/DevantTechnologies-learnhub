"use strict";

// Static hosting has no backend yet. I Will Set STATIC_MODE to false once the Python backend is live.
const STATIC_MODE = true;
const CONTACT_EMAIL = "mahlatsemakgati72@gmail.com";

// ---------- helpers ----------
async function api(path, method, body) {
  try {
    const res = await fetch(path, {
      method: method || "GET",
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
      credentials: "same-origin",
    });

    let data = {};
    try {
      data = await res.json();
    } catch (e) {
      /* no JSON body */
    }
    return { ok: res.ok, status: res.status, data: data };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      data: { detail: "Could not reach the server. Check your connection." },
    };
  }
}

function show(el, text, ok) {
  el.textContent = text;
  el.className = "msg " + (ok ? "ok" : "error");
}

const FIELD_NAMES = {
  first_name: "first name",
  last_name: "last name",
  email: "email",
  username: "username",
  contact_number: "contact number",
  role: "role",
  password: "password",
  consent: "consent",
  name: "name",
  message: "message",
};

function errorText(r) {
  let text = r.data && typeof r.data.detail === "string" ? r.data.detail : "Something went wrong. Please try again.";
  if (r.status === 422 && Array.isArray(r.data.fields) && r.data.fields.length) {
    text += " Check: " + r.data.fields.map(function (f) {
          return FIELD_NAMES[f] || f;
        })
        .join(", ") + ".";
  }
  return text;
}

function val(id) {
  return document.getElementById(id).value;
}


// form submit with a disabled button and an inline message.
function handleForm(form, onSubmit) {
  const msg = form.querySelector(".msg");
  const btn = form.querySelector("button[type=submit]");
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    msg.textContent = "";
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    btn.disabled = true;
    try {
      await onSubmit(msg);
    } finally {
      btn.disabled = false;
    }
  });
}

// ---------- static mode (no backend) ----------
function accountsClosed(form) {
  form.querySelectorAll("input, select, button").forEach(function (el) {
    el.disabled = true;
  });
  const note = document.createElement("p");
  note.className = "msg ok";
  note.textContent = "Accounts are opening soon. For now, please use the contact form on the home page for any enquiries.";
  form.prepend(note);
}

function contactByEmail(form) {
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    if (val("c-website")) return;
    const body = "Name: " + val("c-name") + "\nEmail: " + val("c-email") + "\n\n" + val("c-message");
    window.location.href = "mailto:" + CONTACT_EMAIL + "?subject=" + encodeURIComponent("LearnHub enquiry from " + val("c-name")) + "&body=" + encodeURIComponent(body);
    show(
      form.querySelector(".msg"),
      "Opening your email app. Please press send to reach us.",
      true,
    );
  });
}

// ---------- login page ----------
const loginForm = document.getElementById("login-form");
if (loginForm && STATIC_MODE) {
  accountsClosed(loginForm);
} else if (loginForm) {
  handleForm(loginForm, async function (msg) {
    const r = await api("/api/login", "POST", {
      email: val("email"),
      password: val("password"),
    });
    if (!r.ok) return show(msg, errorText(r), false);
    window.location.href = r.data.redirect;
  });
}

// ---------- register form ----------
const registerForm = document.getElementById("register-form");
if (registerForm && STATIC_MODE) {
  accountsClosed(registerForm);
} else if (registerForm) {
  handleForm(registerForm, async function (msg) {
    if (val("password") !== val("confirm"))
      return show(msg, "Passwords do not match.", false);
    if (!/[A-Za-z]/.test(val("password")) || !/\d/.test(val("password"))) {
      return show(msg, "Password must contain letters and numbers.", false);
    }
    const r = await api("/api/register", "POST", {
      first_name: val("first_name"),
      last_name: val("last_name"),
      email: val("email"),
      username: val("username"),
      contact_number: val("contact_number"),
      role: val("role"),
      password: val("password"),
      consent: document.getElementById("consent").checked,
    });
    if (!r.ok) return show(msg, errorText(r), false);
    show(msg, "Account created. Taking you to the login page...", true);
    setTimeout(function () {
      window.location.href = "/login";
    }, 1200);
  });
}

// ---------- contact form----------
const contactForm = document.getElementById("contact-form");
if (contactForm && STATIC_MODE) {
  contactByEmail(contactForm);
} else if (contactForm) {
  handleForm(contactForm, async function (msg) {
    const r = await api("/api/contact", "POST", {
      name: val("c-name"),
      email: val("c-email"),
      message: val("c-message"),
      website: val("c-website"),
    });
    if (!r.ok) return show(msg, errorText(r), false);
    show(msg, r.data.message, true);
    contactForm.reset();
  });
}

// ---------- dashboards ----------
const page = document.body.dataset.page;

const logoutBtn = document.getElementById("logout");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async function () {
    await api("/api/logout", "POST");
    window.location.href = "/login";
  });
}

function cell(row, text) {
  const td = document.createElement("td");
  td.textContent = text;
  row.appendChild(td);
  return td;
}

function pillCell(row, text, cls) {
  const td = document.createElement("td");
  const span = document.createElement("span");
  span.className = "pill " + cls;
  span.textContent = text;
  td.appendChild(span);
  row.appendChild(td);
}

function setText(id, value) {
  document.getElementById(id).textContent = String(value);
}

function fmtDate(iso) {
  return new Date(iso).toLocaleString("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

async function loadAdmin() {
  const msg = document.getElementById("admin-msg");
  const usersBody = document.getElementById("users-body");
  const msgsBody = document.getElementById("messages-body");

  const [u, m] = await Promise.all([
    api("/api/admin/users"),
    api("/api/admin/messages"),
  ]);
  if (u.status === 401 || u.status === 403) {
    window.location.href = "/login";
    return;
  }
  if (!u.ok) return show(msg, errorText(u), false);

  setText("tile-total", u.data.length);
  setText(
    "tile-students",
    u.data.filter(function (x) {
      return x.role === "Student";
    }).length,
  );
  setText(
    "tile-tutors",
    u.data.filter(function (x) {
      return x.role === "Tutor";
    }).length,
  );
  setText("tile-messages", m.ok ? m.data.length : 0);

  usersBody.replaceChildren();
  u.data.forEach(function (user) {
    const tr = document.createElement("tr");
    cell(tr, user.first_name + " " + user.last_name);
    cell(tr, user.email);
    cell(tr, user.contact_number);
    pillCell(tr, user.role, user.role.toLowerCase());
    pillCell(
      tr,
      user.is_active ? "Active" : "Deactivated",
      user.is_active ? "on" : "off",
    );
    cell(tr, fmtDate(user.created_at));
    const action = document.createElement("td");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn small secondary";
    btn.textContent = user.is_active ? "Deactivate" : "Reactivate";
    btn.addEventListener("click", async function () {
      const r = await api(
        "/api/admin/users/" + user.id + "/toggle-active",
        "POST",
      );
      if (!r.ok) return show(msg, errorText(r), false);
      loadAdmin();
    });
    action.appendChild(btn);
    tr.appendChild(action);
    usersBody.appendChild(tr);
  });

  msgsBody.replaceChildren();
  if (m.ok && m.data.length === 0) {
    const tr = document.createElement("tr");
    const td = cell(tr, "No messages yet.");
    td.colSpan = 4;
    msgsBody.appendChild(tr);
  } else if (m.ok) {
    m.data.forEach(function (item) {
      const tr = document.createElement("tr");
      cell(tr, fmtDate(item.created_at));
      cell(tr, item.name);
      cell(tr, item.email);
      cell(tr, item.message);
      msgsBody.appendChild(tr);
    });
  }
}

async function loadDashboard() {
  const r = await api("/api/me");
  if (!r.ok) {
    window.location.href = "/login";
    return;
  }
  const welcome = document.getElementById("welcome");
  if (welcome) welcome.textContent = "Welcome, " + r.data.first_name;
  if (page === "admin") loadAdmin();
}

if (page === "student" || page === "tutor" || page === "admin") loadDashboard();

//Estimate cost
const PRICING = {
  "Grade 8 - Grade 9":   { base: 250, extraStudent: 50,  extraSubject: 20 },
  "Grade 10 - Grade 12": { base: 300, extraStudent: 50,  extraSubject: 20 },
  "Undergraduate":       { base: 350, extraStudent: 100, extraSubject: 50 }
};

const btn          = document.getElementById("estimate-btn");
const output       = document.getElementById("estimate-cost");
const studentsEl   = document.getElementById("nostudents");
const subjectsEl   = document.getElementById("nosubjects");
const sessionsEl   = document.getElementById("nosession");
const gradeEl      = document.getElementById("grade");

// Lock the other field when one of them goes above 1
function enforceRules() {
  const students = parseInt(studentsEl.value, 10) || 0;
  const subjects = parseInt(subjectsEl.value, 10) || 0;

  if (students > 1) {
    subjectsEl.value = 1;
    subjectsEl.disabled = true;
    subjectsEl.title = "Multiple students can only take 1 subject.";
  } else {
    subjectsEl.disabled = false;
    subjectsEl.title = "";
  }

  if (subjects > 1) {
    studentsEl.value = 1;
    studentsEl.disabled = true;
    studentsEl.title = "Multiple subjects are only available for 1 student.";
  } else {
    studentsEl.disabled = false;
    studentsEl.title = "";
  }
}

studentsEl.addEventListener("input", enforceRules);
subjectsEl.addEventListener("input", enforceRules);

btn.addEventListener("click", () => {
  const students = parseInt(studentsEl.value, 10);
  const subjects = parseInt(subjectsEl.value, 10);
  const sessions = parseInt(sessionsEl.value, 10);
  const grade    = gradeEl.value;

  // Validation
  if (!students || !subjects || !sessions || !grade ||
      students < 1 || subjects < 1 || sessions < 1) {
    output.textContent = "Please fill in all fields with valid numbers.";
    return;
  }

  // Restriction: more students OR more subjects, not both
  if (students > 1 && subjects > 1) {
    output.textContent =
      "You can have more than 1 student or more than 1 subject, but not both.";
    return;
  }

  const { base, extraStudent, extraSubject } = PRICING[grade];

  let perSession = 0;

  if (students > 1) {
    // 1 subject, several students
    for (let s = 1; s <= students; s++) {
      perSession += base - (s > 1 ? extraStudent : 0);
    }
  } else {
    // 1 student, several subjects
    for (let sub = 1; sub <= subjects; sub++) {
      perSession += base - (sub > 1 ? extraSubject : 0);
    }
  }

  const total = perSession * sessions;

  output.textContent = "R" + total.toLocaleString("en-ZA");
});

