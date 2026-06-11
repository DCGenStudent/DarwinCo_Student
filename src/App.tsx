import React, { useState, useEffect } from "react";
import { 
  BookOpen, 
  HelpCircle, 
  MessageSquare, 
  Award, 
  CheckCircle, 
  Bookmark, 
  TrendingUp, 
  GraduationCap, 
  User, 
  Cpu, 
  Activity 
} from "lucide-react";
import { DEFAULT_CATEGORIES, Expression, Category } from "./data/expressions";
import DirectoryView from "./components/DirectoryView";
import PracticeView from "./components/PracticeView";
import AIDiscussionView from "./components/AIDiscussionView";
import { motion, AnimatePresence } from "motion/react";

type TabID = "directory" | "practice" | "discuss";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabID>("directory");
  
  // Loaded state lists
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    try {
      const cached = localStorage.getItem("discussion_portfolio_selection");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [customExpressions, setCustomExpressions] = useState<Expression[]>(() => {
    try {
      const cached = localStorage.getItem("discussion_custom_expressions");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  // Verify connection variables
  const [hasApiKey, setHasApiKey] = useState(true);

  useEffect(() => {
    // Check if Gemini API Key exists server-side to guide users
    const verifyConfig = async () => {
      try {
        const response = await fetch("/api/config");
        const data = await response.json();
        setHasApiKey(data.hasApiKey);
      } catch (e) {
        console.warn("Could not retrieve config details from server. Standalone fallback applied.", e);
      }
    };
    verifyConfig();
  }, []);

  // Sync to local storage
  const handleToggleSelect = (id: string) => {
    let updated: string[];
    if (selectedIds.includes(id)) {
      updated = selectedIds.filter(sid => sid !== id);
    } else {
      updated = [...selectedIds, id];
    }
    setSelectedIds(updated);
    localStorage.setItem("discussion_portfolio_selection", JSON.stringify(updated));
  };

  const handleAddCustom = (
    categoryId: string, 
    text: string, 
    difficulty: "Beginner" | "Intermediate" | "Advanced", 
    example: string
  ) => {
    const newExp: Expression = {
      id: `custom-${Date.now()}`,
      text,
      category: categoryId,
      example,
      difficulty,
      source: "custom"
    };
    const updated = [...customExpressions, newExp];
    setCustomExpressions(updated);
    localStorage.setItem("discussion_custom_expressions", JSON.stringify(updated));
  };

  const handleDeleteCustom = (id: string) => {
    const updatedCustoms = customExpressions.filter(e => e.id !== id);
    setCustomExpressions(updatedCustoms);
    localStorage.setItem("discussion_custom_expressions", JSON.stringify(updatedCustoms));
    
    if (selectedIds.includes(id)) {
      const updatedSels = selectedIds.filter(sid => sid !== id);
      setSelectedIds(updatedSels);
      localStorage.setItem("discussion_portfolio_selection", JSON.stringify(updatedSels));
    }
  };

  // Merge static default categories with user-entered custom ones
  const mergedCategories: Category[] = DEFAULT_CATEGORIES.map(category => {
    const customForThisCat = customExpressions.filter(e => e.category === category.id);
    return {
      ...category,
      expressions: [...category.expressions, ...customForThisCat]
    };
  });

  const totalExpressionsList = [
    ...DEFAULT_CATEGORIES.flatMap(c => c.expressions),
    ...customExpressions
  ];

  const selectedExpressionsList = totalExpressionsList.filter(e => selectedIds.includes(e.id));

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1A1A1A] font-sans selection:bg-black selection:text-white flex flex-col justify-between p-4 md:p-6 gap-6">
      {/* Top Banner Applet Notice (Only if Gemini Server Key is not set) */}
      {!hasApiKey && (
        <div id="missing-key-banner" className="bg-[#FF4100] text-white text-xs font-black px-4 py-3 text-center flex items-center justify-center gap-2 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <Activity className="w-4 h-4 animate-pulse shrink-0" />
          <span>
            API KEY NOTICE: <strong className="underline">GEMINI_API_KEY</strong> environment variable is not defined. Please configure secrets in <strong>Settings &gt; Secrets</strong> to unlock the AI Partner.
          </span>
        </div>
      )}

      <div className="flex-1 flex flex-col gap-6">
        {/* Main Header / Navigation */}
        <header className="flex flex-col md:flex-row md:items-end justify-between border-b-2 border-black pb-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#FFE200] text-black flex items-center justify-center border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-black">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div className="space-y-0.5">
              <h1 className="text-3xl md:text-4xl font-serif font-black uppercase tracking-tighter text-black">Rhetoric Forge</h1>
              <p className="text-xs font-medium opacity-70 italic font-serif">
                Fluid, confident English expressions for academic and professional dialogue.
              </p>
            </div>
          </div>

          {/* Header Mini Statistics Dashboard */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono" id="header-stats-panel">
            <div className="bg-white border-2 border-black px-3 py-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-[#1A1A1A] font-bold">
              <span className="text-[9px] font-sans font-black text-black block uppercase opacity-60">Selected Style Portfolio</span>
              <span className="font-mono text-xs">{selectedIds.length} / {totalExpressionsList.length}</span>
            </div>
            <div className="bg-white border-2 border-black px-3 py-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-[#1A1A1A] font-bold">
              <span className="text-[9px] font-sans font-black text-black block uppercase opacity-60">Added Custom Phrases</span>
              <span className="font-mono text-xs">{customExpressions.length}</span>
            </div>
          </div>
        </header>

        {/* Hero Segment */}
        <section className="border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-4" id="hero-segment">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 bg-[#70FF94] border-2 border-black px-3 py-1 text-[10px] font-black uppercase tracking-wider text-black">
              <Bookmark className="w-3.5 h-3.5" />
              <span>Standardized Academic & Business English</span>
            </div>
            <h2 className="text-2xl md:text-4xl font-serif font-black tracking-tighter uppercase text-black leading-none animate-fade-in">
              Harness Natural Discussion Phrasings to Drive Productive Consensus.
            </h2>
            <p className="text-xs md:text-sm text-slate-700 leading-relaxed max-w-3xl font-medium">
              Master 80+ curated phrases for stating positions, conceding, responding (agreeing, disagreeing, clarifying), and finding common ground. Perfect for IELTS, TOEFL, work presentations, and academic debate assemblies.
            </p>
          </div>

          {/* Tab navigation buttons */}
          <div className="flex bg-[#F1F1F1] p-1 border-2 border-black w-full max-w-lg mt-2" id="main-tab-nav">
            {[
              { id: "directory", label: "Expressions Directory", icon: BookOpen, color: "#FFE200" },
              { id: "practice", label: "Study Quizzes", icon: HelpCircle, color: "#00D1FF" },
              { id: "discuss", label: "AI Debate Partner", icon: MessageSquare, color: "#FF90E8" }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  id={`nav-tab-${tab.id}`}
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    backgroundColor: isActive ? tab.color : "transparent",
                    borderColor: isActive ? "black" : "transparent"
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1 text-xs font-black uppercase tracking-wider border-2 transition-all cursor-pointer text-black ${
                    isActive 
                      ? "shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" 
                      : "opacity-75 hover:opacity-100"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="inline sm:hidden">{tab.label.split(" ")[0]}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Content Panel Container */}
        <main className="w-full flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              id={`tab-container-${activeTab}`}
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "directory" && (
                <DirectoryView
                  categories={mergedCategories}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                  onAddCustom={handleAddCustom}
                  onDeleteCustom={handleDeleteCustom}
                />
              )}

              {activeTab === "practice" && (
                <PracticeView
                  categories={mergedCategories}
                  allExpressions={totalExpressionsList}
                />
              )}

              {activeTab === "discuss" && (
                <AIDiscussionView
                  selectedExpressions={selectedExpressionsList}
                  allExpressions={totalExpressionsList}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Footer Details */}
      <footer className="flex flex-col sm:flex-row items-center justify-between border-t-2 border-black pt-4 pb-2 text-[10px] font-black uppercase tracking-widest text-[#1A1A1A]">
        <span>Study Material • Discussion Patterns</span>
        <span className="flex gap-4">
          <span>Session: Summer 2026</span>
          <span>Rhetoric Forge Workspace</span>
        </span>
      </footer>
    </div>
  );
}
