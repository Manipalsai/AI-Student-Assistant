import { useState } from 'react';
import { useStudy } from '../../context/StudyContext';
import { FileText, Upload, Trash2, CheckCircle2, Search, Library, FileCode, CheckSquare, Square, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DocumentLibrary = () => {
    const {
        documents,
        selectedDocumentIds,
        uploadDocument,
        deleteDocument,
        toggleDocumentSelection,
        selectAllDocuments,
        uploading
    } = useStudy();

    const [searchQuery, setSearchQuery] = useState('');
    const [dragActive, setDragActive] = useState(false);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            uploadDocument(e.target.files[0]);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            uploadDocument(e.dataTransfer.files[0]);
        }
    };

    const filteredDocs = documents.filter(doc =>
        doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-8 space-y-8">
            {/* Header controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-900/60 p-6 rounded-2xl border border-gray-800 backdrop-blur">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-600/20 border border-blue-500/40 rounded-xl text-blue-400">
                        <Library size={28} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Document Library & Knowledge Base</h2>
                        <p className="text-xs text-gray-400">
                            Upload, select, and manage multiple study documents for grounded RAG answers.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={selectAllDocuments}
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition"
                    >
                        <CheckSquare size={16} /> Select All ({documents.length})
                    </button>
                </div>
            </div>

            {/* Upload Area */}
            <div
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                    dragActive
                        ? 'border-blue-500 bg-blue-950/20 scale-[1.01]'
                        : 'border-gray-800 hover:border-gray-700 bg-gray-900/40'
                }`}
            >
                <div className="max-w-md mx-auto space-y-4">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-600/10 border border-blue-500/30 text-blue-400 flex items-center justify-center">
                        {uploading ? (
                            <RefreshCw size={28} className="animate-spin text-blue-400" />
                        ) : (
                            <Upload size={28} />
                        )}
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">
                            {uploading ? 'Processing & Indexing Document...' : 'Upload Study Material'}
                        </h3>
                        <p className="text-xs text-gray-400 mt-1">
                            Supports PDF, DOCX, TXT, and Markdown files up to 25MB.
                        </p>
                    </div>
                    <label className="inline-block px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-medium text-xs shadow-lg shadow-blue-900/40 transition cursor-pointer">
                        {uploading ? 'Parsing Pages & Embedding...' : 'Browse Files'}
                        <input
                            type="file"
                            accept=".pdf,.docx,.txt,.md"
                            className="hidden"
                            onChange={handleFileChange}
                            disabled={uploading}
                        />
                    </label>
                </div>
            </div>

            {/* Document Search & Filter bar */}
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="relative flex-1">
                    <Search size={18} className="absolute left-4 top-3.5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search uploaded documents by title..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-900/80 px-4 py-2 rounded-xl border border-gray-800">
                    <span className="font-semibold text-blue-400">{selectedDocumentIds.length}</span> of <span className="font-semibold text-white">{documents.length}</span> documents selected for active RAG queries
                </div>
            </div>

            {/* Document Grid */}
            {filteredDocs.length === 0 ? (
                <div className="text-center py-16 bg-gray-900/40 rounded-2xl border border-gray-800 space-y-3">
                    <FileCode size={40} className="mx-auto text-gray-600" />
                    <h3 className="text-base font-semibold text-gray-300">No documents found in knowledge base</h3>
                    <p className="text-xs text-gray-500 max-w-sm mx-auto">
                        Upload your lecture notes, textbook PDFs, or study guides to begin generating summaries, RAG answers, and quizzes.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence>
                        {filteredDocs.map((doc) => {
                            const isSelected = selectedDocumentIds.includes(doc.id);
                            return (
                                <motion.div
                                    key={doc.id}
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className={`relative p-5 rounded-2xl border transition-all ${
                                        isSelected
                                            ? 'bg-gray-900 border-blue-500/60 shadow-xl shadow-blue-950/30'
                                            : 'bg-gray-900/50 border-gray-800 hover:border-gray-700 opacity-75'
                                    }`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <button
                                            onClick={() => toggleDocumentSelection(doc.id)}
                                            className="flex items-center gap-3 text-left group"
                                        >
                                            <div className={`p-2.5 rounded-xl border transition ${
                                                isSelected
                                                    ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                                                    : 'bg-gray-800 border-gray-700 text-gray-400 group-hover:text-white'
                                            }`}>
                                                {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm text-white line-clamp-1 group-hover:text-blue-400 transition">
                                                    {doc.filename}
                                                </h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800">
                                                        {doc.file_type}
                                                    </span>
                                                    <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                                                        <CheckCircle2 size={12} /> {doc.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => deleteDocument(doc.id)}
                                            className="text-gray-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-950/40 border border-transparent hover:border-red-900 transition"
                                            title="Delete Document"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    <div className="pt-3 border-t border-gray-800 flex justify-between text-xs text-gray-400 font-medium">
                                        <span>📄 {doc.pages_count} Pages</span>
                                        <span>🧩 {doc.chunks_count} Vectors</span>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};

export default DocumentLibrary;
