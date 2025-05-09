document.addEventListener('DOMContentLoaded', () => {
  // Inicializar Firebase solo si no está ya inicializado
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  const db = firebase.firestore();
  window.firebaseDB = db; // Hacer la BD accesible globalmente si se necesita

  // Obtener elementos del DOM
  const messagesDiv = document.getElementById('messages');
  const messageInput = document.getElementById('messageInput');
  const sendMessageBtn = document.getElementById('sendMessage');

  // Verificación básica de elementos
  if (!messagesDiv || !messageInput || !sendMessageBtn) {
    console.warn('mensajes.js: Esta página no contiene el chat. Script omitido.');
    return;
  }

  // Obtener parámetros de la URL
  const urlParams = new URLSearchParams(window.location.search);
  const roomId = urlParams.get('roomId');
  const senderId = urlParams.get('senderId') || 'Anónimo';

  if (!roomId) {
    console.warn('mensajes.js: Falta el parámetro roomId en la URL. Script omitido.');
    return;
  }

  // Escuchar en tiempo real los mensajes de la sala
  db.collection('messages')
    .where('roomId', '==', roomId)
    .orderBy('timestamp')
    .onSnapshot(snapshot => {
      messagesDiv.innerHTML = ''; // Limpiar el contenedor de mensajes
      snapshot.forEach(doc => {
        const message = doc.data();
        const div = document.createElement('div');
        div.textContent = `${message.senderId}: ${message.messageText}`;
        messagesDiv.appendChild(div);
      });
      messagesDiv.scrollTop = messagesDiv.scrollHeight; // Auto scroll al final
    });

  // Enviar un mensaje nuevo
  sendMessageBtn.addEventListener('click', () => {
    const messageText = messageInput.value.trim();
    if (!messageText) return;

    db.collection('messages').add({
      roomId,
      senderId,
      messageText,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    messageInput.value = '';
  });
});
