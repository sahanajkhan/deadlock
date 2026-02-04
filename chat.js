const chatBox = document.getElementById("chat-box");
const API_BASE = "http://127.0.0.1:5000";

function addMessage(text, sender) {
  const div = document.createElement("div");
  div.className = `message ${sender}`;
  div.innerText = text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function speak(text, lang) {
  const msg = new SpeechSynthesisUtterance(text);
  msg.lang = lang === "hi" || lang === "hinglish" ? "hi-IN" : "en-IN";
  speechSynthesis.cancel();
  speechSynthesis.speak(msg);
}

async function sendMessage() {
  const input = document.getElementById("userInput");
  const message = input.value.trim();
  const lang = document.getElementById("language").value;
  if (!message) return;

  addMessage(message, "user");
  input.value = "";

  const typing = document.createElement("div");
  typing.className = "message bot";
  typing.innerText = "Doctor is typing...";
  chatBox.appendChild(typing);

  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, lang })
    });

    const data = await res.json();
    chatBox.removeChild(typing);

    const type = data.emergency ? "bot emergency" : "bot";
    addMessage(data.reply, type);
    speak(data.reply, lang);

  } catch {
    chatBox.removeChild(typing);
    addMessage("❌ Server not responding", "bot");
  }
}

/* Voice input */
function startVoice() {
  if (!("webkitSpeechRecognition" in window)) {
    alert("Voice not supported");
    return;
  }

  const recog = new webkitSpeechRecognition();
  recog.lang = "en-IN";
  recog.onresult = e => {
    document.getElementById("userInput").value =
      e.results[0][0].transcript;
    sendMessage();
  };
  recog.start();
}

/* Hospital */
function findHospital() {
  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude, longitude } = pos.coords;
    window.open(
      `https://www.google.com/maps/search/hospitals/@${latitude},${longitude},15z`,
      "_blank"
    );
  });
}

/* Appointment */
function openAppointmentForm() {
  document.getElementById("appointmentModal").style.display = "flex";
}
function closeAppointmentForm() {
  document.getElementById("appointmentModal").style.display = "none";
}
