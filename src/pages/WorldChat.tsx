import { Check, Globe, MessageSquare, UserPlus } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Bubble, ChatHeader, ChatShell, Composer, DayDivider, formatTime, groupMessages, MessageList, nameColor, useChatScroll } from '@/components/chat/chat-kit';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useDirectMessages } from '@/contexts/DirectMessageContext';
import { useWorldChat } from '@/contexts/WorldChatContext';
import { supabase } from '@/db/supabase';
import { formatCompactNumber } from '@/lib/arena-currency';
import { getLevelInfo } from '@/lib/progression';

interface ChatProfile {
  id: string;
  gamertag: string;
  avatar_url: string | null;
  location?: string;
  wins: number;
  losses: number;
  win_rate?: number;
  tournaments_played?: number;
}

const likeSafe = (q: string) => q.replace(/[%_\\]/g, (m) => `\\${m}`);

/** How many players had a heartbeat in the last 5 minutes. */
function useOnlineCount() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    const load = () => {
      if (document.visibilityState !== 'visible') return;
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gt('last_seen_at', new Date(Date.now() - 5 * 60_000).toISOString())
        .then(({ count: c }) => {
          if (!cancelled && typeof c === 'number') setCount(c);
        });
    };
    load();
    const t = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);
  return count;
}

export default function WorldChat() {
  const { user } = useAuth();
  const { messages, loading, sendMessage, markAsRead, goLive } = useWorldChat();
  const navigate = useNavigate();
  const online = useOnlineCount();
  const [text, setText] = useState('');
  const [selected, setSelected] = useState<ChatProfile | null>(null);
  const [mentions, setMentions] = useState<{ id: string; gamertag: string }[]>([]);

  // Stream messages live only while this screen is open
  useEffect(() => goLive(), [goLive]);

  useEffect(() => {
    if (user) markAsRead();
  }, [user, markAsRead, messages.length]);

  // Oldest first, whatever order the data arrived in
  const rows = useMemo(
    () =>
      messages
        .map((m) => ({
          ...m,
          profile: (Array.isArray(m.profiles) ? m.profiles[0] : m.profiles) as ChatProfile | undefined,
        }))
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [messages],
  );
  const groups = useMemo(() => groupMessages(rows, (m) => m.user_id), [rows]);
  const scroll = useChatScroll(rows.length);

  // "@gam" at the end of the draft → suggest players
  const mentionQuery = useMemo(() => {
    const match = /(?:^|\s)@(\w*)$/.exec(text);
    return match ? match[1] : null;
  }, [text]);

  useEffect(() => {
    if (mentionQuery === null || !user) {
      setMentions([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      let q = supabase.from('profiles').select('id, gamertag').neq('id', user.id).not('gamertag', 'is', null).limit(5);
      if (mentionQuery) q = q.ilike('gamertag', `${likeSafe(mentionQuery)}%`);
      q.then(({ data }) => {
        if (!cancelled) setMentions((data as { id: string; gamertag: string }[]) || []);
      });
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [mentionQuery, user]);

  const pickMention = (tag: string) => {
    setText((t) => t.replace(/@(\w*)$/, `@${tag} `));
    setMentions([]);
  };

  const send = useCallback(async () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    try {
      await sendMessage(body);
      requestAnimationFrame(() => scroll.scrollToBottom(false));
    } catch (error) {
      setText(body);
      toast.error((error as Error)?.message || 'Message not sent. Try again.');
    }
  }, [text, sendMessage, scroll]);

  const goBack = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate('/dashboard');
  };

  const renderText = (body: string, own: boolean) =>
    body.split(/(@\w+)/g).map((part, i) =>
      part.startsWith('@') ? (
        <span key={i} className={own ? 'font-semibold underline decoration-white/50 underline-offset-2' : 'font-semibold text-primary-soft'}>
          {part}
        </span>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      ),
    );

  return (
    <>
      <ChatShell
        header={
          <ChatHeader
            onBack={goBack}
            avatar={
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary-soft">
                <Globe className="h-5 w-5" />
              </span>
            }
            title="World Chat"
            subtitle={online === null ? 'Every player on Arena' : `${formatCompactNumber(online)} online now`}
          />
        }
        composer={
          <Composer
            value={text}
            onChange={setText}
            onSend={send}
            placeholder="Message everyone"
            maxLength={500}
            above={
              mentions.length > 0 ? (
                <ul className="mb-2 overflow-hidden rounded-2xl border border-border bg-background" role="listbox" aria-label="Mention a player">
                  {mentions.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        onPointerDown={(e) => e.preventDefault()}
                        onClick={() => pickMention(m.gamertag)}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-white/5"
                      >
                        <span className="font-semibold" style={{ color: nameColor(m.id) }}>
                          @{m.gamertag}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null
            }
          />
        }
      >
        <MessageList scroll={scroll}>
          {loading && rows.length === 0 ? (
            <ChatSkeleton />
          ) : rows.length === 0 ? (
            <div className="m-auto max-w-xs py-16 text-center">
              <Globe className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <p className="mt-3 font-semibold">Start the conversation</p>
              <p className="text-sm text-muted-foreground">Say hi, find a squad, or call out a rematch. Use @ to mention a player.</p>
            </div>
          ) : (
            rows.map((m, i) => {
              const g = groups[i];
              const own = m.user_id === user?.id;
              const p = m.profile;
              const tag = p?.gamertag || 'Player';
              const color = nameColor(m.user_id);
              const open = () => !own && p && setSelected(p);
              return (
                <React.Fragment key={m.id}>
                  {g.newDay && <DayDivider date={new Date(m.created_at)} />}
                  <Bubble
                    own={own}
                    group={g}
                    time={formatTime(m.created_at)}
                    showAvatarColumn
                    sender={
                      own ? undefined : (
                        <button type="button" onClick={open} style={{ color }} className="hover:underline">
                          {tag}
                        </button>
                      )
                    }
                    avatar={
                      <button type="button" onClick={open} aria-label={`${tag}'s player card`} className="block rounded-full">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={p?.avatar_url || undefined} alt="" />
                          <AvatarFallback className="text-xs font-bold" style={{ color }}>
                            {tag[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </button>
                    }
                  >
                    {renderText(m.message, own)}
                  </Bubble>
                </React.Fragment>
              );
            })
          )}
        </MessageList>
      </ChatShell>

      <PlayerCard profile={selected} onClose={() => setSelected(null)} />
    </>
  );
}

function ChatSkeleton() {
  return (
    <div className="space-y-3 py-4" aria-label="Loading messages">
      {[60, 40, 72, 50, 35].map((w, i) => (
        <div key={i} className={i % 3 === 2 ? 'flex justify-end' : 'flex'}>
          <div className="h-10 animate-pulse rounded-2xl bg-secondary" style={{ width: `${w}%` }} />
        </div>
      ))}
    </div>
  );
}

function PlayerCard({ profile, onClose }: { profile: ChatProfile | null; onClose: () => void }) {
  const navigate = useNavigate();
  const { friends, sendFriendRequest } = useDirectMessages();
  const [sent, setSent] = useState(false);
  useEffect(() => setSent(false), [profile?.id]);
  if (!profile) return null;
  const isFriend = friends.some((f) => f.id === profile.id);
  const level = getLevelInfo(profile as never).level;
  const total = (profile.wins || 0) + (profile.losses || 0);
  const winRate = total ? Math.round(((profile.wins || 0) / total) * 100) : 0;

  return (
    <Dialog open={!!profile} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm p-0">
        <div className="flex flex-col items-center px-6 pb-6 pt-8 text-center">
          <Avatar className="h-20 w-20 ring-2 ring-primary/50 ring-offset-4 ring-offset-card">
            <AvatarImage src={profile.avatar_url || undefined} alt="" />
            <AvatarFallback className="font-score text-3xl">{profile.gamertag?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <DialogTitle className="mt-4 text-3xl leading-none">{profile.gamertag}</DialogTitle>
          <DialogDescription className="mt-1">
            Level {level}
            {profile.location ? `, ${profile.location}` : ''}
          </DialogDescription>
          <dl className="mt-5 grid w-full grid-cols-3 overflow-hidden rounded-xl border border-border">
            {[
              ['Wins', formatCompactNumber(profile.wins || 0)],
              ['Win rate', `${winRate}%`],
              ['Played', formatCompactNumber(profile.tournaments_played || total)],
            ].map(([label, value]) => (
              <div key={label} className="border-r border-border py-3 last:border-r-0">
                <dd className="font-score text-2xl font-bold leading-none">{value}</dd>
                <dt className="mt-1 text-xs text-muted-foreground">{label}</dt>
              </div>
            ))}
          </dl>
          <div className="mt-5 grid w-full grid-cols-2 gap-2">
            <Button
              onClick={() => {
                onClose();
                navigate(`/messages?user=${profile.id}`);
              }}
            >
              <MessageSquare /> Message
            </Button>
            {isFriend ? (
              <Button variant="outline" disabled>
                <Check /> Friends
              </Button>
            ) : (
              <Button
                variant="outline"
                disabled={sent}
                onClick={async () => {
                  await sendFriendRequest(profile.id);
                  setSent(true);
                }}
              >
                <UserPlus /> {sent ? 'Requested' : 'Add friend'}
              </Button>
            )}
          </div>
          <Link to={`/profile/${profile.id}`} onClick={onClose} className="mt-3 text-sm font-semibold text-primary-soft hover:underline">
            View full profile
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
