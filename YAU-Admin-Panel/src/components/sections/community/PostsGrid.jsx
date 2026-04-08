// components/admin/community/PostsGrid.js
import React, { useState } from 'react';
import {
    Heart,
    MessageCircle,
    Share2,
    Eye,
    EyeOff,
    Trash2,
    Play,
    Pause,
    Volume2,
    VolumeX,
    Download,
    ExternalLink,
    Flag,
    Image,
    Video
} from 'lucide-react';

const PostsGrid = ({
    posts,
    viewMode,
    selectedPosts,
    setSelectedPosts,
    onPostClick,
    onBlockPost,
    onDeletePost,
    loading
}) => {
    const [hoveredPost, setHoveredPost] = useState(null);
    const [playingVideos, setPlayingVideos] = useState(new Set());
    const [mutedVideos, setMutedVideos] = useState(new Set());

    
    const handleSelectPost = (postId, event) => {
        event.stopPropagation();
        const newSelected = new Set(selectedPosts);
        if (newSelected.has(postId)) {
            newSelected.delete(postId);
        } else {
            newSelected.add(postId);
        }
        setSelectedPosts(newSelected);
    };

    const handleSelectAll = (event) => {
        if (event.target.checked) {
            setSelectedPosts(new Set(posts.map(post => post.id)));
        } else {
            setSelectedPosts(new Set());
        }
    };

    const toggleVideoPlay = (postId, videoElement) => {
        const newPlaying = new Set(playingVideos);
        if (newPlaying.has(postId)) {
            videoElement.pause();
            newPlaying.delete(postId);
        } else {
            videoElement.play();
            newPlaying.add(postId);
        }
        setPlayingVideos(newPlaying);
    };

    const toggleVideoMute = (postId, videoElement) => {
        const newMuted = new Set(mutedVideos);
        if (newMuted.has(postId)) {
            videoElement.muted = false;
            newMuted.delete(postId);
        } else {
            videoElement.muted = true;
            newMuted.add(postId);
        }
        setMutedVideos(newMuted);
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

    const getPostStatusColor = (post) => {
        if (post.isBlocked) return 'bg-red-100 text-red-800 border-red-200';
        if ((post.reportCount || 0) > 0) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        if (post.status === 'published') return 'bg-green-100 text-green-800 border-green-200';
        if (post.status === 'draft') return 'bg-gray-100 text-gray-800 border-gray-200';
        return 'bg-blue-100 text-blue-800 border-blue-200';
    };

    const getPostStatusText = (post) => {
        if (post.isBlocked) return 'BLOCKED';
        if ((post.reportCount || 0) > 0) return `${post.reportCount} REPORTS`;
        if (post.status === 'published') return 'PUBLISHED';
        if (post.status === 'draft') return 'DRAFT';
        return 'SCHEDULED';
    };



    if (viewMode === 'list') {
        return (
            <div className="space-y-4">
                {/* Select All Header */}
                <div className="flex items-center gap-3 p-3 sm:p-4 bg-gray-50 rounded-lg border">
                    <input
                        type="checkbox"
                        checked={selectedPosts.size === posts.length}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                        <span className="hidden sm:inline">Select All ({posts.length} posts)</span>
                        <span className="sm:hidden">All ({posts.length})</span>
                    </span>
                </div>

                {/* List View */}
                {posts.map((post) => (
                    <div
                        key={post.id}
                        className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 hover:shadow-lg transition-all duration-200"
                    >
                        {/* Mobile Layout */}
                        <div className="sm:hidden">
                            {/* Mobile Header */}
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-start gap-2">
                                    <input
                                        type="checkbox"
                                        checked={selectedPosts.has(post.id)}
                                        onChange={(e) => handleSelectPost(post.id, e)}
                                        className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                    />
                                    <div className="flex-1">
                                        <div className="flex flex-wrap items-center gap-1 mb-2">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPostStatusColor(post)}`}>
                                                {getPostStatusText(post)}
                                            </span>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getUserTypeColor(post.authorType)}`}>
                                                {post.authorType || 'user'}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-500 mb-2">
                                            by {post.authorName} • {formatTimeAgo(post.createdAt)}
                                        </div>
                                    </div>
                                </div>

                                {/* Mobile Actions */}
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => onPostClick(post)}
                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="View Details"
                                    >
                                        <Eye size={14} />
                                    </button>
                                    <button
                                        onClick={() => onBlockPost(post.id, !post.isBlocked)}
                                        className={`p-1.5 rounded-lg transition-colors ${post.isBlocked
                                                ? 'text-green-600 hover:bg-green-50'
                                                : 'text-yellow-600 hover:bg-yellow-50'
                                            }`}
                                        title={post.isBlocked ? 'Unblock' : 'Block'}
                                    >
                                        {post.isBlocked ? <Eye size={14} /> : <EyeOff size={14} />}
                                    </button>
                                    <button
                                        onClick={() => onDeletePost(post.id)}
                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Mobile Content */}
                            <div className="space-y-3">
                                {/* Media */}
                                {post.mediaUrls && post.mediaUrls.length > 0 && (
                                    <div className="w-full h-40 bg-gray-100 rounded-lg overflow-hidden">
                                        <div className="relative w-full h-full">
                                            {post.hasVideo ? (
                                                <video
                                                    src={post.mediaUrls}
                                                    className="w-full h-full object-cover"
                                                    muted
                                                />
                                            ) : (
                                                <img
                                                    src={post.mediaUrls[0]}
                                                    alt="Post media"
                                                    className="w-full h-full object-cover"
                                                />
                                            )}
                                            {post.mediaUrls.length > 1 && (
                                                <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                                                    +{post.mediaUrls.length - 1}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Text Content */}
                                <div>
                                    {post.title && (
                                        <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2">
                                            {post.title}
                                        </h3>
                                    )}
                                    <p className="text-gray-600 text-sm line-clamp-3 mb-3">
                                        {post.caption || 'No caption'}
                                    </p>
                                </div>

                                {/* Mobile Stats */}
                                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                    <div className="flex items-center gap-3 text-sm text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <Heart size={14} className="text-red-500" />
                                            {post.likesCount || 0}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <MessageCircle size={14} className="text-blue-500" />
                                            {post.commentsCount || 0}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Share2 size={14} className="text-green-500" />
                                            {post.shareCount || 0}
                                        </span>
                                    </div>
                                    {(post.reportCount || 0) > 0 && (
                                        <span className="flex items-center gap-1 text-yellow-600 text-sm">
                                            <Flag size={14} />
                                            {post.reportCount} reports
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Desktop Layout - Hidden on Mobile */}
                        <div className="hidden sm:flex items-start gap-4">
                            <input
                                type="checkbox"
                                checked={selectedPosts.has(post.id)}
                                onChange={(e) => handleSelectPost(post.id, e)}
                                className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />

                            {/* Media Thumbnail */}
                            <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                {post.mediaUrls && post.mediaUrls.length > 0 ? (
                                    <div className="relative w-full h-full">
                                        {post.hasVideo ? (
                                            <video
                                                src={post.mediaUrls[0]}
                                                className="w-full h-full object-cover"
                                                muted
                                            />
                                        ) : (
                                            <img
                                                src={post.mediaUrls[0]}
                                                alt="Post media"
                                                className="w-full h-full object-cover"
                                            />
                                        )}
                                        {post.mediaUrls.length > 1 && (
                                            <div className="absolute bottom-1 right-1 bg-black bg-opacity-60 text-white text-xs px-1 rounded">
                                                +{post.mediaUrls.length - 1}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-400">
                                        <Image size={24} />
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPostStatusColor(post)}`}>
                                        {getPostStatusText(post)}
                                    </span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getUserTypeColor(post.authorType)}`}>
                                        {post.authorType || 'user'}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        by {post.authorName} • {formatTimeAgo(post.createdAt)}
                                    </span>
                                </div>

                                {post.title && (
                                    <h3 className="font-semibold text-gray-800 mb-1 line-clamp-1">
                                        {post.title}
                                    </h3>
                                )}

                                <p className="text-gray-600 text-sm line-clamp-2 mb-2">
                                    {post.caption || 'No caption'}
                                </p>

                                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                                    <span className="flex items-center gap-1">
                                        <Heart size={14} className="text-red-500" />
                                        {post.likesCount || 0}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <MessageCircle size={14} className="text-blue-500" />
                                        {post.commentsCount || 0}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Share2 size={14} className="text-green-500" />
                                        {post.shareCount || 0}
                                    </span>
                                    {(post.reportCount || 0) > 0 && (
                                        <span className="flex items-center gap-1 text-yellow-600">
                                            <Flag size={14} />
                                            {post.reportCount}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Desktop Actions */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => onPostClick(post)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="View Details"
                                >
                                    <Eye size={16} />
                                </button>
                                <button
                                    onClick={() => onBlockPost(post.id, !post.isBlocked)}
                                    className={`p-2 rounded-lg transition-colors ${post.isBlocked
                                            ? 'text-green-600 hover:bg-green-50'
                                            : 'text-yellow-600 hover:bg-yellow-50'
                                        }`}
                                    title={post.isBlocked ? 'Unblock' : 'Block'}
                                >
                                    {post.isBlocked ? <Eye size={16} /> : <EyeOff size={16} />}
                                </button>
                                <button
                                    onClick={() => onDeletePost(post.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    // Grid View (default)
    return (
        <>
            {/* Select All Header for Grid */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border mb-6">
                <div className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        checked={selectedPosts.size === posts.length}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                        Select All ({posts.length} posts)
                    </span>
                </div>
                {selectedPosts.size > 0 && (
                    <div className="text-sm text-blue-600 font-medium">
                        {selectedPosts.size} selected
                    </div>
                )}
            </div>

            {/* Grid Layout with Fixed Heights */}
            <div className={`grid gap-4 sm:gap-6 ${viewMode === 'detailed'
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                }`}>
                {posts.map((post) => (
                    <div
                        key={post.id}
                        className={`bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 group cursor-pointer flex flex-col ${
                            viewMode === 'detailed' 
                            ? 'h-[520px] sm:h-[540px]' 
                            : 'h-[440px] sm:h-[460px]'
                        }`}
                        onMouseEnter={() => setHoveredPost(post.id)}
                        onMouseLeave={() => setHoveredPost(null)}
                        onClick={() => onPostClick(post)}
                    >
                        {/* Selection Checkbox */}
                        <div className="absolute top-3 left-3 z-10">
                            <input
                                type="checkbox"
                                checked={selectedPosts.has(post.id)}
                                onChange={(e) => handleSelectPost(post.id, e)}
                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 bg-white shadow-lg"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>

                        {/* Media Section with Fixed Height */}
                        <div className="relative h-48 sm:h-52 bg-gray-100 flex-shrink-0">
                            {post.mediaUrls && post.mediaUrls.length > 0 ? (
                                <div className="relative w-full h-full">
                                    {post.hasVideo ? (
                                        <div className="relative w-full h-full">
                                            <video
                                                ref={(el) => {
                                                    if (el) {
                                                        el.onplay = () => setPlayingVideos(prev => new Set([...prev, post.id]));
                                                        el.onpause = () => setPlayingVideos(prev => {
                                                            const newSet = new Set(prev);
                                                            newSet.delete(post.id);
                                                            return newSet;
                                                        });
                                                    }
                                                }}
                                                src={post.mediaUrls[0]}
                                                className="w-full h-full object-cover"
                                                muted={mutedVideos.has(post.id)}
                                                loop
                                                preload="metadata"
                                            />

                                            {/* Video Controls */}
                                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                                                <div className={`${hoveredPost === post.id ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300 flex gap-2`}>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const video = e.target.closest('.relative').querySelector('video');
                                                            toggleVideoPlay(post.id, video);
                                                        }}
                                                        className="bg-white bg-opacity-90 text-gray-800 p-2 rounded-full hover:bg-opacity-100 transition-colors"
                                                    >
                                                        {playingVideos.has(post.id) ? <Pause size={16} /> : <Play size={16} />}
                                                    </button>

                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const video = e.target.closest('.relative').querySelector('video');
                                                            toggleVideoMute(post.id, video);
                                                        }}
                                                        className="bg-white bg-opacity-90 text-gray-800 p-2 rounded-full hover:bg-opacity-100 transition-colors"
                                                    >
                                                        {mutedVideos.has(post.id) ? <VolumeX size={16} /> : <Volume2 size={16} />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <img
                                            src={post.mediaUrls[0]}
                                            alt={post.title || 'Post media'}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            loading="lazy"
                                        />
                                    )}

                                    {/* Media Indicators */}
                                    <div className="absolute top-3 right-3 flex gap-1">
                                        {post.hasVideo && (
                                            <div className="bg-black bg-opacity-60 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                                                <Video size={12} />
                                            </div>
                                        )}
                                        {post.mediaUrls.length > 1 && (
                                            <div className="bg-black bg-opacity-60 text-white px-2 py-1 rounded-full text-xs">
                                                +{post.mediaUrls.length - 1}
                                            </div>
                                        )}
                                    </div>

                                    {/* Status Overlay */}
                                    <div className="absolute bottom-3 left-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPostStatusColor(post)}`}>
                                            {getPostStatusText(post)}
                                        </span>
                                    </div>

                                    {/* Quick Actions Menu */}
                                    <div className="absolute bottom-3 right-3">
                                        <div className={`${hoveredPost === post.id ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300 flex gap-1`}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    downloadMedia(post.mediaUrls[0], `post-${post.id}-media`);
                                                }}
                                                className="bg-white bg-opacity-90 text-gray-800 p-1.5 rounded-full hover:bg-opacity-100 transition-colors"
                                                title="Download"
                                            >
                                                <Download size={12} />
                                            </button>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.open(post.mediaUrls[0], '_blank');
                                                }}
                                                className="bg-white bg-opacity-90 text-gray-800 p-1.5 rounded-full hover:bg-opacity-100 transition-colors"
                                                title="Open in new tab"
                                            >
                                                <ExternalLink size={12} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Blocked Overlay */}
                                    {post.isBlocked && (
                                        <div className="absolute inset-0 bg-red-500 bg-opacity-80 flex items-center justify-center">
                                            <div className="text-white text-center">
                                                <EyeOff size={32} className="mx-auto mb-2" />
                                                <div className="text-sm font-medium">BLOCKED CONTENT</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-400">
                                    <div className="text-center">
                                        <Image size={32} className="mx-auto mb-2" />
                                        <div className="text-sm">Text Only Post</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Post Info - Fixed Height with Flex Layout */}
                        <div className="flex flex-col flex-1 p-3 sm:p-4">
                            {/* Author & Time - Fixed Height */}
                            <div className="flex items-center justify-between mb-2 h-8 flex-shrink-0">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                        {(post.authorName || 'U').charAt(0)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="font-medium text-xs truncate">{post.authorName || 'Unknown'}</div>
                                        {viewMode === 'detailed' && (
                                            <div className={`px-1.5 py-0.5 rounded-full text-xs font-medium border inline-block mt-1 ${getUserTypeColor(post.authorType)}`}>
                                                {post.authorType || 'user'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="text-xs text-gray-500 text-right flex-shrink-0">
                                    <div>{formatTimeAgo(post.createdAt)}</div>
                                </div>
                            </div>

                            {/* Content Area - Flexible Height */}
                            <div className="flex-1 flex flex-col min-h-0">
                                {/* Title - for detailed view */}
                                {viewMode === 'detailed' && post.title && (
                                    <h4 className="font-semibold text-gray-800 mb-2 text-sm line-clamp-2 flex-shrink-0" title={post.title}>
                                        {post.title}
                                    </h4>
                                )}

                                {/* Caption - Takes available space */}
                                <div className="flex-1 mb-2">
                                    <p className={`text-sm text-gray-600 ${viewMode === 'detailed' ? 'line-clamp-3' : 'line-clamp-4'}`} title={post.caption}>
                                        {post.caption || 'No caption'}
                                    </p>
                                </div>

                                {/* Team - for detailed view */}
                                {viewMode === 'detailed' && post.team && (
                                    <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full inline-block mb-2 max-w-fit flex-shrink-0">
                                        {post.team}
                                    </div>
                                )}

                                {/* Hashtags - for detailed view */}
                                {viewMode === 'detailed' && post.hashtags && post.hashtags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-2 flex-shrink-0">
                                        {post.hashtags.slice(0, 3).map((hashtag, index) => (
                                            <span key={index} className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                                                {hashtag}
                                            </span>
                                        ))}
                                        {post.hashtags.length > 3 && (
                                            <span className="text-xs text-gray-500">+{post.hashtags.length - 3} more</span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Bottom Section - Fixed Height */}
                            <div className="mt-auto space-y-3 flex-shrink-0">
                                {/* Engagement Stats - Fixed Height */}
                                <div className="flex items-center justify-between text-xs text-gray-500 h-4">
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <div className="flex items-center gap-1">
                                            <Heart size={12} className="text-red-500" />
                                            <span>{post.likesCount || 0}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <MessageCircle size={12} className="text-blue-500" />
                                            <span>{post.commentsCount || 0}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Share2 size={12} className="text-green-500" />
                                            <span>{post.shareCount || 0}</span>
                                        </div>
                                        {(post.reportCount || 0) > 0 && (
                                            <div className="flex items-center gap-1 text-yellow-600">
                                                <Flag size={12} />
                                                <span>{post.reportCount}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="text-xs text-gray-400">
                                        {((post.likesCount || 0) + (post.commentsCount || 0) + (post.shareCount || 0))} total
                                    </div>
                                </div>

                                {/* Action Buttons - Fixed Height */}
                                <div className="flex gap-1.5 h-8">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onPostClick(post);
                                        }}
                                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-xs py-1.5 px-2 rounded-lg transition-colors flex items-center justify-center gap-1"
                                    >
                                        <Eye size={10} />
                                        <span className="hidden sm:inline">Details</span>
                                    </button>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onBlockPost(post.id, !post.isBlocked);
                                        }}
                                        className={`flex-1 ${post.isBlocked
                                            ? 'bg-green-500 hover:bg-green-600'
                                            : 'bg-yellow-500 hover:bg-yellow-600'} text-white text-xs py-1.5 px-2 rounded-lg transition-colors flex items-center justify-center gap-1`}
                                    >
                                        {post.isBlocked ? <Eye size={10} /> : <EyeOff size={10} />}
                                        <span className="hidden sm:inline">
                                            {post.isBlocked ? 'Unblock' : 'Block'}
                                        </span>
                                    </button>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeletePost(post.id);
                                        }}
                                        className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs py-1.5 px-2 rounded-lg transition-colors flex items-center justify-center gap-1"
                                    >
                                        <Trash2 size={10} />
                                        <span className="hidden sm:inline">Delete</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
};

export default PostsGrid;