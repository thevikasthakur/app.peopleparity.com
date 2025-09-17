import React, { useState } from 'react';

export function TestSep7() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [testType, setTestType] = useState<'sep7' | 'today'>('sep7');

  const runTest = async () => {
    setLoading(true);
    try {
      const endpoint = testType === 'sep7' ? 'debug:test-sep7' : 'debug:test-today';
      const data = await (window as any).api.invoke(endpoint);
      setResult(data);
    } catch (error: any) {
      setResult({ error: error.message });
    }
    setLoading(false);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Validation</h1>
      
      <div className="mb-4">
        <label className="mr-4">
          <input
            type="radio"
            value="sep7"
            checked={testType === 'sep7'}
            onChange={() => setTestType('sep7')}
            className="mr-2"
          />
          Test Sep 7, 2025
        </label>
        <label>
          <input
            type="radio"
            value="today"
            checked={testType === 'today'}
            onChange={() => setTestType('today')}
            className="mr-2"
          />
          Test Today
        </label>
      </div>
      
      <button 
        onClick={runTest}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Running...' : 'Run Test'}
      </button>
      
      {result && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h2 className="font-bold mb-2">Results for {result.date}:</h2>
          {result.error ? (
            <p className="text-red-500">Error: {result.error}</p>
          ) : (
            <div>
              {result.totalScreenshots !== undefined && (
                <>
                  <p>Total Screenshots: {result.totalScreenshots}</p>
                  <p>Low Activity ({"<"}2.5): {result.lowActivityScreenshots}</p>
                </>
              )}
              <p>Client Hours: {result.clientHours?.toFixed(2)}</p>
              <p>Command Hours: {result.commandHours?.toFixed(2)}</p>
              <p>Total Hours: {result.totalHours?.toFixed(2)}</p>
              
              {result.screenshots && (
                <div className="mt-4">
                  <h3 className="font-bold mb-2">Screenshot Details:</h3>
                  <div className="max-h-64 overflow-y-auto">
                    {result.screenshots.map((shot: any, idx: number) => (
                      <div key={idx} className={`text-sm ${shot.activityScore < 2.5 ? 'text-red-500' : shot.activityScore < 4.0 ? 'text-orange-500' : 'text-green-600'}`}>
                        {idx + 1}. {shot.time} - Activity: {shot.activityScore.toFixed(1)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <p className="mt-2 text-sm text-gray-600">Check console for detailed logs</p>
        </div>
      )}
    </div>
  );
}