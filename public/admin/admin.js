console.log("✅ admin.js cargado");

const LOGIN_URL = "/admin-auth/login";

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("loginBtn");
  if (btn) {
    btn.addEventListener("click", loginAdmin);
  }
});

async function loginAdmin() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorBox = document.getElementById("loginError");

  errorBox.style.display = "none";

  if (!username || !password) {
    errorBox.textContent = "Ingresa usuario y contraseña";
    errorBox.style.display = "block";
    return;
  }

  try {
    const res = await fetch(LOGIN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (!res.ok || !data.token) {
      errorBox.textContent = data.error || "Login incorrecto";
      errorBox.style.display = "block";
      return;
    }

    localStorage.setItem("adminToken", data.token);
    localStorage.setItem("adminUser", data.username);
    localStorage.setItem("adminRole", data.role);

    window.location.href = "dashboard.html";
  } catch (err) {
    console.error(err);
    errorBox.textContent = "Error de conexión";
    errorBox.style.display = "block";
  }
}
