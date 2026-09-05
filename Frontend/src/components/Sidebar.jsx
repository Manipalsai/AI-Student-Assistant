import { Link, useLocation } from 'react-router-dom';
import { BookOpen, BrainCircuit, MessageSquare, Layers, Library, BarChart3, Calendar, ShieldCheck } from 'lucide-react';

const Sidebar = () => {
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    const links = [
        { name: 'Document Library', path: '/app/documents', icon: <Library size={18} /> },
        { name: 'AI RAG Tutor Chat', path: '/app/chat', icon: <MessageSquare size={18} /> },
        { name: 'Summarizer', path: '/app/summary', icon: <BookOpen size={18} /> },
        { name: 'Adaptive Quizzes', path: '/app/quiz', icon: <BrainCircuit size={18} /> },
        { name: 'Flashcards', path: '/app/flashcards', icon: <Layers size={18} /> },
        { name: 'AI Study Plan', path: '/app/study-plan', icon: <Calendar size={18} /> },
        { name: 'Analytics & Mastery', path: '/app/analytics', icon: <BarChart3 size={18} /> },
    ];

    return (
        <div className="w-64 h-screen bg-gray-900 text-white flex flex-col fixed left-0 top-0 border-r border-gray-800 z-30">
            <div className="p-5 border-b border-gray-800 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2.5 font-bold text-lg text-blue-400 hover:opacity-90 transition">
                    <div className="p-2 bg-blue-600/20 border border-blue-500/40 rounded-xl text-blue-400">
                        <BrainCircuit size={22} />
                    </div>
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
                        AI Study Mate
                    </span>
                </Link>
            </div>

            <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
                {links.map((link) => (
                    <Link
                        key={link.path}
                        to={link.path}
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${isActive(link.path)
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/40 font-bold'
                            : 'text-gray-400 hover:bg-gray-800/80 hover:text-white'
                            }`}
                    >
                        {link.icon}
                        <span>{link.name}</span>
                    </Link>
                ))}
            </nav>

            <div className="p-4 border-t border-gray-800 space-y-2">
                <div className="flex items-center gap-2 text-[11px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-3 py-1.5 rounded-xl font-medium">
                    <ShieldCheck size={14} /> Grounded RAG v2.0
                </div>
                <div className="text-center text-[10px] text-gray-500 font-mono">
                    Production AI Platform
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
