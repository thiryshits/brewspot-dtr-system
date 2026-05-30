import { initializeApp }
from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";

import { getAuth }
from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

import { getDatabase }
from "https://www.gstatic.com/firebasejs/12.13.0/firebase-database.js";

import { getStorage }
from "https://www.gstatic.com/firebasejs/12.13.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyAhjwELYhK2fTYQ5rMQLOv8sfNlbnpREHA",
  authDomain: "brewspot-dtr-system.firebaseapp.com",
  databaseURL: "https://brewspot-dtr-system-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "brewspot-dtr-system",
  storageBucket: "brewspot-dtr-system.firebasestorage.app",
  messagingSenderId: "643659198322",
  appId: "1:643659198322:web:b682e16d95c7501ce8f7eb"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const database = getDatabase(app);
const storage = getStorage(app);

export { auth, database, storage };