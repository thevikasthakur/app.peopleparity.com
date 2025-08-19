import React, { useState } from 'react';
import { X, Search, Clock, FolderOpen, Hash, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TaskSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (task: string, projectId?: string) => void;
  mode: 'client' | 'command';
}

const recentTasks = {
  client: [
    "Implementing user authentication",
    "Fixing that annoying bug in production",
    "Building the dashboard UI",
    "Optimizing database queries",
    "Writing unit tests (finally!)"
  ],
  command: [
    "Daily standup meeting",
    "Code review for PR #42",
    "Team brainstorming session",
    "Researching new technologies",
    "Updating documentation"
  ]
};

const projects = [
  { id: 'proj-1', name: 'Main Product', emoji: '🚀' },
  { id: 'proj-2', name: 'Mobile App', emoji: '📱' },
  { id: 'proj-3', name: 'API Server', emoji: '🔧' },
  { id: 'proj-4', name: 'Admin Dashboard', emoji: '📊' },
];

const funnyPlaceholders = {
  client: [
    "What masterpiece are you creating today?",
    "Describe your coding adventure...",
    "What bugs are you hunting?",
    "Building something awesome?"
  ],
  command: [
    "What 'important' meeting now?",
    "Describe this non-coding adventure...",
    "What are you up to?",
    "Admin stuff, but make it sound cool..."
  ]
};

export function TaskSelector({ isOpen, onClose, onSelect, mode }: TaskSelectorProps) {
  const [task, setTask] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const placeholder = funnyPlaceholders[mode][Math.floor(Math.random() * funnyPlaceholders[mode].length)];
  const filteredTasks = recentTasks[mode].filter(t => 
    t.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = () => {
    if (!task.trim()) return;
    
    if (mode === 'client' && !selectedProject) {
      return;
    }
    
    onSelect(task, selectedProject || undefined);
    setTask('');
    setSelectedProject('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl"
          >
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">
                    {mode === 'client' ? '🎯 What are you building?' : '📋 What are you up to?'}
                  </h2>
                  <p className="text-sm text-muted mt-1">
                    {mode === 'client' 
                      ? "Time to show that code who's the boss!"
                      : "Because not everything is about coding..."}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Task Input */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    <Sparkles className="w-4 h-4 inline mr-1" />
                    What's the mission?
                  </label>
                  <textarea
                    value={task}
                    onChange={(e) => setTask(e.target.value)}
                    placeholder={placeholder}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
                    rows={3}
                    autoFocus
                  />
                </div>

                {/* Project Selection (Client Mode Only) */}
                {mode === 'client' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      <FolderOpen className="w-4 h-4 inline mr-1" />
                      Which project?
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {projects.map((project) => (
                        <button
                          key={project.id}
                          onClick={() => setSelectedProject(project.id)}
                          className={`
                            p-3 rounded-lg border-2 transition-all text-left
                            ${selectedProject === project.id
                              ? 'border-primary bg-primary/10'
                              : 'border-gray-200 hover:border-gray-300'
                            }
                          `}
                        >
                          <span className="text-lg mr-2">{project.emoji}</span>
                          <span className="font-medium">{project.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Tasks */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Recent activities
                  </label>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search recent tasks..."
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {filteredTasks.map((recentTask, index) => (
                      <button
                        key={index}
                        onClick={() => setTask(recentTask)}
                        className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 transition-colors text-sm"
                      >
                        <Hash className="w-3 h-3 inline mr-2 text-gray-400" />
                        {recentTask}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!task.trim() || (mode === 'client' && !selectedProject)}
                    className={`
                      flex-1 px-4 py-2 rounded-lg font-medium transition-all
                      ${task.trim() && (mode === 'command' || selectedProject)
                        ? 'bg-gradient-to-r from-primary to-secondary text-white hover:shadow-lg'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }
                    `}
                  >
                    {mode === 'client' ? "Let's Code! 🚀" : "Let's Go! 📋"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}