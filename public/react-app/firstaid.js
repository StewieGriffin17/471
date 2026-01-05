const API_BASE = "http://127.0.0.1:1678";

let lastDetectedSymptom = null;
let lastDetectedSpecialization = null; // NEW

const chatWindow = document.getElementById("chatWindow");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const symptomButtonsContainer = document.getElementById("symptomButtons");
const statusText = document.getElementById("faStatus");
const findDoctorBtn = document.getElementById("findDoctorBtn");
const CHAT_KEY = "chatHistory_demoUser";

function saveChatHistory() {
  const messages = Array.from(chatWindow.querySelectorAll(".fa-msg")).map((m) => ({
    type: m.classList.contains("user") ? "user" : "bot",
    text: m.textContent,
  }));
  localStorage.setItem(CHAT_KEY, JSON.stringify(messages));
}

function restoreChatHistory() {
  const raw = localStorage.getItem(CHAT_KEY);
  if (!raw) return;
  const messages = JSON.parse(raw);
  if (!Array.isArray(messages)) return;

  chatWindow.innerHTML = "";
  messages.forEach((m) => addMessage(m.text, m.type));
}


function addMessage(text, type) {
  const div = document.createElement("div");
  div.classList.add("fa-msg", type);
  div.textContent = text;
  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  saveChatHistory(); // NEW
}
function clearChatSessionOnly() {
  localStorage.removeItem(CHAT_KEY);

  // Optional: also clear “context” fields so a new chat starts clean
  localStorage.removeItem("selectedSymptom");
  localStorage.removeItem("selectedSpecialization");

  // Reset in-memory variables
  lastDetectedSymptom = null;
  lastDetectedSpecialization = null;

  // Clear UI + status/button
  chatWindow.innerHTML = "";
  statusText.textContent =
    "Start by sending your first message. When a known symptom is detected, you can jump to doctor suggestion.";
  findDoctorBtn.disabled = true;
}

function isPageReload() {
  // Modern browsers
  const navEntries = performance.getEntriesByType("navigation");
  if (navEntries && navEntries.length > 0) {
    return navEntries[0].type === "reload";
  }

  // Fallback (older)
  return performance.navigation && performance.navigation.type === 1;
}



async function loadSymptoms() {
  try {
    const res = await fetch(`${API_BASE}/api/firstaid/symptoms`);
    const data = await res.json();

    symptomButtonsContainer.innerHTML = "";

    if (!Array.isArray(data) || data.length === 0) {
      symptomButtonsContainer.textContent = "No symptom shortcuts available.";
      return;
    }

    data.forEach((item) => {
      const btn = document.createElement("button");
      btn.className = "fa-symptom-btn";
      btn.textContent = item.symptom;
      btn.addEventListener("click", () => {
        chatInput.value = `I have a ${item.symptom}`;
        chatInput.focus();
      });
      symptomButtonsContainer.appendChild(btn);
    });
  } catch (err) {
    console.error(err);
    symptomButtonsContainer.textContent = "Failed to load symptoms.";
  }
}

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const message = chatInput.value.trim();
  if (!message) return;

  addMessage(message, "user");
  chatInput.value = "";

  try {
    const res = await fetch(`${API_BASE}/api/chatbot/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "demo-user", message }),
    });

    const data = await res.json();

    if (data.error) {
      addMessage("Error: " + data.error, "bot");
      return;
    }

    // Show chatbot reply
    addMessage(data.reply, "bot");

    // -------------------------------
    // NEW: specialization support
    // -------------------------------
    // Backend should return: data.specialization (e.g., "Neurology")
    // We'll store it so the button can pass it to doctor page.
    if (data.specialization) {
      lastDetectedSpecialization = data.specialization;
      localStorage.setItem("selectedSpecialization", data.specialization);
    } else {
      lastDetectedSpecialization = null;
      localStorage.removeItem("selectedSpecialization");
    }

    // -------------------------------
    // Existing symptom logic (keep)
    // -------------------------------
    if (data.symptom) {
      lastDetectedSymptom = data.symptom;
      localStorage.setItem("selectedSymptom", data.symptom);
    } else {
      lastDetectedSymptom = null;
      localStorage.removeItem("selectedSymptom");
    }

    // -------------------------------
    // Decide whether Find Doctor button should enable
    // Prefer specialization (module 2)
    // -------------------------------
    if (lastDetectedSpecialization) {
      statusText.textContent = `Suggested specialization: "${lastDetectedSpecialization}". Click "Find Doctor for this Problem".`;
      findDoctorBtn.disabled = false;
    } else if (lastDetectedSymptom && data.canFindDoctor) {
      // fallback: old logic
      statusText.textContent = `Detected symptom: "${lastDetectedSymptom}". You can now search for doctors for this issue.`;
      findDoctorBtn.disabled = false;
    } else {
      statusText.textContent =
        "No specific issue detected. If this feels serious, please contact emergency services or consult a doctor.";
      findDoctorBtn.disabled = true;
    }
  } catch (err) {
    console.error(err);
    addMessage("Something went wrong. Please try again.", "bot");
  }
});

findDoctorBtn.addEventListener("click", () => {
  const specialization = localStorage.getItem("selectedSpecialization"); // FIX
  if (specialization) {
    window.location.href =
      "doctorlist.html?specialization=" + encodeURIComponent(specialization);
  } else {
    window.location.href = "doctorlist.html";
  }
});



loadSymptoms();

// If user refreshed, start a new chat session (UI only)
if (isPageReload()) {
  clearChatSessionOnly();
} else {
  // Back/forward navigation: restore previous UI chat
  restoreChatHistory();
}

// Always ensure a greeting exists when chat is empty
if (!chatWindow.querySelector(".fa-msg")) {
  addMessage(
    "Hello! Describe your problem (e.g., 'I have a burn on my hand') and I will respond with first-aid steps.",
    "bot"
  );
}

