import React, { useState, useEffect } from "react";
import axios from "axios";

const ClaimsListModal = ({ ping, onClose, onClaimAccepted }) => {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClaims = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/claims/ping/${ping._id}`);
        setClaims(res.data);
      } catch (err) {
        console.error("Error fetching claims:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchClaims();
  }, [ping._id]);

  const handleAccept = async (claimId) => {
    try {
      const res = await axios.patch(`http://localhost:5000/api/claims/${claimId}/accept`);
      if (res.data.success) {
        alert("🎉 Claim Accepted! Finder contact details unlocked.");
        if (onClaimAccepted) onClaimAccepted(res.data);
        onClose();
      }
    } catch (err) {
      console.error(err);
      alert("Claim accept karne me error aaya.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 w-full max-w-lg shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          ✕
        </button>

        <h3 className="text-xl font-bold mb-1">📥 Received Claims</h3>
        <p className="text-xs text-slate-400 mb-4">Item: {ping.title}</p>

        {loading ? (
          <p className="text-slate-400 text-sm py-4">Loading claims...</p>
        ) : claims.length === 0 ? (
          <p className="text-slate-400 text-sm py-4">Abhi tak kisi ne is alert par claim submit nahi kiya hai.</p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {claims.map((claim) => (
              <div key={claim._id} className="bg-slate-800/90 border border-slate-700/80 p-4 rounded-xl">
                <p className="text-xs text-amber-400 font-semibold mb-1">Finder Answer:</p>
                <p className="text-sm text-slate-200 mb-3 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
                  "{claim.finderAnswer}"
                </p>

                {claim.status === "ACCEPTED" ? (
                  <div className="bg-green-500/10 border border-green-500/30 p-2.5 rounded-lg">
                    <p className="text-xs text-green-400 font-bold mb-1">✅ Verified Connection</p>
                    <p className="text-sm text-white font-mono">📱 Contact: {claim.finderContact}</p>
                    <a
                      href={`https://wa.me/${claim.finderContact.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg"
                    >
                      💬 WhatsApp Finder
                    </a>
                  </div>
                ) : (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                    <span className="text-xs text-slate-400">Status: Pending Verification</span>
                    <button
                      onClick={() => handleAccept(claim._id)}
                      className="bg-green-600 hover:bg-green-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-md shadow-green-600/20"
                    >
                      Accept & Unlock Contact
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClaimsListModal;