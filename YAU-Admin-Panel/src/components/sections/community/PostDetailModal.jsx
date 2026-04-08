// components/admin/community/PostDetailModal.js
import React, { useState, useEffect } from 'react';
import Modal from '../../common/Modal';
import {
    Eye,
    Heart,
    MessageCircle,
    Flag,
    Download,
    ExternalLink,

    Pin,
    Trash2,
    EyeOff,
    X,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Copy,
    Edit3,
    Share2,
    Image,
    Video,
    Clock,
    User,
    Tag,
    Calendar,
    MapPin,
    Lock,
    TrendingUp,
    RefreshCw,
    Search,
    ChevronLeft,
    ChevronRight,
    ThumbsUp,
    Ban,
    Activity
} from 'lucide-react';
import {
    getCommunityPostComments,
    getCommunityPostLikes,
    getCommunityPostReports,
    deleteCommunityPostComment,
    deleteCommunityLike,
    updateCommunityComment,
    updateCommunityReportStatus,
    deleteCommunityReport,
    updateCommunityPost
} from '../../../firebase/apis/api-community';

const PostDetailModal = ({ isOpen, onClose, post, onUpdate, onDelete, onBlock }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [likes, setLikes] = useState([]);
    const [comments, setComments] = useState([]);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState({
        likes: false,
        comments: false,
        reports: false,
        action: false
    });

    // Media state
    const [selectedMedia, setSelectedMedia] = useState(0);// eslint-disable-next-line
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);// eslint-disable-next-line
    const [isVideoMuted, setIsVideoMuted] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Filters and search
    const [commentFilter, setCommentFilter] = useState('all');
    const [commentSearch, setCommentSearch] = useState('');
    const [reportFilter, setReportFilter] = useState('all');
    const [likeSearch, setLikeSearch] = useState('');

    // Edit mode
    // eslint-disable-next-line
    const [editMode, setEditMode] = useState(false);
    const [editData, setEditData] = useState({
        title: '',
        caption: '',
        team: '',
        status: 'published',
        allowComments: true,
        allowSharing: true
    });

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Eye, count: null },
        { id: 'likes', label: 'Likes', icon: Heart, count: likes.length },
        { id: 'comments', label: 'Comments', icon: MessageCircle, count: comments.length },
        { id: 'reports', label: 'Reports', icon: Flag, count: reports.length, alert: reports.filter(r => r.status !== 'resolved').length > 0 },
        { id: 'analytics', label: 'Analytics', icon: TrendingUp, count: null },
        { id: 'edit', label: 'Edit', icon: Edit3, count: null }
    ];
    // Add this useEffect for keyboard navigation in fullscreen
    useEffect(() => {
        if (!isFullscreen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setIsFullscreen(false);
            } else if (e.key === 'ArrowLeft' && post.mediaUrls && post.mediaUrls.length > 1) {
                setSelectedMedia(prev => prev > 0 ? prev - 1 : post.mediaUrls.length - 1);
            } else if (e.key === 'ArrowRight' && post.mediaUrls && post.mediaUrls.length > 1) {
                setSelectedMedia(prev => prev < post.mediaUrls.length - 1 ? prev + 1 : 0);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isFullscreen, post.mediaUrls]);
    const handlePinPost = async (shouldPin) => {
        try {
            setLoading(prev => ({ ...prev, action: true }));
            await updateCommunityPost(post.id, {
                isPinned: shouldPin,
                pinnedAt: shouldPin ? new Date() : null,
                pinnedBy: shouldPin ? 'admin' : null
            });

            onUpdate?.();
            alert(`Post ${shouldPin ? 'pinned' : 'unpinned'} successfully`);
        } catch (error) {
            console.error('Error pinning post:', error);
            alert('Failed to update post pin status');
        } finally {
            setLoading(prev => ({ ...prev, action: false }));
        }
    };

    useEffect(() => {
        if (post) {
            setEditData({
                title: post.title || '',
                caption: post.caption || '',
                team: post.team || '',
                status: post.status || 'published',
                allowComments: post.allowComments !== false,
                allowSharing: post.allowSharing !== false
            });
        }
    }, [post]);

    useEffect(() => {
        loadLikes();
        loadComments();
        loadReports();// eslint-disable-next-line
    }, []);

    const loadLikes = async () => {
        if (!post?.id) return;

        try {
            setLoading(prev => ({ ...prev, likes: true }));
            const postLikes = await getCommunityPostLikes(post.id);
            setLikes(postLikes || []);
        } catch (error) {
            console.error('Error loading likes:', error);
            setLikes([]);
        } finally {
            setLoading(prev => ({ ...prev, likes: false }));
        }
    };

    const loadComments = async () => {
        if (!post?.id) return;

        try {
            setLoading(prev => ({ ...prev, comments: true }));
            const postComments = await getCommunityPostComments(post.id);
            setComments(postComments || []);
        } catch (error) {
            console.error('Error loading comments:', error);
            setComments([]);
        } finally {
            setLoading(prev => ({ ...prev, comments: false }));
        }
    };

    const loadReports = async () => {
        if (!post?.id) return;

        try {
            setLoading(prev => ({ ...prev, reports: true }));
            const postReports = await getCommunityPostReports(post.id);
            setReports(postReports || []);
        } catch (error) {
            console.error('Error loading reports:', error);
            setReports([]);
        } finally {
            setLoading(prev => ({ ...prev, reports: false }));
        }
    };

    const handleDeleteLike = async (likeId) => {
        if (!window.confirm('Remove this like?')) return;

        try {
            setLoading(prev => ({ ...prev, action: true }));
            await deleteCommunityLike(likeId);
            await loadLikes();
            onUpdate?.();
        } catch (error) {
            console.error('Error deleting like:', error);
            alert('Failed to remove like');
        } finally {
            setLoading(prev => ({ ...prev, action: false }));
        }
    };

    const handleDeleteComment = async (commentId) => {
        if (!window.confirm('Delete this comment permanently?')) return;

        try {
            setLoading(prev => ({ ...prev, action: true }));
            await deleteCommunityPostComment(commentId);
            await loadComments();
            onUpdate?.();
        } catch (error) {
            console.error('Error deleting comment:', error);
            alert('Failed to delete comment');
        } finally {
            setLoading(prev => ({ ...prev, action: false }));
        }
    };

    const handleBlockComment = async (commentId, shouldBlock) => {
        try {
            setLoading(prev => ({ ...prev, action: true }));
            await updateCommunityComment(commentId, {
                isBlocked: shouldBlock,
                blockedAt: shouldBlock ? new Date() : null,
                blockedReason: shouldBlock ? 'Blocked by admin' : null
            });
            await loadComments();
        } catch (error) {
            console.error('Error updating comment:', error);
            alert('Failed to update comment');
        } finally {
            setLoading(prev => ({ ...prev, action: false }));
        }
    };

    const handleUpdateReportStatus = async (reportId, status) => {
        try {
            setLoading(prev => ({ ...prev, action: true }));
            await updateCommunityReportStatus(reportId, status);
            await loadReports();
        } catch (error) {
            console.error('Error updating report status:', error);
            alert('Failed to update report status');
        } finally {
            setLoading(prev => ({ ...prev, action: false }));
        }
    };

    const handleDeleteReport = async (reportId) => {
        if (!window.confirm('Delete this report?')) return;

        try {
            setLoading(prev => ({ ...prev, action: true }));
            await deleteCommunityReport(reportId);
            await loadReports();
        } catch (error) {
            console.error('Error deleting report:', error);
            alert('Failed to delete report');
        } finally {
            setLoading(prev => ({ ...prev, action: false }));
        }
    };

    const handleSaveEdit = async () => {
        try {
            setLoading(prev => ({ ...prev, action: true }));
            await updateCommunityPost(post.id, {
                ...editData,
                updatedAt: new Date()
            });

            setEditMode(false);
            onUpdate?.();
            alert('Post updated successfully');
        } catch (error) {
            console.error('Error updating post:', error);
            alert('Failed to update post');
        } finally {
            setLoading(prev => ({ ...prev, action: false }));
        }
    };

    const downloadMedia = async (url, filename) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename || 'media-file';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error('Error downloading media:', error);
            alert('Failed to download media file');
        }
    };

    const copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            alert('Copied to clipboard');
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    };

    const formatTimeAgo = (date) => {
        if (!date) return 'Unknown';
        const now = new Date();
        const postDate = date instanceof Date ? date : new Date(date);
        const diffInSeconds = Math.floor((now - postDate) / 1000);

        if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        return postDate.toLocaleDateString();
    };

    const getUserTypeColor = (userType) => {
        const colors = {
            admin: 'bg-red-100 text-red-800 border-red-200',
            coach: 'bg-blue-100 text-blue-800 border-blue-200',
            parent: 'bg-green-100 text-green-800 border-green-200',
            player: 'bg-purple-100 text-purple-800 border-purple-200',
            official: 'bg-yellow-100 text-yellow-800 border-yellow-200'
        };
        return colors[userType] || 'bg-gray-100 text-gray-800 border-gray-200';
    };

    // Filter functions
    const filteredComments = comments.filter(comment => {
        const matchesSearch = !commentSearch ||
            (comment.userName || '').toLowerCase().includes(commentSearch.toLowerCase()) ||
            (comment.comment || '').toLowerCase().includes(commentSearch.toLowerCase());

        const matchesFilter = commentFilter === 'all' ||
            (commentFilter === 'blocked' && comment.isBlocked) ||
            (commentFilter === 'active' && !comment.isBlocked);

        return matchesSearch && matchesFilter;
    });

    const filteredReports = reports.filter(report => {
        const matchesFilter = reportFilter === 'all' ||
            (reportFilter === 'pending' && report.status !== 'resolved') ||
            (reportFilter === 'resolved' && report.status === 'resolved');

        return matchesFilter;
    });

    const filteredLikes = likes.filter(like => {
        const matchesSearch = !likeSearch ||
            (like.userName || '').toLowerCase().includes(likeSearch.toLowerCase());

        return matchesSearch;
    });

    if (!post) {
        return null;
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center justify-between">
                    <span>Post Management</span>
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">ID:</span>
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">{post.id}</code>
                        <button
                            onClick={() => copyToClipboard(post.id)}
                            className="p-1 hover:bg-gray-100 rounded"
                            title="Copy ID"
                        >
                            <Copy size={14} />
                        </button>
                    </div>
                </div>
            }
            size="lg"
            className="max-h-[95vh] overflow-hidden"
        >
            <div className="flex flex-col h-full">
                {/* Enhanced Tab Navigation */}
                <div className="border-b border-gray-200 px-6 bg-gray-50">
                    <nav className="-mb-px flex space-x-8 overflow-x-auto py-4">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`whitespace-nowrap border-b-2 py-2 px-1 text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === tab.id
                                        ? 'border-primary-500 text-primary-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    <Icon size={16} className={tab.alert ? 'text-red-500' : ''} />
                                    <span>{tab.label}</span>
                                    {tab.count !== null && (
                                        <span className={`px-2 py-1 rounded-full text-xs ${tab.alert
                                            ? 'bg-red-100 text-red-700'
                                            : activeTab === tab.id
                                                ? 'bg-primary-100 text-primary-700'
                                                : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto">
                    {/* Overview Tab */}
                    {activeTab === 'overview' && (
                        <div className="p-6 space-y-6">
                            {/* Post Header */}
                            <div className="flex flex-col lg:flex-row gap-6">
                                <div className="flex items-start gap-4 flex-1">
                                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                                        {(post.authorName || 'U').charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h2 className="text-xl font-bold text-gray-900 truncate">
                                                {post.authorName || 'Unknown User'}
                                            </h2>
                                            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getUserTypeColor(post.authorType)}`}>
                                                {post.authorType || 'user'}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                                            <div className="flex items-center gap-1">
                                                <Calendar size={14} />
                                                <span>{formatTimeAgo(post.createdAt)}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <User size={14} />
                                                <span>ID: {post.authorId || 'N/A'}</span>
                                            </div>
                                            {post.team && (
                                                <div className="flex items-center gap-1">
                                                    <Tag size={14} />
                                                    <span>{post.team}</span>
                                                </div>
                                            )}
                                            {post.location && (
                                                <div className="flex items-center gap-1">
                                                    <MapPin size={14} />
                                                    <span>{post.location}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Status Badges */}
                                <div className="flex flex-wrap gap-2">
                                    {post.isBlocked && (
                                        <span className="px-3 py-2 bg-red-100 text-red-800 rounded-full text-sm font-medium border border-red-200 flex items-center gap-2">
                                            <XCircle size={16} />
                                            BLOCKED
                                        </span>
                                    )}
                                    {(post.reportCount || 0) > 0 && (
                                        <span className="px-3 py-2 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium border border-yellow-200 flex items-center gap-2">
                                            <AlertTriangle size={16} />
                                            {post.reportCount} REPORTS
                                        </span>
                                    )}
                                    <span className={`px-3 py-2 rounded-lg h-12 text-sm font-medium border flex items-center gap-2 ${post.status === 'published'
                                        ? 'bg-green-100 text-green-800 border-green-200'
                                        : post.status === 'draft'
                                            ? 'bg-gray-100 text-gray-800 border-gray-200'
                                            : 'bg-blue-100 text-blue-800 border-blue-200'
                                        }`}>
                                        <CheckCircle size={16} />
                                        {post.status?.toUpperCase() || 'UNKNOWN'}
                                    </span>
                                    {post.visibility && post.visibility !== 'public' && (
                                        <span className="px-3 py-2 bg-purple-100 text-purple-800 rounded-full text-sm font-medium border border-purple-200 flex items-center gap-2">
                                            <Lock size={16} />
                                            {post.visibility.toUpperCase()}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Enhanced Media Gallery */}
                            {post.mediaUrls && post.mediaUrls.length > 0 && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-semibold flex items-center gap-2">
                                            <Image size={20} />
                                            Media Gallery ({post.mediaUrls.length} files)
                                        </h3>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => downloadMedia(post.mediaUrls[selectedMedia], `post-${post.id}-media-${selectedMedia + 1}`)}
                                                className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                                                title="Download current media"
                                            >
                                                <Download size={16} />
                                            </button>
                                            <button
                                                onClick={() => window.open(post.mediaUrls[selectedMedia], '_blank')}
                                                className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                                                title="Open in new tab"
                                            >
                                                <ExternalLink size={16} />
                                            </button>
                                            <button
                                                onClick={() => setIsFullscreen(true)}
                                                className="p-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                                                title="View fullscreen"
                                            >
                                                <Eye size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Main Media Display */}
                                    <div className="bg-gray-900 rounded-xl overflow-hidden">
                                        <div className="relative aspect-video">
                                            {post.mediaUrls[selectedMedia]?.includes('.mp4') ||
                                                post.mediaUrls[selectedMedia]?.includes('video') ||
                                                post.mediaFiles?.[selectedMedia]?.type?.startsWith('video') ? (
                                                <div className="relative w-full h-full">
                                                    <video
                                                        src={post.mediaUrls[selectedMedia]}
                                                        controls
                                                        className="w-full h-full object-contain"
                                                        onPlay={() => setIsVideoPlaying(true)}
                                                        onPause={() => setIsVideoPlaying(false)}
                                                        onVolumeChange={(e) => setIsVideoMuted(e.target.muted)}
                                                        preload="metadata"
                                                    />

                                                    {/* Video Info Overlay */}
                                                    <div className="absolute bottom-4 left-4 bg-black bg-opacity-60 text-white px-3 py-2 rounded-lg">
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <Video size={14} />
                                                            <span>Video {selectedMedia + 1} of {post.mediaUrls.length}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="relative w-full h-full">
                                                    <img
                                                        src={post.mediaUrls[selectedMedia]}
                                                        alt={`Media ${selectedMedia + 1}`}
                                                        className="w-full h-full object-contain cursor-zoom-in"
                                                        onClick={() => setIsFullscreen(true)}
                                                    />

                                                    {/* Image Info Overlay */}
                                                    <div className="absolute bottom-4 left-4 bg-black bg-opacity-60 text-white px-3 py-2 rounded-lg">
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <Image size={14} />
                                                            <span>Image {selectedMedia + 1} of {post.mediaUrls.length}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Navigation Arrows */}
                                            {post.mediaUrls.length > 1 && (
                                                <>
                                                    <button
                                                        onClick={() => setSelectedMedia(prev => prev > 0 ? prev - 1 : post.mediaUrls.length - 1)}
                                                        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-60 text-white p-2 rounded-full hover:bg-opacity-80 transition-colors"
                                                    >
                                                        <ChevronLeft size={20} />
                                                    </button>
                                                    <button
                                                        onClick={() => setSelectedMedia(prev => prev < post.mediaUrls.length - 1 ? prev + 1 : 0)}
                                                        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-60 text-white p-2 rounded-full hover:bg-opacity-80 transition-colors"
                                                    >
                                                        <ChevronRight size={20} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Media Thumbnails */}
                                    {post.mediaUrls.length > 1 && (
                                        <div className="flex gap-2 overflow-x-auto pb-2">
                                            {post.mediaUrls.map((url, index) => (
                                                <button
                                                    key={index}
                                                    onClick={() => setSelectedMedia(index)}
                                                    className={`relative w-20 h-20 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${selectedMedia === index
                                                        ? 'border-primary-500 scale-105'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                        }`}
                                                >
                                                    {url.includes('.mp4') || url.includes('video') ? (
                                                        <div className="relative w-full h-full">
                                                            <video
                                                                src={url}
                                                                className="w-full h-full object-cover"
                                                                muted
                                                                preload="metadata"
                                                            />
                                                            <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                                                                <Video size={16} className="text-white" />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <img
                                                            src={url}
                                                            alt={`Thumbnail ${index + 1}`}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    )}
                                                    <div className="absolute top-1 right-1 bg-black bg-opacity-60 text-white text-xs px-1 rounded">
                                                        {index + 1}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Post Content */}
                            <div className="space-y-4">
                                {post.title && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Post Title</label>
                                        <div className="bg-gray-50 rounded-lg p-4 border">
                                            <h2 className="text-xl font-bold text-gray-800 leading-relaxed">{post.title}</h2>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Caption</label>
                                    <div className="bg-gray-50 rounded-lg p-4 border">
                                        <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                                            {post.caption || 'No caption provided'}
                                        </p>
                                    </div>
                                </div>

                                {post.hashtags && post.hashtags.length > 0 && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Hashtags ({post.hashtags.length})
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {post.hashtags.map((hashtag, index) => (
                                                <span key={index} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm border border-blue-200">
                                                    {hashtag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {post.mentions && post.mentions.length > 0 && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Mentions ({post.mentions.length})
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {post.mentions.map((mention, index) => (
                                                <span key={index} className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm border border-green-200">
                                                    {mention}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Enhanced Engagement Statistics */}
                            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border">
                                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <TrendingUp size={20} />
                                    Engagement Analytics
                                </h3>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <div className="text-center cursor-pointer hover:bg-red-50 p-4 rounded-xl transition-colors border border-red-100"
                                        onClick={() => setActiveTab('likes')}>
                                        <div className="text-3xl font-bold text-red-500 mb-2">{post.likesCount || 0}</div>
                                        <div className="text-sm text-gray-600 flex items-center justify-center gap-2">
                                            <Heart size={16} className="text-red-500" />
                                            Likes
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">Click to manage</div>
                                    </div>

                                    <div className="text-center cursor-pointer hover:bg-blue-50 p-4 rounded-xl transition-colors border border-blue-100"
                                        onClick={() => setActiveTab('comments')}>
                                        <div className="text-3xl font-bold text-blue-500 mb-2">{post.commentsCount || 0}</div>
                                        <div className="text-sm text-gray-600 flex items-center justify-center gap-2">
                                            <MessageCircle size={16} className="text-blue-500" />
                                            Comments
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">Click to moderate</div>
                                    </div>

                                    <div className="text-center p-4 rounded-xl border border-green-100 bg-green-50">
                                        <div className="text-3xl font-bold text-green-500 mb-2">{post.shareCount || 0}</div>
                                        <div className="text-sm text-gray-600 flex items-center justify-center gap-2">
                                            <Share2 size={16} className="text-green-500" />
                                            Shares
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">Total shares</div>
                                    </div>

                                    <div className="text-center cursor-pointer hover:bg-yellow-50 p-4 rounded-xl transition-colors border border-yellow-100"
                                        onClick={() => setActiveTab('reports')}>
                                        <div className="text-3xl font-bold text-yellow-500 mb-2">{post.reportCount || 0}</div>
                                        <div className="text-sm text-gray-600 flex items-center justify-center gap-2">
                                            <Flag size={16} className="text-yellow-500" />
                                            Reports
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">Click to review</div>
                                    </div>
                                </div>

                                <div className="mt-6 pt-4 border-t border-gray-200">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                                        <div>
                                            <div className="text-2xl font-bold text-purple-600">
                                                {((post.likesCount || 0) + (post.commentsCount || 0) + (post.shareCount || 0)).toLocaleString()}
                                            </div>
                                            <div className="text-sm text-gray-600">Total Interactions</div>
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold text-indigo-600">
                                                {post.mediaCount || 0}
                                            </div>
                                            <div className="text-sm text-gray-600">Media Files</div>
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold text-teal-600">
                                                {((post.likesCount || 0) + (post.commentsCount || 0) + (post.shareCount || 0)) > 0
                                                    ? (((post.likesCount || 0) + (post.commentsCount || 0) + (post.shareCount || 0)) / Math.max((post.likesCount || 0) + (post.commentsCount || 0), 1) * 100).toFixed(1)
                                                    : 0}%
                                            </div>
                                            <div className="text-sm text-gray-600">Engagement Rate</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Post Metadata */}
                            <div className="bg-gray-50 rounded-lg p-4 border">
                                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                                    <Clock size={16} />
                                    Post Information
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                                    <div className="flex justify-between">
                                        <span className="font-medium text-gray-600">Post ID:</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-800 font-mono text-xs">{post.id}</span>
                                            <button
                                                onClick={() => copyToClipboard(post.id)}
                                                className="p-1 hover:bg-gray-200 rounded"
                                                title="Copy ID"
                                            >
                                                <Copy size={10} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-medium text-gray-600">Author ID:</span>
                                        <span className="text-gray-800 font-mono text-xs">{post.authorId || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-medium text-gray-600">Created:</span>
                                        <span className="text-gray-800 text-xs">
                                            {post.createdAt
                                                ? new Date(post.createdAt).toLocaleString()
                                                : 'Unknown'
                                            }
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-medium text-gray-600">Updated:</span>
                                        <span className="text-gray-800 text-xs">
                                            {post.updatedAt && post.updatedAt !== post.createdAt
                                                ? new Date(post.updatedAt).toLocaleString()
                                                : 'Never'
                                            }
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-medium text-gray-600">Media Files:</span>
                                        <span className="text-gray-800">{post.mediaCount || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-medium text-gray-600">Category:</span>
                                        <span className="text-gray-800">{post.category || 'General'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Likes Tab */}
                    {activeTab === 'likes' && (
                        <div className="p-6 space-y-4">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <Heart className="text-red-500" size={20} />
                                    Post Likes ({likes.length})
                                </h3>
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <div className="relative flex-1 sm:flex-none">
                                        <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search users..."
                                            value={likeSearch}
                                            onChange={(e) => setLikeSearch(e.target.value)}
                                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 w-full sm:w-64"
                                        />
                                    </div>
                                    <button
                                        onClick={loadLikes}
                                        disabled={loading.likes}
                                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                                    >
                                        <RefreshCw size={16} className={loading.likes ? 'animate-spin' : ''} />
                                        <span className="hidden sm:inline">Refresh</span>
                                    </button>
                                </div>
                            </div>

                            {loading.likes ? (
                                <div className="flex justify-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
                                </div>
                            ) : filteredLikes.length > 0 ? (
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {filteredLikes.map((like) => (
                                        <div key={like.id} className="flex items-center justify-between p-4 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                                                    {(like.userName || 'U').charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-800">{like.userName || 'Unknown User'}</div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getUserTypeColor(like.userType)}`}>
                                                            {like.userType || 'user'}
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            {like.createdAt ? formatTimeAgo(like.createdAt.toDate ? like.createdAt.toDate() : like.createdAt) : 'Unknown time'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Heart size={16} className="text-red-500" fill="currentColor" />
                                                <button
                                                    onClick={() => handleDeleteLike(like.id)}
                                                    disabled={loading.action}
                                                    className="text-red-600 hover:text-red-800 p-2 hover:bg-red-200 rounded transition-colors disabled:opacity-50"
                                                    title="Remove like"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <Heart size={48} className="mx-auto mb-4 text-gray-300" />
                                    <h3 className="text-lg font-medium text-gray-600 mb-2">
                                        {likeSearch ? 'No matching likes found' : 'No Likes Yet'}
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        {likeSearch ? 'Try adjusting your search terms.' : 'This post hasn\'t received any likes yet.'}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Comments Tab */}
                    {activeTab === 'comments' && (
                        <div className="p-6 space-y-4">
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <MessageCircle className="text-blue-500" size={20} />
                                    Post Comments ({comments.length})
                                </h3>
                                <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                                    <div className="relative">
                                        <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search comments..."
                                            value={commentSearch}
                                            onChange={(e) => setCommentSearch(e.target.value)}
                                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 w-full sm:w-64"
                                        />
                                    </div>
                                    <select
                                        value={commentFilter}
                                        onChange={(e) => setCommentFilter(e.target.value)}
                                        className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                        <option value="all">All Comments</option>
                                        <option value="active">Active Only</option>
                                        <option value="blocked">Blocked Only</option>
                                    </select>
                                    <button
                                        onClick={loadComments}
                                        disabled={loading.comments}
                                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                                    >
                                        <RefreshCw size={16} className={loading.comments ? 'animate-spin' : ''} />
                                        <span className="hidden sm:inline">Refresh</span>
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-4 text-sm">
                                <span className="text-gray-600 px-3 py-1 bg-blue-100 rounded-full">
                                    {comments.filter(c => !c.isBlocked).length} active
                                </span>
                                <span className="text-gray-600 px-3 py-1 bg-red-100 rounded-full">
                                    {comments.filter(c => c.isBlocked).length} blocked
                                </span>
                            </div>

                            {loading.comments ? (
                                <div className="flex justify-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
                                </div>
                            ) : filteredComments.length > 0 ? (
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {filteredComments.map((comment) => (
                                        <div key={comment.id} className={`p-4 border rounded-lg transition-all duration-200 ${comment.isBlocked
                                            ? 'bg-red-50 border-red-200 opacity-75'
                                            : 'bg-blue-50 border-blue-100 hover:bg-blue-100'
                                            }`}>
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start gap-3 flex-1">
                                                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                                                        {(comment.userName || 'U').charAt(0)}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="font-medium text-gray-800">
                                                                {comment.userName || 'Unknown User'}
                                                            </span>
                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getUserTypeColor(comment.userType)}`}>
                                                                {comment.userType || 'user'}
                                                            </span>
                                                            <span className="text-xs text-gray-500">
                                                                {formatTimeAgo(comment.createdAt)}
                                                            </span>
                                                            {comment.isBlocked && (
                                                                <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium flex items-center gap-1">
                                                                    <Ban size={10} />
                                                                    BLOCKED
                                                                </span>
                                                            )}
                                                        </div>

                                                        <p className={`text-gray-700 leading-relaxed ${comment.isBlocked ? 'opacity-50 line-through' : ''}`}>
                                                            {comment.comment || 'No comment text'}
                                                        </p>

                                                        {comment.isBlocked && comment.blockedReason && (
                                                            <div className="mt-2 text-xs text-red-600 italic">
                                                                Blocked reason: {comment.blockedReason}
                                                            </div>
                                                        )}

                                                        {comment.likes && comment.likes > 0 && (
                                                            <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                                                                <ThumbsUp size={12} />
                                                                <span>{comment.likes} likes</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1 ml-3">
                                                    <button
                                                        onClick={() => handleBlockComment(comment.id, !comment.isBlocked)}
                                                        disabled={loading.action}
                                                        className={`p-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${comment.isBlocked
                                                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                            : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                                            }`}
                                                        title={comment.isBlocked ? 'Unblock comment' : 'Block comment'}
                                                    >
                                                        {comment.isBlocked ? <Eye size={14} /> : <EyeOff size={14} />}
                                                    </button>
                                                    <button
                                                        onClick={() => copyToClipboard(comment.comment || '')}
                                                        className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                                                        title="Copy comment text"
                                                    >
                                                        <Copy size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteComment(comment.id)}
                                                        disabled={loading.action}
                                                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                                                        title="Delete comment permanently"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <MessageCircle size={48} className="mx-auto mb-4 text-gray-300" />
                                    <h3 className="text-lg font-medium text-gray-600 mb-2">
                                        {commentSearch || commentFilter !== 'all' ? 'No matching comments found' : 'No Comments Yet'}
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        {commentSearch || commentFilter !== 'all'
                                            ? 'Try adjusting your search terms or filters.'
                                            : 'This post hasn\'t received any comments yet.'}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Reports Tab */}
                    {activeTab === 'reports' && (
                        <div className="p-6 space-y-4">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <Flag className="text-yellow-500" size={20} />
                                    Post Reports ({reports.length})
                                </h3>
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <select
                                        value={reportFilter}
                                        onChange={(e) => setReportFilter(e.target.value)}
                                        className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 flex-1 sm:flex-none"
                                    >
                                        <option value="all">All Reports</option>
                                        <option value="pending">Pending</option>
                                        <option value="resolved">Resolved</option>
                                    </select>
                                    <button
                                        onClick={loadReports}
                                        disabled={loading.reports}
                                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                                    >
                                        <RefreshCw size={16} className={loading.reports ? 'animate-spin' : ''} />
                                        <span className="hidden sm:inline">Refresh</span>
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-4 text-sm">
                                <span className="text-gray-600 px-3 py-1 bg-yellow-100 rounded-full">
                                    {reports.filter(r => r.status !== 'resolved').length} pending
                                </span>
                                <span className="text-gray-600 px-3 py-1 bg-green-100 rounded-full">
                                    {reports.filter(r => r.status === 'resolved').length} resolved
                                </span>
                            </div>

                            {loading.reports ? (
                                <div className="flex justify-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
                                </div>
                            ) : filteredReports.length > 0 ? (
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {filteredReports.map((report) => (
                                        <div key={report.id} className={`p-4 border rounded-lg transition-colors ${report.status === 'resolved'
                                            ? 'bg-green-50 border-green-200'
                                            : report.priority === 'high'
                                                ? 'bg-red-50 border-red-200'
                                                : 'bg-yellow-50 border-yellow-200'
                                            }`}>
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start gap-3 flex-1">
                                                    <Flag size={20} className={`mt-1 flex-shrink-0 ${report.status === 'resolved' ? 'text-green-600' :
                                                        report.priority === 'high' ? 'text-red-600' : 'text-yellow-600'
                                                        }`} />
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="font-medium text-gray-800">
                                                                Reported by: {report.reporterName || 'Anonymous'}
                                                            </span>
                                                            {report.reporterType && (
                                                                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getUserTypeColor(report.reporterType)}`}>
                                                                    {report.reporterType}
                                                                </span>
                                                            )}
                                                            <span className="text-xs text-gray-500">
                                                                {formatTimeAgo(report.createdAt)}
                                                            </span>
                                                        </div>

                                                        <div className="space-y-2 mb-3">
                                                            <div>
                                                                <span className="text-sm font-medium text-gray-700">Reason: </span>
                                                                <span className="text-sm text-gray-600">{report.reason || 'No reason provided'}</span>
                                                            </div>

                                                            {report.description && (
                                                                <div>
                                                                    <span className="text-sm font-medium text-gray-700">Details: </span>
                                                                    <p className="text-sm text-gray-600 mt-1">{report.description}</p>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${report.status === 'resolved' ? 'bg-green-100 text-green-800' :
                                                                report.status === 'reviewing' ? 'bg-blue-100 text-blue-800' :
                                                                    'bg-gray-100 text-gray-800'
                                                                }`}>
                                                                {report.status?.toUpperCase() || 'PENDING'}
                                                            </span>
                                                            {report.priority && (
                                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${report.priority === 'high' ? 'bg-red-100 text-red-800' :
                                                                    report.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                                                        'bg-green-100 text-green-800'
                                                                    }`}>
                                                                    {report.priority.toUpperCase()} PRIORITY
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1 ml-3">
                                                    {report.status !== 'resolved' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleUpdateReportStatus(report.id, 'reviewing')}
                                                                disabled={loading.action}
                                                                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs hover:bg-blue-200 transition-colors disabled:opacity-50"
                                                                title="Mark as reviewing"
                                                            >
                                                                <Eye size={12} className="mr-1" />
                                                                Review
                                                            </button>
                                                            <button
                                                                onClick={() => handleUpdateReportStatus(report.id, 'resolved')}
                                                                disabled={loading.action}
                                                                className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs hover:bg-green-200 transition-colors disabled:opacity-50"
                                                                title="Mark as resolved"
                                                            >
                                                                <CheckCircle size={12} className="mr-1" />
                                                                Resolve
                                                            </button>
                                                        </>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteReport(report.id)}
                                                        disabled={loading.action}
                                                        className="p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded transition-colors disabled:opacity-50"
                                                        title="Delete report"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <Flag size={48} className="mx-auto mb-4 text-gray-300" />
                                    <h3 className="text-lg font-medium text-gray-600 mb-2">
                                        {reportFilter !== 'all' ? 'No matching reports found' : 'No Reports'}
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        {reportFilter !== 'all'
                                            ? 'Try adjusting your filters.'
                                            : 'This post hasn\'t been reported by anyone.'}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Analytics Tab */}
                    {activeTab === 'analytics' && (
                        <div className="p-6 space-y-6">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Activity size={20} />
                                Post Analytics
                            </h3>

                            {/* Engagement Overview */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl border border-red-200">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Heart size={24} className="text-red-600" />
                                        <div>
                                            <div className="text-2xl font-bold text-red-600">{post.likesCount || 0}</div>
                                            <div className="text-sm text-red-700">Total Likes</div>
                                        </div>
                                    </div>
                                    <div className="text-xs text-red-600">
                                        {likes.length > 0 ? `${(((post.likesCount || 0) / likes.length) * 100).toFixed(1)}% engagement` : 'No data'}
                                    </div>
                                </div>

                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                                    <div className="flex items-center gap-3 mb-2">
                                        <MessageCircle size={24} className="text-blue-600" />
                                        <div>
                                            <div className="text-2xl font-bold text-blue-600">{post.commentsCount || 0}</div>
                                            <div className="text-sm text-blue-700">Comments</div>
                                        </div>
                                    </div>
                                    <div className="text-xs text-blue-600">
                                        {comments.length > 0 ? `${comments.filter(c => !c.isBlocked).length} active` : 'No comments'}
                                    </div>
                                </div>

                                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Share2 size={24} className="text-green-600" />
                                        <div>
                                            <div className="text-2xl font-bold text-green-600">{post.shareCount || 0}</div>
                                            <div className="text-sm text-green-700">Shares</div>
                                        </div>
                                    </div>
                                    <div className="text-xs text-green-600">
                                        Viral coefficient: {((post.shareCount || 0) / Math.max((post.likesCount || 0), 1) * 100).toFixed(1)}%
                                    </div>
                                </div>

                                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                                    <div className="flex items-center gap-3 mb-2">
                                        <TrendingUp size={24} className="text-purple-600" />
                                        <div>
                                            <div className="text-2xl font-bold text-purple-600">
                                                {((post.likesCount || 0) + (post.commentsCount || 0) + (post.shareCount || 0)).toLocaleString()}
                                            </div>
                                            <div className="text-sm text-purple-700">Total Engagement</div>
                                        </div>
                                    </div>
                                    <div className="text-xs text-purple-600">
                                        Engagement rate: {((((post.likesCount || 0) + (post.commentsCount || 0) + (post.shareCount || 0)) / Math.max((post.likesCount || 0) + (post.commentsCount || 0), 1)) * 100).toFixed(1)}%
                                    </div>
                                </div>
                            </div>

                            {/* Performance Insights */}
                            <div className="bg-gray-50 rounded-xl p-6 border">
                                <h4 className="font-semibold text-gray-800 mb-4">Performance Insights</h4>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between py-2">
                                        <span className="text-gray-600">Post Reach</span>
                                        <span className="font-medium">
                                            {((post.likesCount || 0) + (post.commentsCount || 0) + (post.shareCount || 0)) > 0 ? 'High' : 'Low'} Impact
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between py-2">
                                        <span className="text-gray-600">Content Type</span>
                                        <span className="font-medium">
                                            {post.hasVideo ? 'Video Content' : post.hasImage ? 'Image Content' : 'Text Only'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between py-2">
                                        <span className="text-gray-600">Community Response</span>
                                        <span className={`font-medium ${(post.reportCount || 0) > 0 ? 'text-red-600' :
                                            (post.commentsCount || 0) > (post.likesCount || 0) ? 'text-blue-600' : 'text-green-600'
                                            }`}>
                                            {(post.reportCount || 0) > 0 ? 'Mixed/Controversial' :
                                                (post.commentsCount || 0) > (post.likesCount || 0) ? 'Discussion Heavy' : 'Positive'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between py-2">
                                        <span className="text-gray-600">Content Health</span>
                                        <span className={`font-medium flex items-center gap-2 ${post.isBlocked ? 'text-red-600' : 'text-green-600'
                                            }`}>
                                            {post.isBlocked ? (
                                                <>
                                                    <XCircle size={16} />
                                                    Blocked
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle size={16} />
                                                    Healthy
                                                </>
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Time-based Analytics */}
                            <div className="bg-gray-50 rounded-xl p-6 border">
                                <h4 className="font-semibold text-gray-800 mb-4">Timeline Analysis</h4>
                                <div className="space-y-3">
                                    <div>
                                        <div className="text-sm text-gray-600 mb-1">Post Age</div>
                                        <div className="font-medium">
                                            {post.createdAt ? Math.floor((new Date() - new Date(post.createdAt)) / (1000 * 60 * 60 * 24)) : 0} days old
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-gray-600 mb-1">Last Activity</div>
                                        <div className="font-medium">
                                            {post.updatedAt && post.updatedAt !== post.createdAt
                                                ? formatTimeAgo(post.updatedAt)
                                                : 'No recent activity'
                                            }
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-gray-600 mb-1">Engagement Velocity</div>
                                        <div className="font-medium">
                                            {post.createdAt ?
                                                (((post.likesCount || 0) + (post.commentsCount || 0)) /
                                                    Math.max(Math.floor((new Date() - new Date(post.createdAt)) / (1000 * 60 * 60 * 24)), 1)).toFixed(1)
                                                : 0
                                            } interactions/day
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Edit Tab */}
                    {activeTab === 'edit' && (
                        <div className="p-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <Edit3 size={20} />
                                    Edit Post
                                </h3>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setEditMode(false);
                                            setEditData({
                                                title: post.title || '',
                                                caption: post.caption || '',
                                                team: post.team || '',
                                                status: post.status || 'published',
                                                allowComments: post.allowComments !== false,
                                                allowSharing: post.allowSharing !== false
                                            });
                                        }}
                                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        Reset
                                    </button>
                                    <button
                                        onClick={handleSaveEdit}
                                        disabled={loading.action}
                                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {loading.action ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle size={16} />
                                                Save Changes
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Post Title
                                        </label>
                                        <input
                                            type="text"
                                            value={editData.title}
                                            onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
                                            className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                            placeholder="Enter post title..."
                                            maxLength={150}
                                        />
                                        <div className="text-xs text-gray-500 mt-1">
                                            {editData.title.length}/150 characters
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Caption
                                        </label>
                                        <textarea
                                            value={editData.caption}
                                            onChange={(e) => setEditData(prev => ({ ...prev, caption: e.target.value }))}
                                            className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                                            rows={8}
                                            placeholder="Edit your post caption..."
                                            maxLength={2200}
                                        />
                                        <div className="text-xs text-gray-500 mt-1">
                                            {editData.caption.length}/2200 characters
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Team/Category
                                            </label>
                                            <input
                                                type="text"
                                                value={editData.team}
                                                onChange={(e) => setEditData(prev => ({ ...prev, team: e.target.value }))}
                                                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                                placeholder="Team or category..."
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Status
                                            </label>
                                            <select
                                                value={editData.status}
                                                onChange={(e) => setEditData(prev => ({ ...prev, status: e.target.value }))}
                                                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                            >
                                                <option value="published">Published</option>
                                                <option value="draft">Draft</option>
                                                <option value="scheduled">Scheduled</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-medium text-gray-700">Post Settings</label>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={editData.allowComments}
                                                    onChange={(e) => setEditData(prev => ({ ...prev, allowComments: e.target.checked }))}
                                                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                                />
                                                <span className="ml-2 text-sm text-gray-700">Allow comments</span>
                                            </label>

                                            <label className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={editData.allowSharing}
                                                    onChange={(e) => setEditData(prev => ({ ...prev, allowSharing: e.target.checked }))}
                                                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                                />
                                                <span className="ml-2 text-sm text-gray-700">Allow sharing</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Edit Preview
                                        </label>
                                        <div className="border border-gray-200 rounded-xl p-4 bg-gradient-to-br from-gray-50 to-white max-h-96 overflow-y-auto">
                                            {/* Preview header */}
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                                    {(post.authorName || 'U').charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-gray-800">{post.authorName}</div>
                                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                                            {post.authorType}
                                                        </span>
                                                        <span>•</span>
                                                        <span>
                                                            {editData.status === 'scheduled'
                                                                ? `Scheduled`
                                                                : formatTimeAgo(post.createdAt)
                                                            }
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Preview content */}
                                            {editData.title && (
                                                <h4 className="font-bold text-gray-800 mb-3 text-lg">{editData.title}</h4>
                                            )}

                                            <div className="mb-4">
                                                <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                                                    {editData.caption || 'No caption provided'}
                                                </p>
                                            </div>

                                            {/* Preview tags */}
                                            <div className="flex flex-wrap gap-2 mb-4">
                                                {editData.team && (
                                                    <span className="text-sm text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
                                                        {editData.team}
                                                    </span>
                                                )}
                                                <span className={`text-sm px-3 py-1 rounded-full ${editData.status === 'published' ? 'text-green-600 bg-green-100' :
                                                    editData.status === 'draft' ? 'text-gray-600 bg-gray-100' :
                                                        'text-blue-600 bg-blue-100'
                                                    }`}>
                                                    {editData.status.toUpperCase()}
                                                </span>
                                            </div>

                                            {/* Preview engagement */}
                                            <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                                    <div className="flex items-center gap-1">
                                                        <Heart size={14} />
                                                        <span>{post.likesCount || 0}</span>
                                                    </div>
                                                    {editData.allowComments && (
                                                        <div className="flex items-center gap-1">
                                                            <MessageCircle size={14} />
                                                            <span>{post.commentsCount || 0}</span>
                                                        </div>
                                                    )}
                                                    {editData.allowSharing && (
                                                        <div className="flex items-center gap-1">
                                                            <Share2 size={14} />
                                                            <span>{post.shareCount || 0}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="text-xs text-gray-400">
                                                    Preview Mode
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Change Summary */}
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                        <h5 className="font-medium text-yellow-800 mb-2">Changes Summary</h5>
                                        <div className="space-y-1 text-sm text-yellow-700">
                                            {editData.title !== (post.title || '') && (
                                                <div>• Title updated</div>
                                            )}
                                            {editData.caption !== (post.caption || '') && (
                                                <div>• Caption modified</div>
                                            )}
                                            {editData.team !== (post.team || '') && (
                                                <div>• Team/category changed</div>
                                            )}
                                            {editData.status !== (post.status || 'published') && (
                                                <div>• Status changed to {editData.status}</div>
                                            )}
                                            {editData.allowComments !== (post.allowComments !== false) && (
                                                <div>• Comments {editData.allowComments ? 'enabled' : 'disabled'}</div>
                                            )}
                                            {editData.allowSharing !== (post.allowSharing !== false) && (
                                                <div>• Sharing {editData.allowSharing ? 'enabled' : 'disabled'}</div>
                                            )}
                                            {editData.title === (post.title || '') &&
                                                editData.caption === (post.caption || '') &&
                                                editData.team === (post.team || '') &&
                                                editData.status === (post.status || 'published') &&
                                                editData.allowComments === (post.allowComments !== false) &&
                                                editData.allowSharing === (post.allowSharing !== false) && (
                                                    <div className="text-gray-600">No changes made</div>
                                                )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Fullscreen Media Modal */}
                {isFullscreen && post.mediaUrls && post.mediaUrls.length > 0 && (
                    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
                        <div className="relative max-w-full max-h-full">
                            <button
                                onClick={() => setIsFullscreen(false)}
                                className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
                            >
                                <X size={24} />
                            </button>

                            {post.mediaUrls[selectedMedia]?.includes('.mp4') ||
                                post.mediaUrls[selectedMedia]?.includes('video') ? (
                                <video
                                    src={post.mediaUrls[selectedMedia]}
                                    controls
                                    className="max-w-full max-h-full object-contain"
                                    autoPlay
                                />
                            ) : (
                                <img
                                    src={post.mediaUrls[selectedMedia]}
                                    alt={`Fullscreen media ${selectedMedia + 1}`}
                                    className="max-w-full max-h-full object-contain"
                                />
                            )}

                            {/* Navigation in fullscreen */}
                            {post.mediaUrls.length > 1 && (
                                <>
                                    <button
                                        onClick={() => setSelectedMedia(prev => prev > 0 ? prev - 1 : post.mediaUrls.length - 1)}
                                        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-60 text-white p-3 rounded-full hover:bg-opacity-80 transition-colors"
                                    >
                                        <ChevronLeft size={24} />
                                    </button>
                                    <button
                                        onClick={() => setSelectedMedia(prev => prev < post.mediaUrls.length - 1 ? prev + 1 : 0)}
                                        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-60 text-white p-3 rounded-full hover:bg-opacity-80 transition-colors"
                                    >
                                        <ChevronRight size={24} />
                                    </button>

                                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-60 text-white px-4 py-2 rounded-lg">
                                        {selectedMedia + 1} of {post.mediaUrls.length}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Enhanced Action Buttons */}
                {/* Enhanced Action Buttons */}
                <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
                    <div className="flex flex-col lg:flex-row gap-3">
                        {/* Primary Actions */}
                        <div className="flex gap-3 flex-1">
                            <button
                                onClick={onClose}
                                disabled={loading.action}
                                className="flex-1 lg:flex-none px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium transition-colors disabled:opacity-50"
                            >
                                Close
                            </button>

                            <button
                                onClick={() => copyToClipboard(`${window.location.origin}/post/${post.id}`)}
                                className="flex-1 lg:flex-none px-6 py-3 border border-blue-300 text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 font-medium transition-colors flex items-center justify-center gap-2"
                                title="Copy post link"
                            >
                                <Copy size={16} />
                                <span className="hidden sm:inline">Copy Link</span>
                            </button>

                            {/* Pin/Unpin Button */}
                            <button
                                onClick={() => handlePinPost(!post.isPinned)}
                                disabled={loading.action}
                                className={`flex-1 lg:flex-none px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${post.isPinned
                                    ? 'bg-yellow-100 border border-yellow-300 text-yellow-700 hover:bg-yellow-200'
                                    : 'bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-200'
                                    }`}
                                title={post.isPinned ? 'Unpin from top' : 'Pin to top'}
                            >
                                <Pin size={16} className={post.isPinned ? 'fill-current' : ''} />
                                <span className="hidden sm:inline">
                                    {post.isPinned ? 'Unpin' : 'Pin'}
                                </span>
                            </button>
                        </div>

                        {/* Admin Actions */}
                        <div className="flex gap-3">
                            {/* Quick Edit Toggle */}
                            <button
                                onClick={() => setActiveTab('edit')}
                                disabled={loading.action}
                                className="flex-1 lg:flex-none px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <Edit3 size={16} />
                                <span className="hidden sm:inline">Quick Edit</span>
                            </button>

                            <button
                                onClick={() => onBlock(!post.isBlocked)}
                                disabled={loading.action}
                                className={`flex-1 lg:flex-none px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${post.isBlocked
                                    ? 'bg-green-500 text-white hover:bg-green-600'
                                    : 'bg-yellow-500 text-white hover:bg-yellow-600'
                                    }`}
                            >
                                {loading.action ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        <span className="hidden sm:inline">Processing...</span>
                                    </>
                                ) : (
                                    <>
                                        {post.isBlocked ? <Eye size={16} /> : <EyeOff size={16} />}
                                        <span className="hidden sm:inline">
                                            {post.isBlocked ? 'Unblock' : 'Block'}
                                        </span>
                                    </>
                                )}
                            </button>

                            <button
                                onClick={() => {
                                    if (window.confirm('⚠️ Are you sure you want to delete this post?\n\nThis will permanently delete:\n• The post and all its content\n• All likes and comments\n• All reports\n• All media files\n\nThis action cannot be undone!')) {
                                        onDelete();
                                    }
                                }}
                                disabled={loading.action}
                                className="flex-1 lg:flex-none px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading.action ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        <span className="hidden sm:inline">Deleting...</span>
                                    </>
                                ) : (
                                    <>
                                        <Trash2 size={16} />
                                        <span className="hidden sm:inline">Delete</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default PostDetailModal;