import React, { useState } from 'react';
import { runGroupChatFix } from '../../scripts/runGroupChatFix.js';

/**
 * Admin component to run group chat fixes
 * Temporarily add this to any admin page to fix group chat access
 */
const GroupChatFixer = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [logs, setLogs] = useState([]);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { 
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, 
      timestamp, 
      message, 
      type 
    }]);
  };

  const runFix = async () => {
    setIsRunning(true);
    setResults(null);
    setLogs([]);
    
    addLog('🚀 Starting Group Chat Fix...', 'info');
    
    try {
      // Override console.log to capture logs
      const originalLog = console.log;
      console.log = (...args) => {
        addLog(args.join(' '), 'info');
        originalLog(...args);
      };
      
      const originalError = console.error;
      console.error = (...args) => {
        addLog(args.join(' '), 'error');
        originalError(...args);
      };
      
      const result = await runGroupChatFix();
      
      // Restore console
      console.log = originalLog;
      console.error = originalError;
      
      setResults(result);
      
      if (result.success) {
        addLog('✅ Fix completed successfully!', 'success');
      } else {
        addLog(`❌ Fix failed: ${result.error}`, 'error');
      }
    } catch (error) {
      addLog(`💥 Error: ${error.message}`, 'error');
    } finally {
      setIsRunning(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
    setResults(null);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Group Chat Access Fixer</h2>
        
        <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-400 rounded">
          <p className="text-blue-800">
            <strong>What this does:</strong> This comprehensive tool fixes group chats by:
            <br />• Parsing group chat IDs with special characters (hyphens, commas, spaces)
            <br />• Adding proper member access from registration data
            <br />• Adding coaches to their assigned team chats
            <br />• Creating missing group chat documents for chats with only messages
            <br />Users will be able to see and send messages to their team chats after running this.
          </p>
        </div>
        
        <div className="flex gap-4 mb-6">
          <button
            onClick={runFix}
            disabled={isRunning}
            className={`px-6 py-3 rounded-lg font-semibold text-white ${
              isRunning 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isRunning ? '🔄 Running Fix...' : '🔧 Run Group Chat Fix'}
          </button>
          
          <button
            onClick={clearLogs}
            disabled={isRunning}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 disabled:bg-gray-400"
          >
            🗑️ Clear Logs
          </button>
        </div>
        
        {results && (
          <div className="mb-6 p-4 rounded-lg border-2 border-gray-200">
            <h3 className="text-lg font-semibold mb-3">📊 Results Summary</h3>
            
            {results.success ? (
              <div className="space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-blue-50 rounded">
                    <div className="text-sm text-blue-600">Initial Status</div>
                    <div className="text-lg font-bold">
                      {results.initialStatus?.total || 0} Total Chats
                    </div>
                    <div className="text-sm">
                      {results.initialStatus?.withDocuments || 0} with documents
                    </div>
                  </div>
                  
                  <div className="p-3 bg-green-50 rounded">
                    <div className="text-sm text-green-600">Fix Results</div>
                    <div className="text-lg font-bold">
                      {results.fixResults?.successful || 0} Fixed Successfully
                    </div>
                    <div className="text-sm">
                      {results.fixResults?.created || 0} created, {results.fixResults?.updated || 0} updated
                    </div>
                  </div>
                  
                  <div className="p-3 bg-purple-50 rounded">
                    <div className="text-sm text-purple-600">Final Status</div>
                    <div className="text-lg font-bold">
                      {results.finalStatus?.withDocuments || 0} Ready to Use
                    </div>
                    <div className="text-sm">
                      {results.finalStatus?.withMessages || 0} with messages
                    </div>
                  </div>
                </div>
                
                {results.fixResults?.failed > 0 && (
                  <div className="mt-4 p-3 bg-red-50 rounded border-l-4 border-red-400">
                    <div className="text-red-800">
                      ⚠️ {results.fixResults.failed} fixes failed. Check logs for details.
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-red-50 rounded border-l-4 border-red-400">
                <div className="text-red-800">
                  ❌ Fix process failed: {results.error}
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">📄 Process Logs</h3>
          
          <div className="bg-black rounded-lg p-4 max-h-96 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <div className="text-gray-500">No logs yet. Click "Run Group Chat Fix" to start.</div>
            ) : (
              logs.map(log => (
                <div 
                  key={log.id} 
                  className={`mb-1 ${
                    log.type === 'error' ? 'text-red-400' : 
                    log.type === 'success' ? 'text-green-400' : 
                    'text-gray-300'
                  }`}
                >
                  <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
          <p className="text-yellow-800 text-sm">
            <strong>Note:</strong> This is a one-time fix for existing group chats. 
            New registrations will automatically create properly configured group chats. 
            Remove this component after running the fix.
          </p>
        </div>
      </div>
    </div>
  );
};

export default GroupChatFixer;