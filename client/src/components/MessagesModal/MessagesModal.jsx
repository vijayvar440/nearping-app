import React, { useEffect, useState } from "react";
import axios from "axios";
import ClaimChat from "../ClaimModel/ClaimChat";

const API_URL =
  "https://nearping-app.onrender.com";

const MessagesModal = ({ onClose }) => {
  const [conversations, setConversations] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [selectedChat, setSelectedChat] =
    useState(null);

  const token =
    localStorage.getItem("token");

  // =====================================================
  // FETCH MESSAGE HISTORY
  // =====================================================

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true);

        const res = await axios.get(
          `${API_URL}/api/messages/conversations`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        console.log(
          "💬 MESSAGE HISTORY:",
          res.data
        );

        setConversations(
          res.data?.conversations || []
        );
      } catch (error) {
        console.error(
          "❌ Message history error:",
          error.response?.data ||
            error.message
        );
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchConversations();
    } else {
      setLoading(false);
    }
  }, [token]);

  // =====================================================
  // OPEN CHAT
  // =====================================================

  if (selectedChat) {
    const claim =
      selectedChat.claim;

    return (
      <ClaimChat
        claim={claim}
        ping={selectedChat.ping}
        finder={selectedChat.otherUser}
        onClose={() =>
          setSelectedChat(null)
        }
      />
    );
  }

  // =====================================================
  // MODAL
  // =====================================================

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-[10000]">

      <div className="bg-slate-950 border border-slate-800 text-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden">

        {/* HEADER */}

        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">

          <div>
            <p className="text-xs text-indigo-400 font-bold uppercase tracking-wider">
              NearPing
            </p>

            <h2 className="text-xl font-bold mt-1">
              💬 Messages
            </h2>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl"
          >
            ✕
          </button>

        </div>

        {/* BODY */}

        <div className="p-5 max-h-[70vh] overflow-y-auto">

          {loading ? (
            <div className="text-center py-10">
              <div className="text-3xl mb-3">
                🔄
              </div>

              <p className="text-slate-400">
                Messages load ho rahe hain...
              </p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-12">

              <div className="text-5xl mb-4">
                💬
              </div>

              <h3 className="font-bold text-lg">
                No Messages Yet
              </h3>

              <p className="text-sm text-slate-400 mt-2">
                Accepted claim ke baad yahan
                chat history dikhegi.
              </p>

            </div>
          ) : (
            <div className="space-y-3">

              {conversations.map(
                (conversation) => {

                  const otherUser =
                    conversation.otherUser;

                  const lastMessage =
                    conversation.lastMessage;

                  return (
                    <button
                      key={
                        conversation.claimId
                      }
                      onClick={() => {

                        setSelectedChat({
                          claim: {
                            _id:
                              conversation.claimId,
                            status:
                              conversation.claimStatus,
                            user:
                              otherUser,
                          },

                          ping: {
                            _id:
                              conversation.pingId,
                            title:
                              conversation.itemTitle,
                          },

                          otherUser,
                        });

                      }}
                      className="w-full text-left bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-4 transition"
                    >

                      <div className="flex items-center gap-3">

                        <div className="w-11 h-11 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-xl">
                          👤
                        </div>

                        <div className="flex-1 min-w-0">

                          <div className="flex justify-between gap-3">

                            <p className="font-bold truncate">
                              {otherUser?.name ||
                                "NearPing User"}
                            </p>

                            <span className="text-[10px] text-green-400">
                              ACCEPTED
                            </span>

                          </div>

                          <p className="text-xs text-indigo-400 mt-1 truncate">
                            📍{" "}
                            {conversation.itemTitle}
                          </p>

                          <p className="text-sm text-slate-400 mt-1 truncate">

                            {lastMessage?.message ||
                              "Start chatting..."}

                          </p>

                        </div>

                        <div className="text-slate-500">
                          ›
                        </div>

                      </div>

                    </button>
                  );
                }
              )}

            </div>
          )}

        </div>

        {/* FOOTER */}

        <div className="px-5 pb-5">

          <button
            onClick={onClose}
            className="w-full bg-slate-800 hover:bg-slate-700 py-2.5 rounded-xl text-sm font-semibold"
          >
            Close
          </button>

        </div>

      </div>
    </div>
  );
};

export default MessagesModal;