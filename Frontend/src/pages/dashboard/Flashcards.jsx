import { useState } from 'react';
import { useStudy } from '../../context/StudyContext';
import axios from 'axios';
import { Layers, RotateCw, ChevronLeft, ChevronRight, UploadCloud } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Flashcards = () => {
    const { text, fileName, flashcards, setFlashcards } = useStudy();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [loading, setLoading] = useState(false);
    const [started, setStarted] = useState(false);

    // If flashcards already exist in context, we can skip the generation step
    useState(() => {
        if (flashcards && flashcards.length > 0) {
            setStarted(true);
        }
    });

    const generateFlashcards = async () => {
        if (!text) return;
        setLoading(true);
        try {
            const res = await axios.post('/api/flashcards', { text });
            if (res.data.flashcards) {
                setFlashcards(res.data.flashcards);
                setStarted(true);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleNext = () => {
        setIsFlipped(false);
        setCurrentIndex((prev) => (prev + 1) % flashcards.length);
    };

    const handlePrev = () => {
        setIsFlipped(false);
        setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
    };

    if (!text) {
        return (
            <div className="flex flex-col items-center justify-start pt-64 text-center p-8">
                <UploadCloud size={64} className="text-gray-600 mb-4" />
                <h3 className="text-xl font-bold text-gray-300">No Document Loaded</h3>
                <p className="text-gray-500 mt-2">Please upload a document to generate flashcards.</p>
            </div>
        );
    }

    if (!started) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-gray-800 p-10 rounded-2xl shadow-2xl border border-gray-700 max-w-md w-full"
                >
                    <Layers size={64} className="text-blue-500 mx-auto mb-6" />
                    <h2 className="text-2xl font-bold text-white mb-4">Study with Flashcards</h2>
                    <p className="text-gray-400 mb-8">Generate flashcards from {fileName} to memorize key concepts effectively.</p>

                    <button
                        onClick={generateFlashcards}
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                    >
                        {loading && <RotateCw className="animate-spin" />}
                        {loading ? "Generating..." : "Generate Flashcards"}
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 pt-12">
            <div className="flex items-center justify-between w-full max-w-2xl px-4">
                <h2 className="text-xl font-bold text-gray-300">Card {currentIndex + 1} / {flashcards.length}</h2>
                <button onClick={() => setStarted(false)} className="text-sm text-blue-400 hover:underline">
                    Reset
                </button>
            </div>

            <div className="relative w-full max-w-2xl aspect-[3/2] cursor-pointer perspective-1000" onClick={() => setIsFlipped(!isFlipped)}>
                <motion.div
                    className="w-full h-full relative preserve-3d transition-all duration-500"
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    style={{ transformStyle: 'preserve-3d' }}
                >
                    {/* Front */}
                    <div className="absolute w-full h-full backface-hidden bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl shadow-2xl flex flex-col items-center justify-center p-8 border border-blue-500/30">
                        <p className="text-xs font-bold text-blue-200 uppercase tracking-widest mb-4">Terms</p>
                        <h3 className="text-3xl font-bold text-white text-center">{flashcards[currentIndex].front}</h3>
                        <p className="absolute bottom-6 text-sm text-blue-200 opacity-60">Click to flip</p>
                    </div>

                    {/* Back */}
                    <div
                        className="absolute w-full h-full backface-hidden bg-gray-800 rounded-2xl shadow-2xl flex flex-col items-center justify-center p-8 border border-gray-700"
                        style={{ transform: 'rotateY(180deg)' }}
                    >
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Definition</p>
                        <p className="text-xl text-gray-200 text-center leading-relaxed">{flashcards[currentIndex].back}</p>
                    </div>
                </motion.div>
            </div>

            <div className="flex items-center gap-6">
                <button
                    onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                    className="p-4 bg-gray-800 hover:bg-gray-700 rounded-full text-white transition-all border border-gray-700 hover:border-gray-500"
                >
                    <ChevronLeft size={24} />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); handleNext(); }}
                    className="p-4 bg-blue-600 hover:bg-blue-700 rounded-full text-white transition-all shadow-lg shadow-blue-900/50"
                >
                    <ChevronRight size={24} />
                </button>
            </div>
        </div>
    );
};

export default Flashcards;
