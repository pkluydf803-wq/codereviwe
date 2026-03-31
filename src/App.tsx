import * as React from 'react';
import { useState, useEffect, Component } from 'react';
import { 
  Code2, 
  Bug, 
  CheckCircle2, 
  AlertCircle, 
  Terminal, 
  Webhook, 
  History, 
  Play, 
  Copy, 
  Trash2,
  ChevronRight,
  Loader2,
  Info,
  Sun,
  Moon,
  Contrast,
  ShieldAlert,
  Zap,
  Wand2,
  TestTube2,
  LayoutDashboard,
  Settings,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ReviewResult, WebhookRequest, AITool, Theme, ReviewHistoryItem } from './types';
import { reviewCode } from './utils/gemini';
import { themeStyles } from './constants';
import { auth, db, loginWithGoogle, loginWithEmail, registerWithEmail, logout, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, deleteDoc, getDocs, writeBatch, updateDoc, doc } from 'firebase/firestore';
import { CHALLENGES } from './constants';
import { Challenge, ChallengeSubmission, TestCase } from './types';

// --- Components ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');
  const [activePage, setActivePage] = useState<'dashboard' | 'tools' | 'history' | 'webhooks' | 'challenges'>('dashboard');
  const [activeTab, setActiveTab] = useState<'manual' | 'webhooks'>('manual');
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [isReviewing, setIsReviewing] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [webhooks, setWebhooks] = useState<WebhookRequest[]>([]);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookRequest | null>(null);
  const [isPolling, setIsPolling] = useState(true);
  const [history, setHistory] = useState<ReviewHistoryItem[]>([]);
  const [tools, setTools] = useState<AITool[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Auth Form State
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authError, setAuthError] = useState('');

  // Challenges State
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [challengeCode, setChallengeCode] = useState('');
  const [testResults, setTestResults] = useState<{ passed: boolean, actual: string, expected: string, description: string }[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const s = themeStyles[theme];

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Fetch initial data (Tools)
  useEffect(() => {
    const fetchTools = async () => {
      try {
        const toolsRes = await fetch('/api/tools');
        const toolsData = await toolsRes.json();
        setTools(toolsData);
      } catch (err) {
        console.error("Error fetching tools:", err);
      }
    };
    fetchTools();
  }, []);

  // Firestore Listeners (Webhooks & History)
  useEffect(() => {
    if (!isAuthReady || !user) return;

    const webhooksQuery = query(collection(db, 'webhooks'), orderBy('timestamp', 'desc'));
    const unsubscribeWebhooks = onSnapshot(webhooksQuery, (snapshot) => {
      const webhooksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WebhookRequest[];
      setWebhooks(webhooksData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'webhooks');
    });

    const reviewsQuery = query(collection(db, 'reviews'), orderBy('timestamp', 'desc'));
    const unsubscribeReviews = onSnapshot(reviewsQuery, (snapshot) => {
      const reviewsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ReviewHistoryItem[];
      setHistory(reviewsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'reviews');
    });

    return () => {
      unsubscribeWebhooks();
      unsubscribeReviews();
    };
  }, [isAuthReady, user]);

  const saveReviewToHistory = async (review: ReviewResult, codeSnippet: string, lang: string, toolName?: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'reviews'), {
        code: codeSnippet,
        language: lang,
        timestamp: new Date().toISOString(),
        result: review,
        toolName: toolName || 'Manual Review',
        userId: user.uid
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'reviews');
    }
  };

  const clearHistory = async () => {
    if (!user) return;
    try {
      const snapshot = await getDocs(collection(db, 'reviews'));
      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'reviews');
    }
  };

  const clearWebhooks = async () => {
    if (!user) return;
    try {
      const snapshot = await getDocs(collection(db, 'webhooks'));
      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'webhooks');
    }
  };

  const handleManualReview = async (customPrompt?: string, toolName?: string) => {
    if (!code.trim()) return;
    setIsReviewing(true);
    setResult(null);
    try {
      const review = await reviewCode(code, language, customPrompt);
      setResult(review);
      await saveReviewToHistory(review, code, language, toolName);
    } catch (err) {
      console.error(err);
    } finally {
      setIsReviewing(false);
    }
  };

  const handleWebhookReview = async (webhook: WebhookRequest) => {
    if (!webhook.id) return;
    setIsReviewing(true);
    try {
      const review = await reviewCode(webhook.code, webhook.language);
      const updated = { ...webhook, status: 'reviewed' as const, result: review };
      
      // Update webhook in Firestore
      await updateDoc(doc(db, 'webhooks', webhook.id), {
        status: 'reviewed',
        result: review
      });
      
      setSelectedWebhook(updated);
      await saveReviewToHistory(review, webhook.code, webhook.language, 'Webhook');
    } catch (err) {
      console.error(err);
    } finally {
      setIsReviewing(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (authMode === 'login') {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password, name);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed');
    }
  };

  const evaluateChallenge = async () => {
    if (!selectedChallenge) return;
    setIsEvaluating(true);
    setTestResults([]);

    try {
      const results = selectedChallenge.testCases.map(tc => {
        let actual = '';
        let passed = false;
        try {
          // Simple evaluation for demo purposes
          // In a real app, this would be done in a secure sandbox or server-side
          const fn = new Function('input', `
            ${challengeCode}
            const args = Array.isArray(input) ? input : [input];
            const fnName = "${selectedChallenge.initialCode.split('(')[0].replace('function ', '').trim()}";
            return eval(fnName + "(" + JSON.stringify(input).slice(1, -1) + ")");
          `);
          
          // Parse input if it's a string representation of an array/object
          let inputVal;
          try {
            inputVal = JSON.parse("[" + tc.input + "]");
            if (inputVal.length === 1) inputVal = inputVal[0];
          } catch {
            inputVal = tc.input;
          }

          const result = fn(inputVal);
          actual = JSON.stringify(result);
          passed = actual === tc.expectedOutput;
        } catch (err: any) {
          actual = `Error: ${err.message}`;
          passed = false;
        }
        return { passed, actual, expected: tc.expectedOutput, description: tc.description };
      });

      setTestResults(results);

      // Save submission to Firestore
      if (user) {
        await addDoc(collection(db, 'submissions'), {
          challengeId: selectedChallenge.id,
          userId: user.uid,
          code: challengeCode,
          status: results.every(r => r.passed) ? 'Passed' : 'Failed',
          timestamp: serverTimestamp()
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'submissions');
    } finally {
      setIsEvaluating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const webhookUrl = `${window.location.origin}/api/webhook`;

  const ToolIcon = ({ name, size = 16, className = "" }: { name: string, size?: number, className?: string }) => {
    const icons: Record<string, any> = { ShieldAlert, Zap, Wand2, TestTube2, Bug, Code2 };
    const Icon = icons[name] || Bug;
    return <Icon size={size} className={className} />;
  };

  if (!isAuthReady) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${s.bg}`}>
        <Loader2 className="w-8 h-8 animate-spin text-[#3B82F6]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${s.bg} p-6`}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`max-w-md w-full ${s.card} border ${s.border} p-10 rounded-sm ${s.shadow} text-center`}
        >
          <div className="w-16 h-16 bg-[#3B82F6] mx-auto flex items-center justify-center rounded-sm mb-6 shadow-[0_0_20px_rgba(59,130,246,0.4)]">
            <Code2 className="text-white w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold uppercase tracking-tighter italic mb-2">CodeReview AI</h1>
          <p className={`text-xs ${s.muted} mb-8 uppercase tracking-widest`}>Secure Enterprise Analysis Engine</p>
          
          <form onSubmit={handleAuth} className="space-y-4 mb-8">
            {authMode === 'register' && (
              <input 
                type="text"
                placeholder="FULL NAME"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full p-3 ${s.inputBg} ${s.inputText} border ${s.border} rounded-sm text-xs font-bold uppercase tracking-widest focus:outline-none focus:border-[#3B82F6] transition-all`}
                required
              />
            )}
            <input 
              type="email"
              placeholder="EMAIL ADDRESS"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full p-3 ${s.inputBg} ${s.inputText} border ${s.border} rounded-sm text-xs font-bold uppercase tracking-widest focus:outline-none focus:border-[#3B82F6] transition-all`}
              required
            />
            <input 
              type="password"
              placeholder="PASSWORD"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full p-3 ${s.inputBg} ${s.inputText} border ${s.border} rounded-sm text-xs font-bold uppercase tracking-widest focus:outline-none focus:border-[#3B82F6] transition-all`}
              required
            />
            {authError && <p className="text-red-500 text-[10px] uppercase font-bold text-left">{authError}</p>}
            <button 
              type="submit"
              className="w-full py-4 bg-[#3B82F6] text-white rounded-sm font-bold uppercase tracking-widest text-xs hover:bg-[#2563EB] transition-all shadow-lg"
            >
              {authMode === 'login' ? 'Authenticate' : 'Register Account'}
            </button>
          </form>

          <div className="flex items-center gap-4 mb-8">
            <div className={`flex-1 h-[1px] ${s.border}`} />
            <span className={`text-[10px] ${s.muted} font-bold uppercase`}>OR</span>
            <div className={`flex-1 h-[1px] ${s.border}`} />
          </div>

          <button 
            onClick={loginWithGoogle}
            className={`w-full py-3 ${s.inputBg} ${s.inputText} border ${s.border} rounded-sm font-bold uppercase tracking-widest text-xs hover:bg-[#1A1A1A] transition-all flex items-center justify-center gap-3`}
          >
            <ShieldAlert size={18} className="text-[#3B82F6]" />
            Continue with Google
          </button>

          <button 
            onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
            className={`mt-6 text-[10px] ${s.muted} uppercase font-bold hover:text-white transition-all underline underline-offset-4`}
          >
            {authMode === 'login' ? "Don't have an account? Register" : "Already have an account? Login"}
          </button>
          
          <p className={`mt-8 text-[8px] ${s.muted} uppercase tracking-[0.2em]`}>
            Authorized Personnel Only • Encrypted Session
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${s.bg} ${s.text} font-sans selection:bg-[#3B82F6] selection:text-white transition-colors duration-300 flex`}>
      
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: sidebarOpen ? 260 : 80 }}
        className={`${s.header} border-r ${s.border} flex flex-col h-screen sticky top-0 z-20`}
      >
        <div className="p-6 flex items-center gap-3 border-b border-transparent">
          <div className="w-10 h-10 bg-[#3B82F6] flex-shrink-0 flex items-center justify-center rounded-sm shadow-[0_0_15px_rgba(59,130,246,0.5)]">
            <Code2 className="text-white w-6 h-6" />
          </div>
          {sidebarOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h1 className={`text-lg font-bold tracking-tighter uppercase italic font-serif ${theme === 'light' ? 'text-[#1A1A1A]' : 'text-white'}`}>CodeReview</h1>
              <p className={`text-[8px] uppercase tracking-widest ${s.muted} font-mono`}>AI Engine v1.0</p>
            </motion.div>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'tools', label: 'AI Probing Engine', icon: Zap },
            { id: 'challenges', label: 'Coding Challenges', icon: Code2 },
            { id: 'history', label: 'Review History', icon: History },
            { id: 'webhooks', label: 'Webhooks', icon: Webhook, badge: webhooks.filter(w => w.status === 'pending').length },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id as any)}
              className={`w-full flex items-center gap-3 p-3 rounded-sm transition-all group ${activePage === item.id ? 'bg-[#3B82F6] text-white shadow-lg' : s.muted + ' ' + s.hoverBg + ' hover:text-white'}`}
            >
              <item.icon size={20} className={activePage === item.id ? 'text-white' : 'text-[#3B82F6] group-hover:text-white'} />
              {sidebarOpen && (
                <span className="text-xs font-bold uppercase tracking-widest flex-1 text-left">{item.label}</span>
              )}
              {sidebarOpen && item.badge && item.badge > 0 && (
                <span className="px-1.5 py-0.5 bg-[#EF4444] text-white rounded-full text-[8px] animate-pulse">{item.badge}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-transparent space-y-2">
          <button 
            onClick={logout}
            className={`w-full flex items-center gap-3 p-3 rounded-sm transition-all ${s.muted} ${s.hoverBg} hover:text-red-500 group`}
          >
            <ShieldAlert size={20} className="text-[#3B82F6] group-hover:text-red-500" />
            {sidebarOpen && (
              <span className="text-xs font-bold uppercase tracking-widest flex-1 text-left">Logout</span>
            )}
          </button>

          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`w-full flex items-center justify-center p-2 ${s.muted} ${s.hoverBg} rounded-sm transition-all mt-2`}
          >
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </motion.aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className={`${s.headerBorder} ${s.header} p-6 flex justify-between items-center sticky top-0 z-10 backdrop-blur-md bg-opacity-80 border-b`}>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold tracking-tighter uppercase italic font-serif text-white">
              {activePage === 'dashboard' && 'Dashboard'}
              {activePage === 'tools' && 'AI Probing Engine'}
              {activePage === 'challenges' && 'Coding Challenges'}
              {activePage === 'history' && 'Review History'}
              {activePage === 'webhooks' && 'Webhook Management'}
            </h2>
          </div>
          
          <div className="flex items-center gap-4">
            <div className={`px-3 py-1 rounded-full border ${s.border} bg-[#1A1A1A] flex items-center gap-2`}>
              <div className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#22C55E]">System Online</span>
            </div>

            {/* Theme Toggle */}
            <div className="relative group">
              <button className={`p-2 rounded-sm border ${s.border} ${s.card} hover:border-[#3B82F6] transition-all flex items-center justify-center`}>
                {theme === 'light' && <Sun size={18} className="text-[#3B82F6]" />}
                {theme === 'dark' && <Moon size={18} className="text-[#3B82F6]" />}
                {theme === 'high-contrast' && <Contrast size={18} className="text-[#3B82F6]" />}
              </button>
              <div className="absolute right-0 top-full mt-2 w-32 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className={`${s.card} border ${s.border} p-1 rounded-sm shadow-2xl backdrop-blur-xl bg-opacity-90`}>
                  <button 
                    onClick={() => setTheme('light')} 
                    className={`w-full flex items-center gap-2 p-2 text-[10px] font-bold uppercase ${s.hoverBg} rounded-sm transition-colors ${theme === 'light' ? 'text-[#3B82F6]' : s.muted}`}
                  >
                    <Sun size={14} /> Light
                  </button>
                  <button 
                    onClick={() => setTheme('dark')} 
                    className={`w-full flex items-center gap-2 p-2 text-[10px] font-bold uppercase ${s.hoverBg} rounded-sm transition-colors ${theme === 'dark' ? 'text-[#3B82F6]' : s.muted}`}
                  >
                    <Moon size={14} /> Dark
                  </button>
                  <button 
                    onClick={() => setTheme('high-contrast')} 
                    className={`w-full flex items-center gap-2 p-2 text-[10px] font-bold uppercase ${s.hoverBg} rounded-sm transition-colors ${theme === 'high-contrast' ? 'text-[#3B82F6]' : s.muted}`}
                  >
                    <Contrast size={14} /> Contrast
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {activePage === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8"
              >
                {/* Left Column: Input */}
                <div className="lg:col-span-5 space-y-8">
                  <div className={`border ${s.border} flex flex-col h-[600px] ${s.card} rounded-sm overflow-hidden ${s.shadow}`}>
                    <div className={`border-b ${s.border} p-3 flex justify-between items-center ${s.panelHeader}`}>
                      <div className="flex items-center gap-2">
                        <Terminal size={14} className="text-[#3B82F6]" />
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${s.panelHeaderText}`}>Source Input</span>
                      </div>
                      <select 
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className={`text-[10px] font-bold uppercase bg-transparent border-none focus:ring-0 cursor-pointer text-[#3B82F6] hover:text-white transition-colors`}
                      >
                        <option value="javascript">JavaScript</option>
                        <option value="typescript">TypeScript</option>
                        <option value="python">Python</option>
                        <option value="go">Go</option>
                        <option value="rust">Rust</option>
                      </select>
                    </div>
                    <textarea 
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="// Paste your code here for review..."
                      className={`flex-1 p-4 font-mono text-sm resize-none focus:outline-none ${s.inputBg} ${s.inputText} ${s.placeholder}`}
                    />
                    <div className={`p-4 border-t ${s.border} ${s.panelHeader}`}>
                      <button 
                        onClick={() => handleManualReview()}
                        disabled={isReviewing || !code.trim()}
                        className="w-full py-3 bg-[#3B82F6] text-white font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-[#2563EB] transition-all disabled:opacity-50 disabled:bg-[#333333] shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                      >
                        {isReviewing ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
                        Run Analysis
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Column: Results */}
                <div className="lg:col-span-7">
                  <AnimatePresence mode="wait">
                    {isReviewing ? (
                      <motion.div 
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`h-full flex flex-col items-center justify-center p-12 border border-dashed ${s.border} rounded-sm ${s.card}`}
                      >
                        <Loader2 className="animate-spin mb-4 text-[#3B82F6]" size={48} />
                        <h2 className={`text-xl font-serif italic tracking-tight ${s.text}`}>Analyzing Codebase...</h2>
                        <p className={`text-[10px] uppercase tracking-[0.2em] ${s.muted} mt-2`}>Gemini AI is scanning for vulnerabilities</p>
                      </motion.div>
                    ) : result ? (
                      <motion.div 
                        key="result"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-8"
                      >
                        {/* Summary Cards */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className={`border ${s.border} p-4 ${s.card} rounded-sm ${s.shadow}`}>
                            <div className={`flex items-center gap-2 mb-1 ${s.muted}`}>
                              <Bug size={12} className="text-[#EF4444]" />
                              <span className="text-[8px] font-bold uppercase tracking-widest">Bugs Found</span>
                            </div>
                            <span className={`text-2xl font-serif italic ${s.text}`}>{result.bugs.length}</span>
                          </div>
                          <div className={`border ${s.border} p-4 ${s.card} rounded-sm ${s.shadow}`}>
                            <div className={`flex items-center gap-2 mb-1 ${s.muted}`}>
                              <CheckCircle2 size={12} className="text-[#22C55E]" />
                              <span className="text-[8px] font-bold uppercase tracking-widest">Status</span>
                            </div>
                            <span className={`text-2xl font-serif italic ${s.text}`}>Analyzed</span>
                          </div>
                          <div className={`border ${s.border} p-4 ${s.card} rounded-sm ${s.shadow}`}>
                            <div className={`flex items-center gap-2 mb-1 ${s.muted}`}>
                              <AlertCircle size={12} className="text-[#EAB308]" />
                              <span className="text-[8px] font-bold uppercase tracking-widest">Severity</span>
                            </div>
                            <span className={`text-2xl font-serif italic uppercase ${s.text}`}>
                              {result.bugs.some(b => b.severity === 'high') ? 'High' : 'Low'}
                            </span>
                          </div>
                        </div>

                        {/* Bugs List */}
                        <div className={`border ${s.border} ${s.card} rounded-sm ${s.shadow} overflow-hidden`}>
                          <div className={`${s.panelHeader} ${s.panelHeaderText} p-3 flex items-center gap-2 border-b ${s.border}`}>
                            <Bug size={14} className="text-[#EF4444]" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Identified Issues</span>
                          </div>
                          <div className={`divide-y ${s.border}`}>
                            {result.bugs.map((bug, i) => (
                              <div key={i} className={`p-4 flex gap-4 items-start ${s.bugCardHover} transition-colors`}>
                                <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 shadow-[0_0_8px] ${bug.severity === 'high' ? 'bg-[#EF4444] shadow-[#EF4444]' : bug.severity === 'medium' ? 'bg-[#EAB308] shadow-[#EAB308]' : 'bg-[#3B82F6] shadow-[#3B82F6]'}`} />
                                <div className="flex-1">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className={`text-[10px] font-bold uppercase font-mono ${s.muted}`}>Line {bug.line}</span>
                                    <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded-full border ${bug.severity === 'high' ? 'border-[#EF4444] text-[#EF4444]' : 'border-[#3B82F6] text-[#3B82F6]'}`}>
                                      {bug.severity}
                                    </span>
                                  </div>
                                  <p className={`text-xs leading-relaxed ${s.inputText}`}>{bug.description}</p>
                                </div>
                              </div>
                            ))}
                            {result.bugs.length === 0 && (
                              <div className={`p-12 text-center ${theme === 'light' ? 'text-[#D1D5DB]' : 'text-[#404040]'}`}>
                                <CheckCircle2 size={32} className="mx-auto mb-2 opacity-20" />
                                <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">No critical bugs detected</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Fixed Code */}
                        <div className={`border ${s.border} ${s.card} rounded-sm ${s.shadow} overflow-hidden`}>
                          <div className={`${s.fixedCodeHeader} ${s.panelHeaderText} p-3 flex justify-between items-center border-b ${s.border}`}>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 size={14} className="text-[#22C55E]" />
                              <span className="text-[10px] font-bold uppercase tracking-widest">Suggested Fix</span>
                            </div>
                            <button 
                              onClick={() => copyToClipboard(result.fixedCode)}
                              className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 text-[#3B82F6] hover:text-white transition-colors"
                            >
                              <Copy size={12} /> Copy
                            </button>
                          </div>
                          <div className={`p-4 ${s.fixedCodeBg} overflow-x-auto`}>
                            <pre className={`text-xs font-mono ${s.fixedCodeText} leading-relaxed`}>
                              {result.fixedCode}
                            </pre>
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <div className={`h-full flex flex-col items-center justify-center p-12 border border-dashed ${s.border} rounded-sm ${theme === 'light' ? 'text-[#D1D5DB]' : 'text-[#404040]'} text-center ${s.card}`}>
                        <Terminal size={48} className="mb-4 opacity-20" />
                        <h2 className="text-xl font-serif italic tracking-tight opacity-40">Awaiting Input</h2>
                        <p className="text-[10px] uppercase tracking-[0.2em] mt-2 opacity-30">Paste code or trigger a webhook to begin analysis</p>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {activePage === 'tools' && (
              <motion.div 
                key="tools"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {tools.map((tool) => (
                    <div 
                      key={tool.id}
                      className={`border ${s.border} p-6 ${s.card} rounded-sm ${s.shadow} hover:border-[#3B82F6] transition-all group`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 bg-[#1A1A1A] border border-[#333333] flex items-center justify-center rounded-sm group-hover:bg-[#3B82F6] group-hover:border-[#3B82F6] transition-all">
                          <ToolIcon name={tool.icon} className="text-[#3B82F6] group-hover:text-white" size={24} />
                        </div>
                        <button 
                          onClick={() => {
                            setActivePage('dashboard');
                            handleManualReview(tool.prompt, tool.name);
                          }}
                          disabled={!code.trim() || isReviewing}
                          className="px-4 py-2 bg-[#3B82F6] text-white text-[10px] font-bold uppercase tracking-widest rounded-sm hover:bg-[#2563EB] disabled:opacity-50 transition-all"
                        >
                          Run Tool
                        </button>
                      </div>
                      <h3 className={`text-lg font-bold uppercase tracking-tight ${s.panelHeaderText} mb-2`}>{tool.name}</h3>
                      <p className={`text-xs ${s.muted} leading-relaxed`}>{tool.description}</p>
                    </div>
                  ))}
                </div>
                {!code.trim() && (
                  <div className={`p-6 border border-dashed ${s.border} rounded-sm bg-[#1A1A1A] text-center`}>
                    <p className="text-xs font-bold uppercase tracking-widest text-[#EF4444]">
                      Please paste code in the Dashboard before running specialized tools.
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {activePage === 'history' && (
              <motion.div 
                key="history"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className={`text-sm font-bold uppercase tracking-widest ${s.panelHeaderText}`}>Past Analyses ({history.length})</h3>
                  <button 
                    onClick={clearHistory}
                    className="text-[10px] font-bold uppercase tracking-widest text-[#EF4444] hover:text-white flex items-center gap-2"
                  >
                    <Trash2 size={14} /> Clear History
                  </button>
                </div>
                
                <div className="space-y-4">
                  {history.length === 0 ? (
                    <div className="p-12 border border-dashed border-[#333333] rounded-sm text-center opacity-40">
                      <History size={48} className="mx-auto mb-4" />
                      <p className="text-xs uppercase font-bold tracking-widest">No history available</p>
                    </div>
                  ) : (
                    history.map((item) => (
                      <div 
                        key={item.id}
                        className={`border ${s.border} ${s.card} rounded-sm ${s.shadow} overflow-hidden`}
                      >
                        <div className={`p-4 ${s.panelHeader} border-b ${s.border} flex justify-between items-center`}>
                          <div className="flex items-center gap-3">
                            <div className="px-2 py-1 bg-[#3B82F6] text-white text-[8px] font-bold uppercase rounded-sm">
                              {item.toolName || 'Manual'}
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${s.panelHeaderText}`}>
                              {item.language} Analysis
                            </span>
                            <span className={`text-[8px] font-mono ${s.muted}`}>
                              {new Date(item.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <button 
                            onClick={() => {
                              setCode(item.code);
                              setResult(item.result);
                              setActivePage('dashboard');
                            }}
                            className="text-[10px] font-bold uppercase tracking-widest text-[#3B82F6] hover:text-white"
                          >
                            View in Editor
                          </button>
                        </div>
                        <div className="p-4 flex gap-8">
                          <div className="flex-1">
                            <h4 className="text-[8px] font-bold uppercase text-[#A0A0A0] mb-2">Bugs Detected ({item.result.bugs.length})</h4>
                            <div className="flex gap-2 flex-wrap">
                              {item.result.bugs.map((bug, i) => (
                                <div key={i} className={`px-2 py-1 rounded-sm text-[8px] font-bold uppercase border ${bug.severity === 'high' ? 'border-[#EF4444] text-[#EF4444]' : 'border-[#3B82F6] text-[#3B82F6]'}`}>
                                  Line {bug.line}: {bug.severity}
                                </div>
                              ))}
                              {item.result.bugs.length === 0 && <span className="text-[8px] text-[#22C55E] uppercase font-bold">Clean Code</span>}
                            </div>
                          </div>
                          <div className="flex-1 border-l border-[#333333] pl-8">
                            <h4 className="text-[8px] font-bold uppercase text-[#A0A0A0] mb-2">Code Snippet</h4>
                            <pre className="text-[10px] font-mono truncate max-w-md opacity-60 italic">
                              {item.code.slice(0, 100)}...
                            </pre>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {activePage === 'webhooks' && (
              <motion.div 
                key="webhooks"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8"
              >
                <div className="lg:col-span-5 space-y-8">
                  <div className={`border ${s.border} p-6 ${s.card} rounded-sm ${s.shadow}`}>
                    <div className="flex items-center gap-2 mb-4">
                      <Webhook size={18} className="text-[#3B82F6]" />
                      <h2 className={`text-sm font-bold uppercase tracking-widest ${s.panelHeaderText}`}>Webhook Configuration</h2>
                    </div>
                    <p className={`text-xs ${s.muted} mb-4 leading-relaxed`}>
                      Integrate CodeReview AI into your CI/CD pipeline by sending a POST request to the endpoint below.
                    </p>
                    <div className={`${s.inputBg} border ${s.border} p-3 flex items-center justify-between group rounded-sm`}>
                      <code className="text-[10px] font-mono truncate text-[#3B82F6]">{webhookUrl}</code>
                      <button 
                        onClick={() => copyToClipboard(webhookUrl)}
                        className={`p-1 ${s.hoverBg} ${s.muted} hover:text-white transition-colors`}
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                    <div className={`mt-4 p-4 border-l-2 border-[#3B82F6] ${s.panelHeader} rounded-r-sm`}>
                      <h3 className={`text-[10px] font-bold uppercase mb-2 flex items-center gap-1 ${s.panelHeaderText}`}>
                        <Info size={12} className="text-[#3B82F6]" /> Payload Schema
                      </h3>
                      <pre className={`text-[9px] font-mono ${theme === 'light' ? 'text-[#2563EB]' : 'text-[#60A5FA]'}`}>
{`{
  "title": "My Project",
  "code": "const x = 1;",
  "language": "javascript"
}`}
                      </pre>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-7">
                  <div className={`border ${s.border} ${s.card} rounded-sm ${s.shadow} flex flex-col h-[600px] overflow-hidden`}>
                    <div className={`border-b ${s.border} p-3 flex justify-between items-center ${s.panelHeader}`}>
                      <div className="flex items-center gap-2">
                        <History size={14} className="text-[#3B82F6]" />
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${s.panelHeaderText}`}>Recent Webhooks</span>
                      </div>
                      <button 
                        onClick={clearWebhooks}
                        className="p-1 hover:bg-[#EF4444] hover:text-white text-[#EF4444] transition-colors rounded-sm"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      {webhooks.length === 0 ? (
                        <div className={`h-full flex flex-col items-center justify-center ${theme === 'light' ? 'text-[#D1D5DB]' : 'text-[#404040]'} p-6 text-center`}>
                          <Webhook size={32} className="mb-2 opacity-20" />
                          <p className="text-[10px] uppercase font-bold tracking-widest opacity-40">No webhooks received yet</p>
                        </div>
                      ) : (
                        webhooks.map((webhook) => (
                          <div 
                            key={webhook.id}
                            onClick={() => {
                              setSelectedWebhook(webhook);
                              if (webhook.result) setResult(webhook.result);
                              else setResult(null);
                              setActivePage('dashboard');
                            }}
                            className={`p-4 border-b ${s.rowBorder} cursor-pointer transition-all flex items-center justify-between group ${selectedWebhook?.id === webhook.id ? 'bg-[#3B82F6] text-white' : s.hoverBg + ' ' + s.muted + ' hover:text-white'}`}
                          >
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-bold uppercase truncate max-w-[150px]">{webhook.title}</span>
                              <span className="text-[8px] font-mono opacity-50">{new Date(webhook.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded-full border ${webhook.status === 'reviewed' ? 'border-[#22C55E] text-[#22C55E]' : 'border-[#EAB308] text-[#EAB308]'}`}>
                                {webhook.status}
                              </span>
                              <ChevronRight size={14} className="opacity-30 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activePage === 'challenges' && (
              <motion.div 
                key="challenges"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                {!selectedChallenge ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {CHALLENGES.map((challenge) => (
                      <motion.div 
                        key={challenge.id}
                        whileHover={{ y: -5 }}
                        onClick={() => {
                          setSelectedChallenge(challenge);
                          setChallengeCode(challenge.initialCode);
                          setTestResults([]);
                        }}
                        className={`${s.card} border ${s.border} p-6 rounded-sm cursor-pointer hover:border-[#3B82F6] transition-all group`}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="text-lg font-bold uppercase tracking-tighter italic group-hover:text-[#3B82F6] transition-colors">{challenge.title}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest ${
                            challenge.difficulty === 'Easy' ? 'bg-green-500/20 text-green-500' :
                            challenge.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-500' :
                            'bg-red-500/20 text-red-500'
                          }`}>
                            {challenge.difficulty}
                          </span>
                        </div>
                        <p className={`text-xs ${s.muted} mb-6 line-clamp-3 leading-relaxed`}>{challenge.description}</p>
                        <div className="flex items-center gap-2 text-[#3B82F6]">
                          <span className="text-[10px] font-bold uppercase tracking-widest">Start Challenge</span>
                          <ChevronRight size={14} />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-4 space-y-6">
                      <button 
                        onClick={() => setSelectedChallenge(null)}
                        className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest ${s.muted} hover:text-white transition-colors`}
                      >
                        <ChevronRight size={14} className="rotate-180" />
                        Back to Challenges
                      </button>
                      
                      <div className={`${s.card} border ${s.border} p-6 rounded-sm`}>
                        <h2 className="text-2xl font-bold uppercase tracking-tighter italic mb-4">{selectedChallenge.title}</h2>
                        <div className="flex gap-2 mb-6">
                          <span className="px-2 py-0.5 bg-[#3B82F6]/20 text-[#3B82F6] rounded-full text-[8px] font-bold uppercase tracking-widest">
                            {selectedChallenge.language}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest ${
                            selectedChallenge.difficulty === 'Easy' ? 'bg-green-500/20 text-green-500' :
                            selectedChallenge.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-500' :
                            'bg-red-500/20 text-red-500'
                          }`}>
                            {selectedChallenge.difficulty}
                          </span>
                        </div>
                        <div className={`text-sm ${s.muted} leading-relaxed space-y-4`}>
                          <p>{selectedChallenge.description}</p>
                        </div>
                      </div>

                      <div className={`${s.card} border ${s.border} p-6 rounded-sm`}>
                        <h3 className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                          <TestTube2 size={14} className="text-[#3B82F6]" />
                          Test Cases
                        </h3>
                        <div className="space-y-3">
                          {selectedChallenge.testCases.map((tc, idx) => (
                            <div key={idx} className={`p-3 rounded-sm border ${s.border} bg-black/20`}>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-[#3B82F6] mb-1">Input: {tc.input}</p>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-[#22C55E]">Expected: {tc.expectedOutput}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-8 space-y-6">
                      <div className={`border ${s.border} flex flex-col h-[500px] ${s.card} rounded-sm overflow-hidden ${s.shadow}`}>
                        <div className={`border-b ${s.border} p-3 flex justify-between items-center ${s.panelHeader}`}>
                          <div className="flex items-center gap-2">
                            <Terminal size={14} className="text-[#3B82F6]" />
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${s.panelHeaderText}`}>Solution Editor</span>
                          </div>
                        </div>
                        <textarea 
                          value={challengeCode}
                          onChange={(e) => setChallengeCode(e.target.value)}
                          className={`flex-1 p-6 font-mono text-sm ${s.codeBg} ${s.codeText} resize-none focus:outline-none leading-relaxed`}
                          spellCheck={false}
                        />
                        <div className={`p-4 border-t ${s.border} ${s.panelHeader} flex justify-end`}>
                          <button 
                            onClick={evaluateChallenge}
                            disabled={isEvaluating}
                            className="px-8 py-3 bg-[#3B82F6] text-white rounded-sm font-bold uppercase tracking-widest text-xs hover:bg-[#2563EB] transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
                          >
                            {isEvaluating ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                            Run Tests
                          </button>
                        </div>
                      </div>

                      {testResults.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`${s.card} border ${s.border} p-6 rounded-sm`}
                        >
                          <h3 className="text-xs font-bold uppercase tracking-widest mb-4">Results</h3>
                          <div className="space-y-4">
                            {testResults.map((res, idx) => (
                              <div key={idx} className={`p-4 rounded-sm border ${res.passed ? 'border-green-500/50 bg-green-500/5' : 'border-red-500/50 bg-red-500/5'}`}>
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-[10px] font-bold uppercase tracking-widest">{res.description}</span>
                                  <span className={`text-[10px] font-bold uppercase tracking-widest ${res.passed ? 'text-green-500' : 'text-red-500'}`}>
                                    {res.passed ? 'Passed' : 'Failed'}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className={`text-[8px] uppercase ${s.muted} mb-1`}>Expected</p>
                                    <code className="text-[10px] font-mono text-green-500">{res.expected}</code>
                                  </div>
                                  <div>
                                    <p className={`text-[8px] uppercase ${s.muted} mb-1`}>Actual</p>
                                    <code className={`text-[10px] font-mono ${res.passed ? 'text-green-500' : 'text-red-500'}`}>{res.actual}</code>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer className={`border-t ${s.footerBorder} p-6 ${s.footerBg} flex flex-col md:flex-row justify-between items-center gap-4`}>
          <div className={`flex items-center gap-2 ${s.footerText}`}>
            <Code2 size={16} />
            <span className="text-[10px] font-bold uppercase tracking-widest">CodeReview AI Engine</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className={`text-[10px] font-bold uppercase tracking-widest ${s.muted} hover:text-white transition-colors`}>Documentation</a>
            <a href="#" className={`text-[10px] font-bold uppercase tracking-widest ${s.muted} hover:text-white transition-colors`}>API Reference</a>
            <a href="#" className={`text-[10px] font-bold uppercase tracking-widest ${s.muted} hover:text-white transition-colors`}>Support</a>
          </div>
          <div className={`text-[8px] font-mono ${s.footerText}`}>
            © 2026 CODEREVIEW AI SYSTEMS. ALL RIGHTS RESERVED.
          </div>
        </footer>
      </div>
    </div>
  );
}
