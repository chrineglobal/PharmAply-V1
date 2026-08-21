import React, { useState, useEffect } from 'react';
import { 
  initWorkspaceAuth, 
  workspaceGoogleSignIn, 
  getWorkspaceAccessToken, 
  workspaceLogout 
} from '../../lib/workspace-auth';
import { User } from 'firebase/auth';
import { 
  Mail, Inbox, Send, Search, Loader2, LogOut, ChevronLeft, Reply
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function AdminGmail() {
  const { t } = useTranslation();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
  
  // Compose state
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [sending, setSending] = useState(false);
  const [isComposing, setIsComposing] = useState(false);

  useEffect(() => {
    const unsubscribe = initWorkspaceAuth(
      (user, token) => {
        setUser(user);
        setToken(token);
        setLoading(false);
        fetchMessages(token);
      },
      () => {
        setUser(null);
        setToken(null);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await workspaceGoogleSignIn();
      if (result) {
        setToken(result.accessToken);
        setUser(result.user);
        fetchMessages(result.accessToken);
      }
    } catch (err) {
      console.error('Login failed:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await workspaceLogout();
    setToken(null);
    setUser(null);
    setMessages([]);
  };

  const fetchMessages = async (accessToken: string) => {
    setLoadingMessages(true);
    try {
      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=15&labelIds=INBOX', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (data.messages && data.messages.length > 0) {
        // Fetch details for each message
        const messageDetails = await Promise.all(
          data.messages.map(async (msg: any) => {
            const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            return await msgRes.json();
          })
        );
        setMessages(messageDetails);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error("Failed to fetch messages", error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const fetchFullMessage = async (messageId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      
      // Basic decoding for body
      let body = '';
      if (data.payload.parts) {
        const textPart = data.payload.parts.find((p: any) => p.mimeType === 'text/plain' || p.mimeType === 'text/html');
        if (textPart && textPart.body && textPart.body.data) {
          body = atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        }
      } else if (data.payload.body && data.payload.body.data) {
        body = atob(data.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      }

      setSelectedMessage({ ...data, decodedBody: body });
    } catch (error) {
      console.error("Failed to fetch full message", error);
    }
  };

  const handleSendEmail = async () => {
    if (!token || !composeTo || !composeSubject || !composeBody) return;
    
    const confirmed = window.confirm(`Are you sure you want to send this email to ${composeTo}?`);
    if (!confirmed) return;

    setSending(true);
    try {
      const emailContent = `To: ${composeTo}\r\nSubject: ${composeSubject}\r\nContent-Type: text/plain; charset="UTF-8"\r\n\r\n${composeBody}`;
      const encodedEmail = btoa(unescape(encodeURIComponent(emailContent))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      
      await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw: encodedEmail })
      });
      
      setIsComposing(false);
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
      alert("Email sent successfully!");
    } catch (error) {
      console.error("Failed to send email", error);
      alert("Failed to send email.");
    } finally {
      setSending(false);
    }
  };

  const getHeader = (msg: any, name: string) => {
    return msg.payload?.headers?.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';
  };

  if (loading) {
    return <div className="flex-1 flex items-center justify-center h-full"><Loader2 className="animate-spin text-slate-400" /></div>;
  }

  if (!token || !user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full bg-slate-50 dark:bg-zinc-950 p-8 rounded-3xl border border-gray-100 dark:border-zinc-800">
        <Mail size={48} className="text-slate-300 mb-6" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Workspace Email Integration</h2>
        <p className="text-slate-500 mb-8 max-w-md text-center">
          Sign in with Google to read, manage, and reply to patient and pharmacy inquiries directly from the admin panel.
        </p>
        <button 
          onClick={handleLogin}
          disabled={isLoggingIn}
          className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-zinc-950 border border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-zinc-900 font-medium rounded-full shadow-sm transition"
        >
          {isLoggingIn ? <Loader2 size={20} className="animate-spin" /> : (
            <svg width="20" height="20" viewBox="0 0 48 48" className="mr-2">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              <path fill="none" d="M0 0h48v48H0z"></path>
            </svg>
          )}
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white dark:bg-zinc-950 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 dark:border-zinc-850 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-900/30">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-100 text-[var(--app-primary-color)] rounded-full flex items-center justify-center">
            <Mail size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white">Admin Inbox</h1>
            <p className="text-sm text-slate-500">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { setIsComposing(true); setSelectedMessage(null); }}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--app-primary-color)] text-white rounded-full text-sm font-bold shadow-sm shadow-indigo-200 hover:bg-[var(--app-primary-color)] transition"
          >
            <Send size={16} /> Compose
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-full text-sm font-bold hover:bg-slate-200 transition"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar / List */}
        <div className={`w-1/3 border-r border-gray-100 dark:border-zinc-850 overflow-y-auto ${selectedMessage || isComposing ? 'hidden md:block' : 'w-full'}`}>
          {loadingMessages ? (
            <div className="p-8 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2" /> Loading...</div>
          ) : messages.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No emails found in Inbox.</div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-zinc-850">
              {messages.map(msg => {
                const subject = getHeader(msg, 'Subject') || '(No Subject)';
                const from = getHeader(msg, 'From');
                const date = getHeader(msg, 'Date');
                
                return (
                  <div 
                    key={msg.id} 
                    onClick={() => { fetchFullMessage(msg.id); setIsComposing(false); }}
                    className={`p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-900 transition ${selectedMessage?.id === msg.id ? 'bg-indigo-50 dark:bg-indigo-900/10' : ''}`}
                  >
                    <div className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate mb-1">{from}</div>
                    <div className="text-sm text-slate-800 dark:text-slate-300 font-medium truncate mb-1">{subject}</div>
                    <div className="text-xs text-slate-500">{new Date(date).toLocaleDateString()}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className={`flex-1 overflow-y-auto bg-slate-50 dark:bg-zinc-950 ${!selectedMessage && !isComposing ? 'hidden md:flex items-center justify-center' : 'block'}`}>
          {!selectedMessage && !isComposing && (
            <div className="text-center text-slate-400 flex flex-col items-center">
              <Inbox size={48} className="mb-4 opacity-50" />
              <p>Select a message to read</p>
            </div>
          )}

          {selectedMessage && !isComposing && (
            <div className="p-8">
              <button 
                onClick={() => setSelectedMessage(null)}
                className="mb-6 md:hidden flex items-center gap-2 text-slate-500 hover:text-slate-800"
              >
                <ChevronLeft size={16} /> Back to Inbox
              </button>
              
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                {getHeader(selectedMessage, 'Subject') || '(No Subject)'}
              </h2>
              
              <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-200 dark:border-zinc-800">
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600">
                  {getHeader(selectedMessage, 'From').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-slate-100">{getHeader(selectedMessage, 'From')}</div>
                  <div className="text-xs text-slate-500">to {getHeader(selectedMessage, 'To')} • {new Date(getHeader(selectedMessage, 'Date')).toLocaleString()}</div>
                </div>
              </div>

              <div 
                className="text-sm text-slate-800 dark:text-slate-300 leading-relaxed whitespace-pre-wrap max-w-3xl"
                dangerouslySetInnerHTML={{ __html: selectedMessage.decodedBody || 'No content to display' }}
              />
            </div>
          )}

          {isComposing && (
            <div className="p-8 max-w-3xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">New Message</h2>
                <button onClick={() => setIsComposing(false)} className="text-slate-400 hover:text-slate-700">Cancel</button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">To</label>
                  <input 
                    type="email" 
                    value={composeTo}
                    onChange={(e) => setComposeTo(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[var(--app-primary-color)] outline-none"
                    placeholder="recipient@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Subject</label>
                  <input 
                    type="text" 
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[var(--app-primary-color)] outline-none"
                    placeholder="Subject line"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Message</label>
                  <textarea 
                    value={composeBody}
                    onChange={(e) => setComposeBody(e.target.value)}
                    rows={12}
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[var(--app-primary-color)] outline-none resize-none"
                    placeholder="Write your message here..."
                  />
                </div>
                
                <button 
                  onClick={handleSendEmail}
                  disabled={sending || !composeTo || !composeSubject || !composeBody}
                  className="w-full py-3 bg-[var(--app-primary-color)] text-white rounded-xl font-bold hover:bg-[var(--app-primary-color)] transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  Send Email
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
