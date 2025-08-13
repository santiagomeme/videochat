// =====================
// VARIABLES GLOBALES
// =====================
let socket;
let localStream;
let roomId, monitorId;
let estaTransmitiendo = false;
const peerConnections = {};
const observadoresConectados = {};

// =====================
// GENERAR SIEMPRE NUEVA SALA
// =====================
roomId = `room_${Math.random().toString(36).substring(2, 10)}`;
monitorId = `monitor_${Math.random().toString(36).substring(2, 8)}`;

// =====================
// INICIALIZACIÓN DEL DOM
// =====================
document.addEventListener("DOMContentLoaded", () => {
  const video = document.getElementById("localVideo");
  const startButton = document.getElementById("startBroadcast");
  const stopButton = document.getElementById("stopBroadcast");
  const capturarBtn = document.getElementById("capturarBtn");
  const monitorNameText = document.getElementById("monitorNombre");
  const roomIdText = document.getElementById("roomIdText");
  const shareLinkInput = document.getElementById("shareLink");

  if (monitorNameText) monitorNameText.textContent = monitorId;
  if (roomIdText) roomIdText.textContent = roomId;
  if (shareLinkInput) {
    shareLinkInput.value = `https://myvideofree.web.app/observadores.html?roomId=${roomId}`;
  }

  const db = firebase.firestore();

  // 🔄 Escuchar cambios en el número de observadores
  db.collection("salas").doc(roomId).onSnapshot(doc => {
    if (doc.exists) {
      const data = doc.data();
      const totalObs = data.observadores || 0;
      const totalElem = document.getElementById("totalObservadores");
      if (totalElem) totalElem.textContent = totalObs;
    }
  });

  // 🎥 INICIAR TRANSMISIÓN
  startButton.addEventListener("click", async () => {
    try {
      estaTransmitiendo = true;

      // Obtener cámara y micrófono
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      video.srcObject = localStream;

      // Crear sala en Firestore
      const salaRef = db.collection("salas").doc(roomId);
      await salaRef.set({
        monitor: monitorId,
        estado: "activa",
        observadores: 0,
        creadoEn: firebase.firestore.FieldValue.serverTimestamp(),
        actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
      });

      console.log("✅ Sala creada en Firestore:", roomId);

      // Ahora sí conectar WebSocket
      crearWebSocket();

      // Avisar a otros que el monitor se unió
      enviarMensaje({
        type: "joinRoom",
        role: "monitor",
        roomId,
        senderId: monitorId
      });

    } catch (err) {
      estaTransmitiendo = false;
      console.error("❌ Error al iniciar transmisión:", err);
      alert("No se pudo iniciar la transmisión. Verifica tu cámara y micrófono.");
    }
  });
});

  // 🚫 DETENER TRANSMISIÓN
  stopButton.addEventListener("click", () => {
    detenerTransmision();
  });

  // 📸 CAPTURAR IMAGEN
  capturarBtn.addEventListener("click", () => {
    if (!localStream) return alert("Primero debes iniciar la transmisión.");
    const canvas = document.getElementById("capturaCanvas");
    const ctx = canvas.getContext("2d");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const screenshot = canvas.toDataURL("image/jpeg", 0.8);
    db.collection("salas").doc(roomId).update({
      screenshot,
      actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => console.log("📸 Captura guardada."));
  });

  // 🔑 VERIFICAR AUTENTICACIÓN (pero sin bloqueo de "no fue creada por ti")
  firebase.auth().onAuthStateChanged(user => {
    if (!user) {
      alert("Debes iniciar sesión.");
      window.location.href = "index.html";
    }
  });

// =====================
// CREAR Y GESTIONAR WEBSOCKET
// =====================
function crearWebSocket() {
  socket = new WebSocket("wss://e6e14acd-d62c-4d98-b810-643a81d486b5-00-2nju91dv3rww3.worf.replit.dev/");

  socket.addEventListener("open", () => {
    enviarMensaje({ type: "joinRoom", role: "monitor", roomId, senderId: monitorId });
  });

  socket.addEventListener("message", handleSocketMessage);

  socket.addEventListener("close", () => {
    setTimeout(crearWebSocket, 3000);
  });
}

// =====================
// ENVIAR MENSAJE
// =====================
function enviarMensaje(msg) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(msg));
  }
}

// =====================
// MANEJAR MENSAJES
// =====================
function handleSocketMessage(event) {
  const data = JSON.parse(event.data);
  const observerId = data.senderId;

  switch (data.type) {
    case "watcher":
      if (localStream) handleNewWatcher(observerId);
      break;
    case "answer":
      const pc = peerConnections[observerId];
      if (pc && pc.signalingState === "have-local-offer") {
        pc.setRemoteDescription(new RTCSessionDescription(data.answer));
      }
      break;
    case "candidate":
      if (peerConnections[observerId]) {
        peerConnections[observerId].addIceCandidate(new RTCIceCandidate(data.candidate));
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
      if (peerConnections[observerId]) {
        peerConnections[observerId].close();
        delete peerConnections[observerId];
      }
      break;
  }
}

// =====================
// NUEVO OBSERVADOR
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
// DETENER TRANSMISIÓN Y CERRAR SALA
// =====================
function detenerTransmision() {
  try {
    // Detener cámara y micrófono
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }

    // Cerrar todas las conexiones con observadores
    if (peerConnections) {
      Object.values(peerConnections).forEach(pc => {
        try { pc.close(); } catch (err) {}
      });
      peerConnections = {};
    }

    // Marcar sala como terminada
    firebase.firestore().collection("salas").doc(roomId).update({
      estado: "terminada",
      observadores: 0,
      terminadaEn: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
      console.log("📛 Sala marcada como terminada.");
    }).catch(err => {
      console.error("❌ Error al marcar sala como terminada:", err);
    });

    // Cerrar WebSocket si sigue abierto
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close();
    }

    alert("🚫 Transmisión finalizada.");
  } catch (err) {
    console.error("⚠️ Error al detener transmisión:", err);
  }
}

// =====================
// MARCAR SALA TERMINADA AL SALIR
// =====================
window.addEventListener("beforeunload", () => {
  firebase.firestore().collection("salas").doc(roomId).update({
    estado: "terminada",
    observadores: 0,
    terminadaEn: firebase.firestore.FieldValue.serverTimestamp()
  }).catch(err => {
    console.warn("⚠️ No se pudo marcar sala como terminada al salir:", err);
  });
});


// =====================
// LISTA DE OBSERVADORES
// =====================
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
