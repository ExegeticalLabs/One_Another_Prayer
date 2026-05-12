import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, deleteDoc } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("./src/firebase-applet-config.json"));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function run() {
  const mSnap = await getDocs(collection(db, "memberships"));
  console.log("Memberships:", mSnap.docs.map(d => ({id: d.id, ...d.data()})));
  process.exit(0);
}
run();
