// 🟢 Importation des bibliothèques
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const cors = require("cors");
const path = require("path");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

// 🟢 Importation du modèle utilisateur
const User = require("./data"); // Assure-toi que data.js contient ton schéma User
const Request = require("./requestModel");

// 🟢 Initialisation de l'application Express
const app = express();

// 🔧 Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public")); // Pour servir ton HTML / CSS / JS

app.use('/image', express.static(path.join(__dirname, 'image')));

// 🟢 Configuration de Nodemailer pour Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'rahmaabdo270@gmail.com', // Remplace par ton email Gmail
    pass: 'ywkq kjor wkro vmsl' // Le mot de passe d'application que tu as fourni
  }
});

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

let otpStore = {}; // Temporary memory (you can put OTP in DB later)

app.post("/send-otp", async (req, res) => {
  const { email } = req.body;

  const otp = Math.floor(100000 + Math.random() * 900000); // 6-digit OTP
  otpStore[email] = otp;

  const mailOptions = {
    from: 'rahmaabdo270@gmail.com',
    to: email,
    subject: 'Your OTP Code',
    html: `
      <h2 style="color:#8d74c5;">Email Confirmation Code</h2>
      <p>Your OTP code is:</p>
      <h1 style="letter-spacing:4px">${otp}</h1>
      <p>This code expires in 10 minutes.</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return res.json({ message: "📩 OTP has been sent to your email" });
  } catch (error) {
    console.error("❌ send-otp error:", error);
    console.error("❌ Full error details:", JSON.stringify(error, null, 2));
    // Remove OTP from store on failure
    delete otpStore[email];
    return res.status(500).json({ message: "❌ Failed to send OTP. Please try again later." });
  }
});
app.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;

  if (otpStore[email] && otpStore[email] == otp) {
    delete otpStore[email];
    return res.json({ valid: true });
  }

  res.json({ valid: false });
});

// 🟢 Route d'inscription (Sign Up)
app.post("/signup", async (req, res) => {
  try {
    const { username, sex, category, email, password, confirmPassword, otpVerified } = req.body;

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
      category,
      email,
      password: hashedPassword,
      verificationToken: otpVerified ? undefined : crypto.randomBytes(32).toString('hex'),
      isVerified: otpVerified ? true : false
    });

    await newUser.save();

    if (otpVerified) {
      // OTP already verified, no need for email verification
      res.status(201).json({
        message: "✅ User registered successfully. Your email is already verified.",
        requiresVerification: false
      });
    } else {
      // Send verification email if OTP not verified
      const verificationUrl = `http://localhost:3000/verify-email?token=${newUser.verificationToken}&email=${encodeURIComponent(email)}`;

      const mailOptions = {
        from: 'micheldessanta01@gmail.com',
        to: email,
        subject: 'Verify Your Email Address',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #8d74c5;">Email Verification</h2>
            <p>Hello ${username},</p>
            <p>Thank you for signing up! Please verify your email address by clicking the button below:</p>
            <a href="${verificationUrl}"
               style="background-color: #8d74c5; color: white; padding: 12px 24px;
                      text-decoration: none; border-radius: 25px; display: inline-block;">
              Verify Email Address
            </a>
            <p>Or copy and paste this link in your browser:</p>
            <p>${verificationUrl}</p>
            <p>If you didn't create an account, please ignore this email.</p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);

      res.status(201).json({
        message: "✅ User registered successfully. Please check your email to verify your account.",
        requiresVerification: true
      });
    }
  } catch (error) {
    console.error("❌ Detailed Error:", error.message);
    res.status(500).json({ message: error.message });
  }
});

// 🟢 Route de vérification d'email
app.get("/verify-email", async (req, res) => {
  try {
    const { token, email } = req.query;

    const user = await User.findOne({ 
      email: decodeURIComponent(email), 
      verificationToken: token 
    });

    if (!user) {
      return res.status(400).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2 style="color: red;">Invalid verification link</h2>
            <p>The verification link is invalid or has expired.</p>
            <a href="/login.html">Go to Login</a>
          </body>
        </html>
      `);
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.send(`
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2 style="color: green;">Email Verified Successfully!</h2>
          <p>Your email has been verified. You can now login to your account.</p>
          <a href="/login.html" 
             style="background-color: #8d74c5; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 25px; display: inline-block;">
            Go to Login
          </a>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("❌ Verification error:", error);
    res.status(500).send("Internal server error");
  }
});

// 🟢 Route de connexion (Login) - Mise à jour pour vérifier l'email
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // 🔍 Vérifier si l'utilisateur existe
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "❌ Email not found" });

    // 🔑 Vérifier si l'email est vérifié
    if (!user.isVerified) {
      return res.status(400).json({ 
        message: "❌ Please verify your email before logging in. Check your inbox for the verification link." 
      });
    }

    // 🔑 Vérifier le mot de passe
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "❌ Incorrect password" });

    // ✅ Connexion réussie
    res.status(200).json({
      message: "✅ Login successful",
      category: user.category,
      username: user.username,
      email: user.email,
    });
  } catch (error) {
    console.error("❌ Detailed Error:", error.message);
    res.status(500).json({ message: error.message });
  }
});

// 🟢 Route pour renvoyer l'email de vérification
app.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "❌ Email not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "❌ Email is already verified" });
    }

    // Générer un nouveau token
    const newVerificationToken = crypto.randomBytes(32).toString('hex');
    user.verificationToken = newVerificationToken;
    await user.save();

    // Renvoyer l'email
    const verificationUrl = `http://localhost:3000/verify-email?token=${newVerificationToken}&email=${encodeURIComponent(email)}`;
    
    const mailOptions = {
      from: 'rahmaabdo270@gmail.com',
      to: email,
      subject: 'Confirm Authentication',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #8d74c5;">Email Verification</h2>
          <p>Hello ${user.username},</p>
          <p>Please verify your email address by clicking the button below:</p>
          <a href="${verificationUrl}"
             style="background-color: #8d74c5; color: white; padding: 12px 24px;
                    text-decoration: none; border-radius: 25px; display: inline-block;">
            Verify Email Address
          </a>
          <p>Or copy and paste this link in your browser:</p>
          <p>${verificationUrl}</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.json({ message: "✅ Verification email sent successfully" });
  } catch (error) {
    console.error("❌ Resend verification error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// 🟢 Route pour obtenir les données utilisateur (pour le header)
app.get("/user-data", async (req, res) => {
  try {
    // Note: Dans une vraie application, vous devriez utiliser des sessions ou JWT
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      username: user.username,
      email: user.email,
      profilePic: "image/default-avatar.png",
      isVerified: user.isVerified
    });
  } catch (error) {
    console.error("❌ User data error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// 🟢 API pour obtenir toutes les demandes (requests)
app.get('/api/requests', async (req, res) => {
  try {
    const requests = await Request.find().sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    console.error('❌ /api/requests error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 🟢 API pour créer une nouvelle demande (useful for seeding/testing)
app.post('/api/requests', async (req, res) => {
  try {
    const { requestId, name, date, condition } = req.body;
    const newReq = new Request({ requestId, name, date, condition });
    await newReq.save();
    res.status(201).json(newReq);
  } catch (error) {
    console.error('❌ POST /api/requests error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 🟢 API pour obtenir un vendeur (seller) par ID
app.get('/api/seller/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'Seller id is required' });

    const seller = await User.findById(id).select('username email');
    if (!seller) return res.status(404).json({ message: 'Seller not found' });

    res.json({
      username: seller.username,
      email: seller.email,
      profileImage: 'image/default-avatar.png'
    });
  } catch (error) {
    console.error('❌ GET /api/seller/:id error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 🟢 Route de déconnexion
app.get("/logout", (req, res) => {
  res.redirect("/login.html");
});

// 🟢 Démarrage du serveur
const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));