const API_BASE = "http://127.0.0.1:1678";
const USER_ID = "demo-user";

const statusText = document.getElementById("statusText");
const list = document.getElementById("list");

document.getElementById("goCreate").onclick = () => (window.location.href = "homeservice.html");
document.getElementById("goAppointments").onclick = () => (window.location.href = "myappointments.html");
document.getElementById("goDoctors").onclick = () => (window.location.href = "doctorlist.html");
document.getElementById("goChatbot").onclick = () => (window.location.href = "firstaid.html");
document.getElementById("refreshBtn").onclick = () => loadRequests();

function esc(s="") {
  return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
}

function pill(text) {
  return `<span class="pill">${esc(text)}</span>`;
}

async function loadRequests() {
  statusText.textContent = "Loading...";
  list.innerHTML = "";

  try {
    const res = await fetch(`${API_BASE}/api/homeservice?userId=${encodeURIComponent(USER_ID)}`);
    const data = await res.json();

    if (!res.ok) {
      statusText.textContent = data.error || "Failed to load requests.";
      return;
    }

    const reqs = data.requests || [];
    if (reqs.length === 0) {
      statusText.textContent = "No home service requests found.";
      return;
    }

    statusText.textContent = `Total requests: ${reqs.length}`;

    reqs.forEach((r) => {
      const card = document.createElement("div");
      card.className = "card";
      card.style.marginTop = "12px";

      card.innerHTML = `
        <h3 style="margin:0;">${esc(r.serviceType)}</h3>
        <div style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap;">
          ${pill("Date: " + (r.preferredDate || "-"))}
          ${pill("Slot: " + (r.preferredSlot || "-"))}
          ${pill("Status: " + (r.status || "-"))}
        </div>

        <p style="margin-top:10px;" class="muted">
          <b>Patient:</b> ${esc(r.patientName)} (${esc(r.patientPhone)})<br/>
          <b>Address:</b> ${esc(r.address)}, ${esc(r.area)}, ${esc(r.city)}<br/>
          ${r.notes ? `<b>Notes:</b> ${esc(r.notes)}` : ""}
        </p>

        ${
          r.status === "pending" || r.status === "confirmed"
            ? `<button class="btn btn-secondary cancel-btn" data-id="${r._id}">Cancel</button>`
            : ""
        }
      `;

      list.appendChild(card);
    });

    document.querySelectorAll(".cancel-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        if (!id) return;

        const ok = confirm("Cancel this request?");
        if (!ok) return;

        try {
          const res2 = await fetch(`${API_BASE}/api/homeservice/${encodeURIComponent(id)}/cancel`, {
            method: "PATCH",
          });
          const out = await res2.json();

          if (!res2.ok) {
            alert(out.error || "Cancel failed.");
            return;
          }
          loadRequests();
        } catch (e) {
          console.error(e);
          alert("Network error cancelling request.");
        }
      });
    });

  } catch (err) {
    console.error(err);
    statusText.textContent = "Network/server error while loading requests.";
  }
}

document.addEventListener("DOMContentLoaded", loadRequests);
