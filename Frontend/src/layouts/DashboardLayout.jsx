import { Outlet, useLocation, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useStudy } from '../context/StudyContext';
import { motion } from 'framer-motion';
import { FileText, CheckCircle } from 'lucide-react';

const DashboardLayout = () => {
    const location = useLocation();
    const { documents, selectedDocumentIds } = useStudy();

    const getPageDetails = () => {
        switch (location.pathname) {
            case '/app/documents':
                return { title: "Document Library", subtitle: "Upload, index, and manage multi-document knowledge bases." };
            case '/app/chat':
                return { title: "AI Document Tutor (RAG)", subtitle: "Conversational RAG agent with grounded sources and page citations." };
            case '/app/summary':
                return { title: "Summarizer", subtitle: "Extract structured executive summaries and key concepts." };
            case '/app/quiz':
                return { title: "Adaptive Quizzes", subtitle: "Targeted practice questions tuned to difficulty and weak topics." };
            case '/app/flashcards':
                return { title: "Study Flashcards", subtitle: "Master key definitions with active recall." };
            case '/app/study-plan':
                return { title: "AI Study Roadmap", subtitle: "Generated daily schedule tailored to your exam date and syllabus." };
            case '/app/analytics':
                return { title: "Learning Analytics", subtitle: "Mastery breakdown, weak topic detection, and quantitative RAG metrics." };
            default:
                return { title: "Dashboard", subtitle: "AI-Powered RAG Student Assistant." };
        }
    };

    const { title, subtitle } = getPageDetails();

    return (
        <div className="flex h-screen bg-gray-950 font-sans text-gray-100 overflow-hidden">
            <Sidebar />

            <main className="flex-1 ml-64 p-8 overflow-y-auto overflow-x-hidden">
                <motion.div
                    key={location.pathname}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="space-y-1">
                            <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
                                {title}
                            </h1>
                            <p className="text-xs text-gray-400 font-medium">{subtitle}</p>
                        </div>

                        <div className="flex items-center gap-3">
                            <Link
                                to="/app/documents"
                                className="flex items-center gap-2 bg-gray-900 border border-gray-800 hover:border-gray-700 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-gray-300 transition"
                            >
                                <FileText size={14} className="text-blue-400" />
                                <span>RAG Scope:</span>
                                <span className="text-blue-400 font-bold">{selectedDocumentIds.length} / {documents.length} Docs</span>
                            </Link>

                            <div className="bg-emerald-950/60 border border-emerald-800 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                                <CheckCircle size={14} /> Grounded Mode
                            </div>
                        </div>
                    </header>

                    <div className="bg-gray-900/90 border border-gray-800/80 rounded-2xl shadow-2xl min-h-[calc(100vh-10rem)]">
                        <Outlet />
                    </div>
                </motion.div>
            </main>
        </div>
    );
};

export default DashboardLayout;
