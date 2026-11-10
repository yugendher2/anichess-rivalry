/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, 
  History, 
  Trophy, 
  Frown, 
  Minus, 
  Loader2, 
  Swords,
  User,
  Shield,
  Target,
  BarChart3,
  ExternalLink,
  ArrowRight,
  Zap,
  Activity,
  Calendar,
  Clock,
  Wand2,
  Ban,
  LayoutGrid,
  Bookmark,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

// --- Types ---

interface Spell {
  code: string;
  manaCost: number;
  bullet: number;
}

interface PlayerInfo {
  id: number;
  username: string;
  wallet_address: string;
  profile_pic_url: string | null;
  rank_game_eligible: boolean;
}

interface MatchPlayer {
  player: PlayerInfo;
  chessPieceColour: string;
  playerInitialRating: number;
  playerRank: string;
  playerSpells: Spell[];
}

interface MatchOpponent {
  opponent: PlayerInfo;
  chessPieceColour: string;
  opponentInitialRating: number;
  opponentRank: string;
  opponentSpells: Spell[];
}

interface MatchHistory {
  matchId: number;
  matchType: string;
  matchOutcome: 'WIN' | 'LOSE' | 'DRAW' | 'CANCELLED';
  matchVariant: string;
  ratingGainLoss: number;
  numOfMoves: number;
  player: MatchPlayer;
  opponents: MatchOpponent[];
  gameEndTimestamp: string;
  matchStartTime: string;
  gameTimeInSecond: number;
  incrementTimeInSecond: number;
  turnVerifierMatchId?: string;
  gambitMatchId?: string;
}

interface MatchHistoryResponse {
  status: boolean;
  message: string;
  data: {
    totalMatches: number;
    matchHistories: MatchHistory[];
  };
}

interface RivalryStats {
  wins: number;
  losses: number;
  draws: number;
  cancelled: number;
  total: number;
  byType: Record<string, { wins: number; losses: number; draws: number; cancelled: number; total: number }>;
}

// --- Constants ---
const COLORS = ['#10b981', '#ef4444', '#64748b', '#f97316'];

export default function App() {
  const [myWallet, setMyWallet] = useState('');
  const [opponentWallet, setOpponentWallet] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [matches, setMatches] = useState<MatchHistory[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalMatches, setTotalMatches] = useState(0);
  const [pageCache, setPageCache] = useState<Record<number, MatchHistory[]>>({});
  const [filterRivalOnly, setFilterRivalOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [tempOpponent, setTempOpponent] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Address Book State
  const [addressBook, setAddressBook] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveAddress, setSaveAddress] = useState('');

  // Fetch address book on mount
  useEffect(() => {
    fetch('/api/address-book')
      .then(async res => {
        const text = await res.text();
        try {
          return JSON.parse(text);
        } catch (e) {
          console.error('Failed to parse address book JSON. Response was:', text);
          return {};
        }
      })
      .then(data => setAddressBook(data))
      .catch(err => console.error('Failed to fetch address book:', err));
  }, []);

  const saveToAddressBook = async () => {
    if (!saveName || !saveAddress) return;
    const newBook = { ...addressBook, [saveAddress.toLowerCase().trim()]: saveName.trim() };
    
    try {
      const response = await fetch('/api/address-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBook)
      });
      
      if (response.ok) {
        setAddressBook(newBook);
        setIsSaving(false);
        setSaveName('');
        setSaveAddress('');
      } else {
        const text = await response.text();
        console.error('Save failed. Status:', response.status, 'Response:', text);
      }
    } catch (err) {
      console.error('Failed to save address book:', err);
    }
  };

  const removeFromAddressBook = async (address: string) => {
    const newBook = { ...addressBook };
    delete newBook[address.toLowerCase().trim()];
    
    try {
      const response = await fetch('/api/address-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBook)
      });
      
      if (response.ok) {
        setAddressBook(newBook);
      }
    } catch (err) {
      console.error('Failed to remove from address book:', err);
    }
  };

  const fetchPage = async (page: number, walletToFetch?: string) => {
    const activeWallet = (walletToFetch || myWallet).trim().toLowerCase();
    if (!activeWallet) return;

    if (pageCache[page]) {
      setMatches(pageCache[page]);
      setCurrentPage(page);
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setPageLoading(true);
    setError(null);
    try {
      const offset = (page - 1) * 50;
      const response = await fetch(`/api/proxy/match-history?wallet=${activeWallet}&offset=${offset}&limit=50`);
      const data: MatchHistoryResponse = await response.json();

      if (!data.status) {
        throw new Error(data.message || 'Failed to fetch match history page');
      }

      const newMatches = data.data.matchHistories || [];
      setTotalMatches(data.data.totalMatches);
      setPageCache(prev => ({ ...prev, [page]: newMatches }));
      setMatches(newMatches);
      setCurrentPage(page);
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch page data');
    } finally {
      setPageLoading(false);
    }
  };

  const startSearch = async (walletInput: string) => {
    const wallet = walletInput.trim().toLowerCase();
    const opponent = opponentWallet.trim().toLowerCase();
    
    if (!wallet) return;
    
    setMyWallet(wallet);
    setOpponentWallet(opponent);
    setTempOpponent(opponent);
    setFilterRivalOnly(Boolean(opponent));
    setLoading(true);
    setError(null);
    setMatches([]);
    setPageCache({});
    setCurrentPage(1);
    
    try {
      const response = await fetch(`/api/proxy/match-history?wallet=${wallet}&offset=0&limit=50`);
      const data: MatchHistoryResponse = await response.json();

      if (!data.status) {
        throw new Error(data.message || 'Failed to fetch match history');
      }

      const initialMatches = data.data.matchHistories || [];
      const total = data.data.totalMatches || 0;
      setTotalMatches(total);
      setMatches(initialMatches);
      setPageCache({ 1: initialMatches });
      setSearched(true);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalMatches / 50));

  const getPaginationRange = () => {
    const delta = 2;
    const range: (number | string)[] = [];
    const rangeWithDots: (number | string)[] = [];
    let l: number | undefined;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        range.push(i);
      }
    }

    for (const i of range) {
      if (typeof i === 'number') {
        if (l !== undefined) {
          if (i - l === 2) {
            rangeWithDots.push(l + 1);
          } else if (i - l !== 1) {
            rangeWithDots.push('...');
          }
        }
        rangeWithDots.push(i);
        l = i;
      }
    }

    return rangeWithDots;
  };

  const allCachedMatches = useMemo(() => {
    return Object.values(pageCache).flat();
  }, [pageCache]);

  const rivalryStats = useMemo(() => {
    const stats: RivalryStats = {
      wins: 0,
      losses: 0,
      draws: 0,
      cancelled: 0,
      total: 0,
      byType: {}
    };

    const targetMatches = allCachedMatches.length > 0 ? allCachedMatches : matches;
    const filtered = opponentWallet 
      ? targetMatches.filter(m => 
          m.opponents.some(o => o.opponent.wallet_address.toLowerCase() === opponentWallet.trim().toLowerCase())
        )
      : targetMatches;

    filtered.forEach(m => {
      stats.total++;
      if (!stats.byType[m.matchType]) {
        stats.byType[m.matchType] = { wins: 0, losses: 0, draws: 0, cancelled: 0, total: 0 };
      }
      stats.byType[m.matchType].total++;

      if (m.matchOutcome === 'WIN') {
        stats.wins++;
        stats.byType[m.matchType].wins++;
      } else if (m.matchOutcome === 'LOSE') {
        stats.losses++;
        stats.byType[m.matchType].losses++;
      } else if (m.matchOutcome === 'DRAW') {
        stats.draws++;
        stats.byType[m.matchType].draws++;
      } else if (m.matchOutcome === 'CANCELLED') {
        stats.cancelled++;
        stats.byType[m.matchType].cancelled++;
      }
    });

    return { stats, filteredMatches: filtered };
  }, [allCachedMatches, matches, opponentWallet]);

  const displayedMatches = useMemo(() => {
    if (filterRivalOnly && opponentWallet) {
      return matches.filter(m => 
        m.opponents.some(o => o.opponent.wallet_address.toLowerCase() === opponentWallet.trim().toLowerCase())
      );
    }
    return matches;
  }, [matches, filterRivalOnly, opponentWallet]);

  const chartData = [
    { name: 'Wins', value: rivalryStats.stats.wins },
    { name: 'Losses', value: rivalryStats.stats.losses },
    { name: 'Draws', value: rivalryStats.stats.draws },
    { name: 'Cancelled', value: rivalryStats.stats.cancelled },
  ].filter(d => d.value > 0);

  const barData = Object.entries(rivalryStats.stats.byType).map(([type, s]) => ({
    name: type,
    Wins: (s as any).wins,
    Losses: (s as any).losses,
    Draws: (s as any).draws,
    Cancelled: (s as any).cancelled
  }));

  return (
    <div className="min-h-screen font-sans selection:bg-orange-500/30">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 border-b border-white/5 bg-black/20 backdrop-blur-xl px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 accent-gradient rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Swords className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Anichess Rivalry</h1>
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">v2.0 Analytics Engine</p>
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto p-6 pt-12">
        {/* Hero / Search Section */}
        <AnimatePresence mode="wait">
          {!searched && !loading ? (
            <motion.div 
              key="hero"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-3xl mx-auto text-center py-20"
            >
              <h2 className="text-5xl md:text-7xl font-bold tracking-tighter text-white mb-6 leading-tight">
                Analyze Your <span className="text-orange-500">Battle History</span>
              </h2>
              <p className="text-lg text-slate-400 mb-12 max-w-xl mx-auto">
                Deep-dive into your Anichess PVP performance. Track every win, loss, and draw against specific opponents across all formats.
              </p>

              <div className="glass-card p-2 flex flex-col md:flex-row gap-2 shadow-2xl">
                <div className="flex-1 flex items-center px-4 gap-3 border-b md:border-b-0 md:border-r border-white/5 py-3">
                  <User className="w-5 h-5 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Your Wallet Address"
                    value={myWallet}
                    onChange={(e) => setMyWallet(e.target.value)}
                    className="bg-transparent border-none focus:ring-0 text-white placeholder:text-slate-600 w-full"
                  />
                </div>
                <div className="flex-1 flex items-center px-4 gap-3 py-3">
                  <Target className="w-5 h-5 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Opponent Wallet Address"
                    value={opponentWallet}
                    onChange={(e) => setOpponentWallet(e.target.value)}
                    className="bg-transparent border-none focus:ring-0 text-white placeholder:text-slate-600 w-full"
                  />
                </div>
                <button 
                  onClick={() => startSearch(myWallet)}
                  disabled={!myWallet}
                  className="accent-gradient text-white px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
                >
                  Analyze Rivalry
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mt-8 flex items-center justify-center gap-8 text-slate-500 text-xs font-mono uppercase tracking-widest">
                <div className="flex items-center gap-2"><Zap className="w-4 h-4" /> Real-time Data</div>
                <div className="flex items-center gap-2"><Activity className="w-4 h-4" /> Deep Analysis</div>
                <div className="flex items-center gap-2"><Shield className="w-4 h-4" /> Secure Proxy</div>
              </div>

              {/* Address Book Section */}
              <div className="mt-16 max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                    <Bookmark className="w-4 h-4 text-orange-500" /> Address Book
                  </h3>
                  <button 
                    onClick={() => setIsSaving(true)}
                    className="text-[10px] font-mono text-orange-500 hover:text-orange-400 flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Add New
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Object.entries(addressBook).map(([address, name]) => (
                    <div key={address} className="glass-card p-4 flex items-center justify-between group hover:border-orange-500/30 transition-all">
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => {
                          setMyWallet(address);
                        }}
                      >
                        <p className="text-sm font-bold text-white truncate">{name}</p>
                        <p className="text-[10px] font-mono text-slate-500 truncate">{address.slice(0, 6)}...{address.slice(-4)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setOpponentWallet(address)}
                          className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-orange-500 transition-colors"
                          title="Set as Opponent"
                        >
                          <Target className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => removeFromAddressBook(address)}
                          className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {Object.keys(addressBook).length === 0 && (
                    <div className="col-span-2 py-8 border border-dashed border-white/5 rounded-2xl text-center">
                      <p className="text-xs font-mono text-slate-600 uppercase tracking-widest">No saved addresses</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Save Address Modal */}
              <AnimatePresence>
                {isSaving && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setIsSaving(false)}
                      className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 20 }}
                      className="relative w-full max-w-md glass-card p-8 shadow-2xl"
                    >
                      <h3 className="text-xl font-bold text-white mb-6">Save Address</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2 block">Display Name</label>
                          <input 
                            type="text"
                            value={saveName}
                            onChange={(e) => setSaveName(e.target.value)}
                            placeholder="e.g. My Main Wallet"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-orange-500/50 focus:ring-0 transition-all"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2 block">Wallet Address</label>
                          <input 
                            type="text"
                            value={saveAddress}
                            onChange={(e) => setSaveAddress(e.target.value)}
                            placeholder="0x..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-orange-500/50 focus:ring-0 transition-all"
                          />
                        </div>
                        <div className="flex gap-3 pt-4">
                          <button 
                            onClick={() => setIsSaving(false)}
                            className="flex-1 px-6 py-3 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5 transition-all"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={saveToAddressBook}
                            disabled={!saveName || !saveAddress}
                            className="flex-1 accent-gradient text-white px-6 py-3 rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                          >
                            Save Entry
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-40"
            >
              <div className="relative">
                <div className="w-24 h-24 border-4 border-orange-500/20 rounded-full animate-pulse" />
                <Loader2 className="absolute inset-0 w-24 h-24 text-orange-500 animate-spin" />
              </div>
              <div className="mt-12 text-center">
                <h3 className="text-2xl font-bold text-white mb-2">Loading Battle History</h3>
                <p className="text-slate-400 font-mono text-sm">
                  RETRIEVING PAGE 1 (50 MATCHES)...
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="results"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-8"
            >
              {/* Results Header */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-white/5">
                <div>
                  <button 
                    onClick={() => setSearched(false)}
                    className="text-slate-500 hover:text-white text-xs font-mono uppercase tracking-widest mb-4 flex items-center gap-2 transition-colors"
                  >
                    <ArrowRight className="w-4 h-4 rotate-180" /> Back to Search
                  </button>
                  <h2 className="text-4xl font-bold text-white tracking-tight">Battle & Rivalry Report</h2>
                  <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <p className="text-slate-400 flex items-center gap-2">
                      <span className="font-mono text-xs bg-white/5 px-2 py-1 rounded">{myWallet.slice(0, 6)}...{myWallet.slice(-4)}</span>
                      <span className="text-slate-600">vs</span>
                    </p>
                    <div className="relative group">
                      <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 focus-within:border-orange-500/50 transition-all">
                        <Search className="w-3.5 h-3.5 text-slate-500" />
                        <input 
                          type="text"
                          value={tempOpponent}
                          onChange={(e) => setTempOpponent(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const opp = tempOpponent.trim().toLowerCase();
                              setOpponentWallet(opp);
                              if (opp) setFilterRivalOnly(true);
                            }
                          }}
                          placeholder="Filter by opponent..."
                          className="bg-transparent border-none focus:ring-0 text-xs font-mono text-orange-400 placeholder:text-slate-600 w-48"
                        />
                        {tempOpponent.toLowerCase() !== opponentWallet.toLowerCase() && (
                          <button 
                            onClick={() => {
                              const opp = tempOpponent.trim().toLowerCase();
                              setOpponentWallet(opp);
                              if (opp) setFilterRivalOnly(true);
                            }}
                            className="text-[10px] font-bold text-orange-500 hover:text-orange-400 uppercase tracking-tighter"
                          >
                            Apply
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="glass-card px-6 py-4 text-center min-w-[120px]">
                    <p className="text-2xl font-bold text-white">{totalMatches.toLocaleString()}</p>
                    <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Total Matches</p>
                  </div>
                  {opponentWallet ? (
                    <>
                      <div className="glass-card px-6 py-4 text-center min-w-[120px] border-orange-500/20">
                        <p className="text-2xl font-bold text-orange-400">{rivalryStats.stats.total}</p>
                        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">vs Rival</p>
                      </div>
                      <div className="glass-card px-6 py-4 text-center min-w-[120px] border-emerald-500/20">
                        <p className="text-2xl font-bold text-emerald-500">
                          {(rivalryStats.stats.wins + rivalryStats.stats.losses) > 0 
                            ? ((rivalryStats.stats.wins / (rivalryStats.stats.wins + rivalryStats.stats.losses)) * 100).toFixed(1) 
                            : 0}%
                        </p>
                        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Rival Win Rate</p>
                      </div>
                    </>
                  ) : (
                    <div className="glass-card px-6 py-4 text-center min-w-[120px] border-emerald-500/20">
                      <p className="text-2xl font-bold text-emerald-500">{totalPages}</p>
                      <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Total Pages</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Stats Column */}
                <div className="lg:col-span-4 space-y-8">
                  <div className="glass-card p-8">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-8 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-orange-500" /> Outcome Distribution
                    </h3>
                    
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={90}
                            paddingAngle={8}
                            dataKey="value"
                            stroke="none"
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip 
                            contentStyle={{ 
                              backgroundColor: '#1A1A1C', 
                              border: '1px solid rgba(255,255,255,0.1)', 
                              borderRadius: '12px',
                              color: '#fff',
                              fontSize: '12px'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-4 gap-2 mt-8">
                      <div className="text-center">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 mx-auto mb-2" />
                        <p className="text-xl font-bold text-white">{rivalryStats.stats.wins}</p>
                        <p className="text-[10px] font-mono text-slate-500 uppercase">Wins</p>
                      </div>
                      <div className="text-center">
                        <div className="w-2 h-2 rounded-full bg-red-500 mx-auto mb-2" />
                        <p className="text-xl font-bold text-white">{rivalryStats.stats.losses}</p>
                        <p className="text-[10px] font-mono text-slate-500 uppercase">Losses</p>
                      </div>
                      <div className="text-center">
                        <div className="w-2 h-2 rounded-full bg-slate-500 mx-auto mb-2" />
                        <p className="text-xl font-bold text-white">{rivalryStats.stats.draws}</p>
                        <p className="text-[10px] font-mono text-slate-500 uppercase">Draws</p>
                      </div>
                      <div className="text-center">
                        <div className="w-2 h-2 rounded-full bg-orange-500 mx-auto mb-2" />
                        <p className="text-xl font-bold text-white">{rivalryStats.stats.cancelled}</p>
                        <p className="text-[10px] font-mono text-slate-500 uppercase">Cancelled</p>
                      </div>
                    </div>
                  </div>

                  <div className="glass-card p-8">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-8">Format Performance</h3>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fill: '#64748b' }} 
                          />
                          <YAxis hide />
                          <RechartsTooltip 
                            cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                            contentStyle={{ 
                              backgroundColor: '#1A1A1C', 
                              border: '1px solid rgba(255,255,255,0.1)', 
                              borderRadius: '12px',
                              color: '#fff'
                            }}
                          />
                          <Bar dataKey="Wins" fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} />
                          <Bar dataKey="Losses" fill="#ef4444" stackId="a" radius={[0, 0, 0, 0]} />
                          <Bar dataKey="Draws" fill="#64748b" stackId="a" radius={[0, 0, 0, 0]} />
                          <Bar dataKey="Cancelled" fill="#f97316" stackId="a" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="glass-card p-8">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                      <LayoutGrid className="w-4 h-4 text-orange-500" /> Detailed Format Stats
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-white/5">
                            <th className="pb-3 text-[10px] font-mono text-slate-500 uppercase tracking-widest">Type</th>
                            <th className="pb-3 text-[10px] font-mono text-slate-500 uppercase tracking-widest text-center">W</th>
                            <th className="pb-3 text-[10px] font-mono text-slate-500 uppercase tracking-widest text-center">L</th>
                            <th className="pb-3 text-[10px] font-mono text-slate-500 uppercase tracking-widest text-center">D</th>
                            <th className="pb-3 text-[10px] font-mono text-slate-500 uppercase tracking-widest text-center">C</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {Object.entries(rivalryStats.stats.byType).map(([type, s]) => {
                            const stats = s as { wins: number; losses: number; draws: number; cancelled: number };
                            return (
                              <tr key={type} className="group">
                                <td className="py-3 text-sm font-bold text-white tracking-tight">{type}</td>
                                <td className="py-3 text-sm font-mono text-emerald-500 text-center">{stats.wins}</td>
                                <td className="py-3 text-sm font-mono text-red-500 text-center">{stats.losses}</td>
                                <td className="py-3 text-sm font-mono text-slate-400 text-center">{stats.draws}</td>
                                <td className="py-3 text-sm font-mono text-orange-500 text-center">{stats.cancelled}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Feed Column */}
                <div className="lg:col-span-8 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                        <History className="w-4 h-4 text-orange-500" /> Match Timeline
                      </h3>
                      <p className="text-xs font-mono text-slate-500 mt-1">
                        Page {currentPage} of {totalPages} • Showing {totalMatches > 0 ? (currentPage - 1) * 50 + 1 : 0}–{Math.min(currentPage * 50, totalMatches)} of {totalMatches.toLocaleString()} games
                      </p>
                    </div>

                    {opponentWallet && (
                      <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/5 text-xs font-mono">
                        <button
                          onClick={() => setFilterRivalOnly(false)}
                          className={`px-3 py-1.5 rounded-lg transition-all ${
                            !filterRivalOnly 
                              ? 'bg-orange-500 text-white font-bold shadow-md shadow-orange-500/20' 
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          All Matches ({matches.length})
                        </button>
                        <button
                          onClick={() => setFilterRivalOnly(true)}
                          className={`px-3 py-1.5 rounded-lg transition-all ${
                            filterRivalOnly 
                              ? 'bg-orange-500 text-white font-bold shadow-md shadow-orange-500/20' 
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Only Rival ({matches.filter(m => m.opponents.some(o => o.opponent?.wallet_address?.toLowerCase() === opponentWallet.toLowerCase())).length})
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Fixed-length scrollable match container (50 games) */}
                  <div 
                    ref={scrollContainerRef}
                    className="relative max-h-[660px] overflow-y-auto pr-2 space-y-4 custom-scrollbar rounded-2xl"
                  >
                    {pageLoading && (
                      <div className="sticky top-0 left-0 right-0 py-10 bg-black/75 backdrop-blur-md z-30 flex flex-col items-center justify-center rounded-2xl gap-3 border border-orange-500/20 shadow-2xl my-2">
                        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                        <span className="text-xs font-mono text-slate-300 uppercase tracking-widest">
                          Loading 50 games for Page {currentPage}...
                        </span>
                      </div>
                    )}

                    {displayedMatches.length > 0 ? (
                      displayedMatches.map((match, idx) => {
                        const matchOpponent = match.opponents[0]?.opponent;
                        const oppAddress = matchOpponent?.wallet_address?.toLowerCase() || '';
                        const isRival = opponentWallet && oppAddress === opponentWallet;
                        const opponentDisplayName = oppAddress 
                          ? (addressBook[oppAddress] || `${oppAddress.slice(0, 6)}...${oppAddress.slice(-4)}`) 
                          : 'Unknown';

                        return (
                          <motion.div 
                            key={`${match.matchId}-${idx}`}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: Math.min(idx * 0.02, 0.2) }}
                            className={`glass-card p-5 hover:bg-white/[0.08] transition-all group ${
                              isRival ? 'border-orange-500/40 bg-orange-500/[0.03]' : ''
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-6">
                              <div className="flex items-center gap-5">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${
                                  match.matchOutcome === 'WIN' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                                  match.matchOutcome === 'LOSE' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                                  match.matchOutcome === 'DRAW' ? 'bg-slate-500/10 border-slate-500/20 text-slate-400' :
                                  'bg-orange-500/10 border-orange-500/20 text-orange-500'
                                }`}>
                                  {match.matchOutcome === 'WIN' ? <Trophy className="w-7 h-7" /> :
                                   match.matchOutcome === 'LOSE' ? <Frown className="w-7 h-7" /> :
                                   match.matchOutcome === 'DRAW' ? <Minus className="w-7 h-7" /> :
                                   <Ban className="w-7 h-7" />}
                                </div>
                                
                                <div>
                                  <div className="flex items-center gap-3 mb-1">
                                    <span className="text-lg font-bold text-white">{match.matchType}</span>
                                    <span className="text-[10px] font-mono text-slate-500 bg-white/5 px-2 py-0.5 rounded uppercase tracking-wider">
                                      {match.matchVariant}
                                    </span>
                                    {isRival ? (
                                      <span className="text-[10px] font-mono text-orange-400 bg-orange-500/10 border border-orange-500/30 px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                                        <Target className="w-3 h-3" /> Rival
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded">
                                        vs {opponentDisplayName}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-4 text-xs text-slate-500">
                                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {new Date(match.gameEndTimestamp).toLocaleDateString()}</span>
                                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {Math.floor(match.gameTimeInSecond / 60)}m {match.gameTimeInSecond % 60}s</span>
                                    <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> {match.numOfMoves} Moves</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-10">
                                <div className="text-right">
                                  <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">Rating Delta</p>
                                  <p className={`text-xl font-bold ${
                                    match.ratingGainLoss > 0 ? 'text-emerald-500' :
                                    match.ratingGainLoss < 0 ? 'text-red-500' :
                                    'text-slate-400'
                                  }`}>
                                    {match.ratingGainLoss > 0 ? '+' : ''}{match.ratingGainLoss}
                                  </p>
                                </div>
                                
                                <a 
                                  href={`https://anichess.com/pvp/game/${match.turnVerifierMatchId || match.gambitMatchId}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="w-12 h-12 rounded-xl border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all"
                                  title="Replay Match"
                                >
                                  <ExternalLink className="w-5 h-5" />
                                </a>
                              </div>
                            </div>

                            {/* Spells Section */}
                            <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Player Spells */}
                              <div>
                                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                  <Wand2 className="w-3 h-3 text-blue-400" /> Your Loadout
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {match.player?.playerSpells?.map((spell, sIdx) => (
                                    <div 
                                      key={sIdx} 
                                      className="bg-white/5 border border-white/5 px-2 py-1 rounded text-[10px] font-mono text-slate-300 flex items-center gap-2"
                                      title={`Mana: ${spell.manaCost}, Bullet: ${spell.bullet}`}
                                    >
                                      <span className="text-blue-400/80">{spell.code.replace(/_/g, ' ')}</span>
                                      <span className="opacity-30">|</span>
                                      <span className="text-slate-500">{spell.manaCost}M</span>
                                    </div>
                                  ))}
                                  {(!match.player?.playerSpells || match.player.playerSpells.length === 0) && (
                                    <span className="text-[10px] font-mono text-slate-600 italic">No spells used</span>
                                  )}
                                </div>
                              </div>

                              {/* Opponent Spells */}
                              <div>
                                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                  <Wand2 className="w-3 h-3 text-orange-400" /> Opponent Loadout
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {match.opponents[0]?.opponentSpells?.map((spell, sIdx) => (
                                    <div 
                                      key={sIdx} 
                                      className="bg-orange-500/5 border border-orange-500/10 px-2 py-1 rounded text-[10px] font-mono text-slate-300 flex items-center gap-2"
                                      title={`Mana: ${spell.manaCost}, Bullet: ${spell.bullet}`}
                                    >
                                      <span className="text-orange-400/80">{spell.code.replace(/_/g, ' ')}</span>
                                      <span className="opacity-30">|</span>
                                      <span className="text-slate-500">{spell.manaCost}M</span>
                                    </div>
                                  ))}
                                  {(!match.opponents[0]?.opponentSpells || match.opponents[0].opponentSpells.length === 0) && (
                                    <span className="text-[10px] font-mono text-slate-600 italic">No spells used</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })
                    ) : (
                      <div className="glass-card p-16 text-center">
                        <p className="text-slate-400 font-mono text-sm uppercase tracking-widest mb-2">No encounters found on Page {currentPage}</p>
                        {filterRivalOnly && (
                          <button
                            onClick={() => setFilterRivalOnly(false)}
                            className="text-xs font-mono text-orange-400 underline hover:text-orange-300 mt-2"
                          >
                            Click to show all {matches.length} matches on this page
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="glass-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => fetchPage(1)}
                          disabled={currentPage === 1 || pageLoading}
                          className="p-2 rounded-xl border border-white/10 hover:bg-white/10 disabled:opacity-20 disabled:hover:bg-transparent transition-all text-slate-300"
                          title="First Page"
                        >
                          <ChevronsLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => fetchPage(currentPage - 1)}
                          disabled={currentPage === 1 || pageLoading}
                          className="px-3 py-2 rounded-xl border border-white/10 hover:bg-white/10 disabled:opacity-20 disabled:hover:bg-transparent transition-all text-xs font-mono text-slate-300 flex items-center gap-1.5"
                        >
                          <ChevronLeft className="w-4 h-4" /> Prev
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap justify-center">
                        {getPaginationRange().map((pageItem, pIdx) => {
                          if (pageItem === '...') {
                            return (
                              <span key={`dots-${pIdx}`} className="px-2 py-1 text-slate-600 font-mono text-xs">
                                ...
                              </span>
                            );
                          }

                          const pageNum = Number(pageItem);
                          const isActive = pageNum === currentPage;

                          return (
                            <button
                              key={`page-${pageNum}`}
                              onClick={() => fetchPage(pageNum)}
                              disabled={pageLoading}
                              className={`w-9 h-9 rounded-xl text-xs font-mono font-bold transition-all ${
                                isActive
                                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 scale-105'
                                  : 'border border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => fetchPage(currentPage + 1)}
                          disabled={currentPage === totalPages || pageLoading}
                          className="px-3 py-2 rounded-xl border border-white/10 hover:bg-white/10 disabled:opacity-20 disabled:hover:bg-transparent transition-all text-xs font-mono text-slate-300 flex items-center gap-1.5"
                        >
                          Next <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => fetchPage(totalPages)}
                          disabled={currentPage === totalPages || pageLoading}
                          className="p-2 rounded-xl border border-white/10 hover:bg-white/10 disabled:opacity-20 disabled:hover:bg-transparent transition-all text-slate-300"
                          title="Last Page"
                        >
                          <ChevronsRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-8 right-8 glass-card border-red-500/50 bg-red-500/10 p-4 text-red-400 text-sm font-medium flex items-center gap-3 shadow-2xl"
          >
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            {error}
            <button onClick={() => setError(null)} className="ml-4 hover:text-white">✕</button>
          </motion.div>
        )}
      </main>

      <footer className="relative z-10 p-12 mt-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3 opacity-50">
            <Swords className="w-5 h-5" />
            <span className="text-xs font-mono uppercase tracking-widest">Anichess Rivalry Analytics</span>
          </div>
          <div className="flex gap-8 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
            <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> API Connected</span>
            <span>Data provided by Anichess PVP</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
