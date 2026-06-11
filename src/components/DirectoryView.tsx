import React, { useState } from "react";
import { 
  Search, 
  Plus, 
  CheckCircle, 
  BookOpen, 
  HelpCircle, 
  Layers, 
  Trash2, 
  Filter, 
  UserPlus, 
  Sparkles 
} from "lucide-react";
import { Category, Expression } from "../data/expressions";
import { motion, AnimatePresence } from "motion/react";

interface DirectoryViewProps {
  categories: Category[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onAddCustom: (categoryId: string, text: string, difficulty: "Beginner" | "Intermediate" | "Advanced", example: string) => void;
  onDeleteCustom: (id: string) => void;
}

export default function DirectoryView({
  categories,
  selectedIds,
  onToggleSelect,
  onAddCustom,
  onDeleteCustom
}: DirectoryViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  
  // Custom expression form state
  const [showAddForm, setShowAddForm] = useState<string | null>(null); // categoryId
  const [customText, setCustomText] = useState("");
  const [customDiff, setCustomDiff] = useState<"Beginner" | "Intermediate" | "Advanced">("Intermediate");
  const [customExample, setCustomExample] = useState("");
  
  // Dialog snippet modal state
  const [activeDialogue, setActiveDialogue] = useState<Expression | null>(null);

  const handleCreateCustom = (catId: string) => {
    if (!customText.trim()) return;
    
    // Auto-generate realistic example dialogue if user leaves it empty
    const testExample = customExample.trim() || `A: How do you address this issue?\nB: ${customText.trim()} we must explore all options before deciding.`;
    
    onAddCustom(catId, customText.trim(), customDiff, testExample);
    setCustomText("");
    setCustomExample("");
    setCustomDiff("Intermediate");
    setShowAddForm(null);
  };

  // Filter logic
  const filteredCategories = categories.map(cat => {
    if (selectedCategory !== "all" && cat.id !== selectedCategory) {
      return null;
    }

    const filteredAndSearchedExps = cat.expressions.filter(exp => {
      // Search matches Text or Subcategory or Example
      const matchesSearch = exp.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (exp.subcategory && exp.subcategory.toLowerCase().includes(searchQuery.toLowerCase())) ||
        exp.example.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesDifficulty = selectedDifficulty === "all" || exp.difficulty === selectedDifficulty;
      const matchesSource = selectedSource === "all" || exp.source === selectedSource;
      const matchesProfile = selectedSource === "profile" ? selectedIds.includes(exp.id) : true;

      return matchesSearch && matchesDifficulty && matchesSource && matchesProfile;
    });

    return {
      ...cat,
      expressions: filteredAndSearchedExps
    };
  }).filter((c): c is Category => c !== null && c.expressions.length > 0);

  const getDifficultyBadgeColor = (diff: string) => {
    switch (diff) {
      case "Beginner": return "bg-[#70FF94] text-black border-black font-black uppercase text-[9px]";
      case "Intermediate": return "bg-[#00D1FF] text-black border-black font-black uppercase text-[9px]";
      case "Advanced": return "bg-[#FF90E8] text-black border-black font-black uppercase text-[9px]";
      default: return "bg-gray-100 text-black border-black font-black uppercase text-[9px]";
    }
  };

  const catColorMap: Record<string, string> = {
    "stating-position": "#FFE200",     // Yellow
    "conceding": "#FF90E8",            // Pink
    "responding": "#00D1FF",           // Cyan
    "reaching-consensus": "#70FF94",   // Light Green
    "fillers": "#FF4100",              // Accent Red-Orange
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* Sidebar Filters */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white border-2 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-none sticky top-6">
          <div className="flex items-center gap-2 mb-4 font-black uppercase text-xs tracking-wider border-b-2 border-black pb-3 text-black" id="filters-header">
            <Filter className="w-4 h-4 text-black" />
            <span>Customize Directory</span>
          </div>

          {/* Search */}
          <div className="space-y-2 mb-5">
            <label className="text-[10px] font-black text-black uppercase tracking-widest block">Search Expressions</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-black opacity-60" />
              <input
                id="search-input"
                type="text"
                placeholder="Search text, dialogues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border-2 border-black pl-9 pr-4 py-2.5 text-xs font-bold text-black focus:outline-none focus:ring-0 rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              />
            </div>
          </div>

          {/* Category SELECT Filter */}
          <div className="space-y-2 mb-5">
            <label className="text-[10px] font-black text-black uppercase tracking-widest block">Major Category</label>
            <select
              id="category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-white border-2 border-black p-2.5 text-xs font-bold text-black focus:outline-none focus:ring-0 rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
            >
              <option value="all">All Groups</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>

          {/* Difficulty Filter */}
          <div className="space-y-2 mb-5">
            <label className="text-[10px] font-black text-black uppercase tracking-widest block">Speaking Level</label>
            <div className="grid grid-cols-2 gap-2">
              {["all", "Beginner", "Intermediate", "Advanced"].map((diff) => (
                <button
                  id={`diff-btn-${diff}`}
                  key={diff}
                  onClick={() => setSelectedDifficulty(diff)}
                  className={`text-[10px] py-2 border-2 border-black text-center transition-all cursor-pointer font-black uppercase rounded-none ${
                    selectedDifficulty === diff
                      ? "bg-[#FFE200] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                      : "bg-white text-black opacity-75 hover:opacity-100"
                  }`}
                >
                  {diff === "all" ? "All Levels" : diff}
                </button>
              ))}
            </div>
          </div>

          {/* Source/Study Filters */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-black uppercase tracking-widest block">Selection State</label>
            <div className="flex flex-col gap-1.5">
              {[
                { id: "all", label: "All Expressions" },
                { id: "profile", label: "My Selected Portfolio" },
                { id: "default", label: "Official Curated" },
                { id: "custom", label: "My Custom Phrases" }
              ].map((src) => (
                <button
                  id={`src-btn-${src.id}`}
                  key={src.id}
                  onClick={() => setSelectedSource(src.id)}
                  className={`text-xs py-2 px-3 border-2 transition-all cursor-pointer text-left uppercase font-black rounded-none ${
                    selectedSource === src.id
                      ? "bg-black text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                      : "bg-white text-black border-transparent hover:bg-slate-100"
                  }`}
                >
                  {src.label} {src.id === "profile" && `(${selectedIds.length})`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Expression Groups List */}
      <div className="lg:col-span-3 space-y-10">
        <AnimatePresence mode="popLayout">
          {filteredCategories.length === 0 ? (
            <motion.div 
              id="empty-results"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-white border-2 border-black p-12 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-none"
            >
              <HelpCircle className="w-12 h-12 text-black mx-auto mb-4" />
              <h3 className="text-lg font-serif font-black uppercase text-black mb-1">No matching expressions found</h3>
              <p className="text-xs text-slate-700 font-semibold">Try loosening your search filters or add some custom expressions of your own!</p>
            </motion.div>
          ) : (
            filteredCategories.map((category) => (
              <motion.section
                id={`cat-section-${category.id}`}
                key={category.id}
                layoutId={`sec-${category.id}`}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-none flex flex-col overflow-hidden"
              >
                {/* Section Header */}
                <div 
                  className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-black p-5"
                  style={{ backgroundColor: `${catColorMap[category.id] || "#FFE200"}` }}
                >
                  <div className="space-y-1.5 text-black">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[9px] text-black font-black uppercase tracking-wider bg-white border-2 border-black px-2 py-0.5 rounded-none">
                        Section {category.section}
                      </span>
                      <span className="text-[9px] font-black uppercase tracking-widest text-black opacity-80 font-sans">STUDY UNIT</span>
                    </div>
                    <h2 className="text-xl md:text-2xl font-serif text-black font-black uppercase tracking-tight">{category.title}</h2>
                    <p className="text-xs text-black leading-relaxed max-w-2xl font-bold opacity-80">{category.description}</p>
                  </div>

                  <button
                    id={`add-custom-btn-${category.id}`}
                    onClick={() => setShowAddForm(showAddForm === category.id ? null : category.id)}
                    className="flex items-center gap-1.5 text-[10px] border-2 border-black bg-white hover:bg-[#F1F1F1] font-black uppercase rounded-none px-3.5 py-2 transition-all text-black cursor-pointer whitespace-nowrap self-start shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Custom</span>
                  </button>
                </div>

                {/* Custom Expression input form */}
                {showAddForm === category.id && (
                  <motion.div 
                    id={`add-custom-form-${category.id}`}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-[#FAFAF8] p-5 border-b-2 border-black space-y-4"
                  >
                    <h4 className="text-[10px] font-black text-black uppercase tracking-wider flex items-center gap-1.5">
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Add Expression to {category.title}</span>
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2 space-y-1">
                        <label className="text-[10px] font-black text-slate-700 uppercase">Expression Text *</label>
                        <input
                          id={`input-text-${category.id}`}
                          type="text"
                          placeholder="e.g., In my view, there is a catch..."
                          value={customText}
                          onChange={(e) => setCustomText(e.target.value)}
                          className="w-full bg-white border-2 border-black p-2.5 text-xs font-bold text-black focus:outline-none focus:ring-0 rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-700 uppercase">Speaking Level</label>
                        <select
                          id={`select-diff-${category.id}`}
                          value={customDiff}
                          onChange={(e) => setCustomDiff(e.target.value as any)}
                          className="w-full bg-white border-2 border-black p-2.5 text-xs font-bold text-black focus:outline-none focus:ring-0 rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                        >
                          <option value="Beginner">Beginner</option>
                          <option value="Intermediate">Intermediate</option>
                          <option value="Advanced">Advanced</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-700 uppercase">Example Dialogue Snippet (Optional - leave blank for auto-generation)</label>
                      <textarea
                        id={`input-example-${category.id}`}
                        rows={2}
                        placeholder="A: What are your thoughts?&#10;B: In my view..."
                        value={customExample}
                        onChange={(e) => setCustomExample(e.target.value)}
                        className="w-full bg-white border-2 border-black p-2 text-xs focus:outline-none focus:ring-0 rounded-none font-mono text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                      />
                    </div>

                    <div className="flex justify-end gap-2.5 pt-2">
                      <button
                        id={`cancel-custom-btn-${category.id}`}
                        type="button"
                        onClick={() => setShowAddForm(null)}
                        className="text-xs px-3.5 py-1.5 border-2 border-transparent hover:border-black rounded-none text-black uppercase font-black transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        id={`save-custom-btn-${category.id}`}
                        type="button"
                        onClick={() => handleCreateCustom(category.id)}
                        disabled={!customText.trim()}
                        className="text-xs px-4 py-1.5 bg-[#70FF94] hover:bg-[#4dfc79] disabled:opacity-50 text-black border-2 border-black font-black uppercase tracking-wider rounded-none transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                      >
                        Save Expression
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Grid of Expressions */}
                <div className="grid grid-cols-1 md:grid-cols-2 p-5 gap-4">
                  {category.expressions.map((expression) => {
                    const isSelected = selectedIds.includes(expression.id);
                    const catHue = catColorMap[category.id] || "#FFE200";
                    return (
                      <div
                        id={`card-exp-${expression.id}`}
                        key={expression.id}
                        style={{
                          backgroundColor: isSelected ? `${catHue}15` : "#FFFFFF"
                        }}
                        className={`group relative border-2 border-black p-4 transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between`}
                      >
                        {/* Selector checkbox */}
                        <div className="flex items-start justify-between gap-3">
                          <label className="flex items-start gap-3 cursor-pointer select-none flex-1">
                            <input
                              id={`check-exp-${expression.id}`}
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => onToggleSelect(expression.id)}
                              className="w-4 h-4 mt-1 border-2 border-black text-black rounded-none focus:ring-0 cursor-pointer accent-black shrink-0"
                            />
                            <div className="space-y-1">
                              <span className="font-mono text-xs font-black text-black tracking-tight select-all">
                                {expression.text}
                              </span>
                              {expression.subcategory && (
                                <div className="text-[9px] font-black text-black uppercase tracking-widest opacity-60">
                                  {expression.subcategory}
                                </div>
                              )}
                            </div>
                          </label>

                          <div className="flex items-center gap-1.5">
                            {/* Level Badge */}
                            <span className={`text-[9px] px-2 py-0.5 rounded-none border-2 border-black font-black leading-none ${getDifficultyBadgeColor(expression.difficulty)}`}>
                              {expression.difficulty}
                            </span>

                            {/* Custom label and delete */}
                            {expression.source === "custom" && (
                              <button
                                id={`del-exp-btn-${expression.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteCustom(expression.id);
                                }}
                                className="p-1 border-2 border-transparent hover:border-black hover:bg-[#FF4100]/20 text-black rounded-none transition-colors cursor-pointer"
                                title="Delete Custom Expression"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Dialogue preview expander */}
                        <div className="mt-3.5 pt-3 border-t-2 border-dashed border-black/30 flex items-center justify-between text-[10px] text-black font-bold">
                          <span className="flex items-center gap-1 opacity-70">
                            <BookOpen className="w-3 h-3 text-black" />
                            <span>COGNITIVE DIALOGUE</span>
                          </span>
                          <button
                            id={`view-dialogue-btn-${expression.id}`}
                            onClick={() => setActiveDialogue(expression)}
                            className="bg-white border-2 border-black hover:bg-[#F1F1F1] px-2 py-1 transition-all text-black text-[9px] font-black uppercase cursor-pointer shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] rounded-none"
                          >
                            View Dialogue
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.section>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Example dialogue Modal overlay */}
      {activeDialogue && (
        <div 
          id="dialogue-modal-root"
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in"
          onClick={() => setActiveDialogue(null)}
        >
          <motion.div
            id="dialogue-modal-body"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-white border-4 border-black w-full max-w-lg p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-4 rounded-none text-black"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-2 border-black pb-3" id="modal-header">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-black" />
                <h3 className="font-serif font-black uppercase text-black text-lg">Speaking Scenario</h3>
              </div>
              <span className={`text-[10px] px-2 py-0.5 border-2 border-black font-black rounded-none ${getDifficultyBadgeColor(activeDialogue.difficulty)}`}>
                {activeDialogue.difficulty}
              </span>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#1A1A1A] opacity-60">Target Expression</span>
                <p className="font-mono bg-black text-[#70FF94] text-xs md:text-sm py-3 px-4 border-2 border-black font-black tracking-tight select-all rounded-none">
                  {activeDialogue.text}
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#1A1A1A] opacity-60">Real-World Application Dialogue</span>
                <div className="bg-[#FAFAF8] border-2 border-black rounded-none p-4 space-y-2.5 font-mono text-xs text-black leading-relaxed max-h-60 overflow-y-auto shadow-[inset_2px_2px_0px_rgba(0,0,0,0.05)]">
                  {activeDialogue.example.split("\n").map((line, idx) => {
                    const isPartner = line.trim().startsWith("A:");
                    return (
                      <div key={idx} className={`flex gap-2 p-2.5 transition-all ${isPartner ? "border border-black bg-[#EAEAEA] font-bold text-black" : "border-2 border-black bg-[#FFE200]/25 font-black text-black"}`}>
                        <span className={`font-black ${isPartner ? "text-[#FF4100]" : "text-[#00D1FF]"}`}>
                          {isPartner ? "A:" : "B:"}
                        </span>
                        <span>{line.replace(/^[A-B]\s*:\s*/, "")}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3.5 border-t-2 border-black">
              <button
                id="modal-toggle-select-btn"
                onClick={() => {
                  onToggleSelect(activeDialogue.id);
                  setActiveDialogue(null);
                }}
                className={`text-[10px] px-4 py-2 border-2 border-black font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                  selectedIds.includes(activeDialogue.id)
                    ? "bg-[#70FF94]"
                    : "bg-white hover:bg-[#FFE200]"
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5 text-black" />
                <span>{selectedIds.includes(activeDialogue.id) ? "Selected in Portfolio" : "Add to Portfolio"}</span>
              </button>

              <button
                id="modal-close-btn"
                onClick={() => setActiveDialogue(null)}
                className="text-[10px] font-black uppercase text-black bg-[#F1F1F1] border-2 border-black hover:bg-[#EAEAEA] py-2 px-4 transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-none"
              >
                Dismiss Window
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
