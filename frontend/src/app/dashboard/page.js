'use client';
export const dynamic = 'force-dynamic';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Dashboard() {
  const { currentUser, logout } = useAuth();
  const [keys, setKeys] = useState([]);
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState(new Set());
  const [healthTestResults, setHealthTestResults] = useState({});
  const [isHealthTesting, setIsHealthTesting] = useState(false);
  const [testingKeyId, setTestingKeyId] = useState(null);

  useEffect(() => {
    if (!currentUser) {
      router.push('/login');
    } else {
      fetchKeys();
    }
  }, [currentUser, router]);

  const getAuthHeaders = async (extra = {}) => {
    const token = currentUser ? await currentUser.getIdToken() : null;
    return {
      ...(extra || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const fetchKeys = async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      const response = await fetch('https://apikeyvault.onrender.com/api/keys', { headers });
      const result = await response.json();
      if (result.success) {
        setKeys(result.data);
      }
    } catch (error) {
      console.error('Error fetching keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const handleNewKeyClick = (e) => {
    e.preventDefault();
    setShowCreateModal(true);
  };

  const handleCloseModal = () => setShowCreateModal(false);

  const toggleKeyVisibility = (keyId) => {
    setVisibleKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(keyId)) {
        newSet.delete(keyId);
      } else {
        newSet.add(keyId);
      }
      return newSet;
    });
  };

  const handleBulkHealthTest = async () => {
    try {
      setIsHealthTesting(true);
      const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
      const response = await fetch('https://apikeyvault.onrender.com/api/health/bulk-test', {
        method: 'POST',
        headers
      });

      const result = await response.json();
      if (result.success) {
        // Convert results array to object keyed by keyId for easy lookup
        const resultsObj = {};
        result.results.forEach(testResult => {
          resultsObj[testResult.keyId] = testResult;
        });
        setHealthTestResults(resultsObj);
      }
    } catch (error) {
      console.error('Error testing API keys:', error);
    } finally {
      setIsHealthTesting(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm('Delete this API key? This cannot be undone.');
    if (!confirmDelete) return;
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`https://apikeyvault.onrender.com/api/keys/${id}`, { method: 'DELETE', headers });
      if (response.ok) {
        // Optimistically update list
        setKeys(prev => prev.filter(k => k.id !== id));
      } else {
        console.error('Failed to delete');
        // fallback to refetch
        fetchKeys();
      }
    } catch (e) {
      console.error('Error deleting key:', e);
    }
  };
const handleTestKey = async (id) => {
  try {
    setTestingKeyId(id);

    const headers = await getAuthHeaders({ "Content-Type": "application/json" });
    const response = await fetch(`https://apikeyvault.onrender.com/api/health/test/${id}`, {
      method: "POST",
      headers
    });
    console.log("Response:", response);
    const data = await response.json();
    
    if (data.success && data.result) {
      const testResult = data.result;
      setHealthTestResults({
        [id]: { 
          success: testResult.success, 
          status: testResult.success ? "Passed" : "Failed",
          message: testResult.error || (testResult.success ? "API key is valid" : "API key test failed")
        }
      });
    } else {
      setHealthTestResults({
        [id]: { 
          success: false, 
          status: "Failed", 
          message: data.error || "Test failed" 
        }
      });
    }

  } catch (error) {
    console.error("Error testing key:", error);
    setHealthTestResults({
      [id]: { 
        success: false, 
        status: "Failed", 
        message: error.message 
      }
    });
  } finally {
    setTestingKeyId(null);
  }
};




  const handleCreateKey = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData(e.currentTarget);
      const payload = {
        keyName: fd.get('keyName') || '',
        service: fd.get('service') || '',
        apiKey: fd.get('apiKey') || '',
        rateLimit: fd.get('rateLimit') ? Number(fd.get('rateLimit')) : null,
        expiresAt: fd.get('expiresAt') || null,
        ipWhitelist: fd.get('ipWhitelist') ? String(fd.get('ipWhitelist')).split(',').map(s => s.trim()).filter(Boolean) : [],
      };

      const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
      const response = await fetch('https://apikeyvault.onrender.com/api/keys', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setShowCreateModal(false);
        // Refresh the keys list
        fetchKeys();
      }
    } catch (error) {
      console.error('Error creating key:', error);
    }
  };

  if (!currentUser) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-blue-50">
      {/* Top Bar */}
      <header className="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white/90 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center">
              <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 4l9 5-9 5-9-5 9-5z" />
                <path d="M3 14l9 5 9-5" />
              </svg>
            </div>
            <div>
              <p className="text-sm leading-4 text-slate-500">API Key Vault</p>
              <h1 className="text-base font-semibold text-slate-900">Dashboard</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-slate-600">
              {currentUser.displayName || currentUser.email}
            </span>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-lg bg-white text-slate-700 border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 active:bg-slate-100"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <path d="M10 17l5-5-5-5" />
                <path d="M15 12H3" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPI Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: 'Total Keys',
              value: keys.length.toString(),
              delta: keys.length > 0 ? `+${keys.length} total` : 'No keys yet',
              color: 'from-blue-500 to-indigo-500'
            },
            {
              label: 'Active Keys',
              value: keys.filter(key => !key.expiresAt || new Date(key.expiresAt) > new Date()).length.toString(),
              delta: 'Currently active',
              color: 'from-emerald-500 to-green-500'
            },
            {
              label: 'Services',
              value: [...new Set(keys.map(key => key.service))].length.toString(),
              delta: 'Unique services',
              color: 'from-violet-500 to-purple-500'
            },
            {
              label: 'Expired Keys',
              value: keys.filter(key => key.expiresAt && new Date(key.expiresAt) < new Date()).length.toString(),
              delta: 'Need attention',
              color: 'from-rose-500 to-pink-500'
            },
          ].map((kpi) => (
            <div key={kpi.label} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className={`absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br ${kpi.color} opacity-10 group-hover:opacity-20 transition-opacity`} />
              <p className="text-sm text-slate-500">{kpi.label}</p>
              <div className="mt-2 flex items-baseline gap-2">
                <p className="text-2xl font-bold text-slate-900">{kpi.value}</p>
                <span className="text-xs text-slate-500">{kpi.delta}</span>
              </div>
            </div>
          ))}
        </section>

        {/* Main Grid */}
        <section className="grid grid-cols-1 gap-6">
          {/* API Keys table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Your API Keys</h3>
                <p className="text-sm text-slate-500">Manage and rotate credentials</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleBulkHealthTest}
                  disabled={isHealthTesting || keys.length === 0}
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 text-white px-3 py-2 text-sm font-medium shadow hover:from-emerald-700 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isHealthTesting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Testing...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 12l2 2 4-4" />
                        <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3" />
                        <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3" />
                        <path d="M12 3c0 1-1 3-3 3s-3-2-3-3 1-3 3-3 3 2 3 3" />
                        <path d="M12 21c0-1 1-3 3-3s3 2 3 3-1 3-3 3-3-2-3-3" />
                      </svg>
                      Health Test
                    </>
                  )}
                </button>
                <button type="button" onClick={handleNewKeyClick} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3 py-2 text-sm font-medium shadow hover:from-blue-700 hover:to-indigo-700">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                  New Key
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">KeyID</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">API Key</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Created At</th>
                    <th className="px-5 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Health</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="px-5 py-8 text-center text-slate-500">
                        <div className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Loading keys...
                        </div>
                      </td>
                    </tr>
                  ) : keys.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-5 py-8 text-center text-slate-500">
                        No API keys found. Create your first key to get started.
                      </td>
                    </tr>
                  ) : (
                    keys.map((key, index) => {
                      const isExpired = key.expiresAt && new Date(key.expiresAt) < new Date();
                      const status = isExpired ? 'Expired' : 'Active';
                      const createdDate = new Date(key.createdAt).toLocaleDateString();
                      const isVisible = visibleKeys.has(key.id);
                      const maskedKey = key.apiKey ? '•'.repeat(Math.min(key.apiKey.length, 20)) + (key.apiKey.length > 20 ? '...' : '') : '';
                      const healthResult = healthTestResults[key.id];

                      return (
                        <tr key={key.id} className="hover:bg-slate-50">
                          <td className="px-5 py-3 text-sm text-slate-900">{index + 1}</td>
                          <td className="px-5 py-3 text-sm text-slate-600">{key.keyName}</td>
                          <td className="px-5 py-3 text-sm text-slate-600 font-mono">
                            {isVisible ? (
                              <span className="text-green-600 break-all">{key.apiKey}</span>
                            ) : (
                              <span className="text-slate-400">{maskedKey}</span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-sm text-slate-600">{createdDate}</td>
                          <td className="px-5 py-3 text-center">
                            <div className="flex flex-col items-center gap-2">
                              {healthResult ? (
                                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${healthResult.success
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-red-50 text-red-700'
                                  }`}>
                                  {healthResult.success ? (
                                    <>
                                      <svg className="h-3 w-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M9 12l2 2 4-4" />
                                      </svg>
                                      Passed
                                    </>
                                  ) : (
                                    <>
                                      <svg className="h-3 w-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                      Failed
                                    </>
                                  )}
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-slate-50 text-slate-500">
                                  <svg className="h-3 w-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M12 6v6l4 2" />
                                  </svg>
                                  Not Tested
                                </span>
                              )}
                              <button
                                onClick={() => handleTestKey(key.id)}
                                disabled={testingKeyId === key.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                              >
                                {testingKeyId === key.id ? (
                                  <>
                                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                    </svg>
                                    Testing
                                  </>
                                ) : (
                                  <>
                                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M12 3v3m0 12v3m9-9h-3M6 12H3" />
                                    </svg>
                                    Test
                                  </>
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-sm text-right">
                            <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                              }`}>
                              {status}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-center">
                            <button
                              onClick={() => toggleKeyVisibility(key.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-700 transition-colors"
                            >
                              {isVisible ? (
                                <>
                                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                    <line x1="1" y1="1" x2="23" y2="23" />
                                  </svg>
                                  Hide
                                </>
                              ) : (
                                <>
                                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                    <circle cx="12" cy="12" r="3" />
                                  </svg>
                                  Show
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => handleDelete(key.id)}
                              className="ml-2 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                            >
                              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 6h18" />
                                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                <path d="M10 11v6M14 11v6" />
                              </svg>
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
      {showCreateModal && (
        <div className="fixed inset-0 z-20 flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/40" onClick={handleCloseModal} />
          <div className="relative z-10 w-full max-w-lg mx-4 rounded-2xl bg-white shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Create New API Key</h3>
              <button onClick={handleCloseModal} className="p-2 rounded-md hover:bg-slate-100">
                <svg className="h-5 w-5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <form className="px-6 py-5 space-y-4" onSubmit={handleCreateKey}>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Key Name *</label>
                <input name="keyName" className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., OpenAI Production" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Service *</label>
                <input name="service" className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., OpenAI, Stripe, AWS" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">API Key *</label>
                <textarea name="apiKey" rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Paste your API key here" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rate Limit (requests per minute)</label>
                <input name="rateLimit" className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" defaultValue="1000" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Expires At (optional)</label>
                  <input name="expiresAt" className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="mm/dd/yyyy --:-- --" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">IP Whitelist (optional)</label>
                  <input name="ipWhitelist" className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., 192.168.1.1, 10.0.0.5" />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium hover:from-blue-700 hover:to-indigo-700">Create Key</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
