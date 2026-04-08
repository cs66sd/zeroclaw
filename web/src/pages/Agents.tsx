import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Loader2, AlertCircle, Zap, Coffee, Bug, Search, Megaphone, SendHorizonal, Bot, MessageCircle } from 'lucide-react';
import { getAgents, postAgentMessage, type AgentDef } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Cartoon avatar mapping — SVG inline for each role
const AVATARS: Record<string, { bg: string; emoji: string; Icon: typeof Users }> = {
    ops: { bg: 'from-orange-400 to-red-500', emoji: '📢', Icon: Megaphone },
    design: { bg: 'from-purple-400 to-pink-500', emoji: '🎯', Icon: Zap },
    dev: { bg: 'from-cyan-400 to-blue-500', emoji: '💻', Icon: Zap },
    qa: { bg: 'from-green-400 to-emerald-500', emoji: '🐛', Icon: Bug },
    intel: { bg: 'from-yellow-400 to-amber-500', emoji: '🔍', Icon: Search },
};

function getAvatarStyle(id: string) {
    return AVATARS[id] ?? { bg: 'from-gray-400 to-slate-500', emoji: '🤖', Icon: Users };
}

function StatusBadge({ status }: { status: AgentDef['status'] }) {
    if (status.state === 'idle') {
        return (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                <Coffee className="w-3 h-3" /> 空闲
            </span>
        );
    }
    if (status.state === 'working') {
        return (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                <Loader2 className="w-3 h-3 animate-spin" /> {status.task}
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
            <AlertCircle className="w-3 h-3" /> 错误
        </span>
    );
}

export default function Agents() {
    const [agents, setAgents] = useState<AgentDef[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    // Team chat state
    const [chatOpen, setChatOpen] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'agent'; text: string; agent?: string }[]>([]);
    const [chatSessionIds, setChatSessionIds] = useState<Record<string, string>>({});
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        getAgents()
            .then((a) => {
                setAgents(a);
                if (a.length > 0 && !selectedAgent) setSelectedAgent(a[0]!.id);
            })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages, chatLoading]);

    const handleTeamSend = async () => {
        if (!selectedAgent || !chatInput.trim() || chatLoading) return;
        const text = chatInput.trim();
        const agentName = agents.find((a) => a.id === selectedAgent)?.display_name ?? selectedAgent;
        setChatInput('');
        setChatMessages((prev) => [...prev, { role: 'user', text, agent: agentName }]);
        setChatLoading(true);
        try {
            const res = await postAgentMessage(selectedAgent, text, chatSessionIds[selectedAgent]);
            setChatSessionIds((prev) => ({ ...prev, [selectedAgent!]: res.session_id }));
            setChatMessages((prev) => [...prev, { role: 'agent', text: res.reply, agent: agentName }]);
        } catch (e: any) {
            setChatMessages((prev) => [...prev, { role: 'agent', text: `[错误] ${e.message}`, agent: agentName }]);
        } finally {
            setChatLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--pc-accent)' }} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="flex items-center gap-2 text-red-500">
                    <AlertCircle className="w-5 h-5" />
                    <span>{error}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
                <Users className="w-7 h-7" style={{ color: 'var(--pc-accent)' }} />
                <h1 className="text-2xl font-bold" style={{ color: 'var(--pc-text-primary)' }}>
                    Agent 团队
                </h1>
                <span
                    className="text-sm px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--pc-bg-secondary)', color: 'var(--pc-text-secondary)' }}
                >
                    {agents.length} 个 Agent
                </span>
            </div>

            {agents.length === 0 ? (
                <div className="text-center py-16" style={{ color: 'var(--pc-text-secondary)' }}>
                    <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">还没有 Agent</p>
                    <p className="text-sm mt-1">在 workspace/agents/ 目录下创建 Agent 定义</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
                    {agents.map((agent) => {
                        const av = getAvatarStyle(agent.avatar || agent.id);
                        return (
                            <button
                                key={agent.id}
                                type="button"
                                onClick={() => navigate(`/agents/${agent.id}`)}
                                className="group relative rounded-2xl border p-5 text-left transition-all hover:scale-[1.02] hover:shadow-lg focus:outline-none focus:ring-2"
                                style={{
                                    background: 'var(--pc-bg-base)',
                                    borderColor: 'var(--pc-border)',
                                }}
                            >
                                {/* Avatar */}
                                <div
                                    className={`w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${av.bg} flex items-center justify-center text-3xl shadow-lg group-hover:shadow-xl transition-shadow`}
                                >
                                    {agent.avatar && AVATARS[agent.avatar] ? (
                                        <av.Icon className="w-10 h-10 text-white" />
                                    ) : (
                                        <span>{av.emoji}</span>
                                    )}
                                </div>

                                {/* Name */}
                                <h3
                                    className="text-center font-semibold text-base mb-1"
                                    style={{ color: 'var(--pc-text-primary)' }}
                                >
                                    {agent.display_name}
                                </h3>

                                {/* Role */}
                                <p
                                    className="text-center text-xs mb-3 line-clamp-2"
                                    style={{ color: 'var(--pc-text-secondary)' }}
                                >
                                    {agent.role}
                                </p>

                                {/* Status */}
                                <div className="flex justify-center">
                                    <StatusBadge status={agent.status} />
                                </div>

                                {/* Focus tags */}
                                {agent.focus.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-3 justify-center">
                                        {agent.focus.slice(0, 3).map((tag) => (
                                            <span
                                                key={tag}
                                                className="text-[10px] px-1.5 py-0.5 rounded-md"
                                                style={{
                                                    background: 'var(--pc-bg-secondary)',
                                                    color: 'var(--pc-text-secondary)',
                                                }}
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Pulse indicator for working state */}
                                {agent.status.state === 'working' && (
                                    <div className="absolute top-3 right-3">
                                        <span className="relative flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" />
                                        </span>
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Team Chat Panel */}
            {agents.length > 0 && (
                <div className="mt-8">
                    {/* Toggle bar */}
                    <button
                        type="button"
                        onClick={() => setChatOpen(!chatOpen)}
                        className="flex items-center gap-2 px-4 py-3 w-full rounded-t-2xl border text-sm font-medium transition-colors"
                        style={{
                            background: 'var(--pc-bg-elevated)',
                            borderColor: 'var(--pc-border)',
                            color: 'var(--pc-text-primary)',
                            borderBottom: chatOpen ? 'none' : undefined,
                            borderRadius: chatOpen ? '1rem 1rem 0 0' : '1rem',
                        }}
                    >
                        <MessageCircle className="w-4 h-4" style={{ color: 'var(--pc-accent)' }} />
                        团队对话
                        <span className="text-xs ml-auto" style={{ color: 'var(--pc-text-muted)' }}>
                            {chatOpen ? '收起 ▲' : '展开 ▼'}
                        </span>
                    </button>

                    {chatOpen && (
                        <div
                            className="border border-t-0 rounded-b-2xl overflow-hidden"
                            style={{ borderColor: 'var(--pc-border)', background: 'var(--pc-bg-surface)' }}
                        >
                            {/* Agent selector tabs */}
                            <div
                                className="flex gap-1 px-4 py-2 overflow-x-auto border-b"
                                style={{ borderColor: 'var(--pc-border)', background: 'var(--pc-bg-secondary)' }}
                            >
                                {agents.map((a) => {
                                    const isActive = selectedAgent === a.id;
                                    const av = getAvatarStyle(a.avatar || a.id);
                                    return (
                                        <button
                                            key={a.id}
                                            type="button"
                                            onClick={() => setSelectedAgent(a.id)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-all"
                                            style={{
                                                background: isActive ? 'var(--pc-accent)' : 'transparent',
                                                color: isActive ? '#fff' : 'var(--pc-text-secondary)',
                                                border: isActive ? 'none' : '1px solid var(--pc-border)',
                                            }}
                                        >
                                            <span>{av.emoji}</span>
                                            {a.display_name}
                                            {a.status.state === 'working' && (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Chat messages */}
                            <div
                                className="overflow-y-auto p-4 space-y-3"
                                style={{ height: '320px' }}
                            >
                                {chatMessages.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-full text-center" style={{ color: 'var(--pc-text-muted)' }}>
                                        <Bot className="w-10 h-10 mb-2 opacity-30" />
                                        <p className="text-sm">选择一个 Agent，开始团队对话</p>
                                    </div>
                                )}
                                {chatMessages.map((msg, i) => (
                                    <div
                                        key={i}
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className="max-w-[75%]">
                                            {msg.role === 'agent' && msg.agent && (
                                                <span className="text-[10px] mb-0.5 block" style={{ color: 'var(--pc-text-muted)' }}>
                                                    🤖 {msg.agent}
                                                </span>
                                            )}
                                            <div
                                                className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                                                style={
                                                    msg.role === 'user'
                                                        ? { background: 'var(--pc-accent)', color: '#fff' }
                                                        : { background: 'var(--pc-bg-elevated)', color: 'var(--pc-text-primary)', border: '1px solid var(--pc-border)' }
                                                }
                                            >
                                                {msg.role === 'agent' ? (
                                                    <div className="chat-markdown break-words">
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                                                    </div>
                                                ) : (
                                                    <span className="whitespace-pre-wrap break-words">{msg.text}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {chatLoading && (
                                    <div className="flex justify-start">
                                        <div
                                            className="px-4 py-2.5 rounded-2xl text-sm flex items-center gap-2"
                                            style={{ background: 'var(--pc-bg-elevated)', color: 'var(--pc-text-secondary)', border: '1px solid var(--pc-border)' }}
                                        >
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            {agents.find((a) => a.id === selectedAgent)?.display_name ?? 'Agent'} 思考中…
                                        </div>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Input row */}
                            <div className="flex gap-2 p-4 border-t" style={{ borderColor: 'var(--pc-border)' }}>
                                <input
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleTeamSend()}
                                    placeholder={selectedAgent ? `向 ${agents.find((a) => a.id === selectedAgent)?.display_name ?? 'Agent'} 发送消息…` : '选择 Agent…'}
                                    disabled={chatLoading || !selectedAgent}
                                    className="flex-1 px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2"
                                    style={{
                                        background: 'var(--pc-bg-secondary)',
                                        borderColor: 'var(--pc-border)',
                                        color: 'var(--pc-text-primary)',
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={handleTeamSend}
                                    disabled={chatLoading || !chatInput.trim() || !selectedAgent}
                                    className="px-4 py-2.5 rounded-xl text-white font-medium flex items-center gap-1.5 text-sm transition-opacity"
                                    style={{ background: 'var(--pc-accent)', opacity: chatLoading || !chatInput.trim() ? 0.5 : 1 }}
                                >
                                    <SendHorizonal className="w-4 h-4" /> 发送
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
