import React, { useState, useEffect, useMemo } from 'react';
import { Video, Plus, X, Search, Play, Clock, Tag, Youtube, Star, Folder, Heart, FileText, BookOpen, List, ChevronRight, ChevronLeft, Bookmark, Download, Upload, Filter, SortAsc, SortDesc, Edit2, Save, Trash2, PlayCircle, Loader2 } from 'lucide-react';
import { VideoResource, ArticleResource, Playlist } from '../types';
import { logger } from '../utils/logger';

type ResourceType = 'all' | 'videos' | 'articles';
type ViewMode = 'grid' | 'list';

const ResourcesPage: React.FC = () => {
    const [videos, setVideos] = useState<VideoResource[]>(() => {
        const saved = localStorage.getItem('vadi_videos');
        return saved ? JSON.parse(saved) : [];
    });
    const [articles, setArticles] = useState<ArticleResource[]>(() => {
        const saved = localStorage.getItem('vadi_articles');
        return saved ? JSON.parse(saved) : [];
    });
    const [playlists, setPlaylists] = useState<Playlist[]>(() => {
        const saved = localStorage.getItem('vadi_playlists');
        return saved ? JSON.parse(saved) : [];
    });
    const [folders, setFolders] = useState<string[]>(() => {
        const saved = localStorage.getItem('vadi_folders');
        return saved ? JSON.parse(saved) : [];
    });
    
    const [showAddModal, setShowAddModal] = useState(false);
    const [showPlaylistModal, setShowPlaylistModal] = useState(false);
    const [showPlaylistPlayer, setShowPlaylistPlayer] = useState<Playlist | null>(null);
    const [selectedVideo, setSelectedVideo] = useState<VideoResource | null>(null);
    const [selectedArticle, setSelectedArticle] = useState<ArticleResource | null>(null);
    const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedFolder, setSelectedFolder] = useState<string>('all');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [resourceType, setResourceType] = useState<ResourceType>('all');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [sortBy, setSortBy] = useState<'date' | 'rating' | 'title' | 'views'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
    const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState(0);
    const [isLoadingPlaylist, setIsLoadingPlaylist] = useState(false);
    
    const [newVideo, setNewVideo] = useState({
        title: '',
        youtubeId: '',
        description: '',
        category: 'Tutorial' as VideoResource['category'],
        tags: [] as string[],
        folder: '',
        rating: 0,
    });
    
    const [newArticle, setNewArticle] = useState({
        title: '',
        url: '',
        pdfUrl: '',
        description: '',
        content: '',
        category: 'Tutorial' as ArticleResource['category'],
        tags: [] as string[],
        folder: '',
        rating: 0,
    });
    
    const [newPlaylist, setNewPlaylist] = useState({
        name: '',
        description: '',
        videoIds: [] as string[],
        articleIds: [] as string[],
    });

    useEffect(() => {
        localStorage.setItem('vadi_videos', JSON.stringify(videos));
    }, [videos]);
    
    useEffect(() => {
        localStorage.setItem('vadi_articles', JSON.stringify(articles));
    }, [articles]);
    
    useEffect(() => {
        localStorage.setItem('vadi_playlists', JSON.stringify(playlists));
    }, [playlists]);
    
    useEffect(() => {
        localStorage.setItem('vadi_folders', JSON.stringify(folders));
    }, [folders]);

    const extractYoutubeId = (url: string): string | null => {
        const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        const match = url.match(regex);
        return match ? match[1] : null;
    };
    
    const extractPlaylistId = (url: string): string | null => {
        // YouTube playlist URL patterns:
        // https://www.youtube.com/playlist?list=PLxxxxx
        // https://youtube.com/playlist?list=PLxxxxx
        // https://www.youtube.com/watch?v=xxxxx&list=PLxxxxx
        const playlistRegex = /[?&]list=([a-zA-Z0-9_-]+)/;
        const match = url.match(playlistRegex);
        return match ? match[1] : null;
    };
    
    const isPlaylistUrl = (url: string): boolean => {
        return url.includes('playlist?list=') || url.includes('&list=') || url.includes('?list=');
    };
    
    const fetchPlaylistVideos = async (playlistId: string): Promise<Array<{ videoId: string; title: string; description?: string }>> => {
        setIsLoadingPlaylist(true);
        try {
            // YouTube oEmbed API kullanarak playlist bilgilerini al
            // Not: Bu API sadece playlist bilgilerini verir, tüm videoları değil
            // Gerçek uygulamada YouTube Data API v3 kullanılmalı
            // Şimdilik kullanıcıdan manuel ekleme yapacağız veya playlist'i direkt kaydedeceğiz
            
            // Alternatif: Playlist embed URL'sini kullan
            // YouTube playlist embed'i tüm videoları gösterir
            return [];
        } catch (error) {
            logger.error('Playlist videos fetch error:', error);
            return [];
        } finally {
            setIsLoadingPlaylist(false);
        }
    };

    const handleAddVideo = async () => {
        if (!newVideo.title || !newVideo.youtubeId) {
            alert('Lütfen başlık ve YouTube ID/URL girin');
            return;
        }

        // Check if it's a playlist URL
        if (isPlaylistUrl(newVideo.youtubeId)) {
            const playlistId = extractPlaylistId(newVideo.youtubeId);
            if (playlistId) {
                // Create a playlist from YouTube playlist URL
                const playlist: Playlist = {
                    id: Math.random().toString(36).substr(2, 9),
                    name: newVideo.title || `YouTube Playlist ${playlistId.substring(0, 8)}`,
                    description: newVideo.description || `YouTube playlist: ${playlistId}`,
                    videoIds: [], // Will be populated if we can fetch videos
                    articleIds: [],
                    createdDate: new Date().toLocaleDateString('tr-TR'),
                    isPublic: false,
                    youtubePlaylistId: playlistId,
                    youtubePlaylistUrl: newVideo.youtubeId,
                };
                
                setPlaylists(prev => [playlist, ...prev]);
                setNewVideo({ title: '', youtubeId: '', description: '', category: 'Tutorial', tags: [], folder: '', rating: 0 });
                setShowAddModal(false);
                alert('YouTube Playlist oluşturuldu! Playlist\'i oynatmak için playlist kartındaki "Oynat" butonuna tıklayın. Tüm videolar YouTube embed ile gösterilecektir.');
                return;
            }
        }

        let youtubeId = newVideo.youtubeId;
        const extractedId = extractYoutubeId(newVideo.youtubeId);
        if (extractedId) {
            youtubeId = extractedId;
        }

        if (youtubeId.length !== 11) {
            alert('Geçersiz YouTube ID');
            return;
        }

        const video: VideoResource = {
            id: Math.random().toString(36).substr(2, 9),
            title: newVideo.title,
            youtubeId: youtubeId,
            description: newVideo.description,
            category: newVideo.category,
            addedDate: new Date().toLocaleDateString('tr-TR'),
            tags: newVideo.tags,
            folder: newVideo.folder || undefined,
            rating: newVideo.rating || undefined,
            isFavorite: false,
            viewCount: 0,
        };

        setVideos(prev => [video, ...prev]);
        
        // Add folder if new
        if (newVideo.folder && !folders.includes(newVideo.folder)) {
            setFolders(prev => [...prev, newVideo.folder]);
        }
        
        setNewVideo({ title: '', youtubeId: '', description: '', category: 'Tutorial', tags: [], folder: '', rating: 0 });
        setShowAddModal(false);
    };
    
    const handleAddArticle = () => {
        if (!newArticle.title || (!newArticle.url && !newArticle.pdfUrl && !newArticle.content)) {
            alert('Lütfen başlık ve içerik/URL/PDF URL girin');
            return;
        }

        const article: ArticleResource = {
            id: Math.random().toString(36).substr(2, 9),
            title: newArticle.title,
            url: newArticle.url || undefined,
            pdfUrl: newArticle.pdfUrl || undefined,
            content: newArticle.content || undefined,
            description: newArticle.description,
            category: newArticle.category,
            addedDate: new Date().toLocaleDateString('tr-TR'),
            tags: newArticle.tags,
            folder: newArticle.folder || undefined,
            rating: newArticle.rating || undefined,
            isFavorite: false,
            readProgress: 0,
        };

        setArticles(prev => [article, ...prev]);
        
        // Add folder if new
        if (newArticle.folder && !folders.includes(newArticle.folder)) {
            setFolders(prev => [...prev, newArticle.folder]);
        }
        
        setNewArticle({ title: '', url: '', pdfUrl: '', description: '', content: '', category: 'Tutorial', tags: [], folder: '', rating: 0 });
        setShowAddModal(false);
    };
    
    const handleAddPlaylist = () => {
        if (!newPlaylist.name) {
            alert('Lütfen playlist adı girin');
            return;
        }

        const playlist: Playlist = {
            id: Math.random().toString(36).substr(2, 9),
            name: newPlaylist.name,
            description: newPlaylist.description,
            videoIds: newPlaylist.videoIds,
            articleIds: newPlaylist.articleIds,
            createdDate: new Date().toLocaleDateString('tr-TR'),
            isPublic: false,
        };

        setPlaylists(prev => [playlist, ...prev]);
        setNewPlaylist({ name: '', description: '', videoIds: [], articleIds: [] });
        setShowPlaylistModal(false);
    };
    
    const handleDeleteVideo = (id: string) => {
        if (confirm('Bu videoyu silmek istediğinize emin misiniz?')) {
            setVideos(prev => prev.filter(v => v.id !== id));
            // Remove from playlists
            setPlaylists(prev => prev.map(p => ({
                ...p,
                videoIds: p.videoIds.filter(vid => vid !== id)
            })));
            if (selectedVideo?.id === id) {
                setSelectedVideo(null);
            }
        }
    };
    
    const handleDeleteArticle = (id: string) => {
        if (confirm('Bu makaleyi silmek istediğinize emin misiniz?')) {
            setArticles(prev => prev.filter(a => a.id !== id));
            // Remove from playlists
            setPlaylists(prev => prev.map(p => ({
                ...p,
                articleIds: p.articleIds?.filter(aid => aid !== id) || []
            })));
            if (selectedArticle?.id === id) {
                setSelectedArticle(null);
            }
        }
    };
    
    const handleDeletePlaylist = (id: string) => {
        if (confirm('Bu playlisti silmek istediğinize emin misiniz?')) {
            setPlaylists(prev => prev.filter(p => p.id !== id));
            if (selectedPlaylist?.id === id) {
                setSelectedPlaylist(null);
            }
            if (showPlaylistPlayer?.id === id) {
                setShowPlaylistPlayer(null);
            }
        }
    };
    
    const toggleFavorite = (id: string, type: 'video' | 'article') => {
        if (type === 'video') {
            setVideos(prev => prev.map(v => v.id === id ? { ...v, isFavorite: !v.isFavorite } : v));
        } else {
            setArticles(prev => prev.map(a => a.id === id ? { ...a, isFavorite: !a.isFavorite } : a));
        }
    };
    
    const setRating = (id: string, rating: number, type: 'video' | 'article') => {
        if (type === 'video') {
            setVideos(prev => prev.map(v => v.id === id ? { ...v, rating } : v));
        } else {
            setArticles(prev => prev.map(a => a.id === id ? { ...a, rating } : a));
        }
    };
    
    const addToPlaylist = (resourceId: string, type: 'video' | 'article', playlistId: string) => {
        setPlaylists(prev => prev.map(p => {
            if (p.id === playlistId) {
                if (type === 'video') {
                    // Check if video already in playlist
                    if (p.videoIds.includes(resourceId)) {
                        return p;
                    }
                    return { ...p, videoIds: [...(p.videoIds || []), resourceId] };
                } else {
                    // Check if article already in playlist
                    if (p.articleIds?.includes(resourceId)) {
                        return p;
                    }
                    return { ...p, articleIds: [...(p.articleIds || []), resourceId] };
                }
            }
            return p;
        }));
    };
    
    const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState<{ resourceId: string; type: 'video' | 'article' } | null>(null);
    
    const handleAddToPlaylistClick = (resourceId: string, type: 'video' | 'article') => {
        setShowAddToPlaylistModal({ resourceId, type });
    };
    
    const startPlaylist = (playlist: Playlist) => {
        setShowPlaylistPlayer(playlist);
        setCurrentPlaylistIndex(0);
        // Load first video
        if (playlist.videoIds.length > 0) {
            const firstVideo = videos.find(v => v.id === playlist.videoIds[0]);
            if (firstVideo) {
                setSelectedVideo(firstVideo);
            }
        }
    };
    
    const playNextInPlaylist = () => {
        if (!showPlaylistPlayer) return;
        const allItems = [...showPlaylistPlayer.videoIds, ...(showPlaylistPlayer.articleIds || [])];
        if (currentPlaylistIndex < allItems.length - 1) {
            const nextIndex = currentPlaylistIndex + 1;
            setCurrentPlaylistIndex(nextIndex);
            const nextId = allItems[nextIndex];
            const nextVideo = videos.find(v => v.id === nextId);
            const nextArticle = articles.find(a => a.id === nextId);
            if (nextVideo) {
                setSelectedVideo(nextVideo);
                setSelectedArticle(null);
            } else if (nextArticle) {
                setSelectedArticle(nextArticle);
                setSelectedVideo(null);
            }
        }
    };
    
    const playPreviousInPlaylist = () => {
        if (!showPlaylistPlayer) return;
        if (currentPlaylistIndex > 0) {
            const prevIndex = currentPlaylistIndex - 1;
            setCurrentPlaylistIndex(prevIndex);
            const allItems = [...showPlaylistPlayer.videoIds, ...(showPlaylistPlayer.articleIds || [])];
            const prevId = allItems[prevIndex];
            const prevVideo = videos.find(v => v.id === prevId);
            const prevArticle = articles.find(a => a.id === prevId);
            if (prevVideo) {
                setSelectedVideo(prevVideo);
                setSelectedArticle(null);
            } else if (prevArticle) {
                setSelectedArticle(prevArticle);
                setSelectedVideo(null);
            }
        }
    };
    
    const incrementViewCount = (id: string, type: 'video' | 'article') => {
        if (type === 'video') {
            setVideos(prev => prev.map(v => v.id === id ? { ...v, viewCount: (v.viewCount || 0) + 1, lastViewed: new Date().toISOString() } : v));
        } else {
            setArticles(prev => prev.map(a => a.id === id ? { ...a, views: (a.views || 0) + 1, lastViewed: new Date().toISOString() } : a));
        }
    };

    // Get all unique tags
    const allTags = Array.from(new Set([
        ...videos.flatMap(v => v.tags || []),
        ...articles.flatMap(a => a.tags || [])
    ]));

    // Filter resources - Memoized for performance
    const filteredVideos = useMemo(() => videos.filter(v => {
        const matchesSearch = v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            v.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (v.tags || []).some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesCategory = selectedCategory === 'all' || v.category === selectedCategory;
        const matchesFolder = selectedFolder === 'all' || v.folder === selectedFolder;
        const matchesTags = selectedTags.length === 0 || selectedTags.every(tag => (v.tags || []).includes(tag));
        const matchesFavorites = !showFavoritesOnly || v.isFavorite;
        return matchesSearch && matchesCategory && matchesFolder && matchesTags && matchesFavorites;
    }), [videos, searchQuery, selectedCategory, selectedFolder, selectedTags, showFavoritesOnly]);
    
    const filteredArticles = useMemo(() => articles.filter(a => {
        const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            a.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            a.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (a.tags || []).some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesCategory = selectedCategory === 'all' || a.category === selectedCategory;
        const matchesFolder = selectedFolder === 'all' || a.folder === selectedFolder;
        const matchesTags = selectedTags.length === 0 || selectedTags.every(tag => (a.tags || []).includes(tag));
        const matchesFavorites = !showFavoritesOnly || a.isFavorite;
        return matchesSearch && matchesCategory && matchesFolder && matchesTags && matchesFavorites;
    }), [articles, searchQuery, selectedCategory, selectedFolder, selectedTags, showFavoritesOnly]);

    // Sort resources - Memoized for performance
    const sortedVideos = useMemo(() => [...filteredVideos].sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
            case 'date':
                comparison = new Date(b.addedDate || 0).getTime() - new Date(a.addedDate || 0).getTime();
                break;
            case 'rating':
                comparison = (b.rating || 0) - (a.rating || 0);
                break;
            case 'title':
                comparison = a.title.localeCompare(b.title);
                break;
            case 'views':
                comparison = (b.viewCount || 0) - (a.viewCount || 0);
                break;
        }
        return sortOrder === 'asc' ? -comparison : comparison;
    }), [filteredVideos, sortBy, sortOrder]);
    
    const sortedArticles = useMemo(() => [...filteredArticles].sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
            case 'date':
                comparison = new Date(b.addedDate || 0).getTime() - new Date(a.addedDate || 0).getTime();
                break;
            case 'rating':
                comparison = (b.rating || 0) - (a.rating || 0);
                break;
            case 'title':
                comparison = a.title.localeCompare(b.title);
                break;
            case 'views':
                comparison = (b.views || 0) - (a.views || 0);
                break;
        }
        return sortOrder === 'asc' ? -comparison : comparison;
    }), [filteredArticles, sortBy, sortOrder]);

    const categories: Array<{ value: string; label: string }> = [
        { value: 'all', label: 'Tümü' },
        { value: 'Tutorial', label: 'Eğitim' },
        { value: 'Analysis', label: 'Analiz' },
        { value: 'Strategy', label: 'Strateji' },
        { value: 'News', label: 'Haberler' },
        { value: 'Interview', label: 'Röportaj' },
        { value: 'Market Analysis', label: 'Piyasa Analizi' },
        { value: 'Trade Reviews', label: 'Trade İncelemeleri' },
        { value: 'Psychology', label: 'Psikoloji' },
        { value: 'Risk Management', label: 'Risk Yönetimi' },
        { value: 'Technical Analysis', label: 'Teknik Analiz' },
        { value: 'Fundamental Analysis', label: 'Temel Analiz' },
        { value: 'Trading Tools', label: 'Trading Araçları' },
    ];

    return (
        <div className="flex-1 bg-[#0b0e14] p-6 overflow-y-auto">
            {/* Add Resource Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1a1f2b] border border-slate-700 p-6 rounded-xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-white font-bold flex items-center gap-2">
                                <Plus className="w-4 h-4 text-cyan-400" /> Kaynak Ekle
                            </h3>
                            <button onClick={() => setShowAddModal(false)}>
                                <X className="w-4 h-4 text-slate-500 hover:text-white" />
                            </button>
                        </div>
                        <div className="flex gap-2 mb-4">
                            <button
                                onClick={() => setResourceType('videos')}
                                className={`flex-1 py-2 px-4 rounded text-sm font-bold transition-all ${
                                    resourceType === 'videos' ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300'
                                }`}
                            >
                                Video
                            </button>
                            <button
                                onClick={() => setResourceType('articles')}
                                className={`flex-1 py-2 px-4 rounded text-sm font-bold transition-all ${
                                    resourceType === 'articles' ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300'
                                }`}
                            >
                                Makale/PDF
                            </button>
                        </div>
                        
                        {resourceType === 'videos' ? (
                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                                        Video Başlığı
                                    </label>
                                    <input
                                        type="text"
                                        value={newVideo.title}
                                        onChange={e => setNewVideo({ ...newVideo, title: e.target.value })}
                                        className="w-full bg-[#0b0e14] border border-slate-700 rounded p-2 text-white text-sm focus:border-cyan-500 outline-none"
                                        placeholder="Örn: ICT Order Block Stratejisi"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                                        YouTube URL veya ID
                                    </label>
                                    <input
                                        type="text"
                                        value={newVideo.youtubeId}
                                        onChange={e => setNewVideo({ ...newVideo, youtubeId: e.target.value })}
                                        className="w-full bg-[#0b0e14] border border-slate-700 rounded p-2 text-white text-sm focus:border-cyan-500 outline-none"
                                        placeholder="https://youtube.com/watch?v=... veya dQw4w9WgXcQ"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                                        Kategori
                                    </label>
                                    <select
                                        value={newVideo.category}
                                        onChange={e => setNewVideo({ ...newVideo, category: e.target.value as VideoResource['category'] })}
                                        className="w-full bg-[#0b0e14] border border-slate-700 rounded p-2 text-white text-sm focus:border-cyan-500 outline-none"
                                    >
                                        {categories.filter(c => c.value !== 'all').map(cat => (
                                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                                        Klasör (Opsiyonel)
                                    </label>
                                    <input
                                        type="text"
                                        value={newVideo.folder}
                                        onChange={e => setNewVideo({ ...newVideo, folder: e.target.value })}
                                        className="w-full bg-[#0b0e14] border border-slate-700 rounded p-2 text-white text-sm focus:border-cyan-500 outline-none"
                                        placeholder="Örn: ICT Stratejileri"
                                        list="folders"
                                    />
                                    <datalist id="folders">
                                        {folders.map(f => <option key={f} value={f} />)}
                                    </datalist>
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                                        Etiketler (virgülle ayırın)
                                    </label>
                                    <input
                                        type="text"
                                        value={newVideo.tags.join(', ')}
                                        onChange={e => setNewVideo({ ...newVideo, tags: e.target.value.split(',').map(t => t.trim()).filter(t => t) })}
                                        className="w-full bg-[#0b0e14] border border-slate-700 rounded p-2 text-white text-sm focus:border-cyan-500 outline-none"
                                        placeholder="Örn: ICT, Order Block, SMC"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                                        Açıklama (Opsiyonel)
                                    </label>
                                    <textarea
                                        value={newVideo.description}
                                        onChange={e => setNewVideo({ ...newVideo, description: e.target.value })}
                                        className="w-full bg-[#0b0e14] border border-slate-700 rounded p-2 text-white text-sm focus:border-cyan-500 outline-none h-20"
                                        placeholder="Video hakkında kısa açıklama..."
                                    />
                                </div>
                                <button
                                    onClick={handleAddVideo}
                                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 rounded text-sm transition-colors"
                                >
                                    VİDEO EKLE
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                                        Makale Başlığı
                                    </label>
                                    <input
                                        type="text"
                                        value={newArticle.title}
                                        onChange={e => setNewArticle({ ...newArticle, title: e.target.value })}
                                        className="w-full bg-[#0b0e14] border border-slate-700 rounded p-2 text-white text-sm focus:border-cyan-500 outline-none"
                                        placeholder="Örn: ICT Order Block Rehberi"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                                        URL veya PDF URL
                                    </label>
                                    <input
                                        type="text"
                                        value={newArticle.url || newArticle.pdfUrl}
                                        onChange={e => {
                                            if (e.target.value.endsWith('.pdf')) {
                                                setNewArticle({ ...newArticle, pdfUrl: e.target.value, url: '' });
                                            } else {
                                                setNewArticle({ ...newArticle, url: e.target.value, pdfUrl: '' });
                                            }
                                        }}
                                        className="w-full bg-[#0b0e14] border border-slate-700 rounded p-2 text-white text-sm focus:border-cyan-500 outline-none"
                                        placeholder="https://example.com/article veya https://example.com/article.pdf"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                                        İçerik (Opsiyonel - URL yoksa)
                                    </label>
                                    <textarea
                                        value={newArticle.content}
                                        onChange={e => setNewArticle({ ...newArticle, content: e.target.value })}
                                        className="w-full bg-[#0b0e14] border border-slate-700 rounded p-2 text-white text-sm focus:border-cyan-500 outline-none h-32"
                                        placeholder="Makale içeriği..."
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                                        Kategori
                                    </label>
                                    <select
                                        value={newArticle.category}
                                        onChange={e => setNewArticle({ ...newArticle, category: e.target.value as ArticleResource['category'] })}
                                        className="w-full bg-[#0b0e14] border border-slate-700 rounded p-2 text-white text-sm focus:border-cyan-500 outline-none"
                                    >
                                        {categories.filter(c => c.value !== 'all').map(cat => (
                                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                                        Klasör (Opsiyonel)
                                    </label>
                                    <input
                                        type="text"
                                        value={newArticle.folder}
                                        onChange={e => setNewArticle({ ...newArticle, folder: e.target.value })}
                                        className="w-full bg-[#0b0e14] border border-slate-700 rounded p-2 text-white text-sm focus:border-cyan-500 outline-none"
                                        placeholder="Örn: ICT Stratejileri"
                                        list="folders-article"
                                    />
                                    <datalist id="folders-article">
                                        {folders.map(f => <option key={f} value={f} />)}
                                    </datalist>
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                                        Etiketler (virgülle ayırın)
                                    </label>
                                    <input
                                        type="text"
                                        value={newArticle.tags.join(', ')}
                                        onChange={e => setNewArticle({ ...newArticle, tags: e.target.value.split(',').map(t => t.trim()).filter(t => t) })}
                                        className="w-full bg-[#0b0e14] border border-slate-700 rounded p-2 text-white text-sm focus:border-cyan-500 outline-none"
                                        placeholder="Örn: ICT, Order Block, SMC"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                                        Açıklama (Opsiyonel)
                                    </label>
                                    <textarea
                                        value={newArticle.description}
                                        onChange={e => setNewArticle({ ...newArticle, description: e.target.value })}
                                        className="w-full bg-[#0b0e14] border border-slate-700 rounded p-2 text-white text-sm focus:border-cyan-500 outline-none h-20"
                                        placeholder="Makale hakkında kısa açıklama..."
                                    />
                                </div>
                                <button
                                    onClick={handleAddArticle}
                                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 rounded text-sm transition-colors"
                                >
                                    MAKALE EKLE
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {/* Playlist Modal */}
            {showPlaylistModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1a1f2b] border border-slate-700 p-6 rounded-xl w-full max-w-md shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-white font-bold flex items-center gap-2">
                                <List className="w-4 h-4 text-cyan-400" /> Yeni Playlist
                            </h3>
                            <button onClick={() => setShowPlaylistModal(false)}>
                                <X className="w-4 h-4 text-slate-500 hover:text-white" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                                    Playlist Adı
                                </label>
                                <input
                                    type="text"
                                    value={newPlaylist.name}
                                    onChange={e => setNewPlaylist({ ...newPlaylist, name: e.target.value })}
                                    className="w-full bg-[#0b0e14] border border-slate-700 rounded p-2 text-white text-sm focus:border-cyan-500 outline-none"
                                    placeholder="Örn: ICT Başlangıç Rehberi"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                                    Açıklama
                                </label>
                                <textarea
                                    value={newPlaylist.description}
                                    onChange={e => setNewPlaylist({ ...newPlaylist, description: e.target.value })}
                                    className="w-full bg-[#0b0e14] border border-slate-700 rounded p-2 text-white text-sm focus:border-cyan-500 outline-none h-20"
                                    placeholder="Playlist hakkında açıklama..."
                                />
                            </div>
                            <div className="text-xs text-slate-400">
                                Not: Videoları ve makaleleri playlist'e eklemek için kaynak kartındaki "Playlist'e Ekle" butonunu kullanın.
                            </div>
                            <button
                                onClick={handleAddPlaylist}
                                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 rounded text-sm transition-colors"
                            >
                                PLAYLİST OLUŞTUR
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Video className="w-8 h-8 text-cyan-500" /> Kaynaklar
                    </h1>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowPlaylistModal(true)}
                            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-bold transition-all"
                        >
                            <List className="w-4 h-4" /> Yeni Playlist
                        </button>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg font-bold transition-all"
                        >
                            <Plus className="w-4 h-4" /> Yeni Kaynak
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 border-b border-slate-800">
                    <button
                        onClick={() => setResourceType('all')}
                        className={`pb-2 px-4 text-sm font-bold border-b-2 transition-colors ${
                            resourceType === 'all' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        Tümü ({videos.length + articles.length})
                    </button>
                    <button
                        onClick={() => setResourceType('videos')}
                        className={`pb-2 px-4 text-sm font-bold border-b-2 transition-colors ${
                            resourceType === 'videos' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        Videolar ({videos.length})
                    </button>
                    <button
                        onClick={() => setResourceType('articles')}
                        className={`pb-2 px-4 text-sm font-bold border-b-2 transition-colors ${
                            resourceType === 'articles' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        Makaleler ({articles.length})
                    </button>
                    <button
                        onClick={() => setResourceType('all')}
                        className={`pb-2 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
                            resourceType === 'all' ? 'border-purple-500 text-purple-400' : 'border-transparent text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        <List className="w-4 h-4" /> Playlistler ({playlists.length})
                    </button>
                </div>

                {/* Playlists Section */}
                {resourceType === 'all' && playlists.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <List className="w-5 h-5 text-purple-400" /> Playlistler
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {playlists.map(playlist => {
                                const playlistVideos = videos.filter(v => playlist.videoIds.includes(v.id));
                                const playlistArticles = articles.filter(a => playlist.articleIds?.includes(a.id) || false);
                                const totalItems = playlistVideos.length + playlistArticles.length;
                                
                                return (
                                    <div
                                        key={playlist.id}
                                        className="bg-[#151921] border border-slate-800 rounded-xl overflow-hidden hover:border-purple-500/50 transition-all"
                                    >
                                        <div className="p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="text-white font-bold text-sm flex-1">{playlist.name}</h3>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeletePlaylist(playlist.id);
                                                    }}
                                                    className="text-red-400 hover:text-red-300"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            {playlist.description && (
                                                <p className="text-slate-400 text-xs mb-3 line-clamp-2">{playlist.description}</p>
                                            )}
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-500 text-xs">
                                                    {playlistVideos.length} video, {playlistArticles.length} makale
                                                </span>
                                                <button
                                                    onClick={() => startPlaylist(playlist)}
                                                    className="flex items-center gap-1 bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded text-xs font-bold transition-all"
                                                >
                                                    <PlayCircle className="w-3 h-3" /> Oynat
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Search and Filter */}
                <div className="flex flex-wrap gap-4 mb-6">
                    <div className="flex-1 min-w-[200px] relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Kaynak ara..."
                            className="w-full bg-[#151921] border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white text-sm focus:border-cyan-500 outline-none"
                        />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {categories.map(cat => (
                            <button
                                key={cat.value}
                                onClick={() => setSelectedCategory(cat.value)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    selectedCategory === cat.value
                                        ? 'bg-cyan-600 text-white'
                                        : 'bg-[#151921] text-slate-400 border border-slate-700 hover:border-slate-500'
                                }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>
                
                {/* Advanced Filters */}
                <div className="flex flex-wrap gap-4 mb-6 items-center">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-slate-400" />
                        <span className="text-xs text-slate-400">Filtreler:</span>
                    </div>
                    <select
                        value={selectedFolder}
                        onChange={e => setSelectedFolder(e.target.value)}
                        className="bg-[#151921] border border-slate-700 rounded px-3 py-1.5 text-white text-xs focus:border-cyan-500 outline-none"
                    >
                        <option value="all">Tüm Klasörler</option>
                        {folders.map(f => (
                            <option key={f} value={f}>{f}</option>
                        ))}
                    </select>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="favorites"
                            checked={showFavoritesOnly}
                            onChange={e => setShowFavoritesOnly(e.target.checked)}
                            className="w-4 h-4"
                        />
                        <label htmlFor="favorites" className="text-xs text-slate-400 cursor-pointer flex items-center gap-1">
                            <Heart className="w-3 h-3" /> Sadece Favoriler
                        </label>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">Sırala:</span>
                        <select
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value as any)}
                            className="bg-[#151921] border border-slate-700 rounded px-3 py-1.5 text-white text-xs focus:border-cyan-500 outline-none"
                        >
                            <option value="date">Tarih</option>
                            <option value="rating">Rating</option>
                            <option value="title">Başlık</option>
                            <option value="views">Görüntülenme</option>
                        </select>
                        <button
                            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                            className="bg-[#151921] border border-slate-700 rounded px-2 py-1.5 text-white hover:bg-slate-800 transition-all"
                        >
                            {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                            className="bg-[#151921] border border-slate-700 rounded px-3 py-1.5 text-white text-xs hover:bg-slate-800 transition-all"
                        >
                            {viewMode === 'grid' ? 'Liste' : 'Grid'}
                        </button>
                    </div>
                </div>
                
                {/* Tags Filter */}
                {allTags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-6">
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Tag className="w-3 h-3" /> Etiketler:
                        </span>
                        {allTags.map(tag => (
                            <button
                                key={tag}
                                onClick={() => {
                                    if (selectedTags.includes(tag)) {
                                        setSelectedTags(selectedTags.filter(t => t !== tag));
                                    } else {
                                        setSelectedTags([...selectedTags, tag]);
                                    }
                                }}
                                className={`px-2 py-1 rounded text-xs font-bold transition-all ${
                                    selectedTags.includes(tag)
                                        ? 'bg-cyan-600 text-white'
                                        : 'bg-[#151921] text-slate-400 border border-slate-700 hover:border-slate-500'
                                }`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                )}

                {/* Resources Grid/List */}
                {(resourceType === 'all' || resourceType === 'videos') && sortedVideos.length > 0 && (
                    <div className="mb-8">
                        {resourceType === 'all' && <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Video className="w-5 h-5 text-cyan-400" /> Videolar</h2>}
                        {viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {sortedVideos.map(video => (
                                    <div
                                        key={video.id}
                                        className="bg-[#151921] border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-all cursor-pointer group relative"
                                        onClick={() => {
                                            setSelectedVideo(video);
                                            incrementViewCount(video.id, 'video');
                                        }}
                                    >
                                        <div className="relative aspect-video bg-black">
                                            <img
                                                src={`https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg`}
                                                alt={video.title}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`;
                                                }}
                                            />
                                            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all flex items-center justify-center">
                                                <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Play className="w-8 h-8 text-white ml-1" />
                                                </div>
                                            </div>
                                            <div className="absolute top-2 right-2 flex gap-1">
                                                {video.isFavorite && <Heart className="w-4 h-4 text-red-500 fill-red-500" />}
                                                <span className="bg-black/70 text-white text-[9px] px-2 py-1 rounded font-bold">
                                                    {video.category}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            <h3 className="text-white font-bold text-sm mb-2 line-clamp-2">
                                                {video.title}
                                            </h3>
                                            {video.description && (
                                                <p className="text-slate-400 text-xs mb-3 line-clamp-2">
                                                    {video.description}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                {video.rating && (
                                                    <div className="flex items-center gap-1">
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star
                                                                key={i}
                                                                className={`w-3 h-3 ${i < video.rating! ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                                {video.folder && (
                                                    <span className="text-slate-500 text-[10px] flex items-center gap-1">
                                                        <Folder className="w-3 h-3" /> {video.folder}
                                                    </span>
                                                )}
                                                {video.viewCount && video.viewCount > 0 && (
                                                    <span className="text-slate-500 text-[10px]">
                                                        {video.viewCount} görüntüleme
                                                    </span>
                                                )}
                                            </div>
                                            {video.tags && video.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mb-2">
                                                    {video.tags.slice(0, 3).map(tag => (
                                                        <span key={tag} className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="flex items-center justify-between">
                                                {video.addedDate && (
                                                    <div className="flex items-center gap-1 text-slate-500 text-[10px]">
                                                        <Clock className="w-3 h-3" />
                                                        {video.addedDate}
                                                    </div>
                                                )}
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleFavorite(video.id, 'video');
                                                        }}
                                                        className={`p-1 rounded transition-all ${
                                                            video.isFavorite ? 'text-red-500' : 'text-slate-500 hover:text-red-400'
                                                        }`}
                                                    >
                                                        <Heart className={`w-4 h-4 ${video.isFavorite ? 'fill-red-500' : ''}`} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteVideo(video.id);
                                                        }}
                                                        className="text-red-400 hover:text-red-300 p-1"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {sortedVideos.map(video => (
                                    <div
                                        key={video.id}
                                        className="bg-[#151921] border border-slate-800 rounded-lg p-4 hover:border-slate-700 transition-all cursor-pointer flex gap-4"
                                        onClick={() => {
                                            setSelectedVideo(video);
                                            incrementViewCount(video.id, 'video');
                                        }}
                                    >
                                        <img
                                            src={`https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`}
                                            alt={video.title}
                                            className="w-32 h-20 object-cover rounded"
                                        />
                                        <div className="flex-1">
                                            <h3 className="text-white font-bold text-sm mb-1">{video.title}</h3>
                                            {video.description && (
                                                <p className="text-slate-400 text-xs mb-2 line-clamp-2">{video.description}</p>
                                            )}
                                            <div className="flex items-center gap-3 text-xs text-slate-500">
                                                <span>{video.category}</span>
                                                {video.folder && <span className="flex items-center gap-1"><Folder className="w-3 h-3" /> {video.folder}</span>}
                                                {video.rating && (
                                                    <span className="flex items-center gap-1">
                                                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                                        {video.rating}/5
                                                    </span>
                                                )}
                                                {video.viewCount && <span>{video.viewCount} görüntüleme</span>}
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAddToPlaylistClick(video.id, 'video');
                                                }}
                                                className="p-2 rounded transition-all text-purple-400 hover:text-purple-300"
                                                title="Playlist'e Ekle"
                                            >
                                                <List className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleFavorite(video.id, 'video');
                                                }}
                                                className={`p-2 rounded transition-all ${
                                                    video.isFavorite ? 'text-red-500' : 'text-slate-500 hover:text-red-400'
                                                }`}
                                            >
                                                <Heart className={`w-4 h-4 ${video.isFavorite ? 'fill-red-500' : ''}`} />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteVideo(video.id);
                                                }}
                                                className="text-red-400 hover:text-red-300 p-2"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                
                {/* Articles Grid/List */}
                {(resourceType === 'all' || resourceType === 'articles') && sortedArticles.length > 0 && (
                    <div className="mb-8">
                        {resourceType === 'all' && <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-cyan-400" /> Makaleler</h2>}
                        {viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {sortedArticles.map(article => (
                                    <div
                                        key={article.id}
                                        className="bg-[#151921] border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-all cursor-pointer group"
                                        onClick={() => {
                                            setSelectedArticle(article);
                                            incrementViewCount(article.id, 'article');
                                        }}
                                    >
                                        <div className="p-4">
                                            <div className="flex items-start justify-between mb-2">
                                                <FileText className="w-8 h-8 text-cyan-400 flex-shrink-0" />
                                                <div className="flex gap-1">
                                                    {article.isFavorite && <Heart className="w-4 h-4 text-red-500 fill-red-500" />}
                                                    <span className="bg-slate-800 text-white text-[9px] px-2 py-1 rounded font-bold">
                                                        {article.category}
                                                    </span>
                                                </div>
                                            </div>
                                            <h3 className="text-white font-bold text-sm mb-2 line-clamp-2">
                                                {article.title}
                                            </h3>
                                            {article.description && (
                                                <p className="text-slate-400 text-xs mb-3 line-clamp-2">
                                                    {article.description}
                                                </p>
                                            )}
                                            {article.readProgress !== undefined && article.readProgress > 0 && (
                                                <div className="mb-2">
                                                    <div className="w-full bg-slate-700 rounded-full h-1.5">
                                                        <div
                                                            className="bg-cyan-500 h-1.5 rounded-full transition-all"
                                                            style={{ width: `${article.readProgress}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-[10px] text-slate-500">{article.readProgress}% okundu</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                {article.rating && (
                                                    <div className="flex items-center gap-1">
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star
                                                                key={i}
                                                                className={`w-3 h-3 ${i < article.rating! ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                                {article.folder && (
                                                    <span className="text-slate-500 text-[10px] flex items-center gap-1">
                                                        <Folder className="w-3 h-3" /> {article.folder}
                                                    </span>
                                                )}
                                            </div>
                                            {article.tags && article.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mb-2">
                                                    {article.tags.slice(0, 3).map(tag => (
                                                        <span key={tag} className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="flex items-center justify-between">
                                                {article.addedDate && (
                                                    <div className="flex items-center gap-1 text-slate-500 text-[10px]">
                                                        <Clock className="w-3 h-3" />
                                                        {article.addedDate}
                                                    </div>
                                                )}
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleFavorite(article.id, 'article');
                                                        }}
                                                        className={`p-1 rounded transition-all ${
                                                            article.isFavorite ? 'text-red-500' : 'text-slate-500 hover:text-red-400'
                                                        }`}
                                                    >
                                                        <Heart className={`w-4 h-4 ${article.isFavorite ? 'fill-red-500' : ''}`} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteArticle(article.id);
                                                        }}
                                                        className="text-red-400 hover:text-red-300 p-1"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {sortedArticles.map(article => (
                                    <div
                                        key={article.id}
                                        className="bg-[#151921] border border-slate-800 rounded-lg p-4 hover:border-slate-700 transition-all cursor-pointer flex gap-4"
                                        onClick={() => {
                                            setSelectedArticle(article);
                                            incrementViewCount(article.id, 'article');
                                        }}
                                    >
                                        <FileText className="w-12 h-12 text-cyan-400 flex-shrink-0" />
                                        <div className="flex-1">
                                            <h3 className="text-white font-bold text-sm mb-1">{article.title}</h3>
                                            {article.description && (
                                                <p className="text-slate-400 text-xs mb-2 line-clamp-2">{article.description}</p>
                                            )}
                                            <div className="flex items-center gap-3 text-xs text-slate-500">
                                                <span>{article.category}</span>
                                                {article.folder && <span className="flex items-center gap-1"><Folder className="w-3 h-3" /> {article.folder}</span>}
                                                {article.rating && (
                                                    <span className="flex items-center gap-1">
                                                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                                        {article.rating}/5
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleFavorite(article.id, 'article');
                                                }}
                                                className={`p-2 rounded transition-all ${
                                                    article.isFavorite ? 'text-red-500' : 'text-slate-500 hover:text-red-400'
                                                }`}
                                            >
                                                <Heart className={`w-4 h-4 ${article.isFavorite ? 'fill-red-500' : ''}`} />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteArticle(article.id);
                                                }}
                                                className="text-red-400 hover:text-red-300 p-2"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Empty State */}
                {((resourceType === 'all' && sortedVideos.length === 0 && sortedArticles.length === 0) ||
                  (resourceType === 'videos' && sortedVideos.length === 0) ||
                  (resourceType === 'articles' && sortedArticles.length === 0)) && (
                    <div className="bg-[#151921] border border-slate-800 rounded-xl p-12 text-center">
                        <Youtube className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                        <p className="text-slate-400 mb-4">
                            {videos.length === 0 && articles.length === 0
                                ? 'Henüz kaynak eklenmemiş. İlk kaynağınızı ekleyin!'
                                : 'Arama kriterlerinize uygun kaynak bulunamadı.'}
                        </p>
                        {(videos.length === 0 && articles.length === 0) && (
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2 rounded-lg font-bold transition-all"
                            >
                                Kaynak Ekle
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* YouTube Playlist Player Modal */}
            {showPlaylistPlayer && showPlaylistPlayer.youtubePlaylistId && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
                    onClick={() => {
                        setShowPlaylistPlayer(null);
                    }}
                >
                    <div
                        className="bg-[#1a1f2b] border border-slate-700 rounded-xl w-full max-w-6xl shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center p-4 border-b border-slate-800">
                            <div className="flex-1">
                                <h3 className="text-white font-bold">{showPlaylistPlayer.name}</h3>
                                {showPlaylistPlayer.description && (
                                    <p className="text-slate-400 text-sm mt-1">{showPlaylistPlayer.description}</p>
                                )}
                            </div>
                            <button
                                onClick={() => setShowPlaylistPlayer(null)}
                                className="text-slate-500 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4">
                            <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
                                <iframe
                                    width="100%"
                                    height="100%"
                                    src={`https://www.youtube.com/embed/videoseries?list=${showPlaylistPlayer.youtubePlaylistId}&autoplay=1`}
                                    title={showPlaylistPlayer.name}
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    className="w-full h-full"
                                ></iframe>
                            </div>
                            <div className="text-xs text-slate-400 text-center">
                                YouTube playlist'teki tüm videolar yukarıda gösterilmektedir. Playlist içinde gezinmek için YouTube player kontrollerini kullanın.
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Video Player Modal */}
            {selectedVideo && !(showPlaylistPlayer && showPlaylistPlayer.youtubePlaylistId) && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
                    onClick={() => {
                        setSelectedVideo(null);
                        if (showPlaylistPlayer) {
                            setShowPlaylistPlayer(null);
                        }
                    }}
                >
                    <div
                        className="bg-[#1a1f2b] border border-slate-700 rounded-xl w-full max-w-4xl shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center p-4 border-b border-slate-800">
                            <div className="flex-1">
                                <h3 className="text-white font-bold">{selectedVideo.title}</h3>
                                {showPlaylistPlayer && !showPlaylistPlayer.youtubePlaylistId && (
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-slate-400">
                                            Playlist: {showPlaylistPlayer.name} ({currentPlaylistIndex + 1} / {showPlaylistPlayer.videoIds.length + (showPlaylistPlayer.articleIds?.length || 0)})
                                        </span>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={playPreviousInPlaylist}
                                                disabled={currentPlaylistIndex === 0}
                                                className="p-1 bg-slate-700 hover:bg-slate-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <ChevronLeft className="w-4 h-4 text-white" />
                                            </button>
                                            <button
                                                onClick={playNextInPlaylist}
                                                disabled={currentPlaylistIndex >= (showPlaylistPlayer.videoIds.length + (showPlaylistPlayer.articleIds?.length || 0) - 1)}
                                                className="p-1 bg-slate-700 hover:bg-slate-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <ChevronRight className="w-4 h-4 text-white" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedVideo(null);
                                    if (showPlaylistPlayer) {
                                        setShowPlaylistPlayer(null);
                                    }
                                }}
                                className="text-slate-500 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4">
                            <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
                                <iframe
                                    width="100%"
                                    height="100%"
                                    src={`https://www.youtube.com/embed/${selectedVideo.youtubeId}?autoplay=1`}
                                    title={selectedVideo.title}
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    className="w-full h-full"
                                ></iframe>
                            </div>
                            <div className="flex items-center gap-4 mb-4">
                                {selectedVideo.rating !== undefined && (
                                    <div className="flex items-center gap-1">
                                        {[...Array(5)].map((_, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setRating(selectedVideo.id, i + 1, 'video')}
                                                className="p-0.5"
                                            >
                                                <Star
                                                    className={`w-5 h-5 ${i < (selectedVideo.rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <button
                                    onClick={() => toggleFavorite(selectedVideo.id, 'video')}
                                    className={`flex items-center gap-1 px-3 py-1 rounded transition-all ${
                                        selectedVideo.isFavorite ? 'bg-red-500/20 text-red-400' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                    }`}
                                >
                                    <Heart className={`w-4 h-4 ${selectedVideo.isFavorite ? 'fill-red-500' : ''}`} />
                                    Favorilere Ekle
                                </button>
                            </div>
                            {selectedVideo.description && (
                                <p className="text-slate-300 text-sm mb-4">{selectedVideo.description}</p>
                            )}
                            {selectedVideo.tags && selectedVideo.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {selectedVideo.tags.map(tag => (
                                        <span key={tag} className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {/* Article Reader Modal */}
            {selectedArticle && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
                    onClick={() => {
                        setSelectedArticle(null);
                        if (showPlaylistPlayer) {
                            setShowPlaylistPlayer(null);
                        }
                    }}
                >
                    <div
                        className="bg-[#1a1f2b] border border-slate-700 rounded-xl w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center p-4 border-b border-slate-800 sticky top-0 bg-[#1a1f2b] z-10">
                            <div className="flex-1">
                                <h3 className="text-white font-bold">{selectedArticle.title}</h3>
                                {showPlaylistPlayer && (
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-slate-400">
                                            Playlist: {showPlaylistPlayer.name} ({currentPlaylistIndex + 1} / {showPlaylistPlayer.videoIds.length + (showPlaylistPlayer.articleIds?.length || 0)})
                                        </span>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={playPreviousInPlaylist}
                                                disabled={currentPlaylistIndex === 0}
                                                className="p-1 bg-slate-700 hover:bg-slate-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <ChevronLeft className="w-4 h-4 text-white" />
                                            </button>
                                            <button
                                                onClick={playNextInPlaylist}
                                                disabled={currentPlaylistIndex >= (showPlaylistPlayer.videoIds.length + (showPlaylistPlayer.articleIds?.length || 0) - 1)}
                                                className="p-1 bg-slate-700 hover:bg-slate-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <ChevronRight className="w-4 h-4 text-white" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedArticle(null);
                                    if (showPlaylistPlayer) {
                                        setShowPlaylistPlayer(null);
                                    }
                                }}
                                className="text-slate-500 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="flex items-center gap-4 mb-4">
                                {selectedArticle.rating !== undefined && (
                                    <div className="flex items-center gap-1">
                                        {[...Array(5)].map((_, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setRating(selectedArticle.id, i + 1, 'article')}
                                                className="p-0.5"
                                            >
                                                <Star
                                                    className={`w-5 h-5 ${i < (selectedArticle.rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <button
                                    onClick={() => toggleFavorite(selectedArticle.id, 'article')}
                                    className={`flex items-center gap-1 px-3 py-1 rounded transition-all ${
                                        selectedArticle.isFavorite ? 'bg-red-500/20 text-red-400' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                    }`}
                                >
                                    <Heart className={`w-4 h-4 ${selectedArticle.isFavorite ? 'fill-red-500' : ''}`} />
                                    Favorilere Ekle
                                </button>
                            </div>
                            {selectedArticle.url && (
                                <div className="mb-4">
                                    <a
                                        href={selectedArticle.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-2"
                                    >
                                        <BookOpen className="w-4 h-4" />
                                        Makaleyi Aç
                                    </a>
                                </div>
                            )}
                            {selectedArticle.pdfUrl && (
                                <div className="mb-4">
                                    <iframe
                                        src={selectedArticle.pdfUrl}
                                        className="w-full h-[600px] rounded-lg border border-slate-700"
                                        title={selectedArticle.title}
                                    ></iframe>
                                </div>
                            )}
                            {selectedArticle.content && (
                                <div className="prose prose-invert prose-sm max-w-none text-slate-300">
                                    <div dangerouslySetInnerHTML={{ __html: selectedArticle.content.replace(/\n/g, '<br />') }} />
                                </div>
                            )}
                            {selectedArticle.description && (
                                <p className="text-slate-300 text-sm mb-4">{selectedArticle.description}</p>
                            )}
                            {selectedArticle.tags && selectedArticle.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-4">
                                    {selectedArticle.tags.map(tag => (
                                        <span key={tag} className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {/* Add to Playlist Modal */}
            {showAddToPlaylistModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1a1f2b] border border-slate-700 p-6 rounded-xl w-full max-w-md shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-white font-bold flex items-center gap-2">
                                <List className="w-4 h-4 text-purple-400" /> Playlist'e Ekle
                            </h3>
                            <button onClick={() => setShowAddToPlaylistModal(null)}>
                                <X className="w-4 h-4 text-slate-500 hover:text-white" />
                            </button>
                        </div>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {playlists.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 text-sm">
                                    Henüz playlist yok. Önce bir playlist oluşturun.
                                </div>
                            ) : (
                                playlists.map(playlist => {
                                    const isInPlaylist = showAddToPlaylistModal.type === 'video'
                                        ? playlist.videoIds.includes(showAddToPlaylistModal.resourceId)
                                        : playlist.articleIds?.includes(showAddToPlaylistModal.resourceId) || false;
                                    
                                    return (
                                        <button
                                            key={playlist.id}
                                            onClick={() => {
                                                if (!isInPlaylist) {
                                                    addToPlaylist(showAddToPlaylistModal.resourceId, showAddToPlaylistModal.type, playlist.id);
                                                }
                                                setShowAddToPlaylistModal(null);
                                            }}
                                            disabled={isInPlaylist}
                                            className={`w-full text-left bg-[#0b0e14] border border-slate-700 rounded p-3 hover:border-purple-500 transition-all ${
                                                isInPlaylist ? 'opacity-50 cursor-not-allowed' : ''
                                            }`}
                                        >
                                            <div className="font-bold text-white text-sm">{playlist.name}</div>
                                            <div className="text-xs text-slate-400 mt-1">
                                                {playlist.videoIds.length} video, {playlist.articleIds?.length || 0} makale
                                                {isInPlaylist && <span className="text-green-400 ml-2">✓ Zaten ekli</span>}
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-700">
                            <button
                                onClick={() => {
                                    setShowAddToPlaylistModal(null);
                                    setShowPlaylistModal(true);
                                }}
                                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded text-sm transition-colors"
                            >
                                Yeni Playlist Oluştur
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResourcesPage;
