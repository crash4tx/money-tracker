require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { createClient } = require("@supabase/supabase-js");
const nodemailer = require("nodemailer");

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS & JSON parsing
app.use(cors());
app.use(express.json());

// Serving static frontend files
app.use(express.static(path.join(__dirname)));

// Configuration Settings
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || "";
const jwtSecret = process.env.JWT_SECRET || "luxentra_jwt_secret_key_12345";

// Check if we are running in Mock Mode (if Supabase is not configured)
const isMockMode = !supabaseUrl || 
                   supabaseUrl.includes("your-project-id") || 
                   !supabaseKey || 
                   supabaseKey.includes("your-supabase-");

let supabase = null;

if (isMockMode) {
  console.log("\n=======================================================");
  console.log("⚠️  WARNING: Berjalan dalam MODE MOCK DATABASE (In-Memory)");
  console.log("Kredensial Supabase di file .env belum dikonfigurasi.");
  console.log("Semua data baru hanya akan disimpan sementara di memori.");
  console.log("=======================================================\n");
} else {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log("\n=======================================================");
    console.log("🔌 Terhubung dengan database PostgreSQL Supabase!");
    console.log(`URL: ${supabaseUrl}`);
    console.log("=======================================================\n");
  } catch (error) {
    console.error("Gagal menginisialisasi client Supabase:", error);
    process.exit(1);
  }
}

// ==========================================
// MOCK DATABASE DATA (Untuk mode Fallback)
// ==========================================
let mockUsers = [
  {
    id: "admin-uuid-1111-2222",
    name: "Admin Luxentra",
    email: "admin@luxentra.app",
    password_hash: "", // Akan di-hash saat server start
    role: "admin",
    status: "active",
    created_at: new Date().toISOString()
  },
  {
    id: "user-uuid-1111-2222",
    name: "Faiz Mahardika",
    email: "faiz@luxentra.app",
    password_hash: "", // Akan di-hash saat server start
    role: "user",
    status: "active",
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Hash default mock passwords
(async () => {
  mockUsers[0].password_hash = await bcrypt.hash("admin123", 10);
  mockUsers[1].password_hash = await bcrypt.hash("user1234", 10);
})();

let mockCategories = [
  { id: "c1", label: "Makanan", type: "Pengeluaran", color: "#8751ED", iconLabel: "MK", user_id: null },
  { id: "c2", label: "Transport", type: "Pengeluaran", color: "#FF3434", iconLabel: "TR", user_id: null },
  { id: "c3", label: "Hiburan", type: "Pengeluaran", color: "#10C260", iconLabel: "HB", user_id: null },
  { id: "c4", label: "Belanja", type: "Pengeluaran", color: "#1653B5", iconLabel: "BL", user_id: null },
  { id: "c5", label: "Tagihan", type: "Pengeluaran", color: "#43A8E6", iconLabel: "TG", user_id: null },
  { id: "c6", label: "Kesehatan", type: "Pengeluaran", color: "#FF7A21", iconLabel: "KS", user_id: null },
  { id: "c7", label: "Pendidikan", type: "Pengeluaran", color: "#EAB308", iconLabel: "PD", user_id: null },
  { id: "c8", label: "Gaji", type: "Pemasukan", color: "#10C260", iconLabel: "GJ", user_id: null },
  { id: "c9", label: "Freelance", type: "Pemasukan", color: "#43A8E6", iconLabel: "FL", user_id: null },
  { id: "c10", label: "Investasi", type: "Pemasukan", color: "#8751ED", iconLabel: "IV", user_id: null },
  { id: "c11", label: "Bonus", type: "Pemasukan", color: "#EAB308", iconLabel: "BN", user_id: null },
  { id: "c12", label: "Lainnya", type: "Lainnya", color: "#64748b", iconLabel: "LN", user_id: null }
];

let mockTransactions = [
  {
    id: "tx-1",
    user_id: "user-uuid-1111-2222",
    amount: 15000000,
    type: "Pemasukan",
    category_id: "c8",
    note: "Gaji Bulanan",
    date: new Date().toISOString().split("T")[0],
    created_at: new Date().toISOString()
  },
  {
    id: "tx-2",
    user_id: "user-uuid-1111-2222",
    amount: -120000,
    type: "Pengeluaran",
    category_id: "c1",
    note: "Makan Siang Bersama Teman",
    date: new Date().toISOString().split("T")[0],
    created_at: new Date().toISOString()
  }
];

let mockBroadcasts = [
  {
    id: "bc-1",
    message: "Selamat datang di Luxentra Finance v2! Integrasi database baru berhasil dilakukan.",
    timestamp: new Date().toISOString()
  }
];

// ==========================================
// UTILITY FUNCTIONS & MIDDLEWARE
// ==========================================
const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function formatLongDate(dateLike) {
  const date = new Date(dateLike);
  if (isNaN(date.getTime())) return "Tanggal Tidak Valid";
  return `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

function buildTransactionTitle({ type, category, note, dateLabel }) {
  const cleanNote = `${note || ""}`.trim();
  if (cleanNote) {
    return cleanNote.length > 34 ? `${cleanNote.slice(0, 34).trim()}...` : cleanNote;
  }
  const monthLabel = `${dateLabel || ""}`.split(" ")[1] || "";
  if (type === "Pemasukan" && category === "Gaji" && monthLabel) {
    return `Gaji Bulan ${monthLabel}`;
  }
  if (type === "Pemasukan" && category === "Bonus") {
    return "Bonus Tambahan";
  }
  if (type === "Pemasukan" && category === "Investasi") {
    return "Pendapatan Investasi";
  }
  if (type === "Pengeluaran" && category === "Belanja") {
    return "Belanja Bulanan";
  }
  return category || type;
}

// Middleware: Authenticate JWT Token
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Akses ditolak. Token otorisasi tidak ditemukan." });
  }

  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Sesi Anda telah berakhir. Silakan login kembali." });
    }
    req.user = user;
    next();
  });
}

// Middleware: Admin Guard
function requireAdmin(req, res, next) {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ error: "Akses ditolak. Fitur ini hanya untuk administrator." });
  }
}

// Helper untuk validasi password
function validatePasswordStrength(password) {
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  return password.length >= 8 && hasUpperCase && hasLetter && hasNumber;
}

// SMTP Transporter configuration
const smtpHost = process.env.SMTP_HOST;
const smtpPort = parseInt(process.env.SMTP_PORT || "465", 10);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

const isSmtpConfigured = !!(smtpHost && smtpUser && smtpPass);

let mailTransporter = null;
if (isSmtpConfigured) {
  mailTransporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });
  console.log("📧 SMTP configured. Email OTPs will be sent via SMTP.");
} else {
  console.log("⚠️ SMTP not fully configured. Email OTPs will fallback to Server Console.");
}

// OTP Store (in-memory) & generation helpers
const otpStore = new Map(); // key: email or userId, value: { otp, expiresAt, phone }

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOTPEmail(email, name, otpCode, purpose) {
  const subject = purpose === "recovery" 
    ? "Reset Password Anda - Luxentra Finance" 
    : "Verifikasi Nomor Telepon - Luxentra Finance";
    
  const actionText = purpose === "recovery"
    ? "Anda baru saja meminta pengaturan ulang password akun Luxentra Finance Anda. Gunakan kode verifikasi di bawah ini untuk melanjutkan:"
    : "Anda baru saja meminta verifikasi nomor telepon baru untuk akun Luxentra Finance Anda. Gunakan kode verifikasi di bawah ini untuk melanjutkan:";

  const htmlContent = `
    <div style="font-family: 'Outfit', 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 24px; background: #ffffff; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border: 1px solid #eef0f4;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #0062ff; font-weight: 800; font-size: 28px; margin: 0; letter-spacing: -0.5px;">Luxentra Finance</h2>
        <p style="color: #64748b; font-size: 14px; margin: 5px 0 0 0;">Pengatur Keuangan Premium Anda</p>
      </div>
      
      <div style="background: #f8fafc; border-radius: 16px; padding: 24px; margin-bottom: 25px;">
        <p style="color: #1e293b; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">Halo, <strong>${name}</strong></p>
        <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">${actionText}</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <div style="display: inline-block; background: #0062ff; color: #ffffff; font-size: 32px; font-weight: 800; letter-spacing: 6px; padding: 16px 36px; border-radius: 12px; box-shadow: 0 10px 20px rgba(0,98,255,0.18);">
            ${otpCode}
          </div>
        </div>
        
        <p style="color: #dc2626; font-size: 13px; font-weight: 600; text-align: center; margin: 0;">
          *Kode ini berlaku selama 10 menit. Jangan bagikan kode ini kepada siapapun!
        </p>
      </div>
      
      <hr style="border: 0; border-top: 1px solid #eef0f4; margin: 30px 0;" />
      
      <p style="color: #94a3b8; font-size: 12px; text-align: center; line-height: 1.6; margin: 0;">
        Email ini dikirim secara otomatis. Jika Anda tidak merasa melakukan tindakan ini, abaikan saja email ini.<br />
        &copy; 2026 Luxentra Finance. All rights reserved.
      </p>
    </div>
  `;

  if (isSmtpConfigured && mailTransporter) {
    try {
      await mailTransporter.sendMail({
        from: `"${purpose === 'recovery' ? 'Luxentra Account Recovery' : 'Luxentra Phone Verification'}" <${smtpUser}>`,
        to: email,
        subject: subject,
        html: htmlContent
      });
      console.log(`[EMAIL OTP] Successfully sent real email OTP to \x1b[36m${email}\x1b[0m.`);
      return true;
    } catch (err) {
      console.error(`[EMAIL OTP] Failed to send real email to ${email}:`, err);
    }
  }

  // Fallback logging
  console.log(`\n=======================================================`);
  console.log(`📥 [MOCK EMAIL OTP FALLBACK/MOCK]`);
  console.log(`Sent to: \x1b[36m${email}\x1b[0m (${name})`);
  console.log(`Code: \x1b[32;1m${otpCode}\x1b[0m`);
  console.log(`Purpose: ${purpose}`);
  console.log(`=======================================================\n`);
  return false;
}

// ==========================================
// ROUTE: AUTHENTICATION
// ==========================================

// POST: /api/auth/register
app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body;

  // Server side validation
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Semua field (Nama, Email, Password) wajib diisi." });
  }

  if (!validatePasswordStrength(password)) {
    return res.status(400).json({ error: "Password minimal 8 karakter, mengandung huruf, angka, dan minimal 1 huruf besar." });
  }

  const role = email.toLowerCase() === "admin@luxentra.app" ? "admin" : "user";

  if (isMockMode) {
    const existing = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: "Email sudah terdaftar. Silakan login." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = {
      id: "mock-uid-" + Math.random().toString(36).substr(2, 9),
      name,
      email: email.toLowerCase(),
      password_hash: passwordHash,
      role,
      status: "active",
      created_at: new Date().toISOString()
    };
    mockUsers.push(newUser);

    const token = jwt.sign(
      { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role },
      jwtSecret,
      { expiresIn: "7d" }
    );

    return res.json({ token, user: { name: newUser.name, email: newUser.email, role: newUser.role } });
  } else {
    try {
      // Periksa email unik di Supabase
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("email", email.toLowerCase())
        .maybeSingle();

      if (existingUser) {
        return res.status(400).json({ error: "Email sudah terdaftar. Silakan login." });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const { data: newUser, error } = await supabase
        .from("users")
        .insert({
          name,
          email: email.toLowerCase(),
          password_hash: passwordHash,
          role,
          status: "active"
        })
        .select()
        .single();

      if (error) throw error;

      const token = jwt.sign(
        { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role },
        jwtSecret,
        { expiresIn: "7d" }
      );

      return res.json({ token, user: { name: newUser.name, email: newUser.email, role: newUser.role } });
    } catch (err) {
      console.error("Registrasi Error:", err);
      return res.status(500).json({ error: "Gagal memproses registrasi. Silakan coba beberapa saat lagi." });
    }
  }
});

// POST: /api/auth/login
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email dan password wajib diisi." });
  }

  if (isMockMode) {
    const user = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(400).json({ error: "Email atau Password salah." });
    }

    if (user.status === "blocked") {
      return res.status(403).json({ error: "Akun Anda telah dinonaktifkan oleh Admin." });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: "Email atau Password salah." });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      jwtSecret,
      { expiresIn: "7d" }
    );

    return res.json({ token, user: { name: user.name, email: user.email, role: user.role } });
  } else {
    try {
      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email.toLowerCase())
        .maybeSingle();

      if (error) throw error;
      if (!user) {
        return res.status(400).json({ error: "Email atau Password salah." });
      }

      if (user.status === "blocked") {
        return res.status(403).json({ error: "Akun Anda telah dinonaktifkan oleh Admin." });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(400).json({ error: "Email atau Password salah." });
      }

      const token = jwt.sign(
        { id: user.id, name: user.name, email: user.email, role: user.role },
        jwtSecret,
        { expiresIn: "7d" }
      );

      return res.json({ token, user: { name: user.name, email: user.email, role: user.role } });
    } catch (err) {
      console.error("Login Error:", err);
      return res.status(500).json({ error: "Gagal memproses login." });
    }
  }
});

// POST: /api/auth/google-mock
app.post("/api/auth/google-mock", async (req, res) => {
  const email = "google.user@luxentra.app";
  const name = "Pengguna Google";
  const role = "user";
  
  let user;
  if (isMockMode) {
    user = mockUsers.find(u => u.email === email);
    if (!user) {
      user = {
        id: "mock-google-uid",
        name,
        email,
        password_hash: "",
        role,
        status: "active",
        created_at: new Date().toISOString()
      };
      mockUsers.push(user);
    }
  } else {
    try {
      const { data: existing } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .maybeSingle();
        
      if (existing) {
        user = existing;
      } else {
        const { data: newUser, error } = await supabase
          .from("users")
          .insert({
            name,
            email,
            password_hash: "google-mock-pass",
            role,
            status: "active"
          })
          .select()
          .single();
          
        if (error) throw error;
        user = newUser;
      }
    } catch (err) {
      console.error("Google Mock Auth Error:", err);
      return res.status(500).json({ error: "Gagal memproses login Google." });
    }
  }

  if (user.status === "blocked") {
    return res.status(403).json({ error: "Akun Anda telah dinonaktifkan oleh Admin." });
  }

  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    jwtSecret,
    { expiresIn: "7d" }
  );

  return res.json({ token, user: { name: user.name, email: user.email, role: user.role } });
});

// GET: /api/config — Ambil konfigurasi public Supabase URL
app.get("/api/config", (req, res) => {
  return res.json({ supabaseUrl });
});

// POST: /api/auth/google-success — Verifikasi token OAuth Google Supabase
app.post("/api/auth/google-success", async (req, res) => {
  const { supabaseToken } = req.body;
  if (!supabaseToken) {
    return res.status(400).json({ error: "Token Supabase tidak ditemukan." });
  }

  if (isMockMode) {
    return res.status(400).json({ error: "Mode Mock aktif. Autentikasi Supabase tidak dapat dilakukan." });
  }

  try {
    // Verifikasi token via Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(supabaseToken);
    if (error || !user) {
      return res.status(401).json({ error: "Autentikasi Google Supabase tidak valid atau kedaluwarsa." });
    }

    const email = user.email.toLowerCase();
    const name = user.user_metadata?.full_name || email.split("@")[0];
    const avatarUrl = user.user_metadata?.avatar_url || null;
    const role = email === "admin@luxentra.app" ? "admin" : "user";

    // Periksa apakah user sudah terdaftar di tabel kustom kita
    let { data: dbUser } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (!dbUser) {
      // Daftar otomatis jika belum ada
      const { data: newUser, error: insertError } = await supabase
        .from("users")
        .insert({
          name,
          email,
          password_hash: "google-oauth-managed-session",
          role,
          status: "active",
          avatar_url: avatarUrl
        })
        .select()
        .single();

      if (insertError) throw insertError;
      dbUser = newUser;
    } else if (avatarUrl && dbUser.avatar_url !== avatarUrl) {
      // Sinkronkan foto profil dari Google jika berubah
      await supabase
        .from("users")
        .update({ avatar_url: avatarUrl })
        .eq("id", dbUser.id);
      dbUser.avatar_url = avatarUrl;
    }

    if (dbUser.status === "blocked") {
      return res.status(403).json({ error: "Akun Anda telah dinonaktifkan oleh Admin." });
    }

    // Buat token JWT Luxentra
    const token = jwt.sign(
      { id: dbUser.id, name: dbUser.name, email: dbUser.email, role: dbUser.role },
      jwtSecret,
      { expiresIn: "7d" }
    );

    return res.json({ token, user: { name: dbUser.name, email: dbUser.email, role: dbUser.role } });
  } catch (err) {
    console.error("Google Success Auth Error:", err);
    return res.status(500).json({ error: "Gagal memproses otentikasi Google." });
  }
});

// GET: /api/auth/profile
app.get("/api/auth/profile", authenticateToken, async (req, res) => {
  if (isMockMode) {
    const user = mockUsers.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: "User tidak ditemukan" });
    return res.json({ id: user.id, name: user.name, email: user.email, role: user.role, status: user.status });
  } else {
    try {
      const { data: user, error } = await supabase
        .from("users")
        .select("id, name, email, role, status")
        .eq("id", req.user.id)
        .maybeSingle();

      if (error) throw error;
      if (!user) return res.status(404).json({ error: "User tidak ditemukan" });

      return res.json(user);
    } catch (err) {
      return res.status(500).json({ error: "Gagal mengambil profil" });
    }
  }
});

// PUT: /api/auth/profile — Update nama & nomor telepon
app.put("/api/auth/profile", authenticateToken, async (req, res) => {
  const { name, phone } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Nama tidak boleh kosong." });
  }

  if (isMockMode) {
    const user = mockUsers.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: "User tidak ditemukan." });
    user.name = name.trim();
    if (phone !== undefined) user.phone = phone;
    return res.json({ id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone });
  } else {
    try {
      const updateData = { name: name.trim() };
      if (phone !== undefined) updateData.phone = phone;

      const { data, error } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", req.user.id)
        .select("id, name, email, role, phone")
        .single();

      if (error) throw error;
      return res.json(data);
    } catch (err) {
      console.error("Update Profile Error:", err);
      return res.status(500).json({ error: "Gagal memperbarui profil." });
    }
  }
});

// POST: /api/auth/upload-avatar — Upload foto profil (max 2MB, disimpan sebagai Base64)
app.post("/api/auth/upload-avatar", authenticateToken, async (req, res) => {
  const { avatarBase64, mimeType } = req.body;

  if (!avatarBase64) {
    return res.status(400).json({ error: "Data foto tidak ditemukan." });
  }

  // Validasi ukuran file: base64 ~= 4/3 * bytes asli
  const base64Data = avatarBase64.replace(/^data:image\/\w+;base64,/, "");
  const fileSizeBytes = Math.ceil((base64Data.length * 3) / 4);
  const maxSizeBytes = 2 * 1024 * 1024; // 2MB

  if (fileSizeBytes > maxSizeBytes) {
    return res.status(400).json({ error: "Ukuran foto tidak boleh melebihi 2MB." });
  }

  const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (mimeType && !allowedMimes.includes(mimeType)) {
    return res.status(400).json({ error: "Format foto tidak didukung. Gunakan JPG, PNG, atau WebP." });
  }

  if (isMockMode) {
    const user = mockUsers.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: "User tidak ditemukan." });
    user.avatar_url = avatarBase64;
    return res.json({ avatar_url: avatarBase64 });
  } else {
    try {
      const { data, error } = await supabase
        .from("users")
        .update({ avatar_url: avatarBase64 })
        .eq("id", req.user.id)
        .select("avatar_url")
        .single();

      if (error) throw error;
      return res.json({ avatar_url: data.avatar_url });
    } catch (err) {
      console.error("Upload Avatar Error:", err);
      return res.status(500).json({ error: "Gagal menyimpan foto profil." });
    }
  }
});

// GET: /api/auth/avatar — Ambil foto profil saat ini
app.get("/api/auth/avatar", authenticateToken, async (req, res) => {
  if (isMockMode) {
    const user = mockUsers.find(u => u.id === req.user.id);
    return res.json({ avatar_url: user?.avatar_url || null });
  } else {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("avatar_url")
        .eq("id", req.user.id)
        .maybeSingle();

      if (error) throw error;
      return res.json({ avatar_url: data?.avatar_url || null });
    } catch (err) {
      return res.status(500).json({ error: "Gagal mengambil foto profil." });
    }
  }
});

// POST: /api/auth/forgot-password
app.post("/api/auth/forgot-password", async (req, res) => {
  const { email } = req.body;

  if (!email || !email.trim()) {
    return res.status(400).json({ error: "Email wajib diisi." });
  }

  const emailLower = email.trim().toLowerCase();
  let user = null;

  if (isMockMode) {
    user = mockUsers.find(u => u.email.toLowerCase() === emailLower);
  } else {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("name, email")
        .eq("email", emailLower)
        .maybeSingle();
      if (error) throw error;
      user = data;
    } catch (err) {
      console.error("Forgot Password Error:", err);
      return res.status(500).json({ error: "Terjadi kesalahan pada server." });
    }
  }

  if (!user) {
    return res.status(400).json({ error: "Email tidak terdaftar." });
  }

  const otp = generateOTP();
  otpStore.set(emailLower, {
    otp,
    expiresAt: Date.now() + 10 * 60 * 1000 // 10 menit
  });

  const sent = await sendOTPEmail(emailLower, user.name || "Pengguna", otp, "recovery");

  return res.json({
    success: true,
    email: emailLower,
    message: sent ? "Kode OTP pemulihan telah dikirim ke email Anda." : "SMTP tidak aktif. Kode OTP telah dicetak ke server console.",
    isMock: !sent
  });
});

// POST: /api/auth/reset-password
app.post("/api/auth/reset-password", async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ error: "Email, kode OTP, dan password baru wajib diisi." });
  }

  const emailLower = email.trim().toLowerCase();
  const trimmedOtp = otp.trim();

  if (!validatePasswordStrength(newPassword)) {
    return res.status(400).json({ error: "Password baru minimal 8 karakter, mengandung huruf, angka, dan minimal 1 huruf besar." });
  }

  const record = otpStore.get(emailLower);
  if (!record) {
    return res.status(400).json({ error: "Kode OTP tidak valid atau permintaan pemulihan tidak ditemukan." });
  }

  if (record.otp !== trimmedOtp) {
    return res.status(400).json({ error: "Kode OTP salah." });
  }

  if (record.expiresAt < Date.now()) {
    otpStore.delete(emailLower);
    return res.status(400).json({ error: "Kode OTP telah kedaluwarsa. Silakan ajukan ulang." });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  if (isMockMode) {
    const user = mockUsers.find(u => u.email.toLowerCase() === emailLower);
    if (!user) {
      return res.status(404).json({ error: "User tidak ditemukan." });
    }
    user.password_hash = passwordHash;
  } else {
    try {
      const { error } = await supabase
        .from("users")
        .update({ password_hash: passwordHash })
        .eq("email", emailLower);
      if (error) throw error;
    } catch (err) {
      console.error("Reset Password Error:", err);
      return res.status(500).json({ error: "Gagal menyetel ulang password." });
    }
  }

  otpStore.delete(emailLower);
  return res.json({ success: true, message: "Password berhasil disetel ulang. Silakan login." });
});

// POST: /api/auth/send-phone-otp
app.post("/api/auth/send-phone-otp", authenticateToken, async (req, res) => {
  const { phone } = req.body;

  if (!phone || !phone.trim()) {
    return res.status(400).json({ error: "Nomor telepon wajib diisi." });
  }

  const phoneTrimmed = phone.trim();
  let user = null;

  if (isMockMode) {
    user = mockUsers.find(u => u.id === req.user.id);
  } else {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("name, email")
        .eq("id", req.user.id)
        .maybeSingle();
      if (error) throw error;
      user = data;
    } catch (err) {
      console.error("Send Phone OTP Error:", err);
      return res.status(500).json({ error: "Terjadi kesalahan pada server." });
    }
  }

  if (!user) {
    return res.status(404).json({ error: "User tidak ditemukan." });
  }

  const otp = generateOTP();
  otpStore.set(req.user.id, {
    otp,
    phone: phoneTrimmed,
    expiresAt: Date.now() + 10 * 60 * 1000 // 10 menit
  });

  const sent = await sendOTPEmail(user.email, user.name || "Pengguna", otp, "phone_verify");

  return res.json({
    success: true,
    message: sent ? "Kode OTP verifikasi telepon telah dikirim ke email Anda." : "SMTP tidak aktif. Kode OTP telah dicetak ke server console.",
    isMock: !sent
  });
});

// POST: /api/auth/verify-phone-otp
app.post("/api/auth/verify-phone-otp", authenticateToken, async (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({ error: "Nomor telepon dan kode OTP wajib diisi." });
  }

  const phoneTrimmed = phone.trim();
  const trimmedOtp = otp.trim();

  const record = otpStore.get(req.user.id);
  if (!record) {
    return res.status(400).json({ error: "Kode OTP tidak valid atau permintaan verifikasi tidak ditemukan." });
  }

  if (record.phone !== phoneTrimmed) {
    return res.status(400).json({ error: "Nomor telepon tidak sesuai dengan permintaan OTP." });
  }

  if (record.otp !== trimmedOtp) {
    return res.status(400).json({ error: "Kode OTP salah." });
  }

  if (record.expiresAt < Date.now()) {
    otpStore.delete(req.user.id);
    return res.status(400).json({ error: "Kode OTP telah kedaluwarsa. Silakan ajukan ulang." });
  }

  if (isMockMode) {
    const user = mockUsers.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: "User tidak ditemukan." });
    user.phone = phoneTrimmed;
  } else {
    try {
      const { error } = await supabase
        .from("users")
        .update({ phone: phoneTrimmed })
        .eq("id", req.user.id);
      if (error) throw error;
    } catch (err) {
      console.error("Verify Phone OTP Error:", err);
      return res.status(500).json({ error: "Gagal memverifikasi nomor telepon." });
    }
  }

  otpStore.delete(req.user.id);
  return res.json({ success: true, phone: phoneTrimmed, message: "Nomor telepon berhasil diverifikasi!" });
});

// ==========================================
// ROUTE: CATEGORIES
// ==========================================

// GET: /api/categories
app.get("/api/categories", authenticateToken, async (req, res) => {
  if (isMockMode) {
    const list = mockCategories.filter(c => c.user_id === null || c.user_id === req.user.id);
    return res.json(list);
  } else {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .or(`user_id.is.null,user_id.eq.${req.user.id}`);

      if (error) throw error;
      return res.json(data);
    } catch (err) {
      console.error("Get Categories Error:", err);
      return res.status(500).json({ error: "Gagal memuat kategori." });
    }
  }
});

// POST: /api/categories
app.post("/api/categories", authenticateToken, async (req, res) => {
  const { label, type, color, iconLabel } = req.body;

  if (!label || !type || !color || !iconLabel) {
    return res.status(400).json({ error: "Format pembuatan kategori tidak lengkap." });
  }

  if (isMockMode) {
    const newCat = {
      id: "mock-cat-" + Math.random().toString(36).substr(2, 9),
      label,
      type,
      color,
      iconLabel,
      user_id: req.user.id
    };
    mockCategories.push(newCat);
    return res.json(newCat);
  } else {
    try {
      const { data, error } = await supabase
        .from("categories")
        .insert({
          label,
          type,
          color,
          icon_label: iconLabel,
          user_id: req.user.id
        })
        .select()
        .single();

      if (error) throw error;
      return res.json(data);
    } catch (err) {
      console.error("Create Category Error:", err);
      return res.status(500).json({ error: "Gagal menambahkan kategori." });
    }
  }
});

// DELETE: /api/categories/:id
app.delete("/api/categories/:id", authenticateToken, async (req, res) => {
  const catId = req.params.id;

  if (isMockMode) {
    const idx = mockCategories.findIndex(c => c.id === catId && c.user_id === req.user.id);
    if (idx === -1) {
      return res.status(403).json({ error: "Tidak memiliki hak menghapus kategori ini." });
    }
    mockCategories.splice(idx, 1);
    return res.json({ success: true });
  } else {
    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", catId)
        .eq("user_id", req.user.id); // Ensure only own category can be deleted

      if (error) throw error;
      return res.json({ success: true });
    } catch (err) {
      console.error("Delete Category Error:", err);
      return res.status(500).json({ error: "Gagal menghapus kategori." });
    }
  }
});

// ==========================================
// ROUTE: TRANSACTIONS
// ==========================================

// GET: /api/transactions
app.get("/api/transactions", authenticateToken, async (req, res) => {
  if (isMockMode) {
    const userTxs = mockTransactions.filter(t => t.user_id === req.user.id);
    
    // Map with category details
    const mapped = userTxs.map(t => {
      const cat = mockCategories.find(c => c.id === t.category_id);
      const categoryLabel = cat ? cat.label : "Lainnya";
      const formattedDate = formatLongDate(t.date);
      
      return {
        id: t.id,
        title: buildTransactionTitle({ type: t.type, category: categoryLabel, note: t.note, dateLabel: formattedDate }),
        subtitle: `${categoryLabel} - ${formattedDate}`,
        amount: t.amount,
        type: t.type,
        category: categoryLabel,
        categoryColor: cat ? cat.color : "#64748b",
        categoryIcon: cat ? cat.iconLabel : "LN",
        note: t.note,
        date: t.date,
        timestamp: t.created_at
      };
    });

    // Sort descending by date/timestamp
    const sorted = mapped.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return res.json(sorted);
  } else {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          id,
          amount,
          type,
          note,
          date,
          created_at,
          categories (
            id,
            label,
            color,
            icon_label
          )
        `)
        .eq("user_id", req.user.id)
        .order("date", { ascending: false });

      if (error) throw error;

      const mapped = data.map(t => {
        const catObj = t.categories;
        const categoryLabel = catObj ? catObj.label : "Lainnya";
        const formattedDate = formatLongDate(t.date);

        return {
          id: t.id,
          title: buildTransactionTitle({ type: t.type, category: categoryLabel, note: t.note, dateLabel: formattedDate }),
          subtitle: `${categoryLabel} - ${formattedDate}`,
          amount: Number(t.amount),
          type: t.type,
          category: categoryLabel,
          categoryColor: catObj ? catObj.color : "#64748b",
          categoryIcon: catObj ? catObj.icon_label : "LN",
          note: t.note,
          date: t.date,
          timestamp: t.created_at
        };
      });

      return res.json(mapped);
    } catch (err) {
      console.error("Get Transactions Error:", err);
      return res.status(500).json({ error: "Gagal mengambil data transaksi." });
    }
  }
});

// POST: /api/transactions
app.post("/api/transactions", authenticateToken, async (req, res) => {
  const { amount, type, category, note, date } = req.body;

  if (!amount || !type || !category || !date) {
    return res.status(400).json({ error: "Data transaksi tidak lengkap." });
  }

  const numericAmount = type === "Pengeluaran" ? -Math.abs(amount) : Math.abs(amount);

  if (isMockMode) {
    // Cari category_id berdasarkan label
    let cat = mockCategories.find(c => c.label === category && (c.user_id === null || c.user_id === req.user.id));
    if (!cat) {
      cat = mockCategories.find(c => c.label === "Lainnya");
    }

    const newTx = {
      id: "mock-tx-" + Math.random().toString(36).substr(2, 9),
      user_id: req.user.id,
      amount: numericAmount,
      type,
      category_id: cat ? cat.id : "c12",
      note,
      date,
      created_at: new Date().toISOString()
    };
    mockTransactions.push(newTx);
    return res.json(newTx);
  } else {
    try {
      // Dapatkan category ID dari database
      let { data: cat } = await supabase
        .from("categories")
        .select("id")
        .eq("label", category)
        .or(`user_id.is.null,user_id.eq.${req.user.id}`)
        .limit(1)
        .maybeSingle();

      // Jika kategori tidak ditemukan, default ke kategori Lainnya
      let categoryId = cat ? cat.id : null;
      if (!categoryId) {
        const { data: defaultCat } = await supabase
          .from("categories")
          .select("id")
          .eq("label", "Lainnya")
          .limit(1)
          .maybeSingle();
        categoryId = defaultCat ? defaultCat.id : null;
      }

      const { data, error } = await supabase
        .from("transactions")
        .insert({
          user_id: req.user.id,
          amount: numericAmount,
          type,
          category_id: categoryId,
          note,
          date
        })
        .select()
        .single();

      if (error) throw error;
      return res.json(data);
    } catch (err) {
      console.error("Create Transaction Error:", err);
      return res.status(500).json({ error: "Gagal membuat transaksi baru." });
    }
  }
});

// DELETE: /api/transactions/:id
app.delete("/api/transactions/:id", authenticateToken, async (req, res) => {
  const txId = req.params.id;

  if (isMockMode) {
    const idx = mockTransactions.findIndex(t => t.id === txId && t.user_id === req.user.id);
    if (idx === -1) {
      return res.status(403).json({ error: "Tidak memiliki hak menghapus transaksi ini." });
    }
    mockTransactions.splice(idx, 1);
    return res.json({ success: true });
  } else {
    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", txId)
        .eq("user_id", req.user.id);

      if (error) throw error;
      return res.json({ success: true });
    } catch (err) {
      console.error("Delete Transaction Error:", err);
      return res.status(500).json({ error: "Gagal menghapus transaksi." });
    }
  }
});

// PUT: /api/transactions/:id (UPDATE)
app.put("/api/transactions/:id", authenticateToken, async (req, res) => {
  const txId = req.params.id;
  const { amount, type, category, note, date } = req.body;

  if (!amount || !type || !category || !date) {
    return res.status(400).json({ error: "Data transaksi tidak lengkap." });
  }

  const numericAmount = type === "Pengeluaran" ? -Math.abs(amount) : Math.abs(amount);

  if (isMockMode) {
    const tx = mockTransactions.find(t => t.id === txId && t.user_id === req.user.id);
    if (!tx) {
      return res.status(403).json({ error: "Tidak memiliki hak mengubah transaksi ini." });
    }
    let cat = mockCategories.find(c => c.label === category && (c.user_id === null || c.user_id === req.user.id));
    if (!cat) cat = mockCategories.find(c => c.label === "Lainnya");

    tx.amount = numericAmount;
    tx.type = type;
    tx.category_id = cat ? cat.id : "c12";
    tx.note = note;
    tx.date = date;
    return res.json(tx);
  } else {
    try {
      let { data: cat } = await supabase
        .from("categories")
        .select("id")
        .eq("label", category)
        .or(`user_id.is.null,user_id.eq.${req.user.id}`)
        .limit(1)
        .maybeSingle();

      let categoryId = cat ? cat.id : null;
      if (!categoryId) {
        const { data: defaultCat } = await supabase
          .from("categories")
          .select("id")
          .eq("label", "Lainnya")
          .limit(1)
          .maybeSingle();
        categoryId = defaultCat ? defaultCat.id : null;
      }

      const { data, error } = await supabase
        .from("transactions")
        .update({ amount: numericAmount, type, category_id: categoryId, note, date })
        .eq("id", txId)
        .eq("user_id", req.user.id)
        .select()
        .single();

      if (error) throw error;
      return res.json(data);
    } catch (err) {
      console.error("Update Transaction Error:", err);
      return res.status(500).json({ error: "Gagal memperbarui transaksi." });
    }
  }
});

// ==========================================
// ROUTE: ADMIN DASHBOARD
// ==========================================

// GET: /api/admin/users
app.get("/api/admin/users", authenticateToken, requireAdmin, async (req, res) => {
  if (isMockMode) {
    // Exclude password hashes
    const list = mockUsers.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      createdAt: u.created_at
    }));
    return res.json(list);
  } else {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email, role, status, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Rename created_at to match frontend expectations if necessary (createdAt)
      const mapped = data.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        createdAt: u.created_at
      }));

      return res.json(mapped);
    } catch (err) {
      console.error("Admin Users Error:", err);
      return res.status(500).json({ error: "Gagal memuat daftar pengguna." });
    }
  }
});

// PUT: /api/admin/users/:id/status
app.put("/api/admin/users/:id/status", authenticateToken, requireAdmin, async (req, res) => {
  const userId = req.params.id;
  const { status } = req.body;

  if (status !== "active" && status !== "blocked") {
    return res.status(400).json({ error: "Status harus berupa 'active' atau 'blocked'." });
  }

  if (isMockMode) {
    const user = mockUsers.find(u => u.id === userId);
    if (!user) return res.status(404).json({ error: "User tidak ditemukan." });
    if (user.role === "admin") return res.status(400).json({ error: "Tidak dapat mengubah status admin." });
    
    user.status = status;
    return res.json({ success: true, user: { id: user.id, status: user.status } });
  } else {
    try {
      // Check if target is admin
      const { data: targetUser } = await supabase
        .from("users")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      if (targetUser && targetUser.role === "admin") {
        return res.status(400).json({ error: "Tidak dapat mengubah status akun administrator." });
      }

      const { data, error } = await supabase
        .from("users")
        .update({ status })
        .eq("id", userId)
        .select()
        .single();

      if (error) throw error;
      return res.json({ success: true, user: data });
    } catch (err) {
      console.error("Update User Status Error:", err);
      return res.status(500).json({ error: "Gagal memperbarui status pengguna." });
    }
  }
});

// DELETE: /api/admin/users/:id
app.delete("/api/admin/users/:id", authenticateToken, requireAdmin, async (req, res) => {
  const userId = req.params.id;

  if (isMockMode) {
    const idx = mockUsers.findIndex(u => u.id === userId);
    if (idx === -1) return res.status(404).json({ error: "User tidak ditemukan." });
    if (mockUsers[idx].role === "admin") {
      return res.status(400).json({ error: "Tidak dapat menghapus akun administrator." });
    }
    mockUsers.splice(idx, 1);
    return res.json({ success: true });
  } else {
    try {
      const { data: targetUser } = await supabase
        .from("users")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      if (targetUser && targetUser.role === "admin") {
        return res.status(400).json({ error: "Tidak dapat menghapus akun administrator." });
      }

      const { error } = await supabase
        .from("users")
        .delete()
        .eq("id", userId);

      if (error) throw error;
      return res.json({ success: true });
    } catch (err) {
      console.error("Delete User Error:", err);
      return res.status(500).json({ error: "Gagal menghapus pengguna." });
    }
  }
});

// ==========================================
// ROUTE: BROADCAST
// ==========================================

// GET: /api/broadcasts
app.get("/api/broadcasts", async (req, res) => {
  if (isMockMode) {
    return res.json(mockBroadcasts);
  } else {
    try {
      const { data, error } = await supabase
        .from("broadcasts")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(5);

      if (error) throw error;
      return res.json(data);
    } catch (err) {
      console.error("Get Broadcasts Error:", err);
      return res.status(500).json({ error: "Gagal mengambil data pengumuman." });
    }
  }
});

// POST: /api/admin/broadcast
app.post("/api/admin/broadcast", authenticateToken, requireAdmin, async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Isi pengumuman tidak boleh kosong." });
  }

  if (isMockMode) {
    const newBroadcast = {
      id: "mock-bc-" + Math.random().toString(36).substr(2, 9),
      message,
      timestamp: new Date().toISOString()
    };
    mockBroadcasts.push(newBroadcast);
    return res.json(newBroadcast);
  } else {
    try {
      const { data, error } = await supabase
        .from("broadcasts")
        .insert({ message })
        .select()
        .single();

      if (error) throw error;
      return res.json(data);
    } catch (err) {
      console.error("Create Broadcast Error:", err);
      return res.status(500).json({ error: "Gagal mengirim pengumuman." });
    }
  }
});

// Fallback: layani index.html untuk URL rute yang tidak dikenal (agar page routing aman)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Jalankan Server
app.listen(port, () => {
  console.log(`\n=======================================================`);
  console.log(`🚀 Luxentra Finance berjalan di http://localhost:${port}`);
  console.log(`=======================================================\n`);
});
