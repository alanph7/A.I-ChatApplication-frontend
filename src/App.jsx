import { useState, useRef, useEffect } from "react";
import axios from "axios";

function App() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState(null);
  const [messageReactions, setMessageReactions] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  
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
    
    // Check if this is an image request
    const imageKeywords = ["image of", "show me", "generate image", "picture of"];
    const isImageRequest = imageKeywords.some(keyword => userMessage.toLowerCase().includes(keyword));
    
    if (isImageRequest) {
      setIsGeneratingImage(true);
    } else {
      setIsLoading(true);
    }

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
        // Typing effect for AI text
        const fullText = res.data.text || '';
        let targetIndex = -1;
        setChat((prev) => {
          targetIndex = prev.length;
          return [...prev, { role: "ai", text: "", type: "text" }];
        });
        typeOutText(fullText, (partial) => {
          setChat((prev) => {
            const next = [...prev];
            if (next[targetIndex]) {
              next[targetIndex] = { ...next[targetIndex], text: partial };
            }
            return next;
          });
        });
      }
    } catch (error) {
      console.error("❌ Error sending message:", error);
      setChat((prev) => [
        ...prev,
        { role: "ai", text: "❌ Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
      setIsGeneratingImage(false);
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

  // Upload a file to backend, preview image and show AI analysis
  const uploadFile = async (file) => {
    if (!file || isUploading) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await axios.post("http://localhost:5000/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      const { url, analysis, mimetype } = res.data || {};

      setChat((prev) => [...prev, { role: "user", text: `Uploaded: ${file.name}` }]);

      if (mimetype?.startsWith("image/") && url) {
        setChat((prev) => [
          ...prev,
          { role: "ai", text: "", image: url, type: "image" },
        ]);
      }

      // Typing effect for analysis text
      const fullText = analysis || "I uploaded the file. No analysis returned.";
      let targetIndex = -1;
      setChat((prev) => {
        targetIndex = prev.length;
        return [...prev, { role: "ai", text: "", type: "text" }];
      });
      typeOutText(fullText, (partial) => {
        setChat((prev) => {
          const next = [...prev];
          if (next[targetIndex]) {
            next[targetIndex] = { ...next[targetIndex], text: partial };
          }
          return next;
        });
      });
    } catch (error) {
      console.error("❌ Upload error:", error);
      setChat((prev) => [
        ...prev,
        { role: "ai", text: "❌ Failed to upload/analyze file. Please try again." },
      ]);
    } finally {
      setIsUploading(false);
    }
  };

  // Incrementally update a message's text to create a typing effect
  const typeOutText = (text, onUpdate, baseDelay = 15) => {
    if (!text) {
      onUpdate("");
      return;
    }
    let index = 0;
    const length = text.length;
    const step = Math.max(1, Math.min(3, Math.floor(length / 800))); // faster for very long texts

    const tick = () => {
      index = Math.min(length, index + step);
      onUpdate(text.slice(0, index));
      if (index < length) {
        setTimeout(tick, baseDelay);
      }
    };
    tick();
  };

  

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Handle emoji reactions
  const addReaction = (messageIndex, emoji) => {
    setMessageReactions(prev => ({
      ...prev,
      [messageIndex]: {
        ...prev[messageIndex],
        [emoji]: (prev[messageIndex]?.[emoji] || 0) + 1
      }
    }));
  };

  // Format text with proper paragraph breaks
  const formatParagraphs = (text) => {
    if (!text) return '';
    
    // Split by double line breaks for paragraphs
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
    
    if (paragraphs.length <= 1) {
      // If no paragraph breaks, split by single line breaks
      return text.split('\n').map((line, index) => (
        <span key={index}>
          {line}
          {index < text.split('\n').length - 1 && <br />}
        </span>
      ));
    }
    
    return paragraphs.map((paragraph, index) => (
      <p key={index} className={index > 0 ? "mt-4" : ""}>
        {paragraph.split('\n').map((line, lineIndex) => (
          <span key={lineIndex}>
            {line}
            {lineIndex < paragraph.split('\n').length - 1 && <br />}
          </span>
        ))}
      </p>
    ));
  };

  // Format message text with markdown-like styling and handle images
  const formatMessage = (messageData) => {
    // If it's an image message, display the image
    if (messageData.type === 'image' && messageData.image) {
      return (
        <div className="flex flex-col gap-3">
          <div className="rounded-xl overflow-hidden border border-slate-600/50 shadow-lg max-w-md cursor-pointer hover:opacity-90 transition-opacity">
            <img 
              src={messageData.image} 
              alt="Generated image" 
              className="w-full h-auto object-cover"
              loading="lazy"
              onClick={() => setFullScreenImage(messageData.image)}
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
            <div className="leading-relaxed word-wrap break-words">
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

        // Paragraph and line-break formatting
        const withParagraphs = formattedContent
          .trim()
          .split(/\n\s*\n/) // paragraphs
          .map(p => p.replace(/\n/g, '<br />'))
          .join('</p><p>');
        const html = `<p>${withParagraphs}</p>`;
        
        return (
          <div key={index} className="leading-relaxed word-wrap break-words hyphens-auto">
            <div dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        );
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col font-sans antialiased">
      {/* Full Screen Image Modal */}
      {fullScreenImage && (
        <div 
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setFullScreenImage(null)}
        >
          <div className="relative max-w-full max-h-full">
            <img 
              src={fullScreenImage} 
              alt="Full screen view" 
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <button 
              onClick={() => setFullScreenImage(null)}
              className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

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
                <h1 className="text-xl font-bold text-white tracking-tight">OptaAI Pro</h1>
                <p className="text-sm text-slate-400 font-medium">Advanced AI Assistant</p>
              </div>
            </div>
            
            {/* Control Buttons */}
            <div className="flex items-center gap-3">
              <button 
                onClick={loadHistory} 
                className="bg-white/5 backdrop-blur-[10px] border border-white/10 px-4 py-2.5 rounded-xl text-sm font-medium text-white/90 flex items-center gap-2 transition-all duration-200 hover:bg-white/10 hover:border-white/20 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed print:hidden"
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
                className="bg-white/5 backdrop-blur-[10px] border border-white/10 px-4 py-2.5 rounded-xl text-sm font-medium text-white/90 flex items-center gap-2 transition-all duration-200 hover:bg-white/10 hover:border-white/20 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-transparent print:hidden"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear
              </button>
              <button 
                onClick={clearHistory} 
                className="bg-white/5 backdrop-blur-[10px] border border-red-500/30 px-4 py-2.5 rounded-xl text-sm font-medium text-red-400/90 flex items-center gap-2 transition-all duration-200 hover:bg-red-900/20 hover:border-white/20 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-transparent print:hidden"
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
              <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">Hello! I'm OptaAI Pro</h2>
              <p className="text-slate-400 text-lg max-w-md mb-12 leading-relaxed">
                I'm here to help you with questions, creative tasks, analysis, and more. 
                What would you like to explore today?
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
                <div className="group backdrop-blur-xl bg-slate-800/20 border border-slate-700/50 p-6 rounded-2xl hover:bg-slate-700/30 transition-all duration-300 cursor-pointer shadow-xl hover:shadow-2xl hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-transparent"
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
                <div className="group backdrop-blur-xl bg-slate-800/20 border border-slate-700/50 p-6 rounded-2xl hover:bg-slate-700/30 transition-all duration-300 cursor-pointer shadow-xl hover:shadow-2xl hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-transparent"
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
                <div className="group backdrop-blur-xl bg-slate-800/20 border border-slate-700/50 p-6 rounded-2xl hover:bg-slate-700/30 transition-all duration-300 cursor-pointer shadow-xl hover:shadow-2xl hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-transparent"
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
                <div className="group backdrop-blur-xl bg-slate-800/20 border border-slate-700/50 p-6 rounded-2xl hover:bg-slate-700/30 transition-all duration-300 cursor-pointer shadow-xl hover:shadow-2xl hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-transparent"
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
                        {c.role === 'user' ? 'You' : 'Opta Pro'}
                      </div>
                      <div className="group relative">
                        <div className={`rounded-2xl px-6 py-4 max-w-none shadow-xl ${
                          c.role === 'user'
                            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                            : 'backdrop-blur-xl bg-slate-800/40 border border-slate-700/50 text-slate-100'
                        }`}>
                          <div className="text-sm leading-relaxed prose prose-sm max-w-none prose-invert">
                            {formatMessage(c)}
                          </div>
                        </div>
                        
                        {/* Reaction buttons for AI messages */}
                        {c.role === 'ai' && (
                          <div className="absolute -bottom-2 left-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <div className="flex gap-1 bg-slate-800/80 backdrop-blur-sm rounded-full px-2 py-1 border border-slate-600/50">
                              {['👍', '👎', '❤️', '😂', '😮', '😢'].map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => addReaction(i, emoji)}
                                  className="hover:scale-110 transition-transform duration-150 p-1 rounded-full hover:bg-slate-700/50"
                                  title={`React with ${emoji}`}
                                >
                                  <span className="text-sm">{emoji}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Display reactions */}
                        {messageReactions[i] && Object.keys(messageReactions[i]).length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {Object.entries(messageReactions[i]).map(([emoji, count]) => (
                              <div
                                key={emoji}
                                className="flex items-center gap-1 bg-slate-700/50 rounded-full px-2 py-1 text-xs"
                              >
                                <span>{emoji}</span>
                                <span className="text-slate-300">{count}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Image generation loading indicator */}
              {isGeneratingImage && (
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
                      <div className="text-xs text-slate-400 mb-3 font-semibold tracking-wide uppercase">OptaAI Pro</div>
                      <div className="backdrop-blur-xl bg-slate-800/40 border border-slate-700/50 rounded-2xl px-6 py-4 shadow-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 animate-pulse flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <span className="text-sm text-slate-200 font-medium">Generating image...</span>
                            <div className="text-xs text-slate-400 mt-1">This may take a moment</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Regular text loading indicator */}
              {isLoading && !isGeneratingImage && (
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
                      <div className="text-xs text-slate-400 mb-3 font-semibold tracking-wide uppercase">OptaAI Pro</div>
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
        <div className="border-t border-slate-700/50 p-6 backdrop-blur-xl bg-slate-900/20 print:hidden">
          <div className="relative max-w-4xl mx-auto">
            <div className="backdrop-blur-xl bg-slate-800/30 border border-slate-700/50 rounded-3xl flex items-end gap-4 p-4 focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:border-blue-500/50 transition-all duration-200 shadow-xl">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Message Opta Pro..."
                disabled={isLoading || isGeneratingImage}
                rows="1"
                className="flex-1 bg-transparent border-none outline-none text-white placeholder-slate-400 text-sm resize-none min-h-[32px] max-h-40"
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
              <input
                id="file-input"
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadFile(file);
                  e.target.value = ""; // allow re-selecting same file
                }}
              />
              <label
                htmlFor="file-input"
                className={`p-3 rounded-xl transition-all duration-200 shadow-lg border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 hover:-translate-y-0.5 ${isUploading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                title={isUploading ? 'Uploading...' : 'Upload a file'}
              >
                {isUploading ? (
                  <svg className="w-5 h-5 text-white animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/>
                    <path fill="currentColor" className="opacity-75" d="m4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M8 12l4-4m0 0l4 4m-4-4v12" />
                  </svg>
                )}
              </label>
              
              <button 
                onClick={sendMessage} 
                className={`p-3 rounded-xl transition-all duration-200 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-transparent ${
                  isLoading || isGeneratingImage || !message.trim()
                    ? 'bg-slate-700 cursor-not-allowed opacity-50' 
                    : 'bg-gradient-to-br from-blue-500 to-purple-600 shadow-[0_4px_14px_0_rgba(59,130,246,0.25)] border border-white/10 hover:bg-gradient-to-br hover:from-blue-600 hover:to-purple-700 hover:shadow-[0_6px_20px_0_rgba(59,130,246,0.4)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_2px_8px_0_rgba(59,130,246,0.3)]'
                }`}
                disabled={isLoading || isGeneratingImage || !message.trim()}
              >
                {isLoading || isGeneratingImage ? (
                  <svg className="w-5 h-5 text-white animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/>
                    <path fill="currentColor" className="opacity-75" d="m4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10l18-7-7 18-3-7-8-4z" />
                  </svg>
                )}
              </button>
            </div>
            <div className="text-xs text-gray-500 text-center mt-3">
              OptaAI may display inaccurate info, including about people, so double-check its responses.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;