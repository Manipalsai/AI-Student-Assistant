import { useState } from 'react';
import { useStudy } from '../../context/StudyContext';
import DocumentSelectorDropdown from '../../components/DocumentSelectorDropdown';
import { Calendar, Clock, Sparkles, CheckCircle2, Circle, Award, ArrowRight } from 'lucide-react';

const StudyPlan = () => {
    const { studyPlan, generateStudyPlan, loading } = useStudy();

    const defaultDate = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    const [subject, setSubject] = useState('');
    const [examDate, setExamDate] = useState(defaultDate);
    const [dailyHours, setDailyHours] = useState(2.0);
    const [currentLevel, setCurrentLevel] = useState('Intermediate');
    const [completedTasks, setCompletedTasks] = useState({});

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!subject || !examDate) return;
        generateStudyPlan({
            subject,
            exam_date: examDate,
            daily_hours: parseFloat(dailyHours),
            current_level: currentLevel
        });
    };

    const toggleTask = (dayIdx, taskIdx) => {
        const key = `${dayIdx}_${taskIdx}`;
        setCompletedTasks(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-900/60 p-6 rounded-2xl border border-gray-800 backdrop-blur">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-600/20 border border-indigo-500/40 rounded-xl text-indigo-400">
                        <Calendar size={28} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">AI Study Plan & Exam Roadmap Generator</h2>
                        <p className="text-xs text-gray-400">
                            Create an optimized daily study schedule aligned with your exam target and document syllabus.
                        </p>
                    </div>
                </div>

                <DocumentSelectorDropdown label="Scope:" />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="p-6 bg-gray-900 border border-gray-800 rounded-2xl space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-2">Subject / Exam Title</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Machine Learning Final"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="w-full px-4 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-sm text-white focus:border-indigo-500 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-2">Exam Date / Target Deadline</label>
                        <input
                            type="date"
                            required
                            value={examDate}
                            onChange={(e) => setExamDate(e.target.value)}
                            className="w-full px-4 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-sm text-white focus:border-indigo-500 focus:outline-none color-scheme-dark"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-2">Daily Study Time (Hours)</label>
                        <select
                            value={dailyHours}
                            onChange={(e) => setDailyHours(e.target.value)}
                            className="w-full px-4 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-sm text-white focus:border-indigo-500 focus:outline-none"
                        >
                            <option value={1.0}>1 Hour / day</option>
                            <option value={2.0}>2 Hours / day</option>
                            <option value={3.0}>3 Hours / day</option>
                            <option value={4.0}>4+ Hours / day</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-2">Current Confidence Level</label>
                        <select
                            value={currentLevel}
                            onChange={(e) => setCurrentLevel(e.target.value)}
                            className="w-full px-4 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-sm text-white focus:border-indigo-500 focus:outline-none"
                        >
                            <option value="Beginner">Beginner (Starting fresh)</option>
                            <option value="Intermediate">Intermediate (Reviewed basic notes)</option>
                            <option value="Advanced">Advanced (Final revision)</option>
                        </select>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-950/40 transition flex items-center gap-2 disabled:opacity-50"
                    >
                        <Sparkles size={16} /> {loading ? 'Generating Schedule...' : 'Generate AI Study Roadmap'}
                    </button>
                </div>
            </form>

            {/* Generated Plan Display */}
            {studyPlan && (
                <div className="space-y-6">
                    <div className="p-6 bg-gray-900 border border-indigo-800/60 rounded-2xl space-y-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-extrabold text-white">{studyPlan.title}</h3>
                                <p className="text-xs text-gray-400 mt-1">{studyPlan.overview}</p>
                            </div>
                            <span className="px-3 py-1 bg-indigo-950 border border-indigo-700 text-indigo-300 text-xs font-bold rounded-full">
                                Target Date: {examDate}
                            </span>
                        </div>
                    </div>

                    {/* Schedule Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {studyPlan.daily_schedule?.map((day, dIdx) => (
                            <div key={dIdx} className="p-6 bg-gray-900 border border-gray-800 rounded-2xl space-y-4 relative overflow-hidden">
                                <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 font-bold text-xs flex items-center justify-center">
                                            D{day.day}
                                        </span>
                                        <h4 className="font-bold text-sm text-white">{day.focus_topic}</h4>
                                    </div>
                                    <span className="text-xs text-gray-400 flex items-center gap-1 font-medium">
                                        <Clock size={14} /> {day.duration_minutes} mins
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    <div className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">Target Daily Tasks</div>
                                    <ul className="space-y-2">
                                        {day.tasks?.map((task, tIdx) => {
                                            const isDone = completedTasks[`${dIdx}_${tIdx}`];
                                            return (
                                                <li
                                                    key={tIdx}
                                                    onClick={() => toggleTask(dIdx, tIdx)}
                                                    className="flex items-start gap-2.5 text-xs text-gray-300 cursor-pointer group"
                                                >
                                                    <button className="mt-0.5 text-gray-500 group-hover:text-indigo-400">
                                                        {isDone ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Circle size={16} />}
                                                    </button>
                                                    <span className={isDone ? 'line-through text-gray-500' : ''}>{task}</span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>

                                <div className="pt-2 text-[11px] text-gray-400 border-t border-gray-800 font-medium">
                                    🎯 <span className="font-semibold text-gray-200">Goal:</span> {day.key_goal}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Exam Day Strategy */}
                    {studyPlan.exam_day_tips && (
                        <div className="p-6 bg-gradient-to-r from-gray-900 to-indigo-950 border border-indigo-800/80 rounded-2xl space-y-3">
                            <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                <Award size={18} className="text-yellow-400" /> Exam Day Strategic Advice
                            </h4>
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-300 font-medium">
                                {studyPlan.exam_day_tips.map((tip, idx) => (
                                    <li key={idx} className="flex items-center gap-2">
                                        <ArrowRight size={14} className="text-indigo-400 shrink-0" />
                                        <span>{tip}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default StudyPlan;
