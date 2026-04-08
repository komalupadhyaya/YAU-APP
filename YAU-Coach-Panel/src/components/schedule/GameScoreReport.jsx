// coach/components/schedule/GameScoreReport.jsx
import React, { useState, useEffect } from 'react';
import { X, Trophy, Calendar, Clock, Users } from 'lucide-react';
import { reportGameScore } from '../../firebase/coachFirestore';

const GameScoreReport = ({ coachData, teams, isOpen, onClose, onReported }) => {
  const [formData, setFormData] = useState({
    gameId: '',
    teamId: '',
    opponent: '',
    homeScore: '',
    awayScore: '',
    date: '',
    location: '',
    notes: '',
    isHome: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recentGames, setRecentGames] = useState([]);

  useEffect(() => {
    // Load recent games for this coach's teams
    // This would typically come from your schedule data
    const mockRecentGames = [
      {
        id: 'game1',
        date: '2024-01-15',
        opponent: 'Thunder Bolts',
        teamId: teams[0]?.id,
        location: 'Central Park Field 1',
        status: 'scheduled'
      }
    ];
    setRecentGames(mockRecentGames);
  }, [teams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    try {
      setLoading(true);
      setError('');

      // Validate required fields
      if (!formData.opponent || formData.homeScore === '' || formData.awayScore === '') {
        setError('Please fill in all required fields.');
        return;
      }

      const selectedTeam = teams.find(team => team.id === formData.teamId);
      if (!selectedTeam) {
        setError('Selected team not found.');
        return;
      }

      const homeScore = parseInt(formData.homeScore);
      const awayScore = parseInt(formData.awayScore);

      if (isNaN(homeScore) || isNaN(awayScore) || homeScore < 0 || awayScore < 0) {
        setError('Please enter valid scores (0 or greater).');
        return;
      }

      // Determine winner
      let result = 'tie';
      if (formData.isHome) {
        if (homeScore > awayScore) result = 'win';
        else if (homeScore < awayScore) result = 'loss';
      } else {
        if (awayScore > homeScore) result = 'win';
        else if (awayScore < homeScore) result = 'loss';
      }

      const gameData = {
        gameId: formData.gameId || null,
        teamId: formData.teamId,
        teamName: selectedTeam.teamName || `${selectedTeam.ageGroup} ${selectedTeam.sport}`,
        coachId: coachData.id,
        coachName: `${coachData.firstName} ${coachData.lastName}`,
        opponent: formData.opponent,
        homeScore,
        awayScore,
        isHome: formData.isHome,
        result,
        date: formData.date || new Date().toISOString().split('T')[0],
        location: formData.location,
        notes: formData.notes,
        sport: selectedTeam.sport,
        ageGroup: selectedTeam.ageGroup,
        reportedAt: new Date().toISOString()
      };

      await reportGameScore(gameData);

      console.log('✅ Game score reported successfully');
      onReported();
    } catch (error) {
      console.error('Error reporting game score:', error);
      setError('Failed to report game score. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleQuickSelectGame = (game) => {
    setFormData(prev => ({
      ...prev,
      gameId: game.id,
      teamId: game.teamId,
      opponent: game.opponent,
      date: game.date,
      location: game.location
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <Trophy className="mr-2 text-orange-600" size={24} />
            Report Game Score
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Recent Games Quick Select */}
        {recentGames.length > 0 && (
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Recent Games</h3>
            <div className="space-y-2">
              {recentGames.slice(0, 3).map((game) => (
                <button
                  key={game.id}
                  onClick={() => handleQuickSelectGame(game)}
                  className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800">vs {game.opponent}</p>
                      <p className="text-sm text-gray-500">{new Date(game.date).toLocaleDateString()}</p>
                    </div>
                    <span className="text-xs text-gray-500">Click to select</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Team Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Users size={16} className="inline mr-1" />
              Your Team *
            </label>
            <select
              value={formData.teamId}
              onChange={(e) => handleInputChange('teamId', e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            >
              <option value="">Choose your team</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.teamName || `${team.ageGroup} ${team.sport}`}
                </option>
              ))}
            </select>
          </div>

          {/* Opponent */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Opponent Team *
            </label>
            <input
              type="text"
              value={formData.opponent}
              onChange={(e) => handleInputChange('opponent', e.target.value)}
              placeholder="e.g., Thunder Bolts"
              className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          {/* Home/Away */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Game Type
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="gameType"
                  checked={formData.isHome}
                  onChange={() => handleInputChange('isHome', true)}
                  className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">Home Game</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="gameType"
                  checked={!formData.isHome}
                  onChange={() => handleInputChange('isHome', false)}
                  className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">Away Game</span>
              </label>
            </div>
          </div>

          {/* Scores */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700">Final Score</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {formData.isHome ? 'Your Score' : 'Opponent Score'} (Home) *
                </label>
                <input
                  type="number"
                  value={formData.homeScore}
                  onChange={(e) => handleInputChange('homeScore', e.target.value)}
                  min="0"
                  max="999"
                  className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-center text-2xl font-bold"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {formData.isHome ? 'Opponent Score' : 'Your Score'} (Away) *
                </label>
                <input
                  type="number"
                  value={formData.awayScore}
                  onChange={(e) => handleInputChange('awayScore', e.target.value)}
                  min="0"
                  max="999"
                  className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-center text-2xl font-bold"
                  required
                />
              </div>
            </div>
            
            {/* Score Preview */}
            {formData.homeScore !== '' && formData.awayScore !== '' && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="text-center">
                  <p className="text-sm text-orange-700 mb-2">Final Score</p>
                  <p className="text-2xl font-bold text-orange-800">
                    {formData.isHome ? 'You' : formData.opponent}: {formData.isHome ? formData.homeScore : formData.awayScore}
                    {' - '}
                    {formData.isHome ? formData.opponent : 'You'}: {formData.isHome ? formData.awayScore : formData.homeScore}
                  </p>
                  <p className="text-sm text-orange-600 mt-1">
                    {(() => {
                      const yourScore = formData.isHome ? parseInt(formData.homeScore) : parseInt(formData.awayScore);
                      const opponentScore = formData.isHome ? parseInt(formData.awayScore) : parseInt(formData.homeScore);
                      if (yourScore > opponentScore) return '🎉 Victory!';
                      if (yourScore < opponentScore) return '😔 Loss';
                      return '🤝 Tie Game';
                    })()}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar size={16} className="inline mr-1" />
              Game Date
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              placeholder="e.g., Central Park Field 1"
              className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Game Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Key plays, player highlights, etc..."
              rows="3"
              className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Reporting...' : 'Report Score'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GameScoreReport;