import { useState, useRef, useEffect } from 'react';
import { useStudy } from '../../context/StudyContext';
import axios from 'axios';
import { Send, User, Bot, Loader2, UploadCloud } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Chat = () => {
    const { text, fileName, chatHistory: messages, setChatHistory: setMessages } = useStudy();
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || !text) return;

        const userMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            // Send history + current query + text context
            // Backend expects history as specific format
            // Limit history sent?
            const historyPayload = messages.map(m => ({
                role: m.role,
                content: m.content
            })); // simplified

            const res = await axios.post('/api/chat', {
                text: text,
                query: userMessage.content,
                history: historyPayload
            });

            const botMessage = { role: 'ai', content: res.data.answer };
            setMessages(prev => [...prev, botMessage]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'ai', content: "Sorry, I encountered an error." }]);
        } finally {
            setLoading(false);
        }
    };

    if (!text) {
        return (
            <div className="flex flex-col items-center justify-start pt-64 text-center p-8">
                <UploadCloud size={64} className="text-gray-600 mb-4" />
                <h3 className="text-xl font-bold text-gray-300">No Document Loaded</h3>
                <p className="text-gray-500 mt-2">Please upload a document in the Summary or Quiz tab first.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-14rem)] bg-gray-900 rounded-2xl border border-gray-800 shadow-xl overflow-hidden">
            <div className="bg-gray-800 px-6 py-4 border-b border-gray-700 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Bot className="text-blue-500" />
                        Chat with {fileName}
                    </h2>
                    <p className="text-xs text-green-400">● Online</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                {messages.length === 0 && (
                    <div className="text-center text-gray-500 mt-10">
                        <p>Ask anything about the document!</p>
                    </div>
                )}

                <AnimatePresence>
                    {messages.map((msg, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`
                                max-w-[80%] rounded-2xl px-5 py-3 shadow-sm
                                ${msg.role === 'user'
                                    ? 'bg-blue-600 text-white rounded-tr-none'
                                    : 'bg-gray-700 text-gray-100 rounded-tl-none border border-gray-600'}
                            `}>
                                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                                    {msg.content}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-gray-700 rounded-2xl rounded-tl-none px-5 py-3 border border-gray-600 flex items-center gap-2">
                            <Loader2 size={16} className="animate-spin text-gray-400" />
                            <span className="text-sm text-gray-400">Thinking...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-gray-800 border-t border-gray-700">
                <div className="relative flex items-center">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Type your question..."
                        disabled={loading}
                        className="w-full bg-gray-900 text-white pl-4 pr-12 py-3 rounded-xl border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500 transition-all"
                    />
                    <button
                        onClick={handleSend}
                        disabled={loading || !input.trim()}
                        className="absolute right-2 p-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Chat;
