const admin = require("firebase-admin");
require("dotenv").config();

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"), // handle newlines in private key
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL, // Koristite varijablu za URL baze
  });
} else {
  admin.app(); // Ako je Firebase već inicijalizovan, koristi postojeću instancu
}

const verifyUserToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Token not provided" });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken; // Dodaj informacije o korisniku u `req.user`
    next();
  } catch (error) {
    console.error("Error verifying token:", error);
    res.status(403).json({ message: "Invalid or expired token" });
  }
};

module.exports = verifyUserToken;
