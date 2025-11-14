// 🟢 Importation des bibliothèques
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const cors = require("cors");

// 🟢 Importation du modèle utilisateur
const User = require("./data"); // Assure-toi que data.js contient ton schéma User

// 🟢 Initialisation de l'application Express
const app = express();

// 🔧 Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public")); // Pour servir ton HTML / CSS / JS

// 🟢 Connexion à MongoDB
mongoose
  .connect("mongodb://127.0.0.1:27017/usersDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ Connection error:", err));

// 🟢 Route de test
app.get("/", (req, res) => {
  res.send("🚀 Server is Running...");
});

// 🟢 Route d'inscription (Sign Up)
app.post("/signup", async (req, res) => {
  try {
    const { username, sex, category, email, password, confirmPassword } =
      req.body;

    // 🔒 Vérification des mots de passe
    if (password !== confirmPassword)
      return res.status(400).json({ message: "❌ Passwords do not match" });

    // 🔍 Vérifier si l'email existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "❌ Email already registered" });

    // 🔑 Hachage du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // 🆕 Création d'un nouvel utilisateur
    const newUser = new User({
      username,
      sex,
      category, // ✅ corrigé : minuscule
      email,
      password: hashedPassword,
    });

    await newUser.save();

    res.status(201).json({ message: "✅ User registered successfully" });
  } catch (error) {
    console.error("❌ Detailed Error:", error.message);
    res.status(500).json({ message: error.message });
  }
});

// 🟢 Route de connexion (Login)
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // 🔍 Vérifier si l'utilisateur existe
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "❌ Email not found" });

    // 🔑 Vérifier le mot de passe
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "❌ Incorrect password" });

    // ✅ Connexion réussie
    res.status(200).json({
      message: "✅ Login successful",
      category: user.category, // ✅ corrigé : minuscule
      username: user.username,
      email: user.email,
    });
  } catch (error) {
    console.error("❌ Detailed Error:", error.message);
    res.status(500).json({ message: error.message });
  }
});

// 🟢 Route pour obtenir les données utilisateur (pour le header)
app.get("/user-data", (req, res) => {
  // Note: Dans une vraie application, vous devriez utiliser des sessions ou JWT pour authentifier l'utilisateur
  // Pour l'instant, on simule avec un utilisateur fictif
  res.json({
    username: "John Doe",
    email: "john@example.com",
    profilePic: "image/default-avatar.png",
  });
});

// 🟢 Route de déconnexion
app.get("/logout", (req, res) => {
  // Note: Dans une vraie application, vous devriez détruire la session ou le token
  res.redirect("/login.html");
});

// 🟢 Démarrage du serveur
const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
