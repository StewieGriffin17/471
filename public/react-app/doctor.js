const API_BASE = "http://127.0.0.1:1678";
const USER_ID = "demo-user"; // temporary user identity

// Read optional URL params (keep, but don't depend on it)
const urlParams = new URLSearchParams(window.location.search);
const urlDoctorId = urlParams.get("id");
const urlSpec = urlParams.get("specialization") || "";

// UI elements
const symptomInput = document.getElementById("symptomInput");
const locationInput = document.getElementById("locationInput");
const searchBtn = document.getElementById("searchBtn");
const doctorsContainer = document.getElementById("doctorsContainer");

const bookingForm = document.getElementById("bookingForm");
const appointmentDate = document.getElementById("appointmentDate");
// ✅ Block past dates (today & future only)
const today = new Date();
const yyyy = today.getFullYear();
const mm = String(today.getMonth() + 1).padStart(2, "0");
const dd = String(today.getDate()).padStart(2, "0");
const todayStr = `${yyyy}-${mm}-${dd}`;

appointmentDate.min = todayStr;

const slotSelect = document.getElementById("slotSelect");
const bookingSuccess = document.getElementById("bookingSuccess");

const postBookingActions = document.getElementById("postBookingActions");
const goMyAppointments = document.getElementById("goMyAppointments");
const goDoctorList = document.getElementById("goDoctorList");
const goChatbot = document.getElementById("goChatbot");
const goHomeService = document.getElementById("goHomeService");

const bookingModal = document.getElementById("bookingModal");
const closeModalBtn = document.getElementById("closeModal");
const cancelBookingBtn = document.getElementById("cancelBooking");

// Prefill from chatbot (Module 1/2 continuity)
const savedSymptom = localStorage.getItem("selectedSymptom");
if (savedSymptom) symptomInput.value = savedSymptom;

// If you came from doctorlist with specialization, prefill symptom field a bit
if (urlSpec && !symptomInput.value) symptomInput.value = urlSpec;

// --------- Module 3 state (selected doctor) ----------
let selectedDoctorId = urlDoctorId || null; // If URL has id, use it; else set on "Book now"

// Modal helpers
function openModal(doctorId) {
  // Keep selected doctor
  if (doctorId) selectedDoctorId = doctorId;

  if (!selectedDoctorId) {
    alert("Please select a doctor first.");
    return;
  }

  // Reset modal state
  bookingSuccess.classList.remove("show");
  bookingSuccess.innerHTML = "";
  postBookingActions.style.display = "none";

  bookingForm.reset();
  slotSelect.disabled = true;
  slotSelect.innerHTML = `<option value="">Select a date first</option>`;

  bookingModal.classList.add("active");
}

function closeModal() {
  bookingModal.classList.remove("active");
  bookingForm.reset();
  bookingSuccess.classList.remove("show");
  bookingSuccess.innerHTML = "";
  postBookingActions.style.display = "none";
  slotSelect.disabled = true;
  slotSelect.innerHTML = `<option value="">Select a date first</option>`;
}

// Render doctor list
function renderDoctors(list) {
  if (!Array.isArray(list) || list.length === 0) {
    doctorsContainer.innerHTML =
      "<p style='color:var(--text-muted)'>No doctors found for this filter.</p>";
    return;
  }

  doctorsContainer.innerHTML = list
    .map(
      (doc) => `
      <div class="doctor-card">
        <div class="doctor-header">
          <div>
            <div class="doctor-name">${doc.name || "-"}</div>
            <div class="doctor-meta">${doc.specialization || "Specialist"}</div>
          </div>
          <span class="badge badge-type">${doc.rating || "N/A"} ★</span>
        </div>

        <div class="doctor-meta">Location: ${doc.location || "N/A"}</div>
        <div class="doctor-meta">Days: ${(doc.availableDays || []).join(", ") || "N/A"}</div>
        <div class="doctor-meta">Time: ${doc.time || "N/A"}</div>
        <div class="doctor-meta">Fee: ${doc.fee ? doc.fee + " BDT" : "N/A"}</div>

        <button class="btn btn-assign" onclick="openModal('${doc._id}')">
          Book now
        </button>
      </div>
    `
    )
    .join("");
}

// Search doctors
async function loadDoctorById(doctorId) {
  doctorsContainer.innerHTML = `<p style="color:var(--text-muted)">Loading selected doctor...</p>`;

  try {
    const res = await fetch(`${API_BASE}/api/doctors/${encodeURIComponent(doctorId)}`);
    if (!res.ok) {
      const text = await res.text();
      doctorsContainer.innerHTML = `<p style="color:red">Failed to load doctor (${res.status}).</p><pre>${text}</pre>`;
      return;
    }

    const doc = await res.json();
    renderDoctors([doc]);        // reuse your existing renderer
    // Optional: auto-open booking modal immediately
    // openModal(doc._id);

  } catch (err) {
    console.error(err);
    doctorsContainer.innerHTML = `<p style="color:red">Network error while loading selected doctor.</p>`;
  }
}

async function searchDoctors() {
  const symptom = symptomInput.value.trim();
  const location = locationInput.value.trim();

  const params = new URLSearchParams();
  if (symptom) params.append("symptom", symptom);
  if (location) params.append("location", location);

  try {
    const res = await fetch(`${API_BASE}/api/doctors/search?` + params.toString());
    const data = await res.json();
    renderDoctors(data);
  } catch (err) {
    console.error(err);
    doctorsContainer.innerHTML =
      "<p style='color:red'>Failed to load doctors.</p>";
  }
}

// Load available slots for selected doctor + date
async function loadSlotsForDate(dateStr) {
  if (!selectedDoctorId) {
    slotSelect.disabled = true;
    slotSelect.innerHTML = `<option value="">Select a doctor first</option>`;
    return;
  }

  slotSelect.disabled = true;
  slotSelect.innerHTML = `<option>Loading slots...</option>`;

  try {
    const res = await fetch(
      `${API_BASE}/api/appointments/slots?doctorId=${encodeURIComponent(selectedDoctorId)}&date=${encodeURIComponent(dateStr)}`
    );

    const data = await res.json();
    const slots = data.availableSlots || [];

    if (slots.length === 0) {
      slotSelect.innerHTML = `<option value="">No slots available</option>`;
      return;
    }

    slotSelect.innerHTML =
      `<option value="">Select a slot</option>` +
      slots.map((s) => `<option value="${s}">${s}</option>`).join("");

    slotSelect.disabled = false;
  } catch (err) {
    console.error(err);
    slotSelect.innerHTML = `<option value="">Error loading slots</option>`;
  }
}

appointmentDate.addEventListener("change", () => {
  const dateStr = appointmentDate.value;
  if (!dateStr) return;

  if (dateStr < todayStr) {
    alert("You can only book for today or future dates.");
    appointmentDate.value = "";
    slotSelect.disabled = true;
    slotSelect.innerHTML = `<option value="">Select a date first</option>`;
    return;
  }

  loadSlotsForDate(dateStr);
});


// Booking form submit
bookingForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!selectedDoctorId) {
    alert("Please select a doctor first.");
    return;
  }

  const patientName = document.getElementById("patientName").value.trim();
  const patientPhone = document.getElementById("patientPhone").value.trim();
  const date = appointmentDate.value;
  const slot = slotSelect.value;

  if (!patientName || !patientPhone || !date || !slot) {
    bookingSuccess.textContent = "Please fill all required fields.";
    bookingSuccess.classList.add("show");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: USER_ID,
        patientName,
        patientPhone,
        doctorId: selectedDoctorId, // ✅ use selected doctor
        date,
        slot,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      bookingSuccess.textContent = data.error || "Booking failed.";
      bookingSuccess.classList.add("show");
      return; // ✅ no appt reference here
    }

    const appt = data.appointment;

    bookingSuccess.innerHTML = `
      Appointment confirmed! <br/>
      <b>Serial:</b> ${appt.serialNo} <br/>
      <b>Date:</b> ${appt.date} <br/>
      <b>Slot:</b> ${appt.slot}
    `;
    bookingSuccess.classList.add("show");
    postBookingActions.style.display = "block";

    // ✅ Store booking context (for Module 4 prefill)
    localStorage.setItem(
      "lastBooking",
      JSON.stringify({
        doctorId: selectedDoctorId,
        specialization: appt.specialization,
        date: appt.date,
        slot: appt.slot,
        serialNo: appt.serialNo,
        patientName,
        patientPhone,
      })
    );

    // Keep your existing fields too (no harm)
    localStorage.setItem("lastBookedDoctorId", selectedDoctorId);
    localStorage.setItem("lastBookedSpecialization", appt.specialization);

  } catch (err) {
    console.error(err);
    bookingSuccess.textContent = "Server error. Try again.";
    bookingSuccess.classList.add("show");
  }
});

// Buttons / events
searchBtn.addEventListener("click", searchDoctors);
closeModalBtn.addEventListener("click", closeModal);
cancelBookingBtn.addEventListener("click", closeModal);
bookingModal.addEventListener("click", (e) => {
  if (e.target === bookingModal) closeModal();
});

// initial search
if (urlDoctorId) {
  // Module 3 mode: show the selected doctor and booking
  loadDoctorById(urlDoctorId);
} else {
  // Module 2.5 mode: normal search page behavior
  searchDoctors();
}


// expose for inline onclick
window.openModal = openModal;

// Post-booking navigation
goMyAppointments.addEventListener("click", () => {
  window.location.href = "myappointments.html";
});

goDoctorList.addEventListener("click", () => {
  const spec = localStorage.getItem("selectedSpecialization") || "";
  if (spec) {
    window.location.href = `doctorlist.html?specialization=${encodeURIComponent(spec)}`;
  } else {
    window.location.href = "doctorlist.html";
  }
});

goChatbot.addEventListener("click", () => {
  window.location.href = "firstaid.html";
});

goHomeService.addEventListener("click", () => {
  window.location.href = "homeservice.html";
});
