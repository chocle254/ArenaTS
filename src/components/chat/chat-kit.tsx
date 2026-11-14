import { format, isToday, isYesterday, differenceInCalendarDays } from 'date-fns';
import { ArrowDown, Ban, Check, CheckCheck, ChevronDown, ChevronLeft, Clock3, Reply, SendHorizontal, Smile, X } from 'lucide-react';
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { bubbleLook, type RankName } from '@/lib/chat-rank';
import { buzz, cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

/** True below the md breakpoint, where a conversation takes over the screen. */
export function useIsPhone() {
  const query = '(max-width: 767px)';
  const [phone, setPhone] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setPhone(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return phone;
}

/**
 * A conversation screen. On phones it covers the whole viewport (app bars
 * included), like WhatsApp or Telegram. From md up it fills its parent.
 */
export function ChatShell({ header, children, composer, className }: { header: React.ReactNode; children: React.ReactNode; composer: React.ReactNode; className?: string }) {
  const phone = useIsPhone();

  // Stop the page behind a full-screen chat from scrolling on phones
  useEffect(() => {
    if (!phone) return;
    const el = document.documentElement;
    const prev = el.style.overflow;
    el.style.overflow = 'hidden';
    return () => {
      el.style.overflow = prev;
    };
  }, [phone]);

  const screen = (
    <section
      className={cn(phone ? 'fixed inset-0 z-50 flex flex-col bg-background' : 'flex h-full min-h-0 flex-col bg-background', className)}
      style={phone ? { paddingTop: 'var(--safe-top)' } : undefined}
    >
      {header}
      {children}
      <div style={phone ? { paddingBottom: 'var(--safe-bottom)' } : undefined} className="shrink-0 border-t border-border glass">
        {composer}
      </div>
    </section>
  );

  // On phones the conversation sits at the document root so no page wrapper
  // (fades, transforms, stacking contexts) can trap it under the app bars.
  return phone ? createPortal(screen, document.body) : screen;
}

export function ChatHeader({
  onBack,
  backLabel = 'Back',
  avatar,
  title,
  subtitle,
  onTitleClick,
  actions,
  showBackOnDesktop = false,
}: {
  onBack?: () => void;
  backLabel?: string;
  avatar: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onTitleClick?: () => void;
  actions?: React.ReactNode;
  showBackOnDesktop?: boolean;
}) {
  const TitleTag = onTitleClick ? 'button' : 'div';
  return (
    <header className="flex h-16 shrink-0 items-center gap-1 border-b border-border bg-card/95 px-2 backdrop-blur md:px-4">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label={backLabel}
          className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-white/5', !showBackOnDesktop && 'md:hidden')}
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}
      <TitleTag
        {...(onTitleClick ? { type: 'button' as const, onClick: onTitleClick } : {})}
        className={cn('flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-1 text-left', onTitleClick && 'hover:bg-white/[0.03]')}
      >
        {avatar}
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-semibold leading-tight">{title}</span>
          {subtitle && <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>}
        </span>
      </TitleTag>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Scrolling                                                           */
/* ------------------------------------------------------------------ */

/**
 * Keeps a message list pinned to the bottom while the reader is at the
 * bottom, and counts arrivals while they're reading older messages.
 */
export function useChatScroll(itemCount: number, resetKey?: string | null) {
  const ref = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);
  const prevCount = useRef(0);
  const [atBottom, setAtBottom] = useState(true);
  const [unseen, setUnseen] = useState(0);

  const scrollToBottom = useCallback((smooth = true) => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    setUnseen(0);
  }, []);

  // A new conversation always opens at the latest message
  useLayoutEffect(() => {
    atBottomRef.current = true;
    prevCount.current = 0;
    setUnseen(0);
  }, [resetKey]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const added = itemCount - prevCount.current;
    if (prevCount.current === 0 || atBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    } else if (added > 0) {
      setUnseen((n) => n + added);
    }
    prevCount.current = itemCount;
  }, [itemCount, resetKey]);

  const onScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    atBottomRef.current = near;
    setAtBottom(near);
    if (near) setUnseen(0);
  }, []);

  return { ref, onScroll, atBottom, unseen, scrollToBottom };
}

export function MessageList({
  scroll,
  children,
  className,
}: {
  scroll: ReturnType<typeof useChatScroll>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="relative min-h-0 flex-1">
      <div ref={scroll.ref} onScroll={scroll.onScroll} className={cn('chat-wallpaper h-full overflow-y-auto overscroll-contain px-2 py-3 md:px-6', className)}>
        <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-end">{children}</div>
      </div>
      {!scroll.atBottom && (
        <button
          type="button"
          onClick={() => scroll.scrollToBottom()}
          className="absolute bottom-3 right-3 flex h-10 items-center gap-1.5 rounded-full border border-border glass px-3 text-sm font-semibold shadow-lg md:right-6"
          aria-label={scroll.unseen ? `${scroll.unseen} new messages` : 'Jump to latest'}
        >
          {scroll.unseen > 0 && <span className="rounded-full bg-primary px-1.5 text-xs text-white">{scroll.unseen}</span>}
          <ArrowDown className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Messages                                                            */
/* ------------------------------------------------------------------ */

export function dayLabel(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  if (differenceInCalendarDays(new Date(), date) < 7) return format(date, 'EEEE');
  return format(date, 'd MMM yyyy');
}

export function DayDivider({ date }: { date: Date }) {
  return (
    <div className="sticky top-1 z-10 my-3 flex justify-center">
      <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">{dayLabel(date)}</span>
    </div>
  );
}

export interface GroupInfo {
  first: boolean;
  last: boolean;
  newDay: boolean;
}

/** Works out bubble grouping: same sender, same day, under 5 minutes apart. */
export function groupMessages<T extends { created_at: string }>(items: T[], senderOf: (m: T) => string): GroupInfo[] {
  return items.map((m, i) => {
    const prev = items[i - 1];
    const next = items[i + 1];
    const t = new Date(m.created_at);
    const sameAsPrev = !!prev && senderOf(prev) === senderOf(m) && t.getTime() - new Date(prev.created_at).getTime() < 5 * 60_000;
    const newDay = !prev || new Date(prev.created_at).toDateString() !== t.toDateString();
    const nextNewDay = !!next && new Date(next.created_at).toDateString() !== t.toDateString();
    const sameAsNext = !!next && !nextNewDay && senderOf(next) === senderOf(m) && new Date(next.created_at).getTime() - t.getTime() < 5 * 60_000;
    return { first: !sameAsPrev || newDay, last: !sameAsNext, newDay };
  });
}

export type DeliveryState = 'sending' | 'sent' | 'read';

export interface BubbleReply {
  name: string;
  text: string;
  onClick?: () => void;
}

export interface BubbleReaction {
  emoji: string;
  count: number;
  mine: boolean;
}

const SWIPE_REPLY_AT = 56;
const LONG_PRESS_MS = 420;

export function Bubble({
  own,
  group,
  time,
  delivery,
  sender,
  avatar,
  showAvatarColumn,
  rank,
  reply,
  reactions,
  onReactionClick,
  onReply,
  onMenu,
  edited,
  deleted,
  highlight,
  id,
  children,
}: {
  own: boolean;
  group: GroupInfo;
  time: string;
  delivery?: DeliveryState;
  /** Group chats: name shown on the first bubble of a run */
  sender?: React.ReactNode;
  /** Group chats: avatar shown beside the last bubble of a run */
  avatar?: React.ReactNode;
  showAvatarColumn?: boolean;
  /** The sender's rank: higher ranks get fancier bubbles */
  rank?: RankName;
  /** The message this one replies to */
  reply?: BubbleReply | null;
  reactions?: BubbleReaction[];
  onReactionClick?: (emoji: string) => void;
  /** Swipe right (or the menu) to reply */
  onReply?: () => void;
  /** Long-press, right-click or the arrow opens the message menu */
  onMenu?: () => void;
  edited?: boolean;
  deleted?: boolean;
  /** Briefly flash (after jumping to a replied message) */
  highlight?: boolean;
  id?: string;
  children: React.ReactNode;
}) {
  const look = bubbleLook(rank, own);
  const [dx, setDx] = useState(0);
  const gesture = useRef<{ x: number; y: number; t: number; swiping: boolean; cancelled: boolean } | null>(null);
  const pressTimer = useRef<number | undefined>(undefined);
  const firedReply = useRef(false);

  const endGesture = () => {
    window.clearTimeout(pressTimer.current);
    gesture.current = null;
    setDx(0);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (deleted || (e.pointerType === 'mouse' && e.button !== 0)) return;
    gesture.current = { x: e.clientX, y: e.clientY, t: Date.now(), swiping: false, cancelled: false };
    firedReply.current = false;
    if (onMenu && e.pointerType !== 'mouse') {
      pressTimer.current = window.setTimeout(() => {
        if (gesture.current && !gesture.current.swiping && !gesture.current.cancelled) {
          buzz(15);
          onMenu();
          endGesture();
        }
      }, LONG_PRESS_MS);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g) return;
    const mx = e.clientX - g.x;
    const my = e.clientY - g.y;
    if (!g.swiping) {
      if (Math.abs(my) > 10) {
        // Scrolling: let it go
        g.cancelled = true;
        endGesture();
        return;
      }
      if (onReply && mx > 12 && Math.abs(mx) > Math.abs(my) * 1.5) {
        g.swiping = true;
        window.clearTimeout(pressTimer.current);
      }
    }
    if (g.swiping) {
      const d = Math.max(0, Math.min(mx, 84));
      setDx(d);
      if (d >= SWIPE_REPLY_AT && !firedReply.current) {
        firedReply.current = true;
        buzz(12);
      } else if (d < SWIPE_REPLY_AT) {
        firedReply.current = false;
      }
    }
  };

  const onPointerUp = () => {
    const g = gesture.current;
    if (g?.swiping && dx >= SWIPE_REPLY_AT) onReply?.();
    endGesture();
  };

  return (
    <div
      id={id}
      className={cn(
        'group/bubble relative flex items-end gap-2 rounded-xl transition-colors duration-700',
        own ? 'justify-end' : 'justify-start',
        group.first ? 'mt-2' : 'mt-0.5',
        reactions?.length ? 'mb-3' : '',
        highlight && 'bg-primary/15',
      )}
    >
      {onReply && dx > 0 && (
        <span
          aria-hidden
          className={cn('absolute left-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-secondary transition-opacity', dx >= SWIPE_REPLY_AT ? 'opacity-100' : 'opacity-50')}
        >
          <Reply className="h-4 w-4" />
        </span>
      )}
      {showAvatarColumn && !own && <div className="w-8 shrink-0">{group.last ? avatar : null}</div>}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={endGesture}
        onContextMenu={(e) => {
          if (!onMenu || deleted) return;
          e.preventDefault();
          onMenu();
        }}
        style={{ transform: dx ? `translateX(${dx}px)` : undefined, touchAction: 'pan-y' }}
        className={cn(
          'relative max-w-[82%] px-3 pb-1.5 pt-1.5 text-[15px] leading-snug sm:max-w-[70%] [-webkit-touch-callout:none]',
          dx ? '' : 'transition-transform duration-200',
          deleted ? (own ? 'bg-primary/40 text-white/80' : 'bg-secondary/60 text-muted-foreground') : look.bubble,
          // Rounded corners with a "tail" corner on the last bubble of a run
          'rounded-2xl',
          own ? (group.last ? 'rounded-br-md' : '') : group.last ? 'rounded-bl-md' : '',
        )}
      >
        {sender && group.first && <div className="mb-0.5 text-[13px] font-semibold">{sender}</div>}
        {reply && !deleted && (
          <button
            type="button"
            onClick={reply.onClick}
            className={cn('mb-1 block w-full rounded-lg border-l-4 px-2 py-1 text-left text-[13px] leading-snug', look.quote)}
          >
            <span className="block truncate font-semibold opacity-90">{reply.name}</span>
            <span className="line-clamp-2 opacity-80">{reply.text}</span>
          </button>
        )}
        {deleted ? (
          <span className="inline-flex items-center gap-1.5 italic">
            <Ban className="h-3.5 w-3.5" /> This message was deleted
          </span>
        ) : (
          <span className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{children}</span>
        )}
        {/* Time sits inline at the end of the text, WhatsApp-style */}
        <span className={cn('float-right ml-2 mt-1.5 flex translate-y-0.5 items-center gap-0.5 text-[11px] leading-none', deleted ? 'opacity-70' : look.meta)}>
          {edited && !deleted && <span className="mr-0.5">edited</span>}
          {time}
          {own && !deleted && delivery === 'sending' && <Clock3 className="h-3 w-3" aria-label="Sending" />}
          {own && !deleted && delivery === 'sent' && <Check className="h-3.5 w-3.5" aria-label="Sent" />}
          {own && !deleted && delivery === 'read' && <CheckCheck className={cn('h-3.5 w-3.5', look.read)} aria-label="Read" />}
        </span>
        {onMenu && !deleted && (
          <button
            type="button"
            onClick={onMenu}
            aria-label="Message options"
            className={cn(
              'absolute right-1 top-1 hidden h-6 w-6 items-center justify-center rounded-full bg-black/30 text-white opacity-0 transition-opacity group-hover/bubble:opacity-100 focus-visible:opacity-100 md:flex',
            )}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        )}
        {reactions && reactions.length > 0 && (
          <span className={cn('absolute -bottom-3.5 flex gap-0.5', own ? 'right-2' : 'left-2')}>
            {reactions.map((r) => (
              <button
                key={r.emoji}
                type="button"
                onClick={() => onReactionClick?.(r.emoji)}
                aria-label={`${r.emoji} ${r.count}${r.mine ? ', yours' : ''}`}
                className={cn(
                  'flex h-6 items-center gap-0.5 rounded-full border px-1.5 text-[13px] leading-none shadow-sm',
                  r.mine ? 'border-primary/60 bg-primary/25' : 'border-border bg-card',
                )}
              >
                {r.emoji}
                {r.count > 1 && <span className="text-[11px] font-semibold text-foreground">{r.count}</span>}
              </button>
            ))}
          </span>
        )}
      </div>
    </div>
  );
}

export interface MessageAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}

/** Long-press menu: quick reactions on top, actions below (like WhatsApp). */
export function MessageMenu({
  open,
  onClose,
  preview,
  reactions,
  current,
  onReact,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  preview?: string;
  reactions?: readonly string[];
  current?: string;
  onReact?: (emoji: string) => void;
  actions: MessageAction[];
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-3 sm:items-center" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-label="Message options"
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        style={{ marginBottom: 'var(--safe-bottom)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {preview && <p className="line-clamp-2 border-b border-border px-4 py-3 text-sm text-muted-foreground">{preview}</p>}
        {reactions && onReact && (
          <div className="flex justify-between border-b border-border px-3 py-2">
            {reactions.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => {
                  onReact(e);
                  onClose();
                }}
                aria-label={`React ${e}`}
                aria-pressed={current === e}
                className={cn('flex h-11 w-11 items-center justify-center rounded-full text-2xl transition-transform active:scale-90', current === e ? 'bg-primary/25' : 'hover:bg-white/5')}
              >
                {e}
              </button>
            ))}
          </div>
        )}
        <ul>
          {actions.map((a) => (
            <li key={a.label}>
              <button
                type="button"
                onClick={() => {
                  a.onClick();
                  onClose();
                }}
                className={cn('flex h-12 w-full items-center gap-3 px-4 text-left text-[15px] hover:bg-white/5', a.danger && 'text-destructive')}
              >
                {a.icon}
                {a.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}

/** Above the composer: what you're replying to or editing. */
export function ComposerBanner({ title, text, onCancel, icon }: { title: string; text: string; onCancel: () => void; icon?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-2 rounded-xl border-l-4 border-primary bg-secondary px-3 py-2">
      {icon ?? <Reply className="h-4 w-4 shrink-0 text-primary-soft" />}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold text-primary-soft">{title}</span>
        <span className="block truncate text-[13px] text-muted-foreground">{text}</span>
      </span>
      <button type="button" onClick={onCancel} aria-label="Cancel" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-white/5">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Jump to a message (used by reply quotes) and flash it. */
export function useJumpToMessage() {
  const [flash, setFlash] = useState<string | null>(null);
  const jump = useCallback((domId: string) => {
    const el = document.getElementById(domId);
    if (!el) return false;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setFlash(domId);
    window.setTimeout(() => setFlash((f) => (f === domId ? null : f)), 1200);
    return true;
  }, []);
  return { flash, jump };
}

/** Deterministic, readable name colour per player in group chats. */
const NAME_COLORS = ['#7CB7FF', '#F5C451', '#5EE0A0', '#FF8A7A', '#C6A4FF', '#4FD1E8', '#FFB469', '#F28FC7'];
export function nameColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return NAME_COLORS[Math.abs(h) % NAME_COLORS.length];
}

export function formatTime(iso: string) {
  return format(new Date(iso), 'HH:mm');
}

/** Inbox timestamp: time today, "Yesterday", weekday this week, else date. */
export function inboxTime(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Yesterday';
  if (differenceInCalendarDays(new Date(), d) < 7) return format(d, 'EEE');
  return format(d, 'dd/MM/yy');
}

/* ------------------------------------------------------------------ */
/* Composer                                                            */
/* ------------------------------------------------------------------ */

const QUICK_EMOJI = ['🔥', '😂', '🎮', '🏆', '💪', 'GG', '👑', '💀', '💯', '🤝', '😤', '🙏'];

export function Composer({
  value,
  onChange,
  onSend,
  placeholder = 'Message',
  disabled,
  maxLength = 1000,
  above,
  focusKey,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  /** Rendered above the input row (mention suggestions, etc.) */
  above?: React.ReactNode;
  /** Focus the input when this changes (e.g. starting a reply) */
  focusKey?: string | null;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const canSend = value.trim().length > 0 && !disabled;

  useEffect(() => {
    if (focusKey) taRef.current?.focus();
  }, [focusKey]);

  // Grow with the text up to ~5 lines
  useLayoutEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = '0px';
    ta.style.height = `${Math.min(ta.scrollHeight, 132)}px`;
  }, [value]);

  const send = () => {
    if (!canSend) return;
    onSend();
    setEmojiOpen(false);
    // Keep the keyboard up for the next message
    requestAnimationFrame(() => taRef.current?.focus());
  };

  const insert = (text: string) => {
    const ta = taRef.current;
    const start = ta?.selectionStart ?? value.length;
    const end = ta?.selectionEnd ?? value.length;
    const next = `${value.slice(0, start)}${text}${value.slice(end)}`.slice(0, maxLength);
    onChange(next);
    requestAnimationFrame(() => {
      ta?.focus();
      const pos = Math.min(start + text.length, next.length);
      ta?.setSelectionRange(pos, pos);
    });
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-2 py-2 md:px-6">
      {above}
      {emojiOpen && (
        <div className="mb-2 flex gap-1 overflow-x-auto rounded-2xl border border-border bg-background p-1.5 scrollbar-hide" role="listbox" aria-label="Quick reactions">
          {QUICK_EMOJI.map((e) => (
            <button
              key={e}
              type="button"
              onPointerDown={(ev) => ev.preventDefault()}
              onClick={() => insert(e === 'GG' ? 'GG ' : e)}
              className="flex h-10 min-w-10 shrink-0 items-center justify-center rounded-xl px-2 text-xl hover:bg-white/5"
            >
              {e === 'GG' ? <span className="font-score text-base font-bold text-gold">GG</span> : e}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <div className="flex min-h-11 flex-1 items-end rounded-3xl border border-border bg-background pl-1 pr-3 focus-within:border-primary/60">
          <button
            type="button"
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => setEmojiOpen((o) => !o)}
            className={cn('flex h-11 w-10 shrink-0 items-center justify-center rounded-full', emojiOpen ? 'text-primary-soft' : 'text-muted-foreground hover:text-foreground')}
            aria-label="Quick reactions"
            aria-pressed={emojiOpen}
          >
            <Smile className="h-[22px] w-[22px]" />
          </button>
          <textarea
            ref={taRef}
            rows={1}
            value={value}
            maxLength={maxLength}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={placeholder}
            aria-label={placeholder}
            className="max-h-[132px] min-h-11 flex-1 resize-none bg-transparent py-[11px] text-[15px] leading-[22px] outline-none placeholder:text-muted-foreground"
          />
        </div>
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onClick={send}
          disabled={!canSend}
          aria-label="Send"
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-[background-color,color,transform] duration-150',
            canSend ? 'scale-100 bg-primary text-white active:scale-95' : 'scale-95 bg-secondary text-muted-foreground',
          )}
        >
          <SendHorizontal className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
