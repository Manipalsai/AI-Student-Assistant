import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, BrainCircuit, Zap, FileText, CheckCircle, MessageSquare, X, HelpCircle, Upload, Search, BookOpen } from 'lucide-react';

export default function Home() {
    const [isGuideOpen, setIsGuideOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gray-950 text-white font-sans selection:bg-blue-500 selection:text-white overflow-x-hidden">
            {/* Navbar */}
            <nav className="container mx-auto px-6 py-6 flex justify-between items-center relative z-20">
                <div className="flex items-center gap-2 font-bold text-2xl tracking-tighter">
                    <BrainCircuit className="text-blue-500" />
                    <span>AI Study Mate</span>
                </div>
                <div className="flex gap-8 text-sm font-medium text-gray-400 items-center">
                    <a href="#features" className="hover:text-white transition-colors hidden md:block">Features</a>
                    <button
                        onClick={() => setIsGuideOpen(true)}
                        className="hover:text-white transition-colors flex items-center gap-1.5"
                    >
                        How it Works
                    </button>
                </div>
            </nav>

            {/* Hero */}
            <header className="container mx-auto px-6 pt-20 pb-32 text-center relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
                        Master your studies with <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">Artificial Intelligence</span>
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed">
                        Upload any document and instantly generate summaries, flashcards, and quizzes.
                        Your personal AI tutor is here.
                    </p>
                    <div className="flex justify-center gap-4">
                        <Link to="/app/summary" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-full font-bold text-lg transition-all shadow-lg shadow-blue-900/50 flex items-center gap-2 group">
                            Get Started
                            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                </motion.div>

                {/* Abstract Background Elements */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/20 rounded-full blur-[120px] -z-10 pointer-events-none" />
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] -z-10 pointer-events-none" />
            </header>

            {/* Features */}
            <section id="features" className="bg-gray-900/50 py-24 border-t border-gray-800">
                <div className="container mx-auto px-6 text-center mb-16">
                    <h2 className="text-3xl font-bold mb-4">Powerful Study Tools</h2>
                    <p className="text-gray-400">Everything you need to ace your exams in one place.</p>
                </div>
                <div className="container mx-auto px-6">
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <FeatureCard
                            icon={<FileText size={32} className="text-blue-400" />}
                            title="Instant Summaries"
                            desc="Turn textbooks into concise, structured notes in seconds."
                        />
                        <FeatureCard
                            icon={<Zap size={32} className="text-yellow-400" />}
                            title="Smart Flashcards"
                            desc="Memorize key concepts faster with AI-generated cards."
                        />
                        <FeatureCard
                            icon={<CheckCircle size={32} className="text-green-400" />}
                            title="Interactive Quizzes"
                            desc="Test your knowledge with auto-generated questions."
                        />
                        <FeatureCard
                            icon={<MessageSquare size={32} className="text-purple-400" />}
                            title="AI Document Chat"
                            desc="Ask questions and chat directly with your PDF documents."
                        />
                    </div>
                </div>
            </section>

            {/* How it Works Modal */}
            <AnimatePresence>
                {isGuideOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsGuideOpen(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-gray-900 border border-gray-800 w-full max-w-2xl rounded-3xl overflow-hidden relative z-10 shadow-2xl"
                        >
                            <div className="p-8">
                                <div className="flex justify-between items-center mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-blue-600/20 p-2 rounded-lg">
                                            <HelpCircle className="text-blue-400" />
                                        </div>
                                        <h2 className="text-2xl font-bold">How it Works</h2>
                                    </div>
                                    <button
                                        onClick={() => setIsGuideOpen(false)}
                                        className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-800 transition-colors"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>

                                <div className="space-y-8">
                                    <Step
                                        num="01"
                                        icon={<Upload className="text-blue-400" size={24} />}
                                        title="Upload Your Document"
                                        desc="Drop your PDF, Word, or text file into the assistant. We'll securely extract the content."
                                    />
                                    <Step
                                        num="02"
                                        icon={<Search className="text-purple-400" size={24} />}
                                        title="Choose Your Study Tool"
                                        desc="Pick from Summaries, Flashcards, or Quizzes to process your material."
                                    />
                                    <Step
                                        num="03"
                                        icon={<BookOpen className="text-green-400" size={24} />}
                                        title="Master the Content"
                                        desc="Review your notes, study your cards, or chat with the document for deep insights."
                                    />
                                </div>

                                <div className="mt-12">
                                    <button
                                        onClick={() => setIsGuideOpen(false)}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold transition-all"
                                    >
                                        Got it, let's go!
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Footer */}
            <footer className="container mx-auto px-6 py-12 border-t border-gray-900 text-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center gap-2 font-bold text-lg text-gray-400">
                        <BrainCircuit size={20} />
                        <span>AI Study Mate</span>
                    </div>
                    <p className="text-gray-500 text-sm">
                        &copy; AI Student Assistant
                    </p>
                </div>
            </footer>
        </div>
    );
}

const FeatureCard = ({ icon, title, desc }) => (
    <div className="bg-gray-800/30 p-8 rounded-3xl border border-gray-800 hover:border-blue-500/30 transition-all hover:-translate-y-1 duration-300">
        <div className="mb-6 bg-gray-950 w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
            {icon}
        </div>
        <h3 className="text-xl font-bold mb-3">{title}</h3>
        <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
    </div>
);

const Step = ({ num, icon, title, desc }) => (
    <div className="flex gap-6">
        <div className="flex-shrink-0 text-3xl font-black text-gray-800 select-none">{num}</div>
        <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-2">
                {icon}
                <h4 className="font-bold text-lg">{title}</h4>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
        </div>
    </div>
);
