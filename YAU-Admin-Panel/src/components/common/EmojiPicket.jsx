// components/common/EmojiPicker.js
import React, { useState } from 'react';
import { Smile, Zap, Trophy } from 'lucide-react';

const EmojiPicker = ({ onEmojiSelect, className = "" }) => {
    const [showPicker, setShowPicker] = useState(false);
    const [activeCategory, setActiveCategory] = useState('faces');
    
    const emojiCategories = {
        faces: {
            icon: <Smile size={16} />,
            emojis: [
                '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
                '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
                '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
                '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
                '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
                '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗'
            ]
        },
        gestures: {
            icon: <span>👍</span>,
            emojis: [
                '👍', '👎', '👏', '🙌', '👌', '✌️', '🤞', '🤟', '🤘', '🤙',
                '👈', '👉', '👆', '👇', '☝️', '👋', '🤚', '🖐', '✋', '🤜',
                '🤛', '✊', '👊', '🤲', '💪', '🦵', '🦶', '👂', '👃', '🧠'
            ]
        },
        sports: {
            icon: <Trophy size={16} />,
            emojis: [
                // Ball Sports
                '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱',
                // Racquet & Stick Sports
                '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🥅', '⛳', '🏹', '🎯',
                // Athletes & Activities
                '🏊‍♂️', '🏊‍♀️', '🏄‍♂️', '🏄‍♀️', '🚣‍♂️', '🚣‍♀️', '🏇', '⛷️', '🏂', '🤿',
                '🚴‍♂️', '🚴‍♀️', '🏃‍♂️', '🏃‍♀️', '🤸‍♂️', '🤸‍♀️', '⛹️‍♂️', '⛹️‍♀️', '🤾‍♂️',
                // Combat & Strength
                '🤼‍♂️', '🤼‍♀️', '🤺', '🏋️‍♂️', '🏋️‍♀️', '🧗‍♂️', '🧗‍♀️', '🤽‍♂️', '🤽‍♀️', '🥊',
                // Equipment & Gear
                '🥋', '🎿', '⛸️', '🛷', '🛹', '🛼', '🪀', '🎮', '🏆', '🥇',
                '🥈', '🥉', '🏅', '🎖️', '🎗️', '🏵️'
            ]
        },
        symbols: {
            icon: <Zap size={16} />,
            emojis: [
                '🔥', '💯', '💪', '👑', '🎉', '🎊', '💖', '💕', '💓', '💗',
                '⭐', '🌟', '✨', '💫', '⚡', '💥', '💢', '💨', '💦', '💤',
                '🎯', '🎪', '🎨', '🎭', '🎪', '🎨', '🎵', '🎶', '🎤', '🎧'
            ]
        }
    };

    return (
        <div className={`relative ${className}`}>
            <button
                onClick={() => setShowPicker(!showPicker)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                type="button"
            >
                <Smile size={20} />
            </button>

            {showPicker && (
                <>
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 z-40"
                        onClick={() => setShowPicker(false)}
                    />
                    
                    {/* Emoji Picker */}
                    <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-80">
                        {/* Category Tabs */}
                        <div className="flex border-b border-gray-200">
                            {Object.entries(emojiCategories).map(([key, category]) => (
                                <button
                                    key={key}
                                    onClick={() => setActiveCategory(key)}
                                    className={`flex-1 p-2 text-center transition-colors ${
                                        activeCategory === key 
                                            ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' 
                                            : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                    type="button"
                                >
                                    {category.icon}
                                </button>
                            ))}
                        </div>
                        
                        {/* Emoji Grid */}
                        <div className="p-3 max-h-48 overflow-y-auto">
                            <div className="grid grid-cols-8 gap-2">
                                {emojiCategories[activeCategory].emojis.map((emoji, index) => (
                                    <button
                                        key={index}
                                        onClick={() => {
                                            onEmojiSelect(emoji);
                                            setShowPicker(false);
                                        }}
                                        className="text-xl hover:bg-gray-100 rounded p-1 transition-colors"
                                        type="button"
                                        title={emoji}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default EmojiPicker;