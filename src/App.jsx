import { useState, useRef, useEffect } from "react";
import axios from "axios";

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
      //message to backend
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
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="pro-card border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Title */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg gemini-gradient flex items-center justify-center">
                <span className="text-white font-bold text-sm">G</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">Gemini Pro</h1>
                <p className="text-xs text-gray-400">AI Assistant</p>
              </div>
            </div>
            
            {/* Control Buttons */}
            <div className="flex items-center gap-2">
              <button 
                onClick={loadHistory} 
                className="glass-button px-3 py-2 rounded-lg text-xs font-medium text-white/90 flex items-center gap-2"
                disabled={isLoadingHistory}
              >
                {isLoadingHistory ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Loading...
                  </>
                ) : (
                  <>
                    <i className="fas fa-history"></i>
                    History
                  </>
                )}
              </button>
              <button 
                onClick={clearChat} 
                className="glass-button px-3 py-2 rounded-lg text-xs font-medium text-white/90 flex items-center gap-2"
              >
                <i className="fas fa-broom"></i>
                Clear
              </button>
              <button 
                onClick={clearHistory} 
                className="glass-button px-3 py-2 rounded-lg text-xs font-medium text-red-400/90 flex items-center gap-2"
              >
                <i className="fas fa-trash"></i>
                Delete All
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 max-w-4xl mx-auto w-full flex flex-col">
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-6">
          {chat.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <div className="w-16 h-16 rounded-2xl gemini-gradient flex items-center justify-center mb-6 glow-blue">
                <span className="icon-sparkle text-2xl"></span>
              </div>
              <h2 className="text-2xl font-semibold text-white mb-3">Hello! I'm Gemini Pro</h2>
              <p className="text-gray-400 text-sm max-w-md mb-8">
                I'm here to help you with questions, creative tasks, analysis, and more. 
                What would you like to explore today?
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl">
                <div className="pro-card p-4 rounded-xl hover:bg-white/5 transition-all cursor-pointer"
                     onClick={() => setMessage("What can you help me with?")}>
                  <div className="flex items-start gap-3">
                    <i className="fas fa-lightbulb text-yellow-400 mt-1"></i>
                    <div>
                      <h3 className="font-medium text-white text-sm">Get started</h3>
                      <p className="text-gray-400 text-xs">Learn what I can do</p>
                    </div>
                  </div>
                </div>
                <div className="pro-card p-4 rounded-xl hover:bg-white/5 transition-all cursor-pointer"
                     onClick={() => setMessage("Help me write a professional email")}>
                  <div className="flex items-start gap-3">
                    <i className="fas fa-pen text-blue-400 mt-1"></i>
                    <div>
                      <h3 className="font-medium text-white text-sm">Write content</h3>
                      <p className="text-gray-400 text-xs">Create and edit text</p>
                    </div>
                  </div>
                </div>
                <div className="pro-card p-4 rounded-xl hover:bg-white/5 transition-all cursor-pointer"
                     onClick={() => setMessage("Explain a complex topic simply")}>
                  <div className="flex items-start gap-3">
                    <i className="fas fa-brain text-purple-400 mt-1"></i>
                    <div>
                      <h3 className="font-medium text-white text-sm">Explain concepts</h3>
                      <p className="text-gray-400 text-xs">Break down complex ideas</p>
                    </div>
                  </div>
                </div>
                <div className="pro-card p-4 rounded-xl hover:bg-white/5 transition-all cursor-pointer"
                     onClick={() => setMessage("Help me solve a problem")}>
                  <div className="flex items-start gap-3">
                    <i className="fas fa-puzzle-piece text-green-400 mt-1"></i>
                    <div>
                      <h3 className="font-medium text-white text-sm">Problem solving</h3>
                      <p className="text-gray-400 text-xs">Find solutions together</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {chat.map((c, i) => (
                <div key={i} className={`message-enter flex ${c.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-3 max-w-3xl ${c.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                      c.role === 'user' 
                        ? 'bg-blue-600' 
                        : 'gemini-gradient glow-green'
                    }`}>
                      {c.role === 'user' ? (
                        <i className="fas fa-user text-white text-xs"></i>
                      ) : (
                        <span className="icon-sparkle text-sm"></span>
                      )}
                    </div>
                    
                    {/* Message Content */}
                    <div className={`flex flex-col ${c.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className="text-xs text-gray-400 mb-2 font-medium">
                        {c.role === 'user' ? 'You' : 'Gemini Pro'}
                      </div>
                      <div className={`rounded-2xl px-4 py-3 max-w-none ${
                        c.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'pro-card text-gray-100'
                      }`}>
                        <div className="text-sm leading-relaxed whitespace-pre-wrap">
                          {c.text}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Loading indicator */}
              {isLoading && (
                <div className="flex justify-start message-enter">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full gemini-gradient glow-green flex items-center justify-center">
                      <span className="icon-sparkle text-sm"></span>
                    </div>
                    <div className="flex flex-col">
                      <div className="text-xs text-gray-400 mb-2 font-medium">Gemini Pro</div>
                      <div className="pro-card rounded-2xl px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            <div className="typing-dot"></div>
                            <div className="typing-dot"></div>
                            <div className="typing-dot"></div>
                          </div>
                          <span className="text-xs text-gray-400">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Section */}
        <div className="border-t border-white/10 p-6">
          <div className="relative max-w-3xl mx-auto">
            <div className="pro-card rounded-3xl flex items-end gap-3 p-4 focus-within:ring-1 focus-within:ring-blue-500/50">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Message Gemini Pro..."
                disabled={isLoading}
                rows="1"
                className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-400 text-sm resize-none min-h-[24px] max-h-32"
                style={{ 
                  minHeight: '24px',
                  height: 'auto',
                  overflowY: message.split('\n').length > 3 ? 'scroll' : 'hidden'
                }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
                }}
              />
              <button 
                onClick={sendMessage} 
                className={`p-2 rounded-xl transition-all duration-200 ${
                  isLoading || !message.trim()
                    ? 'bg-gray-700 cursor-not-allowed' 
                    : 'gemini-gradient hover:shadow-lg glow-blue'
                }`}
                disabled={isLoading || !message.trim()}
              >
                {isLoading ? (
                  <i className="fas fa-spinner fa-spin text-white text-sm"></i>
                ) : (
                  <i className="fas fa-arrow-up text-white text-sm"></i>
                )}
              </button>
            </div>
            <div className="text-xs text-gray-500 text-center mt-3">
              Gemini may display inaccurate info, including about people, so double-check its responses.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;