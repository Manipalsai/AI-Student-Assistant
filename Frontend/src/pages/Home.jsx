import { Link } from 'react-router-dom';
import { BrainCircuit, BookOpen, MessageSquare, Layers, Sparkles, ArrowRight, ShieldCheck, BarChart3, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

const Home = () => {
    return (
        <div className="min-h-screen bg-gray-950 text-white font-sans selection:bg-blue-600 selection:text-white relative overflow-hidden">
            {/* Background glowing gradients */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-tr from-blue-600/20 to-purple-600/20 blur-[120px] pointer-events-none rounded-full" />

            {/* Navbar */}
            <nav className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center relative z-10 border-b border-gray-800/60">
                <div className="flex items-center gap-3 font-extrabold text-xl text-white">
                    <div className="p-2.5 bg-blue-600/20 border border-blue-500/40 rounded-xl text-blue-400">
                        <BrainCircuit size={26} />
                    </div>
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400">
                        AI Student Assistant
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    <Link
                        to="/app/documents"
                        className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-950/50 transition flex items-center gap-2"
                    >
                        Start Learning Platform <ArrowRight size={16} />
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center space-y-8 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-950/80 border border-blue-800/80 text-blue-300 text-xs font-semibold"
                >
                    <ShieldCheck size={14} className="text-blue-400" />
                    Production-Grade Grounded RAG Platform v2.0
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-4xl sm:text-6xl font-black tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-b from-white via-gray-100 to-gray-400"
                >
                    Master Course Material with <br />
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
                        Grounded RAG Intelligence
                    </span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed"
                >
                    Upload course notes, textbook PDFs, and research papers. Chat conversationally with page citations, track topic mastery, attempt adaptive quizzes, and follow AI exam study plans.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="pt-4 flex flex-col sm:flex-row gap-4 justify-center"
                >
                    <Link
                        to="/app/documents"
                        className="px-8 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-95 text-white rounded-2xl font-extrabold text-sm shadow-xl shadow-blue-950/60 transition flex items-center justify-center gap-2"
                    >
                        <Sparkles size={18} /> Start Learning Now
                    </Link>
                </motion.div>
            </section>

            {/* Feature Cards Grid */}
            <section className="max-w-6xl mx-auto px-6 py-16 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="p-8 bg-gray-900/80 border border-gray-800 hover:border-blue-500/50 rounded-2xl space-y-4 shadow-xl transition">
                        <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center">
                            <MessageSquare size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-white">Grounded RAG Chat</h3>
                        <p className="text-xs text-gray-400 leading-relaxed">
                            Retrieve verified answers grounded strictly in your uploaded text with exact page citations and clickable snippet modal inspection.
                        </p>
                    </div>

                    <div className="p-8 bg-gray-900/80 border border-gray-800 hover:border-purple-500/50 rounded-2xl space-y-4 shadow-xl transition">
                        <div className="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-400 flex items-center justify-center">
                            <BarChart3 size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-white">Adaptive Quizzes & Mastery</h3>
                        <p className="text-xs text-gray-400 leading-relaxed">
                            Track quiz scores, identify weak topics (&lt;65%), and generate targeted practice questions with full rationale explanations.
                        </p>
                    </div>

                    <div className="p-8 bg-gray-900/80 border border-gray-800 hover:border-indigo-500/50 rounded-2xl space-y-4 shadow-xl transition">
                        <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center">
                            <Calendar size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-white">AI Study Roadmaps</h3>
                        <p className="text-xs text-gray-400 leading-relaxed">
                            Input your exam date and daily study time to generate a step-by-step daily revision roadmap aligned with your syllabus.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;
