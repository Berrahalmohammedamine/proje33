const mongoose = require("mongoose");

// Définition du schéma utilisateur
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
    },
    sex: {
      type: String,
      required: true,
      enum: ["male", "female", "other"], // Ajuste selon tes besoins
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true, // Ajoute createdAt et updatedAt
  }
);

// Création du modèle
const User = mongoose.model("User", userSchema);

module.exports = User;
