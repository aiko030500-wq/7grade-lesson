(() => {
  const $app = document.querySelector("#app");

  // ---------- Storage helpers ----------
  const LS = {
    get(k, def) {
      try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch { return def; }
    },
    set(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
  };

  // ---------- State ----------
  const state = {
    user: LS.get("aib_excel7_user", null), // { role:'student'|'teacher', login, pin }
    route: LS.get("aib_excel7_route", { screen: "login" }), // screen + ids
  };

  const APP = () => window.APP_DATA;

  const keyUser = () => state.user ? `${state.user.role}:${state.user.login}` : "anon";
  const keyProgress = (login) => `aib_excel7_progress:${login}`;
  const keyJournal = () => `aib_excel7_journal`; // teacher log

  function nowISO() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function saveRoute() { LS.set("aib_excel7_route", state.route); }
  function saveUser() { LS.set("aib_excel7_user", state.user); }

  // ---------- Journal ----------
  function addJournalEntry(entry) {
    const j = LS.get(keyJournal(), []);
    j.unshift({ ...entry, at: nowISO() });
    LS.set(keyJournal(), j.slice(0, 400)); // limit
  }

  // ---------- Progress ----------
  function getProgress(login) {
    return LS.get(keyProgress(login), { stars: 0, done: {} }); // done[lessonKey]= { stars, doneAt }
  }
  function setProgress(login, p) { LS.set(keyProgress(login), p); }

  function lessonKey(moduleId, lessonNo) { return `${moduleId}|${lessonNo}`; }

  // ---------- UI helpers ----------
  function h(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") el.className = v;
      else if (k === "html") el.innerHTML = v;
      else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v);
    }
    for (const c of children) el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    return el;
  }

  function topbar(title, rightNodes = []) {
    const userBadge = state.user
      ? `${state.user.role === "teacher" ? "Teacher" : "Student"} · ${state.user.login}`
      : "Not logged in";

    return h("div", { class: "topbar" }, [
      h("div", { class: "row" }, [
        h("div", { class: "brand" }, [
          h("h1", {}, [title]),
          h("span", { class: "badge" }, [userBadge]),
        ]),
        h("div", { class: "row" }, rightNodes),
      ])
    ]);
  }

  function container(children = []) {
    return h("div", { class: "container" }, children);
  }

  function btn(text, cls, onClick, disabled = false) {
    return h("button", { class: `btn ${cls || ""}`.trim(), onclick: onClick, disabled }, [text]);
  }

  function navTo(route) {
    state.route = route;
    saveRoute();
    render();
  }

  function logout() {
    state.user = null;
    saveUser();
    navTo({ screen: "login" });
  }

  // ---------- Screens ----------
  function screenLogin() {
    const allowed = (APP().auth?.allowedLogins || []);
    const studentPin = APP().auth?.studentPin || "2844";
    const teacherPin = APP().auth?.teacherPin || "3244";

    let login = "";
    let pin = "";

    const loginInput = h("input", {
      class: "input",
      placeholder: "Login (например: 7BLr1 или 7VSt16)",
      oninput: (e) => login = e.target.value.trim()
    });

    const pinInput = h("input", {
      class: "input",
      placeholder: "PIN",
      type: "password",
      oninput: (e) => pin = e.target.value.trim()
    });

    const msg = h("div", { class: "small", html: "" });

    function doLogin() {
      const L = login.trim();
      const P = pin.trim();

      if (!L || !P) {
        msg.innerHTML = "Введите login и PIN.";
        return;
      }

      if (P === teacherPin) {
        state.user = { role: "teacher", login: L, pin: P };
        saveUser();
        addJournalEntry({ type: "teacher_login", login: L });
        navTo({ screen: "modules" });
        return;
      }

      if (P === studentPin) {
        if (!allowed.includes(L)) {
          msg.innerHTML = "Этот login не разрешён (проверь формат).";
          return;
        }
        state.user = { role: "student", login: L, pin: P };
        saveUser();
        addJournalEntry({ type: "student_login", login: L });
        navTo({ screen: "modules" });
        return;
      }

      msg.innerHTML = "Неверный PIN.";
    }

    const body = container([
      h("div", { class: "card" }, [
        h("h2", {}, [APP().appTitle || "AI Bayan · Excel 7"]),
        h("div", { class: "small" }, ["Вход только для 7 класса (Excel 7)."]),
        h("div", { class: "hr" }),
        h("div", { class: "row" }, [h("div", { class: "spacer" }), h("span", { class: "pill kpi" })]),
        h("div", { class: "row" }, [
          h("div", { style: "flex:1;min-width:240px" }, [loginInput]),
          h("div", { style: "flex:1;min-width:200px" }, [pinInput]),
        ]),
        h("div", { class: "row", style: "margin-top:10px" }, [
          btn("Войти", "primary", doLogin),
          btn("Очистить кэш (прогресс)", "danger", () => {
            if (confirm("Удалить прогресс и журнал на этом устройстве?")) {
              Object.keys(localStorage).forEach(k => {
                if (k.startsWith("aib_excel7_")) localStorage.removeItem(k);
              });
              state.user = null;
              saveUser();
              msg.innerHTML = "Очищено. Обнови страницу.";
            }
          })
        ]),
        h("div", { style: "margin-top:10px" }, [msg]),
        h("div", { class: "hr" }),
        h("div", { class: "small" }, [
          "Подсказка: если «не открывается», проверь Console (F12) и что index.html подключает data.js ДО app.js."
        ])
      ])
    ]);

    return body;
  }

  function screenModules() {
    const modules = APP().modules || [];
    const login = state.user?.login || "anon";
    const role = state.user?.role;

    const prog = role === "student" ? getProgress(login) : null;

    const cards = modules.map(m => {
      const doneCount = role === "student"
        ? Object.keys(prog.done).filter(k => k.startsWith(`${m.id}|`)).length
        : 0;

      const leftColor = m.color || "#0aa35f";

      return h("div", { class: "card moduleCard", style: `border-left-color:${leftColor}` }, [
        h("div", { class: "moduleTitle" }, [
          h("div", {}, [
            h("b", {}, [m.title]),
            h("div", { class: "small" }, [`Lessons: ${m.lessonsCount || 8}`]),
          ]),
          role === "student"
            ? h("span", { class: "star" }, [`⭐ ${prog.stars} · Done ${doneCount}/8`])
            : h("span", { class: "star" }, ["👩‍🏫 Teacher"])
        ]),
        h("div", { class: "row", style: "margin-top:10px" }, [
          btn("Open", "primary", () => navTo({ screen: "lessons", moduleId: m.id })),
          btn("PDF", "", () => {
            const pdf = APP().bookPdf;
            if (!pdf) alert("PDF не задан (bookPdf).");
            else window.open(pdf, "_blank");
          })
        ])
      ]);
    });

    const right = [
      role === "teacher"
        ? btn("Journal", "", () => navTo({ screen: "journal" }))
        : btn("My progress", "", () => navTo({ screen: "progress" })),
      btn("Logout", "", logout)
    ];

    return h("div", {}, [
      topbar(APP().appTitle || "AI Bayan · Excel 7", right),
      container([
        h("div", { class: "grid" }, cards)
      ]),
      footerBar()
    ]);
  }

  function screenLessons(moduleId) {
    const m = (APP().modules || []).find(x => x.id === moduleId);
    if (!m) return screenModules();

    const role = state.user?.role;
    const login = state.user?.login || "anon";
    const prog = role === "student" ? getProgress(login) : null;

    const items = [];
    for (let i = 1; i <= (m.lessonsCount || 8); i++) {
      const k = lessonKey(moduleId, i);
      const data = APP().lessonContent?.[k];
      const done = role === "student" && prog.done[k];
      items.push(h("button", {
        class: `lessonBtn ${done ? "done" : ""}`,
        onclick: () => navTo({ screen: "lesson", moduleId, lessonNo: i })
      }, [
        h("div", { class: "t" }, [`Lesson ${i}`]),
        h("div", { class: "s" }, [data?.title || "Lesson"]),
        role === "student"
          ? h("div", { class: "s" }, [done ? `⭐ ${done.stars || 0} · done` : "not done"])
          : h("div", { class: "s" }, [""])
      ]));
    }

    const right = [
      btn("Back", "", () => navTo({ screen: "modules" })),
      btn("Logout", "", logout)
    ];

    return h("div", {}, [
      topbar(m.title, right),
      container([
        h("div", { class: "card" }, [
          h("div", { class: "kpi" }, [
            h("span", { class: "pill" }, [`Module: ${m.id}`]),
            h("span", { class: "pill" }, [`Lessons: ${m.lessonsCount || 8}`]),
            state.user?.role === "student"
              ? h("span", { class: "pill" }, [`⭐ Total stars: ${prog.stars}`])
              : h("span", { class: "pill" }, ["Teacher mode"])
          ]),
          h("div", { class: "hr" }),
          h("div", { class: "lessonList" }, items)
        ])
      ]),
      footerBar()
    ]);
  }

  function screenLesson(moduleId, lessonNo) {
    const k = lessonKey(moduleId, lessonNo);
    const lesson = APP().lessonContent?.[k];
    if (!lesson) return screenLessons(moduleId);

    const role = state.user?.role;
    const login = state.user?.login || "anon";
    const prog = role === "student" ? getProgress(login) : null;

    // if already done, lock attempts
    const alreadyDone = role === "student" && !!prog.done[k];
    const localAnswersKey = `aib_excel7_answers:${login}:${k}`;
    const answers = LS.get(localAnswersKey, {}); // { exId: ... }

    let earnedNow = 0;

    function finishLesson() {
      if (role !== "student") return;
      if (alreadyDone) return;

      // count completed exercises (simple rule)
      const ex = lesson.exercises || [];
      const doneCount = ex.filter(e => answers[e.id] !== undefined).length;
      // ⭐ 1 star if at least 3/5 done, ⭐ 2 if 5/5 done
      const starsEarned = doneCount >= 5 ? 2 : (doneCount >= 3 ? 1 : 0);

      const p = getProgress(login);
      p.stars += starsEarned;
      p.done[k] = { stars: starsEarned, doneAt: nowISO() };
      setProgress(login, p);

      addJournalEntry({ type: "lesson_done", login, lesson: k, stars: starsEarned });
      navTo({ screen: "lessons", moduleId });
    }

    function saveAnswer(exId, value) {
      if (role !== "student") return;
      if (alreadyDone) return;
      answers[exId] = value;
      LS.set(localAnswersKey, answers);
    }

    function renderExercise(exObj) {
      const wrap = h("div", { class: "exercise" }, [
        h("h3", {}, [exObj.title || "Exercise"]),
        exObj.note ? h("div", { class: "small", style: "margin:-4px 0 8px" }, [exObj.note]) : h("div")
      ]);

      // MCQ
      if (exObj.type === "mcq") {
        exObj.items?.forEach((it, idx) => {
          const qBox = h("div", { style: "margin-top:10px" }, [
            h("div", { class: "q" }, [it.q]),
            h("div", { class: "opts" }, [])
          ]);
          const opts = qBox.querySelector(".opts");
          const chosen = answers[exObj.id]?.[idx];

          it.opts.forEach(opt => {
            const b = h("div", {
              class: "opt",
              onclick: () => {
                if (role !== "student" || alreadyDone) return;
                const current = answers[exObj.id] || {};
                current[idx] = opt;
                saveAnswer(exObj.id, current);
                render();
              }
            }, [opt]);

            if (chosen) {
              if (opt === it.a && chosen === opt) b.classList.add("correct");
              else if (chosen === opt && opt !== it.a) b.classList.add("wrong");
            }
            opts.appendChild(b);
          });

          wrap.appendChild(qBox);
        });

        return wrap;
      }

      // Complete (inputs)
      if (exObj.type === "complete") {
        exObj.items?.forEach((it, idx) => {
          const row = h("div", { style: "margin-top:10px" }, [
            h("div", { class: "q" }, [it.q]),
          ]);

          const input = h("input", {
            class: "input",
            placeholder: "Type answer...",
            value: (answers[exObj.id]?.[idx] ?? ""),
            oninput: (e) => {
              if (role !== "student" || alreadyDone) return;
              const current = answers[exObj.id] || {};
              current[idx] = e.target.value;
              saveAnswer(exObj.id, current);
            }
          });

          const checkBtn = btn("Check", "", () => {
            if (role !== "student") return;
            const val = (answers[exObj.id]?.[idx] ?? "").trim().toLowerCase();
            const ok = val === String(it.a).trim().toLowerCase();
            alert(ok ? "✅ Correct" : `❌ Wrong\nCorrect: ${it.a}`);
          }, alreadyDone);

          row.appendChild(h("div", { class: "row" }, [
            h("div", { style: "flex:1;min-width:220px" }, [input]),
            checkBtn
          ]));

          wrap.appendChild(row);
        });

        // mark as done when any input exists
        const any = exObj.items?.some((_, i) => (answers[exObj.id]?.[i] || "").trim().length > 0);
        if (any) saveAnswer(exObj.id, answers[exObj.id] || {}); // ensure present

        return wrap;
      }

      // True/False
      if (exObj.type === "tf") {
        exObj.items?.forEach((it, idx) => {
          const chosen = answers[exObj.id]?.[idx]; // true/false
          const row = h("div", { class: "tfRow", style: "margin-top:10px" }, [
            h("div", { class: "q", style: "margin:0" }, [it.q]),
            h("div", { class: "tfBtns" }, [])
          ]);
          const btns = row.querySelector(".tfBtns");

          const mk = (label, val) => h("button", {
            class: "smallBtn",
            onclick: () => {
              if (role !== "student" || alreadyDone) return;
              const current = answers[exObj.id] || {};
              current[idx] = val;
              saveAnswer(exObj.id, current);
              render();
            }
          }, [label]);

          const bT = mk("True", true);
          const bF = mk("False", false);

          if (chosen !== undefined) {
            if (chosen === true && it.a === true) bT.style.outline = "2px solid rgba(10,163,95,.35)";
            if (chosen === false && it.a === false) bF.style.outline = "2px solid rgba(10,163,95,.35)";
            if (chosen === true && it.a === false) bT.style.outline = "2px solid rgba(239,68,68,.25)";
            if (chosen === false && it.a === true) bF.style.outline = "2px solid rgba(239,68,68,.25)";
          }

          btns.appendChild(bT);
          btns.appendChild(bF);
          wrap.appendChild(row);
        });

        return wrap;
      }

      // Writing
      if (exObj.type === "writing") {
        const text = answers[exObj.id] ?? "";
        const ta = h("textarea", {
          placeholder: exObj.writing?.placeholder || "Write here...",
        });
        ta.value = text;

        ta.addEventListener("input", () => {
          if (role !== "student" || alreadyDone) return;
          saveAnswer(exObj.id, ta.value);
        });

        const plan = exObj.writing?.plan || [];
        wrap.appendChild(h("div", { class: "small" }, [plan.length ? ("Plan: " + plan.join(" · ")) : ""]));
        wrap.appendChild(ta);

        wrap.appendChild(h("div", { class: "row", style: "margin-top:10px" }, [
          btn("Mark done", "primary", () => {
            if (role !== "student" || alreadyDone) return;
            if ((ta.value || "").trim().length < 10) {
              alert("Напиши хотя бы 10 символов.");
              return;
            }
            saveAnswer(exObj.id, ta.value);
            alert("✅ Saved");
          }, alreadyDone),
        ]));

        return wrap;
      }

      // Reading block (if any)
      if (exObj.type === "reading") {
        wrap.appendChild(h("div", { class: "small" }, [exObj.text || ""]));
        return wrap;
      }

      // Default fallback
      wrap.appendChild(h("div", { class: "small" }, ["(Unsupported exercise type)"]));
      return wrap;
    }

    const right = [
      btn("Back to lessons", "", () => navTo({ screen: "lessons", moduleId })),
      btn("Modules", "", () => navTo({ screen: "modules" })),
      btn("Logout", "", logout)
    ];

    const vocabCards = (lesson.vocabCards || []).map(v => h("div", { class: "vocab" }, [
      h("div", { class: "en" }, [v.emoji ? `${v.emoji} ${v.en}` : v.en]),
      h("div", { class: "ru" }, [v.ru || ""]),
      h("div", { class: "small", style: "margin-top:6px" }, [
        "🔊 ",
        h("a", {
          href: "#",
          onclick: (e) => {
            e.preventDefault();
            const text = v.tts || v.en;
            try {
              const u = new SpeechSynthesisUtterance(text);
              u.lang = "en-US";
              speechSynthesis.cancel();
              speechSynthesis.speak(u);
            } catch {
              alert("TTS не поддерживается на этом устройстве.");
            }
          }
        }, ["Speak"])
      ])
    ]));

    const content = container([
      h("div", { class: "card" }, [
        h("div", { class: "row" }, [
          h("div", {}, [
            h("h2", {}, [lesson.title || `Lesson ${lessonNo}`]),
            h("div", { class: "small" }, [`Key: ${k}`]),
          ]),
          h("div", { class: "spacer" }),
          role === "student"
            ? h("span", { class: "star" }, [alreadyDone ? `✅ Done · ⭐ ${prog.done[k].stars}` : "⭐ Try (1 attempt)"])
            : h("span", { class: "star" }, ["👩‍🏫 Teacher view"])
        ]),
        lesson.bookPage ? h("div", { class: "small" }, [`Book page: ${lesson.bookPage}`]) : h("div"),
        h("div", { class: "hr" }),
        h("div", { class: "kpi" }, [
          btn("Print", "", () => window.print()),
          btn("Open PDF", "", () => {
            const pdf = APP().bookPdf;
            if (!pdf) alert("PDF не задан (bookPdf).");
            else window.open(pdf, "_blank");
          })
        ])
      ]),

      (lesson.vocabCards && lesson.vocabCards.length)
        ? h("div", { class: "card", style: "margin-top:12px" }, [
            h("h2", {}, ["Vocabulary"]),
            h("div", { class: "vocabWrap" }, vocabCards)
          ])
        : h("div"),

      h("div", { class: "card", style: "margin-top:12px" }, [
        h("h2", {}, ["Exercises"]),
        h("div", { class: "small" }, [
          role === "student"
            ? (alreadyDone ? "Урок закрыт (попытка использована)." : "Сделай упражнения и нажми Finish.")
            : "Teacher mode: ответы не сохраняются."
        ]),
        h("div", { class: "hr" }),

        ...(lesson.exercises || []).map(renderExercise),

        h("div", { class: "hr" }),
        role === "student"
          ? h("div", { class: "row" }, [
              btn("Finish lesson", "primary", finishLesson, alreadyDone),
              btn("Reset this lesson (answers)", "danger", () => {
                if (alreadyDone) return alert("Урок уже закрыт. Сброс запрещён.");
                if (confirm("Удалить ответы в этом уроке?")) {
                  localStorage.removeItem(localAnswersKey);
                  render();
                }
              }, alreadyDone),
            ])
          : h("div", { class: "small" }, [""])
      ])
    ]);

    return h("div", {}, [
      topbar(APP().appTitle || "AI Bayan · Excel 7", right),
      content,
      footerBar()
    ]);
  }

  function screenProgress() {
    const login = state.user?.login;
    if (!login || state.user?.role !== "student") return screenModules();

    const p = getProgress(login);
    const rows = Object.entries(p.done)
      .sort((a,b) => (b[1].doneAt || "").localeCompare(a[1].doneAt || ""))
      .slice(0, 200);

    const list = rows.length
      ? rows.map(([k, v]) =>
          h("div", { class: "card", style: "margin-top:10px" }, [
            h("b", {}, [k]),
            h("div", { class: "small" }, [`⭐ ${v.stars || 0} · ${v.doneAt || ""}`])
          ])
        )
      : [h("div", { class: "card" }, [h("div", { class: "small" }, ["No completed lessons yet."])])];

    return h("div", {}, [
      topbar("My progress", [
        btn("Back", "", () => navTo({ screen: "modules" })),
        btn("Logout", "", logout)
      ]),
      container([
        h("div", { class: "card" }, [
          h("h2", {}, [`⭐ Total stars: ${p.stars}`]),
          h("div", { class: "small" }, ["Completed lessons list (saved on this device)."])
        ]),
        ...list
      ]),
      footerBar()
    ]);
  }

  function screenJournal() {
    if (state.user?.role !== "teacher") return screenModules();

    const j = LS.get(keyJournal(), []);
    const cards = j.length
      ? j.slice(0, 120).map(e => h("div", { class: "card", style: "margin-top:10px" }, [
          h("b", {}, [`${e.type}`]),
          h("div", { class: "small" }, [`login: ${e.login || "-"} · lesson: ${e.lesson || "-"} · stars: ${e.stars ?? "-"} · ${e.at}`])
        ]))
      : [h("div", { class: "card" }, [h("div", { class: "small" }, ["Journal empty."])])];

    return h("div", {}, [
      topbar("Teacher journal", [
        btn("Back", "", () => navTo({ screen: "modules" })),
        btn("Clear journal", "danger", () => {
          if (confirm("Очистить журнал?")) {
            LS.set(keyJournal(), []);
            render();
          }
        }),
        btn("Logout", "", logout)
      ]),
      container(cards),
      footerBar()
    ]);
  }

  function footerBar() {
    const role = state.user?.role;
    const login = state.user?.login || "";
    const p = role === "student" ? getProgress(login) : null;

    const left = role === "student"
      ? `⭐ ${p.stars} · Done ${Object.keys(p.done).length}`
      : (role === "teacher" ? "👩‍🏫 Teacher mode" : "");

    return h("div", { class: "footerBar" }, [
      h("div", { class: "row" }, [
        h("span", { class: "badge" }, [left]),
        h("span", { class: "spacer" }),
        btn("Modules", "", () => navTo({ screen: "modules" }), !state.user),
      ])
    ]);
  }

  // ---------- Main render ----------
  function render() {
    if (!window.APP_DATA) {
      $app.innerHTML = `<div style="padding:16px;font-family:system-ui">
        ❌ APP_DATA не найден. Проверь: data.js подключён ДО app.js в index.html
      </div>`;
      return;
    }

    // Normalize route
    if (!state.user) state.route = { screen: "login" };

    $app.innerHTML = "";
    let screenEl;

    switch (state.route.screen) {
      case "login":
        screenEl = screenLogin(); break;
      case "modules":
        screenEl = screenModules(); break;
      case "lessons":
        screenEl = screenLessons(state.route.moduleId); break;
      case "lesson":
        screenEl = screenLesson(state.route.moduleId, state.route.lessonNo); break;
      case "progress":
        screenEl = screenProgress(); break;
      case "journal":
        screenEl = screenJournal(); break;
      default:
        screenEl = screenModules();
    }

    $app.appendChild(screenEl);
  }

  // restore last screen if logged in
  if (state.user && state.route?.screen && state.route.screen !== "login") {
    // ok
  } else {
    state.route = { screen: "login" };
    saveRoute();
  }

  render();
})();
