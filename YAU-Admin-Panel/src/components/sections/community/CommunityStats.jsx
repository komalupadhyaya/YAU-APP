// components/admin/community/CommunityStats.js
import React from 'react';
import {
    MessageCircle,
    CheckCircle,
    XCircle,
    Flag,
    Heart,
    Share2,
    TrendingUp,
} from 'lucide-react';

const CommunityStats = ({ stats }) => {
    const statCards = [
        {
            title: 'Total Posts',
            value: stats.totalPosts,
            icon: MessageCircle,
            color: 'blue',
            description: 'All time posts'
        },
        {
            title: 'Published',
            value: stats.publishedPosts,
            icon: CheckCircle,
            color: 'green',
            description: 'Currently active'
        },
        {
            title: 'Blocked',
            value: stats.blockedPosts,
            icon: XCircle,
            color: 'red',
            description: 'Need attention'
        },
        {
            title: 'Reported',
            value: stats.reportedPosts,
            icon: Flag,
            color: 'yellow',
            description: 'Under review'
        },
        {
            title: 'Total Likes',
            value: stats.totalLikes,
            icon: Heart,
            color: 'pink',
            description: 'Community appreciation'
        },
        {
            title: 'Comments',
            value: stats.totalComments,
            icon: MessageCircle,
            color: 'indigo',
            description: 'User interactions'
        },
        {
            title: 'Shares',
            value: stats.totalShares,
            icon: Share2,
            color: 'teal',
            description: 'Viral spread'
        },
        {
            title: 'Avg Engagement',
            value: `${stats.engagementRate}`,
            icon: TrendingUp,
            color: 'orange',
            description: 'Per post average',
            suffix: '/post'
        }
    ];

    const getColorClasses = (color) => {
        const colors = {
            blue: 'bg-blue-50 border-blue-200 text-blue-800',
            green: 'bg-green-50 border-green-200 text-green-800',
            red: 'bg-red-50 border-red-200 text-red-800',
            yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
            pink: 'bg-pink-50 border-pink-200 text-pink-800',
            indigo: 'bg-indigo-50 border-indigo-200 text-indigo-800',
            teal: 'bg-teal-50 border-teal-200 text-teal-800',
            orange: 'bg-orange-50 border-orange-200 text-orange-800'
        };
        return colors[color] || colors.blue;
    };

    const getIconColorClasses = (color) => {
        const colors = {
            blue: 'text-blue-600',
            green: 'text-green-600',
            red: 'text-red-600',
            yellow: 'text-yellow-600',
            pink: 'text-pink-600',
            indigo: 'text-indigo-600',
            teal: 'text-teal-600',
            orange: 'text-orange-600'
        };
        return colors[color] || colors.blue;
    };

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3 sm:gap-4">
            {statCards.map((stat, index) => {
                const Icon = stat.icon;
                return (
                    <div
                        key={index}
                        className={`${getColorClasses(stat.color)} rounded-xl p-3 sm:p-4 border transition-all duration-200 hover:scale-105 cursor-pointer`}
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <Icon size={18} className={getIconColorClasses(stat.color)} />
                            <div className="text-xl sm:text-2xl font-bold">
                                {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                                {stat.suffix && <span className="text-sm">{stat.suffix}</span>}
                            </div>
                        </div>
                        <div className="text-xs sm:text-sm font-medium mb-1">
                            {stat.title}
                        </div>
                        <div className="text-xs opacity-75">
                            {stat.description}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default CommunityStats;