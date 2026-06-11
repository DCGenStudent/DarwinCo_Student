import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, 
  MessageSquare, 
  CheckCircle, 
  Send, 
  Award, 
  Lightbulb, 
  AlertCircle, 
  Check, 
  Layers, 
  Loader2, 
  Play, 
  X,
  RefreshCw,
  TrendingUp,
  HelpCircle
} from "lucide-react";
import { Expression } from "../data/expressions";
import { motion, AnimatePresence } from "motion/react";

interface AIDiscussionViewProps {
  selectedExpressions: Expression[];
  allExpressions: Expression[];
}

interface Message {
  role: "user" | "model";
  content: string;
  isInitial?: boolean;
}

interface EvaluationResult {
  score: number;
  expressionsUsedCount: number;
  expressionsUsed: {
    text: string;
    category: string;
    contextOk: boolean;
    quote: string;
  }[];
  fluencyFeedback: string;
  vocabularyTips: string;
  grammarCorrections: {
    original: string;
    corrected: string;
    explanation: string;
  }[];
  suggestedExpressions: string[];
}

const PREDEFINED_TOPICS = [
  "Is artificial intelligence causing a net positive impact on humanity's creative arts?",
  "Should companies implement a four-day workweek permanently?",
  "Is standardized testing an accurate representation of student academic potential?",
  "Should governments ban single-use plastics immediately instead of gradual reductions?",
];

export default function AIDiscussionView({ selectedExpressions, allExpressions }: AIDiscussionViewProps) {
  const [topic, setTopic] = useState(PREDEFINED_TOPICS[0]);
  const [isCustomTopic, setIsCustomTopic] = useState(false);
  const [customTopicText, setCustomTopicText] = useState("");
  
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userText, setUserText] = useState("");
  
  // Checking off tracker during the active sessions
  const [usedInSessionIds, setUsedInSessionIds] = useState<string[]>([]);
  
  // Loading flags
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<EvaluationResult | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // We determine what the focus list is:
  // If the user hasn't selected any in their profile, we fallback to a balanced set of 6 expressions to keep the screen friendly!
  const targetFocusList = selectedExpressions.length > 0 
    ? selectedExpressions 
    : allExpressions.slice(0, 8);

  // Scroll to bottom helper
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPartnerTyping]);

  // Clean expressions list for prompt matching
  const cleanFuzzyCheck = (msgText: string, expText: string): boolean => {
    const cleanExp = expText
      .toLowerCase()
      .replace(/\.{2,}/g, "") // remove triple dots ellipsis
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
      .trim();
    
    const cleanMsg = msgText
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
      .trim();

    return cleanMsg.includes(cleanExp);
  };

  // Inspect user's message to find matches in real-time
  const scanForExpressions = (text: string) => {
    const newlyUsedIds: string[] = [];
    targetFocusList.forEach(exp => {
      if (cleanFuzzyCheck(text, exp.text)) {
        if (!usedInSessionIds.includes(exp.id)) {
          newlyUsedIds.push(exp.id);
        }
      }
    });

    if (newlyUsedIds.length > 0) {
      setUsedInSessionIds(prev => [...prev, ...newlyUsedIds]);
    }
  };

  // Start the actual roleplay with Gemini!
  const handleStartSession = async () => {
    const activeTopic = isCustomTopic ? customTopicText.trim() : topic;
    if (!activeTopic) {
      setErrorText("Please specify a topic to debate.");
      return;
    }

    setIsSessionActive(true);
    setMessages([]);
    setUsedInSessionIds([]);
    setEvalResult(null);
    setErrorText(null);
    setIsPartnerTyping(true);

    try {
      const response = await fetch("/api/discuss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [],
          topic: activeTopic,
          focusExpressions: targetFocusList.map(e => e.text)
        })
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || "The server could not process the discussion.");
      }

      const data = await response.json();
      setMessages([{ role: "model", content: data.content, isInitial: true }]);
    } catch (e: any) {
      console.error(e);
      setErrorText(e.message || "Failed to start conversation. Please check your network connection.");
      setIsSessionActive(false);
    } finally {
      setIsPartnerTyping(false);
    }
  };

  // Dispatch individual user message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userText.trim() || isPartnerTyping) return;

    const currentMsg = userText.trim();
    scanForExpressions(currentMsg);
    
    const updatedMessages = [...messages, { role: "user" as const, content: currentMsg }];
    setMessages(updatedMessages);
    setUserText("");
    setIsPartnerTyping(true);
    setErrorText(null);

    const activeTopic = isCustomTopic ? customTopicText : topic;

    try {
      const response = await fetch("/api/discuss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          topic: activeTopic,
          focusExpressions: targetFocusList.map(e => e.text)
        })
      });

      if (!response.ok) {
        throw new Error("Unable to receive dialogue response from Partner.");
      }

      const data = await response.json();
      setMessages([...updatedMessages, { role: "model", content: data.content }]);
    } catch (err: any) {
      console.error(err);
      setErrorText("Discussion error: " + err.message);
    } finally {
      setIsPartnerTyping(false);
    }
  };

  // Turn in debate thread to Gemini for evaluation
  const handleEndAndEvaluate = async () => {
    if (messages.length < 2) {
      setErrorText("You need to exchange at least one turn before evaluation.");
      return;
    }

    setIsEvaluating(true);
    setErrorText(null);
    
    const activeTopic = isCustomTopic ? customTopicText : topic;

    try {
      const response = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          topic: activeTopic,
          targetExpressions: targetFocusList
        })
      });

      if (!response.ok) {
        throw new Error("Evaluation routine failed. Check connection parameters.");
      }

      const data = await response.json();
      setEvalResult(data);
    } catch (err: any) {
      console.error(err);
      setErrorText("Evaluation Error: " + err.message);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleReset = () => {
    setIsSessionActive(false);
    setMessages([]);
    setUsedInSessionIds([]);
    setEvalResult(null);
    setErrorText(null);
  };

  return (
    <div className="space-y-6 text-black">
      {/* Session Set-up State */}
      {!isSessionActive && (
        <div className="bg-white border-4 border-black p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-2xl mx-auto space-y-6 rounded-none" id="welcome-config-panel">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-[#00D1FF] text-black border-2 border-black rounded-full flex items-center justify-center mx-auto shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-serif font-black uppercase text-black">Initiate AI Speaking partner</h3>
            <p className="text-xs text-slate-700 font-bold max-w-md mx-auto">
              Simulate a high-scoring TOEFL/IELTS spoken dialogue or corporate meeting. Gemini will prompt you dynamically, assessing your phrasing fluency.
            </p>
          </div>

          <div className="space-y-4 pt-1">
            {/* Custom vs Preset Selection */}
            <div className="flex gap-4">
              <button
                id="preset-topic-choice-btn"
                onClick={() => setIsCustomTopic(false)}
                className={`flex-1 py-3 px-4 border-2 border-black text-xs font-black uppercase text-center transition-all cursor-pointer rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                  !isCustomTopic 
                    ? "bg-[#FFE200] text-black" 
                    : "bg-white text-black hover:bg-slate-50"
                }`}
              >
                Choose Curated Prompt
              </button>
              <button
                id="custom-topic-choice-btn"
                onClick={() => setIsCustomTopic(true)}
                className={`flex-1 py-3 px-4 border-2 border-black text-xs font-black uppercase text-center transition-all cursor-pointer rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                  isCustomTopic 
                    ? "bg-[#FFE200] text-black" 
                    : "bg-white text-black hover:bg-slate-50"
                }`}
              >
                Create Custom Subject
              </button>
            </div>

            {/* Sub-selectors */}
            {!isCustomTopic ? (
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-black uppercase tracking-wider block">Select Topic Subject</label>
                 <div className="space-y-2.5" id="predefined-topics-container">
                  {PREDEFINED_TOPICS.map((t, idx) => (
                    <button
                      id={`topic-btn-${idx}`}
                      key={idx}
                      onClick={() => setTopic(t)}
                      className={`w-full text-left p-3.5 text-xs border-2 border-black transition-all text-black flex items-start gap-2.5 cursor-pointer rounded-none ${
                        topic === t 
                          ? "bg-[#00D1FF] font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" 
                          : "bg-white hover:bg-slate-50"
                      }`}
                    >
                      <span className="font-mono text-black font-black">{idx + 1}.</span>
                      <span className="flex-1 leading-relaxed font-bold">{t}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-black uppercase tracking-wider block">Type custom debate/discussion prompt</label>
                <textarea
                  id="custom-topic-input"
                  rows={3}
                  placeholder="e.g. Should educational frameworks replace standard lectures with self-directed research modules?"
                  value={customTopicText}
                  onChange={(e) => setCustomTopicText(e.target.value)}
                  className="w-full bg-white border-2 border-black p-3 text-xs font-bold text-black focus:outline-none rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                />
              </div>
            )}

            {/* Focused Expressions count warning */}
            <div className="bg-[#FAFAF8] p-3.5 border-2 border-black flex gap-3 items-start text-xs text-black rounded-none">
              <Lightbulb className="w-5 h-5 text-black flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-black uppercase text-[10px] tracking-wide">Practice Portfolio Active</p>
                <p className="mt-0.5 font-semibold text-slate-700">
                  Tracking <strong className="text-black font-black">{targetFocusList.length} expressions</strong> in this run. 
                  {selectedExpressions.length === 0 && " (Showing standard prebuilt mix as your personal profile selection is currently empty)."}
                </p>
              </div>
            </div>

            {errorText && (
              <div className="bg-[#FF4100]/20 text-black p-3.5 border-2 border-black text-xs flex gap-2.5 items-center rounded-none" id="welcome-error">
                <AlertCircle className="w-4 h-4 text-[#FF4100] flex-shrink-0" />
                <span className="font-black">{errorText}</span>
              </div>
            )}

            <button
              id="start-discussion-btn"
              onClick={handleStartSession}
              className="w-full py-3 bg-[#70FF94] border-2 border-black text-black font-black flex items-center justify-center gap-2 hover:bg-[#4dfc79] transition-all cursor-pointer text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-none"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Launch Practice partner</span>
            </button>
          </div>
        </div>
      )}

      {/* Active Session Chat screen */}
      {isSessionActive && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chat Feed */}
          <div className="lg:col-span-2 flex flex-col bg-white border-2 border-black h-[600px] overflow-hidden relative rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            {/* Header */}
            <div className="p-4 border-b-2 border-black flex items-center justify-between bg-[#FAFAF8]" id="chat-header">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 bg-[#70FF94] border border-black rounded-full animate-ping"></div>
                <div className="space-y-0.5">
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest block font-black">IELTS Partner Simulation</span>
                  <span className="text-xs text-black font-black line-clamp-1 max-w-[320px] md:max-w-md">
                    Topic: "{isCustomTopic ? customTopicText : topic}"
                  </span>
                </div>
              </div>

              <button
                id="quit-session-btn"
                onClick={handleReset}
                className="p-1.5 border-2 border-transparent hover:border-black hover:bg-slate-100 rounded-none transition-all cursor-pointer"
                title="Exit Session"
              >
                <X className="w-4 h-4 text-black" />
              </button>
            </div>

            {/* Scrollable feed messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#FAFAF8]" id="chat-bubbles-container">
              {messages.map((m, idx) => {
                const isUser = m.role === "user";
                return (
                  <div
                    id={`message-bubble-${idx}`}
                    key={idx}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[85%] p-4 text-xs leading-relaxed space-y-1 rounded-none border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                      isUser 
                        ? "bg-black text-white" 
                        : "bg-white text-black"
                    }`}>
                      {!isUser && m.isInitial && (
                        <span className="text-[9px] uppercase tracking-wider font-black text-[#FF4100] block mb-1">Introduction Speech</span>
                      )}
                      <p className="whitespace-pre-line font-bold">{m.content}</p>
                    </div>
                  </div>
                );
              })}

              {isPartnerTyping && (
                <div className="flex justify-start" id="partner-typing-bubble">
                  <div className="bg-white border-2 border-black rounded-none p-4 flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <Loader2 className="w-3.5 h-3.5 text-black animate-spin" />
                    <span className="text-xs text-black font-bold">Discussion partner is drafting reply...</span>
                  </div>
                </div>
              )}

              {errorText && (
                <div className="bg-[#FF4100]/20 text-black p-3.5 rounded-none text-xs flex gap-2 border-2 border-black" id="chat-feed-error">
                  <AlertCircle className="w-4 h-4 text-[#FF4100] flex-shrink-0" />
                  <span className="font-black">{errorText}</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form at bottom */}
            <form onSubmit={handleSendMessage} className="p-4 border-t-2 border-black bg-white flex gap-2">
              <input
                id="user-chat-input"
                type="text"
                disabled={isPartnerTyping || isEvaluating}
                placeholder="Type your speaking response here... Use your target expressions!"
                value={userText}
                onChange={(e) => {
                  setUserText(e.target.value);
                }}
                className="flex-1 bg-[#FAFAF8] border-2 border-black px-4 text-xs font-bold text-black focus:outline-none placeholder-slate-500 disabled:opacity-50 rounded-none shadow-[inset_1.5px_1.5px_0px_rgba(0,0,0,0.05)]"
              />
              <button
                id="send-chat-btn"
                type="submit"
                disabled={!userText.trim() || isPartnerTyping || isEvaluating}
                className="w-10 h-10 bg-[#FFE200] border-2 border-black text-black hover:bg-[#FFE200]/95 transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center flex-shrink-0 rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                <Send className="w-3.5 h-3.5 fill-current text-black" />
              </button>
            </form>
          </div>

          {/* Right Sidebar: target checklist */}
          <div className="lg:col-span-1 flex flex-col bg-black text-white p-5 border-4 border-black h-[600px] justify-between rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="space-y-4 overflow-y-auto max-h-[460px] pr-1">
              <div className="flex items-center gap-2 border-b-2 border-dashed border-slate-700 pb-3" id="checklist-header">
                <Layers className="w-4 h-4 text-[#70FF94]" />
                <span className="font-serif font-black uppercase text-sm tracking-wide text-white">Target Portfolio</span>
              </div>
              
              <p className="text-[10px] text-slate-400 leading-relaxed font-bold">
                Aim to work these expressions into your debate turns organically. As they are matched, they will check off automatically!
              </p>

              <div className="space-y-2.5" id="checklist-items-container">
                {targetFocusList.map((exp) => {
                  const isUsed = usedInSessionIds.includes(exp.id);
                  return (
                    <div
                      id={`checklist-item-${exp.id}`}
                      key={exp.id}
                      className={`flex items-start gap-2.5 p-2 rounded-none transition-all border-2 ${
                        isUsed
                          ? "bg-slate-900 border-[#70FF94] text-[#70FF94] shadow-[1.5px_1.5px_0px_0px_rgba(112,255,148,0.3)]"
                          : "bg-zinc-950 border-zinc-800 text-slate-400"
                      }`}
                    >
                      <div className={`w-4 h-4 mt-0.5 rounded-none flex items-center justify-center flex-shrink-0 border-2 ${
                        isUsed 
                          ? "bg-[#70FF94] border-black text-black" 
                          : "border-zinc-700"
                      }`}>
                        {isUsed && <Check className="w-3 h-3 stroke-[4]" />}
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-xs font-mono select-all block leading-tight font-black">{exp.text}</span>
                        {exp.subcategory && (
                          <span className="text-[8px] uppercase tracking-widest text-[#00D1FF] font-black block">{exp.subcategory}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer action */}
            <div className="pt-4 border-t-2 border-dashed border-zinc-800 space-y-3">
              <div className="flex justify-between items-center text-[11px] font-black uppercase">
                <span className="text-slate-400">Session Progress:</span>
                <span className="font-mono text-[#70FF94]">
                  {usedInSessionIds.length} / {targetFocusList.length} Used
                </span>
              </div>

              <button
                id="end-evaluate-btn"
                onClick={handleEndAndEvaluate}
                disabled={messages.length < 2 || isEvaluating}
                className="w-full py-3 bg-[#00D1FF] border-2 border-black hover:bg-[#00D1FF]/90 disabled:opacity-40 text-black font-black text-xs uppercase rounded-none tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                {isEvaluating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                    <span>Analyzing Speeches...</span>
                  </>
                ) : (
                  <>
                    <Award className="w-3.5 h-3.5 text-black" />
                    <span>Complete & Grade Debate</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Evaluation Results overlay card */}
      {evalResult && (
        <div 
          id="scorecard-overlay-root"
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in"
        >
          <motion.div
            id="scorecard-modal-body"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border-4 border-black w-full max-w-2xl p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] my-8 space-y-6 max-h-[90vh] overflow-y-auto rounded-none text-black"
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b-2 border-black pb-4" id="scorecard-header">
              <div className="flex items-center gap-2">
                <Award className="w-6 h-6 text-black" />
                <div>
                  <h3 className="font-serif font-black uppercase text-black text-lg">Debate Fluency Scorecard</h3>
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest font-black block leading-none">Standardized Rubric Grade</span>
                </div>
              </div>
              <button
                id="close-evaluation-modal"
                onClick={handleReset}
                className="p-1.5 border-2 border-black hover:bg-slate-100 rounded-none transition-colors cursor-pointer bg-[#F1F1F1]"
              >
                <X className="w-4 h-4 text-black" />
              </button>
            </div>

            {/* Score Ring Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#FAFAF8] border-2 border-black p-5 rounded-none shadow-[3px_3px_0px_rgba(0,0,0,1)] text-black">
              <div className="text-center flex flex-col justify-center items-center md:border-r-2 border-dashed border-black/30 pr-0 md:pr-4">
                <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Overall Band Rating</span>
                <div className="font-serif text-5xl font-black text-black my-2">
                  {evalResult.score}<sup className="text-slate-400 text-xs font-mono pr-0.5">/100</sup>
                </div>
                <span className="text-[10px] font-mono font-black text-orange-600 uppercase border border-orange-200 bg-orange-50 px-2 py-0.5 rounded-none">
                  {evalResult.score >= 85 ? "Mastery Speaker" : evalResult.score >= 70 ? "Competent Speaker" : "Drafting Stage"}
                </span>
              </div>

              <div className="md:col-span-2 space-y-1.5 my-auto">
                <h4 className="text-[10px] font-black text-black flex items-center gap-1.5 uppercase tracking-wide">
                  <Sparkles className="w-4 h-4 text-black" />
                  <span>Substantive Feedback</span>
                </h4>
                <p className="text-xs text-slate-800 leading-relaxed font-bold">
                  {evalResult.fluencyFeedback}
                </p>
              </div>
            </div>

            {/* Expressions Used Summary */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-black uppercase tracking-wider flex items-center gap-1.5 border-b-2 border-black pb-1.5" id="verified-expressions-header">
                <CheckCircle className="w-4 h-4 text-black" />
                <span>Verified Expression Matches</span>
              </h4>

              {evalResult.expressionsUsed && evalResult.expressionsUsed.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5" id="verified-expressions-container">
                  {evalResult.expressionsUsed.map((exp, idx) => (
                    <div key={idx} className="bg-[#FAFAF8] p-3 border-2 border-black flex flex-col justify-between text-xs rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black">
                      <div className="flex justify-between items-start">
                        <span className="font-mono font-black text-black">{exp.text}</span>
                        <span className={`text-[9px] font-black px-1.5 py-0.5 uppercase border ${
                          exp.contextOk ? "bg-[#70FF94] text-black border-black" : "bg-[#FFE200] text-black border-black"
                        }`}>
                          {exp.contextOk ? "In-Context" : "Awkward"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-700 italic mt-2 border-l-2 border-black pl-2 leading-relaxed font-semibold">
                        "{exp.quote}"
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white border-2 border-black p-4 rounded-none text-center text-xs text-slate-500 shadow-[2px_2px_0px_rgba(0,0,0,1)]" id="no-verified-matches">
                  <HelpCircle className="w-5 h-5 mx-auto mb-1.5 text-black" />
                  <span className="font-bold">No formal argument matches were parsed. Try to utilize direct expression markers!</span>
                </div>
              )}
            </div>

            {/* Grammar Correctors */}
            {evalResult.grammarCorrections && evalResult.grammarCorrections.length > 0 && (
              <div className="space-y-3 border-t-2 border-black pt-4">
                <h4 className="text-[10px] font-black text-black uppercase tracking-wider flex items-center gap-1.5 border-b-2 border-black pb-1.5">
                  <AlertCircle className="w-4 h-4 text-black" />
                  <span>Suggested Grammar Enhancements</span>
                </h4>

                <div className="space-y-2.5">
                  {evalResult.grammarCorrections.map((corr, idx) => {
                    if (!corr.original) return null;
                    return (
                      <div key={idx} className="border-2 border-black bg-[#FAFAF8] p-4 text-xs space-y-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-none">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <span className="text-slate-500 line-through font-bold bg-slate-100 px-2 py-0.5 border border-slate-300">"{corr.original}"</span>
                          <span className="text-black font-black bg-[#70FF94] px-2 py-0.5 border-2 border-black">"{corr.corrected}"</span>
                        </div>
                        <p className="text-slate-800 leading-relaxed text-[11px] font-bold border-t border-black/10 pt-1.5">
                          {corr.explanation}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Vocabulary Tips and Recommendations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t-2 border-black text-black">
              <div className="space-y-2.5">
                <h5 className="text-[10px] font-black text-black uppercase tracking-wider flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-black" />
                  <span>Vocabulary Expansion Tips</span>
                </h5>
                <p className="text-xs text-slate-800 leading-relaxed font-bold bg-[#FAFAF8] p-3 border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] rounded-none">
                  {evalResult.vocabularyTips}
                </p>
              </div>

              <div className="space-y-2.5">
                <h5 className="text-[10px] font-black text-black uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-black" />
                  <span>Auspicious Alternative Phrasings</span>
                </h5>
                <div className="space-y-2" id="suggested-alternative-phrasings">
                  {evalResult.suggestedExpressions && evalResult.suggestedExpressions.map((phrase, idx) => (
                    <div key={idx} className="bg-[#FFE200]/15 py-2.5 px-3.5 border-2 border-black font-mono text-black font-black text-xs rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      {phrase}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Restart Actions */}
            <div className="pt-4 border-t-2 border-black flex justify-end gap-3">
              <button
                id="reset-session-finish-btn"
                onClick={handleReset}
                className="px-6 py-2.5 bg-black hover:bg-zinc-900 text-white font-black text-xs uppercase tracking-wider rounded-none border-2 border-black transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                Launch New Topic
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
