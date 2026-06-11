import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  HelpCircle, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  ArrowRight, 
  Flame, 
  CheckSquare, 
  Check,
  ChevronRight,
  TrendingUp
} from "lucide-react";
import { Category, Expression } from "../data/expressions";
import { motion, AnimatePresence } from "motion/react";

interface PracticeViewProps {
  categories: Category[];
  allExpressions: Expression[];
}

type QuizType = "completion" | "classification";

export default function PracticeView({ categories, allExpressions }: PracticeViewProps) {
  const [quizType, setQuizType] = useState<QuizType>("completion");
  
  // Game state
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [highStreak, setHighStreak] = useState(0);
  const [questionCount, setQuestionCount] = useState(1);
  const [quizFinished, setQuizFinished] = useState(false);
  const [currentAnswersSubmitted, setCurrentAnswersSubmitted] = useState<number>(0);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  
  // Dynamic question variables
  const [currentExpression, setCurrentExpression] = useState<Expression | null>(null);
  const [completionDialogue, setCompletionDialogue] = useState<{ parent: string; promptLine: string; options: string[]; answerIndex: number } | null>(null);
  const [classificationOptions, setClassificationOptions] = useState<{ id: string; title: string }[]>([]);
  const [selectedOptionIdx, setSelectedOptionIdx] = useState<number | null>(null);

  // Initialize a new question based on Mode
  const generateNewQuestion = () => {
    setIsCorrect(null);
    setSelectedOptionIdx(null);

    if (quizType === "completion") {
      // Pick a random expression with regular defaults
      const availableExps = allExpressions.filter(e => e.example && e.example.includes("B:"));
      if (availableExps.length === 0) return;
      const target = availableExps[Math.floor(Math.random() * availableExps.length)];
      
      // Parse dialogue. B's line should have the expression. We hide it with _____
      const dialogueLines = target.example.split("\n");
      const parentLine = dialogueLines.find(l => l.trim().startsWith("A:")) || "A: Tell me your thoughts.";
      const responseLine = dialogueLines.find(l => l.trim().startsWith("B:")) || `B: ${target.text} we must reconsider.`;
      
      // Blank out the expression
      const cleanResponse = responseLine.replace(/^[B]\s*:\s*/, "");
      // Replace case insensitively
      const escapedText = target.text.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
      const regex = new RegExp(escapedText, "i");
      const promptLine = cleanResponse.replace(regex, "_________________");

      // Generate wrong options of the same category if possible, or mixed
      const otherSameCategory = allExpressions.filter(e => e.id !== target.id && e.category === target.category);
      const randomOthers = allExpressions.filter(e => e.id !== target.id);
      
      const optionPool = otherSameCategory.length >= 3 ? otherSameCategory : randomOthers;
      const shuffledOptionsPool = [...optionPool].sort(() => 0.5 - Math.random());
      
      const incorrectMatches = shuffledOptionsPool.slice(0, 3).map(e => e.text);
      const finalOptions = [...incorrectMatches, target.text].sort(() => 0.5 - Math.random());
      const answerIndex = finalOptions.indexOf(target.text);

      setCurrentExpression(target);
      setCompletionDialogue({
        parent: parentLine.replace(/^[A]\s*:\s*/, ""),
        promptLine,
        options: finalOptions,
        answerIndex
      });
    } else {
      // Classification game: Present an expression and ask which category it belongs to!
      const target = allExpressions[Math.floor(Math.random() * allExpressions.length)];
      setCurrentExpression(target);

      // We collect the correct category name
      let actualCatTitle = "";
      const catObj = categories.find(c => c.id === target.category);
      if (catObj) {
        actualCatTitle = catObj.title;
        if (target.subcategory) {
          actualCatTitle += ` (${target.subcategory})`;
        }
      }

      // Generate 4 logical classification choices
      const allPossibleSubCategories: string[] = [];
      categories.forEach(c => {
        if (c.id === "responding") {
          allPossibleSubCategories.push("Responding (Agreeing)");
          allPossibleSubCategories.push("Responding (Partially Agreeing)");
          allPossibleSubCategories.push("Responding (Politely Disagreeing)");
          allPossibleSubCategories.push("Responding (Clarifying)");
        } else {
          allPossibleSubCategories.push(c.title);
        }
      });

      const incorrectCats = allPossibleSubCategories.filter(name => name !== actualCatTitle);
      const shuffledIncorrect = [...incorrectCats].sort(() => 0.5 - Math.random());
      const selectIncorrect = shuffledIncorrect.slice(0, 3);

      const finalOptions = [...selectIncorrect, actualCatTitle].sort(() => 0.5 - Math.random());
      
      setClassificationOptions(finalOptions.map((text, idx) => ({
        id: `class-opt-${idx}`,
        title: text
      })));
      
      // Save index
      const answerIndex = finalOptions.indexOf(actualCatTitle);
      setCompletionDialogue({
        parent: "", // empty for classification
        promptLine: target.text,
        options: finalOptions,
        answerIndex
      });
    }
  };

  // Generate on start or quiz mode switch
  useEffect(() => {
    generateNewQuestion();
  }, [quizType]);

  const handleSelectOption = (idx: number) => {
    if (isCorrect !== null) return; // Answer locked
    setSelectedOptionIdx(idx);
  };

  const handleSubmitAnswer = () => {
    if (selectedOptionIdx === null || isCorrect !== null) return;

    const correct = selectedOptionIdx === completionDialogue?.answerIndex;
    setIsCorrect(correct);
    setCurrentAnswersSubmitted(prev => prev + 1);

    if (correct) {
      const nextStreak = streak + 1;
      setScore(prev => prev + 10 + (nextStreak > 3 ? 5 : 0)); // Bonus points for high streaks!
      setStreak(nextStreak);
      if (nextStreak > highStreak) {
        setHighStreak(nextStreak);
      }
    } else {
      setStreak(0);
    }
  };

  const handleNext = () => {
    if (questionCount >= 10) {
      setQuizFinished(true);
    } else {
      setQuestionCount(prev => prev + 1);
      generateNewQuestion();
    }
  };

  const handleRestart = () => {
    setScore(0);
    setStreak(0);
    setQuestionCount(1);
    setQuizFinished(false);
    generateNewQuestion();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 text-black">
      {/* Quiz Top Action & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-black text-white p-6 border-4 border-black shadow-[4px_4px_0px_0px_rgba(112,255,148,1)] rounded-none">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-[#70FF94] text-black font-black text-[9px] uppercase tracking-widest px-2.5 py-1 border-2 border-black rounded-none">ACTIVE RECALL</span>
            <span className="flex items-center gap-1 font-black text-xs text-[#FFE200]">
              <Flame className="w-4 h-4 fill-[#FFE200] text-[#FFE200]" />
              <span>Streak: {streak}</span>
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-serif font-black uppercase tracking-tight text-white">Expressions Dojo</h2>
          <p className="text-xs text-slate-300 font-bold">Master the timing and functional placement of standard discussion rhetoric.</p>
        </div>

        {/* Scoring Indicators */}
        <div className="flex items-center gap-6 border-l-2 border-dashed border-slate-700 pl-0 md:pl-6 pt-4 md:pt-0">
          <div className="text-center">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black block">Total Score</span>
            <span className="font-mono text-xl md:text-2xl font-black text-[#70FF94]">{score}</span>
          </div>
          <div className="text-center">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black block">Quest Status</span>
            <span className="font-mono text-xl md:text-2xl font-black text-slate-300">{questionCount}/10</span>
          </div>
          <div className="text-center">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black block">Best Streak</span>
            <span className="font-mono text-xl md:text-2xl font-black text-[#FFE200]">{highStreak} 🔥</span>
          </div>
        </div>
      </div>

      {/* Mode Selectors */}
      {!quizFinished && (
        <div className="flex bg-white p-1.5 border-2 border-black w-full max-w-sm ml-auto rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <button
            id="quiz-completion-tab"
            onClick={() => {
              setQuizType("completion");
              handleRestart();
            }}
            className={`w-1/2 py-2 text-xs font-black uppercase rounded-none transition-all cursor-pointer ${
              quizType === "completion" 
                ? "bg-black text-white" 
                : "text-black hover:bg-slate-100"
            }`}
          >
            Completion
          </button>
          <button
            id="quiz-classification-tab"
            onClick={() => {
              setQuizType("classification");
              handleRestart();
            }}
            className={`w-1/2 py-2 text-xs font-black uppercase rounded-none transition-all cursor-pointer ${
              quizType === "classification" 
                ? "bg-black text-white" 
                : "text-black hover:bg-slate-100"
            }`}
          >
            Classifier
          </button>
        </div>
      )}

      {/* Main Study Arena */}
      <AnimatePresence mode="wait">
        {quizFinished ? (
          <motion.div
            id="quiz-finished-card"
            key="finished"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="bg-white border-4 border-black p-8 md:p-12 text-center space-y-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-none text-black"
          >
            <div className="w-20 h-20 bg-[#70FF94] text-black border-4 border-black rounded-full flex items-center justify-center mx-auto mb-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <Sparkles className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-serif font-black uppercase text-black">Study Quest Completed!</h3>
              <p className="text-[#FF4100] font-black font-mono text-sm tracking-widest uppercase">LEVEL UP: VOCABULARY MASTER</p>
              <p className="text-slate-700 text-xs font-bold max-w-md mx-auto leading-relaxed">
                Excellent! You completed 10 interactive expression questions. Your scores are processed below:
              </p>
            </div>

            <div className="flex justify-center gap-8 max-w-sm mx-auto bg-[#FAFAF8] p-5 border-2 border-black font-mono rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-black">Total Points</span>
                <span className="text-3xl font-black text-black">{score}</span>
              </div>
              <div className="border-r-2 border-dashed border-black/30"></div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-black">High Streak</span>
                <span className="text-3xl font-black text-[#FF4100]">{highStreak} 🔥</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-3 max-w-md mx-auto pt-4">
              <button
                id="btn-restart-quiz"
                onClick={handleRestart}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-[#FFE200] hover:bg-[#FFE200]/95 text-black border-2 border-black font-black uppercase text-xs tracking-wider transition-colors cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-none"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Practice Again</span>
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            id="quiz-active-card"
            key="active"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-white border-2 border-black p-6 md:p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none space-y-6"
          >
            {/* Question Prompt layout */}
            {quizType === "completion" ? (
              <div className="space-y-4">
                <div className="flex items-center gap-1 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <span className="bg-[#00D1FF] text-black px-2 py-0.5 border-2 border-black rounded-none mr-1">Dialogue context</span>
                  <span>Topic Debate Scenario</span>
                </div>

                <div className="space-y-3 bg-[#FAFAF8] rounded-none p-5 border-2 border-black">
                  {/* Speaker A */}
                  <div className="flex items-start gap-3">
                    <span className="font-mono text-slate-500 font-bold mt-0.5 text-xs shrink-0">Speaker A:</span>
                    <p className="text-sm font-bold text-black italic">
                      "{completionDialogue?.parent}"
                    </p>
                  </div>
                  
                  {/* Divider line */}
                  <div className="border-t-2 border-dashed border-black/30 my-2"></div>

                  {/* Speaker B (target prompt with blank) */}
                  <div className="flex items-start gap-3">
                    <span className="font-mono text-[#FF4100] font-black mt-0.5 text-xs shrink-0">Speaker B:</span>
                    <p className="text-sm text-black font-mono bg-white p-3 rounded-none border-2 border-black leading-relaxed font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] w-full">
                      "{completionDialogue?.promptLine}"
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-700 text-center font-bold">
                  Select the appropriate expression that logically matches this rhetorical transition:
                </p>
              </div>
            ) : (
              // Classification UI
              <div className="space-y-6 text-center">
                <div className="flex items-center justify-center gap-1 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <span className="bg-[#FF90E8] text-black px-2 py-0.5 border-2 border-black rounded-none mr-1">Rhetorical Function</span>
                  <span>Categorize the Expression</span>
                </div>

                <div className="space-y-2 py-6">
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Which functional class does this express?</p>
                  <div className="font-mono bg-black text-[#70FF94] text-md md:text-lg font-black p-5 rounded-none border-2 border-black inline-block select-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    "{completionDialogue?.promptLine}"
                  </div>
                </div>

                <p className="text-xs text-slate-700 font-bold">
                  Select the matching discussion unit this rhetorical helper represents:
                </p>
              </div>
            )}

            {/* Answer Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5" id="quiz-options-container">
              {completionDialogue?.options.map((option, idx) => {
                const isSelected = selectedOptionIdx === idx;
                const isAnswered = isCorrect !== null;
                const isAnswerIdx = completionDialogue.answerIndex === idx;

                let btnStyles = "border-[#1A1A1A] hover:bg-slate-50 text-black";
                
                if (isSelected && !isAnswered) {
                  btnStyles = "bg-black text-white font-bold shadow-[2px_2px_0px_0px_rgba(112,255,148,1)]";
                } else if (isAnswered) {
                  if (isAnswerIdx) {
                    btnStyles = "bg-[#70FF94] text-black font-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]";
                  } else if (isSelected) {
                    btnStyles = "bg-[#FF4100]/20 text-black border-2 border-[#FF4100] font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]";
                  } else {
                    btnStyles = "border-dashed border-black/30 opacity-40 text-slate-400";
                  }
                }

                return (
                  <button
                    id={`quiz-opt-btn-${idx}`}
                    disabled={isAnswered}
                    key={idx}
                    onClick={() => handleSelectOption(idx)}
                    className={`flex items-center justify-between text-left px-5 py-4 rounded-none border-2 transition-all text-xs font-black cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${btnStyles}`}
                  >
                    <span className="font-mono flex-1 pr-3">{option}</span>
                    <div className="flex-shrink-0 w-5 h-5 rounded-none border-2 border-black flex items-center justify-center bg-white text-black font-black">
                      {isAnswered && isAnswerIdx ? (
                        <Check className="w-3.5 h-3.5 text-black stroke-[3px]" />
                      ) : isAnswered && isSelected && !isAnswerIdx ? (
                        <span className="text-[10px] text-[#FF4100] font-black">✕</span>
                      ) : (
                        <span className="font-mono text-[9px] text-black font-black">{idx + 1}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bottom Status Feedback and Actions */}
            <div className="pt-6 border-t-2 border-black flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Feedback banner */}
              <div id="quiz-feedback-banner">
                {isCorrect !== null ? (
                  <div className="flex items-center gap-2.5">
                    {isCorrect ? (
                      <div className="flex items-center gap-2 text-black text-xs font-black bg-[#70FF94] border-2 border-black py-2 px-3 rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] animate-bounce">
                        <CheckCircle2 className="w-4 h-4 text-black" />
                        <span>Excellent Match (+10 pts)</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-black text-xs font-bold bg-[#FF4100]/25 border-2 border-black py-2 px-3 rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <XCircle className="w-4 h-4 text-[#FF4100]" />
                        <span>Incorrect. The correct answer is: "{completionDialogue?.options[completionDialogue.answerIndex]}"</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-slate-500 font-extrabold uppercase tracking-wide">Choose an option and press Submit to verify.</span>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 justify-end">
                {isCorrect === null ? (
                  <button
                    id="submit-answer-btn"
                    onClick={handleSubmitAnswer}
                    disabled={selectedOptionIdx === null}
                    className="flex items-center gap-1.5 bg-[#FFE200] hover:bg-[#FFE200]/95 disabled:opacity-40 text-black text-xs font-black uppercase tracking-wider px-5 py-2.5 rounded-none border-2 border-black transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Submit Choice</span>
                  </button>
                ) : (
                  <button
                    id="next-question-btn"
                    onClick={handleNext}
                    className="flex items-center gap-1.5 bg-black hover:bg-slate-900 text-white text-xs font-black uppercase tracking-wider px-5 py-2.5 rounded-none border-2 border-black transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <span>{questionCount >= 10 ? "Finish Quest" : "Next Scenario"}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
