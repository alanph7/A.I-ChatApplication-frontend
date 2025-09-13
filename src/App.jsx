import { useState, useRef, useEffect } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const chatEndRef = useRef(null);

  // Auto-scroll to latest
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  // Load chat history from database
  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await axios.get("http://localhost:5000/chat/history");
      setChat(res.data);
    } catch (error) {
      console.error("❌ Error loading history:", error);
      setChat((prev) => [
        ...prev,
        { role: "ai", text: "❌ Error loading chat history. Please try again." },
      ]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage = message;
    setMessage("");
    setIsLoading(true);

    // Add user message immediately
    setChat((prev) => [...prev, { role: "user", text: userMessage }]);

    try {
      const res = await axios.post("http://localhost:5000/chat", {
        message: userMessage,
      });
      
      // Add AI response
      setChat((prev) => [
        ...prev,
        { role: "ai", text: res.data.reply },
      ]);
    } catch (error) {
      console.error("❌ Error sending message:", error);
      setChat((prev) => [
        ...prev,
        { role: "ai", text: "❌ Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="app-container">
      <div className="chat-app">
        {/* Header */}
        <div className="header">
          <h2>🤖 Gemini AI Chat</h2>
          <div className="controls">
            <button 
              onClick={loadHistory} 
              className="control-btn"
              disabled={isLoadingHistory}
            >
              {isLoadingHistory ? "⏳ Loading..." : "📂 Load History"}
            </button>
            <button onClick={clearChat} className="control-btn">
              🧹 Clear Chat
            </button>
            <button onClick={clearHistory} className="control-btn">
              🗑 Clear History
            </button>
          </div>
        </div>

        {/* Chat Box */}
        <div className="chat-box">
          {chat.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">💬</div>
              <div className="empty-state-text">Start a conversation</div>
              <div className="empty-state-subtext">Ask me anything!</div>
            </div>
          ) : (
            chat.map((c, i) => (
              <div key={i} className={`message ${c.role}`}>
                <div className="message-content">
                  <span className="message-label">
                    {c.role === "user" ? "You" : "AI"}
                  </span>
                  <div className="message-text">{c.text}</div>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="message ai">
              <div className="message-content">
                <span className="message-label">AI</span>
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Section */}
        <div className="input-section">
          <div className="input-box">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask me anything..."
              disabled={isLoading}
            />
            <button 
              onClick={sendMessage} 
              className="send-btn"
              disabled={isLoading || !message.trim()}
            >
              {isLoading ? "..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;