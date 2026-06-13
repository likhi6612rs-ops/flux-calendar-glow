import React, { useState, useEffect } from 'react';

// --- Types & Definitions ---
interface Task { id: string; text: string; completed: boolean; assignedTo?: string; }
interface ProjectGroup { id: string; name: string; tasks: Task[]; members: string[]; }

export default function DashboardCore() {
  // --- States ---
  const [userTier, setUserTier] = useState<'Free' | 'Premium' | 'Pro' | 'Ultra Pro'>('Free');
  const [streak, setStreak] = useState(30); // Simulated 30-day milestone for testing
  const [showPaywall, setShowPaywall] = useState(false);
  const [googleLoggedIn, setGoogleLoggedIn] = useState(true);
  
  // PWA Banner States
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPwaBanner, setShowPwaBanner] = useState(false);

  // Focus Timer States (Smart Auto-Break)
  const [isFocusMode, setIsFocusMode] = useState(true); 
  const [timeLeft, setTimeLeft] = useState(25 * 60); 
  const [isActive, setIsActive] = useState(false);
  const [breakDuration, setBreakDuration] = useState(5);

  // Gemini Coach Panel State (Persistence simulation)
  const [roadmapText, setRoadmapText] = useState(() => {
    return localStorage.getItem('gemini_coach_roadmap') || 
      "1. Master Electrostatics foundational math\n2. Complete 5 competitive level mock sets.";
  });

  // Collaboration States
  const [personalTasks] = useState<Task[]>([
    { id: 'p1', text: 'Complete Physics standard practice sets', completed: false }
  ]);

  // --- PWA Banner Logic Hook ---
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const lastDismissed = localStorage.getItem('pwa_banner_dismissed');
      if (googleLoggedIn && (!lastDismissed || Date.now() - Number(lastDismissed) > 24 * 60 * 60 * 1000)) {
        setShowPwaBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, [googleLoggedIn]);

  const triggerPwaInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
    setShowPwaBanner(false);
  };

  // --- Smart Timer Engine ---
  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (isActive && timeLeft === 0) {
      clearInterval(interval);
      if (isFocusMode) {
        setIsFocusMode(false);
        setTimeLeft(breakDuration * 60);
      } else {
        setIsFocusMode(true);
        setTimeLeft(25 * 60);
      }
      setIsActive(true);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, isFocusMode, breakDuration]);

  // Save changes to Gemini coach context
  const handleSaveRoadmap = (text: string) => {
    setRoadmapText(text);
    localStorage.setItem('gemini_coach_roadmap', text);
  };

  const currentPrice = streak >= 30 ? 50 : 99;

  return (
    <div className="min-h-screen bg-[#FDFBFF] text-[#4A4E69] p-6 space-y-6">
      
      {/* 1. Custom Lavender PWA Slide-In Notification */}
      {showPwaBanner && (
        <div className="fixed bottom-6 right-6 max-w-sm bg-[#F3E5F5] border border-[#D1C4E9] rounded-2xl p-5 shadow-xl z-50 animate-bounce">
          <h4 className="font-bold text-[#6A1B9A] text-md">✨ Direct App Installation</h4>
          <p className="text-xs text-[#7986CB] mt-1 mb-3">Install Digital Nervous System instantly to your desktop or phone home screen for offline access.</p>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { localStorage.setItem('pwa_banner_dismissed', Date.now().toString()); setShowPwaBanner(false); }} className="px-3 py-1.5 text-xs font-semibold text-[#9575CD] hover:bg-[#EDE7F6] rounded-xl">Maybe Later</button>
            <button onClick={triggerPwaInstall} className="px-3 py-1.5 text-xs font-semibold text-white bg-[#7E57C2] hover:bg-[#673AB7] rounded-xl shadow-sm">Install Now</button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Balanced App Bar Header */}
        <header className="flex justify-between items-center bg-white p-5 rounded-2xl border border-[#E6E6FA] shadow-sm">
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-[#7E57C2] to-[#9575CD] bg-clip-text text-transparent">Digital Nervous System</h1>
            <p className="text-xs text-gray-400">Status: <span className="text-[#7E57C2] font-medium">{userTier} Membership</span></p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-[#EDE7F6] text-[#673AB7] px-4 py-1.5 rounded-xl text-xs font-bold shadow-sm">
              🔥 {streak} Day Streak
            </div>
          </div>
        </header>

        {/* Dynamic Responsive Workspace Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Column One: Rewards Tracker & Gemini Coach Context Panel */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Gamified Milestone Meter */}
            <div className="bg-white p-5 rounded-2xl border border-[#E6E6FA] space-y-3">
              <h3 className="text-sm font-bold text-[#512DA8] uppercase tracking-wider">🏆 Milestone Reward Tracking</h3>
              <div className="w-full bg-[#EDE7F6] h-2.5 rounded-full overflow-hidden">
                <div className="bg-[#7E57C2] h-full transition-all duration-300" style={{ width: `${Math.min((streak / 30) * 100, 100)}%` }}></div>
              </div>
              <p className="text-xs text-gray-500">
                {streak >= 30 ? (
                  <span className="text-[#2E7D32] font-bold">🎉 30-Day Milestone Achieved! Premium Pro pricing reduced to Rs {currentPrice}</span>
                ) : (
                  <span>Maintain your consecutive streak to unlock your 50% pricing drop.</span>
                )}
              </p>
            </div>

            {/* Layout Polish 4: Procrastination Alert Card with Deep Internal Padding */}
            <div className="bg-white p-8 rounded-3xl border border-[#E6E6FA] shadow-sm space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-[#311B92]">🚨 Procrastination Dashboard Shield</h3>
                  <p className="text-xs text-gray-400">Generous workspace parameters to give your mind breathing room.</p>
                </div>
                <div className="w-14 h-14 rounded-full border-4 border-[#D1C4E9] flex items-center justify-center text-xs font-bold text-[#7E57C2]">
                  70%
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">🔒 Personal Private Tasks (Invisible to Others)</h4>
                {personalTasks.map(t => (
                  <div key={t.id} className="flex items-center gap-3 p-3 bg-[#FBFBFF] rounded-xl border border-[#F3F3FF]">
                    <input type="checkbox" checked={t.completed} readOnly className="rounded text-[#7E57C2]" />
                    <span className="text-xs text-gray-600">{t.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Feature 1 Update: Persistent Gemini Coach Roadmap Panel */}
            <div className="bg-white p-6 rounded-2xl border border-[#E6E6FA] space-y-3">
              <h3 className="text-sm font-bold text-[#512DA8] uppercase tracking-wider">🤖 Gemini Performance Coach Panel</h3>
              <p className="text-xs text-gray-400">Your roadmap context persists safely even if you close the panel.</p>
              <textarea 
                className="w-full h-24 p-3 bg-[#FDFBFF] border border-[#E6E6FA] rounded-xl text-xs focus:outline-[#7E57C2]"
                value={roadmapText}
                onChange={(e) => handleSaveRoadmap(e.target.value)}
              />
            </div>

          </div>

          {/* Column Two: Timer & Workspaces */}
          <div className="space-y-6">
            
            {/* Feature 3 Update: Focus Timer with Automatic Break Switches */}
            <div className="bg-white p-6 rounded-2xl border border-[#E6E6FA] text-center space-y-4 shadow-sm">
              <h3 className="text-xs font-bold tracking-wider text-gray-400 uppercase">
                {isFocusMode ? '🎯 Focus Session' : '☕ Smart Recovery Break'}
              </h3>
              <div className="text-4xl font-mono font-bold text-[#311B92]">
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </div>

              <div className="flex justify-center items-center gap-2 text-xs">
                <button onClick={() => setBreakDuration(p => Math.max(1, p - 1))} className="w-6 h-6 rounded-full bg-[#EDE7F6] font-bold">-</button>
                <span>Break: <span className="font-bold text-[#7E57C2]">{breakDuration}m</span></span>
                <button onClick={() => setBreakDuration(p => p + 1)} className="w-6 h-6 rounded-full bg-[#EDE7F6] font-bold">+</button>
              </div>

              <button onClick={() => setIsActive(!isActive)} className="w-full py-2.5 text-xs text-white bg-[#7E57C2] hover:bg-[#673AB7] rounded-xl font-semibold shadow-sm transition">
                {isActive ? 'Pause Interval' : 'Activate Clock'}
              </button>
            </div>

            {/* Feature 2 Update: Locked Shared Workspace Permissions (Ultra Pro Paywall) */}
            <div onClick={() => { if(userTier !== 'Ultra Pro') setShowPaywall(true); }} className="relative overflow-hidden bg-white p-5 rounded-2xl border border-[#E6E6FA] cursor-pointer shadow-sm">
              {userTier !== 'Ultra Pro' && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-[1px] flex flex-col items-center justify-center text-center p-4 z-10">
                  <span className="text-xl">🔒</span>
                  <h4 className="text-xs font-bold text-[#311B92] mt-1">Multiplayer Workspaces</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">Shared lists require an Ultra Pro tier assignment.</p>
                  <button onClick={(e) => { e.stopPropagation(); setUserTier('Ultra Pro'); }} className="mt-2 text-[10px] bg-[#7E57C2] text-white px-3 py-1 rounded-lg">Simulate Upgrade</button>
                </div>
              )}
              <h3 className="text-xs font-bold text-[#512DA8] uppercase tracking-wider mb-1">👥 Group Collaborations</h3>
              <p className="text-xs text-gray-400">Secure real-time project vectors.</p>
            </div>

          </div>

        </div>

      </div>

      {/* Paywall Upgrade Modal Target */}
      {showPaywall && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-2xl max-w-xs w-full text-center space-y-4 border border-[#E6E6FA]">
            <h3 className="font-bold text-md text-[#311B92]">Unlock Ultra Pro Permissions</h3>
            <p className="text-xs text-gray-500">Shared To-Do lists and dynamic team task workspaces are restricted to Ultra Pro level upgrades.</p>
            <div className="flex flex-col gap-2">
              <button onClick={() => { setUserTier('Ultra Pro'); setShowPaywall(false); }} className="w-full py-2 bg-[#7E57C2] text-white text-xs font-semibold rounded-xl">Confirm Upgrade</button>
              <button onClick={() => setShowPaywall(false)} className="w-full py-2 bg-gray-100 text-xs text-gray-600 rounded-xl">Dismiss</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
