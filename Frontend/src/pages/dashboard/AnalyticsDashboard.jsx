import { useState, useEffect } from 'react';
import { useStudy } from '../../context/StudyContext';
import { BarChart3, Trophy, AlertTriangle, Target, Lightbulb, Play, Activity } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AnalyticsDashboard = () => {
    const { analytics, fetchAnalytics, generateQuiz } = useStudy();
    const [evalResults, setEvalResults] = useState(null);
    const [runningEval, setRunningEval] = useState(false);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const runBenchmarkEval = async () => {
        setRunningEval(true);
        try {
            const res = await axios.post('/api/eval/run');
            setEvalResults(res.data);
            toast.success("RAG Benchmark Evaluation Complete!");
        } catch (err) {
            toast.error("Failed to run evaluation benchmark");
        } finally {
            setRunningEval(false);
        }
    };

    if (!analytics) {
        return (
            <div className="p-8 text-center text-gray-400 flex items-center justify-center min-h-[400px]">
                <Activity size={24} className="animate-spin text-blue-500 mr-2" />
                <span>Loading learning metrics...</span>
            </div>
        );
    }

    const realWeakTopics = (analytics.weak_topics || []).filter(t => !t.toLowerCase().includes('upload'));

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-900/60 p-6 rounded-2xl border border-gray-800 backdrop-blur">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-600/20 border border-purple-500/40 rounded-xl text-purple-400">
                        <BarChart3 size={28} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Learning Analytics & Mastery</h2>
                        <p className="text-xs text-gray-400">
                            Track topic performance, identify weak areas, and verify grounded RAG retrieval quality.
                        </p>
                    </div>
                </div>

                <button
                    onClick={runBenchmarkEval}
                    disabled={runningEval}
                    className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-semibold text-xs flex items-center gap-2 shadow-lg shadow-purple-950/40 transition disabled:opacity-50"
                >
                    {runningEval ? (
                        <>
                            <Activity size={16} className="animate-spin text-purple-200" /> Evaluating RAG Metrics...
                        </>
                    ) : (
                        <>
                            <Play size={16} /> Run RAG Evaluation Benchmark
                        </>
                    )}
                </button>
            </div>

            {/* Stat Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="p-6 bg-gray-900 border border-gray-800 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center text-gray-400 text-xs font-semibold">
                        <span>Quizzes Attempted</span>
                        <Trophy size={18} className="text-yellow-400" />
                    </div>
                    <div className="text-3xl font-extrabold text-white">{analytics.total_quizzes}</div>
                    <p className="text-[11px] text-gray-500">Across all study documents</p>
                </div>

                <div className="p-6 bg-gray-900 border border-gray-800 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center text-gray-400 text-xs font-semibold">
                        <span>Questions Answered</span>
                        <Target size={18} className="text-blue-400" />
                    </div>
                    <div className="text-3xl font-extrabold text-white">{analytics.total_questions_answered}</div>
                    <p className="text-[11px] text-gray-500">Total practice items</p>
                </div>

                <div className="p-6 bg-gray-900 border border-gray-800 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center text-gray-400 text-xs font-semibold">
                        <span>Overall Accuracy</span>
                        <Activity size={18} className="text-emerald-400" />
                    </div>
                    <div className="text-3xl font-extrabold text-emerald-400">{analytics.average_score}%</div>
                    <p className="text-[11px] text-gray-500">Average score across quizzes</p>
                </div>

                <div className="p-6 bg-gray-900 border border-gray-800 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center text-gray-400 text-xs font-semibold">
                        <span>Weak Topics</span>
                        <AlertTriangle size={18} className="text-amber-400" />
                    </div>
                    <div className="text-3xl font-extrabold text-amber-400">{realWeakTopics.length}</div>
                    <p className="text-[11px] text-gray-500">Accuracy &lt; 65%</p>
                </div>
            </div>

            {/* Recommendations & Weak Topics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Topic Breakdown Bars */}
                <div className="p-6 bg-gray-900 border border-gray-800 rounded-2xl space-y-6">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Target size={18} className="text-blue-400" /> Topic Mastery Breakdown
                    </h3>

                    {(!analytics.topic_breakdown || analytics.topic_breakdown.length === 0) ? (
                        <p className="text-xs text-gray-500 italic py-8 text-center">
                            No quiz attempts yet. Complete a practice quiz to generate topic mastery scores!
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {analytics.topic_breakdown.map((item, idx) => {
                                const isWeak = item.accuracy < 65;
                                const isStrong = item.accuracy >= 80;
                                return (
                                    <div key={idx} className="space-y-1.5">
                                        <div className="flex justify-between text-xs font-medium">
                                            <span className="text-gray-200 font-semibold">{item.topic}</span>
                                            <span className={isWeak ? 'text-red-400 font-bold' : isStrong ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                                                {item.accuracy}% ({item.total_questions} questions)
                                            </span>
                                        </div>
                                        <div className="w-full h-2.5 bg-gray-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${
                                                    isWeak ? 'bg-gradient-to-r from-red-600 to-rose-500' :
                                                    isStrong ? 'bg-gradient-to-r from-emerald-600 to-teal-500' :
                                                    'bg-gradient-to-r from-amber-500 to-yellow-400'
                                                }`}
                                                style={{ width: `${Math.max(item.accuracy, 8)}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* AI Recommendations */}
                <div className="p-6 bg-gray-900 border border-gray-800 rounded-2xl space-y-6 flex flex-col justify-between">
                    <div className="space-y-4">
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                            <Lightbulb size={18} className="text-yellow-400" /> AI Study Recommendations
                        </h3>

                        <div className="space-y-3">
                            {analytics.recommendations.map((rec, idx) => (
                                <div key={idx} className="p-4 bg-gray-950/80 border border-gray-800 rounded-xl text-xs text-gray-300 font-medium leading-relaxed">
                                    {rec}
                                </div>
                            ))}
                        </div>
                    </div>

                    {realWeakTopics.length > 0 && (
                        <div className="pt-4 border-t border-gray-800">
                            <button
                                onClick={() => generateQuiz("Medium", realWeakTopics[0])}
                                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-red-950/40 transition"
                            >
                                🎯 Generate Targeted Quiz on '{realWeakTopics[0]}'
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* RAG Evaluation Benchmark Results */}
            {evalResults && (
                <div className="p-6 bg-gray-900 border border-purple-800/80 rounded-2xl space-y-6 shadow-2xl">
                    <div className="flex justify-between items-center border-b border-gray-800 pb-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Activity size={20} className="text-purple-400" /> Quantitative RAG Benchmark Results
                        </h3>
                        <span className="text-xs text-gray-400 font-mono">
                            Duration: {evalResults.summary_metrics.evaluation_duration_sec}s
                        </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div className="p-4 bg-gray-950 rounded-xl border border-gray-800">
                            <div className="text-xs text-gray-400 font-medium">Hit Rate @ K</div>
                            <div className="text-2xl font-black text-purple-400 mt-1">
                                {(evalResults.summary_metrics.hit_rate_at_k * 100).toFixed(1)}%
                            </div>
                        </div>
                        <div className="p-4 bg-gray-950 rounded-xl border border-gray-800">
                            <div className="text-xs text-gray-400 font-medium">Mean Reciprocal Rank (MRR)</div>
                            <div className="text-2xl font-black text-blue-400 mt-1">
                                {evalResults.summary_metrics.mrr.toFixed(3)}
                            </div>
                        </div>
                        <div className="p-4 bg-gray-950 rounded-xl border border-gray-800">
                            <div className="text-xs text-gray-400 font-medium">Faithfulness Score</div>
                            <div className="text-2xl font-black text-emerald-400 mt-1">
                                {(evalResults.summary_metrics.faithfulness_score * 100).toFixed(1)}%
                            </div>
                        </div>
                        <div className="p-4 bg-gray-950 rounded-xl border border-gray-800">
                            <div className="text-xs text-gray-400 font-medium">Context Relevance</div>
                            <div className="text-2xl font-black text-amber-400 mt-1">
                                {(evalResults.summary_metrics.context_relevance_score * 100).toFixed(1)}%
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnalyticsDashboard;
