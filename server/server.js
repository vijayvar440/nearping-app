const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");

// Load .env first
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const connectDB = require("./config/db");

const app = express();
const server = http.createServer(app);

// Socket.io Setup
const io = new Server(server, { 
  cors: { 
    origin: "*",
    methods: ["GET", "POST"]
  } 
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log("⚡ Client Connected to Socket:", socket.id);

  socket.on("disconnect", () => {
    console.log("❌ Client Disconnected:", socket.id);
  });
});

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
const pingRoutes = require("./routes/pingRoutes");
const authRoutes = require("./routes/authRoutes");
const clainRoutes =  require("./routes/claimRoutes");

app.use("/api/pings", pingRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/Claims",clainRoutes)


const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
};

startServer();