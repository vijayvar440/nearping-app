import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";

const API_URL = "https://nearping-app.onrender.com";

const socket = io(API_URL);

const ClaimChat = ({ claim, ping, finder, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const messagesEndRef = useRef(null);

  // ===============================
  // CURRENT USER ID
  // ===============================
  const getCurrentUserId = () => {
    const userId = localStorage.getItem("userId");

    if (userId) {
      return userId;
    }

    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      return null;
    }

    try {
      const parsedUser = JSON.parse(storedUser);

      return (
        parsedUser?._id ||
        parsedUser?.id ||
        parsedUser?.user?._id ||
        parsedUser?.user?.id ||
        null
      );
    } catch {
      return storedUser;
    }
  };

  const currentUserId = getCurrentUserId();

  // ===============================
  // FINDER ID
  // ===============================
  const finderId =
    typeof finder === "object"
      ? finder?._id || finder?.id
      : finder;

  // ===============================
  // SCROLL
  // ===============================
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    }, 50);
  };

  // ===============================
  // FETCH MESSAGES
  // ===============================
  useEffect(() => {
    if (!finderId) {
      setLoading(false);
      return;
    }

    const fetchMessages = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await axios.get(
          `${API_URL}/api/messages/${finderId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setMessages(res.data.messages || []);

        scrollToBottom();
      } catch (error) {
        console.error(
          "Fetch chat error:",
          error.response?.data || error.message
        );
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [finderId]);

  // ===============================
  // SOCKET
  // ===============================
  useEffect(() => {
    if (!currentUserId) return;

    // Join private user room
    socket.emit("join-user", String(currentUserId));

    // ===============================
    // NEW MESSAGE
    // ===============================
    const handleNewMessage = (newMessage) => {
      const senderId =
        newMessage.sender?._id ||
        newMessage.sender;

      const receiverId =
        newMessage.receiver?._id ||
        newMessage.receiver;

      const isThisChat =
        (String(senderId) === String(finderId) &&
          String(receiverId) === String(currentUserId)) ||
        (String(senderId) === String(currentUserId) &&
          String(receiverId) === String(finderId));

      if (!isThisChat) return;

      setMessages((prev) => {
        const exists = prev.some(
          (msg) => String(msg._id) === String(newMessage._id)
        );

        if (exists) return prev;

        return [...prev, newMessage];
      });

      scrollToBottom();
    };

    // ===============================
    // MESSAGE DELETED
    // ===============================
    const handleMessageDeleted = (data) => {
      if (!data?.messageId) return;

      setMessages((prev) =>
        prev.filter(
          (msg) =>
            String(msg._id) !== String(data.messageId)
        )
      );
    };

    socket.on(
      "claim-chat-message",
      handleNewMessage
    );

    socket.on(
      "claim-chat-message-deleted",
      handleMessageDeleted
    );

    return () => {
      socket.off(
        "claim-chat-message",
        handleNewMessage
      );

      socket.off(
        "claim-chat-message-deleted",
        handleMessageDeleted
      );
    };
  }, [currentUserId, finderId]);

  // ===============================
  // SEND MESSAGE
  // ===============================
  const sendMessage = async () => {
    if (!text.trim() || sending) return;

    if (!finderId) {
      alert("Finder information nahi mila.");
      return;
    }

    if (!claim?._id) {
      alert("Claim information nahi mila.");
      return;
    }

    try {
      setSending(true);

      const token = localStorage.getItem("token");

      const res = await axios.post(
        `${API_URL}/api/messages/send/${finderId}`,
        {
          message: text.trim(),
          claimId: claim._id,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.data.success) {
        const sentMessage = res.data.newMessage;

        setMessages((prev) => {
          const exists = prev.some(
            (msg) =>
              String(msg._id) ===
              String(sentMessage._id)
          );

          if (exists) return prev;

          return [...prev, sentMessage];
        });

        setText("");

        scrollToBottom();
      }
    } catch (error) {
      console.error(
        "Send message error:",
        error.response?.data || error.message
      );

      alert(
        error.response?.data?.message ||
          "Message send nahi ho paya."
      );
    } finally {
      setSending(false);
    }
  };

  // ===============================
  // DELETE MESSAGE
  // ===============================
  const deleteMessage = async (messageId) => {
    if (!messageId || deletingId) return;

    const confirmDelete = window.confirm(
      "Kya aap ye message delete karna chahte hain?"
    );

    if (!confirmDelete) return;

    try {
      setDeletingId(messageId);

      const token = localStorage.getItem("token");

      const res = await axios.delete(
        `${API_URL}/api/messages/${messageId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.data.success) {
        setMessages((prev) =>
          prev.filter(
            (msg) =>
              String(msg._id) !==
              String(messageId)
          )
        );
      }
    } catch (error) {
      console.error(
        "Delete message error:",
        error.response?.data || error.message
      );

      alert(
        error.response?.data?.message ||
          "Message delete nahi ho paya."
      );
    } finally {
      setDeletingId(null);
    }
  };

  // ===============================
  // ENTER TO SEND
  // ===============================
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ===============================
  // FORMAT TIME
  // ===============================
  const formatTime = (date) => {
    if (!date) return "";

    return new Date(date).toLocaleTimeString(
      "en-IN",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };

  const finderName =
    typeof finder === "object"
      ? finder?.name || "Finder"
      : "Finder";

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 z-[10000]">

      <div className="bg-slate-950 border border-slate-800 w-full max-w-lg h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">

        {/* ================= HEADER ================= */}
        <div className="bg-slate-900 border-b border-slate-800 px-5 py-4 flex items-center gap-3">

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl mr-1"
          >
            ←
          </button>

          <div className="w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
            👤
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white truncate">
              {finderName}
            </h3>

            <p className="text-xs text-green-400">
              🔓 Claim Chat
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white text-lg"
          >
            ✕
          </button>
        </div>

        {/* ================= ITEM INFO ================= */}
        <div className="px-4 py-3 bg-indigo-500/5 border-b border-slate-800">
          <p className="text-xs text-slate-400">
            Chat regarding
          </p>

          <p className="text-sm text-white font-semibold truncate">
            📦 {ping?.title || "Lost Item"}
          </p>
        </div>

        {/* ================= MESSAGES ================= */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">

          {loading ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-sm text-slate-400">
                Loading chat...
              </p>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">

              <div className="text-5xl mb-4">
                💬
              </div>

              <h4 className="text-white font-bold">
                Start Conversation
              </h4>

              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Finder se item ke baare me baat karein.
              </p>
            </div>
          ) : (
            messages.map((message) => {
              const senderId =
                message.sender?._id ||
                message.sender;

              const isMine =
                String(senderId) ===
                String(currentUserId);

              return (
                <div
                  key={message._id}
                  className={`flex ${
                    isMine
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`group relative max-w-[78%] px-4 py-2.5 rounded-2xl ${
                      isMine
                        ? "bg-indigo-600 text-white rounded-br-md"
                        : "bg-slate-800 text-slate-200 rounded-bl-md"
                    }`}
                  >

                    {/* MESSAGE */}
                    <p className="text-sm whitespace-pre-wrap break-words pr-1">
                      {message.message}
                    </p>

                    {/* TIME + DELETE */}
                    <div className="flex items-center justify-end gap-2 mt-1">

                      <p
                        className={`text-[10px] ${
                          isMine
                            ? "text-indigo-200"
                            : "text-slate-500"
                        }`}
                      >
                        {formatTime(
                          message.createdAt
                        )}
                      </p>

                      {/* DELETE ONLY OWN MESSAGE */}
                      {isMine && (
                        <button
                          onClick={() =>
                            deleteMessage(
                              message._id
                            )
                          }
                          disabled={
                            deletingId ===
                            message._id
                          }
                          title="Delete message"
                          className="text-[10px] text-red-200 hover:text-white opacity-70 hover:opacity-100 transition disabled:opacity-40"
                        >
                          {deletingId ===
                          message._id
                            ? "..."
                            : "🗑️"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ================= INPUT ================= */}
        <div className="p-3 bg-slate-900 border-t border-slate-800">

          <div className="flex items-end gap-2">

            <textarea
              value={text}
              onChange={(e) =>
                setText(e.target.value)
              }
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Message Finder..."
              className="flex-1 resize-none bg-slate-800 border border-slate-700 text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500"
            />

            <button
              onClick={sendMessage}
              disabled={
                !text.trim() || sending
              }
              className="w-12 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition"
            >
              {sending ? "..." : "➤"}
            </button>

          </div>

          <p className="text-[10px] text-slate-600 mt-2 text-center">
            Enter to send • Shift + Enter for new line
          </p>
        </div>

      </div>
    </div>
  );
};

export default ClaimChat;