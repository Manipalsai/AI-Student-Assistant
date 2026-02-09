import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { motion } from 'framer-motion';

const DashboardLayout = () => {
    const location = useLocation();

    const getPageDetails = () => {
        switch (location.pathname) {
            case '/app/summary':
                return { title: "Summarizer", subtitle: "Extract key insights from your documents." };
            case '/app/quiz':
                return { title: "Interactive Quiz", subtitle: "Test your knowledge and track your progress." };
            case '/app/flashcards':
                return { title: "Study Flashcards", subtitle: "Master concepts through active recall." };
            case '/app/chat':
                return { title: "AI Document Chat", subtitle: "Ask questions directly to your study material." };
            default:
                return { title: "Dashboard", subtitle: "Manage your documents and start learning." };
        }
    };

    const { title, subtitle } = getPageDetails();

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-950 font-sans text-gray-800 dark:text-gray-100 overflow-hidden">
            <Sidebar />

            <main className="flex-1 ml-64 p-8 overflow-y-auto overflow-x-hidden">
                <motion.div
                    key={location.pathname}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <header className="mb-8 flex justify-between items-center">
                        <div className="space-y-1">
                            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-600">
                                {title}
                            </h1>
                            <p className="text-sm text-gray-400">{subtitle}</p>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="bg-gray-800/50 backdrop-blur border border-gray-700 px-4 py-2 rounded-xl text-xs font-bold text-gray-400 tracking-widest uppercase">
                                AI Powered Assistant
                            </div>
                        </div>
                    </header>

                    <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-xl min-h-[calc(100vh-12rem)]">
                        <Outlet />
                    </div>
                </motion.div>
            </main>
        </div>
    );
};

export default DashboardLayout;
