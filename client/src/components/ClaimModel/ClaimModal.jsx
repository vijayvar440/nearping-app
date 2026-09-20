import React, { useState } from "react";
import axios from "axios";

const API_URL = "https://nearping-app.onrender.com";

const ClaimModal = ({ ping, onClose }) => {
  const [answer, setAnswer] = useState("");
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // ===============================
  // GET TOKEN
  // ===============================
  const getToken = () => {
    return (
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      localStorage.getItem("authToken")
    );
  };

  // ===============================
  // GET CURRENT USER ID
  // ===============================
  const getUserId = () => {
    const storedUser =
      localStorage.getItem("userId") ||
      localStorage.getItem("user") ||
      localStorage.getItem("userInfo") ||
      localStorage.getItem("authUser");

    if (!storedUser) return null;

    try {
      const parsed = JSON.parse(storedUser);

      if (typeof parsed === "object") {
        return parsed?._id || parsed?.id || null;
      }

      return parsed;
    } catch {
      return storedUser;
    }
  };

  // ===============================
  // SUBMIT CLAIM
  // ===============================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!answer.trim()) {
      alert("Verification answer likho.");
      return;
    }

    if (!contact.trim()) {
      alert("Apna WhatsApp/contact number likho.");
      return;
    }

    if (!ping?._id) {
      alert("Ping information nahi mili.");
      return;
    }

    const token = getToken();
    const userId = getUserId();

    // Login check
    if (!token) {
      alert(
        "Login session nahi mila. Please logout karke dobara login karo."
      );
      return;
    }

    if (!userId) {
      alert(
        "User ID nahi mili. Please logout karke dobara login karo."
      );
      return;
    }

    setLoading(true);

    try {
      console.log("========== CLAIM SUBMIT ==========");
      console.log("Ping ID:", ping._id);
      console.log("User ID:", userId);
      console.log("Token available:", !!token);

      const response = await axios.post(
        `${API_URL}/api/claims/submit`,
        {
          pingId: ping._id,

          finderAnswer: answer.trim(),

          finderContact: contact.trim(),

          // Backend fallback
          userId: userId,
          user: userId,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("Claim response:", response.data);

      if (response.data?.success) {
        setSubmitted(true);
      } else {
        alert(
          response.data?.error ||
            response.data?.message ||
            "Claim submit nahi ho paya."
        );
      }
    } catch (error) {
      console.error(
        "Claim submit error:",
        error.response?.data || error.message
      );

      // ===============================
      // 401
      // ===============================
      if (error.response?.status === 401) {
        alert(
          "Login session expire ho gaya hai. Please logout karke dobara login karo."
        );
        return;
      }

      // ===============================
      // 400
      // ===============================
      if (error.response?.status === 400) {
        alert(
          error.response?.data?.error ||
            error.response?.data?.message ||
            "Claim request invalid hai."
        );
        return;
      }

      // ===============================
      // OTHER ERROR
      // ===============================
      alert(
        error.response?.data?.error ||
          error.response?.data?.message ||
          "Server error. Try again!"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative">

        {/* CLOSE */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          ✕
        </button>

        {/* ===============================
            SUCCESS
        =============================== */}
        {submitted ? (
          <div className="text-center py-6">

            <div className="text-4xl mb-3">
              🚀
            </div>

            <h3 className="text-xl font-bold text-green-400 mb-2">
              Claim Sent!
            </h3>

            <p className="text-sm text-slate-300 mb-6">
              Aapka answer original owner ko bhej diya gaya hai.
              Owner ke accept karte hi contact aur chat unlock ho jayega.
            </p>

            <button
              onClick={onClose}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-xl font-semibold transition"
            >
              Close
            </button>

          </div>
        ) : (
          /* ===============================
             CLAIM FORM
          =============================== */
          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >

            {/* ITEM */}
            <div>

              <span className="text-xs font-semibold px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full">
                Verification Required
              </span>

              <h3 className="text-lg font-bold mt-2">
                {ping?.title || "Lost Item"}
              </h3>

              <p className="text-xs text-slate-400">
                {ping?.landmark
                  ? `📍 Near ${ping.landmark}`
                  : ""}
              </p>

            </div>

            {/* VERIFICATION QUESTION */}
            <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/50">

              <label className="text-xs text-amber-400 font-medium block mb-1">
                ❓ Owner's Verification Question:
              </label>

              <p className="text-sm font-semibold text-slate-200">
                {ping?.secretQuestion ||
                  "Is item se judi koi khas pehchaan bataiye?"}
              </p>

            </div>

            {/* ANSWER */}
            <div>

              <label className="text-xs text-slate-300 font-medium block mb-1">
                Your Answer / Details:
              </label>

              <input
                type="text"
                required
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Ex: Red leather band, HDFC card inside..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500"
              />

            </div>

            {/* CONTACT */}
            <div>

              <label className="text-xs text-slate-300 font-medium block mb-1">
                Your WhatsApp Number / Contact:
              </label>

              <input
                type="text"
                required
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500"
              />

            </div>

            {/* SUBMIT */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition shadow-lg shadow-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? "Submitting..."
                : "Send Claim Request"}
            </button>

          </form>
        )}

      </div>
    </div>
  );
};

export default ClaimModal;