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
  const [activeTab, setActiveTab] = useState<'warez' | 'tv' | 'watchlist' | 'plus_iptv'>('watchlist');
  
  // Ref to track if sintonizing a channel clicked from watchlist to prevent overwriting
  const watchlistSelectionRef = useRef<string | null>(null);
  
  // Watchlist (Local Storage)
  const [watchlist, setWatchlist] = useState<any[]>(() => {
    const saved = localStorage.getItem('warez_watchlist_v2');
    return saved ? JSON.parse(saved) : [];
  });

  // +IPTV States
  const [plusIptvChannels, setPlusIptvChannels] = useState<LiveChannel[]>([]);
  const [plusIptvCategories, setPlusIptvCategories] = useState<string[]>([]);
  const [selectedPlusIptvCategory, setSelectedPlusIptvCategory] = useState<string>('');
  const [plusIptvSearchQuery, setPlusIptvSearchQuery] = useState<string>('');
  const [isFetchingPlusIptv, setIsFetchingPlusIptv] = useState<boolean>(false);
  const [plusIptvTotal, setPlusIptvTotal] = useState<number>(0);
  const [plusIptvPage, setPlusIptvPage] = useState<number>(1);
  const [plusIptvLoadingError, setPlusIptvLoadingError] = useState<string>('');
  const [plusIptvStats, setPlusIptvStats] = useState<{ total: number; working: number; broken: number; untested: number }>({ total: 0, working: 0, broken: 0, untested: 0 });
  const [defaultIptvStats, setDefaultIptvStats] = useState<{ total: number; working: number; broken: number; untested: number }>({ total: 0, working: 0, broken: 0, untested: 0 });
  
  // Stream testing toggles
  const [onlyWorkingDefault, setOnlyWorkingDefault] = useState<boolean>(false);
  const [onlyWorkingPlus, setOnlyWorkingPlus] = useState<boolean>(true); // Default to true so they see functional channels first!
  const [testingChannelsIds, setTestingChannelsIds] = useState<{ [id: string]: boolean }>({});

  // Continue Watching (Local Storage)
  const [continueWatching, setContinueWatching] = useState<any[]>(() => {
    const saved = localStorage.getItem('warez_continue_watching');
    return saved ? JSON.parse(saved) : [];
  });

  // Function to add content to continue watching list
  const addToContinueWatching = (item: any) => {
    setContinueWatching(prev => {
      const filtered = prev.filter(p => {
        if (item.type === 'tv' && p.type === 'tv') {
          return p.id !== item.id;
        }
        if (item.type !== 'tv' && p.type !== 'tv') {
          return p.tmdbId !== item.tmdbId;
        }
        return true;
      });
      const updated = [item, ...filtered].slice(0, 10); // Keep up to 10 items
      localStorage.setItem('warez_continue_watching', JSON.stringify(updated));
      return updated;
    });
  };

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
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'movie' | 'series' | 'kids' | 'lançamentos' | 'acao' | 'comedia' | 'terror' | 'drama'>('all');
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
  const [embedSource, setEmbedSource] = useState<string>('servidor_6');
  const [warezDomain, setWarezDomain] = useState<string>('embed.warezcdn.link');
  const [superflixDomain, setSuperflixDomain] = useState<string>('superflixapi.lifestyle');
  const [warezSearchError, setWarezSearchError] = useState<string>('');

  // Dynamic TV series details state
  const [dynamicSeasonsCount, setDynamicSeasonsCount] = useState<number>(1);
  const [dynamicEpisodesCount, setDynamicEpisodesCount] = useState<number>(12);
  const [loadingTvDetails, setLoadingTvDetails] = useState<boolean>(false);

  // Auto-fetch TV Series seasons when selected
  useEffect(() => {
    if (selectedWarezContent && selectedWarezContent.type === 'series') {
      setLoadingTvDetails(true);
      setSelectedWarezSeason(1);
      setSelectedWarezEpisode(1);
      
      fetch(`/api/warez/tv-details?tmdbId=${selectedWarezContent.tmdbId}`)
        .then(res => res.json())
        .then(data => {
          setDynamicSeasonsCount(data.seasonsCount || selectedWarezContent.seasonsCount || 1);
          setLoadingTvDetails(false);
        })
        .catch(err => {
          console.error('Error fetching TV details:', err);
          setDynamicSeasonsCount(selectedWarezContent.seasonsCount || 1);
          setLoadingTvDetails(false);
        });
    } else {
      setDynamicSeasonsCount(1);
      setDynamicEpisodesCount(12);
    }
  }, [selectedWarezContent]);

  // Auto-fetch TV Series episodes when season changes
  useEffect(() => {
    if (selectedWarezContent && selectedWarezContent.type === 'series') {
      fetch(`/api/warez/tv-episodes?tmdbId=${selectedWarezContent.tmdbId}&season=${selectedWarezSeason}`)
        .then(res => res.json())
        .then(data => {
          setDynamicEpisodesCount(data.episodesCount || 12);
        })
        .catch(err => {
          console.error('Error fetching TV episodes:', err);
          if (selectedWarezContent.episodesCount && selectedWarezContent.episodesCount[selectedWarezSeason - 1]) {
            setDynamicEpisodesCount(selectedWarezContent.episodesCount[selectedWarezSeason - 1]);
          } else {
            setDynamicEpisodesCount(12);
          }
        });
    }
  }, [selectedWarezContent, selectedWarezSeason]);

  // ==================== TV & KEYBOARD NAVIGATION (D-PAD) ====================
  // focusedSection: 'sidebar' | 'grid' | 'modal'
  const [focusedSection, setFocusedSection] = useState<'sidebar' | 'grid' | 'modal'>('sidebar');
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [lastRemoteAction, setLastRemoteAction] = useState<string>('');

  // Sync Watchlist
  useEffect(() => {
    localStorage.setItem('warez_watchlist_v2', JSON.stringify(watchlist));
  }, [watchlist]);

  // Track Active Channel for Continue Watching
  useEffect(() => {
    if (activeChannel) {
      addToContinueWatching({
        id: activeChannel.id,
        name: activeChannel.name,
        logo: activeChannel.logo,
        url: activeChannel.url,
        category: activeChannel.category,
        country: activeChannel.country,
        nowPlaying: activeChannel.nowPlaying,
        type: 'tv'
      });
    }
  }, [activeChannel]);

  // Track Active Warez Player for Continue Watching
  useEffect(() => {
    if (activeWarezPlayer) {
      const original = warezResults.find(r => r.tmdbId === activeWarezPlayer.tmdbId) || selectedWarezContent;
      addToContinueWatching({
        id: activeWarezPlayer.tmdbId,
        tmdbId: activeWarezPlayer.tmdbId,
        imdbId: activeWarezPlayer.imdbId,
        title: activeWarezPlayer.title,
        type: activeWarezPlayer.type,
        season: activeWarezPlayer.season,
        episode: activeWarezPlayer.episode,
        posterUrl: original?.posterUrl || original?.image || "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&q=80&w=300",
        year: original?.year || "Full HD",
        rating: original?.rating || 8.5
      });
    }
  }, [activeWarezPlayer, warezResults]);

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

  // Carregar catálogo de sucessos (Estilo YouCine) ao iniciar
  useEffect(() => {
    const loadDefaultCatalog = async () => {
      setIsSearchingWarez(true);
      setWarezSearchError('');
      try {
        const res = await fetch('/api/warez/search?query=');
        if (res.ok) {
          const data = await res.json();
          setWarezResults(data || []);
        }
      } catch (err: any) {
        console.error('Erro ao carregar catálogo inicial:', err);
      } finally {
        setIsSearchingWarez(false);
      }
    };
    loadDefaultCatalog();
  }, []);

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
      
      if (onlyWorkingDefault) url += `&onlyWorking=true`;
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
      if (data.stats) {
        setDefaultIptvStats(data.stats);
      }

      if (data.channels && data.channels.length > 0 && resetList) {
        if (watchlistSelectionRef.current) {
          // Cleared because we specifically clicked a channel from the watchlist
          watchlistSelectionRef.current = null;
        } else {
          setActiveChannel(data.channels[0]);
        }
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

  // Fetch dynamic +IPTV channels
  const fetchPlusIptvChannelsList = async (page: number = 1, resetList: boolean = false) => {
    setIsFetchingPlusIptv(true);
    setPlusIptvLoadingError('');
    try {
      const limit = 45;
      const offset = (page - 1) * limit;
      let url = `/api/iptv/plus-channels?limit=${limit}&offset=${offset}`;
      
      if (onlyWorkingPlus) url += `&onlyWorking=true`;
      if (selectedPlusIptvCategory) url += `&category=${encodeURIComponent(selectedPlusIptvCategory)}`;
      if (plusIptvSearchQuery) url += `&search=${encodeURIComponent(plusIptvSearchQuery)}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('Falha ao sintonizar servidores +IPTV.');
      const data = await res.json();
      
      if (resetList || page === 1) {
        setPlusIptvChannels(data.channels || []);
      } else {
        setPlusIptvChannels(prev => {
          const existingIds = new Set(prev.map(ch => ch.id));
          const filteredNew = (data.channels || []).filter((ch: LiveChannel) => !existingIds.has(ch.id));
          return [...prev, ...filteredNew];
        });
      }
      
      setPlusIptvTotal(data.total || 0);
      if (data.categories && data.categories.length > 0) setPlusIptvCategories(data.categories);
      if (data.stats) {
        setPlusIptvStats(data.stats);
      }

      if (data.channels && data.channels.length > 0 && resetList) {
        setActiveChannel(data.channels[0]);
      }
    } catch (err: any) {
      console.error('Error fetching +IPTV:', err);
      setPlusIptvLoadingError(err.message || 'Erro ao carregar canais +IPTV.');
    } finally {
      setIsFetchingPlusIptv(false);
    }
  };

  // Manual tester trigger
  const testChannelManually = async (channelId: string, isPlus: boolean) => {
    setTestingChannelsIds(prev => ({ ...prev, [channelId]: true }));
    try {
      const res = await fetch('/api/iptv/test-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId, isPlus })
      });
      if (res.ok) {
        const data = await res.json();
        const updateStatusInList = (list: LiveChannel[]) => 
          list.map(ch => ch.id === channelId ? { ...ch, status: data.status } : ch);
        
        if (isPlus) {
          setPlusIptvChannels(updateStatusInList);
        } else {
          setIptvChannels(updateStatusInList);
        }
        
        setActiveChannel(prev => prev && prev.id === channelId ? { ...prev, status: data.status } : prev);
      }
    } catch (e) {
      console.error('Error testing channel manually:', e);
    } finally {
      setTestingChannelsIds(prev => ({ ...prev, [channelId]: false }));
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
  }, [selectedIptvCountry, selectedIptvCategory, activeTab, onlyWorkingDefault]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'tv' && iptvSearchQuery) {
        fetchIptvChannelsList(1, true);
        setIptvPage(1);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [iptvSearchQuery]);

  useEffect(() => {
    if (activeTab === 'plus_iptv') {
      fetchPlusIptvChannelsList(1, true);
      setPlusIptvPage(1);
    }
  }, [selectedPlusIptvCategory, activeTab, onlyWorkingPlus]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'plus_iptv' && plusIptvSearchQuery) {
        fetchPlusIptvChannelsList(1, true);
        setPlusIptvPage(1);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [plusIptvSearchQuery]);

  // Live fetch testing stats periodically
  useEffect(() => {
    if (activeTab !== 'tv' && activeTab !== 'plus_iptv') return;
    
    // Fetch stats immediately on mount
    fetch('/api/iptv/test-stats')
      .then(res => res.ok && res.json())
      .then(data => {
        if (data) {
          if (data.defaultList) setDefaultIptvStats(data.defaultList);
          if (data.plusList) setPlusIptvStats(data.plusList);
        }
      })
      .catch(e => console.error(e));

    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/iptv/test-stats');
        if (res.ok) {
          const data = await res.json();
          if (data.defaultList) setDefaultIptvStats(data.defaultList);
          if (data.plusList) setPlusIptvStats(data.plusList);
        }
      } catch (e) {
        console.error('Error fetching IPTV tester stats:', e);
      }
    }, 6000);
    
    return () => clearInterval(interval);
  }, [activeTab]);

  // ==================== D-PAD CONTROLLER ACTION ROUTER ====================
  const triggerRemoteAction = (action: string) => {
    setLastRemoteAction(action);
    setTimeout(() => setLastRemoteAction(''), 300);

    if (focusedSection === 'sidebar') {
      const tabs: ('warez' | 'tv' | 'plus_iptv' | 'watchlist')[] = ['warez', 'tv', 'plus_iptv', 'watchlist'];
      const currentIndex = tabs.indexOf(activeTab as any);

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
        if (activeTab === 'tv' || activeTab === 'plus_iptv' || focusedIndex % 5 === 0 || focusedIndex === 0) {
          setFocusedSection('sidebar');
        } else {
          setFocusedIndex(prev => Math.max(0, prev - 1));
        }
      } 
      else if (action === 'RIGHT') {
        const maxLimit = activeTab === 'warez' 
          ? warezResults.length 
          : activeTab === 'tv' 
            ? iptvChannels.length 
            : activeTab === 'plus_iptv'
              ? plusIptvChannels.length
              : watchlist.length;
        setFocusedIndex(prev => Math.min(maxLimit - 1, prev + 1));
      } 
      else if (action === 'UP') {
        if (activeTab === 'tv' || activeTab === 'plus_iptv') {
          setFocusedIndex(prev => Math.max(0, prev - 1));
        } else {
          setFocusedIndex(prev => Math.max(0, prev - 5));
        }
      } 
      else if (action === 'DOWN') {
        const maxLimit = activeTab === 'warez' 
          ? warezResults.length 
          : activeTab === 'tv' 
            ? iptvChannels.length 
            : activeTab === 'plus_iptv'
              ? plusIptvChannels.length
              : watchlist.length;
        if (activeTab === 'tv' || activeTab === 'plus_iptv') {
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
        } else if (activeTab === 'plus_iptv' && plusIptvChannels[focusedIndex]) {
          setActiveChannel(plusIptvChannels[focusedIndex]);
        } else if (activeTab === 'watchlist' && watchlist[focusedIndex]) {
          const item = watchlist[focusedIndex];
          if (item.type === 'tv') {
            watchlistSelectionRef.current = item.id;
            setSelectedIptvCountry(item.country || 'BR');
            setSelectedIptvCategory('');
            setIptvSearchQuery('');
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

  // Filter warez results based on selected tab category (Mega Filmes Style)
  const filteredWarezResults = warezResults.filter(item => {
    if (selectedTypeFilter === 'all') return true;
    if (selectedTypeFilter === 'movie') return item.type === 'movie';
    if (selectedTypeFilter === 'series') return item.type === 'series';
    if (selectedTypeFilter === 'kids') {
      return item.genres && (item.genres.includes('Animação') || item.genres.includes('Família') || item.genres.includes('Kids'));
    }
    if (selectedTypeFilter === 'lançamentos') {
      const yearStr = String(item.year || '');
      const yearNum = parseInt(yearStr, 10);
      return yearStr !== '' && ((!isNaN(yearNum) && yearNum >= 2023) || yearStr.includes('2024') || yearStr.includes('2025') || yearStr.includes('2026'));
    }
    if (selectedTypeFilter === 'acao') {
      return item.genres && (item.genres.includes('Ação') || item.genres.includes('Aventura'));
    }
    if (selectedTypeFilter === 'comedia') {
      return item.genres && item.genres.includes('Comédia');
    }
    if (selectedTypeFilter === 'terror') {
      return item.genres && (item.genres.includes('Terror') || item.genres.includes('Suspense') || item.genres.includes('Mistério') || item.genres.includes('Crime'));
    }
    if (selectedTypeFilter === 'drama') {
      return item.genres && item.genres.includes('Drama');
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex flex-col relative overflow-x-hidden selection:bg-amber-500 selection:text-black">
      
      {/* Background Cinematic Atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.04),transparent_55%)] pointer-events-none z-0" />

      {/* ================= TOP HEADER BAR (Mega Filmes HD Style) ================= */}
      <header className={`w-full bg-zinc-900/95 border-b border-zinc-800/80 shrink-0 z-30 sticky top-0 backdrop-blur-md px-4 py-3 sm:py-4 transition-all ${focusedSection === 'sidebar' ? 'ring-2 ring-amber-500/30' : ''}`}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Main Logo */}
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Play className="text-black ml-0.5 fill-black" size={16} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-wider text-white uppercase font-sans">
                MEGA FILMES <span className="text-amber-500">HD</span>
              </h1>
              <p className="text-[8px] text-zinc-500 font-mono tracking-widest uppercase font-black">OTIMIZADO PARA SMARTPHONE E TV</p>
            </div>
          </div>

          {/* Navigation Options - Horizontal, simple, and extremely compact */}
          <nav className="flex items-center gap-1.5 sm:gap-3">
            {[
              { id: 'warez', label: 'Filmes & Séries', icon: Search },
              { id: 'tv', label: 'Canais de TV', icon: Tv },
              { id: 'plus_iptv', label: '+IPTV', icon: Plus },
              { id: 'watchlist', label: 'Minha Lista', icon: Heart }
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
                  className={`px-3.5 py-2 rounded-xl flex items-center space-x-2 transition duration-150 text-left cursor-pointer group ${
                    isSelected 
                      ? 'bg-amber-500 text-black font-extrabold shadow-md shadow-amber-500/15' 
                      : 'text-zinc-400 hover:text-white bg-zinc-950/40 border border-zinc-850 hover:bg-zinc-900'
                  } ${isFocused ? 'ring-4 ring-amber-400 scale-102 border-amber-500' : ''}`}
                >
                  <Icon size={14} className={isSelected ? 'text-black' : 'text-zinc-400 group-hover:text-white'} />
                  <span className="text-xs font-bold uppercase tracking-wide leading-tight">{menu.label}</span>
                </button>
              );
            })}
          </nav>

        </div>
      </header>

      {/* ================= MAIN CONTAINER VIEWPORT ================= */}
      <main className="flex-grow p-4 md:p-8 max-w-7xl mx-auto w-full z-10 overflow-y-auto relative">
        
        {/* ================= 1. CINEMA WAREZ (CATALOG SEARCH & STREAM) ================= */}
        {activeTab === 'warez' && (
          <section id="warez-section" className="space-y-6 pt-2">
            
            {/* Simple Clean Search Input Bar */}
            <form onSubmit={(e) => handleSearchWarez(undefined, e)} className="flex gap-3 max-w-xl">
              <div className="relative flex-grow">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input
                  type="text"
                  placeholder="Ex: Interestelar, Matrix, Breaking Bad, Batman..."
                  value={warezQuery}
                  onChange={(e) => setWarezQuery(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-850 text-xs text-white rounded-xl pl-12 pr-4 py-3.5 focus:outline-none focus:border-amber-500 focus:bg-zinc-900 transition font-medium animate-fade-in"
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

            {/* YouCine Spotlight Hero Banner */}
            {!isSearchingWarez && warezResults.length > 0 && (
              <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl border border-zinc-900/60 bg-zinc-950 aspect-[21/9] min-h-[220px] md:min-h-[340px] flex items-end">
                {/* Background Image with Cinematic Black Gradient Overlay */}
                <div className="absolute inset-0 z-0">
                  <img 
                    src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200" 
                    alt="Spotlight" 
                    className="w-full h-full object-cover object-center opacity-40 scale-100 transition-all duration-700 hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-transparent z-10" />
                  <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/50 to-transparent z-10" />
                </div>

                {/* Content Overlay */}
                <div className="relative z-20 p-6 md:p-10 max-w-2xl space-y-3.5">
                  <div className="flex items-center space-x-2.5">
                    <span className="text-[9px] font-black uppercase tracking-wider bg-amber-500 text-black px-2.5 py-1 rounded-md">
                      DESTAQUE MegaCine
                    </span>
                    <span className="text-xs text-amber-400 font-extrabold flex items-center">
                      <Star className="fill-amber-400 text-amber-400 mr-1" size={12} />
                      8.7 <span className="text-zinc-500 font-normal ml-1">IMDb</span>
                    </span>
                  </div>
                  <h3 className="text-3xl md:text-5xl font-black text-white tracking-tight uppercase leading-none font-sans">
                    INTERESTELAR
                  </h3>
                  <p className="text-xs text-zinc-300 leading-relaxed max-w-lg hidden sm:block">
                    As reservas naturais da Terra estão se esgotando e um grupo de astronautas recebe a missão de verificar possíveis planetas para receberem a população mundial através de um buraco de minhoca.
                  </p>
                  <div className="flex items-center gap-3 pt-1">
                    <button 
                      onClick={() => {
                        const item = warezResults.find(w => w.tmdbId === '157336') || warezResults[0];
                        if (item) {
                          setSelectedWarezContent(item);
                          setSelectedWarezSeason(1);
                          setSelectedWarezEpisode(1);
                          setActiveWarezPlayer(null);
                        }
                      }}
                      className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs px-6 py-3.5 rounded-xl transition flex items-center space-x-2 shadow-lg shadow-amber-500/10 cursor-pointer"
                    >
                      <Play className="fill-black text-black" size={14} />
                      <span>Assistir Agora</span>
                    </button>
                    <button 
                      onClick={() => {
                        const item = warezResults.find(w => w.tmdbId === '157336') || warezResults[0];
                        if (item) toggleWatchlist(item);
                      }}
                      className="bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-white font-bold text-xs px-5 py-3.5 rounded-xl transition flex items-center space-x-2 backdrop-blur-md cursor-pointer"
                    >
                      <Heart className={isFavorited('warez_157336') ? "text-red-500 fill-red-500" : "text-amber-500 fill-amber-500"} size={14} />
                      <span>{isFavorited('warez_157336') ? 'Remover da Lista' : 'Salvar na Lista'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

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
              <div className="space-y-6">
                
                {/* Mega Filmes navigation category bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-3">
                  <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none py-1">
                    {[
                      { id: 'all', label: 'INÍCIO' },
                      { id: 'movie', label: 'FILMES' },
                      { id: 'series', label: 'SÉRIES' },
                      { id: 'lançamentos', label: '🚀 LANÇAMENTOS' },
                      { id: 'acao', label: 'AÇÃO / AVENTURA' },
                      { id: 'comedia', label: 'COMÉDIA' },
                      { id: 'kids', label: 'KIDS / FAMÍLIA' },
                      { id: 'terror', label: 'TERROR / CRIME' },
                      { id: 'drama', label: 'DRAMA' }
                    ].map((tab) => {
                      const isActive = selectedTypeFilter === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setSelectedTypeFilter(tab.id as any)}
                          className={`px-4 py-2 text-xs font-black tracking-wider rounded-full transition whitespace-nowrap cursor-pointer ${
                            isActive 
                              ? 'bg-amber-500 text-black shadow-md shadow-amber-500/10 font-black' 
                              : 'text-zinc-400 hover:text-white bg-zinc-900/30 border border-zinc-900 hover:border-zinc-850'
                          }`}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">
                    Exibindo {filteredWarezResults.length} de {warezResults.length} títulos
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                  {filteredWarezResults.map((item, index) => {
                    const isItemFocused = focusedSection === 'grid' && focusedIndex === index;
                    return (
                      <div
                        key={`${item.id}-${index}`}
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

            {/* Auto Tester Live Progress Banner */}
            {defaultIptvStats.total > 0 && (
              <div className="bg-gradient-to-r from-emerald-950/20 to-zinc-950 border border-emerald-900/30 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[10px] font-black text-emerald-400 tracking-wider font-mono uppercase">Varredura e Teste Automático IPTV</span>
                  </div>
                  <h3 className="text-sm font-bold text-white">Monitor de Saúde dos Canais</h3>
                  <p className="text-xs text-zinc-400">Verificando canais em segundo plano para isolar links quebrados.</p>
                </div>
                <div className="flex items-center gap-4 sm:gap-6">
                  <div className="text-center">
                    <div className="text-lg font-black text-white">{defaultIptvStats.total}</div>
                    <div className="text-[9px] text-zinc-500 font-bold uppercase font-mono">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-black text-emerald-400">
                      {defaultIptvStats.working}
                    </div>
                    <div className="text-[9px] text-emerald-500/70 font-bold uppercase font-mono">Funcionando</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-black text-red-400">
                      {defaultIptvStats.broken}
                    </div>
                    <div className="text-[9px] text-red-400/70 font-bold uppercase font-mono">Offline</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-black text-zinc-500">
                      {defaultIptvStats.untested}
                    </div>
                    <div className="text-[9px] text-zinc-500 font-bold uppercase font-mono">Aguardando</div>
                  </div>
                </div>
              </div>
            )}

            {/* IPTV Filter bar */}
            <div className="bg-zinc-900/40 border border-zinc-900 p-4 rounded-2xl space-y-3">
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                  <input
                    type="text"
                    placeholder="SBT, Record, Cultura, CNN, Jovem Pan..."
                    value={iptvSearchQuery}
                    onChange={(e) => setIptvSearchQuery(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
                
                {/* Premium Country Tab Pills */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 w-full">
                  <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {[
                      { id: 'BR', label: '🇧🇷 BRASIL' },
                      { id: 'US', label: '🇺🇸 ESTADOS UNIDOS' },
                      { id: 'AR', label: '🇦🇷 ARGENTINA' },
                      { id: 'MX', label: '🇲🇽 MÉXICO' },
                      { id: 'OUTROS', label: '📺 OUTROS' },
                      { id: '', label: '🌎 TODOS' }
                    ].map((tab) => {
                      const isActive = selectedIptvCountry === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            setSelectedIptvCountry(tab.id);
                            setIptvPage(1);
                          }}
                          className={`px-4 py-2 text-xs font-black tracking-wider rounded-full transition whitespace-nowrap cursor-pointer ${
                            isActive 
                              ? 'bg-amber-500 text-black shadow-md shadow-amber-500/15 font-black' 
                              : 'text-zinc-400 hover:text-white bg-zinc-900/40 border border-zinc-900 hover:border-zinc-850'
                          }`}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Toggle to show only working channels */}
                    <button
                      type="button"
                      onClick={() => {
                        setOnlyWorkingDefault(!onlyWorkingDefault);
                        setIptvPage(1);
                      }}
                      className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 border cursor-pointer ${
                        onlyWorkingDefault 
                          ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 font-extrabold' 
                          : 'bg-zinc-950 border-zinc-850 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Check size={12} className={onlyWorkingDefault ? 'opacity-100 text-emerald-400' : 'opacity-40'} />
                      <span>Online ({defaultIptvStats.working})</span>
                    </button>

                    <select
                      value={selectedIptvCategory}
                      onChange={(e) => {
                        setSelectedIptvCategory(e.target.value);
                        setIptvPage(1);
                      }}
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
                  <div className="bg-zinc-900/40 border border-zinc-900 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="text-2xl mt-1">📺</div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-zinc-500 font-mono uppercase">EPG TRANSMISSÃO</span>
                          {/* Channel Status Badge */}
                          {activeChannel.status === 'working' && (
                            <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">ONLINE</span>
                          )}
                          {activeChannel.status === 'broken' && (
                            <span className="text-[8px] font-black text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded-full border border-red-500/20">OFFLINE</span>
                          )}
                          {(!activeChannel.status || activeChannel.status === 'unknown') && (
                            <span className="text-[8px] font-black text-zinc-400 bg-zinc-500/10 px-2.5 py-0.5 rounded-full border border-zinc-500/20 font-mono">AGUARDANDO TESTE</span>
                          )}
                        </div>
                        <h3 className="text-sm font-bold text-white mt-0.5 truncate">{activeChannel.name}</h3>
                        <p className="text-xs text-zinc-300 mt-1">{activeChannel.nowPlaying || 'Programação de TV ao Vivo'}</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">Próximo: {activeChannel.nextShow}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        onClick={() => testChannelManually(activeChannel.id, false)}
                        disabled={testingChannelsIds[activeChannel.id]}
                        className="px-3.5 py-2.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-300 hover:text-white transition flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
                        title="Testar sinal agora"
                      >
                        <RefreshCcw size={12} className={testingChannelsIds[activeChannel.id] ? 'animate-spin text-amber-500' : ''} />
                        <span>{testingChannelsIds[activeChannel.id] ? 'Testando...' : 'Testar Canal'}</span>
                      </button>

                      <button
                        onClick={() => toggleWatchlist({ ...activeChannel, type: 'tv' })}
                        className={`p-2.5 rounded-xl border transition cursor-pointer ${
                          isFavorited(activeChannel.id)
                            ? 'bg-amber-500/15 border-amber-500 text-amber-500'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        <Heart size={16} className={isFavorited(activeChannel.id) ? 'fill-amber-500 text-amber-500' : ''} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Channels Side list */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest font-mono">Canais Sintonizados ({iptvTotal})</h3>
                  {isFetchingIptv && (
                    <span className="text-[10px] text-amber-500 animate-pulse font-bold">Carregando...</span>
                  )}
                </div>
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
                  {iptvChannels.map((ch, index) => {
                    const isSelected = activeChannel && activeChannel.id === ch.id;
                    const isChFocused = focusedSection === 'grid' && focusedIndex === index;
                    return (
                      <div
                        key={`${ch.id}-${index}`}
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
                            <div className="flex items-center gap-1.5 min-w-0">
                              <h4 className="text-xs font-bold text-white truncate leading-tight group-hover:text-amber-400 transition">{ch.name}</h4>
                              {ch.status === 'working' && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="Funcionando" />
                              )}
                              {ch.status === 'broken' && (
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" title="Offline" />
                              )}
                              {(!ch.status || ch.status === 'unknown') && (
                                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 shrink-0" title="Pendente" />
                              )}
                            </div>
                            <p className="text-[10px] text-zinc-500 truncate mt-0.5">{ch.category} • {ch.nowPlaying}</p>
                          </div>
                        </div>
                        <ChevronRight size={14} className={isSelected ? 'text-amber-500' : 'text-zinc-600'} />
                      </div>
                    );
                  })}

                  {iptvChannels.length === 0 && !isFetchingIptv && (
                    <div className="text-center py-10 text-zinc-500 text-xs font-mono">
                      Nenhum canal ativo com os filtros selecionados.
                    </div>
                  )}

                  {iptvChannels.length < iptvTotal && !isFetchingIptv && (
                    <button
                      onClick={() => {
                        const nextPage = iptvPage + 1;
                        setIptvPage(nextPage);
                        fetchIptvChannelsList(nextPage, false);
                      }}
                      className="w-full py-2 bg-zinc-900 hover:bg-zinc-850 text-xs font-bold text-zinc-300 hover:text-white border border-zinc-850 rounded-xl transition cursor-pointer text-center"
                    >
                      Carregar Mais Canais
                    </button>
                  )}
                </div>
              </div>

            </div>
          </section>
        )}

        {/* ================= +IPTV TAB SECTION ================= */}
        {activeTab === 'plus_iptv' && (
          <section id="plus-iptv-section" className="space-y-6 animate-fade-in">
            
            {/* Header */}
            <div className="border-b border-zinc-900 pb-5">
              <span className="text-[10px] bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full border border-amber-500/20 uppercase font-black tracking-widest font-mono">+IPTV CANAIS FULL</span>
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mt-1">Playlist +IPTV Completa</h2>
              <p className="text-xs text-zinc-400">Transmissões premium sintonizadas a partir de repositórios dinâmicos do Brasil.</p>
            </div>

            {/* Auto Tester Live Progress Banner */}
            {plusIptvStats.total > 0 && (
              <div className="bg-gradient-to-r from-emerald-950/20 to-zinc-950 border border-emerald-900/30 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[10px] font-black text-emerald-400 tracking-wider font-mono uppercase">Verificação de Link Ativa (+IPTV)</span>
                  </div>
                  <h3 className="text-sm font-bold text-white">Monitor de Saúde +IPTV</h3>
                  <p className="text-xs text-zinc-400">O sistema monitora e isola automaticamente apenas as streams funcionais.</p>
                </div>
                <div className="flex items-center gap-4 sm:gap-6">
                  <div className="text-center">
                    <div className="text-lg font-black text-white">{plusIptvStats.total}</div>
                    <div className="text-[9px] text-zinc-500 font-bold uppercase font-mono">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-black text-emerald-400">
                      {plusIptvStats.working}
                    </div>
                    <div className="text-[9px] text-emerald-500/70 font-bold uppercase font-mono">Funcionando</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-black text-red-400">
                      {plusIptvStats.broken}
                    </div>
                    <div className="text-[9px] text-red-400/70 font-bold uppercase font-mono">Offline</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-black text-zinc-500">
                      {plusIptvStats.untested}
                    </div>
                    <div className="text-[9px] text-zinc-500 font-bold uppercase font-mono">Aguardando</div>
                  </div>
                </div>
              </div>
            )}

            {/* Filter Bar */}
            <div className="bg-zinc-900/40 border border-zinc-900 p-4 rounded-2xl space-y-3">
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                <div className="relative flex-grow w-full">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                  <input
                    type="text"
                    placeholder="Buscar canais por nome em +IPTV..."
                    value={plusIptvSearchQuery}
                    onChange={(e) => setPlusIptvSearchQuery(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto justify-end">
                  {/* Toggle to show only working channels */}
                  <button
                    type="button"
                    onClick={() => {
                      setOnlyWorkingPlus(!onlyWorkingPlus);
                      setPlusIptvPage(1);
                    }}
                    className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 border cursor-pointer ${
                      onlyWorkingPlus 
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 font-extrabold' 
                        : 'bg-zinc-950 border-zinc-850 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Check size={12} className={onlyWorkingPlus ? 'opacity-100 text-emerald-400' : 'opacity-40'} />
                    <span>Apenas Online ({plusIptvStats.working})</span>
                  </button>

                  <select
                    value={selectedPlusIptvCategory}
                    onChange={(e) => {
                      setSelectedPlusIptvCategory(e.target.value);
                      setPlusIptvPage(1);
                    }}
                    className="bg-zinc-950 border border-zinc-850 text-xs font-bold text-white rounded-xl px-3 py-2.5 focus:outline-none cursor-pointer"
                  >
                    <option value="">Todas Categorias</option>
                    {plusIptvCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Main +IPTV Layout Panel */}
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
                  <div className="bg-zinc-900/40 border border-zinc-900 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="text-2xl mt-1">📺</div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-zinc-500 font-mono uppercase">EPG TRANSMISSÃO</span>
                          {/* Channel Status Badge */}
                          {activeChannel.status === 'working' && (
                            <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">ONLINE</span>
                          )}
                          {activeChannel.status === 'broken' && (
                            <span className="text-[8px] font-black text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded-full border border-red-500/20">OFFLINE</span>
                          )}
                          {(!activeChannel.status || activeChannel.status === 'unknown') && (
                            <span className="text-[8px] font-black text-zinc-400 bg-zinc-500/10 px-2.5 py-0.5 rounded-full border border-zinc-500/20 font-mono">AGUARDANDO TESTE</span>
                          )}
                        </div>
                        <h3 className="text-sm font-bold text-white mt-0.5 truncate">{activeChannel.name}</h3>
                        <p className="text-xs text-zinc-300 mt-1">{activeChannel.nowPlaying || 'Programação de TV ao Vivo'}</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">Próximo: {activeChannel.nextShow}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        onClick={() => testChannelManually(activeChannel.id, true)}
                        disabled={testingChannelsIds[activeChannel.id]}
                        className="px-3.5 py-2.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-300 hover:text-white transition flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
                        title="Testar sinal agora"
                      >
                        <RefreshCcw size={12} className={testingChannelsIds[activeChannel.id] ? 'animate-spin text-amber-500' : ''} />
                        <span>{testingChannelsIds[activeChannel.id] ? 'Testando...' : 'Testar Canal'}</span>
                      </button>

                      <button
                        onClick={() => toggleWatchlist({ ...activeChannel, type: 'tv' })}
                        className={`p-2.5 rounded-xl border transition cursor-pointer ${
                          isFavorited(activeChannel.id)
                            ? 'bg-amber-500/15 border-amber-500 text-amber-500'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        <Heart size={16} className={isFavorited(activeChannel.id) ? 'fill-amber-500 text-amber-500' : ''} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Channels Side list */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest font-mono">Canais +IPTV ({plusIptvTotal})</h3>
                  {isFetchingPlusIptv && (
                    <span className="text-[10px] text-amber-500 animate-pulse font-bold">Carregando...</span>
                  )}
                </div>
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
                  {plusIptvChannels.map((ch, index) => {
                    const isSelected = activeChannel && activeChannel.id === ch.id;
                    const isChFocused = focusedSection === 'grid' && focusedIndex === index;
                    return (
                      <div
                        key={`${ch.id}-${index}`}
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
                            <div className="flex items-center gap-1.5 min-w-0">
                              <h4 className="text-xs font-bold text-white truncate leading-tight group-hover:text-amber-400 transition">{ch.name}</h4>
                              {ch.status === 'working' && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="Funcionando" />
                              )}
                              {ch.status === 'broken' && (
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" title="Offline" />
                              )}
                              {(!ch.status || ch.status === 'unknown') && (
                                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 shrink-0" title="Pendente" />
                              )}
                            </div>
                            <p className="text-[10px] text-zinc-500 truncate mt-0.5">{ch.category}</p>
                          </div>
                        </div>
                        <ChevronRight size={14} className={isSelected ? 'text-amber-500' : 'text-zinc-600'} />
                      </div>
                    );
                  })}

                  {plusIptvChannels.length === 0 && !isFetchingPlusIptv && (
                    <div className="text-center py-10 text-zinc-500 text-xs font-mono">
                      Nenhum canal ativo com os filtros selecionados.
                    </div>
                  )}

                  {plusIptvChannels.length < plusIptvTotal && !isFetchingPlusIptv && (
                    <button
                      onClick={() => {
                        const nextPage = plusIptvPage + 1;
                        setPlusIptvPage(nextPage);
                        fetchPlusIptvChannelsList(nextPage, false);
                      }}
                      className="w-full py-2 bg-zinc-900 hover:bg-zinc-850 text-xs font-bold text-zinc-300 hover:text-white border border-zinc-850 rounded-xl transition cursor-pointer text-center"
                    >
                      Carregar Mais Canais
                    </button>
                  )}
                </div>
              </div>

            </div>
          </section>
        )}

        {/* ================= 3. WATCHLIST (FAVORITES GRID) ================= */}
        {activeTab === 'watchlist' && (
          <section id="watchlist-section" className="space-y-6">
            
            {/* ================= CONTINUE ASSISTINDO SECTION ================= */}
            {continueWatching.length > 0 && (
              <div className="space-y-4 pb-6 border-b border-zinc-900 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                    </span>
                    <h3 className="text-xs font-black text-white uppercase tracking-widest font-mono">Continue Assistindo</h3>
                  </div>
                  <button
                    onClick={() => {
                      setContinueWatching([]);
                      localStorage.removeItem('warez_continue_watching');
                    }}
                    className="text-[9px] text-zinc-500 hover:text-red-400 font-bold transition flex items-center space-x-1 uppercase tracking-widest font-mono cursor-pointer"
                  >
                    <span>Limpar Histórico</span>
                  </button>
                </div>

                <div className="flex items-center space-x-4 overflow-x-auto scrollbar-none py-2 select-none">
                  {continueWatching.map((item, idx) => {
                    return (
                      <div
                        key={`cw-${item.id || item.tmdbId || idx}`}
                        onClick={() => {
                          if (item.type === 'tv') {
                            watchlistSelectionRef.current = item.id;
                            setSelectedIptvCountry(item.country || 'BR');
                            setSelectedIptvCategory('');
                            setIptvSearchQuery('');
                            setActiveChannel(item);
                            setActiveTab('tv');
                          } else {
                            const fullContent = warezResults.find(r => r.tmdbId === item.tmdbId) || {
                              id: item.tmdbId,
                              tmdbId: item.tmdbId,
                              imdbId: item.imdbId,
                              title: item.parentTitle || item.title,
                              type: item.type === 'series' ? 'series' : 'movie',
                              posterUrl: item.posterUrl,
                              year: item.year,
                              rating: item.rating
                            };
                            setSelectedWarezContent(fullContent);
                            setSelectedWarezSeason(item.season || 1);
                            setSelectedWarezEpisode(item.episode || 1);
                            setActiveWarezPlayer({
                              tmdbId: item.tmdbId,
                              imdbId: item.imdbId,
                              title: item.title,
                              type: item.type,
                              season: item.season,
                              episode: item.episode
                            });
                          }
                        }}
                        className="group flex-shrink-0 w-36 sm:w-40 bg-zinc-900/40 hover:bg-zinc-900/90 border border-zinc-850 hover:border-amber-500/50 rounded-xl overflow-hidden cursor-pointer shadow-lg transition-all duration-300 transform hover:-translate-y-1"
                      >
                        <div className="aspect-[16/10] w-full relative bg-zinc-950 overflow-hidden">
                          {item.type === 'tv' ? (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-950 text-amber-500 p-2 text-center">
                              <Tv size={24} className="animate-pulse" />
                              <span className="text-[9px] font-mono font-bold mt-1 uppercase text-zinc-400">TV Ao Vivo</span>
                            </div>
                          ) : (
                            <img
                              src={item.posterUrl}
                              alt={item.title}
                              className="w-full h-full object-cover object-center group-hover:scale-105 transition duration-500"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          
                          {/* Play overlay hover indicator */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition duration-200 flex items-center justify-center">
                            <Play size={18} className="text-amber-500 fill-amber-500" />
                          </div>
                        </div>

                        <div className="p-2.5 space-y-1">
                          <p className="font-bold text-[10px] text-white truncate group-hover:text-amber-400 transition">
                            {item.name || item.title}
                          </p>
                          <div className="flex items-center justify-between text-[8px] text-zinc-500 uppercase tracking-wider font-mono">
                            <span>{item.type === 'tv' ? '📺 TV' : item.type === 'series' ? `🍿 T${item.season} E${item.episode}` : '🎬 FILME'}</span>
                            {item.rating && <span className="text-amber-500 font-bold">★ {item.rating}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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
                      key={`${item.id}-${index}`}
                      onClick={() => {
                        if (item.type === 'tv') {
                          watchlistSelectionRef.current = item.id;
                          setSelectedIptvCountry(item.country || 'BR');
                          setSelectedIptvCategory('');
                          setIptvSearchQuery('');
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
            <div className="relative h-24 sm:h-32 md:h-36 w-full shrink-0 bg-zinc-900">
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
                className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-gray-300 hover:text-white border border-white/5 cursor-pointer z-50"
              >
                ✕
              </button>

              <div className="absolute bottom-3 left-6 flex items-end space-x-2">
                <span className="bg-amber-500 text-black text-[9px] font-extrabold tracking-widest px-2 py-0.5 rounded uppercase">
                  {selectedWarezContent.type === 'movie' ? 'FILME' : 'SÉRIE'}
                </span>
                <span className="bg-zinc-900 border border-zinc-800 text-gray-300 text-[9px] font-bold px-2 py-0.5 rounded font-mono">
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
                      ? `https://superembed.cc/embed/movie/${tmdbId}`
                      : `https://superembed.cc/embed/tv/${tmdbId}/${s}/${e}`;
                    break;
                  case 'servidor_2':
                    embedUrl = type === 'movie'
                      ? `https://embedder.net/e/movie/${tmdbId}`
                      : `https://embedder.net/e/tv/${tmdbId}/${s}/${e}`;
                    break;
                  case 'servidor_3':
                    embedUrl = type === 'movie'
                      ? `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`
                      : `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${s}&e=${e}`;
                    break;
                  case 'servidor_4':
                    embedUrl = type === 'movie'
                      ? `https://vidsrc.xyz/embed/movie/${tmdbId}`
                      : `https://vidsrc.xyz/embed/tv/${tmdbId}/${s}/${e}`;
                    break;
                  case 'servidor_5':
                    embedUrl = type === 'movie'
                      ? `https://vidsrc.to/embed/movie/${tmdbId}`
                      : `https://vidsrc.to/embed/tv/${tmdbId}/${s}/${e}`;
                    break;
                  case 'servidor_6':
                    embedUrl = type === 'movie'
                      ? `https://player.videasy.to/movie/${tmdbId}`
                      : `https://player.videasy.to/tv/${tmdbId}/${s}/${e}`;
                    break;
                  case 'servidor_7':
                    embedUrl = type === 'movie'
                      ? `https://${warezDomain}/movie/${tmdbId}`
                      : `https://${warezDomain}/serie/${tmdbId}/${s}/${e}`;
                    break;
                  case 'servidor_8':
                    embedUrl = type === 'movie'
                      ? `https://${superflixDomain}/api/filme/${tmdbId}`
                      : `https://${superflixDomain}/api/serie/${tmdbId}/${s}/${e}`;
                    break;
                  default:
                    embedUrl = type === 'movie'
                      ? `https://player.videasy.to/movie/${tmdbId}`
                      : `https://player.videasy.to/tv/${tmdbId}/${s}/${e}`;
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
                      />
                    </div>

                    {/* Servers Sources Row */}
                    <div className="p-4 bg-zinc-900/40 rounded-xl border border-zinc-850 space-y-3">
                      <p className="text-[10px] font-mono text-zinc-400 uppercase font-black">SERVIDOR ATIVO:</p>
                      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                        <button
                          onClick={() => setEmbedSource('servidor_6')}
                          className={`px-3 py-2 rounded-lg border text-[11px] font-bold transition text-left sm:text-center ${
                            embedSource === 'servidor_6' ? 'bg-amber-500 text-black border-amber-500' : 'bg-zinc-950 text-zinc-400 border-zinc-850 hover:bg-zinc-900'
                          }`}
                        >
                          🇧🇷 Videasy (Destaque)
                        </button>
                        <button
                          onClick={() => setEmbedSource('servidor_7')}
                          className={`px-3 py-2 rounded-lg border text-[11px] font-bold transition text-left sm:text-center ${
                            embedSource === 'servidor_7' ? 'bg-amber-500 text-black border-amber-500' : 'bg-zinc-950 text-zinc-400 border-zinc-850 hover:bg-zinc-900'
                          }`}
                        >
                          🇧🇷 Servidor Warez (Dublado)
                        </button>
                        <button
                          onClick={() => setEmbedSource('servidor_8')}
                          className={`px-3 py-2 rounded-lg border text-[11px] font-bold transition text-left sm:text-center ${
                            embedSource === 'servidor_8' ? 'bg-amber-500 text-black border-amber-500' : 'bg-zinc-950 text-zinc-400 border-zinc-850 hover:bg-zinc-900'
                          }`}
                        >
                          🇧🇷 Servidor SuperFlix (Dub)
                        </button>
                        <button
                          onClick={() => setEmbedSource('servidor_1')}
                          className={`px-3 py-2 rounded-lg border text-[11px] font-bold transition text-left sm:text-center ${
                            embedSource === 'servidor_1' ? 'bg-amber-500 text-black border-amber-500' : 'bg-zinc-950 text-zinc-400 border-zinc-850 hover:bg-zinc-900'
                          }`}
                        >
                          🇧🇷 Servidor 1 (Dublado)
                        </button>
                        <button
                          onClick={() => setEmbedSource('servidor_2')}
                          className={`px-3 py-2 rounded-lg border text-[11px] font-bold transition text-left sm:text-center ${
                            embedSource === 'servidor_2' ? 'bg-amber-500 text-black border-amber-500' : 'bg-zinc-950 text-zinc-400 border-zinc-850 hover:bg-zinc-900'
                          }`}
                        >
                          🇧🇷 Servidor 2 (Dublado Alt)
                        </button>
                        <button
                          onClick={() => setEmbedSource('servidor_3')}
                          className={`px-3 py-2 rounded-lg border text-[11px] font-bold transition text-left sm:text-center ${
                            embedSource === 'servidor_3' ? 'bg-amber-500 text-black border-amber-500' : 'bg-zinc-950 text-zinc-400 border-zinc-850 hover:bg-zinc-900'
                          }`}
                        >
                          🌐 Servidor 3 (Multi-Áudio)
                        </button>
                        <button
                          onClick={() => setEmbedSource('servidor_4')}
                          className={`px-3 py-2 rounded-lg border text-[11px] font-bold transition text-left sm:text-center ${
                            embedSource === 'servidor_4' ? 'bg-amber-500 text-black border-amber-500' : 'bg-zinc-950 text-zinc-400 border-zinc-850 hover:bg-zinc-900'
                          }`}
                        >
                          🇺🇸 Servidor 4 (Original)
                        </button>
                        <button
                          onClick={() => setEmbedSource('servidor_5')}
                          className={`px-3 py-2 rounded-lg border text-[11px] font-bold transition text-left sm:text-center ${
                            embedSource === 'servidor_5' ? 'bg-amber-500 text-black border-amber-500' : 'bg-zinc-950 text-zinc-400 border-zinc-850 hover:bg-zinc-900'
                          }`}
                        >
                          🇺🇸 Servidor 5 (VidSrc TO)
                        </button>
                      </div>

                      {/* Font / Domain Settings */}
                      {(embedSource === 'servidor_8' || embedSource === 'servidor_7') && (
                        <div className="mt-3 pt-3 border-t border-zinc-800/80 text-left">
                          {/* SuperFlix Domain configuration */}
                          {embedSource === 'servidor_8' && (
                            <div className="space-y-2 bg-zinc-950/50 p-3 rounded-lg border border-zinc-850">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                <span className="text-[10px] font-mono font-black text-amber-500 uppercase tracking-wider">
                                  🔧 Configuração SuperFlix API
                                </span>
                                <span className="text-[9px] font-medium text-zinc-500">
                                  Mude o domínio caso o player não carregue
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold text-zinc-400 block">Escolha uma extensão:</label>
                                  <select
                                    value={superflixDomain}
                                    onChange={(e) => setSuperflixDomain(e.target.value)}
                                    className="w-full bg-zinc-900 text-zinc-200 border border-zinc-800 text-[11px] px-2.5 py-2 rounded-lg font-medium focus:outline-none focus:border-amber-500 transition cursor-pointer"
                                  >
                                    <option value="superflixapi.lifestyle">superflixapi.lifestyle (Ativo / Recomendado)</option>
                                    <option value="superflixapi.org">superflixapi.org (Alternativo)</option>
                                    <option value="superflixapi.fun">superflixapi.fun (Estável)</option>
                                    <option value="superflixapi.cc">superflixapi.cc</option>
                                    <option value="superflixapi.dev">superflixapi.dev</option>
                                    <option value="superflixapi.net">superflixapi.net</option>
                                    <option value="superflixapi.top">superflixapi.top (Antigo / Fora do ar)</option>
                                  </select>
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold text-zinc-400 block">Ou digite o domínio manual:</label>
                                  <input
                                    type="text"
                                    value={superflixDomain}
                                    onChange={(e) => setSuperflixDomain(e.target.value)}
                                    placeholder="Ex: novo-dominio.com"
                                    className="w-full bg-zinc-900 text-zinc-200 border border-zinc-800 text-[11px] px-2.5 py-2 rounded-lg focus:outline-none focus:border-amber-500 font-mono transition"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Warez CDN Domain configuration */}
                          {embedSource === 'servidor_7' && (
                            <div className="space-y-2 bg-zinc-950/50 p-3 rounded-lg border border-zinc-850">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                <span className="text-[10px] font-mono font-black text-amber-500 uppercase tracking-wider">
                                  🔧 Configuração WarezCDN
                                </span>
                                <span className="text-[9px] font-medium text-zinc-500">
                                  Mude o domínio do espelho se travar
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold text-zinc-400 block">Escolha uma extensão:</label>
                                  <select
                                    value={warezDomain}
                                    onChange={(e) => setWarezDomain(e.target.value)}
                                    className="w-full bg-zinc-900 text-zinc-200 border border-zinc-800 text-[11px] px-2.5 py-2 rounded-lg font-medium focus:outline-none focus:border-amber-500 transition cursor-pointer"
                                  >
                                    <option value="embed.warezcdn.link">embed.warezcdn.link (Recomendado)</option>
                                    <option value="embed.warezcdn.lat">embed.warezcdn.lat</option>
                                    <option value="embed.warezcdn.net">embed.warezcdn.net</option>
                                    <option value="embed.warezcdn.com">embed.warezcdn.com</option>
                                  </select>
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold text-zinc-400 block">Ou digite o domínio manual:</label>
                                  <input
                                    type="text"
                                    value={warezDomain}
                                    onChange={(e) => setWarezDomain(e.target.value)}
                                    placeholder="Ex: embed.warezcdn.link"
                                    className="w-full bg-zinc-900 text-zinc-200 border border-zinc-800 text-[11px] px-2.5 py-2 rounded-lg focus:outline-none focus:border-amber-500 font-mono transition"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })() : (
                <div className="grid md:grid-cols-3 gap-6">
                  
                  {/* Left poster */}
                  <div className="hidden md:block shrink-0 aspect-[2/3] md:w-48 bg-zinc-900 rounded-xl overflow-hidden border border-zinc-850 shadow-xl self-start">
                    <img
                      src={selectedWarezContent.posterUrl}
                      alt={selectedWarezContent.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* Right metadata */}
                  <div className="md:col-span-2 space-y-4 flex flex-col justify-between">
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

                    {/* Movie vs Series Stream Selectors - PLACED AT THE TOP FOR IMMEDIATE ACCESSIBILITY ON TV SCALED LAYOUTS */}
                    {selectedWarezContent.type === 'movie' ? (
                      <div className="flex flex-col sm:flex-row gap-2.5">
                        <button
                          onClick={() => setActiveWarezPlayer({
                            tmdbId: selectedWarezContent.tmdbId,
                            imdbId: selectedWarezContent.imdbId,
                            title: selectedWarezContent.title,
                            type: 'movie'
                          })}
                          className="flex-grow bg-amber-500 hover:bg-amber-400 text-black font-black text-xs py-3 rounded-xl uppercase tracking-wider transition cursor-pointer text-center"
                        >
                          Reproduzir Filme em HD 
                        </button>
                        <button
                          onClick={() => toggleWatchlist(selectedWarezContent)}
                          className={`px-4 py-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                            isFavorited(selectedWarezContent.id)
                              ? 'bg-amber-500/10 border-amber-500 text-amber-500'
                              : 'bg-zinc-950 border-zinc-850 text-zinc-300 hover:text-white'
                          }`}
                        >
                          {isFavorited(selectedWarezContent.id) ? '✓ Na Lista' : '+ Salvar Lista'}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3 bg-zinc-900/40 p-3.5 rounded-xl border border-zinc-850">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase text-white tracking-wider">Selecione o Episódio</h4>
                          <button
                            onClick={() => toggleWatchlist(selectedWarezContent)}
                            className={`px-3 py-1 rounded-lg border text-[10px] font-bold transition cursor-pointer ${
                              isFavorited(selectedWarezContent.id)
                                ? 'bg-amber-500/10 border-amber-500 text-amber-500'
                                : 'bg-zinc-950 border-zinc-850 text-zinc-300 hover:text-white'
                            }`}
                          >
                            {isFavorited(selectedWarezContent.id) ? '✓ Na Lista' : '+ Salvar Lista'}
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <span className="text-[10px] text-zinc-500 font-mono">TEMPORADA:</span>
                            <select
                              value={selectedWarezSeason}
                              onChange={(e) => {
                                setSelectedWarezSeason(parseInt(e.target.value, 10));
                                setSelectedWarezEpisode(1);
                              }}
                              className="w-full bg-zinc-950 border border-zinc-800 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none"
                            >
                              {Array.from({ length: dynamicSeasonsCount }, (_, i) => i + 1).map(s => (
                                <option key={s} value={s}>Temporada {s}</option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[10px] text-zinc-500 font-mono">EPISÓDIO:</span>
                            <select
                              value={selectedWarezEpisode}
                              onChange={(e) => setSelectedWarezEpisode(parseInt(e.target.value, 10))}
                              className="w-full bg-zinc-950 border border-zinc-800 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none"
                            >
                              {Array.from({ length: dynamicEpisodesCount }, (_, i) => i + 1).map(e => (
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
                          className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black text-xs py-2.5 rounded-xl uppercase transition cursor-pointer"
                        >
                          Sintonizar Episódio
                        </button>
                      </div>
                    )}

                    {/* Synopsis Box placed underneath, scrollable to prevent any below-the-fold layout issues */}
                    <div className="bg-zinc-900/30 p-3 rounded-xl border border-zinc-900 flex-grow max-h-24 md:max-h-32 overflow-y-auto scrollbar-thin">
                      <p className="text-[10px] font-mono text-zinc-500 uppercase font-black mb-1">Sinopse:</p>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        {selectedWarezContent.synopsis || "Sem sinopse disponível."}
                      </p>
                    </div>

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
