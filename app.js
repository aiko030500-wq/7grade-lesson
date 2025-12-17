(() => {
  const $app = document.querySelector("#app");

  // ---------- Storage helpers ----------
  const LS = {
    get(k, def) { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch { return def; } },
    set(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
  };

  const APP = () => window.APP_DATA;

  // ---------- Keys ----------
  const keyUser = "aib_excel7_user";
  const keyRoute = "aib_excel7_route";
  const keyJournal = "aib_excel7_journal";                 // events log
  const keyStudents = "aib_excel7_students_index";         // {login:{lastLoginAt, totalStars, doneCount}}
  const keyChat = "aib_excel7_chat";                       // chat messages

  const keyProgress = (login) => `aib_excel7_progress:${login}`;
  const keyAnswers = (login, lessonKey) => `aib_excel7_answers:${login}:${lessonKey}`;

  // ---------- State ----------
  const state = {
    user: LS.get(keyUser, null),
    route: LS.get(keyRoute, { screen: "login" })
  };

  // ---------- Utils ----------
  const pad = (n) => String(n).padStart(2, "0");
  function nowISO() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  const lessonKey = (moduleId, lessonNo) => `${moduleId}|${lessonNo}`;

  function saveRoute() { LS.set(keyRoute, state.route); }
  function saveUser() { LS.set(keyUser, state.user); }

  function getProgress(login) {
    return LS.get(keyProgress(login), { stars: 0, done: {} }); // done[lessonKey]={stars, doneAt}
  }
  function setProgress(login, p) { LS.set(keyProgress(login), p); }

  function addJournalEntry(entry) {
    const j = LS.get(keyJournal, []);
    j.unshift({ ...entry, at: nowISO() });
    LS.set(keyJournal, j.slice(0, 600));
  }

  function updateStudentsIndex(login, patch) {
    const idx = LS.get(keyStudents, {});
    idx[login] = { ...(idx[login] || {}), ...patch };
    LS.set(keyStudents, idx);
  }

  function toast(title, sub) {
    const t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = `
      <div style="font-size:22px">⭐</div>
      <div>
        <div class="t">${title}</div>
        <div class="s">${sub || ""}</div>
      </div>
    `;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1500);
  }

  // ---------- UI helpers ----------
  function h(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") el.className = v;
      else if (k === "html") el.innerHTML = v;
      else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
      else if (k === "style") el.setAttribute("style", v);
      else el.setAttribute(k, v);
    }
    for (const c of children) el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    return el;
  }

  function btn(text, cls, onClick, disabled = false) {
    return h("button", { class: `btn ${cls || ""}`.trim(), onclick: onClick, disabled }, [text]);
  }

  function topbar(title, rightNodes = []) {
    const userBadge = state.user
      ? `${state.user.role === "teacher" ? "Teacher" : "Student"} · ${state.user.login}`
      : "Not logged in";

    const logo = h("img", { class: "logo", src: "logo.png", alt: "AI Bayan" });
    logo.onerror = () => { /* if no logo.png – just hide */ logo.style.display = "none"; };

    return h("div", { class: "topbar" }, [
      h("div", { class: "row" }, [
        h("div", { class: "brand" }, [
          logo,
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

  // ---------- Scoring (per exercise) ----------
  // We store:
  // answers[exId] = { ... } for mcq/tf/complete  OR string for writing
  // score[exId] = number of stars earned for that exercise
  function getLessonStore(login, k) {
    return LS.get(keyAnswers(login, k), { answers: {}, score: {}, locked: false });
  }
  function setLessonStore(login, k, store) {
    LS.set(keyAnswers(login, k), store);
  }
  function sumScore(scoreObj) {
    return Object.values(scoreObj || {}).reduce((a, b) => a + (Number(b) || 0), 0);
  }

  // ---------- Screens ----------
  function screenLogin() {
    const allowed = (APP().auth?.allowedLogins || []);
    const studentPin = APP().auth?.studentPin || "2844";
    const teacherPin = APP().auth?.teacherPin || "3244";

    let login = "";
    let pin = "";

    const msg = h("div", { class: "small", html: "" });

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

    const logo = h("img", { src: "logo.png", alt: "AI Bayan", style: "width:72px;height:72px;border-radius:22px;border:1px solid var(--border);object-fit:cover;background:#fff" });
    logo.onerror = () => logo.style.display = "none";

    function doLogin() {
      const L = login.trim();
      const P = pin.trim();

      if (!L || !P) { msg.innerHTML = "Введите login и PIN."; return; }

      if (P === teacherPin) {
        state.user = { role: "teacher", login: L, pin: P };
        saveUser();
        addJournalEntry({ type: "teacher_login", login: L });
        navTo({ screen: "modules" });
        return;
      }

      if (P === studentPin) {
        if (!allowed.includes(L)) { msg.innerHTML = "Этот login не разрешён."; return; }
        state.user = { role: "student", login: L, pin: P };
        saveUser();

        addJournalEntry({ type: "student_login", login: L });
        updateStudentsIndex(L, { lastLoginAt: nowISO() });

        navTo({ screen: "modules" });
        return;
      }

      msg.innerHTML = "Неверный PIN.";
    }

    return container([
      h("div", { class: "card" }, [
        h("div", { class: "row" }, [
          logo,
          h("div", {}, [
            h("h2", {}, [APP().appTitle || "AI Bayan · Excel 7"]),
            h("div", { class: "small" }, ["Вход (7 класс). Logo: logo.png"]),
          ])
        ]),
        h("div", { class: "hr" }),
        h("div", { class: "row" }, [
          h("div", { style: "flex:1;min-width:240px" }, [loginInput]),
          h("div", { style: "flex:1;min-width:200px" }, [pinInput]),
        ]),
        h("div", { class: "row", style: "margin-top:10px" }, [
          btn("Войти", "primary", doLogin),
          btn("Очистить (прогресс+журнал)", "danger", () => {
            if (!confirm("Удалить прогресс и журнал на этом устройстве?")) return;
            Object.keys(localStorage).forEach(k => {
              if (k.startsWith("aib_excel7_")) localStorage.removeItem(k);
              if (k.startsWith("aib_excel7_progress:")) localStorage.removeItem(k);
              if (k.startsWith("aib_excel7_answers:")) localStorage.removeItem(k);
            });
            state.user = null;
            saveUser();
            msg.innerHTML = "Очищено. Обнови страницу.";
          })
        ]),
        h("div", { style: "margin-top:10px" }, [msg])
      ])
    ]);
  }

  // ---------- AI Bayan Chat (local) ----------
  function chatCard() {
    const msgs = LS.get(keyChat, [
      { who: "ai", text: "Сәлем! I’m AI Bayan 😊 Ask me about grammar or vocabulary." }
    ]);

    const list = h("div", { class: "chatMsgs" }, []);
    function draw() {
      list.innerHTML = "";
      for (const m of LS.get(keyChat, [])) {
        list.appendChild(h("div", { class: `msg ${m.who === "ai" ? "ai" : "me"}` }, [
          h("div", { class: "who" }, [m.who === "ai" ? "AI Bayan" : "You"]),
          h("div", {}, [m.text])
        ]));
      }
      list.scrollTop = list.scrollHeight;
    }

    let inputVal = "";
    const input = h("input", { class: "input", placeholder: "Ask AI Bayan…", oninput: e => inputVal = e.target.value });

    function aiReply(q) {
      // simple offline helper (без интернета/сервера)
      const t = q.toLowerCase();
      if (t.includes("present simple")) return "Present Simple: habits/facts. I play, she plays. Use do/does in questions.";
      if (t.includes("present continuous")) return "Present Continuous: now/temporary. I am studying now.";
      if (t.includes("comparative")) return "Comparatives: fast→faster, interesting→more interesting. Superlative: the fastest / the most interesting.";
      if (t.includes("past simple")) return "Past Simple: yesterday/last week. Regular: played. Irregular: went, had, did.";
      return "I can help with grammar rules + examples. Ask: Present Simple / Continuous / Past Simple / Comparatives 😊";
    }

    const send = () => {
      const q = (inputVal || "").trim();
      if (!q) return;
      const cur = LS.get(keyChat, []);
      cur.push({ who: "me", text: q });
      cur.push({ who: "ai", text: aiReply(q) });
      LS.set(keyChat, cur.slice(-80));
      input.value = "";
      inputVal = "";
      draw();
    };

    const card = h("div", { class: "card" }, [
      h("h2", {}, ["Chat with AI Bayan"]),
      h("div", { class: "small" }, ["Работает офлайн. (Если позже подключим настоящий AI — заменим функцию aiReply.)"]),
      list,
      h("div", { class: "chatRow" }, [
        input,
        btn("Send", "primary", send)
      ]),
      h("div", { class: "row" }, [
        btn("Clear chat", "", () => { LS.set(keyChat, []); draw(); })
      ])
    ]);

    draw();
    return card;
  }

  function screenModules() {
    const modules = APP().modules || [];
    const role = state.user?.role;
    const login = state.user?.login || "anon";

    const prog = role === "student" ? getProgress(login) : null;

    const cards = modules.map(m => {
      const leftColor = m.color || "#0aa35f";

      const doneCount = role === "student"
        ? Object.keys(prog.done).filter(k => k.startsWith(`${m.id}|`)).length
        : 0;

      return h("div", { class: "card moduleCard", style: `border-left-color:${leftColor}` }, [
        h("div", { class: "moduleTitle" }, [
          h("div", {}, [
            h("b", {}, [m.title]),
            h("div", { class: "small" }, [`Lessons: ${m.lessonsCount || 8}`]),
          ]),
          role === "student"
            ? h("span", { class: "star" }, [`⭐ `, h("strong", {}, [String(prog.stars)]), ` · Done ${doneCount}/8`])
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
      role === "teacher" ? btn("Journal", "", () => navTo({ screen: "journal" })) : btn("My progress", "", () => navTo({ screen: "progress" })),
      btn("Logout", "", logout)
    ];

    return h("div", {}, [
      topbar(APP().appTitle || "AI Bayan · Excel 7", right),
      container([
        h("div", { class: "grid" }, cards),
        h("div", { style: "height:12px" }),
        chatCard()
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
            role === "student"
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

  // ---------- Exercise render with ✅/❌ + stars ----------
  function screenLesson(moduleId, lessonNo) {
    const k = lessonKey(moduleId, lessonNo);
    const lesson = APP().lessonContent?.[k];
    if (!lesson) return screenLessons(moduleId);

    const role = state.user?.role;
    const login = state.user?.login || "anon";

    const prog = role === "student" ? getProgress(login) : null;
    const alreadyDone = role === "student" && !!prog.done[k];

    const store = role === "student" ? getLessonStore(login, k) : { answers: {}, score: {}, locked: false };
    const locked = alreadyDone || store.locked;

    const lessonStarsNow = sumScore(store.score);

    function saveStore(next) {
      if (role !== "student") return;
      setLessonStore(login, k, next);
    }

    function awardStar(exId, delta, reason) {
      if (role !== "student" || locked) return;
      if (delta <= 0) return;
      store.score[exId] = (store.score[exId] || 0) + delta;
      saveStore(store);
      toast(`+${delta} star`, reason || "Good job!");
    }

    function setScore(exId, value) {
      if (role !== "student" || locked) return;
      store.score[exId] = value;
      saveStore(store);
    }

    function iconNode(kind) {
      if (kind === "ok") return h("div", { class: "icon ok" }, ["✓"]);
      if (kind === "bad") return h("div", { class: "icon bad" }, ["✕"]);
      return h("div", { class: "icon" }, ["•"]);
    }

    function finishLesson() {
      if (role !== "student") return;
      if (locked) return;

      // lock attempt
      store.locked = true;
      saveStore(store);

      const starsEarned = sumScore(store.score);
      const p = getProgress(login);
      p.stars += starsEarned;
      p.done[k] = { stars: starsEarned, doneAt: nowISO() };
      setProgress(login, p);

      addJournalEntry({ type: "lesson_done", login, lesson: k, stars: starsEarned });
      updateStudentsIndex(login, { totalStars: p.stars, doneCount: Object.keys(p.done).length });

      navTo({ screen: "lessons", moduleId });
    }

    function renderExercise(exObj) {
      const wrap = h("div", { class: "exercise" }, [
        h("h3", {}, [exObj.title || "Exercise"]),
        exObj.note ? h("div", { class: "small", style: "margin:-4px 0 8px" }, [exObj.note]) : h("div")
      ]);

      // Reading block
      if (exObj.type === "reading") {
        wrap.appendChild(h("div", { class: "small" }, [exObj.text || ""]));
        return wrap;
      }

      // MCQ — 1 star per correct item (only first time correct)
      if (exObj.type === "mcq") {
        const ans = store.answers[exObj.id] || {}; // idx->chosen
        const awarded = store.answers[`__awarded_${exObj.id}`] || {}; // idx->true (star already given)

        exObj.items?.forEach((it, idx) => {
          const chosen = ans[idx];

          const qBox = h("div", { style: "margin-top:10px" }, [
            h("div", { class: "q" }, [it.q]),
            h("div", { class: "opts" }, [])
          ]);
          const opts = qBox.querySelector(".opts");

          it.opts.forEach(opt => {
            const row = h("div", { class: "opt" }, [
              h("div", {}, [opt]),
              chosen ? (opt === it.a ? iconNode("ok") : (chosen === opt ? iconNode("bad") : iconNode())) : iconNode()
            ]);

            if (chosen) {
              if (opt === it.a && chosen === opt) row.classList.add("correct");
              if (chosen === opt && opt !== it.a) row.classList.add("wrong");
            }

            row.addEventListener("click", () => {
              if (role !== "student" || locked) return;
              // choose
              ans[idx] = opt;
              store.answers[exObj.id] = ans;

              // award ⭐ only when correct and not awarded yet
              if (opt === it.a && !awarded[idx]) {
                awarded[idx] = true;
                store.answers[`__awarded_${exObj.id}`] = awarded;
                // keep per-exercise score as number of awarded correct answers
                const scoreCount = Object.values(awarded).filter(Boolean).length;
                setScore(exObj.id, scoreCount);
                awardStar(exObj.id, 1, "Correct answer ✅");
              } else {
                // update score (do not give star for wrong)
                const scoreCount = Object.values(awarded).filter(Boolean).length;
                setScore(exObj.id, scoreCount);
              }

              saveStore(store);
              render();
            });

            opts.appendChild(row);
          });

          wrap.appendChild(qBox);
        });

        return wrap;
      }

      // TF — 1 star per correct item (first time correct)
      if (exObj.type === "tf") {
        const ans = store.answers[exObj.id] || {};
        const awarded = store.answers[`__awarded_${exObj.id}`] || {};

        exObj.items?.forEach((it, idx) => {
          const chosen = ans[idx]; // true/false
          const row = h("div", { class: "tfRow", style: "margin-top:10px" }, [
            h("div", { class: "q", style: "margin:0" }, [it.q]),
            h("div", { class: "tfBtns" }, [])
          ]);

          const btns = row.querySelector(".tfBtns");

          const mk = (label, val) => {
            const b = h("button", { class: "smallBtn" }, [label]);
            b.addEventListener("click", () => {
              if (role !== "student" || locked) return;
              ans[idx] = val;
              store.answers[exObj.id] = ans;

              const ok = val === it.a;
              if (ok && !awarded[idx]) {
                awarded[idx] = true;
                store.answers[`__awarded_${exObj.id}`] = awarded;

                const scoreCount = Object.values(awarded).filter(Boolean).length;
                setScore(exObj.id, scoreCount);
                awardStar(exObj.id, 1, "Correct ✅");
              } else {
                const scoreCount = Object.values(awarded).filter(Boolean).length;
                setScore(exObj.id, scoreCount);
              }

              saveStore(store);
              render();
            });
            return b;
          };

          const bT = mk("True", true);
          const bF = mk("False", false);

          if (chosen !== undefined) {
            const ok = chosen === it.a;
            if (ok) {
              (chosen ? bT : bF).classList.add("correct");
            } else {
              (chosen ? bT : bF).classList.add("wrong");
            }
          }

          btns.appendChild(bT);
          btns.appendChild(bF);
          wrap.appendChild(row);
        });

        return wrap;
      }

      // Complete — check button gives ✅/❌ and ⭐ if correct (first time)
      if (exObj.type === "complete") {
        const ans = store.answers[exObj.id] || {};
        const awarded = store.answers[`__awarded_${exObj.id}`] || {};
        const checked = store.answers[`__checked_${exObj.id}`] || {}; // idx->'ok'/'bad'

        exObj.items?.forEach((it, idx) => {
          const row = h("div", { style: "margin-top:10px" }, [
            h("div", { class: "q" }, [it.q]),
          ]);

          const input = h("input", {
            class: "input",
            placeholder: "Type answer...",
            value: (ans[idx] ?? ""),
            oninput: (e) => {
              if (role !== "student" || locked) return;
              ans[idx] = e.target.value;
              store.answers[exObj.id] = ans;
              saveStore(store);
            }
          });

          const icon = checked[idx] === "ok" ? iconNode("ok") : (checked[idx] === "bad" ? iconNode("bad") : iconNode());

          const checkBtn = btn("Check", "", () => {
            if (role !== "student" || locked) return;

            const val = String(ans[idx] ?? "").trim().toLowerCase();
            const correct = String(it.a).trim().toLowerCase();
            const ok = val === correct;

            checked[idx] = ok ? "ok" : "bad";
            store.answers[`__checked_${exObj.id}`] = checked;

            if (ok && !awarded[idx]) {
              awarded[idx] = true;
              store.answers[`__awarded_${exObj.id}`] = awarded;

              const scoreCount = Object.values(awarded).filter(Boolean).length;
              setScore(exObj.id, scoreCount);
              awardStar(exObj.id, 1, "Correct ✅");
            } else {
              const scoreCount = Object.values(awarded).filter(Boolean).length;
              setScore(exObj.id, scoreCount);
            }

            saveStore(store);
            render();
          }, locked);

          row.appendChild(h("div", { class: "row" }, [
            h("div", { style: "flex:1;min-width:220px" }, [input]),
            checkBtn,
            icon
          ]));

          wrap.appendChild(row);
        });

        return wrap;
      }

      // Writing — 1 star when submitted (first time)
      if (exObj.type === "writing") {
        const text = store.answers[exObj.id] ?? "";
        const done = !!store.answers[`__writing_done_${exObj.id}`];

        const ta = h("textarea", { placeholder: exObj.writing?.placeholder || "Write here..." });
        ta.value = text;

        ta.addEventListener("input", () => {
          if (role !== "student" || locked) return;
          store.answers[exObj.id] = ta.value;
          saveStore(store);
        });

        const plan = exObj.writing?.plan || [];
        wrap.appendChild(h("div", { class: "small" }, [plan.length ? ("Plan: " + plan.join(" · ")) : ""]));
        wrap.appendChild(ta);

        wrap.appendChild(h("div", { class: "row", style: "margin-top:10px" }, [
          btn(done ? "Submitted ✅" : "Submit writing (+1⭐)", "primary", () => {
            if (role !== "student" || locked) return;
            if ((ta.value || "").trim().length < 20) {
              alert("Напиши хотя бы 20 символов.");
              return;
            }
            if (!done) {
              store.answers[`__writing_done_${exObj.id}`] = true;
              setScore(exObj.id, 1);
              awardStar(exObj.id, 1, "Writing submitted ✍️");
              saveStore(store);
              render();
            }
          }, locked || done),
        ]));

        return wrap;
      }

      wrap.appendChild(h("div", { class: "small" }, ["(Unsupported exercise type)"]));
      return wrap;
    }

    const right = [
      btn("Back", "", () => navTo({ screen: "lessons", moduleId })),
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

    const maxPossible =
      (lesson.exercises || []).reduce((acc, ex) => {
        if (ex.type === "mcq") return acc + (ex.items?.length || 0);
        if (ex.type === "tf") return acc + (ex.items?.length || 0);
        if (ex.type === "complete") return acc + (ex.items?.length || 0);
        if (ex.type === "writing") return acc + 1;
        return acc;
      }, 0);

    return h("div", {}, [
      topbar(APP().appTitle || "AI Bayan · Excel 7", right),
      container([
        h("div", { class: "card" }, [
          h("div", { class: "row" }, [
            h("div", {}, [
              h("h2", {}, [lesson.title || `Lesson ${lessonNo}`]),
              h("div", { class: "small" }, [`Key: ${k}`]),
            ]),
            h("div", { class: "spacer" }),
            state.user?.role === "student"
              ? h("span", { class: "star" }, [
                  locked ? "✅ Locked · " : "🟢 Try · ",
                  "⭐ ", h("strong", {}, [String(lessonStarsNow)]),
                  ` / ${maxPossible}`
                ])
              : h("span", { class: "star" }, ["👩‍🏫 Teacher view"])
          ]),
          h("div", { class: "hr" }),
          h("div", { class: "kpi" }, [
            btn("Print (watermark)", "", () => window.print()),
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
            state.user?.role === "student"
              ? (locked ? "Урок закрыт (попытка использована)." : "Выполняй задания. За правильные ответы получаешь ⭐.")
              : "Teacher mode: без сохранения."
          ]),
          h("div", { class: "hr" }),
          ...(lesson.exercises || []).map(renderExercise),
          h("div", { class: "hr" }),

          state.user?.role === "student"
            ? h("div", { class: "row" }, [
                btn("Finish lesson (lock)", "primary", finishLesson, locked),
                btn("Reset answers", "danger", () => {
                  if (locked) return alert("Урок закрыт. Сброс запрещён.");
                  if (!confirm("Удалить ответы в этом уроке?")) return;
                  localStorage.removeItem(keyAnswers(login, k));
                  render();
                }, locked),
              ])
            : h("div")
        ])
      ]),
      footerBar()
    ]);
  }

  function screenProgress() {
    const login = state.user?.login;
    if (!login || state.user?.role !== "student") return screenModules();

    const p = getProgress(login);
    const rows = Object.entries(p.done)
      .sort((a,b) => (b[1].doneAt || "").localeCompare(a[1].doneAt || ""))
      .slice(0, 250);

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
          h("div", { class: "small" }, ["Completed lessons (saved on this device)."])
        ]),
        ...list
      ]),
      footerBar()
    ]);
  }

  function screenJournal() {
    if (state.user?.role !== "teacher") return screenModules();

    const idx = LS.get(keyStudents, {});
    const students = Object.entries(idx)
      .sort((a,b) => (b[1].totalStars || 0) - (a[1].totalStars || 0));

    const table = h("div", { class: "card" }, [
      h("h2", {}, ["Students summary"]),
      h("div", { class: "small" }, ["(На одном устройстве. Если открыть на другом — будет другой журнал.)"]),
      h("div", { class: "hr" }),
      ...students.map(([login, info]) =>
        h("div", { class: "tfRow" }, [
          h("div", {}, [
            h("b", {}, [login]),
            h("div", { class: "small" }, [`Last: ${info.lastLoginAt || "-"}`])
          ]),
          h("div", { class: "row" }, [
            h("span", { class: "badge" }, [`⭐ ${info.totalStars ?? 0}`]),
            h("span", { class: "badge" }, [`Done ${info.doneCount ?? 0}`]),
          ])
        ])
      )
    ]);

    const j = LS.get(keyJournal, []);
    const cards = j.length
      ? j.slice(0, 160).map(e => h("div", { class: "card", style: "margin-top:10px" }, [
          h("b", {}, [`${e.type}`]),
          h("div", { class: "small" }, [
            `login: ${e.login || "-"} · lesson: ${e.lesson || "-"} · stars: ${e.stars ?? "-"} · ${e.at}`
          ])
        ]))
      : [h("div", { class: "card" }, [h("div", { class: "small" }, ["Journal empty."])])];

    return h("div", {}, [
      topbar("Teacher journal", [
        btn("Back", "", () => navTo({ screen: "modules" })),
        btn("Clear journal", "danger", () => {
          if (!confirm("Очистить журнал и индекс учеников?")) return;
          LS.set(keyJournal, []);
          LS.set(keyStudents, {});
          render();
        }),
        btn("Logout", "", logout)
      ]),
      container([table, ...cards]),
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

    if (!state.user) state.route = { screen: "login" };

    $app.innerHTML = "";
    let screenEl;

    switch (state.route.screen) {
      case "login":   screenEl = screenLogin(); break;
      case "modules": screenEl = screenModules(); break;
      case "lessons": screenEl = screenLessons(state.route.moduleId); break;
      case "lesson":  screenEl = screenLesson(state.route.moduleId, state.route.lessonNo); break;
      case "progress":screenEl = screenProgress(); break;
      case "journal": screenEl = screenJournal(); break;
      default:        screenEl = screenModules();
    }

    $app.appendChild(screenEl);
  }

  // Restore
  if (!state.user) {
    state.route = { screen: "login" };
    saveRoute();
  }

  render();
})();
