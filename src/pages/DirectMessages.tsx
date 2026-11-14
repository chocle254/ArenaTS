import { Ban, Check, CheckCheck, Clock3, Copy, Lock, MessageSquarePlus, Pencil, Reply, Search, Swords, Trash2, UserPlus, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Bubble,
  ChatHeader,
  ChatShell,
  Composer,
  ComposerBanner,
  DayDivider,
  type DeliveryState,
  formatTime,
  groupMessages,
  inboxTime,
  MessageList,
  MessageMenu,
  useChatScroll,
  useJumpToMessage,
} from '@/components/chat/chat-kit';
import { SendChallengePanel } from '@/components/SendChallengePanel';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useDirectMessages } from '@/contexts/DirectMessageContext';
import { supabase } from '@/db/supabase';
import { useDmPresence } from '@/hooks/use-dm-presence';
import { REACTION_EMOJI, useReactions } from '@/hooks/use-reactions';
import { rankOf } from '@/lib/chat-rank';
import { isOnline, PUBLIC_PROFILE_COLUMNS } from '@/lib/profile-columns';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { DirectMessage, Profile } from '@/types/database';

type Partner = Pick<Profile, 'id' | 'gamertag' | 'avatar_url' | 'last_seen_at'> & Partial<Profile>;

function PartnerAvatar({ p, size = 'h-12 w-12', dot = true }: { p: Partner; size?: string; dot?: boolean }) {
  return (
    <span className="relative shrink-0">
      <Avatar className={size}>
        <AvatarImage src={p.avatar_url || undefined} alt="" />
        <AvatarFallback className="bg-secondary font-score text-lg">{p.gamertag?.[0]?.toUpperCase() || '?'}</AvatarFallback>
      </Avatar>
      {dot && isOnline(p.last_seen_at) && <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-[2.5px] border-background bg-success" aria-label="Online" />}
    </span>
  );
}

function Ticks({ m }: { m: DirectMessage }) {
  if (m.id.startsWith('temp-')) return <Clock3 className="h-3.5 w-3.5 shrink-0" aria-label="Sending" />;
  if (m.read_at) return <CheckCheck className="h-4 w-4 shrink-0 text-[#6fd3ff]" aria-label="Read" />;
  return <Check className="h-4 w-4 shrink-0" aria-label="Sent" />;
}

export default function DirectMessages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('user');
  const { conversations, friends, pendingRequests, loading } = useDirectMessages();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const open = useCallback(
    (id: string) => {
      const next = new URLSearchParams(params);
      next.set('user', id);
      // Push so the phone's back button closes the chat, like a messaging app
      setParams(next);
    },
    [params, setParams],
  );

  const close = useCallback(() => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate('/messages', { replace: true });
  }, [navigate]);

  const q = query.trim().toLowerCase();
  const chats = useMemo(
    () =>
      [...conversations]
        .sort((a, b) => new Date(b.last_message.created_at).getTime() - new Date(a.last_message.created_at).getTime())
        .filter((c) => (!q || c.other_user.gamertag?.toLowerCase().includes(q)) && (filter === 'all' || c.unread_count > 0)),
    [conversations, q, filter],
  );
  const chatIds = useMemo(() => new Set(conversations.map((c) => c.other_user.id)), [conversations]);
  const newChatFriends = useMemo(
    () =>
      friends
        .filter((f) => !chatIds.has(f.id) && (!q || f.gamertag?.toLowerCase().includes(q)))
        .sort((a, b) => Number(isOnline(b.last_seen_at)) - Number(isOnline(a.last_seen_at))),
    [friends, chatIds, q],
  );
  const unreadChats = conversations.filter((c) => c.unread_count > 0).length;

  return (
    <div className="md:flex md:h-full">
      {/* Inbox */}
      <aside className={cn('flex flex-col md:w-[360px] md:shrink-0 md:border-r md:border-border lg:w-[400px]', selectedId && 'hidden md:flex')}>
        <div className="px-4 pb-2 pt-4 md:pt-5">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl">Chats</h1>
            <Link to="/world-chat" className="flex h-9 items-center gap-1.5 rounded-full bg-secondary px-3 text-sm font-semibold hover:bg-accent">
              <Users className="h-4 w-4" /> World chat
            </Link>
          </div>
          <label className="mt-3 flex h-10 items-center gap-2 rounded-full bg-secondary px-3 text-sm focus-within:ring-2 focus-within:ring-ring">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              aria-label="Search chats"
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </label>
          <div className="mt-3 flex gap-2" role="tablist" aria-label="Filter chats">
            {(
              [
                ['all', 'All'],
                ['unread', unreadChats ? `Unread ${unreadChats}` : 'Unread'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={filter === key}
                onClick={() => setFilter(key)}
                className={cn('h-8 rounded-full px-3 text-sm font-semibold', filter === key ? 'bg-primary/20 text-primary-soft' : 'bg-secondary text-muted-foreground')}
              >
                {label}
              </button>
            ))}
            {pendingRequests.length > 0 && (
              <Link to="/friends" className="ml-auto flex h-8 items-center gap-1.5 rounded-full bg-gold/10 px-3 text-sm font-semibold text-gold">
                <UserPlus className="h-4 w-4" /> {pendingRequests.length}
              </Link>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-4 md:pb-0">
          {loading && conversations.length === 0 ? (
            <InboxSkeleton />
          ) : (
            <>
              <ul>
                {chats.map((c) => {
                  const m = c.last_message;
                  const mine = m.sender_id === user?.id;
                  const active = selectedId === c.other_user.id;
                  return (
                    <li key={c.other_user.id}>
                      <button
                        type="button"
                        onClick={() => open(c.other_user.id)}
                        aria-current={active ? 'true' : undefined}
                        className={cn('flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors', active ? 'bg-primary/10' : 'hover:bg-white/[0.03] active:bg-white/[0.05]')}
                      >
                        <PartnerAvatar p={c.other_user} />
                        <span className="min-w-0 flex-1 border-b border-border/60 pb-2.5 pt-0.5">
                          <span className="flex items-baseline gap-2">
                            <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{c.other_user.gamertag}</span>
                            <span className={cn('shrink-0 text-xs', c.unread_count ? 'font-semibold text-primary-soft' : 'text-muted-foreground')}>{inboxTime(m.created_at)}</span>
                          </span>
                          <span className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                            {mine && <Ticks m={m} />}
                            <span className={cn('min-w-0 flex-1 truncate', c.unread_count > 0 && 'text-foreground', m.deleted_at && 'italic')}>
                              {m.deleted_at ? (
                                <span className="inline-flex items-center gap-1">
                                  <Ban className="h-3.5 w-3.5" /> This message was deleted
                                </span>
                              ) : m.image_url && !m.message ? (
                                'Photo'
                              ) : (
                                m.message
                              )}
                            </span>
                            {c.unread_count > 0 && (
                              <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-white">{c.unread_count}</span>
                            )}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {chats.length === 0 && newChatFriends.length === 0 && (
                <div className="px-6 py-14 text-center">
                  <MessageSquarePlus className="mx-auto h-10 w-10 text-muted-foreground/50" />
                  <p className="mt-3 font-semibold">{q ? 'No chats match that name' : filter === 'unread' ? 'You’re all caught up' : 'No chats yet'}</p>
                  {!q && filter === 'all' && (
                    <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
                      Add friends from World Chat or a player’s profile, then message them here.
                    </p>
                  )}
                </div>
              )}

              {filter === 'all' && newChatFriends.length > 0 && (
                <>
                  <p className="px-4 pb-1 pt-4 text-sm font-semibold text-muted-foreground">Start a chat</p>
                  <ul>
                    {newChatFriends.map((f) => (
                      <li key={f.id}>
                        <button type="button" onClick={() => open(f.id)} className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-white/[0.03]">
                          <PartnerAvatar p={f} size="h-10 w-10" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold">{f.gamertag}</span>
                            <span className="block text-xs text-muted-foreground">{isOnline(f.last_seen_at) ? 'Online' : 'Friend'}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </div>
      </aside>

      {/* Conversation */}
      <div className={cn('min-w-0 flex-1', !selectedId && 'hidden md:flex md:items-center md:justify-center')}>
        {selectedId ? (
          <Conversation key={selectedId} partnerId={selectedId} onBack={close} />
        ) : (
          <div className="chat-wallpaper flex h-full w-full flex-col items-center justify-center p-8 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
              <MessageSquarePlus className="h-7 w-7 text-muted-foreground" />
            </span>
            <p className="mt-4 text-xl font-semibold">Pick a chat</p>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">Message friends, line up a rematch, or send a challenge straight from the chat.</p>
          </div>
        )}
      </div>
    </div>
  );
}

const EDIT_WINDOW_MS = 15 * 60_000;

function Conversation({ partnerId, onBack }: { partnerId: string; onBack: () => void }) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { conversations, friends, activeConversation, fetchMessages, markAsRead, sendMessage, editMessage, deleteMessage, setActiveChatUserId } = useDirectMessages();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState('');
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<DirectMessage | null>(null);
  const [editing, setEditing] = useState<DirectMessage | null>(null);
  const [menuFor, setMenuFor] = useState<DirectMessage | null>(null);
  const { partnerHere, partnerTyping, setTyping } = useDmPresence(user?.id, partnerId);
  const { flash, jump } = useJumpToMessage();

  // Partner profile: from the inbox if we have it, otherwise public columns only
  useEffect(() => {
    const known = conversations.find((c) => c.other_user.id === partnerId)?.other_user || friends.find((f) => f.id === partnerId);
    if (known) {
      setPartner((prev) => (prev?.id === partnerId ? { ...prev, ...known } : known));
      return;
    }
    let cancelled = false;
    supabase
      .from('profiles')
      .select(PUBLIC_PROFILE_COLUMNS)
      .eq('id', partnerId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) setPartner(data as unknown as Partner);
      });
    return () => {
      cancelled = true;
    };
  }, [partnerId, conversations, friends]);

  useEffect(() => {
    setActiveChatUserId(partnerId);
    setLoaded(false);
    fetchMessages(partnerId).finally(() => setLoaded(true));
    markAsRead(partnerId);
    return () => setActiveChatUserId(null);
  }, [partnerId, fetchMessages, markAsRead, setActiveChatUserId]);

  // Only this partner's messages (the shared list may still hold the previous chat for a moment)
  const msgs = useMemo(
    () =>
      activeConversation
        .filter((m) => m.sender_id === partnerId || m.receiver_id === partnerId)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [activeConversation, partnerId],
  );
  const groups = useMemo(() => groupMessages(msgs, (m) => m.sender_id), [msgs]);
  const scroll = useChatScroll(msgs.length, partnerId);
  const ids = useMemo(() => msgs.map((m) => m.id), [msgs]);
  const { byMessage, myReaction, react } = useReactions('dm', ids, user?.id);

  const myRank = rankOf(profile);
  const partnerRank = rankOf(partner);
  const nameOf = (id: string | null | undefined) => (id === user?.id ? 'You' : partner?.gamertag || 'Them');

  const onDraft = (v: string) => {
    setText(v);
    setTyping(v.trim().length > 0);
  };

  const send = () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    setTyping(false);
    if (editing) {
      if (body !== editing.message) void editMessage(editing.id, body);
      setEditing(null);
      return;
    }
    void sendMessage(partnerId, body, undefined, replyTo);
    setReplyTo(null);
    requestAnimationFrame(() => scroll.scrollToBottom(false));
  };

  const startReply = (m: DirectMessage) => {
    setEditing(null);
    setReplyTo(m);
  };

  const startEdit = (m: DirectMessage) => {
    setReplyTo(null);
    setEditing(m);
    setText(m.message || '');
  };

  const cancelBanner = () => {
    if (editing) setText('');
    setEditing(null);
    setReplyTo(null);
  };

  const delivery = (m: DirectMessage): DeliveryState => (m.id.startsWith('temp-') ? 'sending' : m.read_at ? 'read' : 'sent');
  const online = partnerHere || isOnline(partner?.last_seen_at);
  const status = !partner
    ? ''
    : partnerTyping
      ? 'typing…'
      : online
        ? 'online'
        : partner.last_seen_at
          ? `last seen ${formatRelativeTime(partner.last_seen_at)}`
          : '';

  const menuActions = (m: DirectMessage) => {
    const mine = m.sender_id === user?.id;
    const real = !m.id.startsWith('temp-');
    const list = [{ label: 'Reply', icon: <Reply className="h-5 w-5" />, onClick: () => startReply(m) }];
    if (m.message)
      list.push({
        label: 'Copy',
        icon: <Copy className="h-5 w-5" />,
        onClick: () => {
          navigator.clipboard?.writeText(m.message || '').then(
            () => toast.success('Copied'),
            () => undefined,
          );
        },
      });
    if (mine && real && m.message && Date.now() - new Date(m.created_at).getTime() < EDIT_WINDOW_MS)
      list.push({ label: 'Edit', icon: <Pencil className="h-5 w-5" />, onClick: () => startEdit(m) });
    if (mine && real)
      list.push({
        label: 'Delete for everyone',
        icon: <Trash2 className="h-5 w-5" />,
        onClick: () => {
          if (window.confirm('Delete this message for everyone?')) void deleteMessage(m.id);
        },
        danger: true,
      } as (typeof list)[number]);
    return list;
  };

  const banner = editing ? (
    <ComposerBanner title="Editing message" text={editing.message || ''} onCancel={cancelBanner} icon={<Pencil className="h-4 w-4 shrink-0 text-primary-soft" />} />
  ) : replyTo ? (
    <ComposerBanner title={`Replying to ${nameOf(replyTo.sender_id)}`} text={replyTo.message || (replyTo.image_url ? 'Photo' : '')} onCancel={cancelBanner} />
  ) : null;

  return (
    <>
      <ChatShell
        header={
          <ChatHeader
            onBack={onBack}
            avatar={partner ? <PartnerAvatar p={partner} size="h-10 w-10" dot={false} /> : <span className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-secondary" />}
            title={partner?.gamertag || ' '}
            subtitle={status ? <span className={online || partnerTyping ? 'text-success' : undefined}>{status}</span> : undefined}
            onTitleClick={() => navigate(`/profile/${partnerId}`)}
            actions={
              <button
                type="button"
                onClick={() => setChallengeOpen(true)}
                disabled={!partner}
                className="flex h-10 items-center gap-1.5 rounded-full bg-primary/15 px-3 text-sm font-semibold text-primary-soft hover:bg-primary/25 disabled:opacity-50"
              >
                <Swords className="h-4 w-4" />
                <span className="hidden sm:inline">Challenge</span>
                <span className="sr-only sm:hidden">Challenge {partner?.gamertag}</span>
              </button>
            }
          />
        }
        composer={
          <Composer
            value={text}
            onChange={onDraft}
            onSend={send}
            placeholder={editing ? 'Edit message' : 'Message'}
            maxLength={2000}
            above={banner}
            focusKey={editing?.id || replyTo?.id || null}
          />
        }
      >
        <MessageList scroll={scroll}>
          <p className="mx-auto mb-3 mt-1 flex max-w-xs items-center justify-center gap-1.5 rounded-lg bg-gold/10 px-3 py-1.5 text-center text-[12px] text-gold/90">
            <Lock className="h-3 w-3 shrink-0" /> Messages are stored encrypted. Arena only opens a chat if it’s reported.
          </p>
          {!loaded && msgs.length === 0 ? (
            <div className="space-y-3 py-4" aria-label="Loading messages">
              {[55, 35, 65].map((w, i) => (
                <div key={i} className={i === 1 ? 'flex justify-end' : 'flex'}>
                  <div className="h-10 animate-pulse rounded-2xl bg-secondary" style={{ width: `${w}%` }} />
                </div>
              ))}
            </div>
          ) : msgs.length === 0 ? (
            <div className="m-auto max-w-xs py-16 text-center">
              {partner && <PartnerAvatar p={partner} size="mx-auto h-16 w-16" dot={false} />}
              <p className="mt-3 font-semibold">Say hi to {partner?.gamertag || 'your friend'}</p>
              <p className="text-sm text-muted-foreground">Or tap Challenge to play a 1v1 for KES.</p>
            </div>
          ) : (
            msgs.map((m, i) => {
              const own = m.sender_id === user?.id;
              const domId = `dm-${m.id}`;
              return (
                <React.Fragment key={m.id}>
                  {groups[i].newDay && <DayDivider date={new Date(m.created_at)} />}
                  <Bubble
                    id={domId}
                    own={own}
                    group={groups[i]}
                    time={formatTime(m.created_at)}
                    delivery={delivery(m)}
                    rank={own ? myRank : partnerRank}
                    edited={!!m.edited_at}
                    deleted={!!m.deleted_at}
                    highlight={flash === domId}
                    reply={
                      m.parent_message_id || m.reply_sender_id
                        ? {
                            name: nameOf(m.reply_sender_id),
                            text: m.reply_deleted ? 'This message was deleted' : m.reply_message || 'Photo',
                            onClick: () => m.parent_message_id && jump(`dm-${m.parent_message_id}`),
                          }
                        : null
                    }
                    reactions={byMessage[m.id]}
                    onReactionClick={(e) => react(m.id, e)}
                    onReply={() => startReply(m)}
                    onMenu={() => setMenuFor(m)}
                  >
                    {m.message}
                  </Bubble>
                </React.Fragment>
              );
            })
          )}
          {partnerTyping && (
            <div className="mt-2 flex">
              <span className="rounded-2xl rounded-bl-md bg-secondary px-3 py-2 text-sm text-muted-foreground" aria-live="polite">
                {partner?.gamertag} is typing…
              </span>
            </div>
          )}
        </MessageList>
      </ChatShell>

      <MessageMenu
        open={!!menuFor}
        onClose={() => setMenuFor(null)}
        preview={menuFor?.message || undefined}
        reactions={menuFor && !menuFor.id.startsWith('temp-') ? REACTION_EMOJI : undefined}
        current={menuFor ? myReaction(menuFor.id) : undefined}
        onReact={(e) => menuFor && react(menuFor.id, e)}
        actions={menuFor ? menuActions(menuFor) : []}
      />

      {partner && (
        <SendChallengePanel
          open={challengeOpen}
          onOpenChange={setChallengeOpen}
          opponent={{ user_id: partner.id, gamertag: partner.gamertag || 'Player', avatar_url: partner.avatar_url, wins: partner.wins || 0, losses: partner.losses || 0 }}
        />
      )}
    </>
  );
}

function InboxSkeleton() {
  return (
    <div className="space-y-1 px-4 py-2" aria-label="Loading chats">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3 py-2">
          <div className="h-12 w-12 animate-pulse rounded-full bg-secondary" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-1/3 animate-pulse rounded bg-secondary" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-secondary" />
          </div>
        </div>
      ))}
    </div>
  );
}
