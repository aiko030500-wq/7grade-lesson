// data.js — AI Bayan · Excel 7 (9 modules × 8 lessons, each lesson: Lexis+Grammar, 5 exercises)

(function () {
  const MODULES = [
    { id: "m1", title: "Module 1 — Hobbies & Leisure", color: "#0aa35f" },
    { id: "m2", title: "Module 2 — Communication & Technology", color: "#00c2ff" },
    { id: "m3", title: "Module 3 — Holidays & Travel", color: "#ff9f1c" },
    { id: "m4", title: "Module 4 — Space & Earth", color: "#7c4dff" },
    { id: "m5", title: "Module 5 — Reading for Pleasure", color: "#22c55e" },
    { id: "m6", title: "Module 6 — Entertainment & Media", color: "#ff3dbb" },
    { id: "m7", title: "Module 7 — Natural Disasters", color: "#ff2d2d" },
    { id: "m8", title: "Module 8 — Healthy Habits", color: "#00e6b8" },
    { id: "m9", title: "Module 9 — Clothes & Fashion", color: "#ffd000" }
  ];

  // ====== per-module vocabulary pools (editable) ======
  const VOCAB = {
    m1: [
      ["dancing", "танцы"], ["cooking", "готовка"], ["vlogging", "влогинг"], ["boxing", "бокс"],
      ["yoga", "йога"], ["rock climbing", "скалолазание"], ["windsurfing", "виндсёрфинг"],
      ["playing video games", "играть в видеоигры"]
    ],
    m2: [
      ["smartphone", "смартфон"], ["message", "сообщение"], ["password", "пароль"], ["Wi-Fi", "вай-фай"],
      ["download", "скачивать"], ["upload", "загружать"], ["privacy", "конфиденциальность"], ["virus", "вирус"]
    ],
    m3: [
      ["luggage", "багаж"], ["flight", "рейс"], ["ticket", "билет"], ["passport control", "паспортный контроль"],
      ["accommodation", "жильё"], ["sightseeing", "достопримечательности"], ["coach", "междугородний автобус"], ["camping", "кемпинг"]
    ],
    m4: [
      ["planet", "планета"], ["gravity", "гравитация"], ["orbit", "орбита"], ["atmosphere", "атмосфера"],
      ["satellite", "спутник"], ["earthquake", "землетрясение"], ["volcano", "вулкан"], ["climate", "климат"]
    ],
    m5: [
      ["author", "автор"], ["character", "персонаж"], ["plot", "сюжет"], ["chapter", "глава"],
      ["novel", "роман"], ["detective", "детектив"], ["fantasy", "фэнтези"], ["review", "отзыв"]
    ],
    m6: [
      ["movie", "фильм"], ["series", "сериал"], ["actor", "актёр"], ["director", "режиссёр"],
      ["concert", "концерт"], ["headline", "заголовок"], ["advertisement", "реклама"], ["broadcast", "трансляция"]
    ],
    m7: [
      ["flood", "наводнение"], ["drought", "засуха"], ["wildfire", "лесной пожар"], ["storm", "буря"],
      ["rescue", "спасение"], ["evacuation", "эвакуация"], ["damage", "ущерб"], ["warning", "предупреждение"]
    ],
    m8: [
      ["balanced diet", "сбалансированное питание"], ["exercise", "упражнения"], ["sleep", "сон"], ["stress", "стресс"],
      ["hydration", "вода/гидратация"], ["routine", "режим"], ["healthy", "здоровый"], ["habit", "привычка"]
    ],
    m9: [
      ["shirt", "рубашка"], ["hoodie", "худи"], ["jeans", "джинсы"], ["dress", "платье"],
      ["fashionable", "модный"], ["size", "размер"], ["pattern", "узор"], ["comfortable", "удобный"]
    ]
  };

  // ====== lesson themes inside each module (8 lessons) ======
  const LESSON_TITLES = [
    "Lesson 1 — Vocabulary",
    "Lesson 2 — Reading & Vocabulary",
    "Lesson 3 — Use of English (Grammar)",
    "Lesson 4 — Skills (Reading/Listening)",
    "Lesson 5 — Everyday English",
    "Lesson 6 — Across Cultures",
    "Lesson 7 — Across the Curriculum",
    "Lesson 8 — Writing"
  ];

  // ====== grammar focus by lesson number (editable) ======
  const GRAMMAR_FOCUS = {
    1: "Present Simple (habits) + frequency adverbs",
    2: "Present Continuous (now) vs Present Simple",
    3: "Comparatives & Superlatives",
    4: "Past Simple (regular/irregular)",
    5: "Future: be going to / Present Continuous for plans",
    6: "Modal verbs: must / have to / should",
    7: "Countable/Uncountable + some/any/much/many",
    8: "Linkers: and/but/because/so + paragraph structure"
  };

  // ====== helpers ======
  const pick = (arr, n, offset = 0) => {
    const out = [];
    for (let i = 0; i < n; i++) out.push(arr[(i + offset) % arr.length]);
    return out;
  };

  const toCards = (pairs) =>
    pairs.map(([en, ru]) => ({ emoji: "⭐", en, ru, tts: en }));

  const makeLexMCQ = (words) => {
    // 2 questions MCQ
    const [w1, w2, w3, w4] = words;
    return {
      id: "lex1",
      type: "mcq",
      title: "Lexis 1 — Choose the correct word",
      items: [
        { q: `1 I like ${w1[0]} in my free time.`, opts: [w1[0], w2[0], w3[0]], a: w1[0] },
        { q: `2 We often talk about ${w2[0]}.`, opts: [w4[0], w2[0], w3[0]], a: w2[0] }
      ]
    };
  };

  const makeLexComplete = (words) => {
    const [w1, w2, w3] = words;
    return {
      id: "lex2",
      type: "complete",
      title: "Lexis 2 — Complete the gaps",
      items: [
        { q: `1 My favourite word today is ________.`, a: w1[0] },
        { q: `2 I can explain ________ in Russian.`, a: w2[0] },
        { q: `3 I want to learn ________.`, a: w3[0] }
      ]
    };
  };

  const makeGramMCQ = (lessonNo) => {
    // 2 questions
    if (lessonNo === 1) {
      return { id:"gr1", type:"mcq", title:"Grammar 1 — Present Simple",
        items:[
          { q:"1 He ____ football after school.", opts:["play","plays","is playing"], a:"plays" },
          { q:"2 They ____ every weekend.", opts:["train","trains","is training"], a:"train" }
        ]
      };
    }
    if (lessonNo === 2) {
      return { id:"gr1", type:"mcq", title:"Grammar 1 — PS vs PC",
        items:[
          { q:"1 She ____ now.", opts:["reads","is reading","read"], a:"is reading" },
          { q:"2 He usually ____ early.", opts:["gets up","is getting up","get up"], a:"gets up" }
        ]
      };
    }
    if (lessonNo === 3) {
      return { id:"gr1", type:"mcq", title:"Grammar 1 — Comparatives/Superlatives",
        items:[
          { q:"1 Boxing is ____ than yoga.", opts:["dangerous","more dangerous","most dangerous"], a:"more dangerous" },
          { q:"2 This is the ____ hobby for me.", opts:["best","better","good"], a:"best" }
        ]
      };
    }
    if (lessonNo === 4) {
      return { id:"gr1", type:"mcq", title:"Grammar 1 — Past Simple",
        items:[
          { q:"1 Yesterday we ____ a match.", opts:["play","played","are playing"], a:"played" },
          { q:"2 He ____ to school by bus.", opts:["go","went","goes"], a:"went" }
        ]
      };
    }
    if (lessonNo === 5) {
      return { id:"gr1", type:"mcq", title:"Grammar 1 — Plans (going to / PC)",
        items:[
          { q:"1 I’m ____ visit my friend on Saturday.", opts:["going to","go","went"], a:"going to" },
          { q:"2 We ____ meeting at 5 pm.", opts:["are","is","am"], a:"are" }
        ]
      };
    }
    if (lessonNo === 6) {
      return { id:"gr1", type:"mcq", title:"Grammar 1 — Modals",
        items:[
          { q:"1 You ____ wear a helmet. (rule)", opts:["must","can","may"], a:"must" },
          { q:"2 You ____ sleep more. (advice)", opts:["should","must","have to"], a:"should" }
        ]
      };
    }
    if (lessonNo === 7) {
      return { id:"gr1", type:"mcq", title:"Grammar 1 — Count/Uncount",
        items:[
          { q:"1 How ____ water do you drink?", opts:["many","much","a lot"], a:"much" },
          { q:"2 How ____ apples are there?", opts:["much","many","any"], a:"many" }
        ]
      };
    }
    // lesson 8
    return { id:"gr1", type:"mcq", title:"Grammar 1 — Linkers",
      items:[
        { q:"1 I like it ____ it’s fun.", opts:["because","but","so"], a:"because" },
        { q:"2 It was late, ____ I went home.", opts:["because","so","but"], a:"so" }
      ]
    };
  };

  const makeGramComplete = (lessonNo) => {
    if (lessonNo === 1) {
      return { id:"gr2", type:"complete", title:"Grammar 2 — Present Simple (forms)",
        items:[
          { q:"1 She ________ (play) tennis.", a:"plays" },
          { q:"2 I ________ (not/like) horror films.", a:"don't like" },
          { q:"3 ________ he ________ (go) jogging?", a:"Does he go" }
        ]
      };
    }
    if (lessonNo === 2) {
      return { id:"gr2", type:"complete", title:"Grammar 2 — Present Continuous",
        items:[
          { q:"1 I ________ (study) now.", a:"am studying" },
          { q:"2 They ________ (not/watch) TV now.", a:"are not watching" },
          { q:"3 What ________ you ________ (do) сейчас?", a:"are you doing" }
        ]
      };
    }
    if (lessonNo === 3) {
      return { id:"gr2", type:"complete", title:"Grammar 2 — Comparative/Superlative forms",
        items:[
          { q:"1 easy → ________", a:"easier" },
          { q:"2 interesting → ________", a:"more interesting" },
          { q:"3 good → ________", a:"better" }
        ]
      };
    }
    if (lessonNo === 4) {
      return { id:"gr2", type:"complete", title:"Grammar 2 — Past Simple (verbs)",
        items:[
          { q:"1 We ________ (visit) a museum.", a:"visited" },
          { q:"2 He ________ (buy) a ticket.", a:"bought" },
          { q:"3 They ________ (not/go) to school yesterday.", a:"didn't go" }
        ]
      };
    }
    if (lessonNo === 5) {
      return { id:"gr2", type:"complete", title:"Grammar 2 — Plans",
        items:[
          { q:"1 I ________ (go) to start a new hobby.", a:"am going" },
          { q:"2 She is ________ to buy a new phone. (going)", a:"going" },
          { q:"3 We ________ meeting tomorrow. (be)", a:"are" }
        ]
      };
    }
    if (lessonNo === 6) {
      return { id:"gr2", type:"complete", title:"Grammar 2 — Modals",
        items:[
          { q:"1 You ________ be careful. (advice)", a:"should" },
          { q:"2 You ________ wear a seatbelt. (rule)", a:"must" },
          { q:"3 I ________ help you. (ability)", a:"can" }
        ]
      };
    }
    if (lessonNo === 7) {
      return { id:"gr2", type:"complete", title:"Grammar 2 — some/any/much/many",
        items:[
          { q:"1 I have ________ friends in my class. (many/much)", a:"many" },
          { q:"2 There isn’t ________ milk. (some/any)", a:"any" },
          { q:"3 Would you like ________ tea? (some/any)", a:"some" }
        ]
      };
    }
    // lesson 8
    return { id:"gr2", type:"complete", title:"Grammar 2 — Linkers",
      items:[
        { q:"1 I was tired, ________ I went to bed. (so/but)", a:"so" },
        { q:"2 I like it ________ it’s cheap. (because/so)", a:"because" },
        { q:"3 It was fun, ________ it was difficult. (but/so)", a:"but" }
      ]
    };
  };

  const makeWriting = (moduleId, lessonNo) => {
    return {
      id: "gr3",
      type: "writing",
      title: "Writing — Use lexis + grammar",
      note: `Use: ${GRAMMAR_FOCUS[lessonNo]}`,
      writing: {
        placeholder: "Write here...",
        plan: [
          "Sentence 1 (topic)",
          "Sentence 2 (grammar rule)",
          "Sentence 3 (opinion)",
          "Sentence 4 (extra detail)"
        ],
        rewardStars: 1
      }
    };
  };

  const buildLesson = (moduleId, lessonNo) => {
    const words = pick(VOCAB[moduleId] || [["word","слово"]], 6, lessonNo - 1);
    return {
      title: `${LESSON_TITLES[lessonNo - 1]} — ${MODULES.find(m => m.id === moduleId).title.replace(/^Module \d+ — /, "")}`,
      bookPage: 0,
      vocabCards: toCards(pick(words, 5)),
      exercises: [
        makeLexMCQ(words),
        makeLexComplete(words),
        makeGramMCQ(lessonNo),
        makeGramComplete(lessonNo),
        makeWriting(moduleId, lessonNo)
      ]
    };
  };

  const lessonContent = {};
  for (const m of MODULES) {
    for (let l = 1; l <= 8; l++) {
      lessonContent[`${m.id}|${l}`] = buildLesson(m.id, l);
    }
  }

  // ====== APP DATA ======
  window.APP_DATA = {
    appTitle: "AI Bayan · Excel 7",
    bookPdf: "Excel-7.pdf",

    auth: {
      studentPin: "2844",
      teacherPin: "3244",
      allowedLogins: [
        ...Array.from({ length: 15 }, (_, i) => `7BLr${i + 1}`),
        ...Array.from({ length: 20 }, (_, i) => `7VSt${i + 16}`)
      ]
    },

    modules: MODULES.map(m => ({ ...m, lessonsCount: 8 })),

    lessonContent
  };
})();
