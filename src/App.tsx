/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
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
  LayoutGrid
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
  gambitMatchId: string;
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
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [matches, setMatches] = useState<MatchHistory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const fetchAllMatches = async (wallet: string) => {
    if (!wallet || !opponentWallet) return;
    
    setLoading(true);
    setError(null);
    setMatches([]);
    setProgress({ current: 0, total: 0 });
    
    let allMatches: MatchHistory[] = [];
    let offset = 0;
    const limit = 50;
    let total = 0;

    try {
      const response = await fetch(`/api/proxy/match-history?wallet=${wallet}&offset=0&limit=${limit}`);
      const data: MatchHistoryResponse = await response.json();

      if (!data.status) {
        throw new Error(data.message || 'Failed to fetch match history');
      }

      total = data.data.totalMatches;
      allMatches = [...data.data.matchHistories];
      setProgress({ current: allMatches.length, total });

      while (allMatches.length < total) {
        const currentOffset = allMatches.length;
        const nextResponse = await fetch(`/api/proxy/match-history?wallet=${wallet}&offset=${currentOffset}&limit=${limit}`);
        const nextData: MatchHistoryResponse = await nextResponse.json();
        
        if (!nextData.status) break;
        
        const newMatches = nextData.data.matchHistories;
        if (newMatches.length === 0) break;
        
        allMatches = [...allMatches, ...newMatches];
        setProgress({ current: allMatches.length, total });
      }

      setMatches(allMatches);
      setSearched(true);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const rivalryStats = useMemo(() => {
    const stats: RivalryStats = {
      wins: 0,
      losses: 0,
      draws: 0,
      cancelled: 0,
      total: 0,
      byType: {}
    };

    const filtered = matches.filter(m => 
      m.opponents.some(o => o.opponent.wallet_address.toLowerCase() === opponentWallet.toLowerCase())
    );

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
  }, [matches, opponentWallet]);

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
                  onClick={() => fetchAllMatches(myWallet)}
                  disabled={!myWallet || !opponentWallet}
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
                <h3 className="text-2xl font-bold text-white mb-2">Scanning Match History</h3>
                <p className="text-slate-400 font-mono text-sm">
                  {progress.current} / {progress.total} MATCHES RETRIEVED
                </p>
                <div className="w-64 h-1.5 bg-white/5 rounded-full mt-6 overflow-hidden">
                  <motion.div 
                    className="h-full accent-gradient"
                    initial={{ width: 0 }}
                    animate={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
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
                  <h2 className="text-4xl font-bold text-white tracking-tight">Rivalry Report</h2>
                  <p className="text-slate-400 mt-2 flex items-center gap-2">
                    <span className="font-mono text-xs bg-white/5 px-2 py-1 rounded">{myWallet.slice(0, 6)}...{myWallet.slice(-4)}</span>
                    <span className="text-slate-600">vs</span>
                    <span className="font-mono text-xs bg-orange-500/10 text-orange-400 px-2 py-1 rounded">{opponentWallet.slice(0, 6)}...{opponentWallet.slice(-4)}</span>
                  </p>
                </div>
                
                <div className="flex gap-4">
                  <div className="glass-card px-6 py-4 text-center min-w-[120px]">
                    <p className="text-2xl font-bold text-white">{rivalryStats.stats.total}</p>
                    <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Total Games</p>
                  </div>
                  <div className="glass-card px-6 py-4 text-center min-w-[120px] border-emerald-500/20">
                    <p className="text-2xl font-bold text-emerald-500">
                      {(rivalryStats.stats.wins + rivalryStats.stats.losses) > 0 
                        ? ((rivalryStats.stats.wins / (rivalryStats.stats.wins + rivalryStats.stats.losses)) * 100).toFixed(1) 
                        : 0}%
                    </p>
                    <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Win Rate</p>
                  </div>
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
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                      <History className="w-4 h-4 text-orange-500" /> Match Timeline
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {rivalryStats.filteredMatches.length > 0 ? (
                      rivalryStats.filteredMatches.map((match, idx) => (
                        <motion.div 
                          key={match.matchId}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="glass-card p-5 hover:bg-white/[0.08] transition-all group"
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
                                href={`https://anichess.com/pvp/game/${match.gambitMatchId}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="w-12 h-12 rounded-xl border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all"
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
                                {match.player.playerSpells.map((spell, sIdx) => (
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
                                {match.player.playerSpells.length === 0 && (
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
                                {match.opponents[0]?.opponentSpells.map((spell, sIdx) => (
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
                                {(!match.opponents[0] || match.opponents[0].opponentSpells.length === 0) && (
                                  <span className="text-[10px] font-mono text-slate-600 italic">No spells used</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="glass-card p-20 text-center">
                        <p className="text-slate-500 font-mono text-sm uppercase tracking-widest">No direct encounters found.</p>
                      </div>
                    )}
                  </div>
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
