const API_BASE = "http://127.0.0.1:1678";

const doctorContainer = document.getElementById("doctorContainer");
const subtitle = document.getElementById("subtitle");
const specInput = document.getElementById("specInput");

// -------------------- helpers --------------------
function getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

/**
 * Helper: safely read doctors array from different API shapes
 * - { doctors: [...] }
 * - [...]
 */
function extractDoctors(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.doctors)) return payload.doctors;
  return [];
}

// -------------------- load doctors --------------------
async function loadDoctors(specialization = "") {
  subtitle.textContent = specialization
    ? `Showing doctors for: ${specialization}`
    : "Showing all doctors";

  const url = specialization
    ? `${API_BASE}/api/doctors?specialization=${encodeURIComponent(specialization)}`
    : `${API_BASE}/api/doctors`;

  doctorContainer.innerHTML = `<div class="card"><p>Loading doctors...</p></div>`;

  try {
    const res = await fetch(url);

    if (!res.ok) {
      const text = await res.text();
      doctorContainer.innerHTML = `
        <div class="card">
          <p>Failed to load doctors (${res.status})</p>
          <pre style="white-space:pre-wrap;">${text}</pre>
        </div>
      `;
      return;
    }

    const data = await res.json();
    const doctors = extractDoctors(data);

    doctorContainer.innerHTML = "";

    if (!doctors || doctors.length === 0) {
      doctorContainer.innerHTML = `<div class="card"><p>No doctors found.</p></div>`;
      return;
    }

    // -------------------- render doctor cards --------------------
    doctors.forEach((d) => {
      const div = document.createElement("div");
      div.className = "card";

      div.innerHTML = `
        <span class="badge">${d.specialization || "-"}</span>
        <h3>${d.name || "-"}</h3>
        <p><b>Chamber:</b> ${d.chamber || "-"}</p>
        <p><b>Location:</b> ${d.location || "-"}</p>
        <p><b>Days:</b> ${(d.availableDays || []).join(", ") || "-"}</p>
        <p><b>Time:</b> ${d.time || "-"}</p>
        <p><b>Fee:</b> ${d.fee ? d.fee + " BDT" : "-"}</p>
        <p><b>Phone:</b> ${d.phone || "-"}</p>

        <div style="margin-top:12px;">
          <button class="btn btn-primary view-doctor" data-id="${d._id}">
            View & Book
          </button>
        </div>
      `;

      doctorContainer.appendChild(div);
    });

    // -------------------- Module 2 → Module 3 bridge --------------------
    document.querySelectorAll(".view-doctor").forEach((btn) => {
      btn.addEventListener("click", () => {
        const doctorId = btn.getAttribute("data-id");
        if (!doctorId) {
          alert("Doctor ID missing");
          return;
        }

        const spec = (specInput.value || "").trim();
        const nextUrl = spec
          ? `doctor.html?id=${encodeURIComponent(doctorId)}&specialization=${encodeURIComponent(spec)}`
          : `doctor.html?id=${encodeURIComponent(doctorId)}`;

        window.location.href = nextUrl;
      });
    });

  } catch (err) {
    console.error(err);
    doctorContainer.innerHTML = `<div class="card"><p>Network/server error while loading doctors.</p></div>`;
  }
}

// -------------------- search button --------------------
document.getElementById("searchBtn").addEventListener("click", () => {
  const spec = specInput.value.trim();
  loadDoctors(spec);

  const newUrl = spec
    ? `doctorlist.html?specialization=${encodeURIComponent(spec)}`
    : `doctorlist.html`;

  window.history.replaceState({}, "", newUrl);
});

// -------------------- back to chatbot --------------------
document.getElementById("backBtn").addEventListener("click", () => {
  window.location.href = "firstaid.html";
});

// -------------------- auto-load specialization --------------------
const specFromUrl = getQueryParam("specialization");
const specFromStorage = localStorage.getItem("selectedSpecialization");

const initialSpec = (specFromUrl || specFromStorage || "").trim();

if (initialSpec) {
  specInput.value = initialSpec;

  if (!specFromUrl) {
    window.history.replaceState(
      {},
      "",
      `doctorlist.html?specialization=${encodeURIComponent(initialSpec)}`
    );
  }
}

loadDoctors(initialSpec);
