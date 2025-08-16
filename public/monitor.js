document.addEventListener("DOMContentLoaded", () => {
  // =====================
  // VARIABLES GLOBALES
  // =====================
  let socket;
  let localStream;
  let roomId, monitorNombre, monitorId;
  let estaTransmitiendo = false;
  let peerConnections = {};
  const observadoresConectados = {};

  // =====================
  // LEER DATOS DESDE URL
  // =====================
  const params = new URLSearchParams(window.location.search);
  roomId = params.get("roomId");
  monitorNombre = params.get("monitor"); // viene desde crearSala.js
  monitorId = `monitor_${Math.random().toString(36).substring(2, 8)}`;

  if (!roomId || !monitorNombre) {
    alert("No se recibió la información de la sala.");
    window.location.href = "index.html";
    return;
  }

  // =====================
  // INICIALIZACIÓN DEL DOM
  // =====================
  const video = document.getElementById("localVideo");
  const startButton = document.getElementById("startBroadcast");
  const stopButton = document.getElementById("stopBroadcast");
  const capturarBtn = document.getElementById("capturarBtn");
  const monitorNameText = document.getElementById("monitorNombre");
  const roomIdText = document.getElementById("roomIdText");
  const shareLinkInput = document.getElementById("shareLink");

  if (monitorNameText) monitorNameText.textContent = monitorNombre;
  if (roomIdText) roomIdText.textContent = roomId;
  if (shareLinkInput) {
    shareLinkInput.value = `https://myvideofree.web.app/observadores.html?roomId=${roomId}`;
  }

  const db = firebase.firestore();
  // Escuchar cambios en número de observadores
  db.collection("salas").doc(roomId).onSnapshot(doc => {
    if (doc.exists) {
      const data = doc.data();
      const totalObs = data.observadores || 0;
      const totalElem = document.getElementById("totalObservadores");
      if (totalElem) totalElem.textContent = totalObs;
    }
  });

  // =====================
  // INICIAR TRANSMISIÓN
  // =====================
  startButton.addEventListener("click", async () => {
    console.log("🎬 Iniciando transmisión...");
    try {
      estaTransmitiendo = true;

      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      video.srcObject = localStream;
      console.log("✅ Stream local obtenido:", localStream);

      await db.collection("salas").doc(roomId).update({
        monitor: monitorNombre,
        estado: "activa",
        observadores: 0,
        actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
      });
      console.log("📡 Sala actualizada en Firestore");

      crearWebSocket();

      enviarMensaje({
        type: "joinRoom",
        role: "monitor",
        roomId,
        senderId: monitorId,
        nombre: monitorNombre
      });
      console.log("📤 Mensaje joinRoom enviado al servidor");

    } catch (err) {
      estaTransmitiendo = false;
      console.error("❌ Error al iniciar transmisión:", err);
      alert("No se pudo iniciar la transmisión.");
    }
  });

  // =====================
  // DETENER TRANSMISIÓN
  // =====================
  stopButton.addEventListener("click", () => {
    detenerTransmision();
  });

  // =====================
  // CREAR Y GESTIONAR WEBSOCKET
  // =====================
  function crearWebSocket() {
    console.log("🔌 Conectando al WebSocket...");
    socket = new WebSocket("wss://e6e14acd-d62c-4d98-b810-643a81d486b5-00-2nju91dv3rww3.worf.replit.dev/");

    socket.addEventListener("open", () => {
      console.log("✅ WebSocket conectado");
      enviarMensaje({ 
        type: "joinRoom", 
        role: "monitor", 
        roomId, 
        senderId: monitorId, 
        nombre: monitorNombre 
      });
    });

    socket.addEventListener("message", handleSocketMessage);

    socket.addEventListener("error", (err) => {
      console.error("⚠️ Error en WebSocket:", err);
    });

    socket.addEventListener("close", () => {
      console.warn("🔌 WebSocket cerrado, intentando reconectar...");
      setTimeout(crearWebSocket, 3000); // reconexión automática
    });
  }

  function enviarMensaje(msg) {
    if (socket && socket.readyState === WebSocket.OPEN) {
      console.log("📤 Enviando mensaje:", msg);
      socket.send(JSON.stringify(msg));
    } else {
      console.warn("⚠️ No se pudo enviar, WebSocket no está abierto:", msg);
    }
  }

  function handleSocketMessage(event) {
    const data = JSON.parse(event.data);
    console.log("📩 Mensaje WS recibido:", data);

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

      case "chat":
        if (data.roomId === roomId) {
          mostrarMensaje(data, false);
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
  // CHAT
  // =====================
  const chatForm = document.getElementById("chatForm");
  const chatInput = document.getElementById("chatInput");
  const chatList = document.getElementById("chatList");

  if (chatForm) {
    chatForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const mensaje = chatInput.value.trim();
      if (!mensaje) return;

      enviarMensaje({
        type: "chat",
        roomId,
        senderId: monitorId,
        nombre: monitorNombre,
        mensaje
      });

      chatInput.value = "";
      mostrarMensaje({ nombre: monitorNombre, mensaje }, true); // mensaje propio
    });
  }

  function mostrarMensaje(data, esPropio = false) {
    const li = document.createElement("li");
    li.className = esPropio ? "mensaje-propio" : "mensaje";
    li.textContent = `${data.nombre}: ${data.mensaje}`;
    chatList.appendChild(li);
    chatList.scrollTop = chatList.scrollHeight;
  }

  // =====================
  // CAPTURAR IMAGEN
  // =====================
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
    });
  });

  // =====================
  // WEBRTC MANEJO
  // =====================
  async function handleNewWatcher(observerId) {
    console.log(`👀 Nuevo observador conectado: ${observerId}`);
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

  function detenerTransmision() {
    console.log("🛑 Deteniendo transmisión...");
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnections) {
      Object.values(peerConnections).forEach(pc => {
        try { pc.close(); } catch {}
      });
      peerConnections = {};
    }

    firebase.firestore().collection("salas").doc(roomId).update({
      estado: "terminada",
      observadores: 0,
      terminadaEn: firebase.firestore.FieldValue.serverTimestamp()
    });

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close();
    }

    alert("🚫 Transmisión finalizada.");
  }

  window.addEventListener("beforeunload", () => {
    firebase.firestore().collection("salas").doc(roomId).update({
      estado: "terminada",
      observadores: 0,
      terminadaEn: firebase.firestore.FieldValue.serverTimestamp()
    });
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

  // =====================
  // AUTENTICACIÓN
  // =====================
  firebase.auth().onAuthStateChanged(user => {
    if (!user) {
      alert("Debes iniciar sesión.");
      window.location.href = "index.html";
    }
  });
});
