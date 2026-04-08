import React, { useState } from 'react';
import {
    Filter,
    List,
    LayoutGrid,
    ChevronDown
} from 'lucide-react';

const FilterControls = ({
    filters,
    setFilters,
    posts,
    viewMode,
    setViewMode,
    postsPerPage,
    setPostsPerPage,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder
}) => {
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Get unique teams from posts
    const uniqueTeams = [...new Set(posts.map(post => post.team).filter(Boolean))];

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const clearAllFilters = () => {
        setFilters({
            status: 'all',
            userType: 'all',
            mediaType: 'all',
            dateRange: 'all',
            team: 'all'
        });
    };

    const activeFiltersCount = Object.values(filters).filter(value => value !== 'all').length;

    return (
        <div className="space-y-4 mb-3">
            {/* Filter Toggle & View Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors ${
                            isFilterOpen || activeFiltersCount > 0
                                ? 'bg-primary-50 border-primary-300 text-primary-700'
                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        <Filter size={16} />
                        <span>Filters</span>
                        {activeFiltersCount > 0 && (
                            <span className="bg-primary-500 text-white text-xs px-2 py-0.5 rounded-full">
                                {activeFiltersCount}
                            </span>
                        )}
                        <ChevronDown 
                            size={16} 
                            className={`transition-transform ${isFilterOpen ? 'rotate-180' : ''}`}
                        />
                    </button>

                    {activeFiltersCount > 0 && (
                        <button
                            onClick={clearAllFilters}
                            className="text-sm text-red-600 hover:text-red-800 hover:underline"
                        >
                            Clear all
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {/* View Mode Toggle */}
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        {/* <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded transition-colors ${
                                viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                            }`}
                            title="Grid View"
                        >
                            <Grid size={16} />
                        </button> */}
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded transition-colors ${
                                viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                            }`}
                            title="List View"
                        >
                            <List size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('detailed')}
                            className={`p-2 rounded transition-colors ${
                                viewMode === 'detailed' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                            }`}
                            title="Detailed View"
                        >
                            <LayoutGrid size={16} />
                        </button>
                    </div>

                    {/* Posts per page */}
                    <select
                        value={postsPerPage}
                        onChange={(e) => setPostsPerPage(parseInt(e.target.value))}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value={12}>12 per page</option>
                        <option value={24}>24 per page</option>
                        <option value={48}>48 per page</option>
                        <option value={96}>96 per page</option>
                    </select>
                </div>
            </div>

            {/* Expanded Filters */}
            {isFilterOpen && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                        {/* Status Filter */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Status
                            </label>
                            <select
                                value={filters.status}
                                onChange={(e) => handleFilterChange('status', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                                <option value="all">All Status</option>
                                <option value="published">Published ({posts.filter(p => p.status === 'published' && !p.isBlocked).length})</option>
                                <option value="blocked">Blocked ({posts.filter(p => p.isBlocked).length})</option>
                                <option value="reported">Reported ({posts.filter(p => (p.reportCount || 0) > 0).length})</option>
                                <option value="draft">Drafts ({posts.filter(p => p.status === 'draft').length})</option>
                            </select>
                        </div>

                        {/* User Type Filter */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                User Type
                            </label>
                            <select
                                value={filters.userType}
                                onChange={(e) => handleFilterChange('userType', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                                <option value="all">All Users</option>
                                <option value="admin">Admins</option>
                                <option value="coach">Coaches</option>
                                <option value="parent">Parents</option>
                                <option value="player">Players</option>
                                <option value="official">Officials</option>
                            </select>
                        </div>

                        {/* Media Type Filter */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Media Type
                            </label>
                            <select
                                value={filters.mediaType}
                                onChange={(e) => handleFilterChange('mediaType', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                                <option value="all">All Media</option>
                                <option value="video">Videos ({posts.filter(p => p.hasVideo).length})</option>
                                <option value="image">Images ({posts.filter(p => p.hasImage && !p.hasVideo).length})</option>
                                <option value="text">Text Only ({posts.filter(p => !p.hasVideo && !p.hasImage).length})</option>
                            </select>
                        </div>

                        {/* Team Filter */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Team
                            </label>
                            <select
                                value={filters.team}
                                onChange={(e) => handleFilterChange('team', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                                <option value="all">All Teams</option>
                                {uniqueTeams.map(team => (
                                    <option key={team} value={team}>{team}</option>
                                ))}
                            </select>
                        </div>

                        {/* Sort By */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Sort By
                            </label>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                                <option value="createdAt">Date Created</option>
                                <option value="updatedAt">Last Updated</option>
                                <option value="likesCount">Likes</option>
                                <option value="commentsCount">Comments</option>
                                <option value="shareCount">Shares</option>
                                <option value="reportCount">Reports</option>
                            </select>
                        </div>

                        {/* Sort Order */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Order
                            </label>
                            <select
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                                <option value="desc">Highest First</option>
                                <option value="asc">Lowest First</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FilterControls;