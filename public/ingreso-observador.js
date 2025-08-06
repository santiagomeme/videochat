
  const db = firebase.firestore();
  const contenedorSalas = document.getElementById("salasDisponibles");
  const inputBusqueda = document.getElementById("busquedaSala");
  const contador = document.getElementById("contadorSalas");

  let salasOriginales = [];

  function agregarSala(salaData) {
    const card = document.createElement("div");
    card.className = "sala-card";

    card.innerHTML = `
      <h3>${salaData.monitor || "Monitor desconocido"} 🟢</h3>
      <p><span class="titulo">ID:</span> ${salaData.roomId}</p>
      <p><span class="titulo">Observadores:</span> ${salaData.observadores || 0}</p>
      ${salaData.screenshot ? `<img src="${salaData.screenshot}" style="width:100%;border-radius:8px;margin-bottom:10px;">` : ''}
      <button onclick="unirseSala('${salaData.roomId}', '${salaData.monitor}')">Ver Sala</button>
    `;

    contenedorSalas.appendChild(card);
  }

  function renderizarSalas(salas) {
    if (salas.length === 0) {
      contenedorSalas.innerHTML = "<p style='color:silver;'>No hay salas activas disponibles.</p>";
      contador.textContent = "📡 No hay salas activas en este momento.";
      return;
    }

    contenedorSalas.innerHTML = "";
    salas.forEach(sala => agregarSala(sala));

    contador.textContent = `📡 ${salas.length} sala${salas.length !== 1 ? "s" : ""} activa${salas.length !== 1 ? "s" : ""} actualmente`;
  }

  function unirseSala(roomId, monitor) {
    if (confirm(`¿Quieres unirte a la sala del monitor: ${monitor}?`)) {
      const senderId = `obs-${Math.random().toString(36).substring(2, 8)}`;
      window.location.href = `observadores.html?roomId=${roomId}&senderId=${senderId}`;
    }
  }

  // 🔥 Escuchar solo las salas activas
  db.collection("salas")
    .where("estado", "==", "activa") // Solo salas activas
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

  // 🔍 Filtro de búsqueda
  inputBusqueda.addEventListener("input", () => {
    const filtro = inputBusqueda.value.toLowerCase();
    const filtradas = salasOriginales.filter(sala =>
      sala.monitor.toLowerCase().includes(filtro)
    );
    renderizarSalas(filtradas);
  });

  // ✅ Mostrar nombre de usuario autenticado
  firebase.auth().onAuthStateChanged(user => {
    const estadoSesion = document.getElementById("estadoSesion");
    if (user) {
      estadoSesion.textContent = `✅ Autenticado como: ${user.displayName || "Usuario"} (UID: ${user.uid})`;
      estadoSesion.style.color = "green";
    } else {
      estadoSesion.textContent = "❌ No autenticado. Es necesario iniciar sesión.";
      estadoSesion.style.color = "red";
    }
  });

  // ✅ Unirse con input manual (solo uno, no duplicado)
  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("joinRoomBtn").addEventListener("click", (e) => {
      e.preventDefault();

      const roomId = document.getElementById("roomIdInput").value.trim();
      const nombre = document.getElementById("nombreInput").value.trim();

      if (!roomId || !nombre) {
        alert("Por favor ingresa el ID de la sala y tu nombre.");
        return;
      }

      const senderId = `obs_${Math.random().toString(36).substring(2, 8)}`;
      window.location.href = `observadores.html?roomId=${roomId}&senderId=${senderId}&nombre=${encodeURIComponent(nombre)}`;
    });
//nombre del observador,
  const nombre = document.getElementById("nombreInput").value.trim();
window.location.href = `observadores.html?roomId=${roomId}&senderId=obs_123&nombre=${encodeURIComponent(nombre)}`;
  });