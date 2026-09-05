import { useState } from 'react';
import { useStudy } from '../../context/StudyContext';
import DocumentSelectorDropdown from '../../components/DocumentSelectorDropdown';
import { Layers, RefreshCw, ChevronLeft, ChevronRight, RotateCw, CheckCircle, Sparkles, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Flashcards = () => {
    const { flashcards, generateFlashcards, loading, difficulty, setDifficulty } = useStudy();

    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [cardRatings, setCardRatings] = useState({});

    const handleGenerate = (customDifficulty = null) => {
        setCurrentIndex(0);
        setIsFlipped(false);
        setCardRatings({});
        generateFlashcards(customDifficulty || difficulty);
    };

    const nextCard = () => {
        if (!flashcards) return;
        setIsFlipped(false);
        setCurrentIndex((prev) => (prev + 1) % flashcards.length);
    };

    const prevCard = () => {
        if (!flashcards) return;
        setIsFlipped(false);
        setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
    };

    const rateCard = (rating) => {
        setCardRatings(prev => ({ ...prev, [currentIndex]: rating }));
        nextCard();
    };

    const currentCard = flashcards?.[currentIndex];

    return (
        <div className="p-8 space-y-8 max-w-4xl mx-auto">
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-900/60 p-6 rounded-2xl border border-gray-800 backdrop-blur">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-600/20 border border-blue-500/40 rounded-xl text-blue-400">
                        <Layers size={28} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Active Recall Flashcards</h2>
                        <p className="text-xs text-gray-400">
                            Digital study cards generated directly from your uploaded material for memory retention.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <DocumentSelectorDropdown label="Scope:" />

                    <select
                        value={difficulty}
                        onChange={(e) => {
                            setDifficulty(e.target.value);
                            handleGenerate(e.target.value);
                        }}
                        className="bg-gray-950 text-white font-bold text-xs rounded-xl px-3 py-2 border border-gray-800 focus:outline-none"
                    >
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                    </select>

                    <button
                        onClick={() => handleGenerate()}
                        disabled={loading}
                        className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs shadow-lg transition disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
                        {loading ? 'Generating...' : 'Generate New Deck'}
                    </button>
                </div>
            </div>

            {/* How Active Recall Flashcards Work */}
            <div className="p-5 bg-gradient-to-r from-blue-950/40 via-gray-900 to-indigo-950/40 border border-blue-800/50 rounded-2xl space-y-2 text-xs text-gray-300">
                <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                    <HelpCircle size={18} /> How Active Recall Flashcards Work:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-gray-300 font-medium">
                    <div className="p-3 bg-gray-950/80 rounded-xl border border-gray-800">
                        <strong className="text-white block mb-1">1. Read Question (Front)</strong>
                        Read the concept on the front side of the card.
                    </div>
                    <div className="p-3 bg-gray-950/80 rounded-xl border border-gray-800">
                        <strong className="text-white block mb-1">2. Flip Card (Back)</strong>
                        Click the card to reveal the exact unmirrored answer extracted from your document.
                    </div>
                    <div className="p-3 bg-gray-950/80 rounded-xl border border-gray-800">
                        <strong className="text-white block mb-1">3. Rate Recall</strong>
                        Rate your memory recall (<span className="text-red-400 font-bold">Hard</span>, <span className="text-yellow-400 font-bold">Medium</span>, <span className="text-emerald-400 font-bold">Easy</span>) to strengthen long-term memory.
                    </div>
                </div>
            </div>

            {/* Flashcard Area */}
            {!flashcards || flashcards.length === 0 ? (
                <div className="text-center py-16 bg-gray-900/40 rounded-2xl border border-gray-800 space-y-4">
                    <Layers size={48} className="mx-auto text-gray-600" />
                    <div>
                        <h3 className="text-lg font-bold text-white">No Flashcard Deck Active</h3>
                        <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
                            Click 'Generate New Deck' to create active recall flashcards from your uploaded documents.
                        </p>
                    </div>
                    <button
                        onClick={() => handleGenerate()}
                        disabled={loading}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow transition"
                    >
                        Generate 10 Study Flashcards
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Card Counter */}
                    <div className="flex justify-between items-center text-xs text-gray-400 font-semibold px-2">
                        <span>Card {currentIndex + 1} of {flashcards.length}</span>
                        <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-blue-950 text-blue-300 border border-blue-800">
                            Topic: {currentCard?.topic || 'General Concept'}
                        </span>
                    </div>

                    {/* Card Flip Container */}
                    <div
                        onClick={() => setIsFlipped(!isFlipped)}
                        className="relative h-80 w-full cursor-pointer select-none"
                    >
                        <AnimatePresence mode="wait">
                            {!isFlipped ? (
                                /* FRONT SIDE */
                                <motion.div
                                    key="front"
                                    initial={{ opacity: 0, rotateY: -90 }}
                                    animate={{ opacity: 1, rotateY: 0 }}
                                    exit={{ opacity: 0, rotateY: 90 }}
                                    transition={{ duration: 0.2 }}
                                    className="w-full h-full bg-gray-900 border border-gray-800 hover:border-blue-500/60 rounded-2xl p-8 flex flex-col justify-between shadow-2xl"
                                >
                                    <div className="flex justify-between items-center text-xs font-semibold text-gray-400">
                                        <span className="px-2 py-0.5 bg-gray-800 text-blue-400 rounded font-bold">FRONT • QUESTION</span>
                                        <RotateCw size={16} className="text-blue-400" />
                                    </div>
                                    <div className="text-center font-bold text-xl md:text-2xl text-white my-auto px-6 leading-relaxed">
                                        {currentCard?.front}
                                    </div>
                                    <div className="text-center text-xs text-blue-400 font-medium">
                                        Click card to reveal answer 🔄
                                    </div>
                                </motion.div>
                            ) : (
                                /* BACK SIDE - UNMIRRORED */
                                <motion.div
                                    key="back"
                                    initial={{ opacity: 0, rotateY: 90 }}
                                    animate={{ opacity: 1, rotateY: 0 }}
                                    exit={{ opacity: 0, rotateY: -90 }}
                                    transition={{ duration: 0.2 }}
                                    className="w-full h-full bg-gradient-to-br from-gray-900 via-gray-900 to-indigo-950 border border-indigo-700/80 rounded-2xl p-8 flex flex-col justify-between shadow-2xl"
                                >
                                    <div className="flex justify-between items-center text-xs font-semibold text-indigo-300">
                                        <span className="px-2 py-0.5 bg-indigo-950 text-emerald-400 border border-indigo-700 rounded font-bold">BACK • ANSWER</span>
                                        <CheckCircle size={16} className="text-emerald-400" />
                                    </div>
                                    <div className="text-center font-medium text-base md:text-lg text-gray-100 leading-relaxed my-auto px-6">
                                        {currentCard?.back}
                                    </div>
                                    <div className="text-center text-xs text-indigo-300 font-medium">
                                        Rate your memory recall below 👇
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Rating buttons */}
                    <div className="flex justify-center items-center gap-3 pt-2">
                        <button
                            onClick={() => rateCard('Hard')}
                            className="px-4 py-2 bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 rounded-xl text-xs font-bold transition"
                        >
                            🔴 Hard (Review again)
                        </button>
                        <button
                            onClick={() => rateCard('Medium')}
                            className="px-4 py-2 bg-amber-950/80 hover:bg-amber-900 border border-amber-800 text-amber-300 rounded-xl text-xs font-bold transition"
                        >
                            🟡 Medium (Good)
                        </button>
                        <button
                            onClick={() => rateCard('Easy')}
                            className="px-4 py-2 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 rounded-xl text-xs font-bold transition"
                        >
                            🟢 Easy (Mastered)
                        </button>
                    </div>

                    {/* Navigation Controls */}
                    <div className="flex justify-between items-center pt-4">
                        <button
                            onClick={prevCard}
                            className="p-3 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl text-gray-300 transition flex items-center gap-1 text-xs font-semibold"
                        >
                            <ChevronLeft size={16} /> Previous Card
                        </button>
                        <button
                            onClick={nextCard}
                            className="p-3 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl text-gray-300 transition flex items-center gap-1 text-xs font-semibold"
                        >
                            Next Card <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Flashcards;
