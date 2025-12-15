console.log("✅ admin.js cargado");

function showTab(id) {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".navbtn").forEach(b => b.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  event.target.classList.add("active");
}

function logout() {
  localStorage.removeItem("adminToken");
  window.location.href = "/admin-panel.html";
}

// Datos DEMO (luego los conectamos al backend)
document.getElementById("totalMessages").innerText = 123;
document.getElementById("totalIPs").innerText = 45;
document.getElementById("todayMessages").innerText = 12;

// Chart demo
const ctx = document.getElementById("chart");
new Chart(ctx, {
  type: "bar",
  data: {
    labels: ["Lun","Mar","Mié","Jue","Vie"],
    datasets: [{
      label: "Mensajes",
      data: [12,19,7,15,10]
    }]
  }
});
