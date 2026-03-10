'use client';

import { useState, useRef, useEffect } from 'react';

type LogEntry = {
  id: number;
  time: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'command';
};

export default function Home() {
  const [host, setHost] = useState('127.0.0.1');
  const [port, setPort] = useState('8080');
  const [password, setPassword] = useState('');

  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    const time = new Date().toLocaleTimeString('en-GB', { hour12: false });
    setLogs((prev) => [...prev, { id: Date.now() + Math.random(), time, message, type }].slice(-100)); // Keep last 100
  };

  const sendCommand = async (endpoint: string, label: string, isConnectAction = false) => {
    setLoading(true);
    if (!isConnectAction) {
      addLog(`Sending: ${endpoint} for ${label}`, 'command');
    }

    try {
      const pwQuery = password ? `?password=${encodeURIComponent(password)}` : '';
      const url = `http://${host}:${port}${endpoint}${pwQuery}`;

      const res = await fetch(url, {
        method: 'GET',
      });

      const contentType = res.headers.get('content-type');
      let data;

      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        data = await res.text();
      }

      if (res.ok) {
        if (isConnectAction) {
          setConnected(true);
          addLog('Connected successfully!', 'success');
          addLog(`Status: ${JSON.stringify(data)}`, 'info');
        } else {
          addLog(`${label} — OK: ${JSON.stringify(data)}`, 'success');
        }
      } else {
        if (isConnectAction) setConnected(false);
        addLog(`${label} — Error: ${res.statusText || 'Unknown'}`, 'error');
      }
    } catch (err: any) {
      if (isConnectAction) setConnected(false);
      addLog(`${label} — Error: ${err.message || 'Network error'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    addLog(`Connecting to ${host}:${port}...`, 'info');
    sendCommand('/api/status', 'Connect', true);
  };

  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto font-sans">
      <header className="flex items-center justify-between mb-8 pb-6 border-b border-gray-800">
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <span className="text-blue-500">⚡</span> DSLRBooth Web Controller
        </h1>
        <div className="flex items-center gap-3 bg-gray-900/50 px-4 py-2 rounded-full border border-gray-800">
          <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`}></div>
          <span className="font-medium text-sm text-gray-300">{connected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column */}
        <div className="col-span-1 lg:col-span-8 flex flex-col gap-6">

          {/* Connection Panel */}
          <section className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 backdrop-blur-md">
            <h2 className="text-xl font-semibold mb-5 flex items-center gap-2 text-white">
              <span>🔌</span> Connection
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
              <div className="lg:col-span-1">
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Host</label>
                <input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="192.168.1.100"
                />
              </div>
              <div className="lg:col-span-1">
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Port</label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="8080"
                />
              </div>
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-1.5">API Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Leave empty if none"
                />
              </div>
            </div>
            <button
              onClick={handleConnect}
              disabled={loading}
              className={`w-full py-3 px-6 rounded-xl font-medium text-white shadow-lg transition-all flex justify-center items-center gap-2 ${connected
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500'
                } disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{connected ? '✅' : '🔗'}</span>
                  {connected ? 'Reconnect / Update Settings' : 'Connect to DSLRBooth'}
                </>
              )}
            </button>
          </section>

          {/* Session Controls */}
          <section className={`bg-gray-900/40 border border-gray-800 rounded-2xl p-6 backdrop-blur-md transition-opacity duration-300 ${!connected ? 'opacity-50' : 'opacity-100'}`}>
            <h2 className="text-xl font-semibold mb-5 flex items-center gap-2 text-white">
              <span>🎬</span> Session Controls
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Print', icon: '📸', cmd: '/api/start/print', color: 'from-pink-500 to-rose-500', shadow: 'shadow-pink-500/20' },
                { label: 'GIF', icon: '🎞️', cmd: '/api/start/gif', color: 'from-purple-500 to-fuchsia-500', shadow: 'shadow-purple-500/20' },
                { label: 'Boomerang', icon: '🪃', cmd: '/api/start/boomerang', color: 'from-orange-500 to-amber-500', shadow: 'shadow-orange-500/20' },
                { label: 'Video', icon: '🎥', cmd: '/api/start/video', color: 'from-sky-500 to-blue-500', shadow: 'shadow-blue-500/20' },
              ].map((btn) => (
                <button
                  key={btn.label}
                  disabled={!connected || loading}
                  onClick={() => sendCommand(btn.cmd, btn.label)}
                  className={`relative overflow-hidden group rounded-2xl p-6 flex flex-col items-center justify-center gap-3 bg-gray-800 border-2 border-gray-700 hover:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95 shadow-lg hover:shadow-xl ${btn.shadow}`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${btn.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                  <span className="text-4xl filter drop-shadow-md group-hover:scale-110 transition-transform">{btn.icon}</span>
                  <span className="font-semibold text-gray-200 group-hover:text-white transition-colors">{btn.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Quick Actions */}
          <section className={`bg-gray-900/40 border border-gray-800 rounded-2xl p-6 backdrop-blur-md transition-opacity duration-300 ${!connected ? 'opacity-50' : 'opacity-100'}`}>
            <h2 className="text-xl font-semibold mb-5 flex items-center gap-2 text-white">
              <span>⚙️</span> Quick Actions
            </h2>
            <div className="flex flex-wrap gap-3">
              <button disabled={!connected || loading} onClick={() => sendCommand('/api/lock', 'Lock Screen')} className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm font-medium text-gray-200 transition-colors disabled:opacity-50">
                <span>🔒</span> Lock Screen
              </button>
              <button disabled={!connected || loading} onClick={() => sendCommand('/api/unlock', 'Unlock Screen')} className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm font-medium text-gray-200 transition-colors disabled:opacity-50">
                <span>🔓</span> Unlock Screen
              </button>
              <button disabled={!connected || loading} onClick={() => sendCommand('/api/stop', 'Stop Session')} className="flex items-center gap-2 px-5 py-2.5 bg-red-900/30 hover:bg-red-900/50 border border-red-800/50 text-red-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                <span>⏹️</span> Stop Session
              </button>
              <button disabled={!connected || loading} onClick={() => sendCommand('/api/status', 'Status')} className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm font-medium text-gray-200 transition-colors disabled:opacity-50 ml-auto">
                <span>🔄</span> Refresh Status
              </button>
            </div>
          </section>

        </div>

        {/* Right Column: Log */}
        <div className="col-span-1 lg:col-span-4 flex flex-col">
          <section className="bg-gray-950 border border-gray-800 rounded-2xl flex flex-col h-[500px] lg:h-full relative overflow-hidden">
            <div className="p-5 border-b border-gray-800 bg-gray-900/80 sticky top-0 z-10 flex justify-between items-center">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-white">
                <span>📋</span> Activity Log
              </h2>
              <button
                onClick={() => setLogs([])}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Clear
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 font-mono text-sm space-y-2 pb-8">
              {logs.length === 0 ? (
                <div className="text-gray-500 italic text-center mt-10">Configure connection and press Connect.</div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex flex-col gap-0.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <span className="text-xs text-gray-600">[{log.time}]</span>
                    <span className={`break-words ${log.type === 'error' ? 'text-red-400' :
                      log.type === 'success' ? 'text-green-400' :
                        log.type === 'command' ? 'text-blue-400' :
                          'text-gray-300'
                      }`}>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
