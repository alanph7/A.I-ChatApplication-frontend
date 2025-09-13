import { useState, useRef, useEffect } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const chatEndRef = useRef(null);

  // Scroll to latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const sendMessage = async () => {
    if (!message.trim()) return;

    // Add user message
    setChat((prev) => [...prev, { role: "user", text: message }]);
    const userMessage = message;
    setMessage("");

    try {
      // Send to backend
      const res = await axios.post("http://localhost:5000/chat", { message: userMessage });
      setChat((prev) => [...prev, { role: "ai", text: res.data.reply }]);
    } catch (error) {
      console.error("Error:", error);
      setChat((prev) => [...prev, { role: "ai", text: "Error: Could not get a reply." }]);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  return (
    <div className="container">
      <h2>AI Chat</h2>
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
