import { useState } from 'react';
import { useStudy } from '../../context/StudyContext';
import axios from 'axios';
import { CheckCircle, XCircle, Trophy, BarChart, RefreshCw, UploadCloud, BrainCircuit } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Quiz = () => {
    const { text, fileName, quiz: mcqs, setQuiz: setMcqs } = useStudy();
    const [current, setCurrent] = useState(0);
    const [selected, setSelected] = useState(null);
    const [score, setScore] = useState(0);
    const [showResult, setShowResult] = useState(false);
    const [quizStarted, setQuizStarted] = useState(false);
    const [quizFinished, setQuizFinished] = useState(false);
    const [loading, setLoading] = useState(false);

    // If mcqs already exist in context, we can skip the generation step
    useState(() => {
        if (mcqs && mcqs.length > 0) {
            setQuizStarted(true);
        }
    });

    const startQuiz = async () => {
        if (!text) return;
        setLoading(true);
        try {
            const res = await axios.post('/api/mcq', { text });
            if (res.data.mcqs) {
                setMcqs(res.data.mcqs);
                setQuizStarted(true);
                setQuizFinished(false);
                setCurrent(0);
                setScore(0);
                setShowResult(false);
                setSelected(null);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleOptionSelect = (index) => {
        if (showResult) return;
        setSelected(index);
    };

    const handleSubmit = () => {
        if (selected === null) return;

        const isCorrect = selected === mcqs[current].answer;
        if (isCorrect) setScore(score + 1);
        setShowResult(true);
    };

    const handleNext = () => {
        if (current < mcqs.length - 1) {
            setCurrent(current + 1);
            setSelected(null);
            setShowResult(false);
        } else {
            setQuizFinished(true);
        }
    };

    if (!text) {
        return (
            <div className="flex flex-col items-center justify-start pt-64 text-center p-8">
                <UploadCloud size={64} className="text-gray-600 mb-4" />
                <h3 className="text-xl font-bold text-gray-300">No Document Loaded</h3>
                <p className="text-gray-500 mt-2">Please upload a document to generate a quiz.</p>
            </div>
        );
    }

    if (!quizStarted) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-gray-800 p-10 rounded-2xl shadow-2xl border border-gray-700 max-w-md w-full"
                >
                    <BrainCircuit size={64} className="text-purple-500 mx-auto mb-6" />
                    <h2 className="text-2xl font-bold text-white mb-4">Quiz Time!</h2>
                    <p className="text-gray-400 mb-8">Test your knowledge on {fileName}.</p>

                    <button
                        onClick={startQuiz}
                        disabled={loading}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                    >
                        {loading && <RefreshCw className="animate-spin" />}
                        {loading ? "Generating Quiz..." : "Start Quiz"}
                    </button>
                </motion.div>
            </div>
        );
    }

    if (quizFinished) {
        const percentage = Math.round((score / mcqs.length) * 100);
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-8">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-gray-800 p-10 rounded-3xl shadow-2xl border border-gray-700 max-w-lg w-full"
                >
                    <Trophy size={80} className="text-yellow-400 mx-auto mb-6 drop-shadow-lg" />
                    <h2 className="text-4xl font-extrabold text-white mb-2">Quiz Completed!</h2>
                    <p className="text-gray-400 mb-8 text-lg">You scored {score} out of {mcqs.length}</p>

                    <div className="w-full bg-gray-700 rounded-full h-4 mb-8 overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 1, delay: 0.5 }}
                            className={`h-full ${percentage >= 70 ? 'bg-green-500' : percentage >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
                            <p className="text-gray-400 text-sm">Accuracy</p>
                            <p className="text-2xl font-bold text-white">{percentage}%</p>
                        </div>
                        <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
                            <p className="text-gray-400 text-sm">Questions</p>
                            <p className="text-2xl font-bold text-white">{mcqs.length}</p>
                        </div>
                    </div>

                    <button
                        onClick={() => setQuizStarted(false)}
                        className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-xl transition-all"
                    >
                        Tak Another Quiz
                    </button>
                </motion.div>
            </div>
        );
    }

    const currentQ = mcqs[current];

    return (
        <div className="max-w-3xl mx-auto space-y-8 pt-12">
            <div className="flex justify-between items-center text-gray-400 text-sm uppercase tracking-widest font-bold">
                <span>Question {current + 1} / {mcqs.length}</span>
                <span>Score: {score}</span>
            </div>

            <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                <motion.div
                    className="h-full bg-purple-500"
                    animate={{ width: `${((current) / mcqs.length) * 100}%` }}
                />
            </div>

            <motion.div
                key={current}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-700"
            >
                <h3 className="text-2xl font-bold text-white mb-8 leading-relaxed">{currentQ.question}</h3>

                <div className="space-y-4">
                    {currentQ.options.map((opt, idx) => {
                        let styleClass = "border-gray-600 hover:border-purple-500 hover:bg-gray-700/50";

                        if (showResult) {
                            if (idx === currentQ.answer) {
                                styleClass = "border-green-500 bg-green-500/10 text-green-300";
                            } else if (idx === selected) {
                                styleClass = "border-red-500 bg-red-500/10 text-red-300";
                            } else {
                                styleClass = "border-gray-700 opacity-50";
                            }
                        } else if (selected === idx) {
                            styleClass = "border-purple-500 bg-purple-500/20 text-purple-200 ring-2 ring-purple-500/50";
                        }

                        return (
                            <button
                                key={idx}
                                onClick={() => handleOptionSelect(idx)}
                                disabled={showResult}
                                className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between group ${styleClass}`}
                            >
                                <span className="font-medium text-lg">{opt}</span>
                                {showResult && idx === currentQ.answer && <CheckCircle className="text-green-500" size={24} />}
                                {showResult && idx === selected && idx !== currentQ.answer && <XCircle className="text-red-500" size={24} />}
                            </button>
                        );
                    })}
                </div>
            </motion.div>

            <div className="flex justify-end">
                {!showResult ? (
                    <button
                        onClick={handleSubmit}
                        disabled={selected === null}
                        className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-purple-900/50"
                    >
                        Check Answer
                    </button>
                ) : (
                    <button
                        onClick={handleNext}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-blue-900/50"
                    >
                        {current < mcqs.length - 1 ? "Next Question" : "View Results"}
                    </button>
                )}
            </div>
        </div>
    );
};

export default Quiz;
