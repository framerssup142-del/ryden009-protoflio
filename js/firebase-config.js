/* ==========================================================
   حط هنا بيانات مشروع Firebase بتاعك
   (Project settings ⚙️ → Your apps → Web app → SDK config)
   ========================================================== */
const firebaseConfig = {
  apiKey: "AIzaSyAZKzUxlId48-TjS4STnMH0c4xoyaC196M",
  authDomain: "ryden-potoflio.firebaseapp.com",
  projectId: "ryden-potoflio",
  storageBucket: "ryden-potoflio.firebasestorage.app",
  messagingSenderId: "956324832371",
  appId: "1:956324832371:web:9d997d3f8b0baaaad87606",
  measurementId: "G-C1NM9F229Q"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
