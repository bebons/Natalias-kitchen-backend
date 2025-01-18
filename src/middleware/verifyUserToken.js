const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      require("../../config/firebase-adminsdk.json")
    ),
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
