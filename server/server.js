const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");

// Load .env first
require("dotenv").config({
  path: path.resolve(__dirname, ".env"),
});

const connectDB = require("./config/db");

const app = express();
const server = http.createServer(app);

// ===============================
// Socket.io Setup
// ===============================
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  },
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log("⚡ Client Connected to Socket:", socket.id);

  // User ko uske private room me join karna
  socket.on("join-user", (userId) => {
    if (!userId) return;

    socket.join(`user:${userId}`);

    console.log(
      `👤 User ${userId} joined room: user:${userId}`
    );
  });

  socket.on("disconnect", () => {
    console.log("❌ Client Disconnected:", socket.id);
  });
});

// ===============================
// Middlewares
// ===============================
app.use(cors());
app.use(express.json());

// ===============================
// Health Check
// ===============================
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "NearPing backend is running 🚀",
    timestamp: new Date().toISOString(),
  });
});

// ===============================
// Routes
// ===============================
const pingRoutes = require("./routes/pingRoutes");
const authRoutes = require("./routes/authRoutes");
const clainRoutes = require("./routes/claimRoutes");
const messageRoutes = require("./routes/messageRoutes");

app.use("/api/pings", pingRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/Claims", clainRoutes);
app.use("/api/messages", messageRoutes);

// ===============================
// Server
// ===============================
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Server startup error:", error);
    process.exit(1);
  }
};

startServer();