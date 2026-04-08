import React, { useState } from 'react';
import GroupChatMigrationService from '../../services/groupChatMigrationService';

const GroupChatMigration = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [chatsList, setChatsList] = useState(null);

  const runMigration = async () => {
    setIsLoading(true);
    setResults(null);
    
    try {
      const migrationResults = await GroupChatMigrationService.migrateInconsistentGroupChats();
      setResults(migrationResults);
    } catch (error) {
      setResults({
        success: false,
        error: error.message
      });
    }
    
    setIsLoading(false);
  };

  const listAllChats = async () => {
    setIsLoading(true);
    setChatsList(null);
    
    try {
      const chats = await GroupChatMigrationService.listAllGroupChats();
      setChatsList(chats);
    } catch (error) {
      console.error('Error listing chats:', error);
    }
    
    setIsLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Group Chat Migration Tool</h1>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <h2 className="font-semibold text-yellow-800 mb-2">⚠️ Migration Tool</h2>
        <p className="text-yellow-700 text-sm">
          This tool will migrate group chats with random IDs (like "ym5br53GGkmwdBVfFXQY") 
          to proper format (like "6U_Basketball_Greenbelt,_MD"). It will preserve all messages and members.
        </p>
      </div>

      <div className="space-y-4">
        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={listAllChats}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'List All Group Chats'}
          </button>
          
          <button
            onClick={runMigration}
            disabled={isLoading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {isLoading ? 'Migrating...' : 'Run Migration'}
          </button>
        </div>

        {/* Results Display */}
        {results && (
          <div className={`border rounded-lg p-4 ${
            results.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <h3 className={`font-semibold mb-2 ${
              results.success ? 'text-green-800' : 'text-red-800'
            }`}>
              Migration Results
            </h3>
            
            {results.success ? (
              <div className="text-green-700">
                <p>✅ Migration completed successfully!</p>
                <ul className="mt-2 text-sm">
                  <li>• Migrations performed: {results.migrationsPerformed}</li>
                  <li>• Errors: {results.errors}</li>
                </ul>
                
                {results.details && results.details.length > 0 && (
                  <div className="mt-3">
                    <p className="font-medium">Details:</p>
                    <div className="text-xs bg-white rounded p-2 mt-1 max-h-40 overflow-y-auto">
                      {results.details.map((detail, index) => (
                        <div key={index} className="mb-1">
                          <strong>{detail.oldId}</strong> → <strong>{detail.newId}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-red-700">❌ Migration failed: {results.error}</p>
            )}
          </div>
        )}

        {/* Chats List */}
        {chatsList && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="font-semibold mb-3">All Group Chats ({chatsList.length})</h3>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {chatsList.map((chat, index) => (
                <div key={index} className={`p-3 rounded border ${
                  chat.isProperFormat 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{chat.name}</div>
                      <div className="text-sm text-gray-600">
                        ID: <code className="bg-gray-200 px-1 rounded">{chat.id}</code>
                      </div>
                      <div className="text-sm text-gray-600">
                        {chat.sport} • {chat.ageGroup} • {chat.location}
                      </div>
                    </div>
                    
                    <div className="text-right text-sm">
                      <div>{chat.memberCount} members</div>
                      <div>{chat.messageCount} messages</div>
                      <div className={`font-medium ${
                        chat.isProperFormat ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {chat.isProperFormat ? '✅ Proper' : '❌ Needs Migration'}
                      </div>
                    </div>
                  </div>
                  
                  {!chat.isProperFormat && chat.shouldBe !== 'N/A' && (
                    <div className="mt-2 text-sm text-gray-600">
                      <strong>Should be:</strong> <code className="bg-gray-200 px-1 rounded">{chat.shouldBe}</code>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupChatMigration;