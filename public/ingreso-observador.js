// ingreso-observador.js
const db = firebase.firestore();
const contenedorSalas = document.getElementById("salasDisponibles");
const inputBusqueda = document.getElementById("busquedaSala");
const contador = document.getElementById("contadorSalas");
const joinBtn = document.getElementById("joinRoomBtn");
const roomIdInput = document.getElementById("roomIdInput");
const nombreInput = document.getElementById("nombreInput");

let salasOriginales = [];

db.collection("salas")
  .where("estado", "in", ["activa", "activo"])
  .orderBy("creadoEn", "desc")
  .onSnapshot(snapshot => {
    salasOriginales = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      salasOriginales.push({
        roomId: doc.id,
        monitor: data.monitor || "Desconocido",
        estado: data.estado,
        observadores: data.observadores || 0,
        screenshot: data.screenshot || null
      });
    });
    renderizarSalas(salasOriginales);
  });

function agregarSala(salaData) {
  const card = document.createElement("div");
  card.className = "sala-card";
  card.innerHTML = `
    <h3>${salaData.monitor} 🟢</h3>
    <p><span class="titulo">ID:</span> ${salaData.roomId}</p>
    <p><span class="titulo">Observadores:</span> ${salaData.observadores}</p>
    ${salaData.screenshot ? `<img src="${salaData.screenshot}" style="width:100%;border-radius:8px;margin-bottom:10px;">` : ''}
    <button onclick="seleccionarSala('${salaData.roomId}')">Ver Sala</button>
  `;
  contenedorSalas.appendChild(card);
}

function renderizarSalas(salas) {
  if (salas.length === 0) {
    contenedorSalas.innerHTML = "<p style='color:silver;'>No hay salas activas disponibles.</p>";
    contador.textContent = "📡 No hay salas activas.";
    return;
  }
  contenedorSalas.innerHTML = "";
  salas.forEach(sala => agregarSala(sala));
  contador.textContent = `📡 ${salas.length} sala${salas.length !== 1 ? "s" : ""} activa${salas.length !== 1 ? "s" : ""}`;
}

function seleccionarSala(roomId) {
  roomIdInput.value = roomId;
  validarCampos();
}

inputBusqueda.addEventListener("input", () => {
  const filtro = inputBusqueda.value.toLowerCase();
  const filtradas = salasOriginales.filter(sala =>
    sala.monitor.toLowerCase().includes(filtro)
  );
  renderizarSalas(filtradas);
});

firebase.auth().onAuthStateChanged(user => {
  const estadoSesion = document.getElementById("estadoSesion");
  if (user) {
    estadoSesion.textContent = `✅ Autenticado como: ${user.displayName || "Usuario"} (UID: ${user.uid})`;
    estadoSesion.style.color = "green";
  } else {
    estadoSesion.textContent = "❌ No autenticado.";
    estadoSesion.style.color = "red";
  }
});

function validarCampos() {
  const nombre = nombreInput.value.trim();
  const roomId = roomIdInput.value.trim();
  joinBtn.disabled = !(nombre && roomId);
}

[nombreInput, roomIdInput].forEach(input =>
  input.addEventListener("input", validarCampos)
);

joinBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  const roomId = roomIdInput.value.trim();
  const nombre = nombreInput.value.trim();
  if (!roomId || !nombre) {
    alert("Por favor ingresa el ID y tu nombre.");
    return;
  }
  try {
    const salaDoc = await db.collection("salas").doc(roomId).get();
    if (!salaDoc.exists) {
      alert("⚠️ La sala no existe.");
      return;
    }
    const data = salaDoc.data();
    if (!(data.estado === "activa" || data.estado === "activo")) {
      alert("⚠️ Esta sala ya no está activa.");
      return;
    }
    const senderId = `obs_${Math.random().toString(36).substring(2, 8)}`;
    window.location.href = `observadores.html?roomId=${roomId}&senderId=${senderId}&nombre=${encodeURIComponent(nombre)}`;
  } catch (err) {
    console.error("❌ Error verificando la sala:", err);
    alert("Error interno al verificar la sala.");
  }
});
