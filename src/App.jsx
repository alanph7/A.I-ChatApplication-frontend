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
      
      // Add AI response - handle both text and image responses
      if (res.data.type === "image") {
        setChat((prev) => [
          ...prev,
          { role: "ai", text: "", image: res.data.image, type: "image" },
        ]);
      } else {
        setChat((prev) => [
          ...prev,
          { role: "ai", text: res.data.text, type: "text" },
        ]);
      }
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

  // Format message text with markdown-like styling and handle images
  const formatMessage = (messageData) => {
    // If it's an image message, display the image
    if (messageData.type === 'image' && messageData.image) {
      return (
        <div className="flex flex-col gap-3">
          <div className="rounded-xl overflow-hidden border border-slate-600/50 shadow-lg max-w-md">
            <img 
              src={messageData.image} 
              alt="Generated image" 
              className="w-full h-auto object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <div style={{display: 'none'}} className="p-4 bg-slate-800/50 text-slate-300 text-sm">
              ❌ Failed to load image
            </div>
          </div>
          {messageData.text && (
            <div className="leading-relaxed message-content">
              {formatTextContent(messageData.text)}
            </div>
          )}
        </div>
      );
    }
    
    // Otherwise format as text
    return formatTextContent(messageData.text || messageData);
  };

  // Separate function for text formatting
  const formatTextContent = (text) => {
    if (!text) return '';
    
    // Split by code blocks first
    const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.slice(lastIndex, match.index)
        });
      }
      
      // Add code block
      parts.push({
        type: 'code',
        language: match[1] || 'text',
        content: match[2].trim()
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex)
      });
    }
    
    // If no code blocks found, treat entire text as regular text
    if (parts.length === 0) {
      parts.push({ type: 'text', content: text });
    }

    return parts.map((part, index) => {
      if (part.type === 'code') {
        return (
          <div key={index} className="my-4 rounded-xl overflow-hidden border border-slate-600/50 shadow-lg">
            <div className="bg-slate-800/80 backdrop-blur-sm px-4 py-3 text-xs text-slate-300 font-semibold border-b border-slate-600/50 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="ml-2 text-slate-400">{part.language}</span>
            </div>
            <pre className="p-4 bg-slate-900/50 backdrop-blur-sm overflow-x-auto">
              <code className="text-green-400 text-sm font-mono leading-relaxed whitespace-pre">
                {part.content}
              </code>
            </pre>
          </div>
        );
      } else {
        // Process regular text for markdown-like formatting
        let formattedContent = part.content;
        
        // Replace **bold** with <strong>
        formattedContent = formattedContent.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>');
        
        // Replace *italic* with <em>
        formattedContent = formattedContent.replace(/\*(.*?)\*/g, '<em class="italic text-blue-200">$1</em>');
        
        // Replace • bullets with styled bullets
        formattedContent = formattedContent.replace(/^• /gm, '<span class="text-blue-400 font-bold">•</span> ');
        
        // Replace numbered lists
        formattedContent = formattedContent.replace(/^(\d+)\. /gm, '<span class="text-blue-400 font-semibold">$1.</span> ');
        
        return (
          <div 
            key={index}
            className="leading-relaxed message-content"
            dangerouslySetInnerHTML={{ __html: formattedContent }}
          />
        );
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col">
      {/* Header */}
      <div className="backdrop-blur-xl bg-slate-900/30 border-b border-slate-700/50 sticky top-0 z-50 shadow-2xl">
        <div className="max-w-5xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            {/* Logo and Title */}
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-xl group-hover:shadow-glow transition-all duration-300">
                  <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="currentColor"/>
                    <path d="M19 15L19.31 16.32L21 16.63L19.31 16.94L19 18.25L18.69 16.94L17 16.63L18.69 16.32L19 15Z" fill="currentColor"/>
                    <path d="M5 6L5.31 7.32L7 7.63L5.31 7.94L5 9.25L4.69 7.94L3 7.63L4.69 7.32L5 6Z" fill="currentColor"/>
                  </svg>
                </div>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 blur-lg opacity-20 group-hover:opacity-40 transition-all duration-300"></div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">OctaAI Pro</h1>
                <p className="text-sm text-slate-400 font-medium">Advanced AI Assistant</p>
              </div>
            </div>
            
            {/* Control Buttons */}
            <div className="flex items-center gap-3">
              <button 
                onClick={loadHistory} 
                className="glass-button px-4 py-2.5 rounded-xl text-sm font-medium text-white/90 flex items-center gap-2 focus-ring no-print"
                disabled={isLoadingHistory}
              >
                {isLoadingHistory ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/>
                      <path fill="currentColor" className="opacity-75" d="m4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    Loading...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    History
                  </>
                )}
              </button>
              <button 
                onClick={clearChat} 
                className="glass-button px-4 py-2.5 rounded-xl text-sm font-medium text-white/90 flex items-center gap-2 focus-ring no-print"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear
              </button>
              <button 
                onClick={clearHistory} 
                className="glass-button px-4 py-2.5 rounded-xl text-sm font-medium text-red-400/90 flex items-center gap-2 hover:bg-red-900/20 focus-ring no-print"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete All
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 max-w-5xl mx-auto w-full flex flex-col">
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-8">
          {chat.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <div className="relative mb-8 group">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-2xl group-hover:shadow-glow-lg transition-all duration-500 group-hover:scale-105">
                  <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="currentColor"/>
                    <path d="M19 15L19.31 16.32L21 16.63L19.31 16.94L19 18.25L18.69 16.94L17 16.63L18.69 16.32L19 15Z" fill="currentColor"/>
                    <path d="M5 6L5.31 7.32L7 7.63L5.31 7.94L5 9.25L4.69 7.94L3 7.63L4.69 7.32L5 6Z" fill="currentColor"/>
                  </svg>
                </div>
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 blur-2xl opacity-30 group-hover:opacity-50 animate-pulse-slow"></div>
              </div>
              <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">Hello! I'm OctaAI Pro</h2>
              <p className="text-slate-400 text-lg max-w-md mb-12 leading-relaxed">
                I'm here to help you with questions, creative tasks, analysis, and more. 
                What would you like to explore today?
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
                <div className="group backdrop-blur-xl bg-slate-800/20 border border-slate-700/50 p-6 rounded-2xl hover:bg-slate-700/30 transition-all duration-300 cursor-pointer shadow-xl hover:shadow-2xl hover:scale-105 focus-ring"
                     onClick={() => setMessage("What can you help me with?")}>
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-yellow-500/10 group-hover:bg-yellow-500/20 transition-colors">
                      <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-base mb-1">Get Started</h3>
                      <p className="text-slate-400 text-sm">Learn what I can do for you</p>
                    </div>
                  </div>
                </div>
                <div className="group backdrop-blur-xl bg-slate-800/20 border border-slate-700/50 p-6 rounded-2xl hover:bg-slate-700/30 transition-all duration-300 cursor-pointer shadow-xl hover:shadow-2xl hover:scale-105 focus-ring"
                     onClick={() => setMessage("Help me write a professional email")}>
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                      <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-base mb-1">Write Content</h3>
                      <p className="text-slate-400 text-sm">Create and edit professional text</p>
                    </div>
                  </div>
                </div>
                <div className="group backdrop-blur-xl bg-slate-800/20 border border-slate-700/50 p-6 rounded-2xl hover:bg-slate-700/30 transition-all duration-300 cursor-pointer shadow-xl hover:shadow-2xl hover:scale-105 focus-ring"
                     onClick={() => setMessage("Explain a complex topic simply")}>
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                      <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-base mb-1">Explain Concepts</h3>
                      <p className="text-slate-400 text-sm">Break down complex ideas</p>
                    </div>
                  </div>
                </div>
                <div className="group backdrop-blur-xl bg-slate-800/20 border border-slate-700/50 p-6 rounded-2xl hover:bg-slate-700/30 transition-all duration-300 cursor-pointer shadow-xl hover:shadow-2xl hover:scale-105 focus-ring"
                     onClick={() => setMessage("Help me solve a problem")}>
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
                      <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a1 1 0 01-1-1V9a1 1 0 011-1h1a2 2 0 100-4H4a1 1 0 01-1-1V4a1 1 0 011-1h3a1 1 0 001-1v-1a2 2 0 114 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-base mb-1">Problem Solving</h3>
                      <p className="text-slate-400 text-sm">Find solutions together</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {chat.map((c, i) => (
                <div key={i} className={`animate-fade-in flex ${c.role === 'user' ? 'justify-end' : 'justify-start'}`} style={{animationDelay: `${i * 0.1}s`}}>
                  <div className={`flex gap-4 max-w-4xl ${c.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center shadow-lg ${
                      c.role === 'user' 
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
                        : 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500'
                    }`}>
                      {c.role === 'user' ? (
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="currentColor"/>
                          <path d="M19 15L19.31 16.32L21 16.63L19.31 16.94L19 18.25L18.69 16.94L17 16.63L18.69 16.32L19 15Z" fill="currentColor"/>
                          <path d="M5 6L5.31 7.32L7 7.63L5.31 7.94L5 9.25L4.69 7.94L3 7.63L4.69 7.32L5 6Z" fill="currentColor"/>
                        </svg>
                      )}
                    </div>
                    
                    {/* Message Content */}
                    <div className={`flex flex-col ${c.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className="text-xs text-slate-400 mb-3 font-semibold tracking-wide uppercase">
                        {c.role === 'user' ? 'You' : 'Gemini Pro'}
                      </div>
                      <div className={`rounded-2xl px-6 py-4 max-w-none shadow-xl ${
                        c.role === 'user'
                          ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                          : 'backdrop-blur-xl bg-slate-800/40 border border-slate-700/50 text-slate-100'
                      }`}>
                        <div className="text-sm leading-relaxed">
                          {formatMessage(c)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Loading indicator */}
              {isLoading && (
                <div className="flex justify-start animate-fade-in">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center shadow-lg">
                      <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="currentColor"/>
                        <path d="M19 15L19.31 16.32L21 16.63L19.31 16.94L19 18.25L18.69 16.94L17 16.63L18.69 16.32L19 15Z" fill="currentColor"/>
                        <path d="M5 6L5.31 7.32L7 7.63L5.31 7.94L5 9.25L4.69 7.94L3 7.63L4.69 7.32L5 6Z" fill="currentColor"/>
                      </svg>
                    </div>
                    <div className="flex flex-col">
                      <div className="text-xs text-slate-400 mb-3 font-semibold tracking-wide uppercase">OctaAI Pro</div>
                      <div className="backdrop-blur-xl bg-slate-800/40 border border-slate-700/50 rounded-2xl px-6 py-4 shadow-xl">
                        <div className="flex items-center gap-3">
                          <div className="flex gap-1">
                            <div className="typing-dot"></div>
                            <div className="typing-dot"></div>
                            <div className="typing-dot"></div>
                          </div>
                          <span className="text-sm text-slate-400 font-medium">Thinking...</span>
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
        <div className="border-t border-slate-700/50 p-6 backdrop-blur-xl bg-slate-900/20 no-print">
          <div className="relative max-w-4xl mx-auto">
            <div className="backdrop-blur-xl bg-slate-800/30 border border-slate-700/50 rounded-3xl flex items-end gap-4 p-4 focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:border-blue-500/50 transition-all duration-200 shadow-xl">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Message OctaAI Pro..."
                disabled={isLoading}
                rows="1"
                className="flex-1 bg-transparent border-none outline-none text-white placeholder-slate-400 text-sm resize-none min-h-[32px] max-h-40 "
                style={{ 
                  minHeight: '32px',
                  height: 'auto',
                  overflowY: message.split('\n').length > 4 ? 'scroll' : 'hidden'
                }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
                }}
              />
              <button 
                onClick={sendMessage} 
                className={`p-3 rounded-xl transition-all duration-200 shadow-lg focus-ring ${
                  isLoading || !message.trim()
                    ? 'bg-slate-700 cursor-not-allowed opacity-50' 
                    : 'btn-primary hover:scale-105'
                }`}
                disabled={isLoading || !message.trim()}
              >
                {isLoading ? (
                  <svg className="w-5 h-5 text-white animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/>
                    <path fill="currentColor" className="opacity-75" d="m4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
            <div className="text-xs text-gray-500 text-center mt-3">
              OctaAI may display inaccurate info, including about people, so double-check its responses.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;