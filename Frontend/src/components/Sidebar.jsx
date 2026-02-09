import { Link, useLocation } from 'react-router-dom';
import { Home, BookOpen, BrainCircuit, MessageSquare, Layers } from 'lucide-react';

const Sidebar = () => {
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    const links = [
        { name: 'Summary', path: '/app/summary', icon: <BookOpen size={20} /> },
        { name: 'Quiz', path: '/app/quiz', icon: <BrainCircuit size={20} /> },
        { name: 'Flashcards', path: '/app/flashcards', icon: <Layers size={20} /> },
        { name: 'Chat with PDF', path: '/app/chat', icon: <MessageSquare size={20} /> },
    ];

    return (
        <div className="w-64 h-screen bg-gray-900 text-white flex flex-col fixed left-0 top-0 border-r border-gray-800">
            <div className="p-6 border-b border-gray-800">
                <Link to="/" className="flex items-center gap-2 font-bold text-xl text-blue-400">
                    <BrainCircuit size={28} />
                    <span>AI Study Mate</span>
                </Link>
            </div>

            <nav className="flex-1 p-4 space-y-2">
                {links.map((link) => (
                    <Link
                        key={link.path}
                        to={link.path}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive(link.path)
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                            }`}
                    >
                        {link.icon}
                        <span className="font-medium">{link.name}</span>
                    </Link>
                ))}
            </nav>

            <div className="p-4 border-t border-gray-800 text-center text-xs text-gray-500">
                &copy; AI Student Assistant
            </div>
        </div>
    );
};

export default Sidebar;
