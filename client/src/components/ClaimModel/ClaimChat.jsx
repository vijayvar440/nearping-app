import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import axios from "axios";
import { io } from "socket.io-client";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://nearping-app.onrender.com";

const socket = io(API_URL, {
  transports: ["websocket", "polling"],
});

const ClaimChat = ({
  claim,
  ping,
  finder,
  onClose,
}) => {
  const [messages, setMessages] =
    useState([]);

  const [text, setText] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [sending, setSending] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState(null);

  const messagesEndRef =
    useRef(null);

  // ==========================================
  // CURRENT USER
  // ==========================================

  const getCurrentUserId = () => {
    const userId =
      localStorage.getItem("userId");

    if (userId) {
      return userId;
    }

    const storedUser =
      localStorage.getItem("user");

    if (!storedUser) {
      return null;
    }

    try {
      const user =
        JSON.parse(storedUser);

      return (
        user?._id ||
        user?.id ||
        user?.user?._id ||
        user?.user?.id ||
        null
      );
    } catch {
      return null;
    }
  };

  const currentUserId =
    getCurrentUserId();

  // ==========================================
  // FINDER
  // ==========================================

  const finderId =
    typeof finder === "object"
      ? finder?._id || finder?.id
      : finder;

  const finderName =
    typeof finder === "object"
      ? finder?.name || "Finder"
      : "Finder";

  // ==========================================
  // SCROLL
  // ==========================================

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    }, 100);
  };

  // ==========================================
  // LOAD MESSAGES
  // ==========================================

  useEffect(() => {
    if (!finderId) {
      setLoading(false);
      return;
    }

    const loadMessages = async () => {
      try {
        setLoading(true);

        const token =
          localStorage.getItem("token");

        const response =
          await axios.get(
            `${API_URL}/api/messages/${finderId}`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        setMessages(
          response.data?.messages || []
        );

        scrollToBottom();
      } catch (error) {
        console.error(
          "❌ Load messages error:",
          error.response?.data ||
            error.message
        );
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [finderId]);

  // ==========================================
  // SOCKET
  // ==========================================

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    socket.emit(
      "join-user",
      String(currentUserId)
    );

    const handleNewMessage = (
      newMessage
    ) => {
      if (!newMessage?._id) {
        return;
      }

      const senderId =
        newMessage.sender?._id ||
        newMessage.sender;

      const receiverId =
        newMessage.receiver?._id ||
        newMessage.receiver;

      const belongsToChat =
        (
          String(senderId) ===
            String(finderId) &&
          String(receiverId) ===
            String(currentUserId)
        ) ||
        (
          String(senderId) ===
            String(currentUserId) &&
          String(receiverId) ===
            String(finderId)
        );

      if (!belongsToChat) {
        return;
      }

      setMessages((previous) => {
        const alreadyExists =
          previous.some(
            (message) =>
              String(message._id) ===
              String(newMessage._id)
          );

        if (alreadyExists) {
          return previous;
        }

        return [
          ...previous,
          newMessage,
        ];
      });

      scrollToBottom();
    };

    const handleDeleted = (data) => {
      if (!data?.messageId) {
        return;
      }

      setMessages((previous) =>
        previous.filter(
          (message) =>
            String(message._id) !==
            String(data.messageId)
        )
      );
    };

    socket.on(
      "claim-chat-message",
      handleNewMessage
    );

    socket.on(
      "claim-chat-message-deleted",
      handleDeleted
    );

    return () => {
      socket.off(
        "claim-chat-message",
        handleNewMessage
      );

      socket.off(
        "claim-chat-message-deleted",
        handleDeleted
      );
    };
  }, [
    currentUserId,
    finderId,
  ]);

  // ==========================================
  // SEND MESSAGE
  // ==========================================

  const sendMessage = async () => {
    const messageText =
      text.trim();

    if (
      !messageText ||
      sending
    ) {
      return;
    }

    if (!finderId) {
      alert(
        "Finder information nahi mili."
      );
      return;
    }

    if (!claim?._id) {
      alert(
        "Claim information nahi mili."
      );
      return;
    }

    try {
      setSending(true);

      const token =
        localStorage.getItem("token");

      const response =
        await axios.post(
          `${API_URL}/api/messages/send/${finderId}`,
          {
            message: messageText,
            claimId: claim._id,
          },
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      if (
        response.data?.success &&
        response.data?.newMessage
      ) {
        const newMessage =
          response.data.newMessage;

        setMessages((previous) => {
          const exists =
            previous.some(
              (message) =>
                String(message._id) ===
                String(newMessage._id)
            );

          if (exists) {
            return previous;
          }

          return [
            ...previous,
            newMessage,
          ];
        });

        setText("");

        scrollToBottom();
      }
    } catch (error) {
      console.error(
        "❌ Send message error:",
        error.response?.data ||
          error.message
      );

      alert(
        error.response?.data?.message ||
          "Message send nahi ho paya."
      );
    } finally {
      setSending(false);
    }
  };

  // ==========================================
  // DELETE MESSAGE
  // ==========================================

  const deleteMessage = async (
    messageId
  ) => {
    if (
      !messageId ||
      deletingId
    ) {
      return;
    }

    const confirmDelete =
      window.confirm(
        "Kya aap ye message delete karna chahte hain?"
      );

    if (!confirmDelete) {
      return;
    }

    try {
      setDeletingId(messageId);

      const token =
        localStorage.getItem("token");

      await axios.delete(
        `${API_URL}/api/messages/${messageId}`,
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      setMessages((previous) =>
        previous.filter(
          (message) =>
            String(message._id) !==
            String(messageId)
        )
      );
    } catch (error) {
      console.error(
        "❌ Delete message error:",
        error.response?.data ||
          error.message
      );

      alert(
        error.response?.data?.message ||
          "Message delete nahi ho paya."
      );
    } finally {
      setDeletingId(null);
    }
  };

  // ==========================================
  // ENTER TO SEND
  // ==========================================

  const handleKeyDown = (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      sendMessage();
    }
  };

  // ==========================================
  // TIME
  // ==========================================

  const formatTime = (date) => {
    if (!date) {
      return "";
    }

    return new Date(date).toLocaleTimeString(
      "en-IN",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="fixed inset-0 bg-black z-[11000] flex flex-col">

      {/* =====================================
          HEADER
      ===================================== */}

      <div className="h-16 flex items-center gap-3 px-4 bg-slate-900 border-b border-slate-800">

        <button
          onClick={onClose}
          className="text-2xl text-slate-300 hover:text-white"
        >
          ←
        </button>

        <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center">
          👤
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white font-bold truncate">
            {finderName}
          </p>

          <p className="text-[11px] text-green-400">
            Claim accepted
          </p>
        </div>

      </div>

      {/* =====================================
          ITEM BAR
      ===================================== */}

      <div className="px-4 py-2 bg-slate-950 border-b border-slate-800">

        <p className="text-[11px] text-slate-500">
          Chat about
        </p>

        <p className="text-sm text-white font-semibold truncate">
          📦 {ping?.title || "Lost Item"}
        </p>

      </div>

      {/* =====================================
          MESSAGES
      ===================================== */}

      <div className="flex-1 overflow-y-auto px-3 py-4 bg-slate-950">

        {loading ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-slate-500">
              Loading messages...
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">

            <div className="text-5xl mb-3">
              💬
            </div>

            <p className="text-white font-semibold">
              Start chatting
            </p>

            <p className="text-xs text-slate-500 mt-1">
              Item ke baare me message karein.
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
                className={`flex mb-2 ${
                  isMine
                    ? "justify-end"
                    : "justify-start"
                }`}
              >

                <div
                  className={`relative max-w-[82%] px-3 py-2 ${
                    isMine
                      ? "bg-indigo-600 text-white rounded-2xl rounded-br-sm"
                      : "bg-slate-800 text-slate-100 rounded-2xl rounded-bl-sm"
                  }`}
                >

                  <p className="text-sm whitespace-pre-wrap break-words">
                    {message.message}
                  </p>

                  <div className="flex items-center justify-end gap-2 mt-1">

                    <span
                      className={`text-[10px] ${
                        isMine
                          ? "text-indigo-200"
                          : "text-slate-500"
                      }`}
                    >
                      {formatTime(
                        message.createdAt
                      )}
                    </span>

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
                        className="text-[10px] opacity-70 hover:opacity-100"
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

      {/* =====================================
          INPUT
      ===================================== */}

      <div className="p-3 bg-slate-900 border-t border-slate-800">

        <div className="flex items-end gap-2">

          <textarea
            value={text}
            onChange={(event) =>
              setText(event.target.value)
            }
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            rows={1}
            className="flex-1 resize-none bg-slate-800 border border-slate-700 text-white rounded-2xl px-4 py-3 text-sm outline-none focus:border-indigo-500"
          />

          <button
            onClick={sendMessage}
            disabled={
              !text.trim() ||
              sending
            }
            className="w-12 h-12 shrink-0 rounded-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white flex items-center justify-center text-lg"
          >
            {sending
              ? "..."
              : "➤"}
          </button>

        </div>

        <p className="text-[9px] text-slate-600 text-center mt-2">
          Enter = Send • Shift + Enter = New line
        </p>

      </div>

    </div>
  );
};

export default ClaimChat;