import { useStudy } from '../../context/StudyContext';
import DocumentSelectorDropdown from '../../components/DocumentSelectorDropdown';
import { BookOpen, Download, RefreshCw, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';

const Summarize = () => {
    const { summary, generateSummary, loading, documents, selectedDocumentIds } = useStudy();

    const handleGenerate = () => {
        generateSummary();
    };

    const exportToPDF = () => {
        if (!summary) return;
        try {
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // Clean string to strictly printable ASCII (32-126) so jsPDF never renders garbled characters
            const cleanForPDF = (str) => {
                if (!str) return '';
                return str
                    .replace(/[“”]/g, '"')
                    .replace(/[‘’]/g, "'")
                    .replace(/[—–]/g, '-')
                    .replace(/[•·]/g, '-')
                    .replace(/[^\x20-\x7E]/g, ' ') // Strip emojis and non-ASCII chars
                    .replace(/\s+/g, ' ')
                    .trim();
            };

            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 16;
            const maxLineWidth = pageWidth - (margin * 2);

            // Build filename keeping original document name + _summarized.pdf
            const selectedDoc = documents.find(d => selectedDocumentIds.includes(d.id));
            let exportFilename = 'Study_Summary_summarized.pdf';
            if (selectedDoc && selectedDoc.filename) {
                const baseName = selectedDoc.filename.replace(/\.[^/.]+$/, '');
                exportFilename = `${baseName}_summarized.pdf`;
            }

            // Title Banner
            doc.setFillColor(15, 23, 42);
            doc.rect(0, 0, pageWidth, 28, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.text('AI Student Assistant - Master Study Summary', margin, 13);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(148, 163, 184);
            const docNames = documents.filter(d => selectedDocumentIds.includes(d.id)).map(d => d.filename).join(', ') || 'Selected Documents';
            doc.text(`Source: ${cleanForPDF(docNames)} | Date: ${new Date().toLocaleDateString()}`, margin, 22);

            let cursorY = 36;

            const rawLines = summary.split('\n');

            rawLines.forEach((line) => {
                const trimmed = line.trim();
                if (!trimmed) {
                    cursorY += 3;
                    return;
                }

                // Detect markdown headers: ## or ### lines
                const isH2 = /^##\s/.test(trimmed);
                const isH3 = /^###\s/.test(trimmed);

                if (isH2 || isH3) {
                    if (cursorY > pageHeight - 30) {
                        doc.addPage();
                        cursorY = 20;
                    }

                    cursorY += 5;
                    doc.setFillColor(235, 240, 255);
                    doc.rect(margin, cursorY - 5, maxLineWidth, 9, 'F');

                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(isH2 ? 11 : 10);
                    doc.setTextColor(30, 58, 138);

                    const headerText = cleanForPDF(trimmed.replace(/^#+\s*/, '').replace(/[\*\_\`]/g, ''));
                    doc.text(headerText, margin + 3, cursorY);
                    cursorY += 10;
                } else {
                    if (cursorY > pageHeight - 20) {
                        doc.addPage();
                        cursorY = 20;
                    }

                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(9.5);
                    doc.setTextColor(51, 65, 85);

                    const cleanLine = cleanForPDF(trimmed.replace(/[\*\_\`]/g, '').replace(/^\*\s+/, '- ').replace(/^[-•]\s+/, '- '));
                    if (!cleanLine) return;

                    const wrappedLines = doc.splitTextToSize(cleanLine, maxLineWidth);
                    wrappedLines.forEach((wLine) => {
                        if (cursorY > pageHeight - 15) {
                            doc.addPage();
                            cursorY = 20;
                        }
                        doc.text(wLine, margin, cursorY);
                        cursorY += 5.5;
                    });
                }
            });

            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(148, 163, 184);
                doc.text(`Page ${i} of ${pageCount} - Generated by AI Student Assistant RAG Engine`, pageWidth / 2, pageHeight - 8, { align: 'center' });
            }

            doc.save(exportFilename);
            toast.success(`PDF exported: ${exportFilename}`);
        } catch (err) {
            console.error('PDF Export error:', err);
            toast.error('Failed to generate PDF download.');
        }
    };

    return (
        <div className="p-8 space-y-8">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-900/60 p-6 rounded-2xl border border-gray-800 backdrop-blur">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-600/20 border border-blue-500/40 rounded-xl text-blue-400">
                        <BookOpen size={28} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Hierarchical Study Summarizer</h2>
                        <p className="text-xs text-gray-400">
                            Synthesizes multi-page documents into structured overview, key formulas, and exam takeaways.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <DocumentSelectorDropdown label="Scope:" />

                    {summary && (
                        <button
                            onClick={exportToPDF}
                            className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold text-xs border border-gray-700 transition flex items-center gap-2"
                        >
                            <Download size={16} /> Export Structured PDF
                        </button>
                    )}

                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-950/40 transition disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
                        {loading ? 'Summarizing...' : 'Generate Master Summary'}
                    </button>
                </div>
            </div>

            {/* Summary Content Display */}
            {!summary ? (
                <div className="text-center py-20 bg-gray-900/40 rounded-2xl border border-gray-800 space-y-4">
                    <BookOpen size={48} className="mx-auto text-gray-600" />
                    <div>
                        <h3 className="text-lg font-bold text-white">No Summary Generated Yet</h3>
                        <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
                            Click 'Generate Master Summary' to run document summarization.
                        </p>
                    </div>
                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow transition"
                    >
                        Generate Summary
                    </button>
                </div>
            ) : (
                <div className="p-8 bg-gray-900 border border-gray-800 rounded-2xl space-y-6 shadow-2xl">
                    <div className="prose prose-invert max-w-none text-gray-200 leading-relaxed font-sans space-y-4">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                h2: ({ node, ...props }) => (
                                    <h2 className="text-base font-extrabold text-blue-400 border-b border-gray-800/80 pb-2.5 mt-6 mb-3.5 flex items-center gap-2 tracking-wide" {...props} />
                                ),
                                h3: ({ node, ...props }) => (
                                    <h3 className="text-sm font-bold text-indigo-300 mt-4 mb-2" {...props} />
                                ),
                                p: ({ node, ...props }) => (
                                    <p className="text-sm text-gray-300 leading-relaxed mb-3 font-normal" {...props} />
                                ),
                                ul: ({ node, ...props }) => (
                                    <ul className="space-y-2.5 my-3 pl-5 list-disc text-gray-300 text-sm" {...props} />
                                ),
                                li: ({ node, ...props }) => (
                                    <li className="text-sm leading-relaxed text-gray-300 font-normal pl-1" {...props} />
                                ),
                                strong: ({ node, ...props }) => (
                                    <strong className="text-white font-bold bg-gray-950/80 px-1.5 py-0.5 rounded border border-gray-800 text-xs" {...props} />
                                ),
                                code: ({ node, ...props }) => (
                                    <code className="bg-gray-950 text-blue-300 px-1.5 py-0.5 rounded font-mono text-xs border border-gray-800" {...props} />
                                )
                            }}
                        >
                            {summary}
                        </ReactMarkdown>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Summarize;
