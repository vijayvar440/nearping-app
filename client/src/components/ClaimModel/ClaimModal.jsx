import React, { useState } from "react";

const ClaimModal = ({ ping, onClose }) => {
  const [answer, setAnswer] = useState("");
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/claims/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pingId: ping._id,
          finderAnswer: answer,
          finderContact: contact,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        alert(data.error || "Claim submit nahi ho paya");
      }
    } catch (err) {
      console.error(err);
      alert("Server error. Try again!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          ✕
        </button>

        {submitted ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">🚀</div>
            <h3 className="text-xl font-bold text-green-400 mb-2">Claim Sent!</h3>
            <p className="text-sm text-slate-300 mb-6">
              Aapka answer original owner ko bhej diya gaya hai. Owner ke accept karte hi contact unlock ho jayega.
            </p>
            <button
              onClick={onClose}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-xl font-semibold transition"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full">
                Verification Required
              </span>
              <h3 className="text-lg font-bold mt-2">{ping.title}</h3>
              <p className="text-xs text-slate-400">{ping.landmark ? `📍 Near ${ping.landmark}` : ""}</p>
            </div>

            {/* Secret Question */}
            <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/50">
              <label className="text-xs text-amber-400 font-medium block mb-1">
                ❓ Owner's Verification Question:
              </label>
              <p className="text-sm font-semibold text-slate-200">
                {ping.secretQuestion || "Is item se judi koi khas pehchaan bataiye?"}
              </p>
            </div>

            {/* Finder Answer Input */}
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">
                Your Answer / Details:
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Red leather band, HDFC card inside..."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Finder Phone/WhatsApp Input */}
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">
                Your WhatsApp Number / Contact:
              </label>
              <input
                type="text"
                required
                placeholder="+91 9876543210"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition shadow-lg shadow-indigo-600/30 disabled:opacity-50"
            >
              {loading ? "Submitting..." : "Send Claim Request"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ClaimModal;