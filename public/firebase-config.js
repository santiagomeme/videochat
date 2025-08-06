

console.log("hola desde firebase config.js");

const firebaseConfig = {
  apiKey: "AIzaSyAORIZUCS_YSQ_KVYo5zHN1KR-Q7E5NvXg",
  authDomain: "seguridad-local.firebaseapp.com",
  databaseURL: "https://seguridad-local-default-rtdb.firebaseio.com",
  projectId: "seguridad-local",
  storageBucket: "seguridad-local.appspot.com",
  messagingSenderId: "970137896310",
  appId: "1:970137896310:web:bcb2e58f84ba82872c6657",
  measurementId: "G-T9P73LW23Z"
};
// ✅ Asegurarse de no inicializar más de una vez
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
  console.log("🔥 Firebase inicializado");
} else {
  console.log("⚠️ Firebase ya estaba inicializado");
}






window.firebaseAuth = firebase.auth();
window.db = firebase.firestore();  // <-- Esta es la clave

