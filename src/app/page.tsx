'use client';

import { useState, useRef, useEffect } from 'react';

declare global {
  interface Window {
    electronAPI?: {
      focusApp: (windowTitle: string) => Promise<boolean>;
      selectFolder: () => Promise<string | null>;
      startWatching: (folderPath: string) => Promise<boolean>;
      stopWatching: () => Promise<boolean>;
      onNewPhoto: (callback: (data: NewPhotoEvent) => void) => void;
    };
  }
}

type LogEntry = {
  id: number;
  time: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'command' | 'photo';
};

type NewPhotoEvent = {
  filePath: string;
  fileName: string;
  timestamp: string;
};

export default function Home() {
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState('1500');
  const [password, setPassword] = useState('zQ1Y0TbK8fC8sSV4');

  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Folder watch state
  const [watchFolder, setWatchFolder] = useState('');
  const [isWatching, setIsWatching] = useState(false);
  const [lastPhoto, setLastPhoto] = useState<NewPhotoEvent | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Listen for new photo events from chokidar
  useEffect(() => {
    window.electronAPI?.onNewPhoto((data) => {
      setLastPhoto(data);
      addLog(`📷 New photo: ${data.fileName}`, 'photo');
    });
  }, []);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    const time = new Date().toLocaleTimeString('en-GB', { hour12: false });
    setLogs((prev) => [...prev, { id: Date.now() + Math.random(), time, message, type }].slice(-100));
  };

  const sendCommand = async (endpoint: string, label: string, isConnectAction = false, shouldFocusApp = false) => {
    setLoading(true);
    if (!isConnectAction) {
      addLog(`Sending: ${endpoint} for ${label}`, 'command');
    }

    try {
      const separator = endpoint.includes('?') ? '&' : '?';
      const pwQuery = password ? `${separator}password=${encodeURIComponent(password)}` : '';
      const apiUrl = `http://${host}:${port}${endpoint}${pwQuery}`;

      const res = await fetch(apiUrl, { method: 'GET' });
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
          if (shouldFocusApp) {
            addLog('Switching to DSLRBooth...', 'info');
            window.electronAPI?.focusApp('dslrBooth');
          }
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

  // Folder watch handlers
  const handleSelectFolder = async () => {
    const folder = await window.electronAPI?.selectFolder();
    if (folder) {
      setWatchFolder(folder);
      addLog(`Folder selected: ${folder}`, 'info');
    }
  };

  const handleStartWatching = async () => {
    if (!watchFolder) return;
    await window.electronAPI?.startWatching(watchFolder);
    setIsWatching(true);
    addLog(`👁️ Watching folder: ${watchFolder}`, 'success');
  };

  const handleStopWatching = async () => {
    await window.electronAPI?.stopWatching();
    setIsWatching(false);
    addLog('⏹️ Stopped watching folder', 'info');
  };

  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto font-sans">
      <header className="flex items-center justify-between mb-8 pb-6 border-b border-gray-800">
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <span className="text-blue-500">⚡</span> DSLRBooth Web Controller
        </h1>
        <div className="flex items-center gap-3">
          {/* Watch Status */}
          {isWatching && (
            <div className="flex items-center gap-2 bg-amber-950/40 px-4 py-2 rounded-full border border-amber-800/50">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></div>
              <span className="font-medium text-sm text-amber-300">Watching</span>
            </div>
          )}
          {/* Connection Status */}
          <div className="flex items-center gap-3 bg-gray-900/50 px-4 py-2 rounded-full border border-gray-800">
            <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`}></div>
            <span className="font-medium text-sm text-gray-300">{connected ? 'Connected' : 'Disconnected'}</span>
          </div>
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
                <input type="text" value={host} onChange={(e) => setHost(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="192.168.1.100" />
              </div>
              <div className="lg:col-span-1">
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Port</label>
                <input type="number" value={port} onChange={(e) => setPort(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="8080" />
              </div>
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-1.5">API Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Leave empty if none" />
              </div>
            </div>
            <button onClick={handleConnect} disabled={loading}
              className={`w-full py-3 px-6 rounded-xl font-medium text-white shadow-lg transition-all flex justify-center items-center gap-2 ${connected
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500'
                } disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]`}>
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

          {/* Folder Watch Panel */}
          <section className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 backdrop-blur-md">
            <h2 className="text-xl font-semibold mb-5 flex items-center gap-2 text-white">
              <span>👁️</span> Folder Watch
            </h2>
            <div className="flex gap-3 mb-4">
              <input type="text" value={watchFolder} readOnly
                className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none"
                placeholder="Select DSLRBooth output folder..." />
              <button onClick={handleSelectFolder}
                className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm font-medium text-gray-200 transition-colors whitespace-nowrap">
                📂 Browse
              </button>
            </div>
            <div className="flex gap-3">
              {!isWatching ? (
                <button onClick={handleStartWatching} disabled={!watchFolder}
                  className="flex-1 py-3 px-6 rounded-xl font-medium text-white shadow-lg transition-all flex justify-center items-center gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]">
                  <span>▶️</span> Start Watching
                </button>
              ) : (
                <button onClick={handleStopWatching}
                  className="flex-1 py-3 px-6 rounded-xl font-medium text-white shadow-lg transition-all flex justify-center items-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 transform active:scale-[0.98]">
                  <span>⏹️</span> Stop Watching
                </button>
              )}
            </div>

            {/* Last Captured Photo */}
            {lastPhoto && (
              <div className="mt-5 p-4 bg-gray-950 border border-gray-700 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                    <span>📷</span> Last Captured
                  </h3>
                  <span className="text-xs text-gray-500">{lastPhoto.fileName}</span>
                </div>
                <div className="rounded-lg overflow-hidden bg-gray-900 flex items-center justify-center">
                  <img
                    src={`file://${lastPhoto.filePath}`}
                    alt={lastPhoto.fileName}
                    className="max-h-[300px] object-contain w-full"
                  />
                </div>
              </div>
            )}
          </section>

          {/* Session Controls */}
          <section className={`bg-gray-900/40 border border-gray-800 rounded-2xl p-6 backdrop-blur-md transition-opacity duration-300 ${!connected ? 'opacity-50' : 'opacity-100'}`}>
            <h2 className="text-xl font-semibold mb-5 flex items-center gap-2 text-white">
              <span>🎬</span> Session Controls
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Print', icon: '📸', cmd: '/api/start?mode=print', color: 'from-pink-500 to-rose-500', shadow: 'shadow-pink-500/20' },
                { label: 'GIF', icon: '🎞️', cmd: '/api/start?mode=gif', color: 'from-purple-500 to-fuchsia-500', shadow: 'shadow-purple-500/20' },
                { label: 'Boomerang', icon: '🪃', cmd: '/api/start?mode=boomerang', color: 'from-orange-500 to-amber-500', shadow: 'shadow-orange-500/20' },
                { label: 'Video', icon: '🎥', cmd: '/api/start?mode=video', color: 'from-sky-500 to-blue-500', shadow: 'shadow-blue-500/20' },
              ].map((btn) => (
                <button key={btn.label} disabled={!connected || loading}
                  onClick={() => sendCommand(btn.cmd, btn.label, false, true)}
                  className={`relative overflow-hidden group rounded-2xl p-6 flex flex-col items-center justify-center gap-3 bg-gray-800 border-2 border-gray-700 hover:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95 shadow-lg hover:shadow-xl ${btn.shadow}`}>
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
              <button onClick={() => setLogs([])} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
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
                          log.type === 'photo' ? 'text-amber-400' :
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

