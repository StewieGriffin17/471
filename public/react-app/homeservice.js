const API_BASE = "http://127.0.0.1:1678";
const USER_ID = "demo-user"; // keep consistent with doctor.js + myappointments.js

const homeForm = document.getElementById("homeForm");
const result = document.getElementById("result");

const patientName = document.getElementById("patientName");
const patientPhone = document.getElementById("patientPhone");
const serviceType = document.getElementById("serviceType");
const preferredDate = document.getElementById("preferredDate");
const preferredSlot = document.getElementById("preferredSlot");
const city = document.getElementById("city");
const area = document.getElementById("area");
const address = document.getElementById("address");
const notes = document.getElementById("notes");
const resetBtn = document.getElementById("resetBtn");
const prefillNote = document.getElementById("prefillNote");

// navigation
document.getElementById("goChatbot").onclick = () => (window.location.href = "firstaid.html");
document.getElementById("goDoctors").onclick = () => (window.location.href = "doctorlist.html");
document.getElementById("goAppointments").onclick = () => (window.location.href = "myappointments.html");
document.getElementById("goHomeHistory").onclick = () => (window.location.href = "homeservice_list.html");

// date min = today
const today = new Date();
const yyyy = today.getFullYear();
const mm = String(today.getMonth() + 1).padStart(2, "0");
const dd = String(today.getDate()).padStart(2, "0");
const todayStr = `${yyyy}-${mm}-${dd}`;
preferredDate.min = todayStr;

// Prefill from Module 3 booking context
const lastBookingRaw = localStorage.getItem("lastBooking");
let relatedAppointmentId = null;

if (lastBookingRaw) {
  try {
    const lastBooking = JSON.parse(lastBookingRaw);

    if (lastBooking.patientName) patientName.value = lastBooking.patientName;
    if (lastBooking.patientPhone) patientPhone.value = lastBooking.patientPhone;

    // Optional message
    prefillNote.textContent =
      "Prefilled patient info from your last appointment booking. You can edit if needed.";

    // If in the future you store appointmentId, set it here
    // relatedAppointmentId = lastBooking.appointmentId || null;
  } catch {
    // ignore parse errors
  }
} else {
  prefillNote.textContent =
    "Tip: If you book an appointment first, patient info can auto-fill here.";
}

resetBtn.addEventListener("click", () => {
  homeForm.reset();
  result.textContent = "";
  preferredDate.min = todayStr;
});

homeForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  result.textContent = "";

  // block past date even if typed manually
  if (preferredDate.value < todayStr) {
    result.textContent = "You can only book for today or future dates.";
    return;
  }

  const payload = {
    userId: USER_ID,
    patientName: patientName.value.trim(),
    patientPhone: patientPhone.value.trim(),
    serviceType: serviceType.value,
    preferredDate: preferredDate.value,
    preferredSlot: preferredSlot.value,
    city: city.value.trim(),
    area: area.value.trim(),
    address: address.value.trim(),
    notes: notes.value.trim(),
    relatedAppointmentId: relatedAppointmentId,
  };

  try {
    const res = await fetch(`${API_BASE}/api/homeservice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      result.textContent = data.error || "Failed to submit request.";
      return;
    }

    result.innerHTML = `Request submitted successfully. Status: <b>${data.request.status}</b>.`;
    // Optional: take user to history
    // window.location.href = "homeservice_list.html";
  } catch (err) {
    console.error(err);
    result.textContent = "Network/server error while submitting request.";
  }
});
