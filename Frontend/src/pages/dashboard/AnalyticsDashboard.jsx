import { useState, useEffect } from 'react';
import { useStudy } from '../../context/StudyContext';
import {
    BarChart3, Trophy, AlertTriangle, Target, Lightbulb, Play,
    Activity, TrendingUp, BookOpen, Zap, Star, CheckCircle2,
    XCircle, Info, ArrowRight, Flame
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const MasteryBadge = ({ accuracy }) => {
    if (accuracy >= 90) return <span className="px-2 py-0.5 bg-emerald-900/60 text-emerald-300 text-[10px] font-bold rounded-full border border-emerald-700">🏆 Mastered</span>;
    if (accuracy >= 75) return <span className="px-2 py-0.5 bg-blue-900/60 text-blue-300 text-[10px] font-bold rounded-full border border-blue-700">⭐ Proficient</span>;
    if (accuracy >= 60) return <span className="px-2 py-0.5 bg-amber-900/60 text-amber-300 text-[10px] font-bold rounded-full border border-amber-700">📖 Learning</span>;
    return <span className="px-2 py-0.5 bg-red-900/60 text-red-300 text-[10px] font-bold rounded-full border border-red-700">⚠️ Needs Work</span>;
};

const ScoreRing = ({ percent, label, color }) => {
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;
    const colorMap = {
        emerald: { stroke: '#10b981', text: 'text-emerald-400', bg: 'stroke-emerald-900' },
        amber: { stroke: '#f59e0b', text: 'text-amber-400', bg: 'stroke-amber-900' },
        blue: { stroke: '#3b82f6', text: 'text-blue-400', bg: 'stroke-blue-900' },
        red: { stroke: '#ef4444', text: 'text-red-400', bg: 'stroke-red-900' },
    };
    const c = colorMap[color] || colorMap.blue;
    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative w-24 h-24">
                <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
                    <circle cx="48" cy="48" r={radius} strokeWidth="8" fill="none" className={c.bg} />
                    <circle
                        cx="48" cy="48" r={radius} strokeWidth="8" fill="none"
                        stroke={c.stroke}
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 1s ease' }}
                    />
                </svg>
                <div className={`absolute inset-0 flex items-center justify-center font-black text-lg ${c.text}`}>
                    {Math.round(percent)}%
                </div>
            </div>
            <span className="text-xs text-gray-400 font-semibold text-center">{label}</span>
        </div>
    );
};

const BenchmarkExplainer = ({ label, value, description, color, icon: Icon, max = 100, isPercent = true }) => {
    const pct = isPercent ? value : value * 100;
    return (
        <div className="p-5 bg-gray-950 rounded-2xl border border-gray-800 space-y-3">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Icon size={18} className={color} />
                    <span className="text-sm font-bold text-white">{label}</span>
                </div>
                <span className={`text-xl font-black ${color}`}>
                    {isPercent ? `${pct.toFixed(1)}%` : value.toFixed(3)}
                </span>
            </div>
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full"
                    style={{
                        width: `${Math.min(pct, 100)}%`,
                        background: color.includes('purple') ? '#9333ea' : color.includes('blue') ? '#3b82f6' : color.includes('emerald') ? '#10b981' : '#f59e0b',
                        transition: 'width 1s ease'
                    }}
                />
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">{description}</p>
        </div>
    );
};

const AnalyticsDashboard = () => {
    const { analytics, fetchAnalytics, generateQuiz } = useStudy();
    const [evalResults, setEvalResults] = useState(null);
    const [runningEval, setRunningEval] = useState(false);
    const [showBenchmarkInfo, setShowBenchmarkInfo] = useState(false);

    useEffect(() => { fetchAnalytics(); }, []);

    const runBenchmarkEval = async () => {
        setRunningEval(true);
        try {
            const res = await axios.post('/api/eval/run');
            setEvalResults(res.data);
            setShowBenchmarkInfo(true);
            toast.success('RAG Benchmark Evaluation Complete!');
        } catch (err) {
            toast.error('Failed to run evaluation benchmark');
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
    const strongTopics = (analytics.strong_topics || []);

    const overallGrade = () => {
        const s = analytics.average_score;
        if (s >= 90) return { label: 'A+', color: 'text-emerald-400', desc: 'Outstanding mastery' };
        if (s >= 80) return { label: 'A', color: 'text-emerald-400', desc: 'Excellent performance' };
        if (s >= 70) return { label: 'B', color: 'text-blue-400', desc: 'Good understanding' };
        if (s >= 60) return { label: 'C', color: 'text-amber-400', desc: 'Needs more practice' };
        return { label: 'D', color: 'text-red-400', desc: 'Focus on weak topics' };
    };
    const grade = overallGrade();

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-900/60 p-5 rounded-2xl border border-gray-800">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-600/20 border border-purple-500/40 rounded-xl text-purple-400">
                        <BarChart3 size={26} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Your Learning Progress</h2>
                        <p className="text-xs text-gray-400 mt-0.5">Track how well you're understanding your study material</p>
                    </div>
                </div>

                <button
                    onClick={runBenchmarkEval}
                    disabled={runningEval}
                    title="Checks how accurately the AI is retrieving information from your documents"
                    className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-semibold text-xs flex items-center gap-2 shadow-lg shadow-purple-950/40 transition disabled:opacity-50"
                >
                    {runningEval ? (
                        <><Activity size={16} className="animate-spin" /> Checking AI Accuracy...</>
                    ) : (
                        <><Zap size={16} /> Test AI Document Accuracy</>
                    )}
                </button>
            </div>

            {/* No data state */}
            {analytics.total_quizzes === 0 ? (
                <div className="p-10 bg-gray-900/40 border border-gray-800 rounded-2xl text-center space-y-4">
                    <BookOpen size={48} className="mx-auto text-gray-600" />
                    <div>
                        <h3 className="text-lg font-bold text-white">No Quiz Results Yet</h3>
                        <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
                            Upload a document and take a quiz in <strong>Adaptive Quizzes</strong> to see your performance breakdown here.
                        </p>
                    </div>
                    <div className="text-xs text-gray-500">
                        ➡️ Go to <strong className="text-purple-400">Adaptive Quizzes</strong> → Generate Quiz → Submit Answers
                    </div>
                </div>
            ) : (
                <>
                    {/* Score Overview Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Grade Card */}
                        <div className="p-6 bg-gray-900 border border-gray-800 rounded-2xl flex items-center gap-5">
                            <div className={`text-6xl font-black ${grade.color}`}>{grade.label}</div>
                            <div>
                                <div className="text-sm font-bold text-white">{grade.desc}</div>
                                <div className="text-xs text-gray-400 mt-1">Overall Grade</div>
                                <div className="text-2xl font-extrabold text-white mt-1">{analytics.average_score}%</div>
                                <div className="text-[11px] text-gray-500">Avg across {analytics.total_quizzes} quiz{analytics.total_quizzes !== 1 ? 'zes' : ''}</div>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="p-6 bg-gray-900 border border-gray-800 rounded-2xl space-y-3">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Quiz Stats</h4>
                            <div className="grid grid-cols-2 gap-3 text-center">
                                <div>
                                    <div className="text-2xl font-extrabold text-white">{analytics.total_quizzes}</div>
                                    <div className="text-[11px] text-gray-500">Quizzes Taken</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-extrabold text-white">{analytics.total_questions_answered}</div>
                                    <div className="text-[11px] text-gray-500">Questions Done</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-extrabold text-emerald-400">{strongTopics.length}</div>
                                    <div className="text-[11px] text-gray-500">Topics Mastered</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-extrabold text-red-400">{realWeakTopics.length}</div>
                                    <div className="text-[11px] text-gray-500">Need Review</div>
                                </div>
                            </div>
                        </div>

                        {/* Score Ring */}
                        <div className="p-6 bg-gray-900 border border-gray-800 rounded-2xl flex flex-col items-center justify-center gap-2">
                            <ScoreRing
                                percent={analytics.average_score}
                                label="Overall Accuracy"
                                color={analytics.average_score >= 75 ? 'emerald' : analytics.average_score >= 60 ? 'amber' : 'red'}
                            />
                            <div className="text-[11px] text-gray-500 text-center">
                                {analytics.average_score >= 75 ? 'Great work! Keep it up.' : analytics.average_score >= 60 ? 'Getting there — review weak topics.' : 'Focus on weak areas to improve.'}
                            </div>
                        </div>
                    </div>

                    {/* Topic Breakdown + Recommendations */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Topic Mastery */}
                        <div className="p-6 bg-gray-900 border border-gray-800 rounded-2xl space-y-5">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <Target size={18} className="text-blue-400" />
                                Topic-by-Topic Mastery
                                <span className="ml-auto text-[11px] text-gray-500 font-normal">90%+ = Mastered • 75%+ = Good • Below 65% = Weak</span>
                            </h3>
                            {analytics.topic_breakdown.length === 0 ? (
                                <p className="text-xs text-gray-500 italic text-center py-6">Take a quiz to see topic breakdown.</p>
                            ) : (
                                <div className="space-y-4">
                                    {[...analytics.topic_breakdown].sort((a, b) => b.accuracy - a.accuracy).map((item, idx) => {
                                        const isWeak = item.accuracy < 65;
                                        const isStrong = item.accuracy >= 80;
                                        return (
                                            <div key={idx} className="space-y-2">
                                                <div className="flex justify-between items-center text-xs">
                                                    <div className="flex items-center gap-2">
                                                        {isWeak ? <XCircle size={13} className="text-red-400 shrink-0" /> : isStrong ? <CheckCircle2 size={13} className="text-emerald-400 shrink-0" /> : <TrendingUp size={13} className="text-amber-400 shrink-0" />}
                                                        <span className="text-gray-200 font-semibold">{item.topic}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`font-bold ${isWeak ? 'text-red-400' : isStrong ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                            {item.accuracy}%
                                                        </span>
                                                        <MasteryBadge accuracy={item.accuracy} />
                                                    </div>
                                                </div>
                                                <div className="w-full h-2.5 bg-gray-800 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-700 ${isWeak ? 'bg-gradient-to-r from-red-600 to-rose-500' : isStrong ? 'bg-gradient-to-r from-emerald-600 to-teal-500' : 'bg-gradient-to-r from-amber-500 to-yellow-400'}`}
                                                        style={{ width: `${Math.max(item.accuracy, 4)}%` }}
                                                    />
                                                </div>
                                                <div className="text-[10px] text-gray-600">{item.total_questions} questions attempted · {item.attempts} quiz session{item.attempts !== 1 ? 's' : ''}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Action Plan */}
                        <div className="space-y-4">
                            {/* What to do next */}
                            <div className="p-6 bg-gray-900 border border-gray-800 rounded-2xl space-y-4">
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    <Lightbulb size={18} className="text-yellow-400" />
                                    What Should I Study Next?
                                </h3>

                                {realWeakTopics.length > 0 ? (
                                    <div className="space-y-3">
                                        <div className="p-4 bg-red-950/40 border border-red-800/60 rounded-xl space-y-1">
                                            <div className="flex items-center gap-2 text-red-300 font-bold text-xs">
                                                <Flame size={14} className="text-red-400" />
                                                Priority: Review These Weak Topics
                                            </div>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {realWeakTopics.map((t, i) => (
                                                    <span key={i} className="px-2.5 py-1 bg-red-900/50 border border-red-700 text-red-200 text-[11px] font-semibold rounded-lg">{t}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => generateQuiz('Medium', realWeakTopics[0])}
                                            className="w-full py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-950/40 transition flex items-center justify-center gap-2"
                                        >
                                            <Target size={16} /> Practice Quiz on "{realWeakTopics[0]}"
                                        </button>
                                    </div>
                                ) : (
                                    <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-xs text-emerald-300 font-medium flex items-center gap-2">
                                        <Star size={16} className="text-emerald-400 shrink-0" />
                                        Great job! No weak topics detected. Challenge yourself with Hard or Exam mode quizzes.
                                    </div>
                                )}

                                {strongTopics.length > 0 && (
                                    <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl">
                                        <div className="text-[11px] font-bold text-emerald-400 mb-1.5">✅ Topics You've Mastered:</div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {strongTopics.map((t, i) => (
                                                <span key={i} className="px-2 py-0.5 bg-emerald-900/40 border border-emerald-700 text-emerald-300 text-[10px] font-semibold rounded">{t}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* AI Tips */}
                            <div className="p-5 bg-gray-900 border border-gray-800 rounded-2xl space-y-3">
                                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                    <ArrowRight size={16} className="text-purple-400" /> Study Tips
                                </h4>
                                <div className="space-y-2">
                                    {analytics.recommendations.map((rec, idx) => (
                                        <div key={idx} className="p-3 bg-gray-950 border border-gray-800 rounded-xl text-xs text-gray-300 font-medium leading-relaxed flex items-start gap-2">
                                            <Info size={13} className="text-purple-400 shrink-0 mt-0.5" />
                                            {rec}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* RAG Benchmark - collapsible with explanations */}
            {evalResults && showBenchmarkInfo && (
                <div className="p-6 bg-gray-900 border border-purple-800/60 rounded-2xl space-y-5">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <Zap size={18} className="text-purple-400" />
                                AI Document Search Quality Check
                            </h3>
                            <p className="text-[11px] text-gray-400 mt-0.5">How accurately is the AI finding and using your document content to answer questions?</p>
                        </div>
                        <div className="text-right">
                            <div className="text-[11px] text-gray-500">Completed in {evalResults.summary_metrics.evaluation_duration_sec}s</div>
                            <button onClick={() => setShowBenchmarkInfo(false)} className="text-[11px] text-gray-600 hover:text-gray-400 mt-0.5">Hide</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <BenchmarkExplainer
                            label="Document Hit Rate"
                            value={evalResults.summary_metrics.hit_rate_at_k * 100}
                            description="% of queries where the AI found at least one relevant section from your documents. 100% means the AI always found relevant content."
                            color="text-purple-400"
                            icon={Target}
                            isPercent={true}
                        />
                        <BenchmarkExplainer
                            label="Answer Quality (MRR)"
                            value={evalResults.summary_metrics.mrr}
                            description="Mean Reciprocal Rank — how quickly the AI finds the best matching document section. Score of 1.0 means it always finds the right section first."
                            color="text-blue-400"
                            icon={TrendingUp}
                            isPercent={false}
                        />
                        <BenchmarkExplainer
                            label="Answer Faithfulness"
                            value={evalResults.summary_metrics.faithfulness_score * 100}
                            description="How closely AI answers stick to your actual document content, avoiding hallucinations. 90%+ means answers are well-grounded in your material."
                            color="text-emerald-400"
                            icon={CheckCircle2}
                            isPercent={true}
                        />
                        <BenchmarkExplainer
                            label="Context Relevance"
                            value={evalResults.summary_metrics.context_relevance_score * 100}
                            description="How relevant the retrieved document sections are to the question asked. Higher means the AI pulls the most relevant parts of your document."
                            color="text-amber-400"
                            icon={Star}
                            isPercent={true}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnalyticsDashboard;
