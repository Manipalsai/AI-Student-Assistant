import { useState } from 'react';
import { useStudy } from '../../context/StudyContext';
import axios from 'axios';
import { UploadCloud, CheckCircle, FileText, Loader2, Download, Trash2, Copy, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { jsPDF } from 'jspdf';
import { toast } from 'react-hot-toast';

const Summarize = () => {
    const { text, fileName, uploadFile, loading: extractLoading, error: extractError, clearFile, summary, setSummary } = useStudy();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            await uploadFile(file);
        }
    };

    const generateSummary = async () => {
        if (!text) return;
        setLoading(true);
        setError(null);
        try {
            const res = await axios.post('/api/summarize', { text });
            setSummary(res.data.summary);
            toast.success("Summary generated!");
        } catch (err) {
            setError("Failed to generate summary.");
            toast.error("Generation failed.");
        } finally {
            setLoading(false);
        }
    };

    const downloadPDF = () => {
        if (!summary) return;

        try {
            const doc = new jsPDF();
            const margin = 20;
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const maxLineWidth = pageWidth - margin * 2;

            let cursorY = 20;

            // 1. Professional Header
            doc.setFillColor(30, 64, 175);
            doc.rect(0, 0, pageWidth, 45, 'F');
            doc.setFont("helvetica", "bold");
            doc.setFontSize(24);
            doc.setTextColor(255, 255, 255);
            doc.text("AI STUDY ASSISTANT", margin, 25);
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text(`${fileName || "Study Notes"} | Generated on ${new Date().toLocaleDateString()}`, margin, 35);

            cursorY = 60;

            const renderTextWithBold = (text, x, y, baseFontSize, baseFontStyle = "normal", baseColor = [31, 41, 55]) => {
                const parts = text.split(/(\*\*.*?\*\*)/g);
                let currentX = x;
                doc.setFontSize(baseFontSize);
                doc.setTextColor(baseColor[0], baseColor[1], baseColor[2]);

                parts.forEach(part => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        doc.setFont("helvetica", "bold");
                        const cleanPart = part.slice(2, -2);
                        doc.text(cleanPart, currentX, y);
                        currentX += doc.getTextWidth(cleanPart);
                    } else {
                        doc.setFont("helvetica", baseFontStyle);
                        doc.text(part, currentX, y);
                        currentX += doc.getTextWidth(part);
                    }
                });
            };

            const lines = summary.split('\n');
            lines.forEach((line) => {
                if (!line.trim()) {
                    cursorY += 5;
                    return;
                }

                let fontSize = 11;
                let fontStyle = "normal";
                let color = [31, 41, 55];
                let content = line.trim();

                if (line.startsWith('# ')) {
                    fontSize = 18; fontStyle = "bold"; color = [30, 64, 175];
                    content = content.replace(/^#\s+/, '');
                    cursorY += 5;
                } else if (line.startsWith('## ')) {
                    fontSize = 15; fontStyle = "bold"; color = [30, 64, 175];
                    content = content.replace(/^##\s+/, '');
                    cursorY += 4;
                } else if (line.startsWith('### ')) {
                    fontSize = 13; fontStyle = "bold"; color = [31, 41, 55];
                    content = content.replace(/^###\s+/, '');
                    cursorY += 3;
                } else if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
                    content = "• " + content.replace(/^[*|-]\s+/, '');
                } else if (line.trim().startsWith('•')) {
                    content = "• " + line.trim().substring(1).trim();
                }

                if (cursorY > pageHeight - 20) {
                    doc.addPage();
                    cursorY = 20;
                }

                const wrappedLines = doc.splitTextToSize(content, maxLineWidth);
                wrappedLines.forEach(wLine => {
                    if (cursorY > pageHeight - 20) {
                        doc.addPage();
                        cursorY = 20;
                    }
                    renderTextWithBold(wLine, margin, cursorY, fontSize, fontStyle, color);
                    cursorY += (fontSize * 0.5) + 3;
                });
                cursorY += 2;
            });

            doc.save(`${fileName?.split('.')[0] || 'StudySummary'}.pdf`);
            toast.success("Professional PDF Ready!");
        } catch (err) {
            console.error(err);
            toast.error("PDF Export failed.");
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(summary);
        toast.success("Copied to clipboard!");
    };

    return (
        <div className="p-6 space-y-8 max-w-5xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-700"
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <FileText className="text-blue-400" />
                        Document Summarizer
                    </h2>
                    {text && (
                        <button
                            onClick={clearFile}
                            className="text-gray-400 hover:text-red-400 p-2 transition-colors"
                            title="Clear file"
                        >
                            <Trash2 size={20} />
                        </button>
                    )}
                </div>

                {!text ? (
                    <div className="relative group">
                        <input
                            type="file"
                            id="file-upload"
                            className="hidden"
                            onChange={handleFileChange}
                            accept=".pdf,.docx,.txt,.md"
                        />
                        <label
                            htmlFor="file-upload"
                            className="cursor-pointer flex flex-col items-center justify-center border-2 border-dashed border-gray-600 rounded-2xl p-12 text-center group-hover:border-blue-500 group-hover:bg-blue-500/5 transition-all duration-300"
                        >
                            <div className="bg-gray-900 p-4 rounded-full mb-4 shadow-inner group-hover:scale-110 transition-transform">
                                <UploadCloud size={40} className="text-gray-400 group-hover:text-blue-400" />
                            </div>
                            <span className="text-xl font-semibold text-gray-300">
                                {extractLoading ? "Extracting Text..." : "Drop your document here"}
                            </span>
                            <span className="text-sm text-gray-500 mt-2">Supports PDF, DOCX, TXT, and Markdown</span>
                        </label>
                    </div>
                ) : (
                    <div className="flex flex-col md:flex-row items-center justify-between bg-gray-900/50 p-6 rounded-2xl border border-gray-700 gap-4">
                        <div className="flex items-center gap-4">
                            <div className="bg-green-500/10 p-3 rounded-xl border border-green-500/20">
                                <CheckCircle className="text-green-400" size={24} />
                            </div>
                            <div>
                                <p className="font-bold text-white text-lg truncate max-w-[200px] md:max-w-xs">{fileName}</p>
                                <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold tracking-tighter">Ready to Summarize</p>
                            </div>
                        </div>
                        <button
                            onClick={generateSummary}
                            disabled={loading}
                            className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-8 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <Zap size={20} className="text-yellow-300" />}
                            {loading ? "Processing..." : "Generate Magic Summary"}
                        </button>
                    </div>
                )}

                {extractError && <p className="text-red-400 mt-4 text-sm font-medium">❌ {extractError}</p>}
                {error && <p className="text-red-400 mt-4 text-sm font-medium">❌ {error}</p>}
            </motion.div>

            {summary && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden"
                >
                    <div className="bg-gray-900/80 px-8 py-4 border-b border-gray-700 flex justify-between items-center">
                        <h3 className="font-bold text-gray-300 uppercase tracking-widest text-sm">Generated AI Summary</h3>
                        <div className="flex gap-2">
                            <button onClick={copyToClipboard} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-all" title="Copy to clipboard">
                                <Copy size={18} />
                            </button>
                            <button onClick={downloadPDF} className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all flex items-center gap-2 px-3 text-xs font-bold shadow-lg shadow-blue-900/40">
                                <Download size={16} />
                                DOWNLOAD
                            </button>
                        </div>
                    </div>

                    <div className="p-10 prose prose-invert max-w-none prose-headings:text-blue-400 prose-headings:font-black prose-p:text-gray-300 prose-li:text-gray-300 prose-strong:text-white">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                h1: ({ node, ...props }) => <h1 className="text-3xl font-bold mb-6 mt-2 pb-2 border-b border-gray-700" {...props} />,
                                h2: ({ node, ...props }) => <h2 className="text-2xl font-bold mb-4 mt-8 flex items-center gap-2 text-blue-400" {...props} />,
                                h3: ({ node, ...props }) => <h3 className="text-xl font-bold mb-3 mt-6" {...props} />,
                                ul: ({ node, ...props }) => <ul className="list-disc list-outside ml-6 space-y-2 mb-4" {...props} />,
                                li: ({ node, ...props }) => <li className="text-gray-300 leading-relaxed pl-2" {...props} />,
                                p: ({ node, ...props }) => <p className="mb-4 leading-relaxed text-gray-300" {...props} />,
                                strong: ({ node, ...props }) => <b className="text-white font-bold" {...props} />,
                            }}
                        >
                            {summary}
                        </ReactMarkdown>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default Summarize;
