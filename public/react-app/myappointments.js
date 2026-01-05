const API_BASE = "http://127.0.0.1:1678";
const USER_ID = "demo-user"; // must match doctor.js

const apptList = document.getElementById("apptList");
const statusText = document.getElementById("statusText");

const refreshBtn = document.getElementById("refreshBtn");
const goChatbot = document.getElementById("goChatbot");
const goDoctors = document.getElementById("goDoctors");
const goHomeService = document.getElementById("goHomeService");

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDoctorName(appt) {
  // When you populate doctorId in backend, it becomes an object
  // Otherwise it may be just an id string
  const doc = appt.doctorId;
  if (doc && typeof doc === "object") return doc.name || "Doctor";
  return "Doctor";
}

function formatDoctorMeta(appt) {
  const doc = appt.doctorId;
  if (doc && typeof doc === "object") {
    const loc = doc.location || "N/A";
    const time = doc.time || "N/A";
    return `Location: ${loc} • Doctor Time: ${time}`;
  }
  return "";
}

function badge(text) {
  return `<span class="pill">${escapeHtml(text)}</span>`;
}

async function loadAppointments() {
  statusText.textContent = "Loading...";
  apptList.innerHTML = "";

  try {
    const res = await fetch(`${API_BASE}/api/appointments?userId=${encodeURIComponent(USER_ID)}`);
    const data = await res.json();

    if (!res.ok) {
      statusText.textContent = data.error || "Failed to load appointments.";
      return;
    }

    const list = data.appointments || [];
    if (list.length === 0) {
      statusText.textContent = "No appointments found yet.";
      return;
    }

    statusText.textContent = `Total appointments: ${list.length}`;

    list.forEach((a) => {
      const doctorName = formatDoctorName(a);
      const meta = formatDoctorMeta(a);

      const card = document.createElement("div");
      card.className = "card appt-card";

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap;">
          <div>
            <h3 style="margin:0;">${escapeHtml(doctorName)}</h3>
            <div class="muted" style="margin-top:6px;">
              ${escapeHtml(a.specialization || "N/A")}
            </div>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
            ${badge("Serial: " + (a.serialNo ?? "-"))}
            ${badge("Date: " + (a.date || "-"))}
            ${badge("Slot: " + (a.slot || "-"))}
            ${badge("Status: " + (a.status || "-"))}
          </div>
        </div>

        ${meta ? `<div class="muted" style="margin-top:10px;">${escapeHtml(meta)}</div>` : ""}

        <div class="actions-row" style="margin-top:12px;">
          ${
            a.status === "booked"
              ? `<button class="btn btn-secondary cancel-btn" data-id="${a._id}">Cancel Appointment</button>`
              : ""
          }
        </div>
      `;

      apptList.appendChild(card);
    });

    // attach cancel handlers
    document.querySelectorAll(".cancel-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        if (!id) return;

        const ok = confirm("Cancel this appointment?");
        if (!ok) return;

        try {
          const res2 = await fetch(`${API_BASE}/api/appointments/${encodeURIComponent(id)}/cancel`, {
            method: "PATCH",
          });
          const out = await res2.json();

          if (!res2.ok) {
            alert(out.error || "Cancel failed.");
            return;
          }

          loadAppointments();
        } catch (err) {
          console.error(err);
          alert("Network error while cancelling.");
        }
      });
    });

  } catch (err) {
    console.error(err);
    statusText.textContent = "Network/server error while loading appointments.";
  }
}

// Navigation (smooth transitions)
goChatbot.addEventListener("click", () => {
  window.location.href = "firstaid.html";
});

goDoctors.addEventListener("click", () => {
  const spec = localStorage.getItem("selectedSpecialization") || "";
  if (spec) {
    window.location.href = `doctorlist.html?specialization=${encodeURIComponent(spec)}`;
  } else {
    window.location.href = "doctorlist.html";
  }
});

goHomeService.addEventListener("click", () => {
  window.location.href = "homeservice.html"; // Module 4 entry page
});

refreshBtn.addEventListener("click", loadAppointments);

document.addEventListener("DOMContentLoaded", loadAppointments);
