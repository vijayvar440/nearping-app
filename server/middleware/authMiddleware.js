const jwt = require("jsonwebtoken");

const JWT_SECRET =
  process.env.JWT_SECRET || "nearping_secret_key_2026";

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is required.",
      });
    }

    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : authHeader.trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization token.",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded?.userId && !decoded?._id) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload.",
      });
    }

    req.user = decoded;

    next();
  } catch (error) {
    console.error(
      "❌ Auth Middleware Error:",
      error.message
    );

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};

module.exports = authMiddleware;