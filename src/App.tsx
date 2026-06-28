import React, { useState, useEffect } from 'react';
import { 
  Play, Film, Tv, Sparkles, Plus, Check, Heart, Search, Filter, 
  Info, Star, Clock, AlertCircle, RefreshCcw, Smile, Award, Flame, 
  Compass, ChevronRight, HelpCircle, ArrowRight, Video, Sparkle, Layers
} from 'lucide-react';
import { MOVIES_AND_SERIES, LIVE_CHANNELS, VideoContent, LiveChannel } from './data';
import VideoPlayer from './components/VideoPlayer';
import CineAIChat from './components/CineAIChat';
import LiveTvPlayer from './components/LiveTvPlayer';

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<'home' | 'movies' | 'series' | 'tv' | 'ai-chat' | 'watchlist' | 'warez'>('home');
  
  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  // Dynamic States
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    const saved = localStorage.getItem('cine_watchlist');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Active Video Playing State
  const [activeVideo, setActiveVideo] = useState<{
    content: VideoContent;
    episodeIndex?: number;
  } | null>(null);

  // Active TV Channel State
  const [activeChannel, setActiveChannel] = useState<LiveChannel>(LIVE_CHANNELS[0]);

  // Selected Content Details Modal State
  const [selectedContent, setSelectedContent] = useState<VideoContent | null>(null);

  // Movie Trivia State (fetched from backend AI)
  const [triviaData, setTriviaData] = useState<{
    trivia: string;
    famousQuote: string;
    parentalGuidance: string;
    criticalConsensus: string;
  } | null>(null);
  const [isLoadingTrivia, setIsLoadingTrivia] = useState(false);

  // AI Concept Lab States
  const [genre1, setGenre1] = useState('Ficção Científica');
  const [genre2, setGenre2] = useState('Comédia');
  const [userConcept, setUserConcept] = useState('');
  const [generatedConcept, setGeneratedConcept] = useState<{
    title: string;
    synopsis: string;
    dreamCast: string[];
    boxOfficeEstimate: string;
  } | null>(null);
  const [isGeneratingConcept, setIsGeneratingConcept] = useState(false);
  const [conceptError, setConceptError] = useState('');

  // IPTV Dynamic Channels States
  const [iptvChannels, setIptvChannels] = useState<LiveChannel[]>([]);
  const [iptvCountries, setIptvCountries] = useState<string[]>([]);
  const [iptvCategories, setIptvCategories] = useState<string[]>([]);
  const [selectedIptvCountry, setSelectedIptvCountry] = useState<string>('BR');
  const [selectedIptvCategory, setSelectedIptvCategory] = useState<string>('');
  const [iptvSearchQuery, setIptvSearchQuery] = useState<string>('');
  const [isFetchingIptv, setIsFetchingIptv] = useState<boolean>(false);
  const [isSynchronizingM3u, setIsSynchronizingM3u] = useState<boolean>(false);
  const [iptvTotal, setIptvTotal] = useState<number>(0);
  const [iptvPage, setIptvPage] = useState<number>(1);
  const [iptvLoadingError, setIptvLoadingError] = useState<string>('');

  // API Key Presence Info
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

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
  const [embedSource, setEmbedSource] = useState<string>('warez_tmdb');
  const [warezDomain, setWarezDomain] = useState<'embed.warezcdn.lat' | 'embed.warezcdn.link'>('embed.warezcdn.lat');
  const [warezSearchError, setWarezSearchError] = useState<string>('');

  const handleSearchWarez = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!warezQuery.trim()) return;

    setIsSearchingWarez(true);
    setWarezSearchError('');
    try {
      const res = await fetch(`/api/warez/search?query=${encodeURIComponent(warezQuery)}`);
      if (!res.ok) throw new Error('Falha ao pesquisar no catálogo geral.');
      const data = await res.json();
      setWarezResults(data);
    } catch (err: any) {
      console.error(err);
      setWarezSearchError(err.message || 'Erro inesperado ao buscar mídias.');
    } finally {
      setIsSearchingWarez(false);
    }
  };

  // Hero Featured Content
  const heroContent = MOVIES_AND_SERIES[0];

  // Save watchlist to local storage
  useEffect(() => {
    localStorage.setItem('cine_watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  // Fetch dynamic IPTV channels
  const fetchIptvChannelsList = async (page: number = 1, resetList: boolean = false) => {
    setIsFetchingIptv(true);
    setIptvLoadingError('');
    try {
      const limit = 40;
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
        setIptvChannels(data.channels || []);
      } else {
        setIptvChannels(prev => {
          const existingIds = new Set(prev.map(ch => ch.id));
          const filteredNew = (data.channels || []).filter((ch: LiveChannel) => !existingIds.has(ch.id));
          return [...prev, ...filteredNew];
        });
      }
      
      setIptvTotal(data.total || 0);
      if (data.countries && data.countries.length > 0) {
        setIptvCountries(data.countries);
      }
      if (data.categories && data.categories.length > 0) {
        setIptvCategories(data.categories);
      }

      // Automatically change selected channel only on fresh category/country reset
      if (data.channels && data.channels.length > 0 && resetList) {
        setActiveChannel(data.channels[0]);
      }
    } catch (err: any) {
      console.error('Error fetching IPTV channels:', err);
      setIptvLoadingError(err.message || 'Erro ao sintonizar canais de TV.');
    } finally {
      setIsFetchingIptv(false);
    }
  };

  // Reload or trigger backend M3U sync
  const reloadIptvDatabase = async () => {
    try {
      setIsSynchronizingM3u(true);
      await fetch('/api/iptv/reload', { method: 'POST' });
      // Poll a bit for updates
      setTimeout(() => {
        fetchIptvChannelsList(1, true);
      }, 3000);
    } catch (e) {
      console.error('Failed to trigger database reload', e);
    }
  };

  // Fetch IPTV when activeTab is TV or filters change
  useEffect(() => {
    if (activeTab === 'tv') {
      fetchIptvChannelsList(1, true);
      setIptvPage(1);
    }
  }, [selectedIptvCountry, selectedIptvCategory, activeTab]);

  // Handle debounced search or manual search triggers for IPTV
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'tv') {
        fetchIptvChannelsList(1, true);
        setIptvPage(1);
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [iptvSearchQuery]);

  // Fetch API key status on mount
  useEffect(() => {
    fetch('/api/cineai/status')
      .then(res => res.json())
      .then(data => setHasApiKey(data.hasKey))
      .catch(() => setHasApiKey(false));
  }, []);

  const toggleWatchlist = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setWatchlist(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Extract all unique genres
  const allGenres = Array.from(
    new Set(MOVIES_AND_SERIES.flatMap(item => item.genres))
  );

  // Filter content
  const filteredContent = MOVIES_AND_SERIES.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.synopsis.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.genres.some(g => g.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesGenre = !selectedGenre || item.genres.includes(selectedGenre);
    
    if (activeTab === 'movies') {
      return item.type === 'movie' && matchesSearch && matchesGenre;
    }
    if (activeTab === 'series') {
      return item.type === 'series' && matchesSearch && matchesGenre;
    }
    if (activeTab === 'watchlist') {
      return watchlist.includes(item.id) && matchesSearch && matchesGenre;
    }
    return matchesSearch && matchesGenre;
  });

  // Fetch AI-generated trivia for modal
  const fetchTrivia = async (content: VideoContent) => {
    setIsLoadingTrivia(true);
    setTriviaData(null);
    try {
      const response = await fetch('/api/cineai/trivia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: content.title, type: content.type })
      });
      if (response.ok) {
        const data = await response.json();
        setTriviaData(data);
      } else {
        throw new Error();
      }
    } catch {
      // Fallback
      setTriviaData({
        trivia: `Curiosidade: O diretor de "${content.title}" usou lentes anamórficas de altíssima fidelidade e técnicas inovadoras de iluminação para construir a profundidade cenográfica da obra.`,
        famousQuote: `“Tudo o que criamos começa com uma fagulha do desconhecido.”`,
        parentalGuidance: `Classificação ${content.ageRating}: Adequado para público amplo. Contém elementos dramáticos intensificados.`,
        criticalConsensus: `Aclamado por sua trilha orquestral magistral, atuações marcantes e final surpreendente que reverbera com o público.`
      });
    } finally {
      setIsLoadingTrivia(false);
    }
  };

  // Open Details Modal and load trivia
  const openDetails = (content: VideoContent) => {
    setSelectedContent(content);
    fetchTrivia(content);
  };

  // Handle generation in CineAI Concept Lab
  const generateFictionalMovie = async () => {
    if (isGeneratingConcept) return;
    setIsGeneratingConcept(true);
    setConceptError('');
    setGeneratedConcept(null);

    try {
      const response = await fetch('/api/cineai/generate-custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ genre1, genre2, concept: userConcept })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar o filme fictício.');
      }
      setGeneratedConcept(data);
    } catch (err: any) {
      console.error(err);
      // Fallback custom concept if server key is not active
      setGeneratedConcept({
        title: `O Último Samba em Kepler-186f`,
        synopsis: `Numa metrópole cyberpunk de poeira estelar, um androide minerador programado estritamente para perfuração pesada sofre um curto-circuito romântico e passa a sonhar obsessivamente em se tornar o maior passista de escola de samba da galáxia. Agora ele precisa fugir da polícia mecânica enquanto ensaia o compasso perfeito de 120 batidas magnéticas por minuto.`,
        dreamCast: [`Seu Jorge Cibernético`, 'Taís Araújo', 'Lázaro Ramos AI', 'Groot'],
        boxOfficeEstimate: `₿ 4.5 Bilhões de Créditos Espaciais 🚀`
      });
      setConceptError(err.message || 'Mostrando conceito de demonstração. Conecte o Gemini para criar infinitas variações.');
    } finally {
      setIsGeneratingConcept(false);
    }
  };

  // Play next episode if available in player
  const handleNextEpisode = () => {
    if (!activeVideo || !activeVideo.content.episodes) return;
    const currentIndex = activeVideo.episodeIndex ?? 0;
    const nextIndex = currentIndex + 1;
    if (nextIndex < activeVideo.content.episodes.length) {
      setActiveVideo({
        content: activeVideo.content,
        episodeIndex: nextIndex
      });
    } else {
      // Finished all episodes, close or play first episode
      setActiveVideo(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-red-600 selection:text-white font-sans overflow-x-hidden pb-12">
      {/* Background radial gradient representing a theater spotlights effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1400px] h-[600px] bg-gradient-to-b from-red-950/15 via-zinc-950/0 to-transparent pointer-events-none z-0" />

      {/* Top Banner indicating offline mode warnings */}
      {hasApiKey === false && (
        <div id="api-key-badge" className="bg-gradient-to-r from-amber-600/20 via-amber-700/20 to-zinc-950 border-b border-amber-600/30 text-amber-300 text-xs px-4 py-2.5 flex items-center justify-between z-50 relative">
          <div className="flex items-center space-x-2.5">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <p>
              <strong>Modo de Demonstração Inteligente:</strong> A chave de API do Gemini não foi encontrada nos Segredos da aplicação. O assistente de IA CineAI e o Laboratório funcionarão com recursos simulados de cinema!
            </p>
          </div>
          <a 
            href="#" 
            onClick={(e) => { e.preventDefault(); alert('Por favor, adicione a variável GEMINI_API_KEY no painel de Configurações -> Secrets no Google AI Studio.'); }}
            className="underline hover:text-amber-100 font-semibold"
          >
            Como configurar?
          </a>
        </div>
      )}

      {/* Header & Navbar */}
      <header className="sticky top-0 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900/60 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo Brand */}
          <div 
            onClick={() => setActiveTab('home')}
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="h-10 w-10 rounded-xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-900/40 group-hover:bg-red-500 group-hover:scale-105 transition duration-200">
              <Play fill="white" size={18} className="ml-0.5 text-white" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight bg-gradient-to-r from-white via-zinc-200 to-red-500 bg-clip-text text-transparent">
                CINE<span className="text-red-500">PLAY</span>
              </span>
              <div className="flex items-center space-x-1">
                <span className="text-[9px] text-gray-400 font-mono tracking-wider">PLATAFORMA BRASIL</span>
                <span className="h-1 w-1 rounded-full bg-green-500"></span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1.5">
            {[
              { id: 'home', label: 'Início', icon: Compass },
              { id: 'movies', label: 'Filmes', icon: Film },
              { id: 'series', label: 'Séries', icon: Layers },
              { id: 'tv', label: 'Canais TV', icon: Tv },
              { id: 'ai-chat', label: 'CineAI Coach', icon: Sparkles },
              { id: 'watchlist', label: 'Minha Lista', icon: Heart },
              { id: 'warez', label: 'Busca Warez', icon: Search }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`
                    px-4 py-2 rounded-xl text-xs font-bold tracking-wide uppercase transition duration-200 flex items-center space-x-2 cursor-pointer
                    ${isActive 
                      ? 'bg-red-600/10 text-red-500 border border-red-500/20' 
                      : 'text-gray-400 hover:text-white hover:bg-zinc-900'
                    }
                  `}
                >
                  <Icon size={14} className={isActive ? 'text-red-500 animate-pulse' : 'text-gray-400'} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Search Box / Right controls */}
          <div className="flex items-center space-x-3">
            <div className="relative hidden md:block">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input
                id="search-input"
                type="text"
                placeholder="Buscar títulos, gêneros..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-xs text-white rounded-full pl-10 pr-4 py-2.5 w-60 focus:outline-none focus:border-red-600 transition"
              />
            </div>

            {/* Mobile Nav Button wrapper (visible when mobile screen size) */}
            <div className="flex lg:hidden items-center space-x-1">
              <button
                onClick={() => setActiveTab('ai-chat')}
                className="p-2.5 rounded-full bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white transition cursor-pointer"
                title="CineAI Chat"
              >
                <Sparkles size={18} />
              </button>
              <button
                onClick={() => setActiveTab('tv')}
                className="p-2.5 rounded-full bg-zinc-900 text-gray-300 hover:text-white transition cursor-pointer"
                title="Canais de TV"
              >
                <Tv size={18} />
              </button>
            </div>
          </div>

        </div>

        {/* Mobile menu link list */}
        <div className="lg:hidden border-t border-zinc-900 bg-zinc-950 px-4 py-2 flex overflow-x-auto space-x-2 scrollbar-none">
          {[
            { id: 'home', label: 'Início' },
            { id: 'movies', label: 'Filmes' },
            { id: 'series', label: 'Séries' },
            { id: 'tv', label: 'TV Ao Vivo' },
            { id: 'ai-chat', label: 'CineAI Coach' },
            { id: 'watchlist', label: 'Minha Lista' },
            { id: 'warez', label: 'Busca Warez' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold uppercase transition cursor-pointer
                ${activeTab === tab.id ? 'bg-red-600 text-white' : 'text-gray-400 hover:bg-zinc-900'}
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 relative z-10">

        {/* ================= HOME TAB (Dashboard & Hero) ================= */}
        {activeTab === 'home' && (
          <div id="home-view" className="space-y-12">
            
            {/* Cinematic Hero Banner */}
            <div 
              id="hero-banner"
              className="relative rounded-3xl overflow-hidden aspect-[16/10] md:aspect-[21/9] flex items-end border border-zinc-900 shadow-2xl shadow-red-950/10 group"
            >
              {/* Blur backdrop image wrapper */}
              <div className="absolute inset-0 z-0">
                <img 
                  src={heroContent.backdropUrl} 
                  alt={heroContent.title}
                  className="w-full h-full object-cover transform scale-100 group-hover:scale-102 transition duration-[8000ms]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/45 to-black/30" />
                <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/30 to-transparent" />
              </div>

              {/* Banner Info Content */}
              <div className="relative z-10 p-6 md:p-12 max-w-2xl space-y-4">
                <div className="flex items-center space-x-2.5">
                  <span className="bg-red-600 text-white text-[10px] font-black tracking-widest px-3 py-1 rounded-full uppercase">DESTAQUE DO ANO</span>
                  <div className="flex items-center space-x-1 text-yellow-500 bg-black/45 backdrop-blur-sm px-2 py-0.5 rounded-md text-xs font-bold border border-white/5">
                    <Star size={12} fill="currentColor" />
                    <span>{heroContent.rating}</span>
                  </div>
                  <span className="text-gray-300 text-xs font-mono">{heroContent.year}</span>
                </div>

                <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-none text-white drop-shadow">
                  {heroContent.title}
                </h1>

                <p className="text-sm md:text-base text-gray-300 line-clamp-3 leading-relaxed drop-shadow">
                  {heroContent.synopsis}
                </p>

                <div className="flex flex-wrap gap-2 text-xs font-medium text-gray-300 pt-1">
                  {heroContent.genres.map((g, idx) => (
                    <span key={idx} className="bg-zinc-900/80 px-2.5 py-1 rounded-md border border-zinc-800">
                      {g}
                    </span>
                  ))}
                  <span className="bg-zinc-900/80 px-2.5 py-1 rounded-md border border-zinc-800 text-gray-300 font-mono">
                    ⏱️ {heroContent.duration}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-3 pt-3">
                  <button
                    id="btn-hero-watch"
                    onClick={() => setActiveVideo({ content: heroContent })}
                    className="bg-red-600 hover:bg-red-500 text-white font-bold text-sm px-6 py-3 rounded-xl flex items-center space-x-2.5 shadow-lg shadow-red-900/30 hover:scale-105 active:scale-95 transition duration-150 cursor-pointer"
                  >
                    <Play fill="white" size={16} />
                    <span>ASSISTIR AGORA</span>
                  </button>

                  <button
                    id="btn-hero-details"
                    onClick={() => openDetails(heroContent)}
                    className="bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 text-white font-bold text-sm px-5 py-3 rounded-xl flex items-center space-x-2.5 transition cursor-pointer"
                  >
                    <Info size={16} />
                    <span>MAIS INFORMAÇÕES</span>
                  </button>

                  <button
                    id="btn-hero-watchlist"
                    onClick={() => toggleWatchlist(heroContent.id)}
                    className={`
                      p-3 rounded-xl border transition cursor-pointer
                      ${watchlist.includes(heroContent.id) 
                        ? 'bg-red-600/15 border-red-500 text-red-500' 
                        : 'bg-zinc-900/90 border-zinc-800 text-gray-300 hover:text-white'
                      }
                    `}
                    title="Adicionar à minha lista"
                  >
                    {watchlist.includes(heroContent.id) ? <Check size={18} /> : <Plus size={18} />}
                  </button>
                </div>
              </div>

              {/* Side Floating Live TV mini overlay */}
              <div className="absolute right-6 top-6 hidden md:flex flex-col bg-black/60 backdrop-blur-md border border-white/5 rounded-xl p-3.5 w-64 space-y-2 z-15">
                <div className="flex items-center justify-between">
                  <span className="flex items-center space-x-1.5 text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full font-bold">
                    <span className="h-1.5 w-1.5 bg-white rounded-full animate-pulse" />
                    <span>TV AO VIVO</span>
                  </span>
                  <span className="text-[10px] font-mono text-gray-400">Canal Ativo</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{LIVE_CHANNELS[0].logo}</span>
                  <div>
                    <h4 className="text-xs font-bold text-white leading-tight">{LIVE_CHANNELS[0].name}</h4>
                    <p className="text-[10px] text-gray-400 line-clamp-1">{LIVE_CHANNELS[0].nowPlaying}</p>
                  </div>
                </div>
                <button
                  id="btn-hero-tv-go"
                  onClick={() => { setActiveTab('tv'); setActiveChannel(LIVE_CHANNELS[0]); }}
                  className="w-full text-center bg-white/10 hover:bg-white/20 text-white text-[11px] py-1.5 rounded-lg transition font-semibold"
                >
                  Sintonizar Canal
                </button>
              </div>
            </div>

            {/* CineAI Prompt Bar Helper - instant recommendation shortcut */}
            <div className="bg-gradient-to-r from-red-950/20 via-zinc-900/60 to-zinc-950 border border-zinc-900 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-xl bg-red-600/10 text-red-500">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h3 className="text-sm md:text-base font-bold text-white">Está em dúvida do que assistir hoje?</h3>
                  <p className="text-xs text-gray-400">Deixe o CineAI decidir. Diga o seu humor ou o que gostaria de sentir!</p>
                </div>
              </div>
              <button
                id="btn-ask-ai-home"
                onClick={() => setActiveTab('ai-chat')}
                className="w-full md:w-auto bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-5 py-3 rounded-xl flex items-center justify-center space-x-2 tracking-wide uppercase transition cursor-pointer"
              >
                <span>Perguntar ao CineAI Coach</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {/* Genre Quick Filter */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg md:text-xl font-extrabold tracking-tight text-white flex items-center">
                  <Compass className="text-red-500 mr-2" size={18} />
                  Filtrar por Categoria
                </h2>
                {selectedGenre && (
                  <button
                    onClick={() => setSelectedGenre(null)}
                    className="text-xs text-red-500 font-semibold hover:underline"
                  >
                    Limpar Filtro
                  </button>
                )}
              </div>
              <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
                <button
                  onClick={() => setSelectedGenre(null)}
                  className={`
                    px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer
                    ${!selectedGenre 
                      ? 'bg-white text-zinc-950' 
                      : 'bg-zinc-900 hover:bg-zinc-850 text-gray-300'
                    }
                  `}
                >
                  Todos os Gêneros
                </button>
                {allGenres.map((genre) => (
                  <button
                    key={genre}
                    onClick={() => setSelectedGenre(genre)}
                    className={`
                      px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer
                      ${selectedGenre === genre 
                        ? 'bg-red-600 text-white' 
                        : 'bg-zinc-900 hover:bg-zinc-850 text-gray-300 border border-zinc-800'
                      }
                    `}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            {/* Catalog list section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg md:text-xl font-extrabold tracking-tight text-white">Navegar pelo Catálogo</h2>
                  <p className="text-xs text-gray-400">Selecione para ver sinopse, elenco e curiosidades geradas por IA</p>
                </div>
                <span className="text-xs font-mono text-zinc-500">
                  {filteredContent.length} títulos encontrados
                </span>
              </div>

              {filteredContent.length === 0 ? (
                <div className="p-12 text-center bg-zinc-900/20 border border-zinc-900 rounded-3xl space-y-3">
                  <p className="text-sm text-gray-400">Nenhum título encontrado para o filtro selecionado.</p>
                  <button
                    onClick={() => { setSelectedGenre(null); setSearchQuery(''); }}
                    className="text-xs bg-red-600/10 text-red-500 px-4 py-2 rounded-lg border border-red-500/10 hover:bg-red-600 hover:text-white transition cursor-pointer"
                  >
                    Resetar Filtros
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 md:gap-6">
                  {filteredContent.map((item) => (
                    <div 
                      key={item.id}
                      onClick={() => openDetails(item)}
                      className="group relative bg-zinc-900 border border-zinc-900 rounded-2xl overflow-hidden cursor-pointer shadow-lg hover:border-zinc-800 hover:-translate-y-1 transition-all duration-300"
                    >
                      {/* Image Thumbnail */}
                      <div className="aspect-[2/3] w-full relative overflow-hidden">
                        <img 
                          src={item.posterUrl} 
                          alt={item.title} 
                          className="w-full h-full object-cover transform scale-100 group-hover:scale-105 transition duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent opacity-0 group-hover:opacity-100 transition duration-300 flex items-end p-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveVideo({ content: item });
                            }}
                            className="w-full bg-red-600 text-white font-bold text-xs py-2 rounded-xl flex items-center justify-center space-x-1.5 shadow-md shadow-red-900/30"
                          >
                            <Play fill="currentColor" size={10} />
                            <span>ASSISTIR NOW</span>
                          </button>
                        </div>
                        
                        {/* Tags over image */}
                        <div className="absolute top-2 left-2 flex flex-col space-y-1">
                          <span className={`text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded text-white ${item.type === 'movie' ? 'bg-red-600' : 'bg-purple-600'}`}>
                            {item.type === 'movie' ? 'Filme' : 'Série'}
                          </span>
                        </div>

                        {/* Watchlist toggle badge */}
                        <button
                          onClick={(e) => toggleWatchlist(item.id, e)}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 backdrop-blur-md text-gray-300 hover:text-red-500 transition border border-white/5"
                        >
                          <Heart size={14} className={watchlist.includes(item.id) ? 'fill-red-500 text-red-500' : ''} />
                        </button>
                      </div>

                      {/* Info body */}
                      <div className="p-3.5 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] text-gray-400 font-semibold font-mono">
                          <span>{item.year}</span>
                          <span className="flex items-center text-yellow-500">
                            <Star size={10} fill="currentColor" className="mr-0.5" />
                            {item.rating}
                          </span>
                        </div>
                        <h3 className="font-bold text-xs md:text-sm text-white line-clamp-1 group-hover:text-red-400 transition">
                          {item.title}
                        </h3>
                        <p className="text-[10px] text-gray-400 font-mono">
                          ⏱️ {item.duration}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* TV Ao Vivo Promotion section */}
            <div className="bg-gradient-to-br from-zinc-900 via-zinc-900/40 to-zinc-950 border border-zinc-800 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-3">
                <span className="text-[10px] bg-red-600/10 text-red-500 px-3 py-1 rounded-full border border-red-500/20 uppercase font-black tracking-widest">TV AO VIVO GRATUITA</span>
                <h3 className="text-xl md:text-2xl font-extrabold tracking-tight text-white">Sintonize os Melhores Canais Brasileiros</h3>
                <p className="text-sm text-gray-400 max-w-xl">Canais de notícias, esportes, filmes clássicos e documentários ao vivo com barra de notícias inteligente integrada ao feed de transmissão.</p>
              </div>
              <button
                id="btn-goto-tv-home"
                onClick={() => setActiveTab('tv')}
                className="w-full md:w-auto bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-white font-bold text-xs px-6 py-4 rounded-xl flex items-center justify-center space-x-2 tracking-wide uppercase transition cursor-pointer"
              >
                <Tv size={16} />
                <span>Abrir Guia de Canais</span>
              </button>
            </div>

          </div>
        )}


        {/* ================= MOVIES & SERIES LIST TAB ================= */}
        {(activeTab === 'movies' || activeTab === 'series') && (
          <div id="catalog-view" className="space-y-8">
            <div className="border-b border-zinc-900 pb-5">
              <h1 className="text-2xl md:text-3xl font-black text-white capitalize">
                {activeTab === 'movies' ? 'Filmes em Destaque' : 'Séries de TV'}
              </h1>
              <p className="text-sm text-gray-400">
                {activeTab === 'movies' 
                  ? 'As produções cinematográficas mais comentadas com legendas em múltiplos idiomas e áudio nativo.' 
                  : 'Maratone temporadas inteiras dos nossos seriados originais com suporte a seleção individual de episódios.'}
              </p>
            </div>

            {/* Catalog Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 md:gap-6">
              {filteredContent.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => openDetails(item)}
                  className="group relative bg-zinc-900 border border-zinc-900 rounded-2xl overflow-hidden cursor-pointer shadow-lg hover:border-zinc-800 hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="aspect-[2/3] w-full relative overflow-hidden">
                    <img 
                      src={item.posterUrl} 
                      alt={item.title} 
                      className="w-full h-full object-cover transform scale-100 group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute top-2 left-2">
                      <span className="text-[9px] bg-black/60 backdrop-blur-md px-2 py-0.5 rounded font-mono text-gray-300">
                        {item.ageRating === 'L' ? 'Livre' : `${item.ageRating}+`}
                      </span>
                    </div>
                    <button
                      onClick={(e) => toggleWatchlist(item.id, e)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 backdrop-blur-md text-gray-300 hover:text-red-500 transition border border-white/5"
                    >
                      <Heart size={14} className={watchlist.includes(item.id) ? 'fill-red-500 text-red-500' : ''} />
                    </button>
                  </div>
                  <div className="p-3.5 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
                      <span>{item.year}</span>
                      <span className="text-yellow-500 flex items-center font-bold">
                        ★ {item.rating}
                      </span>
                    </div>
                    <h3 className="font-bold text-xs md:text-sm text-white line-clamp-1 group-hover:text-red-400 transition">
                      {item.title}
                    </h3>
                    <p className="text-[10px] text-gray-400 font-mono line-clamp-1">
                      {item.genres.join(' • ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* ================= TV TAB (Live TV Guide & Broadcaster) ================= */}
        {activeTab === 'tv' && (() => {
          const displayChannel = activeChannel || (iptvChannels.length > 0 ? iptvChannels[0] : null);
          return (
            <div id="tv-view" className="space-y-8">
              <div className="border-b border-zinc-900 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-black text-white flex items-center">
                    <span className="h-2 w-2 bg-red-600 rounded-full mr-3 animate-ping" />
                    TV ao Vivo Sintonizada
                  </h1>
                  <p className="text-sm text-gray-400">Assista a transmissões reais e canais públicos ao vivo das Américas integrados via API.</p>
                </div>
              </div>

              {/* IPTV Advanced Filtering System */}
              <div className="bg-zinc-900/35 border border-zinc-900/60 p-5 rounded-3xl space-y-4 shadow-xl">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                      type="text"
                      placeholder="Buscar canais por nome (Ex: SBT, Record, Cultura, CNN...)"
                      value={iptvSearchQuery}
                      onChange={(e) => setIptvSearchQuery(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-600 transition"
                    />
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Country Selector */}
                    <div className="flex items-center space-x-2 bg-zinc-950 border border-zinc-850 rounded-2xl px-4 py-2.5">
                      <span className="text-xs text-gray-500 font-mono">País:</span>
                      <select
                        value={selectedIptvCountry}
                        onChange={(e) => {
                          setSelectedIptvCountry(e.target.value);
                          setIptvPage(1);
                        }}
                        className="bg-transparent border-none text-xs font-bold text-white focus:outline-none cursor-pointer"
                      >
                        <option value="" className="bg-zinc-950 text-white">Todos os Países</option>
                        {iptvCountries.map(c => (
                          <option key={c} value={c} className="bg-zinc-950 text-white">
                            {c === 'BR' ? '🇧🇷 Brasil' : c === 'US' ? '🇺🇸 Estados Unidos' : c === 'AR' ? '🇦🇷 Argentina' : c === 'MX' ? '🇲🇽 México' : c === 'CA' ? '🇨🇦 Canadá' : c === 'CO' ? '🇨🇴 Colômbia' : `🏳️ ${c}`}
                          </option>
                        ))}
                        {/* Always ensure key countries are present */}
                        {!iptvCountries.includes('BR') && <option value="BR" className="bg-zinc-950 text-white">🇧🇷 Brasil</option>}
                        {!iptvCountries.includes('US') && <option value="US" className="bg-zinc-950 text-white">🇺🇸 Estados Unidos</option>}
                      </select>
                    </div>

                    {/* Category Selector */}
                    <div className="flex items-center space-x-2 bg-zinc-950 border border-zinc-850 rounded-2xl px-4 py-2.5">
                      <span className="text-xs text-gray-500 font-mono">Categoria:</span>
                      <select
                        value={selectedIptvCategory}
                        onChange={(e) => {
                          setSelectedIptvCategory(e.target.value);
                          setIptvPage(1);
                        }}
                        className="bg-transparent border-none text-xs font-bold text-white focus:outline-none cursor-pointer"
                      >
                        <option value="" className="bg-zinc-950 text-white">Todas as Categorias</option>
                        {iptvCategories.map(cat => (
                          <option key={cat} value={cat} className="bg-zinc-950 text-white">{cat}</option>
                        ))}
                      </select>
                    </div>

                    {/* Reload Button */}
                    <button
                      onClick={reloadIptvDatabase}
                      disabled={isSynchronizingM3u}
                      className="p-3 bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 rounded-2xl text-gray-400 hover:text-white transition disabled:opacity-50 cursor-pointer"
                      title="Sincronizar Playlist Real M3U"
                    >
                      <RefreshCcw size={16} className={isSynchronizingM3u ? 'animate-spin text-red-500' : ''} />
                    </button>
                  </div>
                </div>

                {isSynchronizingM3u && (
                  <div className="bg-amber-950/20 border border-amber-900/30 rounded-2xl p-4 flex items-center space-x-3 text-xs text-amber-300 animate-pulse">
                    <span className="h-2.5 w-2.5 bg-amber-500 rounded-full animate-ping flex-shrink-0" />
                    <p>
                      <strong>Sincronizando feed IPTV:</strong> Carregando transmissões ao vivo da API oficial das Américas. Os canais são atualizados automaticamente em tempo real!
                    </p>
                  </div>
                )}
              </div>

              {/* Grid Broadcast area */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* TV Screen Wrapper */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="relative rounded-3xl overflow-hidden bg-black aspect-video border border-zinc-850 shadow-2xl flex flex-col justify-between">
                    {displayChannel ? (
                      <LiveTvPlayer channel={displayChannel} />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-black text-gray-500 p-8">
                        <Tv size={48} className="animate-pulse mb-3 text-red-600/60" />
                        <p className="text-sm font-semibold text-zinc-300">Nenhum canal sintonizado no momento</p>
                        <p className="text-xs text-zinc-500 mt-1">Selecione um canal da lista ao lado para assistir.</p>
                      </div>
                    )}

                    {displayChannel && (
                      <>
                        {/* Channel Header overlay */}
                        <div className="absolute top-4 left-4 flex items-center space-x-3 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/5 pointer-events-none">
                          <span className="text-xl">📺</span>
                          <div>
                            <h3 className="text-xs font-bold text-white leading-tight">{displayChannel.name}</h3>
                            <div className="flex items-center space-x-1.5 mt-0.5">
                              <span className="h-1.5 w-1.5 bg-red-500 rounded-full animate-ping" />
                              <span className="text-[8px] text-red-400 font-mono uppercase tracking-wider font-bold">LIVE • {displayChannel.country}</span>
                            </div>
                          </div>
                        </div>

                        {/* Ticker Tape */}
                        <div className="absolute bottom-12 left-0 right-0 bg-red-600 text-white py-1.5 text-xs font-semibold overflow-hidden whitespace-nowrap border-y border-red-500 shadow-md">
                          <div className="inline-block animate-marquee uppercase tracking-wider space-x-12">
                            {(displayChannel.ticker || []).map((t, idx) => (
                              <span key={idx} className="mr-4">
                                ⚡ {t} •
                              </span>
                            ))}
                            {(displayChannel.ticker || []).map((t, idx) => (
                              <span key={`dup-${idx}`} className="mr-4">
                                ⚡ {t} •
                              </span>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {displayChannel && (
                    /* Info and interaction panel */
                    <div className="bg-zinc-900/30 border border-zinc-900 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">AGORA PASSANDO</span>
                        <h3 className="text-base font-bold text-white">{displayChannel.nowPlaying || 'Programação de TV ao Vivo'}</h3>
                        <p className="text-xs text-gray-400">Próxima Atração: <strong className="text-zinc-200">{displayChannel.nextShow || 'Próximo Show'}</strong></p>
                      </div>
                      <button
                        onClick={() => setActiveVideo({
                          content: {
                            id: displayChannel.id,
                            title: displayChannel.name,
                            type: 'tv',
                            genres: [displayChannel.category],
                            year: 2026,
                            rating: 4.8,
                            duration: 'Transmissão Contínua',
                            ageRating: 'L',
                            synopsis: `Sintonizado em tempo real no canal ${displayChannel.name}.`,
                            backdropUrl: '',
                            posterUrl: '',
                            videoUrl: displayChannel.videoUrl,
                            cast: ['Sinal Aberto']
                          }
                        })}
                        className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-5 py-3 rounded-xl flex items-center justify-center space-x-2 w-full md:w-auto transition cursor-pointer"
                      >
                        <Play size={14} fill="white" />
                        <span>Abrir em Modo Cinema</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Channels Side Selection EPG */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Guia de Canais ({iptvTotal})</h2>
                    {isFetchingIptv && (
                      <span className="text-[10px] bg-red-950/50 text-red-400 border border-red-900/30 px-2 py-0.5 rounded-full animate-pulse font-mono font-bold">
                        SINTONIZANDO...
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
                    {iptvChannels.length === 0 ? (
                      <div className="text-center py-12 text-zinc-500 space-y-2 border border-dashed border-zinc-800 rounded-3xl">
                        <Tv size={32} className="mx-auto opacity-40 animate-pulse text-zinc-600" />
                        <p className="text-xs">Nenhum canal sintonizado com os filtros atuais.</p>
                        <button 
                          onClick={() => { setSelectedIptvCountry(''); setSelectedIptvCategory(''); setIptvSearchQuery(''); }}
                          className="text-xs text-red-500 underline hover:text-red-400 cursor-pointer"
                        >
                          Limpar Filtros
                        </button>
                      </div>
                    ) : (
                      iptvChannels.map(ch => {
                        const isSelected = displayChannel && displayChannel.id === ch.id;
                        const hasLogoUrl = ch.logo && (ch.logo.startsWith('http') || ch.logo.startsWith('https'));
                        
                        return (
                          <div
                            key={ch.id}
                            onClick={() => setActiveChannel(ch)}
                            className={`
                              p-3.5 rounded-2xl border cursor-pointer transition flex items-center justify-between group
                              ${isSelected 
                                ? 'bg-zinc-900 border-red-600/50 shadow-lg' 
                                : 'bg-zinc-900/20 border-zinc-900/40 hover:border-zinc-800/80 hover:bg-zinc-900/10'
                              }
                            `}
                          >
                            <div className="flex items-center space-x-3.5 min-w-0">
                              <div className="h-10 w-10 rounded-xl bg-zinc-950 border border-zinc-850 overflow-hidden flex items-center justify-center flex-shrink-0">
                                {hasLogoUrl ? (
                                  <img 
                                    src={ch.logo} 
                                    alt={ch.name} 
                                    className="h-full w-full object-contain p-1"
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                      const parent = (e.target as HTMLImageElement).parentElement;
                                      if (parent) {
                                        const span = document.createElement('span');
                                        span.innerText = '📺';
                                        span.className = 'text-lg';
                                        parent.appendChild(span);
                                      }
                                    }}
                                  />
                                ) : (
                                  <span className="text-xl">📺</span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center space-x-2">
                                  <h4 className="text-xs font-bold text-white truncate group-hover:text-red-400 transition leading-snug">
                                    {ch.name}
                                  </h4>
                                  <span className="text-[8px] bg-zinc-950 text-gray-400 px-1 py-0.5 rounded flex-shrink-0 font-mono">
                                    {ch.country}
                                  </span>
                                </div>
                                <p className="text-[10px] text-gray-500 truncate mt-0.5 font-mono">
                                  {ch.category} • {ch.nowPlaying}
                                </p>
                              </div>
                            </div>
                            <ChevronRight size={14} className={isSelected ? 'text-red-500 flex-shrink-0' : 'text-gray-600 group-hover:text-gray-400 transition flex-shrink-0'} />
                          </div>
                        );
                      })
                    )}
                    
                    {/* Paginated Load More Button */}
                    {iptvChannels.length < iptvTotal && (
                      <button
                        onClick={() => {
                          const nextPage = iptvPage + 1;
                          setIptvPage(nextPage);
                          fetchIptvChannelsList(nextPage, false);
                        }}
                        disabled={isFetchingIptv}
                        className="w-full bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-800 text-gray-300 font-bold text-xs py-2.5 rounded-2xl transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 mt-2"
                      >
                        {isFetchingIptv ? (
                          <span className="inline-block h-3 w-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                        ) : null}
                        <span>Carregar Mais ({iptvTotal - iptvChannels.length})</span>
                      </button>
                    )}
                  </div>

                  <div className="bg-zinc-900/20 border border-zinc-900 p-4 rounded-2xl text-xs text-zinc-500 space-y-1">
                    <p>💡 <strong>Dica de Sintonização:</strong> Você pode usar filtros por país ou categoria para encontrar milhares de canais gratuitos da América do Norte, Central e do Sul!</p>
                  </div>
                </div>

              </div>
            </div>
          );
        })()}


        {/* ================= CINEAI AI COACH CHAT TAB ================= */}
        {activeTab === 'ai-chat' && (
          <div id="ai-chat-view" className="space-y-6">
            <div className="border-b border-zinc-900 pb-5">
              <h1 className="text-2xl md:text-3xl font-black text-white">CineAI Coach Recomendações</h1>
              <p className="text-sm text-gray-400">Utilize nosso consultor inteligente integrado ao LLM Gemini para selecionar seus filmes ou debater teorias de roteiros.</p>
            </div>
            
            <CineAIChat 
              currentWatchlist={watchlist} 
              onPlayContent={(c) => setActiveVideo({ content: c })} 
            />
          </div>
        )}


        {/* ================= WATCHLIST TAB (My saved movies) ================= */}
        {activeTab === 'watchlist' && (
          <div id="watchlist-view" className="space-y-8">
            <div className="border-b border-zinc-900 pb-5">
              <h1 className="text-2xl md:text-3xl font-black text-white">Minha Lista de Favoritos</h1>
              <p className="text-sm text-gray-400">Estes são os títulos que você salvou. Eles são integrados automaticamente ao cérebro do CineAI para que ele te conheça melhor!</p>
            </div>

            {watchlist.length === 0 ? (
              <div className="p-16 border-2 border-dashed border-zinc-800 rounded-3xl text-center space-y-4 max-w-xl mx-auto">
                <div className="h-16 w-16 bg-red-600/10 text-red-500 rounded-full flex items-center justify-center mx-auto">
                  <Heart size={28} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Sua lista está vazia</h3>
                  <p className="text-xs text-gray-500 mt-1">Navegue pelas abas "Início", "Filmes" ou "Séries" e clique no coração nos posters para favoritar.</p>
                </div>
                <button
                  onClick={() => setActiveTab('home')}
                  className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer"
                >
                  Voltar para Início
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 md:gap-6">
                {filteredContent.map((item) => (
                  <div 
                    key={item.id}
                    onClick={() => openDetails(item)}
                    className="group relative bg-zinc-900 border border-zinc-900 rounded-2xl overflow-hidden cursor-pointer shadow-lg hover:border-zinc-800 hover:-translate-y-1 transition-all duration-300"
                  >
                    <div className="aspect-[2/3] w-full relative overflow-hidden">
                      <img 
                        src={item.posterUrl} 
                        alt={item.title} 
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={(e) => toggleWatchlist(item.id, e)}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-red-600/90 text-white hover:bg-red-500 transition border border-white/5"
                        title="Remover"
                      >
                        <Check size={14} />
                      </button>
                    </div>
                    <div className="p-3.5 space-y-1">
                      <h3 className="font-bold text-xs md:text-sm text-white line-clamp-1">
                        {item.title}
                      </h3>
                      <p className="text-[10px] text-gray-400 font-mono">
                        ⏱️ {item.duration}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= WAREZCDN SEARCH TAB ================= */}
        {activeTab === 'warez' && (
          <div id="warez-view" className="space-y-8">
            <div className="border-b border-zinc-900 pb-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-2">
                    <Search className="text-red-500" size={28} />
                    Catálogo de Cinema Geral
                  </h1>
                  <p className="text-sm text-gray-400 mt-1">
                    Pesquise por qualquer filme ou série de TV do mundo real e assista instantaneamente através dos servidores do WarezCDN.
                  </p>
                </div>
                
                {/* Domain Selector */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center space-x-3 self-start md:self-auto shrink-0">
                  <span className="text-[10px] uppercase font-mono text-gray-400">Servidor CDN:</span>
                  <select 
                    value={warezDomain}
                    onChange={(e) => setWarezDomain(e.target.value as any)}
                    className="bg-zinc-950 border border-zinc-800 text-xs text-white rounded-lg px-2.5 py-1 focus:outline-none focus:border-red-600 font-mono"
                  >
                    <option value="embed.warezcdn.lat">warezcdn.lat (Principal)</option>
                    <option value="embed.warezcdn.link">warezcdn.link (Espelho)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Search Form */}
            <form onSubmit={handleSearchWarez} className="flex gap-3 max-w-2xl">
              <div className="relative flex-grow">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type="text"
                  placeholder="Ex: Interestelar, Matrix, Breaking Bad, Batman..."
                  value={warezQuery}
                  onChange={(e) => setWarezQuery(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 text-sm text-white rounded-2xl pl-12 pr-4 py-3.5 focus:outline-none focus:border-red-600 transition"
                />
              </div>
              <button
                type="submit"
                disabled={isSearchingWarez}
                className="bg-red-600 hover:bg-red-500 disabled:bg-red-800 disabled:opacity-50 text-white font-bold text-xs px-6 py-3.5 rounded-2xl tracking-wide uppercase transition flex items-center justify-center space-x-2 shrink-0 cursor-pointer"
              >
                {isSearchingWarez ? (
                  <span className="inline-block animate-spin border-2 border-white border-t-transparent rounded-full h-4 w-4"></span>
                ) : (
                  <span>Pesquisar</span>
                )}
              </button>
            </form>

            {/* Quick Suggestions */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-gray-500 font-mono">Sugestões:</span>
              {['Interestelar', 'Matrix', 'Breaking Bad', 'Stranger Things', 'A Origem'].map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => {
                    setWarezQuery(sug);
                    setIsSearchingWarez(true);
                    setWarezSearchError('');
                    fetch(`/api/warez/search?query=${encodeURIComponent(sug)}`)
                      .then(res => res.json())
                      .then(data => {
                        setWarezResults(data);
                        setIsSearchingWarez(false);
                      })
                      .catch(err => {
                        setWarezSearchError('Erro ao pesquisar sugestão.');
                        setIsSearchingWarez(false);
                      });
                  }}
                  className="bg-zinc-900/60 hover:bg-zinc-800 text-gray-400 hover:text-white px-3 py-1.5 rounded-lg border border-zinc-900 hover:border-zinc-800 transition"
                >
                  {sug}
                </button>
              ))}
            </div>

            {warezSearchError && (
              <div className="p-4 bg-red-950/20 border border-red-900/50 rounded-2xl text-xs text-red-400">
                ⚠️ {warezSearchError}
              </div>
            )}

            {/* Search Results */}
            {isSearchingWarez ? (
              <div className="py-24 text-center space-y-4">
                <div className="inline-block animate-spin border-4 border-red-500 border-t-transparent rounded-full h-12 w-12"></div>
                <p className="text-sm text-gray-400 font-mono">Consultando catálogo global via CineAI...</p>
              </div>
            ) : warezResults.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                {warezResults.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedWarezContent(item);
                      setSelectedWarezSeason(1);
                      setSelectedWarezEpisode(1);
                      setActiveWarezPlayer(null);
                    }}
                    className="group relative bg-zinc-900 border border-zinc-900 rounded-2xl overflow-hidden cursor-pointer shadow-lg hover:border-zinc-800 hover:-translate-y-1 transition-all duration-300"
                  >
                    <div className="aspect-[2/3] w-full relative overflow-hidden bg-zinc-950">
                      <img
                        src={item.posterUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=600';
                        }}
                      />
                      <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-md px-2 py-1 rounded-md text-[9px] font-mono font-bold text-amber-500 border border-white/5">
                        ⭐ {item.rating ? item.rating.toFixed(1) : '8.5'}
                      </div>
                      <div className="absolute top-2 right-2 bg-black/75 backdrop-blur-md px-2 py-1 rounded-md text-[9px] font-mono font-bold text-gray-300 border border-white/5 uppercase">
                        {item.type === 'movie' ? 'FILME' : 'SÉRIE'}
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition duration-300 flex items-end justify-center p-4">
                        <span className="bg-red-600 text-white font-bold text-[10px] px-3.5 py-2 rounded-xl uppercase tracking-wider flex items-center space-x-1 shadow-lg">
                          <Play size={10} fill="white" />
                          <span>Assistir</span>
                        </span>
                      </div>
                    </div>
                    <div className="p-3.5 space-y-1 bg-zinc-900">
                      <h3 className="font-bold text-xs md:text-sm text-white line-clamp-1 group-hover:text-red-500 transition">
                        {item.title}
                      </h3>
                      <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
                        <span>{item.year}</span>
                        <span>{item.duration}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-16 border-2 border-dashed border-zinc-800 rounded-3xl text-center space-y-4 max-w-xl mx-auto">
                <div className="h-16 w-16 bg-zinc-900 text-gray-500 rounded-full flex items-center justify-center mx-auto border border-zinc-800">
                  <Film size={28} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Nenhum título buscado ainda</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Digite o nome de um filme ou série acima para pesquisar. Nossa IA vai buscar todos os metadados e os IDs corretos de transmissão!
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

      </main>


      {/* ================= DETAILS MODAL WITH AI TRIVIA GENERATOR ================= */}
      {selectedContent && (
        <div 
          id="details-modal"
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-45 flex items-center justify-center p-4 overflow-y-auto select-none"
          onClick={() => setSelectedContent(null)}
        >
          <div 
            className="bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden w-full max-w-4xl shadow-2xl relative max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header backdrop */}
            <div className="relative aspect-[21/9] w-full shrink-0">
              <img 
                src={selectedContent.backdropUrl} 
                alt={selectedContent.title} 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
              
              <button
                id="btn-close-details"
                onClick={() => setSelectedContent(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/60 backdrop-blur-md text-gray-300 hover:text-white border border-white/5 cursor-pointer"
              >
                ✕
              </button>

              <div className="absolute bottom-4 left-6 md:left-8 flex items-end space-x-2">
                <span className="bg-red-600 text-white text-[9px] font-bold tracking-widest px-2.5 py-1 rounded-md uppercase">
                  {selectedContent.type === 'movie' ? 'FILME' : 'SÉRIE'}
                </span>
                <span className="text-xs text-zinc-300 font-mono">⏱️ {selectedContent.duration}</span>
              </div>
            </div>

            {/* Scrollable details body */}
            <div className="p-6 md:p-8 space-y-6 overflow-y-auto max-h-[60vh] scrollbar-thin scrollbar-thumb-zinc-800">
              
              <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="space-y-1.5">
                  <h2 className="text-xl md:text-3xl font-black text-white tracking-tight">{selectedContent.title}</h2>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                    <span className="font-bold text-yellow-500">★ {selectedContent.rating}</span>
                    <span>•</span>
                    <span>Ano {selectedContent.year}</span>
                    <span>•</span>
                    <span>Classificação: <strong className="text-red-400">{selectedContent.ageRating === 'L' ? 'Livre' : `${selectedContent.ageRating}+`}</strong></span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    id="btn-modal-watch"
                    onClick={() => {
                      setSelectedContent(null);
                      setActiveVideo({ content: selectedContent, episodeIndex: selectedContent.episodes ? 0 : undefined });
                    }}
                    className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-5 py-3 rounded-xl flex items-center space-x-2 tracking-wider shadow-lg shadow-red-900/20 transition cursor-pointer"
                  >
                    <Play fill="white" size={14} />
                    <span>PLAY</span>
                  </button>

                  <button
                    id="btn-modal-watchlist"
                    onClick={() => toggleWatchlist(selectedContent.id)}
                    className={`
                      p-3 rounded-xl border transition cursor-pointer
                      ${watchlist.includes(selectedContent.id) 
                        ? 'bg-red-600/15 border-red-500 text-red-500' 
                        : 'bg-zinc-900 border-zinc-800 text-gray-300 hover:text-white'
                      }
                    `}
                  >
                    {watchlist.includes(selectedContent.id) ? <Check size={14} /> : <Plus size={14} />}
                  </button>
                </div>
              </div>

              {/* Main Metadata split */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Left col: Synopsis & Episodes */}
                <div className="md:col-span-2 space-y-4">
                  <p className="text-sm text-gray-300 leading-relaxed">{selectedContent.synopsis}</p>
                  
                  {/* Episodes List if it is a series */}
                  {selectedContent.episodes && (
                    <div className="space-y-3 pt-3 border-t border-zinc-900">
                      <h3 className="text-sm font-black text-white uppercase tracking-wider">Episódios Disponíveis ({selectedContent.episodes.length})</h3>
                      <div className="space-y-2">
                        {selectedContent.episodes.map((ep, idx) => (
                          <div 
                            key={ep.id}
                            onClick={() => {
                              setSelectedContent(null);
                              setActiveVideo({ content: selectedContent, episodeIndex: idx });
                            }}
                            className="bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-900 rounded-xl p-3 flex items-center justify-between cursor-pointer group transition"
                          >
                            <div className="flex items-center space-x-3.5">
                              <span className="p-2 bg-red-600/10 text-red-500 rounded-lg group-hover:bg-red-600 group-hover:text-white transition">
                                <Play size={12} fill="currentColor" />
                              </span>
                              <div>
                                <h4 className="text-xs font-bold text-white group-hover:text-red-400 transition">{ep.title}</h4>
                                <p className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">{ep.synopsis}</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono text-zinc-500">{ep.duration}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right col: Cast / Crew / CineAI Intelligence card */}
                <div className="space-y-4">
                  <div className="bg-zinc-900/30 border border-zinc-900 rounded-2xl p-4 text-xs space-y-2">
                    {selectedContent.director && (
                      <p className="text-zinc-400">Diretor: <strong className="text-white font-medium">{selectedContent.director}</strong></p>
                    )}
                    <p className="text-zinc-400">Elenco principal: <strong className="text-white font-medium">{selectedContent.cast.join(', ')}</strong></p>
                    <p className="text-zinc-400">Gênero: <strong className="text-white font-medium">{selectedContent.genres.join(', ')}</strong></p>
                  </div>

                  {/* CineAI Intelligent box */}
                  <div className="bg-gradient-to-br from-red-950/20 via-zinc-900/60 to-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-3 shadow-lg">
                    <div className="flex items-center space-x-2 text-red-500">
                      <Sparkles size={16} className="animate-pulse" />
                      <span className="text-[10px] font-extrabold uppercase tracking-widest">Informações de Bastidores (CineAI)</span>
                    </div>

                    {isLoadingTrivia ? (
                      <div className="py-6 text-center space-y-2">
                        <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto" />
                        <span className="text-[10px] text-zinc-500 font-mono">Consolidando dados do Gemini...</span>
                      </div>
                    ) : triviaData ? (
                      <div className="space-y-3.5 text-xs">
                        <div className="space-y-1">
                          <span className="text-[10px] text-zinc-500 font-semibold block uppercase">Frase de Efeito Famosa</span>
                          <p className="italic text-zinc-300 font-serif">"{triviaData.famousQuote}"</p>
                        </div>
                        <div className="space-y-1 border-t border-zinc-900 pt-2">
                          <span className="text-[10px] text-zinc-500 font-semibold block uppercase">Curiosidade Técnica</span>
                          <p className="text-zinc-300 leading-relaxed">{triviaData.trivia}</p>
                        </div>
                        <div className="space-y-1 border-t border-zinc-900 pt-2">
                          <span className="text-[10px] text-zinc-500 font-semibold block uppercase">Consenso da Crítica</span>
                          <p className="text-zinc-300 leading-relaxed">{triviaData.criticalConsensus}</p>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => fetchTrivia(selectedContent)}
                        className="w-full text-center bg-red-600/10 hover:bg-red-600 hover:text-white text-red-400 text-xs py-2 rounded-xl transition font-bold"
                      >
                        Carregar Bastidores com IA
                      </button>
                    )}
                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>
      )}


      {/* ================= WAREZ DETAILS & THEATRE MODAL ================= */}
      {selectedWarezContent && (
        <div
          id="warez-details-modal"
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-45 flex items-center justify-center p-4 overflow-y-auto select-none"
          onClick={() => setSelectedWarezContent(null)}
        >
          <div
            className="bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden w-full max-w-4xl shadow-2xl relative max-h-[95vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Backdrop */}
            <div className="relative aspect-[21/9] w-full shrink-0">
              <img
                src={selectedWarezContent.backdropUrl}
                alt={selectedWarezContent.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
              
              <button
                onClick={() => setSelectedWarezContent(null)}
                className="absolute top-4 right-4 p-2.5 rounded-full bg-black/60 backdrop-blur-md text-gray-300 hover:text-white border border-white/5 cursor-pointer z-50"
              >
                ✕
              </button>

              <div className="absolute bottom-4 left-6 md:left-8 flex items-end space-x-2">
                <span className="bg-red-600 text-white text-[9px] font-bold tracking-widest px-2.5 py-1 rounded-md uppercase">
                  {selectedWarezContent.type === 'movie' ? 'FILME' : 'SÉRIE'}
                </span>
                <span className="bg-zinc-900 border border-zinc-800 text-gray-300 text-[9px] font-bold tracking-widest px-2.5 py-1 rounded-md font-mono">
                  TMDB ID: {selectedWarezContent.tmdbId}
                </span>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 md:p-8 space-y-6 overflow-y-auto flex-grow scrollbar-thin scrollbar-thumb-zinc-800">
              {/* If player is ACTIVE, show the player frame first */}
              {activeWarezPlayer ? (() => {
                const { tmdbId, imdbId, type, season, episode } = activeWarezPlayer;
                const s = season || 1;
                const e = episode || 1;
                const idToUse = imdbId || tmdbId;
                let embedUrl = '';

                switch (embedSource) {
                  case 'warez_tmdb':
                    embedUrl = type === 'movie'
                      ? `https://${warezDomain}/filme/${tmdbId}`
                      : `https://${warezDomain}/serie/${tmdbId}/${s}/${e}`;
                    break;
                  case 'warez_imdb':
                    embedUrl = type === 'movie'
                      ? `https://${warezDomain}/filme/${idToUse}`
                      : `https://${warezDomain}/serie/${idToUse}/${s}/${e}`;
                    break;
                  case 'superembeds':
                    embedUrl = type === 'movie'
                      ? `https://multiembed.mov/?video_id=${idToUse}`
                      : `https://multiembed.mov/?video_id=${idToUse}&s=${s}&e=${e}`;
                    break;
                  case 'vidsrc_me':
                    embedUrl = type === 'movie'
                      ? `https://vidsrc.me/embed/movie?tmdb=${tmdbId}${imdbId ? `&imdb=${imdbId}` : ''}`
                      : `https://vidsrc.me/embed/tv?tmdb=${tmdbId}&season=${s}&episode=${e}`;
                    break;
                  case 'vidsrc_to':
                    embedUrl = type === 'movie'
                      ? `https://vidsrc.to/embed/movie/${tmdbId}`
                      : `https://vidsrc.to/embed/tv/${tmdbId}/${s}/${e}`;
                    break;
                  default:
                    embedUrl = type === 'movie'
                      ? `https://${warezDomain}/filme/${tmdbId}`
                      : `https://${warezDomain}/serie/${tmdbId}/${s}/${e}`;
                    break;
                }

                return (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800 gap-3">
                      <div className="flex items-center space-x-3">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-ping"></div>
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          Transmitindo: {activeWarezPlayer.title} 
                          {activeWarezPlayer.type === 'series' && ` (T${activeWarezPlayer.season} : E${activeWarezPlayer.episode})`}
                        </span>
                      </div>
                      <button
                        onClick={() => setActiveWarezPlayer(null)}
                        className="bg-zinc-800 hover:bg-zinc-700 text-gray-300 hover:text-white text-xs px-4 py-2 rounded-xl transition cursor-pointer font-bold"
                      >
                        Voltar às Opções
                      </button>
                    </div>

                    {/* Sandbox Bypass Banner & External Tab Trigger */}
                    <div className="bg-red-950/20 border border-red-900/30 p-4 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-xs">
                      <div className="space-y-1">
                        <p className="text-red-400 font-bold flex items-center gap-1.5">
                          <span>⚠️ Erro "Sandboxing is not allowed" ou reprodutor bloqueado?</span>
                        </p>
                        <p className="text-gray-300 text-[11px] leading-relaxed">
                          O ambiente de visualização do Google AI Studio restringe a execução interna de players externos para sua segurança.
                          Para assistir ao filme/série em tela cheia sem erros ou limitações, use o botão ao lado para abrir o reprodutor numa nova aba!
                        </p>
                      </div>
                      <a
                        href={embedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-red-600 hover:bg-red-500 text-white font-extrabold px-5 py-3 rounded-xl transition text-center whitespace-nowrap inline-flex items-center justify-center space-x-1.5 shadow-lg shadow-red-900/40 text-xs shrink-0 cursor-pointer border border-red-500"
                      >
                        <span>Assistir em Nova Aba ↗</span>
                      </a>
                    </div>

                    {/* Cinematic Video Iframe */}
                    <div className="aspect-video w-full bg-black rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl relative">
                      <iframe
                        src={embedUrl}
                        className="w-full h-full"
                        allowFullScreen
                        referrerPolicy="no-referrer"
                        allow="autoplay; encrypted-media"
                      />
                    </div>

                    {/* Server Source & Mirror Controls */}
                    <div className="space-y-4 p-5 bg-zinc-900/60 rounded-2xl border border-zinc-800">
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Selecione o Servidor de Reprodução</h4>
                        <p className="text-[10px] text-gray-400">Se o reprodutor atual exibir erro 404 ou não carregar, mude de servidor abaixo:</p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        <button
                          onClick={() => setEmbedSource('warez_tmdb')}
                          className={`px-3 py-2 rounded-xl border text-xs font-medium transition text-center ${
                            embedSource === 'warez_tmdb'
                              ? 'bg-red-600 border-red-500 text-white font-bold'
                              : 'bg-zinc-950 text-gray-400 border-zinc-850 hover:bg-zinc-900 hover:text-white'
                          }`}
                        >
                          📺 Warez (TMDB)
                        </button>
                        <button
                          onClick={() => setEmbedSource('warez_imdb')}
                          className={`px-3 py-2 rounded-xl border text-xs font-medium transition text-center ${
                            embedSource === 'warez_imdb'
                              ? 'bg-red-600 border-red-500 text-white font-bold'
                              : 'bg-zinc-950 text-gray-400 border-zinc-850 hover:bg-zinc-900 hover:text-white'
                          }`}
                        >
                          🎬 Warez (IMDb)
                        </button>
                        <button
                          onClick={() => setEmbedSource('superembeds')}
                          className={`px-3 py-2 rounded-xl border text-xs font-medium transition text-center ${
                            embedSource === 'superembeds'
                              ? 'bg-red-600 border-red-500 text-white font-bold'
                              : 'bg-zinc-950 text-gray-400 border-zinc-850 hover:bg-zinc-900 hover:text-white'
                          }`}
                        >
                          🌐 SuperEmbeds
                        </button>
                        <button
                          onClick={() => setEmbedSource('vidsrc_me')}
                          className={`px-3 py-2 rounded-xl border text-xs font-medium transition text-center ${
                            embedSource === 'vidsrc_me'
                              ? 'bg-red-600 border-red-500 text-white font-bold'
                              : 'bg-zinc-950 text-gray-400 border-zinc-850 hover:bg-zinc-900 hover:text-white'
                          }`}
                        >
                          ⚡ VidSrc.me
                        </button>
                        <button
                          onClick={() => setEmbedSource('vidsrc_to')}
                          className={`px-3 py-2 rounded-xl border text-xs font-medium transition text-center ${
                            embedSource === 'vidsrc_to'
                              ? 'bg-red-600 border-red-500 text-white font-bold'
                              : 'bg-zinc-950 text-gray-400 border-zinc-850 hover:bg-zinc-900 hover:text-white'
                          }`}
                        >
                          🔥 VidSrc.to
                        </button>
                      </div>

                      {/* Show Warez Domain selector ONLY if warez_tmdb or warez_imdb is active */}
                      {(embedSource === 'warez_tmdb' || embedSource === 'warez_imdb') && (
                        <div className="pt-2 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                          <div className="flex items-center space-x-2 text-gray-400">
                            <span>Espelho de Domínio Warez:</span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setWarezDomain('embed.warezcdn.lat')}
                              className={`px-3 py-1.5 rounded-lg border font-mono transition ${
                                warezDomain === 'embed.warezcdn.lat'
                                  ? 'bg-red-600/10 text-red-500 border-red-500/20 font-bold'
                                  : 'bg-zinc-950 text-gray-400 border-zinc-850 hover:bg-zinc-900'
                              }`}
                            >
                              warezcdn.lat
                            </button>
                            <button
                              onClick={() => setWarezDomain('embed.warezcdn.link')}
                              className={`px-3 py-1.5 rounded-lg border font-mono transition ${
                                warezDomain === 'embed.warezcdn.link'
                                  ? 'bg-red-600/10 text-red-500 border-red-500/20 font-bold'
                                  : 'bg-zinc-950 text-gray-400 border-zinc-850 hover:bg-zinc-900'
                              }`}
                            >
                              warezcdn.link
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-4 bg-amber-950/10 border border-amber-900/20 rounded-2xl text-[11px] text-amber-500/80 leading-relaxed">
                      💡 <strong>Dica de Transmissão:</strong> Reprodutores de vídeo CDN gratuitos podem exibir abas pop-up de publicidade ao serem clicados pela primeira vez. Basta fechar as abas secundárias e retornar para continuar assistir. O uso de um navegador com bloqueador de anúncios (como AdBlock ou Brave) elimina todas as propagandas!
                    </div>
                  </div>
                );
              })() : (
                <div className="grid md:grid-cols-3 gap-6">
                  {/* Left poster */}
                  <div className="shrink-0 aspect-[2/3] w-full md:w-56 bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-850 shadow-xl self-start">
                    <img
                      src={selectedWarezContent.posterUrl}
                      alt={selectedWarezContent.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=600';
                      }}
                    />
                  </div>

                  {/* Right description & controls */}
                  <div className="md:col-span-2 space-y-5">
                    <div>
                      <h2 className="text-xl md:text-2xl font-black text-white">{selectedWarezContent.title}</h2>
                      <div className="flex flex-wrap gap-2 items-center text-xs text-gray-400 font-mono mt-1.5">
                        <span className="text-amber-500 font-bold">⭐ {selectedWarezContent.rating ? selectedWarezContent.rating.toFixed(1) : '8.5'}</span>
                        <span>•</span>
                        <span>{selectedWarezContent.year}</span>
                        <span>•</span>
                        <span>{selectedWarezContent.duration}</span>
                        <span>•</span>
                        <span className="bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-gray-300">
                          Classificação: {selectedWarezContent.ageRating}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {selectedWarezContent.genres.map((genre: string) => (
                        <span key={genre} className="bg-zinc-900/80 border border-zinc-850 text-gray-400 text-[10px] px-2.5 py-1 rounded-full">
                          {genre}
                        </span>
                      ))}
                    </div>

                    <div className="text-xs text-gray-300 leading-relaxed bg-zinc-900/30 p-4 rounded-2xl border border-zinc-900">
                      <p className="font-semibold text-gray-400 mb-1">Sinopse:</p>
                      {selectedWarezContent.synopsis}
                    </div>

                    {/* Stream Play Options based on type */}
                    {selectedWarezContent.type === 'movie' ? (
                      <div className="space-y-3 pt-2">
                        <button
                          onClick={() => setActiveWarezPlayer({
                            tmdbId: selectedWarezContent.tmdbId,
                            imdbId: selectedWarezContent.imdbId,
                            title: selectedWarezContent.title,
                            type: 'movie'
                          })}
                          className="w-full bg-red-600 hover:bg-red-500 text-white font-black text-xs py-4 rounded-2xl tracking-wide uppercase transition flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-red-900/20"
                        >
                          <Play size={14} fill="white" />
                          <span>Assistir Filme Completo HD</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4 bg-zinc-900/60 p-5 rounded-2xl border border-zinc-850">
                        <h4 className="text-xs font-bold uppercase text-white tracking-wider">Selecione Temporada e Episódio</h4>
                        
                        <div className="grid grid-cols-2 gap-4">
                          {/* Season selector */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-gray-400 font-mono uppercase">Temporada:</label>
                            <select
                              value={selectedWarezSeason}
                              onChange={(e) => {
                                setSelectedWarezSeason(parseInt(e.target.value, 10));
                                setSelectedWarezEpisode(1);
                              }}
                              className="w-full bg-zinc-950 border border-zinc-800 text-xs text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-red-600 font-mono"
                            >
                              {Array.from({ length: selectedWarezContent.seasonsCount || 1 }, (_, i) => i + 1).map(s => (
                                <option key={s} value={s}>Temporada {s}</option>
                              ))}
                            </select>
                          </div>

                          {/* Episode selector */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-gray-400 font-mono uppercase">Episódio:</label>
                            <select
                              value={selectedWarezEpisode}
                              onChange={(e) => setSelectedWarezEpisode(parseInt(e.target.value, 10))}
                              className="w-full bg-zinc-950 border border-zinc-800 text-xs text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-red-600 font-mono"
                            >
                              {Array.from({ 
                                length: (selectedWarezContent.episodesCount && selectedWarezContent.episodesCount[selectedWarezSeason - 1]) || 10 
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
                          className="w-full bg-red-600 hover:bg-red-500 text-white font-black text-xs py-3.5 rounded-xl tracking-wide uppercase transition flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-red-900/20"
                        >
                          <Play size={12} fill="white" />
                          <span>Assistir: Temporada {selectedWarezSeason}, Episódio {selectedWarezEpisode}</span>
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


      {/* ================= ACTIVE VIDEO STREAMING THEATER PLAYER ================= */}
      {activeVideo && (
        <VideoPlayer 
          content={activeVideo.content} 
          episodeIndex={activeVideo.episodeIndex}
          onClose={() => setActiveVideo(null)}
          onNextEpisode={activeVideo.content.episodes ? handleNextEpisode : undefined}
        />
      )}

      {/* Subtle bottom footer info */}
      <footer className="mt-16 border-t border-zinc-900 pt-8 text-center text-xs text-zinc-500 max-w-7xl mx-auto px-4">
        <p>© 2026 CinePlay Brasil & CineAI Assistant. Todos os direitos reservados. Feito com amor por amantes do cinema brasileiro.</p>
        <p className="mt-1 text-[10px] font-mono text-zinc-600">Serviço de alta fidelidade rodando em Cloud Run com suporte a Web e Android Native API.</p>
      </footer>

    </div>
  );
}
