import { useState } from 'react';
import { useStudy } from '../../context/StudyContext';
import DocumentSelectorDropdown from '../../components/DocumentSelectorDropdown';
import { BrainCircuit, CheckCircle, XCircle, RefreshCw, Trophy, Target, Sparkles, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const Quiz = () => {
    const {
        quiz,
        generateQuiz,
        submitQuizAttempt,
        loading,
        difficulty,
        setDifficulty,
        analytics
    } = useStudy();

    const [userAnswers, setUserAnswers] = useState({});
    const [submitted, setSubmitted] = useState(false);

    const handleSelect = (qIdx, optionIdx) => {
        if (submitted) return;
        setUserAnswers(prev => ({ ...prev, [qIdx]: optionIdx }));
    };

    const handleGenerate = (customDifficulty = null, weakTopic = null) => {
        setSubmitted(false);
        setUserAnswers({});
        generateQuiz(customDifficulty || difficulty, weakTopic);
    };

    const handleSubmitQuiz = () => {
        if (!quiz || quiz.length === 0) return;
        setSubmitted(true);

        let correct = 0;
        quiz.forEach((q, idx) => {
            if (userAnswers[idx] === q.answer) {
                correct++;
            }
        });

        const scorePercent = (correct / quiz.length) * 100;
        const mainTopic = quiz[0]?.topic || "General Concept";

        submitQuizAttempt({
            document_id: "selected_docs",
            topic: mainTopic,
            score: scorePercent,
            total_questions: quiz.length,
            correct_count: correct,
            difficulty: difficulty
        });
    };

    const calculateScore = () => {
        if (!quiz) return { correct: 0, total: 0, percent: 0 };
        let correct = 0;
        quiz.forEach((q, idx) => {
            if (userAnswers[idx] === q.answer) correct++;
        });
        return {
            correct,
            total: quiz.length,
            percent: Math.round((correct / quiz.length) * 100)
        };
    };

    const scoreData = calculateScore();
    const realWeakTopics = (analytics?.weak_topics || []).filter(t => !t.toLowerCase().includes('upload'));

    return (
        <div className="p-8 space-y-8">
            {/* Header Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-900/60 p-6 rounded-2xl border border-gray-800 backdrop-blur">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-600/20 border border-purple-500/40 rounded-xl text-purple-400">
                        <BrainCircuit size={28} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Adaptive Quizzes & Self-Assessment</h2>
                        <p className="text-xs text-gray-400">
                            Test comprehension with grounded questions generated directly from study documents.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <DocumentSelectorDropdown label="Scope:" />

                    {/* Difficulty selector */}
                    <div className="flex items-center gap-1.5 bg-gray-950 px-3 py-1.5 rounded-xl border border-gray-800 text-xs">
                        <span className="text-gray-400 font-semibold">Difficulty:</span>
                        <select
                            value={difficulty}
                            onChange={(e) => {
                                setDifficulty(e.target.value);
                                handleGenerate(e.target.value);
                            }}
                            className="bg-transparent text-white font-bold focus:outline-none"
                        >
                            <option value="Easy" className="bg-gray-900 text-emerald-400">Easy</option>
                            <option value="Medium" className="bg-gray-900 text-yellow-400">Medium</option>
                            <option value="Hard" className="bg-gray-900 text-amber-400">Hard</option>
                            <option value="Exam" className="bg-gray-900 text-purple-400">Exam Mode</option>
                        </select>
                    </div>

                    <button
                        onClick={() => handleGenerate()}
                        disabled={loading}
                        className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-purple-950/40 transition disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
                        {loading ? 'Generating Quiz...' : 'Generate New Quiz'}
                    </button>
                </div>
            </div>

            {/* Weak Topic Shortcut Banner */}
            {realWeakTopics.length > 0 && (
                <div className="p-4 bg-amber-950/40 border border-amber-800/60 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
                    <div className="flex items-center gap-2 text-amber-300 font-medium">
                        <Target size={18} className="text-amber-400 shrink-0" />
                        <span>Identified Weak Topic: <strong className="text-amber-200">{realWeakTopics[0]}</strong></span>
                    </div>
                    <button
                        onClick={() => handleGenerate(difficulty, realWeakTopics[0])}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl shadow transition shrink-0"
                    >
                        🎯 Practice Weak Area Quiz
                    </button>
                </div>
            )}

            {/* Quiz Content */}
            {!quiz || quiz.length === 0 ? (
                <div className="text-center py-20 bg-gray-900/40 rounded-2xl border border-gray-800 space-y-4">
                    <BrainCircuit size={48} className="mx-auto text-gray-600" />
                    <div>
                        <h3 className="text-lg font-bold text-white">No active quiz generated</h3>
                        <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
                            Click 'Generate New Quiz' to evaluate your understanding of selected study documents.
                        </p>
                    </div>
                    <button
                        onClick={() => handleGenerate()}
                        disabled={loading}
                        className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-xs shadow transition"
                    >
                        Start 10-Question Quiz
                    </button>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Score summary banner after submission */}
                    {submitted && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-6 bg-gradient-to-r from-purple-950 via-gray-900 to-indigo-950 border border-purple-800 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-6 shadow-2xl"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-purple-600/30 border border-purple-500/50 rounded-2xl text-purple-300">
                                    <Trophy size={36} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-extrabold text-white">Quiz Complete!</h3>
                                    <p className="text-xs text-gray-300 font-medium">
                                        Result logged to your Learning Analytics Dashboard.
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-black text-emerald-400">{scoreData.percent}%</div>
                                <div className="text-xs text-gray-400 font-semibold">{scoreData.correct} / {scoreData.total} Correct</div>
                            </div>
                        </motion.div>
                    )}

                    {/* Question List */}
                    <div className="space-y-6">
                        {quiz.map((item, qIdx) => {
                            const isSelected = userAnswers[qIdx] !== undefined;
                            const isCorrect = userAnswers[qIdx] === item.answer;

                            return (
                                <div key={qIdx} className="p-6 bg-gray-900 border border-gray-800 rounded-2xl space-y-4 shadow-lg">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <span className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-400 font-bold text-xs flex items-center justify-center">
                                                Q{qIdx + 1}
                                            </span>
                                            <h3 className="font-bold text-base text-white">{item.question}</h3>
                                        </div>
                                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-gray-800 text-purple-300 border border-gray-700">
                                            {item.topic || 'General Concept'}
                                        </span>
                                    </div>

                                    {/* Options Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                                        {item.options?.map((opt, optIdx) => {
                                            const pickedThis = userAnswers[qIdx] === optIdx;
                                            const isAnswerOpt = item.answer === optIdx;

                                            let btnStyle = "bg-gray-950 border-gray-800 text-gray-300 hover:bg-gray-800 hover:border-gray-700";

                                            if (submitted) {
                                                if (isAnswerOpt) {
                                                    btnStyle = "bg-emerald-950/80 border-emerald-600 text-emerald-200 font-bold";
                                                } else if (pickedThis && !isCorrect) {
                                                    btnStyle = "bg-red-950/80 border-red-600 text-red-200 font-bold";
                                                }
                                            } else if (pickedThis) {
                                                btnStyle = "bg-purple-950/90 border-purple-500 text-white font-bold shadow-lg shadow-purple-950/50";
                                            }

                                            return (
                                                <button
                                                    key={optIdx}
                                                    disabled={submitted}
                                                    onClick={() => handleSelect(qIdx, optIdx)}
                                                    className={`p-4 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${btnStyle}`}
                                                >
                                                    <span>{opt}</span>
                                                    {submitted && isAnswerOpt && <CheckCircle size={16} className="text-emerald-400 shrink-0 ml-2" />}
                                                    {submitted && pickedThis && !isCorrect && <XCircle size={16} className="text-red-400 shrink-0 ml-2" />}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Rationale explanation after submission */}
                                    {submitted && item.explanation && (
                                        <div className="p-3 bg-gray-950 border border-gray-800 rounded-xl text-xs text-gray-300 flex items-start gap-2">
                                            <HelpCircle size={15} className="text-purple-400 shrink-0 mt-0.5" />
                                            <span><strong>Rationale:</strong> {item.explanation}</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Submit Bar */}
                    {!submitted && (
                        <div className="flex justify-end pt-4">
                            <button
                                onClick={handleSubmitQuiz}
                                disabled={Object.keys(userAnswers).length === 0}
                                className="px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-xl shadow-emerald-950/40 transition disabled:opacity-50"
                            >
                                Submit Answers & Record Score
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Quiz;
