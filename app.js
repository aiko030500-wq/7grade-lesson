(() => {
  const app = document.getElementById("app");

  console.log("✅ app.js loaded");
  console.log("APP_DATA =", window.APP_DATA);

  function renderLogin(){
    let login = "";
    let pin = "";

    const msg = document.createElement("div");
    msg.className = "msg";

    const card = document.createElement("div");
    card.className = "card";

    const title = document.createElement("h2");
    title.textContent = APP_DATA.appTitle;

    const loginInput = document.createElement("input");
    loginInput.placeholder = "Login (например 7BLr1)";
    loginInput.oninput = e => login = e.target.value.trim();

    const pinInput = document.createElement("input");
    pinInput.placeholder = "PIN";
    pinInput.type = "password";
    pinInput.oninput = e => pin = e.target.value.trim();

    const btn = document.createElement("button");
    btn.textContent = "Войти";

    btn.onclick = () => {
      console.log("LOGIN:", login, "PIN:", pin);

      if(!login || !pin){
        msg.textContent = "Введите login и PIN";
        return;
      }

      if(pin === APP_DATA.auth.teacherPin){
        app.innerHTML = "<h1 style='text-align:center'>👩‍🏫 Teacher вошёл</h1>";
        return;
      }

      if(pin === APP_DATA.auth.studentPin){
        if(!APP_DATA.auth.allowedLogins.includes(login)){
          msg.textContent = "Логин не разрешён";
          return;
        }
        app.innerHTML = `<h1 style="text-align:center">🎓 Student ${login} вошёл</h1>`;
        return;
      }

      msg.textContent = "Неверный PIN";
    };

    card.append(
      title,
      loginInput,
      pinInput,
      btn,
      msg
    );

    app.appendChild(card);
  }

  if(!window.APP_DATA){
    app.innerHTML = "❌ data.js не загрузился";
    return;
  }

  renderLogin();
})();
