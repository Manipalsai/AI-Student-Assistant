import { useState, useEffect, useCallback } from 'react';
import {
  KeyRound, ShieldCheck, ShieldAlert, Plus, Trash2, CheckCircle2,
  Loader2, ExternalLink, Zap, ChevronDown, ChevronUp, Eye, EyeOff,
  RefreshCw, Star, AlertTriangle, Info, Cpu
} from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const DEFAULT_SUPPORTED_PROVIDERS = {
  gemini: {
    name: 'Google Gemini',
    description: 'Generous free tier with high RPM (gemini-2.5-flash, gemini-1.5-pro)',
    example_prefix: 'AIzaSy...',
    docs_url: 'https://aistudio.google.com/app/apikey',
    default_model: 'gemini-2.5-flash'
  },
  groq: {
    name: 'Groq Cloud',
    description: 'Ultra-fast LPU inference (llama-3.3-70b-versatile, mixtral-8x7b)',
    example_prefix: 'gsk_...',
    docs_url: 'https://console.groq.com/keys',
    default_model: 'llama-3.3-70b-versatile'
  },
  openai: {
    name: 'OpenAI',
    description: 'Standard industry models (gpt-4o-mini, gpt-4o, o1-mini)',
    example_prefix: 'sk-... or sk-proj-...',
    docs_url: 'https://platform.openai.com/api-keys',
    default_model: 'gpt-4o-mini'
  },
  openrouter: {
    name: 'OpenRouter',
    description: 'Unified API gateway supporting Claude, DeepSeek, Llama & Gemini',
    example_prefix: 'sk-or-v1-...',
    docs_url: 'https://openrouter.ai/keys',
    default_model: 'meta-llama/llama-3.3-70b-instruct'
  },
  anthropic: {
    name: 'Anthropic Claude',
    description: 'State-of-the-art reasoning (Claude 3.5 Sonnet, Claude 3 Haiku)',
    example_prefix: 'sk-ant-api03-...',
    docs_url: 'https://console.anthropic.com/settings/keys',
    default_model: 'claude-3-5-sonnet-20241022'
  },
  custom: {
    name: 'Custom / Self-Hosted Provider',
    description: 'Connect any OpenAI-compatible endpoint (DeepSeek, Together AI, Ollama, vLLM)',
    example_prefix: 'sk-... (or any custom key)',
    docs_url: 'https://ollama.com',
    default_model: 'deepseek-chat'
  }
};

const PROVIDER_META = {
  gemini: {
    color: '#4285F4',
    gradient: 'linear-gradient(135deg, #4285F4 0%, #0F9D58 100%)',
    icon: '🤖',
    badge: 'Google'
  },
  anthropic: {
    color: '#D97706',
    gradient: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
    icon: '🎭',
    badge: 'Anthropic'
  },
  groq: {
    color: '#F55036',
    gradient: 'linear-gradient(135deg, #F55036 0%, #FF8A00 100%)',
    icon: '⚡',
    badge: 'Ultra-Fast LPU'
  },
  openai: {
    color: '#10A37F',
    gradient: 'linear-gradient(135deg, #10A37F 0%, #1A7F64 100%)',
    icon: '🧠',
    badge: 'OpenAI'
  },
  openrouter: {
    color: '#8B5CF6',
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
    icon: '🌐',
    badge: 'Multi-Model'
  },
  custom: {
    color: '#06B6D4',
    gradient: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
    icon: '⚙️',
    badge: 'Custom / Self-Hosted'
  }
};

function ProviderCard({ provider, spec, onAdd }) {
  const meta = PROVIDER_META[provider] || { color: '#64748b', gradient: 'linear-gradient(135deg,#334155,#475569)', icon: '🔑', badge: '' };
  const [expanded, setExpanded] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [label, setLabel] = useState('');
  const [baseUrl, setBaseUrl] = useState(provider === 'custom' ? 'https://api.deepseek.com/v1' : '');
  const [modelName, setModelName] = useState(spec.default_model || '');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validationState, setValidationState] = useState(null);
  const [validationMsg, setValidationMsg] = useState('');

  const handleValidate = async () => {
    if (!apiKey.trim() && provider !== 'custom') { toast.error('Please enter an API key first.'); return; }
    setLoading(true);
    setValidationState(null);
    try {
      const res = await fetch(`${API_BASE}/api/keys/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          api_key: apiKey.trim() || 'none',
          base_url: baseUrl.trim() || undefined,
          model: modelName.trim() || undefined
        })
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setValidationState('valid');
        setValidationMsg(`Verified in ${data.details?.latency_sec ?? '?'}s using ${data.details?.model_tested ?? 'model'}`);
      } else {
        setValidationState('invalid');
        setValidationMsg(data.detail || 'Validation failed. Check your credentials and try again.');
      }
    } catch {
      setValidationState('invalid');
      setValidationMsg('Network error during validation.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim() && provider !== 'custom') { toast.error('Please enter an API key first.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/keys/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          api_key: apiKey.trim() || 'none',
          label: label.trim() || undefined,
          base_url: baseUrl.trim() || undefined,
          model: modelName.trim() || undefined,
          set_active: true
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`${spec.name} saved and activated!`);
        setApiKey('');
        setLabel('');
        setExpanded(false);
        setValidationState(null);
        onAdd(data.status);
      } else {
        toast.error(data.detail || 'Failed to save key.');
        setValidationState('invalid');
        setValidationMsg(data.detail || 'Save failed.');
      }
    } catch {
      toast.error('Network error while saving key.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: 'rgba(15,23,42,0.8)',
      border: `1px solid ${expanded ? meta.color + '55' : '#1e293b'}`,
      borderRadius: 16,
      overflow: 'hidden',
      transition: 'all 0.3s ease',
      boxShadow: expanded ? `0 0 30px ${meta.color}22` : 'none'
    }}>
      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 14,
          padding: '16px 20px', background: 'transparent', border: 'none',
          cursor: 'pointer', textAlign: 'left'
        }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 22, background: meta.gradient, flexShrink: 0
        }}>
          {meta.icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 15 }}>{spec.name}</div>
          <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>{spec.description}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            background: meta.gradient, color: '#fff', fontSize: 10,
            fontWeight: 700, padding: '2px 10px', borderRadius: 20
          }}>{meta.badge}</span>
          {expanded ? <ChevronUp size={16} color="#94a3b8" /> : <ChevronDown size={16} color="#94a3b8" />}
        </div>
      </button>

      {expanded && (
        <div style={{ padding: '0 20px 20px', borderTop: '1px solid #1e293b' }}>
          <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{
              background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 8
            }}>
              <Info size={14} color="#60a5fa" style={{ marginTop: 1, flexShrink: 0 }} />
              <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
                Expected format: <code style={{ color: '#60a5fa', background: '#0f172a', padding: '1px 5px', borderRadius: 4 }}>{spec.example_prefix}</code>
                {' · '}
                <a href={spec.docs_url} target="_blank" rel="noopener noreferrer"
                  style={{ color: '#60a5fa', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  Get API Key <ExternalLink size={11} />
                </a>
              </div>
            </div>

            {provider === 'custom' && (
              <>
                <div>
                  <label style={{ fontSize: 11, color: '#06b6d4', fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    API Base URL / Endpoint *
                  </label>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={e => setBaseUrl(e.target.value)}
                    placeholder="e.g. https://api.deepseek.com/v1 or http://localhost:11434/v1"
                    style={{
                      width: '100%', background: '#0f172a', border: '1px solid #334155',
                      borderRadius: 10, padding: '10px 14px', color: '#e2e8f0',
                      fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace'
                    }}
                  />
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                    Compatible with DeepSeek, Together.ai, Mistral, Perplexity, local Ollama or LM Studio.
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 11, color: '#06b6d4', fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Model Identifier *
                  </label>
                  <input
                    type="text"
                    value={modelName}
                    onChange={e => setModelName(e.target.value)}
                    placeholder="e.g. deepseek-chat or mistralai/Mistral-7B-Instruct-v0.3"
                    style={{
                      width: '100%', background: '#0f172a', border: '1px solid #334155',
                      borderRadius: 10, padding: '10px 14px', color: '#e2e8f0',
                      fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace'
                    }}
                  />
                </div>
              </>
            )}

            <div>
              <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Label (optional)
              </label>
              <input
                type="text"
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder={`My ${spec.name} Key`}
                style={{
                  width: '100%', background: '#0f172a', border: '1px solid #334155',
                  borderRadius: 10, padding: '10px 14px', color: '#e2e8f0',
                  fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {provider === 'custom' ? 'API Key (Optional for local Ollama / LM Studio)' : 'API Key *'}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={e => { setApiKey(e.target.value); setValidationState(null); }}
                  placeholder={provider === 'custom' ? 'sk-... (leave blank or enter dummy if using local Ollama)' : `Paste your ${spec.example_prefix} key here`}
                  style={{
                    width: '100%', background: '#0f172a',
                    border: `1px solid ${validationState === 'valid' ? '#10b981' : validationState === 'invalid' ? '#ef4444' : '#334155'}`,
                    borderRadius: 10, padding: '10px 44px 10px 14px', color: '#e2e8f0',
                    fontSize: 13, outline: 'none', boxSizing: 'border-box',
                    fontFamily: 'ui-monospace, monospace', transition: 'border-color 0.2s'
                  }}
                />
                <button
                  onClick={() => setShowKey(v => !v)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0
                  }}
                >
                  {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {validationState && (
              <div style={{
                background: validationState === 'valid' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${validationState === 'valid' ? '#10b981' : '#ef4444'}44`,
                borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 8
              }}>
                {validationState === 'valid'
                  ? <CheckCircle2 size={14} color="#10b981" style={{ marginTop: 1, flexShrink: 0 }} />
                  : <ShieldAlert size={14} color="#ef4444" style={{ marginTop: 1, flexShrink: 0 }} />}
                <span style={{ fontSize: 12, color: validationState === 'valid' ? '#10b981' : '#f87171', lineHeight: 1.5 }}>
                  {validationMsg}
                </span>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button
                onClick={handleValidate}
                disabled={loading || !apiKey.trim()}
                style={{
                  flex: 1, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
                  color: '#60a5fa', borderRadius: 10, padding: '10px 0', fontSize: 13, fontWeight: 600,
                  cursor: loading || !apiKey.trim() ? 'not-allowed' : 'pointer', opacity: loading || !apiKey.trim() ? 0.5 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.2s'
                }}
              >
                {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={14} />}
                Test Key
              </button>
              <button
                onClick={handleSave}
                disabled={loading || !apiKey.trim()}
                style={{
                  flex: 2, background: meta.gradient, border: 'none',
                  color: '#fff', borderRadius: 10, padding: '10px 0', fontSize: 13, fontWeight: 700,
                  cursor: loading || !apiKey.trim() ? 'not-allowed' : 'pointer', opacity: loading || !apiKey.trim() ? 0.5 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.2s'
                }}
              >
                {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />}
                Save & Activate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SavedKeyRow({ keyRec, onDelete, onSelect }) {
  const meta = PROVIDER_META[keyRec.provider] || { color: '#64748b', gradient: 'linear-gradient(135deg,#334155,#475569)', icon: '🔑' };

  return (
    <div style={{
      background: keyRec.is_active ? 'rgba(16,185,129,0.06)' : 'rgba(15,23,42,0.6)',
      border: `1px solid ${keyRec.is_active ? '#10b981' : '#1e293b'}`,
      borderRadius: 12, padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.2s'
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 18, background: meta.gradient, flexShrink: 0
      }}>
        {meta.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {keyRec.label}
          </span>
          {keyRec.is_active && (
            <span style={{
              background: 'rgba(16,185,129,0.2)', color: '#10b981', fontSize: 10,
              fontWeight: 700, padding: '2px 8px', borderRadius: 20, flexShrink: 0
            }}>ACTIVE</span>
          )}
        </div>
        <div style={{ color: '#64748b', fontSize: 11, marginTop: 3, fontFamily: 'monospace' }}>
          {keyRec.masked_key} · {keyRec.model}
        </div>
        {keyRec.verified_at && (
          <div style={{ color: '#475569', fontSize: 10, marginTop: 2 }}>Verified {keyRec.verified_at}</div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        {!keyRec.is_active && (
          <button
            onClick={() => onSelect(keyRec.id)}
            title="Set as active"
            style={{
              background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
              color: '#60a5fa', borderRadius: 8, width: 32, height: 32,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s'
            }}
          >
            <Star size={13} />
          </button>
        )}
        <button
          onClick={() => onDelete(keyRec.id)}
          title="Delete key"
          style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
            color: '#f87171', borderRadius: 8, width: 32, height: 32,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s'
          }}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

export default function ApiKeysSettings() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/keys/status`);
      if (res.ok) setStatus(await res.json());
    } catch (e) {
      console.error('Failed to fetch key status:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleDelete = async (keyId) => {
    if (!window.confirm('Delete this API key? This action cannot be undone.')) return;
    try {
      const res = await fetch(`${API_BASE}/api/keys/${keyId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) { toast.success('Key deleted.'); setStatus(data.status); }
      else toast.error(data.detail || 'Delete failed.');
    } catch { toast.error('Network error during deletion.'); }
  };

  const handleSelect = async (keyId) => {
    try {
      const res = await fetch(`${API_BASE}/api/keys/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key_id: keyId })
      });
      const data = await res.json();
      if (res.ok) { toast.success(`Active provider changed to ${data.status?.active_provider_name}`); setStatus(data.status); }
      else toast.error(data.detail || 'Failed to switch provider.');
    } catch { toast.error('Network error while switching provider.'); }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12 }}>
        <Loader2 size={28} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ color: '#64748b', fontSize: 15 }}>Loading API Key Settings…</span>
      </div>
    );
  }

  const providers = (status?.supported_providers && Object.keys(status.supported_providers).length > 0)
    ? status.supported_providers
    : DEFAULT_SUPPORTED_PROVIDERS;
  const savedKeys = status?.saved_keys || [];
  const activeMode = status?.active_mode || 'system_default';
  const activeMeta = PROVIDER_META[status?.active_provider] || PROVIDER_META.gemini;
  const activeProviderName = status?.active_provider_name || 'System Gemini (Pool)';
  const activeModel = status?.active_model || 'gemini-2.5-flash';
  const activeKeyMasked = status?.active_key_masked || 'System .env Pool';

  return (
    <div style={{
      minHeight: '100vh', background: 'transparent', padding: '32px 24px',
      fontFamily: "'Inter', 'Outfit', sans-serif", maxWidth: 820, margin: '0 auto'
    }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <KeyRound size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ color: '#f1f5f9', fontSize: 24, fontWeight: 800, margin: 0 }}>API Key Manager</h1>
            <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>Bring your own keys — never worry about quota again</p>
          </div>
          <button onClick={fetchStatus} style={{
            marginLeft: 'auto', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: 10, padding: '8px 12px', cursor: 'pointer', color: '#60a5fa',
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600
          }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Active Provider Banner */}
      <div style={{
        background: activeMode === 'custom'
          ? 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.04) 100%)'
          : 'rgba(59,130,246,0.08)',
        border: `1px solid ${activeMode === 'custom' ? '#10b98155' : 'rgba(59,130,246,0.3)'}`,
        borderRadius: 16, padding: '18px 22px', marginBottom: 28,
        display: 'flex', alignItems: 'center', gap: 14
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 22,
          background: activeMode === 'custom' ? activeMeta.gradient : 'linear-gradient(135deg,#1e293b,#0f172a)',
          border: '1px solid rgba(255,255,255,0.08)'
        }}>
          {activeMode === 'custom' ? activeMeta.icon : '🛡️'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 14 }}>
              {activeMode === 'custom' ? 'Custom Key Active' : 'System Default Active'}
            </span>
            {activeMode === 'custom'
              ? <span style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981', fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 20 }}>YOUR KEY</span>
              : <span style={{ background: 'rgba(59,130,246,0.2)', color: '#60a5fa', fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 20 }}>SYSTEM POOL</span>}
          </div>
          <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 3 }}>
            Provider: <strong style={{ color: '#e2e8f0' }}>{activeProviderName}</strong>
            {' · '}Model: <strong style={{ color: '#e2e8f0' }}>{activeModel}</strong>
            {' · '}Key: <code style={{ color: '#94a3b8', fontFamily: 'monospace' }}>{activeKeyMasked}</code>
          </div>
        </div>
        {activeMode === 'custom' && (
          <button
            onClick={() => handleSelect('system_default')}
            style={{
              background: 'rgba(100,116,139,0.2)', border: '1px solid #334155',
              color: '#94a3b8', borderRadius: 10, padding: '8px 14px', cursor: 'pointer',
              fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            <RefreshCw size={12} /> Use System
          </button>
        )}
      </div>

      {/* Quota Warning */}
      <div style={{
        background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)',
        borderRadius: 14, padding: '14px 18px', marginBottom: 28,
        display: 'flex', alignItems: 'flex-start', gap: 12
      }}>
        <AlertTriangle size={16} color="#f59e0b" style={{ marginTop: 1, flexShrink: 0 }} />
        <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.7 }}>
          <strong style={{ color: '#fbbf24' }}>Why add your own key?</strong>
          {' '}The system uses a shared Gemini key pool which can hit quota limits in production.
          Add your own free API key from any supported provider to get uninterrupted, personal access.
          Your key is stored locally on the server and is <strong style={{ color: '#e2e8f0' }}>never shared</strong> with anyone.
        </div>
      </div>

      {/* Add new key section */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Plus size={16} color="#60a5fa" />
          <h2 style={{ color: '#e2e8f0', fontSize: 15, fontWeight: 700, margin: 0 }}>Add a New API Key</h2>
          <div style={{ flex: 1, height: 1, background: '#1e293b' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Object.entries(providers).map(([provider, spec]) => (
            <ProviderCard
              key={provider}
              provider={provider}
              spec={spec}
              onAdd={(newStatus) => setStatus(newStatus)}
            />
          ))}
        </div>
      </div>

      {/* Saved keys list */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <ShieldCheck size={16} color="#10b981" />
          <h2 style={{ color: '#e2e8f0', fontSize: 15, fontWeight: 700, margin: 0 }}>Saved API Keys</h2>
          <span style={{
            background: 'rgba(16,185,129,0.15)', color: '#10b981', fontSize: 11,
            fontWeight: 700, padding: '2px 8px', borderRadius: 20
          }}>{savedKeys.length}</span>
          <div style={{ flex: 1, height: 1, background: '#1e293b' }} />
        </div>

        {savedKeys.length === 0 ? (
          <div style={{
            background: 'rgba(15,23,42,0.6)', border: '1px dashed #1e293b',
            borderRadius: 14, padding: '32px 24px', textAlign: 'center'
          }}>
            <KeyRound size={36} color="#334155" style={{ margin: '0 auto 12px' }} />
            <div style={{ color: '#64748b', fontSize: 14, fontWeight: 600 }}>No custom keys saved yet</div>
            <div style={{ color: '#475569', fontSize: 12, marginTop: 6 }}>
              Add a key above to unlock personal, quota-free AI generation
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* System default row */}
            <div
              onClick={() => handleSelect('system_default')}
              style={{
                background: activeMode === 'system_default' ? 'rgba(59,130,246,0.08)' : 'rgba(15,23,42,0.4)',
                border: `1px solid ${activeMode === 'system_default' ? 'rgba(59,130,246,0.4)' : '#1e293b'}`,
                borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.2s'
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 18, background: 'linear-gradient(135deg,#1e3a5f,#1e293b)',
                border: '1px solid #334155', flexShrink: 0
              }}>🛡️</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 13 }}>
                  System Default (Gemini Pool)
                  {activeMode === 'system_default' && (
                    <span style={{
                      marginLeft: 8, background: 'rgba(59,130,246,0.2)', color: '#60a5fa',
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20
                    }}>ACTIVE</span>
                  )}
                </div>
                <div style={{ color: '#475569', fontSize: 11, marginTop: 2 }}>
                  Shared internal Gemini key pool from .env — system managed
                </div>
              </div>
              {activeMode !== 'system_default' && <Star size={13} color="#64748b" />}
            </div>

            {savedKeys.map(key => (
              <SavedKeyRow key={key.id} keyRec={key} onDelete={handleDelete} onSelect={handleSelect} />
            ))}
          </div>
        )}
      </div>

      {/* Supported providers info */}
      <div style={{
        marginTop: 32, background: 'rgba(15,23,42,0.6)', border: '1px solid #1e293b',
        borderRadius: 14, padding: '16px 20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Cpu size={14} color="#60a5fa" />
          <span style={{ color: '#94a3b8', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Supported Providers
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: 10 }}>
          {Object.entries(providers).map(([provider, spec]) => {
            const m = PROVIDER_META[provider] || { color: '#64748b', icon: '🔑' };
            return (
              <div key={provider} style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid #1e293b',
                borderRadius: 10, padding: '10px 12px'
              }}>
                <div style={{ fontSize: 16, marginBottom: 4 }}>{m.icon}</div>
                <div style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 700 }}>{spec.name}</div>
                <div style={{ color: '#475569', fontSize: 11, marginTop: 2 }}>{spec.default_model}</div>
                <a href={spec.docs_url} target="_blank" rel="noopener noreferrer"
                  style={{ color: m.color, fontSize: 11, marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 3, textDecoration: 'none' }}>
                  Get key <ExternalLink size={10} />
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
