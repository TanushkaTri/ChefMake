// controllers/authController.js

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const {
  findUserByEmail,
  createUser,
  findUserById,
  updateUserName,
  updateUserPassword,
  updateLoginMeta
} = require("../models/userModel");

const { generateToken } = require("../utils/jwt");
const pool = require('../config/db');
const supabaseAdmin = require("../services/supabaseClient");
const crypto = require("crypto");

const RESET_SECRET = process.env.RESET_SECRET || process.env.JWT_SECRET;
const SUPABASE_RESET_REDIRECT =
  process.env.SUPABASE_RESET_REDIRECT || process.env.FRONTEND_URL || "http://localhost:8080/reset-password";

// Register a new user
exports.register = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const newUser = await createUser({ name, email, password: hashed });
    const token = generateToken(newUser);

    console.log(`[REGISTER] New user registered: ${email} (ID: ${newUser.id})`);
    res.status(201).json({ user: newUser, token });
  } catch (err) {
    console.error(`[REGISTER ERROR] ${err.message}`);
    res.status(500).json({ message: "Registration failed. Please try again later." });
  }
};

// Login an existing user
exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user);

    // Update login metadata
    await updateLoginMeta(user.id);
    
    console.log(`[LOGIN] ${email} logged in`);

    const updatedUser = await findUserById(user.id);
    res.status(200).json({ user: updatedUser, token });
  } catch (err) {
    console.error(`[LOGIN ERROR] ${err.message}`);
    res.status(500).json({ message: "Login failed. Please try again later." });
  }
};

// Logout user (no badge logic involved)
exports.logout = async (req, res) => {
  console.log(`[LOGOUT] User ID ${req.user.id} logged out`);
  res.status(200).json({ message: "Logged out" });
};

// Fetch current user info
exports.getMe = async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ user });
  } catch (err) {
    console.error(`[GET ME ERROR] ${err.message}`);
    res.status(500).json({ message: "Failed to retrieve user information. Please try again later." });
  }
};

// Update user's name
exports.updateProfile = async (req, res) => {
  try {
    const updated = await updateUserName(req.user.id, req.body.name);
    console.log(`[UPDATE PROFILE] User ${req.user.id} changed name to ${req.body.name}`);
    res.status(200).json({ user: updated });
  } catch (err) {
    console.error(`[UPDATE PROFILE ERROR] ${err.message}`);
    res.status(500).json({ message: "Failed to update profile. Please try again later." });
  }
};

// Change user password
exports.changePassword = async (req, res) => {
  try {
    const hashed = await bcrypt.hash(req.body.newPassword, 10);
    await updateUserPassword(req.user.id, hashed);
    console.log(`[CHANGE PASSWORD] User ${req.user.id} changed password`);
    res.status(200).json({ message: "Password changed" });
  } catch (err) {
    console.error(`[CHANGE PASSWORD ERROR] ${err.message}`);
    res.status(500).json({ message: "Failed to change password. Please try again later." });
  }
};

// Request password reset: generate token (1h) and return it (for testing). In production send via email.
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email обязателен" });
    }

    // Если supabase настроен — отправляем письмо через Supabase Auth
    if (supabaseAdmin) {
      const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
        redirectTo: SUPABASE_RESET_REDIRECT,
      });
      if (error) {
        // Не раскрываем, существует ли пользователь
        console.error("[FORGOT PASSWORD][SUPABASE] error:", error.message);
      }
      return res
        .status(200)
        .json({ message: "Если аккаунт существует, письмо со ссылкой отправлено." });
    }

    // Fallback: локальный токен (используется, если supabase не сконфигурирован)
    const user = await findUserByEmail(email);
    if (!user || !RESET_SECRET) {
      return res
        .status(200)
        .json({ message: "Если аккаунт существует, письмо со ссылкой отправлено." });
    }

    const resetToken = jwt.sign({ id: user.id, type: "reset" }, RESET_SECRET, {
      expiresIn: "1h",
    });

    return res.status(200).json({
      message: "Если аккаунт существует, письмо со ссылкой отправлено.",
      token: resetToken, // для теста; в проде не возвращайте
    });
  } catch (err) {
    console.error("[FORGOT PASSWORD ERROR]", err);
    res.status(500).json({ message: "Не удалось отправить ссылку." });
  }
};

// Reset password using token
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password || !RESET_SECRET) {
      return res.status(400).json({ message: "Недостаточно данных для сброса пароля" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, RESET_SECRET);
    } catch (err) {
      return res.status(400).json({ message: "Токен недействителен или истёк" });
    }

    if (decoded.type !== "reset" || !decoded.id) {
      return res.status(400).json({ message: "Токен недействителен" });
    }

    const user = await findUserById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    const hashed = await bcrypt.hash(password, 10);
    await updateUserPassword(user.id, hashed);

    return res.status(200).json({ message: "Пароль успешно сброшен." });
  } catch (err) {
    console.error("[RESET PASSWORD ERROR]", err);
    res.status(500).json({ message: "Не удалось сбросить пароль." });
  }
};

// OAuth via Supabase: exchange Supabase access_token for local JWT
exports.supabaseLogin = async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ message: "Supabase is not configured on the server." });
    }

    const authHeader = req.headers.authorization || "";
    const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!accessToken) {
      return res.status(400).json({ message: "Missing Supabase access token" });
    }

    const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (error || !data?.user) {
      console.error("[SUPABASE LOGIN] Failed to get user:", error);
      return res.status(401).json({ message: "Invalid Supabase token" });
    }

    const supaUser = data.user;
    const email = supaUser.email;
    const name =
      supaUser.user_metadata?.name ||
      supaUser.user_metadata?.full_name ||
      supaUser.user_metadata?.user_name ||
      email;

    if (!email) {
      return res.status(400).json({ message: "Supabase profile missing email" });
    }

    let localUser = await findUserByEmail(email);
    if (!localUser) {
      // Create a random password (unused) to satisfy local schema
      const randomPassword = crypto.randomBytes(16).toString("hex");
      const hashed = await bcrypt.hash(randomPassword, 10);
      localUser = await createUser({ name, email, password: hashed });
      console.log(`[SUPABASE LOGIN] Created local user for ${email} (ID: ${localUser.id})`);
    }

    const token = generateToken(localUser);
    const freshUser = await findUserById(localUser.id);

    return res.status(200).json({ user: freshUser, token });
  } catch (err) {
    console.error("[SUPABASE LOGIN ERROR]", err);
    res.status(500).json({ message: "Supabase login failed" });
  }
};