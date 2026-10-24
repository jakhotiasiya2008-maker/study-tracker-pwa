import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Star,
  Calendar,
  FileText,
  Flame,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { format, differenceInCalendarDays, parseISO, isValid } from 'date-fns';
import { useStore } from '../../store/useStore';
import type { Difficulty } from '../../types';

export const SubjectsView: React.FC = () => {
  const {
    subjects,
    topics,
    addSubject,
    deleteSubject,
    addTopic,
    bulkAddTopics,
    deleteTopic,
    toggleTopicHard,
  } = useStore();

  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(
    subjects.length > 0 ? subjects[0].id : null
  );

  // Add Subject Modal State
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [subName, setSubName] = useState('');
  const [subColor, setSubColor] = useState('#3B82F6');
  const [subExamDate, setSubExamDate] = useState(format(new Date(Date.now() + 86400000 * 20), 'yyyy-MM-dd'));
  const [subImportance, setSubImportance] = useState<number>(4);

  // Add Topic Modal State
  const [topicModalSubjectId, setTopicModalSubjectId] = useState<string | null>(null);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [topicName, setTopicName] = useState('');
  const [topicHours, setTopicHours] = useState<number>(2);
  const [topicDifficulty, setTopicDifficulty] = useState<Difficulty>('medium');
  const [topicIsHard, setTopicIsHard] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName.trim()) return;

    await addSubject({
      name: subName.trim(),
      color: subColor,
      examDate: subExamDate,
      importance: subImportance,
    });

    setSubName('');
    setShowAddSubject(false);
  };

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicModalSubjectId) return;

    if (isBulkMode) {
      if (!bulkText.trim()) return;
      await bulkAddTopics(topicModalSubjectId, bulkText);
      setBulkText('');
    } else {
      if (!topicName.trim()) return;
      await addTopic({
        subjectId: topicModalSubjectId,
        name: topicName.trim(),
        estimatedHours: Number(topicHours),
        difficulty: topicDifficulty,
        isHard: topicIsHard,
      });
      setTopicName('');
    }

    setTopicModalSubjectId(null);
  };

  const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#EF4444', '#06B6D4'];

  return (
    <div className="space-y-6 pb-24 max-w-3xl mx-auto px-4 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs uppercase tracking-wider font-bold text-blue-500 dark:text-blue-400">
            Curriculum & Exams
          </span>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Subjects & Topics
          </h1>
        </div>

        <button
          onClick={() => setShowAddSubject(true)}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/25 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Subject</span>
        </button>
      </div>

      {/* Subjects List */}
      <div className="space-y-4">
        {subjects.map((subject) => {
          const subjectTopics = topics.filter((t) => t.subjectId === subject.id);
          const completedCount = subjectTopics.filter((t) => t.status === 'completed').length;
          const totalHours = subjectTopics.reduce((sum, t) => sum + (t.estimatedHours || 1), 0);
          const isExpanded = expandedSubjectId === subject.id;

          let daysUntilExam: number | null = null;
          if (subject.examDate) {
            const parsed = parseISO(subject.examDate);
            if (isValid(parsed)) {
              daysUntilExam = differenceInCalendarDays(parsed, new Date());
            }
          }

          return (
            <div
              key={subject.id}
              className="rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/60 overflow-hidden shadow-sm transition-all"
            >
              {/* Subject Header Card */}
              <div
                onClick={() => setExpandedSubjectId(isExpanded ? null : subject.id)}
                className="p-5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <span
                      className="w-4 h-4 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: subject.color }}
                    />
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                        {subject.name}
                      </h2>
                      <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{subject.examDate}</span>
                        </span>
                        {daysUntilExam !== null && (
                          <span
                            className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                              daysUntilExam <= 7
                                ? 'bg-rose-500/10 text-rose-500'
                                : daysUntilExam <= 15
                                ? 'bg-amber-500/10 text-amber-500'
                                : 'bg-blue-500/10 text-blue-500'
                            }`}
                          >
                            {daysUntilExam <= 0 ? 'Exam Today!' : `in ${daysUntilExam} days`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {/* Importance Stars */}
                    <div className="flex items-center" title={`Importance: ${subject.importance}/5`}>
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star
                          key={idx}
                          className={`w-3.5 h-3.5 ${
                            idx < subject.importance
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-300 dark:text-slate-700'
                          }`}
                        />
                      ))}
                    </div>

                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                  <span>
                    {completedCount} / {subjectTopics.length} topics completed ({totalHours}h workload)
                  </span>
                  <span className="font-bold">
                    {subjectTopics.length > 0
                      ? Math.round((completedCount / subjectTopics.length) * 100)
                      : 0}
                    %
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      backgroundColor: subject.color,
                      width: `${
                        subjectTopics.length > 0 ? (completedCount / subjectTopics.length) * 100 : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* Topics Drawer */}
              {isExpanded && (
                <div className="p-5 bg-slate-50/70 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase font-extrabold tracking-wider text-slate-500">
                      Topics ({subjectTopics.length})
                    </span>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setTopicModalSubjectId(subject.id);
                          setIsBulkMode(true);
                        }}
                        className="flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Bulk Paste</span>
                      </button>

                      <button
                        onClick={() => {
                          setTopicModalSubjectId(subject.id);
                          setIsBulkMode(false);
                        }}
                        className="flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Topic</span>
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`Delete subject "${subject.name}" and all its topics?`)) {
                            deleteSubject(subject.id);
                          }
                        }}
                        aria-label="Delete Subject"
                        className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {subjectTopics.length === 0 ? (
                    <p className="text-xs text-slate-400 py-3 text-center">
                      No topics added yet. Add one or paste in bulk!
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {subjectTopics.map((topic) => (
                        <div
                          key={topic.id}
                          className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 shadow-xs"
                        >
                          <div className="min-w-0 pr-2">
                            <p
                              className={`text-xs font-bold text-slate-900 dark:text-slate-100 truncate ${
                                topic.status === 'completed' ? 'line-through text-slate-400' : ''
                              }`}
                            >
                              {topic.name}
                            </p>
                            <div className="flex items-center space-x-2 text-[10px] text-slate-500 mt-0.5">
                              <span>{topic.estimatedHours}h</span>
                              <span>•</span>
                              <span
                                className={`capitalize font-bold ${
                                  topic.difficulty === 'hard'
                                    ? 'text-rose-500'
                                    : topic.difficulty === 'medium'
                                    ? 'text-amber-500'
                                    : 'text-emerald-500'
                                }`}
                              >
                                {topic.difficulty}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1.5 shrink-0">
                            {/* Toggle Hard */}
                            <button
                              onClick={() => toggleTopicHard(topic.id)}
                              aria-label="Toggle Hard Topic status"
                              title={topic.isHard ? 'Topic is Hard (dense revisions)' : 'Mark as Hard'}
                              className={`p-1.5 rounded-xl transition-all ${
                                topic.isHard
                                  ? 'bg-rose-500/20 text-rose-500 font-bold'
                                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                              }`}
                            >
                              <Flame className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Topic */}
                            <button
                              onClick={() => deleteTopic(topic.id)}
                              aria-label="Delete Topic"
                              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Subject Modal */}
      {showAddSubject && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Add New Subject"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
        >
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 space-y-4">
            <h3 className="font-black text-lg text-white">Add New Subject</h3>

            <form onSubmit={handleCreateSubject} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Subject Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Organic Chemistry"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Exam Date</label>
                <input
                  type="date"
                  required
                  value={subExamDate}
                  onChange={(e) => setSubExamDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Importance (1 to 5)</label>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setSubImportance(lvl)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                        subImportance === lvl
                          ? 'bg-amber-500 border-amber-400 text-slate-900'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {lvl}★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Theme Color</label>
                <div className="flex items-center space-x-2">
                  {colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSubColor(c)}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${
                        subColor === c ? 'scale-125 border-white' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md active:scale-95 transition-all"
                >
                  Create Subject
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddSubject(false)}
                  className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold active:scale-95 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Topic / Bulk Paste Modal */}
      {topicModalSubjectId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={isBulkMode ? 'Bulk Add Topics' : 'Add Single Topic'}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
        >
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-lg text-white">
                {isBulkMode ? 'Bulk Add Topics' : 'Add Topic'}
              </h3>
              <button
                onClick={() => setIsBulkMode(!isBulkMode)}
                className="text-xs font-bold text-blue-400 hover:underline"
              >
                {isBulkMode ? 'Single mode' : 'Paste multiple lines'}
              </button>
            </div>

            <form onSubmit={handleCreateTopic} className="space-y-4">
              {isBulkMode ? (
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">
                    Paste topics (one per line):
                  </label>
                  <textarea
                    rows={5}
                    placeholder={"Introduction to Trees\nBinary Search Tree\nAVL Rotations"}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Default 2.0h estimated hours and Medium difficulty will be assigned.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Topic Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dynamic Programming"
                      value={topicName}
                      onChange={(e) => setTopicName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">
                      Estimated Hours ({topicHours}h)
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="6"
                      step="0.5"
                      value={topicHours}
                      onChange={(e) => setTopicHours(parseFloat(e.target.value))}
                      className="w-full accent-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Difficulty</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setTopicDifficulty(d)}
                          className={`py-2 rounded-xl text-xs font-bold capitalize border transition-all ${
                            topicDifficulty === d
                              ? 'bg-blue-600 border-blue-500 text-white'
                              : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="flex items-center space-x-2 cursor-pointer py-1">
                    <input
                      type="checkbox"
                      checked={topicIsHard}
                      onChange={(e) => setTopicIsHard(e.target.checked)}
                      className="rounded accent-rose-500 w-4 h-4"
                    />
                    <span className="text-xs text-slate-300 font-semibold">
                      Mark as Hard (schedules denser spaced revisions)
                    </span>
                  </label>
                </>
              )}

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md active:scale-95 transition-all"
                >
                  {isBulkMode ? 'Add All Topics' : 'Save Topic'}
                </button>
                <button
                  type="button"
                  onClick={() => setTopicModalSubjectId(null)}
                  className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold active:scale-95 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
