import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Tv, Heart, Search, Filter, Info, Star, Clock, AlertCircle, 
  RefreshCcw, ChevronRight, ChevronLeft, ChevronUp, ChevronDown, ArrowRight, Video, Layers, Check, Plus, Trash2, Home
} from 'lucide-react';
import { LIVE_CHANNELS, LiveChannel } from './data';
import VideoPlayer from './components/VideoPlayer';
import LiveTvPlayer from './components/LiveTvPlayer';

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<'warez' | 'tv' | 'watchlist'>('warez');
  
  // Watchlist (Local Storage)
  const [watchlist, setWatchlist] = useState<any[]>(() => {
    const saved = localStorage.getItem('warez_watchlist_v2');
    return saved ? JSON.parse(saved) : [];
  });

  // Active Video Player States
  const [activeVideo, setActiveVideo] = useState<any | null>(null);
  const [activeChannel, setActiveChannel] = useState<LiveChannel>(LIVE_CHANNELS[0]);

  // IPTV States
  const [iptvChannels, setIptvChannels] = useState<LiveChannel[]>(LIVE_CHANNELS);
  const [iptvCountries, setIptvCountries] = useState<string[]>(['BR', 'US', 'AR', 'MX']);
  const [iptvCategories, setIptvCategories] = useState<string[]>(['Filmes', 'Notícias', 'Esportes', 'Documentários']);
  const [selectedIptvCountry, setSelectedIptvCountry] = useState<string>('BR');
  const [selectedIptvCategory, setSelectedIptvCategory] = useState<string>('');
  const [iptvSearchQuery, setIptvSearchQuery] = useState<string>('');
  const [isFetchingIptv, setIsFetchingIptv] = useState<boolean>(false);
  const [isSynchronizingM3u, setIsSynchronizingM3u] = useState<boolean>(false);
  const [iptvTotal, setIptvTotal] = useState<number>(LIVE_CHANNELS.length);
  const [iptvPage, setIptvPage] = useState<number>(1);
  const [iptvLoadingError, setIptvLoadingError] = useState<string>('');

  // Warez CDN Integration States
  const [warezQuery, setWarezQuery] = useState('');
  const [warezResults, setWarezResults] = useState<any[]>([]);
  const [isSearchingWarez, setIsSearchingWarez] = useState(false);
  const [selectedWarezContent, setSelectedWarezContent] = useState<any | null>(null);
  const [selectedWarezSeason, setSelectedWarezSeason] = useState<number>(1);
  const [selectedWarezEpisode, setSelectedWarezEpisode] = useState<number>(1);
  const [activeWarezPlayer, setActiveWarezPlayer] = useState<{
    tmdbId: string;
    imdbId?: string;
    title: string;
    type: 'movie' | 'series';
    season?: number;
    episode?: number;
  } | null>(null);
  const [embedSource, setEmbedSource] = useState<string>('servidor_1');
  const [warezDomain, setWarezDomain] = useState<'embed.warezcdn.lat' | 'embed.warezcdn.link'>('embed.warezcdn.lat');
  const [warezSearchError, setWarezSearchError] = useState<string>('');

  // ==================== TV & KEYBOARD NAVIGATION (D-PAD) ====================
  // focusedSection: 'sidebar' | 'grid' | 'modal'
  const [focusedSection, setFocusedSection] = useState<'sidebar' | 'grid' | 'modal'>('sidebar');
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [lastRemoteAction, setLastRemoteAction] = useState<string>('');
  const [showRemote, setShowRemote] = useState<boolean>(true);

  // Sync Watchlist
  useEffect(() => {
    localStorage.setItem('warez_watchlist_v2', JSON.stringify(watchlist));
  }, [watchlist]);

  const toggleWatchlist = (item: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const exists = watchlist.some(w => w.id === item.id);
    if (exists) {
      setWatchlist(prev => prev.filter(w => w.id !== item.id));
    } else {
      setWatchlist(prev => [...prev, item]);
    }
  };

  const isFavorited = (id: string) => watchlist.some(w => w.id === id);

  // Search Warez
  const handleSearchWarez = async (queryToSearch?: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = queryToSearch || warezQuery;
    if (!q.trim()) return;

    setIsSearchingWarez(true);
    setWarezSearchError('');
    try {
      const res = await fetch(`/api/warez/search?query=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error('Falha ao pesquisar no catálogo geral.');
      const data = await res.json();
      setWarezResults(data || []);
      // Auto-focus the search grid once results arrive
      if (data && data.length > 0) {
        setFocusedSection('grid');
        setFocusedIndex(0);
      }
    } catch (err: any) {
      console.error(err);
      setWarezSearchError(err.message || 'Erro inesperado ao buscar mídias.');
    } finally {
      setIsSearchingWarez(false);
    }
  };

  // Fetch dynamic IPTV channels
  const fetchIptvChannelsList = async (page: number = 1, resetList: boolean = false) => {
    setIsFetchingIptv(true);
    setIptvLoadingError('');
    try {
      const limit = 45;
      const offset = (page - 1) * limit;
      let url = `/api/iptv/channels?limit=${limit}&offset=${offset}`;
      
      if (selectedIptvCountry) url += `&country=${encodeURIComponent(selectedIptvCountry)}`;
      if (selectedIptvCategory) url += `&category=${encodeURIComponent(selectedIptvCategory)}`;
      if (iptvSearchQuery) url += `&search=${encodeURIComponent(iptvSearchQuery)}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('Falha ao sintonizar servidores de TV.');
      const data = await res.json();
      
      setIsSynchronizingM3u(!!data.isFetching);

      if (resetList || page === 1) {
        setIptvChannels(data.channels || LIVE_CHANNELS);
      } else {
        setIptvChannels(prev => {
          const existingIds = new Set(prev.map(ch => ch.id));
          const filteredNew = (data.channels || []).filter((ch: LiveChannel) => !existingIds.has(ch.id));
          return [...prev, ...filteredNew];
        });
      }
      
      setIptvTotal(data.total || LIVE_CHANNELS.length);
      if (data.countries && data.countries.length > 0) setIptvCountries(data.countries);
      if (data.categories && data.categories.length > 0) setIptvCategories(data.categories);

      if (data.channels && data.channels.length > 0 && resetList) {
        setActiveChannel(data.channels[0]);
      }
    } catch (err: any) {
      console.error('Error fetching IPTV:', err);
      // Fallback to static offline channels on failure
      setIptvChannels(LIVE_CHANNELS);
      setIptvTotal(LIVE_CHANNELS.length);
    } finally {
      setIsFetchingIptv(false);
    }
  };

  const reloadIptvDatabase = async () => {
    try {
      setIsSynchronizingM3u(true);
      await fetch('/api/iptv/reload', { method: 'POST' });
      setTimeout(() => {
        fetchIptvChannelsList(1, true);
      }, 2500);
    } catch (e) {
      console.error('Failed to trigger database reload', e);
    }
  };

  useEffect(() => {
    if (activeTab === 'tv') {
      fetchIptvChannelsList(1, true);
      setIptvPage(1);
    }
  }, [selectedIptvCountry, selectedIptvCategory, activeTab]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'tv' && iptvSearchQuery) {
        fetchIptvChannelsList(1, true);
        setIptvPage(1);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [iptvSearchQuery]);

  // ==================== D-PAD CONTROLLER ACTION ROUTER ====================
  const triggerRemoteAction = (action: string) => {
    setLastRemoteAction(action);
    setTimeout(() => setLastRemoteAction(''), 300);

    if (focusedSection === 'sidebar') {
      const tabs: ('warez' | 'tv' | 'watchlist')[] = ['warez', 'tv', 'watchlist'];
      const currentIndex = tabs.indexOf(activeTab);

      if (action === 'UP') {
        const nextIdx = (currentIndex - 1 + tabs.length) % tabs.length;
        setActiveTab(tabs[nextIdx]);
      } else if (action === 'DOWN') {
        const nextIdx = (currentIndex + 1) % tabs.length;
        setActiveTab(tabs[nextIdx]);
      } else if (action === 'RIGHT' || action === 'OK') {
        setFocusedSection('grid');
        setFocusedIndex(0);
      }
    } 
    else if (focusedSection === 'grid') {
      if (action === 'LEFT') {
        // If on the far left, return to sidebar
        if (activeTab === 'tv' || focusedIndex % 5 === 0 || focusedIndex === 0) {
          setFocusedSection('sidebar');
        } else {
          setFocusedIndex(prev => Math.max(0, prev - 1));
        }
      } 
      else if (action === 'RIGHT') {
        const maxLimit = activeTab === 'warez' ? warezResults.length : activeTab === 'tv' ? iptvChannels.length : watchlist.length;
        setFocusedIndex(prev => Math.min(maxLimit - 1, prev + 1));
      } 
      else if (action === 'UP') {
        if (activeTab === 'tv') {
          setFocusedIndex(prev => Math.max(0, prev - 1));
        } else {
          setFocusedIndex(prev => Math.max(0, prev - 5));
        }
      } 
      else if (action === 'DOWN') {
        const maxLimit = activeTab === 'warez' ? warezResults.length : activeTab === 'tv' ? iptvChannels.length : watchlist.length;
        if (activeTab === 'tv') {
          setFocusedIndex(prev => Math.min(maxLimit - 1, prev + 1));
        } else {
          setFocusedIndex(prev => Math.min(maxLimit - 1, prev + 5));
        }
      } 
      else if (action === 'OK') {
        if (activeTab === 'warez' && warezResults[focusedIndex]) {
          const item = warezResults[focusedIndex];
          setSelectedWarezContent(item);
          setFocusedSection('modal');
          setFocusedIndex(0);
        } else if (activeTab === 'tv' && iptvChannels[focusedIndex]) {
          setActiveChannel(iptvChannels[focusedIndex]);
        } else if (activeTab === 'watchlist' && watchlist[focusedIndex]) {
          const item = watchlist[focusedIndex];
          if (item.type === 'tv') {
            setActiveChannel(item);
            setActiveTab('tv');
          } else {
            setSelectedWarezContent(item);
            setFocusedSection('modal');
            setFocusedIndex(0);
          }
        }
      }
      else if (action === 'BACK') {
        setFocusedSection('sidebar');
      }
    } 
    else if (focusedSection === 'modal') {
      if (action === 'BACK') {
        setSelectedWarezContent(null);
        setFocusedSection('grid');
      } else if (action === 'OK') {
        if (selectedWarezContent) {
          if (selectedWarezContent.type === 'movie') {
            setActiveWarezPlayer({
              tmdbId: selectedWarezContent.tmdbId,
              imdbId: selectedWarezContent.imdbId,
              title: selectedWarezContent.title,
              type: 'movie'
            });
          } else {
            setActiveWarezPlayer({
              tmdbId: selectedWarezContent.tmdbId,
              imdbId: selectedWarezContent.imdbId,
              title: selectedWarezContent.title,
              type: 'series',
              season: selectedWarezSeason,
              episode: selectedWarezEpisode
            });
          }
        }
      }
    }
  };

  // Keyboard Event Handlers (mimicking D-pad)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Backspace', 'Escape'].includes(e.key)) {
        // Allow typical typing inside search inputs
        if (document.activeElement?.tagName === 'INPUT') {
          if (e.key === 'Escape' || e.key === 'Enter') {
            (document.activeElement as HTMLElement).blur();
          }
          return;
        }
        e.preventDefault();
      }

      switch (e.key) {
        case 'ArrowUp':
          triggerRemoteAction('UP');
          break;
        case 'ArrowDown':
          triggerRemoteAction('DOWN');
          break;
        case 'ArrowLeft':
          triggerRemoteAction('LEFT');
          break;
        case 'ArrowRight':
          triggerRemoteAction('RIGHT');
          break;
        case 'Enter':
          triggerRemoteAction('OK');
          break;
        case 'Backspace':
        case 'Escape':
          triggerRemoteAction('BACK');
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedSection, focusedIndex, activeTab, warezResults, iptvChannels, watchlist, selectedWarezContent, selectedWarezSeason, selectedWarezEpisode]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex flex-col md:flex-row relative overflow-x-hidden selection:bg-amber-500 selection:text-black">
      
      {/* Background Cinematic Atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.04),transparent_55%)] pointer-events-none z-0" />

      {/* ================= LEFT SIDEBAR (Netflix/Premium TV App Style) ================= */}
      <aside className={`w-full md:w-64 bg-zinc-950 border-r border-zinc-900 flex-shrink-0 z-20 flex flex-col justify-between py-6 px-4 relative ${focusedSection === 'sidebar' ? 'ring-2 ring-amber-500/25 bg-zinc-950' : ''}`}>
        <div className="space-y-8">
          
          {/* Main Logo */}
          <div className="flex items-center space-x-3 px-2">
            <div className="h-9 w-9 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Play className="text-black ml-0.5 fill-black" size={16} />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-wider text-white">
                MEGA<span className="text-amber-500">CINE</span>
              </h1>
              <p className="text-[8px] text-zinc-500 font-mono tracking-widest uppercase">OTIMIZADO PARA TV</p>
            </div>
          </div>

          {/* Navigation Options */}
          <nav className="space-y-1.5">
            {[
              { id: 'warez', label: 'Cinema Warez', icon: Search, desc: 'Filmes e Séries CDN' },
              { id: 'tv', label: 'Canais TV', icon: Tv, desc: 'IPTV ao vivo HLS' },
              { id: 'watchlist', label: 'Minha Lista', icon: Heart, desc: 'Favoritos salvos' }
            ].map((menu) => {
              const Icon = menu.icon;
              const isSelected = activeTab === menu.id;
              const isFocused = focusedSection === 'sidebar' && activeTab === menu.id;

              return (
                <button
                  key={menu.id}
                  onClick={() => {
                    setActiveTab(menu.id as any);
                    setFocusedSection('sidebar');
                  }}
                  className={`w-full px-3.5 py-3 rounded-xl flex items-center space-x-3.5 transition duration-150 text-left cursor-pointer group ${
                    isSelected 
                      ? 'bg-amber-500 text-black font-black shadow-md shadow-amber-500/10' 
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
                  } ${isFocused ? 'ring-4 ring-amber-400 scale-102 border-amber-500' : ''}`}
                >
                  <Icon size={18} className={isSelected ? 'text-black' : 'text-zinc-400 group-hover:text-white'} />
                  <div>
                    <span className="text-xs font-bold block uppercase tracking-wide leading-tight">{menu.label}</span>
                    <span className={`text-[9px] block leading-tight font-medium ${isSelected ? 'text-black/70' : 'text-zinc-500'}`}>
                      {menu.desc}
                    </span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Technical TV Info Footer */}
        <div className="pt-6 border-t border-zinc-900 px-2 space-y-2 text-[10px] text-zinc-500 font-mono">
          <div className="flex items-center justify-between">
            <span>SINAL IPTV</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <div className="flex items-center justify-between">
            <span>SERVIDORES</span>
            <span className="text-zinc-400 font-bold">WAREZCDN</span>
          </div>
          <p className="text-[8px] leading-relaxed mt-2 text-zinc-600">Pressione as setas do teclado para simular o controle remoto da TV.</p>
        </div>
      </aside>

      {/* ================= MAIN CONTAINER VIEWPORT ================= */}
      <main className="flex-grow p-4 md:p-8 z-10 overflow-y-auto max-h-screen relative">
        
        {/* ================= 1. CINEMA WAREZ (CATALOG SEARCH & STREAM) ================= */}
        {activeTab === 'warez' && (
          <section id="warez-section" className="space-y-6">
            <div className="border-b border-zinc-900 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full border border-amber-500/20 uppercase font-black tracking-widest font-mono">SERVIDORES DE CINEMA</span>
                <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mt-1">Cinema Geral Integrado</h2>
                <p className="text-xs text-zinc-400">Pesquise filmes, séries e animes para assistir de graça através dos servidores de streaming WarezCDN.</p>
              </div>

              {/* Mirror CDN domain picker */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 flex items-center space-x-2 shrink-0">
                <span className="text-[9px] font-mono text-zinc-400">ESPELHO CDN:</span>
                <select 
                  value={warezDomain}
                  onChange={(e) => setWarezDomain(e.target.value as any)}
                  className="bg-zinc-950 border border-zinc-800 text-[10px] text-white rounded-md px-2 py-1 focus:outline-none focus:border-amber-500 font-mono cursor-pointer"
                >
                  <option value="embed.warezcdn.lat">warezcdn.lat (Principal)</option>
                  <option value="embed.warezcdn.link">warezcdn.link (Espelho)</option>
                </select>
              </div>
            </div>

            {/* Search Input Bar */}
            <form onSubmit={(e) => handleSearchWarez(undefined, e)} className="flex gap-3 max-w-xl">
              <div className="relative flex-grow">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input
                  type="text"
                  placeholder="Ex: Interestelar, Matrix, Breaking Bad, Batman..."
                  value={warezQuery}
                  onChange={(e) => setWarezQuery(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-850 text-xs text-white rounded-xl pl-12 pr-4 py-3.5 focus:outline-none focus:border-amber-500 focus:bg-zinc-900 transition font-medium"
                />
              </div>
              <button
                type="submit"
                disabled={isSearchingWarez}
                className="bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 text-black font-extrabold text-xs px-6 py-3.5 rounded-xl transition flex items-center justify-center space-x-2 shrink-0 cursor-pointer"
              >
                {isSearchingWarez ? (
                  <span className="inline-block animate-spin border-2 border-black border-t-transparent rounded-full h-4 w-4"></span>
                ) : (
                  <span>Pesquisar</span>
                )}
              </button>
            </form>

            {/* Suggestions buttons */}
            <div className="flex flex-wrap items-center gap-2 text-[10px]">
              <span className="text-zinc-500 font-mono uppercase font-bold">Populares:</span>
              {['Interestelar', 'Matrix', 'Breaking Bad', 'Stranger Things', 'A Origem'].map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => {
                    setWarezQuery(sug);
                    handleSearchWarez(sug);
                  }}
                  className="bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg border border-zinc-850 transition cursor-pointer font-medium"
                >
                  {sug}
                </button>
              ))}
            </div>

            {warezSearchError && (
              <div className="p-4 bg-red-950/20 border border-red-900/50 rounded-xl text-xs text-red-400 flex items-center space-x-2">
                <AlertCircle size={14} />
                <span>{warezSearchError}</span>
              </div>
            )}

            {/* Results Grid */}
            {isSearchingWarez ? (
              <div className="py-20 text-center space-y-3">
                <div className="inline-block animate-spin border-4 border-amber-500 border-t-transparent rounded-full h-10 w-10"></div>
                <p className="text-xs text-zinc-500 font-mono">Consolidadando mídias do WarezCDN...</p>
              </div>
            ) : warezResults.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest font-mono">Mídias Encontradas</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                  {warezResults.map((item, index) => {
                    const isItemFocused = focusedSection === 'grid' && focusedIndex === index;
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          setSelectedWarezContent(item);
                          setSelectedWarezSeason(1);
                          setSelectedWarezEpisode(1);
                          setActiveWarezPlayer(null);
                        }}
                        className={`group relative bg-zinc-900 rounded-2xl overflow-hidden cursor-pointer shadow-lg border transition-all duration-300 ${
                          isItemFocused 
                            ? 'ring-4 ring-amber-500 border-amber-500 scale-105 shadow-xl shadow-amber-500/10' 
                            : 'border-zinc-900 hover:border-zinc-800'
                        }`}
                      >
                        <div className="aspect-[2/3] w-full relative overflow-hidden bg-zinc-950">
                          <img
                            src={item.posterUrl}
                            alt={item.title}
                            className="w-full h-full object-cover transform scale-100 group-hover:scale-102 transition duration-300"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=600';
                            }}
                          />
                          <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded text-[9px] font-mono font-bold text-amber-400 border border-white/5">
                            ⭐ {item.rating ? item.rating.toFixed(1) : '8.4'}
                          </div>
                          <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded text-[9px] font-mono font-bold text-zinc-300 border border-white/5 uppercase">
                            {item.type === 'movie' ? 'FILME' : 'SÉRIE'}
                          </div>
                        </div>
                        <div className="p-3.5 space-y-1.5 bg-zinc-900">
                          <h4 className="font-bold text-xs text-white truncate group-hover:text-amber-400 transition">
                            {item.title}
                          </h4>
                          <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                            <span>{item.year}</span>
                            <span>{item.duration || 'Full HD'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-16 border-2 border-dashed border-zinc-900 rounded-2xl text-center space-y-4 max-w-md mx-auto">
                <div className="h-12 w-12 bg-zinc-900 text-zinc-500 rounded-xl flex items-center justify-center mx-auto border border-zinc-850">
                  <Play size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Nenhum título buscado ainda</h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    Digite o nome de qualquer filme ou série internacional/nacional no campo acima para pesquisar.
                  </p>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ================= 2. CANAIS DE TV (IPTV BROADCASTER VIEW) ================= */}
        {activeTab === 'tv' && (
          <section id="tv-section" className="space-y-6">
            
            {/* Header */}
            <div className="border-b border-zinc-900 pb-5">
              <span className="text-[10px] bg-red-500/10 text-red-500 px-3 py-1 rounded-full border border-red-500/20 uppercase font-black tracking-widest font-mono">STREAMING IPTV</span>
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mt-1">Canais IPTV ao Vivo</h2>
              <p className="text-xs text-zinc-400">Assista canais abertos e transmissões públicas sintonizadas automaticamente.</p>
            </div>

            {/* IPTV Filter bar */}
            <div className="bg-zinc-900/40 border border-zinc-900 p-4 rounded-2xl space-y-3">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                  <input
                    type="text"
                    placeholder="SBT, Record, Cultura, CNN, Jovem Pan..."
                    value={iptvSearchQuery}
                    onChange={(e) => setIptvSearchQuery(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={selectedIptvCountry}
                    onChange={(e) => setSelectedIptvCountry(e.target.value)}
                    className="bg-zinc-950 border border-zinc-850 text-xs font-bold text-white rounded-xl px-3 py-2.5 focus:outline-none cursor-pointer"
                  >
                    <option value="">Todos os Países</option>
                    <option value="BR">🇧🇷 Brasil</option>
                    <option value="US">🇺🇸 Estados Unidos</option>
                    <option value="AR">🇦🇷 Argentina</option>
                    <option value="MX">🇲🇽 México</option>
                  </select>

                  <select
                    value={selectedIptvCategory}
                    onChange={(e) => setSelectedIptvCategory(e.target.value)}
                    className="bg-zinc-950 border border-zinc-850 text-xs font-bold text-white rounded-xl px-3 py-2.5 focus:outline-none cursor-pointer"
                  >
                    <option value="">Todas Categorias</option>
                    {iptvCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>

                  <button
                    onClick={reloadIptvDatabase}
                    disabled={isSynchronizingM3u}
                    className="p-2.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 rounded-xl text-zinc-400 hover:text-white transition disabled:opacity-50 cursor-pointer"
                    title="Recarregar"
                  >
                    <RefreshCcw size={14} className={isSynchronizingM3u ? 'animate-spin text-amber-500' : ''} />
                  </button>
                </div>
              </div>
            </div>

            {/* Main TV Layout Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* TV Player frame */}
              <div className="lg:col-span-2 space-y-4">
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border border-zinc-900 shadow-2xl flex flex-col justify-between">
                  {activeChannel ? (
                    <LiveTvPlayer channel={activeChannel} />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-black text-zinc-600 p-8">
                      <Tv size={44} className="mb-2 text-amber-500/50" />
                      <p className="text-xs font-bold text-zinc-300">Nenhum canal sintonizado</p>
                    </div>
                  )}
                </div>

                {activeChannel && (
                  <div className="bg-zinc-900/40 border border-zinc-900 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] text-zinc-500 font-mono uppercase">EPG TRANSMISSÃO</span>
                      <h3 className="text-sm font-bold text-white mt-0.5">{activeChannel.nowPlaying || 'Programação de TV ao Vivo'}</h3>
                      <p className="text-[11px] text-zinc-400">Próximo: {activeChannel.nextShow}</p>
                    </div>
                    <button
                      onClick={() => toggleWatchlist({ ...activeChannel, type: 'tv' })}
                      className={`p-2.5 rounded-xl border transition ${
                        isFavorited(activeChannel.id)
                          ? 'bg-amber-500/15 border-amber-500 text-amber-500'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Heart size={16} className={isFavorited(activeChannel.id) ? 'fill-amber-500 text-amber-500' : ''} />
                    </button>
                  </div>
                )}
              </div>

              {/* Channels Side list */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest font-mono px-1">Canais Sintonizados ({iptvTotal})</h3>
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin">
                  {iptvChannels.map((ch, index) => {
                    const isSelected = activeChannel && activeChannel.id === ch.id;
                    const isChFocused = focusedSection === 'grid' && focusedIndex === index;
                    return (
                      <div
                        key={ch.id}
                        onClick={() => setActiveChannel(ch)}
                        className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between group ${
                          isSelected 
                            ? 'bg-zinc-900 border-amber-500/50' 
                            : 'bg-zinc-900/30 border-zinc-900/40 hover:border-zinc-800'
                        } ${isChFocused ? 'ring-4 ring-amber-500 border-amber-500 scale-102' : ''}`}
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <span className="text-xl">📺</span>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white truncate leading-tight group-hover:text-amber-400 transition">{ch.name}</h4>
                            <p className="text-[10px] text-zinc-500 truncate mt-0.5">{ch.category} • {ch.nowPlaying}</p>
                          </div>
                        </div>
                        <ChevronRight size={14} className={isSelected ? 'text-amber-500' : 'text-zinc-600'} />
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </section>
        )}

        {/* ================= 3. WATCHLIST (FAVORITES GRID) ================= */}
        {activeTab === 'watchlist' && (
          <section id="watchlist-section" className="space-y-6">
            <div className="border-b border-zinc-900 pb-5">
              <span className="text-[10px] bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full border border-amber-500/20 uppercase font-black tracking-widest font-mono">MINHA LISTA</span>
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mt-1">Sua Biblioteca Salva</h2>
              <p className="text-xs text-zinc-400">Aqui ficam guardados todos os canais de TV e mídias do Warez que você favoritou.</p>
            </div>

            {watchlist.length === 0 ? (
              <div className="p-16 border-2 border-dashed border-zinc-900 rounded-2xl text-center space-y-4 max-w-md mx-auto">
                <div className="h-12 w-12 bg-zinc-900 text-amber-500 rounded-full flex items-center justify-center mx-auto">
                  <Heart size={20} className="fill-amber-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Sua lista está vazia</h3>
                  <p className="text-xs text-zinc-500 mt-1">Explore os canais de TV ou pesquise filmes no Cinema Warez para adicioná-los aqui.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                {watchlist.map((item, index) => {
                  const isItemFocused = focusedSection === 'grid' && focusedIndex === index;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (item.type === 'tv') {
                          setActiveChannel(item);
                          setActiveTab('tv');
                        } else {
                          setSelectedWarezContent(item);
                          setSelectedWarezSeason(1);
                          setSelectedWarezEpisode(1);
                          setActiveWarezPlayer(null);
                        }
                      }}
                      className={`group relative bg-zinc-900 rounded-2xl overflow-hidden cursor-pointer shadow-lg border transition-all duration-300 ${
                        isItemFocused 
                          ? 'ring-4 ring-amber-500 border-amber-500 scale-105 shadow-xl shadow-amber-500/10' 
                          : 'border-zinc-900 hover:border-zinc-800'
                      }`}
                    >
                      <div className="aspect-[2/3] w-full relative overflow-hidden bg-zinc-950">
                        {item.type === 'tv' ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 text-amber-500">
                            <Tv size={48} />
                            <span className="text-[10px] font-mono font-bold uppercase mt-2">Canal TV</span>
                          </div>
                        ) : (
                          <img
                            src={item.posterUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <button
                          onClick={(e) => toggleWatchlist(item, e)}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-red-600 hover:bg-red-500 text-white transition border border-white/5 z-10"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <div className="p-3.5 space-y-1.5 bg-zinc-900">
                        <h4 className="font-bold text-xs text-white truncate group-hover:text-amber-400 transition">
                          {item.title || item.name}
                        </h4>
                        <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                          <span className="uppercase text-[9px] text-amber-400 font-bold">{item.type === 'tv' ? 'IPTV' : item.type}</span>
                          <span>{item.year || 'Fav'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

      </main>

      {/* ==================== FLOATING VIRTUAL TV REMOTE (Apple TV / Firestick style) ==================== */}
      {showRemote && (
        <div className="hidden xl:flex fixed right-6 bottom-6 flex-col items-center bg-zinc-900/95 backdrop-blur-md border border-zinc-800 p-5 rounded-3xl w-56 shadow-2xl z-40 space-y-4 text-center select-none">
          <div className="flex items-center justify-between w-full pb-2 border-b border-zinc-800/60">
            <span className="text-[9px] font-black tracking-widest text-zinc-400 uppercase font-mono">CONTROLE DA TV</span>
            <button 
              onClick={() => setShowRemote(false)} 
              className="text-[10px] text-zinc-500 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Core Directional Ring */}
          <div className="relative w-36 h-36 bg-zinc-950 rounded-full flex items-center justify-center p-3 border border-zinc-850 shadow-inner">
            
            {/* directional pad buttons */}
            <button
              onClick={() => triggerRemoteAction('UP')}
              className={`absolute top-2 text-zinc-400 hover:text-amber-400 transition duration-100 ${lastRemoteAction === 'UP' ? 'scale-90 text-amber-400' : ''}`}
            >
              <ChevronUp size={24} />
            </button>
            <button
              onClick={() => triggerRemoteAction('DOWN')}
              className={`absolute bottom-2 text-zinc-400 hover:text-amber-400 transition duration-100 ${lastRemoteAction === 'DOWN' ? 'scale-90 text-amber-400' : ''}`}
            >
              <ChevronDown size={24} />
            </button>
            <button
              onClick={() => triggerRemoteAction('LEFT')}
              className={`absolute left-2 text-zinc-400 hover:text-amber-400 transition duration-100 ${lastRemoteAction === 'LEFT' ? 'scale-90 text-amber-400' : ''}`}
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={() => triggerRemoteAction('RIGHT')}
              className={`absolute right-2 text-zinc-400 hover:text-amber-400 transition duration-100 ${lastRemoteAction === 'RIGHT' ? 'scale-90 text-amber-400' : ''}`}
            >
              <ChevronRight size={24} />
            </button>

            {/* OK Inner Button */}
            <button
              onClick={() => triggerRemoteAction('OK')}
              className={`h-16 w-16 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-full flex items-center justify-center text-[11px] font-black text-white hover:text-amber-400 shadow-lg active:scale-95 transition ${lastRemoteAction === 'OK' ? 'bg-amber-500 text-black border-amber-500' : ''}`}
            >
              OK
            </button>
          </div>

          {/* Action Row */}
          <div className="grid grid-cols-2 gap-3 w-full">
            <button
              onClick={() => triggerRemoteAction('BACK')}
              className={`py-2 px-3 bg-zinc-950 border border-zinc-850 rounded-xl text-[10px] font-bold text-zinc-400 hover:text-white transition active:scale-95 ${lastRemoteAction === 'BACK' ? 'bg-zinc-800 text-white' : ''}`}
            >
              VOLTAR
            </button>
            <button
              onClick={() => {
                setActiveTab('warez');
                setFocusedSection('sidebar');
              }}
              className="py-2 px-3 bg-zinc-950 border border-zinc-850 rounded-xl text-[10px] font-bold text-zinc-400 hover:text-white transition active:scale-95"
            >
              INÍCIO
            </button>
          </div>
          
          <div className="text-[8px] text-zinc-500 font-mono">
            <span>Foco: <strong className="text-zinc-300 uppercase">{focusedSection}</strong></span>
          </div>
        </div>
      )}

      {/* Button to restore remote if closed */}
      {!showRemote && (
        <button
          onClick={() => setShowRemote(true)}
          className="hidden xl:flex fixed right-6 bottom-6 bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 text-zinc-400 hover:text-white p-3 rounded-full shadow-2xl z-40 transition"
          title="Abrir Controle Virtual"
        >
          <Tv size={20} />
        </button>
      )}

      {/* ================= DETAILS MODAL FOR WAREZ CONTENT ================= */}
      {selectedWarezContent && (
        <div
          id="warez-details-modal"
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-45 flex items-center justify-center p-4 overflow-y-auto select-none"
          onClick={() => setSelectedWarezContent(null)}
        >
          <div
            className="bg-zinc-950 border border-zinc-850 rounded-2xl overflow-hidden w-full max-w-3xl shadow-2xl relative max-h-[95vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Backdrop image */}
            <div className="relative aspect-[21/9] w-full shrink-0 bg-zinc-900">
              <img
                src={selectedWarezContent.backdropUrl}
                alt={selectedWarezContent.title}
                className="w-full h-full object-cover opacity-60"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
              
              <button
                onClick={() => setSelectedWarezContent(null)}
                className="absolute top-4 right-4 p-2.5 rounded-full bg-black/60 text-gray-300 hover:text-white border border-white/5 cursor-pointer z-50"
              >
                ✕
              </button>

              <div className="absolute bottom-4 left-6 flex items-end space-x-2">
                <span className="bg-amber-500 text-black text-[9px] font-extrabold tracking-widest px-2.5 py-1 rounded-md uppercase">
                  {selectedWarezContent.type === 'movie' ? 'FILME' : 'SÉRIE'}
                </span>
                <span className="bg-zinc-900 border border-zinc-800 text-gray-300 text-[9px] font-bold px-2.5 py-1 rounded-md font-mono">
                  ID: {selectedWarezContent.tmdbId}
                </span>
              </div>
            </div>

            {/* Content info */}
            <div className="p-6 md:p-8 space-y-6 overflow-y-auto flex-grow scrollbar-thin">
              
              {/* Active embedded iframe player if triggered */}
              {activeWarezPlayer ? (() => {
                const { tmdbId, imdbId, type, season, episode } = activeWarezPlayer;
                const s = season || 1;
                const e = episode || 1;
                const idToUse = imdbId || tmdbId;
                let embedUrl = '';

                switch (embedSource) {
                  case 'servidor_1':
                    embedUrl = type === 'movie'
                      ? `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`
                      : `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${s}&e=${e}`;
                    break;
                  case 'servidor_2':
                    embedUrl = type === 'movie'
                      ? `https://vidsrc.xyz/embed/movie/${tmdbId}`
                      : `https://vidsrc.xyz/embed/tv/${tmdbId}/${s}/${e}`;
                    break;
                  case 'servidor_3':
                    embedUrl = type === 'movie'
                      ? `https://vidsrc.to/embed/movie/${tmdbId}`
                      : `https://vidsrc.to/embed/tv/${tmdbId}/${s}/${e}`;
                    break;
                  default:
                    embedUrl = type === 'movie'
                      ? `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`
                      : `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${s}&e=${e}`;
                    break;
                }

                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-850">
                      <div className="flex items-center space-x-3">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-xs font-bold uppercase">
                          {activeWarezPlayer.title} {type === 'series' && `(T${s} : E${e})`}
                        </span>
                      </div>
                      <button
                        onClick={() => setActiveWarezPlayer(null)}
                        className="bg-zinc-800 hover:bg-zinc-700 text-gray-300 hover:text-white text-[10px] px-3.5 py-1.5 rounded-lg transition font-bold"
                      >
                        Voltar à Opções
                      </button>
                    </div>

                    {/* New Tab external escape button */}
                    <div className="bg-amber-950/10 border border-amber-900/25 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                      <div>
                        <p className="text-amber-500 font-bold">⚠️ Tem problemas de bloqueio de iframe?</p>
                        <p className="text-zinc-400 text-[10px] mt-0.5">O player de terceiros pode não abrir dentro do sandboxing do visualizador. Clique para abrir em nova aba!</p>
                      </div>
                      <a
                        href={embedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-amber-500 hover:bg-amber-400 text-black font-black px-4 py-2 rounded-lg transition text-center text-[11px] uppercase whitespace-nowrap shrink-0"
                      >
                        Nova Aba ↗
                      </a>
                    </div>

                    <div className="aspect-video w-full bg-black rounded-xl overflow-hidden border border-zinc-850 relative">
                      <iframe
                        src={embedUrl}
                        className="w-full h-full"
                        allowFullScreen
                        referrerPolicy="no-referrer"
                        allow="autoplay; encrypted-media"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
                      />
                    </div>

                    {/* Servers Sources Row */}
                    <div className="p-4 bg-zinc-900/40 rounded-xl border border-zinc-850 space-y-3">
                      <p className="text-[10px] font-mono text-zinc-400 uppercase font-black">SERVIDOR ATIVO:</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setEmbedSource('servidor_1')}
                          className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold transition ${
                            embedSource === 'servidor_1' ? 'bg-amber-500 text-black border-amber-500' : 'bg-zinc-950 text-zinc-400 border-zinc-850'
                          }`}
                        >
                          Servidor 1
                        </button>
                        <button
                          onClick={() => setEmbedSource('servidor_2')}
                          className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold transition ${
                            embedSource === 'servidor_2' ? 'bg-amber-500 text-black border-amber-500' : 'bg-zinc-950 text-zinc-400 border-zinc-850'
                          }`}
                        >
                          Servidor 2
                        </button>
                        <button
                          onClick={() => setEmbedSource('servidor_3')}
                          className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold transition ${
                            embedSource === 'servidor_3' ? 'bg-amber-500 text-black border-amber-500' : 'bg-zinc-950 text-zinc-400 border-zinc-850'
                          }`}
                        >
                          Servidor 3
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })() : (
                <div className="grid md:grid-cols-3 gap-6">
                  
                  {/* Left poster */}
                  <div className="shrink-0 aspect-[2/3] w-full md:w-48 bg-zinc-900 rounded-xl overflow-hidden border border-zinc-850 shadow-xl self-start">
                    <img
                      src={selectedWarezContent.posterUrl}
                      alt={selectedWarezContent.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* Right metadata */}
                  <div className="md:col-span-2 space-y-4">
                    <div>
                      <h3 className="text-xl font-extrabold text-white leading-tight">{selectedWarezContent.title}</h3>
                      <div className="flex items-center space-x-2 text-[11px] text-zinc-400 mt-1">
                        <span className="text-amber-500 font-bold">⭐ {selectedWarezContent.rating?.toFixed(1) || '8.5'}</span>
                        <span>•</span>
                        <span>{selectedWarezContent.year}</span>
                        <span>•</span>
                        <span>{selectedWarezContent.duration || 'Full HD'}</span>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-900/30 p-3.5 rounded-xl border border-zinc-900">
                      {selectedWarezContent.synopsis}
                    </p>

                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleWatchlist(selectedWarezContent)}
                        className={`px-4 py-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                          isFavorited(selectedWarezContent.id)
                            ? 'bg-amber-500/10 border-amber-500 text-amber-500'
                            : 'bg-zinc-950 border-zinc-850 text-zinc-300 hover:text-white'
                        }`}
                      >
                        {isFavorited(selectedWarezContent.id) ? '✓ Na Minha Lista' : '+ Salvar Lista'}
                      </button>
                    </div>

                    {/* Movie vs Series Stream Selectors */}
                    {selectedWarezContent.type === 'movie' ? (
                      <button
                        onClick={() => setActiveWarezPlayer({
                          tmdbId: selectedWarezContent.tmdbId,
                          imdbId: selectedWarezContent.imdbId,
                          title: selectedWarezContent.title,
                          type: 'movie'
                        })}
                        className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black text-xs py-3.5 rounded-xl uppercase tracking-wider transition cursor-pointer"
                      >
                        Reproduzir Filme em HD 
                      </button>
                    ) : (
                      <div className="space-y-4 bg-zinc-900/40 p-4 rounded-xl border border-zinc-850">
                        <h4 className="text-xs font-bold uppercase text-white tracking-wider">Selecione o Episódio</h4>
                        <div className="grid grid-cols-2 gap-3">
                          
                          <div className="space-y-1">
                            <span className="text-[10px] text-zinc-500 font-mono">TEMPORADA:</span>
                            <select
                              value={selectedWarezSeason}
                              onChange={(e) => {
                                setSelectedWarezSeason(parseInt(e.target.value, 10));
                                setSelectedWarezEpisode(1);
                              }}
                              className="w-full bg-zinc-950 border border-zinc-800 text-xs text-white rounded-lg px-2.5 py-2 focus:outline-none"
                            >
                              {Array.from({ length: selectedWarezContent.seasonsCount || 1 }, (_, i) => i + 1).map(s => (
                                <option key={s} value={s}>Temporada {s}</option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[10px] text-zinc-500 font-mono">EPISÓDIO:</span>
                            <select
                              value={selectedWarezEpisode}
                              onChange={(e) => setSelectedWarezEpisode(parseInt(e.target.value, 10))}
                              className="w-full bg-zinc-950 border border-zinc-800 text-xs text-white rounded-lg px-2.5 py-2 focus:outline-none"
                            >
                              {Array.from({ 
                                length: (selectedWarezContent.episodesCount && selectedWarezContent.episodesCount[selectedWarezSeason - 1]) || 12 
                              }, (_, i) => i + 1).map(e => (
                                <option key={e} value={e}>Episódio {e}</option>
                              ))}
                            </select>
                          </div>

                        </div>

                        <button
                          onClick={() => setActiveWarezPlayer({
                            tmdbId: selectedWarezContent.tmdbId,
                            imdbId: selectedWarezContent.imdbId,
                            title: selectedWarezContent.title,
                            type: 'series',
                            season: selectedWarezSeason,
                            episode: selectedWarezEpisode
                          })}
                          className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black text-xs py-3 rounded-xl uppercase transition cursor-pointer"
                        >
                          Sintonizar Episódio
                        </button>
                      </div>
                    )}

                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
