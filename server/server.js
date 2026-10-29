
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");

// ===============================
// Load Environment Variables
// ===============================
require("dotenv").config({
  path: path.resolve(__dirname, ".env"),
});

const connectDB = require("./config/db");

// ===============================
// Express + HTTP Server
// ===============================
const app = express();
const server = http.createServer(app);

// ===============================
// CORS Configuration
// ===============================
const allowedOrigins = [
  "http://localhost:5173",
  "https://nearping-app.vercel.app",
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests without an Origin header
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(
      new Error(`CORS blocked origin: ${origin}`)
    );
  },

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],

  credentials: true,
};

// ===============================
// Socket.IO Setup
// ===============================
const io = new Server(server, {
  cors: corsOptions,
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log(
    "⚡ Client Connected to Socket:",
    socket.id
  );

  // Join user's private room
  socket.on("join-user", (userId) => {
    if (!userId) return;

    const roomName = `user:${userId}`;

    socket.join(roomName);

    console.log(
      `👤 User ${userId} joined room: ${roomName}`
    );
  });

  socket.on("disconnect", (reason) => {
    console.log(
      "❌ Client Disconnected:",
      socket.id,
      reason
    );
  });
});

// ===============================
// Middlewares
// ===============================
app.use(cors(corsOptions));
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
const claimRoutes = require("./routes/claimRoutes");
const messageRoutes = require("./routes/messageRoutes");

app.use("/api/pings", pingRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/Claims", claimRoutes);
app.use("/api/messages", messageRoutes);

// ===============================
// Start Server
// ===============================
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    server.listen(PORT, () => {
      console.log(
        `🚀 NearPing server running on port ${PORT}`
      );
    });
  } catch (error) {
    console.error(
      "❌ Server startup error:",
      error
    );

    process.exit(1);
  }
};

startServer();
