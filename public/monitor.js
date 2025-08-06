// =====================
// Variables globales
// =====================
let socket;
let localStream;
let roomId, monitorId;
let estaTransmitiendo = false;
const peerConnections = {}; // observerId -> RTCPeerConnection
const observadoresConectados = {}; // senderId -> nombre

// =====================
// Obtener parámetros de URL y LocalStorage
// =====================
const params = new URLSearchParams(window.location.search);
roomId = params.get("roomId") || localStorage.getItem("roomId");
monitorId = params.get("monitor") || localStorage.getItem("monitorId");
localStorage.setItem("roomId", roomId);
localStorage.setItem("monitorId", monitorId);

// =====================
// Inicialización DOM
// =====================
document.addEventListener("DOMContentLoaded", () => {
  const video = document.getElementById("localVideo");
  const startButton = document.getElementById("startBroadcast");
  const stopButton = document.getElementById("stopBroadcast");
  const capturarBtn = document.getElementById("capturarBtn");
  const monitorNameText = document.getElementById("monitorNombre");
  const roomIdText = document.getElementById("roomIdText");
  const shareLinkInput = document.getElementById("shareLink");

  if (monitorNameText && monitorId) monitorNameText.textContent = monitorId;
  if (roomIdText && roomId) roomIdText.textContent = roomId;
  if (shareLinkInput && roomId) {
    shareLinkInput.value = `https://myvideofree.web.app/observadores.html?roomId=${roomId}&senderId=observador123`;
  }

  crearWebSocket();

 startButton.addEventListener("click", async () => {
  try {
    estaTransmitiendo = true;
    console.log("🎥 Solicitando acceso a cámara...");
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    video.srcObject = localStream;

    // 🔄 Marcar la sala como activa en Firestore
    if (firebase && firebase.firestore) {
      const db = firebase.firestore();
      await db.collection("salas").doc(roomId).update({
        estado: "activa",
        actualizadaEn: firebase.firestore.FieldValue.serverTimestamp()
      });
      console.log("🟢 Sala marcada como activa");
    }

    // ▶️ Unirse a la sala como monitor
    enviarMensaje({
      type: "joinRoom",
      role: "monitor",
      roomId,
      senderId: monitorId
    });
  } catch (err) {
    estaTransmitiendo = false;
    console.error("❌ Error al acceder a la cámara:", err);
  }
});

  stopButton.addEventListener("click", () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      video.srcObject = null;

      Object.values(peerConnections).forEach(pc => pc.close());
      for (const id in peerConnections) delete peerConnections[id];

      const db = firebase.firestore();
      db.collection("salas").doc(roomId).update({ estado: "terminada" })
        .then(() => console.log("📛 Sala marcada como terminada."))
        .catch(err => console.error("❌ Error al actualizar sala:", err));

      if (socket.readyState === WebSocket.OPEN) socket.close();
      alert("🚫 Transmisión finalizada.");
    }
  });

  capturarBtn.addEventListener("click", () => {
    if (!localStream) return alert("Primero debes iniciar la transmisión.");

    const canvas = document.getElementById("capturaCanvas");
    const ctx = canvas.getContext("2d");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const screenshot = canvas.toDataURL("image/jpeg", 0.8);
    const db = firebase.firestore();
    db.collection("salas").doc(roomId).update({
      screenshot,
      actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => console.log("📸 Captura guardada."))
      .catch(err => console.error("❌ Error al guardar la captura:", err));
  });

  firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
      alert("Debes iniciar sesión.");
      window.location.href = "index.html";
      return;
    }

    const db = firebase.firestore();
    const doc = await db.collection("salas").doc(roomId).get();
    if (!doc.exists || doc.data().uid !== user.uid) {
      alert("❌ Esta sala no fue creada por ti.");
      window.location.href = "index.html";
      return;
    }

    console.log("✅ Monitor autenticado y autorizado.");
  });
});

// =====================
// Reconexión WebSocket
// =====================
function crearWebSocket() {
  socket = new WebSocket("wss://e6e14acd-d62c-4d98-b810-643a81d486b5-00-2nju91dv3rww3.worf.replit.dev/");

  socket.addEventListener("open", () => {
    console.log("🟢 WebSocket conectado");
    enviarMensaje({ type: "joinRoom", role: "monitor", roomId, senderId: monitorId });
  });

  socket.addEventListener("message", handleSocketMessage);

  socket.addEventListener("close", () => {
    console.warn("🔌 WebSocket cerrado. Reintentando...");
    setTimeout(crearWebSocket, 3000);
  });

  socket.addEventListener("error", e => console.error("❌ WebSocket error:", e));
}

function enviarMensaje(msg) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(msg));
  } else {
    console.warn("⚠️ WebSocket no listo. No se envió:", msg);
  }
}

function handleSocketMessage(event) {
  const data = JSON.parse(event.data);
  const observerId = data.senderId;

  switch (data.type) {
    case "watcher":
      if (localStream) handleNewWatcher(observerId);
      else console.warn("⚠️ 'watcher' recibido pero no hay cámara activa");
      break;
    case "answer":
      const pc = peerConnections[observerId];
      if (pc && pc.signalingState === "have-local-offer") {
        pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        console.log("✅ Answer aplicada de:", observerId);
      }
      break;
    case "candidate":
      if (peerConnections[observerId]) {
        peerConnections[observerId].addIceCandidate(new RTCIceCandidate(data.candidate))
          .then(() => console.log("➕ ICE agregado de:", observerId))
          .catch(err => console.error("❌ ICE error:", err));
      }
      break;
    case "disconnectPeer":
      if (peerConnections[observerId]) {
        peerConnections[observerId].close();
        delete peerConnections[observerId];
        console.log("❌ Desconectado:", observerId);
      }
      break;
      case "joinRoom":
  if (data.role === "observer") {
    observadoresConectados[data.senderId] = data.nombre || "Observador";
    actualizarPanelObservadores();
  }
  break;

case "disconnectPeer":
  if (observadoresConectados[data.senderId]) {
    delete observadoresConectados[data.senderId];
    actualizarPanelObservadores();
  }
  break;

    default:
      console.warn("⚠️ Mensaje desconocido:", data);
  }
}

// =====================
// WebRTC para nuevos observadores
// =====================
async function handleNewWatcher(observerId) {
  const pc = new RTCPeerConnection();

  localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

  pc.onicecandidate = event => {
    if (event.candidate) {
      enviarMensaje({
        type: "candidate",
        candidate: event.candidate,
        senderId: monitorId,
        targetId: observerId,
        roomId
      });
    }
  };

  peerConnections[observerId] = pc;

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  enviarMensaje({
    type: "offer",
    offer,
    senderId: monitorId,
    targetId: observerId,
    roomId
  });
}

// =====================
// Eventos de seguridad
// =====================
window.addEventListener("beforeunload", () => {
 if (firebase && firebase.firestore) {
  const db = firebase.firestore();
  db.collection("salas").doc(roomId).update({
    estado: "terminada",
    terminadaEn: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    console.log("📛 Sala marcada como terminada (manual).");
  }).catch((err) => {
    console.error("❌ Error al actualizar sala:", err);
  });
}
});


document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden" && estaTransmitiendo) {
    alert("⚠️ Estás saliendo de la pestaña. Vuelve pronto para no perder la transmisión.");
  }
});



function actualizarPanelObservadores() {
  const lista = document.getElementById("listaObservadores");
  const total = document.getElementById("totalObservadores");

  if (!lista || !total) return;

  lista.innerHTML = "";

  Object.values(observadoresConectados).forEach(nombre => {
    const li = document.createElement("li");
    li.textContent = nombre;
    lista.appendChild(li);
  });

  total.textContent = Object.keys(observadoresConectados).length;
}
