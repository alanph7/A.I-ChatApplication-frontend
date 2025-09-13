import { useState, useRef, useEffect } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const chatEndRef = useRef(null);

  // Fetch past messages on load
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        //Send to Backend
        const res = await axios.get("http://localhost:5000/chat/history");
        setChat(res.data);
      } catch (error) {
        console.error("❌ Error fetching history:", error);
      }
    };
    fetchMessages();
  }, []);

  // Auto-scroll to latest
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const sendMessage = async () => {
    if (!message.trim()) return;

    const userMessage = message;
    setMessage("");

    try {
      const res = await axios.post("http://localhost:5000/chat", {
        message: userMessage,
      });
      //Append user and AI Reply
      setChat((prev) => [
        ...prev,
        { role: "user", text: userMessage },
        { role: "ai", text: res.data.reply },
      ]);
    } catch (error) {
      console.error("❌ Error sending message:", error);
      setChat((prev) => [
        ...prev,
        { role: "ai", text: "❌ Error: Could not get a reply." },
      ]);
    }
  };

  // Clear only current session chat (frontend state)
  const clearChat = () => {
    setChat([]);
  };

  // Clear history from DB + UI
  const clearHistory = async () => {
    try {
      await axios.delete("http://localhost:5000/chat/history");
      setChat([]);
    } catch (error) {
      console.error("❌ Error clearing history:", error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  return (
    <div className="container">
      <h2>Gemini AI Chat</h2>

      {/* Buttons */}
      <div className="controls">
        <button onClick={clearChat} className="clear-btn">
          🧹 Clear Chat
        </button>
        <button onClick={clearHistory} className="clear-btn">
          🗑 Clear History
        </button>
      </div>

      <div className="chat-box">
        {chat.map((c, i) => (
          <p key={i} className={`message ${c.role}`}>
            <b>{c.role === "user" ? "You" : "AI"}:</b> {c.text}
          </p>
        ))}
        <div ref={chatEndRef} />
      </div>

      <div className="input-box">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Type a message..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}

export default App;
