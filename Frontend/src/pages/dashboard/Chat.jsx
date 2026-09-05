import { useState, useRef, useEffect } from 'react';
import { useStudy } from '../../context/StudyContext';
import CitationBadge from '../../components/CitationBadge';
import DocumentSelectorDropdown from '../../components/DocumentSelectorDropdown';
import { Send, Bot, User, Trash2, Sparkles, Languages, HelpCircle, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'framer-motion';

const Chat = () => {
    const {
        chatHistory,
        queryRag,
        loading,
        clearChatHistory,
        explanationStyle,
        setExplanationStyle,
        targetLanguage,
        setTargetLanguage
    } = useStudy();

    const [inputQuery, setInputQuery] = useState('');
    const chatEndRef = useRef(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory, loading]);

    const handleSend = async (e) => {
        e?.preventDefault();
        if (!inputQuery.trim() || loading) return;
        const q = inputQuery;
        setInputQuery('');
        await queryRag(q);
    };

    const handleQuickAction = (styleKey) => {
        setExplanationStyle(styleKey);
        if (chatHistory.length > 0) {
            const lastUserMsg = [...chatHistory].reverse().find(m => m.user);
            if (lastUserMsg) {
                queryRag(`Explain the concept '${lastUserMsg.user}' using style: ${styleKey}`, styleKey);
            }
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-10rem)] bg-gray-900 rounded-2xl overflow-hidden border border-gray-800">
            {/* Top Toolbar */}
            <div className="p-4 bg-gray-950 border-b border-gray-800 flex flex-wrap items-center justify-between gap-4 text-xs">
                <DocumentSelectorDropdown label="RAG Search Scope:" />

                {/* Controls */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <Languages size={14} className="text-purple-400" />
                        <select
                            value={targetLanguage}
                            onChange={(e) => setTargetLanguage(e.target.value)}
                            className="bg-gray-900 border border-gray-800 text-gray-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-blue-500 font-semibold"
                        >
                            <option value="English">English</option>
                            <option value="Telugu">Telugu (తెలుగు)</option>
                            <option value="Hindi">Hindi (हिंदी)</option>
                            <option value="Spanish">Spanish</option>
                            <option value="French">French</option>
                        </select>
                    </div>

                    <button
                        onClick={clearChatHistory}
                        className="text-gray-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-gray-800 transition"
                        title="Clear Conversation"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
                {chatHistory.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 text-gray-500 py-12">
                        <div className="p-4 bg-blue-600/10 border border-blue-500/20 rounded-2xl text-blue-400">
                            <Bot size={40} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-200">Grounded RAG AI Assistant</h3>
                            <p className="text-xs text-gray-400 max-w-md mx-auto mt-1">
                                Ask questions directly based on your uploaded study materials. Answers include precise page citations and verified source snippets.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                            <button
                                onClick={() => setInputQuery("Summarize the main principles covered in the uploaded documents.")}
                                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-medium border border-gray-700 transition"
                            >
                                💡 "Summarize core principles..."
                            </button>
                            <button
                                onClick={() => setInputQuery("What are the key formulas and definitions?")}
                                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-medium border border-gray-700 transition"
                            >
                                📐 "List key formulas & definitions..."
                            </button>
                        </div>
                    </div>
                ) : (
                    chatHistory.map((msg, idx) => (
                        <div key={idx} className="space-y-4">
                            {/* User Message */}
                            {msg.user && (
                                <div className="flex items-start justify-end gap-3">
                                    <div className="bg-blue-600 text-white p-4 rounded-2xl rounded-tr-none max-w-2xl shadow-lg text-sm leading-relaxed font-medium">
                                        {msg.user}
                                    </div>
                                    <div className="p-2 bg-blue-600/20 border border-blue-500/40 rounded-xl text-blue-400 shrink-0">
                                        <User size={18} />
                                    </div>
                                </div>
                            )}

                            {/* AI Message */}
                            {msg.ai && (
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-start gap-3"
                                >
                                    <div className="p-2 bg-purple-600/20 border border-purple-500/40 rounded-xl text-purple-400 shrink-0">
                                        <Bot size={18} />
                                    </div>

                                    <div className="bg-gray-950 border border-gray-800 p-5 rounded-2xl rounded-tl-none max-w-3xl space-y-4 shadow-xl">
                                        {/* Markdown text */}
                                        <div className="prose prose-invert prose-sm max-w-none text-gray-200 leading-relaxed font-sans">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {msg.ai}
                                            </ReactMarkdown>
                                        </div>

                                        {/* Grounded Citations Bar */}
                                        {msg.citations && msg.citations.length > 0 && (
                                            <div className="pt-3 border-t border-gray-800 space-y-2">
                                                <div className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                                                    <Sparkles size={12} /> Verified Grounded Citations:
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {msg.citations.map((cit, cIdx) => (
                                                        <CitationBadge key={cIdx} citation={cit} />
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {!msg.grounded && (
                                            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-medium pt-2 border-t border-gray-800">
                                                <AlertCircle size={14} /> Information not explicitly found in document context.
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    ))
                )}

                {loading && (
                    <div className="flex items-center gap-3 text-purple-400 text-xs font-semibold p-4">
                        <Bot size={20} className="animate-bounce" />
                        <span>Searching vectors & generating grounded answer...</span>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            {/* "Explain Differently" Action Bar */}
            <div className="px-4 py-2 bg-gray-950/90 border-t border-gray-800/80 flex items-center gap-2 overflow-x-auto text-xs">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                    <HelpCircle size={13} className="text-blue-400" /> Explain:
                </span>
                <button
                    onClick={() => handleQuickAction('simple')}
                    className="px-2.5 py-1 bg-gray-900 hover:bg-gray-800 text-gray-300 rounded-lg border border-gray-800 hover:border-blue-500/50 transition font-medium shrink-0"
                >
                    💡 Simply
                </button>
                <button
                    onClick={() => handleQuickAction('detailed')}
                    className="px-2.5 py-1 bg-gray-900 hover:bg-gray-800 text-gray-300 rounded-lg border border-gray-800 hover:border-blue-500/50 transition font-medium shrink-0"
                >
                    🔍 In Detail
                </button>
                <button
                    onClick={() => handleQuickAction('exam')}
                    className="px-2.5 py-1 bg-gray-900 hover:bg-gray-800 text-gray-300 rounded-lg border border-gray-800 hover:border-blue-500/50 transition font-medium shrink-0"
                >
                    📝 Exam Answer
                </button>
                <button
                    onClick={() => handleQuickAction('interview')}
                    className="px-2.5 py-1 bg-gray-900 hover:bg-gray-800 text-gray-300 rounded-lg border border-gray-800 hover:border-blue-500/50 transition font-medium shrink-0"
                >
                    💼 Interview
                </button>
                <button
                    onClick={() => handleQuickAction('child')}
                    className="px-2.5 py-1 bg-gray-900 hover:bg-gray-800 text-gray-300 rounded-lg border border-gray-800 hover:border-blue-500/50 transition font-medium shrink-0"
                >
                    🎈 Like I'm 10
                </button>
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSend} className="p-4 bg-gray-950 border-t border-gray-800 flex gap-3">
                <input
                    type="text"
                    placeholder="Ask a question about your study documents..."
                    value={inputQuery}
                    onChange={(e) => setInputQuery(e.target.value)}
                    disabled={loading}
                    className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 font-medium"
                />
                <button
                    type="submit"
                    disabled={loading || !inputQuery.trim()}
                    className="px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-900/40 transition disabled:opacity-50 flex items-center gap-2"
                >
                    <Send size={16} /> Send
                </button>
            </form>
        </div>
    );
};

export default Chat;
