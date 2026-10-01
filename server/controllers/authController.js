const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET =
  process.env.JWT_SECRET || "nearping_secret_key_2026";

// ==========================================
// HELPERS
// ==========================================

const createToken = (userId) => {
  return jwt.sign(
    {
      userId: userId,
    },
    JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

const emailRegex =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const phoneRegex =
  /^[0-9]{10}$/;


// ==========================================
// 📝 REGISTER
// ==========================================

exports.registerUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
    } = req.body;

    // ------------------------------
    // Basic validation
    // ------------------------------

    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message:
          "Name, email, password and phone are required.",
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    // ------------------------------
    // Name validation
    // ------------------------------

    if (cleanName.length < 2) {
      return res.status(400).json({
        success: false,
        message:
          "Name must contain at least 2 characters.",
      });
    }

    if (cleanName.length > 50) {
      return res.status(400).json({
        success: false,
        message:
          "Name cannot exceed 50 characters.",
      });
    }

    // ------------------------------
    // Email validation
    // ------------------------------

    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message:
          "Please enter a valid email address.",
      });
    }

    // ------------------------------
    // Phone validation
    // ------------------------------

    if (!phoneRegex.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message:
          "Phone number must contain exactly 10 digits.",
      });
    }

    // ------------------------------
    // Password validation
    // ------------------------------

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 6 characters.",
      });
    }

    // ------------------------------
    // Check duplicate email
    // ------------------------------

    const existingEmail =
      await User.findOne({
        email: cleanEmail,
      });

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message:
          "Email is already registered.",
      });
    }

    // ------------------------------
    // Check duplicate phone
    // ------------------------------

    const existingPhone =
      await User.findOne({
        phone: cleanPhone,
      });

    if (existingPhone) {
      return res.status(409).json({
        success: false,
        message:
          "Phone number is already registered.",
      });
    }

    // ------------------------------
    // Hash password
    // ------------------------------

    const hashedPassword =
      await bcrypt.hash(password, 10);

    // ------------------------------
    // Create user
    // IMPORTANT:
    // No GPS/location during register
    // ------------------------------

    const user = new User({
      name: cleanName,
      email: cleanEmail,
      password: hashedPassword,
      phone: cleanPhone,

      isEmailVerified: false,
      isPhoneVerified: false,
      isActive: true,

      // Location remains default
      // until user grants GPS permission.
    });

    await user.save();

    // ------------------------------
    // Create JWT
    // ------------------------------

    const token =
      createToken(user._id);

    // ------------------------------
    // Response
    // ------------------------------

    return res.status(201).json({
      success: true,

      message:
        "Account created successfully.",

      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,

        isEmailVerified:
          user.isEmailVerified,

        isPhoneVerified:
          user.isPhoneVerified,

        isActive:
          user.isActive,

        lastKnownLocation:
          user.lastKnownLocation,
      },
    });

  } catch (err) {
    console.error(
      "❌ Register Error:",
      err
    );

    // Duplicate key protection
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "Email or phone number is already registered.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Server error occurred.",
    });
  }
};


// ==========================================
// 🔐 LOGIN
// ==========================================

exports.loginUser = async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body;

    // ------------------------------
    // Validation
    // ------------------------------

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Email and password are required.",
      });
    }

    const cleanEmail =
      email.trim().toLowerCase();

    // ------------------------------
    // Find user
    // ------------------------------

    const user =
      await User.findOne({
        email: cleanEmail,
      });

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password.",
      });
    }

    // ------------------------------
    // Account status
    // ------------------------------

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message:
          "Your account is currently disabled.",
      });
    }

    // ------------------------------
    // Password check
    // ------------------------------

    const isMatch =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password.",
      });
    }

    // ------------------------------
    // Create JWT
    // ------------------------------

    const token =
      createToken(user._id);

    // ------------------------------
    // IMPORTANT:
    // No GPS is read during login.
    //
    // GPS will be requested separately
    // AFTER successful authentication.
    // ------------------------------

    return res.json({
      success: true,

      message:
        "Login successful.",

      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,

        isEmailVerified:
          user.isEmailVerified,

        isPhoneVerified:
          user.isPhoneVerified,

        isActive:
          user.isActive,

        lastKnownLocation:
          user.lastKnownLocation,
      },
    });

  } catch (err) {
    console.error(
      "❌ Login Error:",
      err
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error occurred.",
    });
  }
};


// ==========================================
// 👤 GET PROFILE
// ==========================================

exports.getProfile = async (
  req,
  res
) => {
  try {
    const userId =
      req.user?.userId ||
      req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required.",
      });
    }

    const user =
      await User.findById(userId)
        .select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "User not found.",
      });
    }

    return res.json({
      success: true,
      user,
    });

  } catch (err) {
    console.error(
      "❌ Get Profile Error:",
      err
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch profile.",
    });
  }
};


// ==========================================
// ✏️ UPDATE PROFILE
// ==========================================

exports.updateProfile = async (
  req,
  res
) => {
  try {
    const userId =
      req.user?.userId ||
      req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required.",
      });
    }

    const {
      name,
      phone,
    } = req.body;

    const user =
      await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "User not found.",
      });
    }

    // ------------------------------
    // Update name
    // ------------------------------

    if (name !== undefined) {
      const cleanName =
        name.trim();

      if (cleanName.length < 2) {
        return res.status(400).json({
          success: false,
          message:
            "Name must contain at least 2 characters.",
        });
      }

      if (cleanName.length > 50) {
        return res.status(400).json({
          success: false,
          message:
            "Name cannot exceed 50 characters.",
        });
      }

      user.name =
        cleanName;
    }

    // ------------------------------
    // Update phone
    // ------------------------------

    if (phone !== undefined) {
      const cleanPhone =
        phone.trim();

      if (!phoneRegex.test(cleanPhone)) {
        return res.status(400).json({
          success: false,
          message:
            "Phone number must contain exactly 10 digits.",
        });
      }

      // Check if another user
      // already owns this phone
      const phoneExists =
        await User.findOne({
          phone: cleanPhone,
          _id: { $ne: userId },
        });

      if (phoneExists) {
        return res.status(409).json({
          success: false,
          message:
            "Phone number is already registered.",
        });
      }

      user.phone =
        cleanPhone;

      // Changing phone means
      // verification must happen again.
      user.isPhoneVerified =
        false;
    }

    user.updatedAt =
      new Date();

    await user.save();

    return res.json({
      success: true,

      message:
        "Profile updated successfully.",

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,

        isEmailVerified:
          user.isEmailVerified,

        isPhoneVerified:
          user.isPhoneVerified,

        isActive:
          user.isActive,

        lastKnownLocation:
          user.lastKnownLocation,
      },
    });

  } catch (err) {
    console.error(
      "❌ Update Profile Error:",
      err
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update profile.",
    });
  }
};


// ==========================================
// 🔑 CHANGE PASSWORD
// ==========================================

exports.changePassword = async (
  req,
  res
) => {
  try {
    const userId =
      req.user?.userId ||
      req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required.",
      });
    }

    const {
      currentPassword,
      newPassword,
    } = req.body;

    if (
      !currentPassword ||
      !newPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Current password and new password are required.",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message:
          "New password must be at least 6 characters.",
      });
    }

    const user =
      await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "User not found.",
      });
    }

    const isMatch =
      await bcrypt.compare(
        currentPassword,
        user.password
      );

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message:
          "Current password is incorrect.",
      });
    }

    user.password =
      await bcrypt.hash(
        newPassword,
        10
      );

    user.updatedAt =
      new Date();

    await user.save();

    return res.json({
      success: true,
      message:
        "Password changed successfully.",
    });

  } catch (err) {
    console.error(
      "❌ Change Password Error:",
      err
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to change password.",
    });
  }
};