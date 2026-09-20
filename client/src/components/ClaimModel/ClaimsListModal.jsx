import React, { useEffect, useState } from "react";
import axios from "axios";
import ClaimChat from "./ClaimChat";

const API_URL = "https://nearping-app.onrender.com";

const ClaimsListModal = ({
  ping,
  onClose,
  onClaimAccepted,
}) => {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  // Chat ke liye selected claim
  const [chatClaim, setChatClaim] = useState(null);

  // Accept loading
  const [acceptingId, setAcceptingId] = useState(null);

  // =====================================================
  // FETCH CLAIMS
  // =====================================================

  useEffect(() => {
    const fetchClaims = async () => {
      try {
        setLoading(true);

        const res = await axios.get(
          `${API_URL}/api/claims/ping/${ping._id}`
        );

        console.log(
          "📥 CLAIMS RESPONSE:",
          res.data
        );

        setClaims(
          Array.isArray(res.data)
            ? res.data
            : []
        );
      } catch (err) {
        console.error(
          "❌ Error fetching claims:",
          err.response?.data ||
            err.message
        );
      } finally {
        setLoading(false);
      }
    };

    if (ping?._id) {
      fetchClaims();
    }
  }, [ping?._id]);

  // =====================================================
  // ACCEPT CLAIM
  // =====================================================

  const handleAccept = async (claimId) => {
    try {
      setAcceptingId(claimId);

      console.log(
        "🔄 Accepting Claim:",
        claimId
      );

      const res = await axios.patch(
        `${API_URL}/api/claims/${claimId}/accept`
      );

      console.log(
        "✅ ACCEPT CLAIM RESPONSE:",
        res.data
      );

      if (res.data.success) {
        alert(
          "🎉 Claim Accepted!\nFinder contact aur chat unlock ho gaya."
        );

        // Backend se updated claim
        const updatedClaim =
          res.data.claim;

        console.log(
          "🔓 UPDATED CLAIM:",
          updatedClaim
        );

        // =================================================
        // IMPORTANT
        // Local claim ko ACCEPTED karo
        // =================================================

        setClaims((prevClaims) =>
          prevClaims.map((claim) => {
            if (
              String(claim._id) ===
              String(claimId)
            ) {
              return {
                ...claim,

                // Backend ke updated data ko use karo
                ...(updatedClaim || {}),

                // Status forcefully ACCEPTED
                status: "ACCEPTED",

                // Finder contact preserve karo
                finderContact:
                  updatedClaim?.finderContact ||
                  claim.finderContact ||
                  "",
              };
            }

            return claim;
          })
        );

        // =================================================
        // IMPORTANT
        // Parent modal ko close MAT karo
        // =================================================

        if (onClaimAccepted) {
          onClaimAccepted(res.data);
        }
      }
    } catch (err) {
      console.error(
        "❌ Accept claim error:",
        err.response?.data ||
          err.message
      );

      alert(
        err.response?.data?.message ||
          "Claim accept karne me error aaya."
      );
    } finally {
      setAcceptingId(null);
    }
  };

  // =====================================================
  // WHATSAPP
  // =====================================================

  const openWhatsApp = (contact) => {
    if (!contact) {
      alert(
        "Finder ne contact number nahi diya hai."
      );
      return;
    }

    const number = contact.replace(
      /[^0-9]/g,
      ""
    );

    if (!number) {
      alert("Invalid contact number.");
      return;
    }

    window.open(
      `https://wa.me/${number}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  // =====================================================
  // SHARE CLAIM
  // =====================================================

  const shareClaim = async (claim) => {
    const finderName =
      claim.user?.name ||
      "NearPing Finder";

    const text = `
NearPing Claim Details

Item: ${ping.title}

Finder: ${finderName}

Finder Answer:
${
  claim.finderAnswer ||
  "No answer provided"
}

Finder Contact:
${
  claim.finderContact ||
  "Not provided"
}

Status:
${claim.status}
`.trim();

    try {
      if (navigator.share) {
        await navigator.share({
          title:
            "NearPing Claim Details",
          text,
        });
      } else {
        await navigator.clipboard.writeText(
          text
        );

        alert(
          "📤 Claim details copied to clipboard."
        );
      }
    } catch (error) {
      console.log(
        "Share cancelled/error:",
        error
      );
    }
  };

  // =====================================================
  // CHAT SCREEN
  // =====================================================

  if (chatClaim) {
    const finder =
      chatClaim.user;

    return (
      <ClaimChat
        claim={chatClaim}
        ping={ping}
        finder={finder}
        onClose={() =>
          setChatClaim(null)
        }
      />
    );
  }

  // =====================================================
  // MAIN MODAL
  // =====================================================

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-[9999]">

      <div className="bg-slate-950 border border-slate-800 text-white rounded-3xl w-full max-w-2xl shadow-2xl relative overflow-hidden">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="px-6 py-5 border-b border-slate-800 bg-slate-900/80">

          <button
            onClick={onClose}
            className="absolute top-4 right-5 text-slate-400 hover:text-white text-xl"
          >
            ✕
          </button>

          <div className="pr-8">

            <p className="text-xs text-indigo-400 font-bold uppercase tracking-wider">
              NearPing
            </p>

            <h3 className="text-xl font-bold mt-1">
              📥 Received Claims
            </h3>

            <p className="text-sm text-slate-400 mt-1">
              Item:{" "}
              <span className="text-slate-200 font-medium">
                {ping.title}
              </span>
            </p>

          </div>
        </div>

        {/* =================================================
            BODY
        ================================================= */}

        <div className="p-5">

          {/* =================================================
              LOADING
          ================================================= */}

          {loading ? (
            <div className="py-10 text-center">

              <div className="text-3xl mb-3 animate-pulse">
                🔄
              </div>

              <p className="text-sm text-slate-400">
                Claims load ho rahe hain...
              </p>

            </div>
          ) : claims.length === 0 ? (

            /* =================================================
               NO CLAIMS
            ================================================= */

            <div className="py-10 text-center">

              <div className="text-4xl mb-3">
                📭
              </div>

              <h4 className="font-semibold text-slate-200">
                No Claims Yet
              </h4>

              <p className="text-sm text-slate-400 mt-1">
                Abhi tak kisi ne is alert
                par claim submit nahi kiya.
              </p>

            </div>
          ) : (

            /* =================================================
               CLAIM LIST
            ================================================= */

            <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">

              {claims.map((claim) => {

                const finderName =
                  claim.user?.name ||
                  "Unknown Finder";

                const finderEmail =
                  claim.user?.email ||
                  "";

                const isAccepted =
                  String(
                    claim.status
                  ).toUpperCase() ===
                  "ACCEPTED";

                return (

                  <div
                    key={claim._id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5"
                  >

                    {/* =================================================
                        FINDER
                    ================================================= */}

                    <div className="flex items-center gap-3 mb-4">

                      <div className="w-11 h-11 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-xl">
                        👤
                      </div>

                      <div className="flex-1 min-w-0">

                        <p className="font-bold text-white">
                          {finderName}
                        </p>

                        {finderEmail && (
                          <p className="text-xs text-slate-400 truncate">
                            {finderEmail}
                          </p>
                        )}

                      </div>

                      {/* STATUS */}

                      <span
                        className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                          isAccepted
                            ? "bg-green-500/10 text-green-400 border border-green-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {isAccepted
                          ? "✓ ACCEPTED"
                          : "PENDING"}
                      </span>

                    </div>

                    {/* =================================================
                        FINDER ANSWER
                    ================================================= */}

                    <div className="mb-4">

                      <p className="text-xs text-amber-400 font-bold mb-2">
                        🔐 Finder's Verification Answer
                      </p>

                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">

                        <p className="text-sm text-slate-200 leading-relaxed">
                          {claim.finderAnswer ||
                            "No answer provided"}
                        </p>

                      </div>
                    </div>

                    {/* =================================================
                        CONTACT UNLOCKED
                    ================================================= */}

                    {isAccepted && (

                      <div className="mb-4 bg-green-500/5 border border-green-500/20 rounded-xl p-4">

                        <p className="text-xs text-green-400 font-bold mb-2">
                          🔓 Contact Unlocked
                        </p>

                        <p className="text-sm text-white font-mono">
                          📱{" "}
                          {claim.finderContact ||
                            "Contact not provided"}
                        </p>

                        {claim.finderContact && (

                          <button
                            onClick={() =>
                              openWhatsApp(
                                claim.finderContact
                              )
                            }
                            className="mt-3 bg-green-600 hover:bg-green-500 px-4 py-2 rounded-xl text-xs font-bold transition"
                          >
                            💬 WhatsApp Finder
                          </button>

                        )}

                      </div>
                    )}

                    {/* =================================================
                        ACTIONS
                    ================================================= */}

                    <div className="border-t border-slate-800 pt-4">

                      {/* =================================================
                          PENDING CLAIM
                      ================================================= */}

                      {!isAccepted ? (

                        <div className="flex gap-2">

                          <button
                            onClick={() =>
                              handleAccept(
                                claim._id
                              )
                            }
                            disabled={
                              acceptingId ===
                              claim._id
                            }
                            className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-bold transition"
                          >
                            {acceptingId ===
                            claim._id
                              ? "Accepting..."
                              : "✅ Accept Claim"}
                          </button>

                          <button
                            onClick={() =>
                              shareClaim(
                                claim
                              )
                            }
                            className="px-4 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-bold transition"
                            title="Share claim"
                          >
                            📤
                          </button>

                        </div>

                      ) : (

                        /* =================================================
                           ACCEPTED CLAIM
                        ================================================= */

                        <div className="grid grid-cols-2 gap-2">

                          {/* =================================================
                              CHAT
                          ================================================= */}

                          <button
                            onClick={() => {
                              console.log(
                                "💬 Opening chat for claim:",
                                claim
                              );

                              setChatClaim(
                                claim
                              );
                            }}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-sm font-bold transition"
                          >
                            💬 Chat with Finder
                          </button>

                          {/* =================================================
                              SHARE
                          ================================================= */}

                          <button
                            onClick={() =>
                              shareClaim(
                                claim
                              )
                            }
                            className="bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-xl text-sm font-bold transition"
                          >
                            📤 Share Details
                          </button>

                        </div>
                      )}

                    </div>
                  </div>
                );
              })}

            </div>
          )}

        </div>

        {/* =================================================
            FOOTER
        ================================================= */}

        <div className="px-5 pb-5">

          <button
            onClick={onClose}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 rounded-xl text-sm font-semibold transition"
          >
            Close
          </button>

        </div>

      </div>
    </div>
  );
};

export default ClaimsListModal;