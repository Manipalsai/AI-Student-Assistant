import { useState } from 'react';
import { FileText, ExternalLink, X, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CitationBadge = ({ citation }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-200 transition-all cursor-pointer shadow-sm hover:shadow-indigo-500/20"
                title="View verified document source context"
            >
                <FileText size={13} className="text-indigo-400" />
                <span className="font-semibold max-w-[120px] truncate">{citation.document_name}</span>
                <span className="bg-indigo-800/80 text-indigo-100 px-1.5 py-0.5 rounded text-[10px] font-bold">
                    P. {citation.page_number}
                </span>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-gray-900 border border-indigo-800/80 rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-4"
                        >
                            <div className="flex justify-between items-start border-b border-gray-800 pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-indigo-900/50 border border-indigo-700 rounded-xl text-indigo-400">
                                        <BookOpen size={22} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-white">{citation.document_name}</h3>
                                        <p className="text-xs text-indigo-400 font-medium">
                                            Page {citation.page_number} &bull; Section: {citation.section || 'General Content'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-xs font-semibold text-gray-400">
                                    <span>Verified Extracted Source Snippet</span>
                                    {citation.score && (
                                        <span className="bg-emerald-950 border border-emerald-700 text-emerald-300 px-2 py-0.5 rounded-full font-mono text-[11px]">
                                            Match Score: {(citation.score * 100).toFixed(0)}%
                                        </span>
                                    )}
                                </div>
                                <div className="p-4 bg-gray-950 border border-gray-800 rounded-xl text-sm text-gray-200 leading-relaxed font-sans max-h-60 overflow-y-auto whitespace-pre-wrap">
                                    "{citation.snippet}"
                                </div>
                            </div>

                            <div className="pt-2 flex justify-end">
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-xs transition"
                                >
                                    Close Source Preview
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};

export default CitationBadge;
