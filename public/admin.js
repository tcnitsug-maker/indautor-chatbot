const API = "/admin";

// ---------------------------------------------
// Cargar listado de IPs
// ---------------------------------------------
async function loadIPs() {
  const res = await fetch(`${API}/ips`);
  const data = await res.json();

  const tbody = document.querySelector("#ipTable tbody");
  tbody.innerHTML = "";

  data.forEach(ipInfo => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${ipInfo.ip}</td>
      <td>${ipInfo.total}</td>
      <td>${new Date(ipInfo.lastSeen).toLocaleString()}</td>
      <td><button onclick="getLocation('${ipInfo.ip}')">🌍 Ver</button></td>
      <td><button onclick="loadHistory('${ipInfo.ip}')">📜 Ver</button></td>
    `;

    tbody.appendChild(tr);
  });
}

// ---------------------------------------------
// Ver ubicación geográfica de una IP
// ---------------------------------------------
async function getLocation(ip) {
  const res = await fetch(`${API}/ipinfo/${ip}`);
  const data = await res.json();

  alert(`
📍 Información de la IP ${ip}

País: ${data.country}
Estado: ${data.regionName}
Ciudad: ${data.city}
ISP: ${data.isp}
Latitud: ${data.lat}
Longitud: ${data.lon}
  `);
}

// ---------------------------------------------
// Cargar historial por IP
// ---------------------------------------------
async function loadHistory(ip) {
  const res = await fetch(`/admin/messages/ip/${ip}`);
  const data = await res.json();

  let html = `<h3>Historial de ${ip}</h3><ul>`;

  data.forEach(m => {
    html += `<li><b>${m.role}:</b> ${m.text} <i>(${new Date(m.createdAt).toLocaleString()})</i></li>`;
  });

  html += "</ul>";

  document.getElementById("historyBox").innerHTML = html;
}

loadIPs();
