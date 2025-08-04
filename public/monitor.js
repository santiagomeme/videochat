let localStream;
const socket = new WebSocket("wss://e6e14acd-d62c-4d98-b810-643a81d486b5-00-2nju91dv3rww3.worf.replit.dev/");
 roomId = new URLSearchParams(window.location.search).get("roomId");
const monitorId = new URLSearchParams(window.location.search).get("monitor");

const peerConnections = {}; // observerId -> RTCPeerConnection

document.addEventListener("DOMContentLoaded", () => {
  const video = document.getElementById("localVideo");
  const startButton = document.getElementById("startBroadcast");

  socket.addEventListener("open", () => {
    console.log("🟢 Conectado al WebSocket");
  });

  startButton.addEventListener("click", async () => {
    try {
      console.log("🎥 Solicitando acceso a cámara...");
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      video.srcObject = localStream;

      // Enviar mensaje de unión como monitor
      socket.send(JSON.stringify({
        type: "joinRoom",
        role: "monitor",
        roomId,
        senderId: monitorId
      }));
    } catch (err) {
      console.error("❌ Error al acceder a la cámara:", err);
    }
  });
  const stopButton = document.getElementById("stopBroadcast");

stopButton.addEventListener("click", () => {
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    video.srcObject = null;

    // Cerrar conexiones con observadores
    Object.values(peerConnections).forEach(pc => pc.close());
    for (const id in peerConnections) {
      delete peerConnections[id];
    }

    // 🔥 Marcar sala como terminada
    if (firebase && firebase.firestore) {
      const db = firebase.firestore();
      db.collection("salas").doc(roomId).update({
        estado: "terminada"
      }).then(() => {
        console.log("📛 Sala marcada como terminada.");
      }).catch((err) => {
        console.error("❌ Error al actualizar sala:", err);
      });
    }

    // Opcional: cerrar socket
    if (socket.readyState === WebSocket.OPEN) {
      socket.close();
    }

    alert("🚫 Transmisión finalizada.");
  }
});

});
async function handleNewWatcher(observerId) {
  try {
    console.log("🎯 Entrando en handleNewWatcher para:", observerId);

    const pc = new RTCPeerConnection();

    localStream.getTracks().forEach(track => {
      console.log("➕ Añadiendo track:", track.kind);
      pc.addTrack(track, localStream);
    });

    pc.onicecandidate = event => {
      if (event.candidate) {
        socket.send(JSON.stringify({
          type: "candidate",
          candidate: event.candidate,
          senderId: monitorId,
          targetId: observerId,
          roomId,
        }));
      }
    };

    peerConnections[observerId] = pc;

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    console.log("📤 Enviando oferta a:", observerId);
    socket.send(JSON.stringify({
      type: "offer",
      offer,
      senderId: monitorId,
      targetId: observerId,
      roomId,
    }));
  } catch (err) {
    console.error("❌ Error en handleNewWatcher:", err);
  }
}


// Escuchar mensajes del servidor
socket.onmessage = async (event) => {
  const data = JSON.parse(event.data);
  const observerId = data.senderId;

  switch (data.type) {
 case "watcher":
  if (localStream) {
    await handleNewWatcher(observerId);
  } else {
    console.warn("⚠️ Se recibió 'watcher' pero aún no se ha iniciado la cámara");
  }
  break;


    case "answer":
      if (peerConnections[observerId]) {
        const pc = peerConnections[observerId];

        // Asegurarse de que aún no se haya aplicado
        if (pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          console.log("✅ Answer aplicada del observador:", observerId);
        } else {
          console.warn("⚠️ Estado inválido para setRemoteDescription(answer):", pc.signalingState);
        }
      }
      break;

    case "candidate":
      if (peerConnections[observerId]) {
        try {
          await peerConnections[observerId].addIceCandidate(new RTCIceCandidate(data.candidate));
          console.log("➕ ICE candidate agregado:", data.candidate);
        } catch (err) {
          console.error("❌ Error agregando ICE candidate:", err);
        }
      }
      break;

    case "disconnectPeer":
      if (peerConnections[observerId]) {
        peerConnections[observerId].close();
        delete peerConnections[observerId];
        console.log("❌ Conexión cerrada con observador:", observerId);
      }
      break;

    default:
      console.warn("⚠️ Mensaje desconocido:", data);
  }
};



const capturarBtn = document.getElementById("capturarBtn");

capturarBtn.addEventListener("click", () => {
  if (!localStream) {
    alert("Primero debes iniciar la transmisión.");
    return;
  }

  const video = document.getElementById("localVideo");
  const canvas = document.getElementById("capturaCanvas");
  const ctx = canvas.getContext("2d");

  // Ajustar el tamaño del canvas al tamaño del video
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  // Dibujar el fotograma actual del video en el canvas
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Convertir el canvas a base64 (puedes cambiar a Blob si quieres optimizar)
  const screenshot = canvas.toDataURL("image/jpeg", 0.8);

  // Subir a Firestore
  if (firebase && firebase.firestore) {
    const db = firebase.firestore();

    db.collection("salas").doc(roomId).update({
      screenshot: screenshot,
      actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
      console.log("📸 Captura guardada exitosamente en Firestore.");
    })
    .catch((error) => {
      console.error("❌ Error al guardar la captura:", error);
    });
  } else {
    console.warn("⚠️ Firebase no está disponible.");
  }
});


//script para q cuando el usuario salga de la sala sin cerrar desde el boton cerrar, tambien se marq la sla como finalzada
window.addEventListener("beforeunload", () => {
  const params = new URLSearchParams(window.location.search);
  const roomId = params.get("roomId");

  if (roomId && firebase && firebase.firestore) {
    const db = firebase.firestore();

    db.collection("salas").doc(roomId).update({
      estado: "terminada"
    }).then(() => {
      console.log("✅ Sala marcada como terminada por cierre inesperado");
    }).catch(err => {
      console.error("❌ Error al actualizar estado de sala:", err);
    });
  }
});

//detectar si el monitor pierde el foco de la transmision o pestaña y envia un mensaje de alerta temprana para q la retome
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      console.warn("⚠️ Estás abandonando la transmisión");
      alert("⚠️ Estás saliendo de la pestaña. La transmisión puede finalizar si no regresas pronto.");
    }
  });


  //permitir al monitor retomar la conexion en la misma sala , solo el puede retomarla
   document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get("roomId");
    const monitorName = params.get("monitor");

    const monitorNameText = document.getElementById("monitorNombre");
    const roomIdText = document.getElementById("roomIdText");
    const shareLinkInput = document.getElementById("shareLink");

    if (monitorNameText && monitorName) monitorNameText.textContent = monitorName;
    if (roomIdText && roomId) roomIdText.textContent = roomId;
    if (shareLinkInput && roomId) {
      const shareLink = `https://myvideofree.web.app/observadores.html?roomId=${roomId}&senderId=observador123`;
      shareLinkInput.value = shareLink;
    }

    // ✅ VERIFICAR UID DEL MONITOR QUE CREÓ LA SALA
    firebase.auth().onAuthStateChanged(async (user) => {
      if (!user) {
        alert("Debes iniciar sesión.");
        window.location.href = "index.html";
        return;
      }

      const doc = await db.collection("salas").doc(roomId).get();
      if (!doc.exists) {
        alert("La sala no existe.");
        window.location.href = "index.html";
        return;
      }

      const data = doc.data();
      if (data.uid !== user.uid) {
        alert("❌ Esta sala no fue creada por ti.");
        window.location.href = "index.html";
        return;
      }

      console.log("✅ Monitor autenticado y autorizado.");
    });
  });