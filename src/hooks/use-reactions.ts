import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/db/supabase';

export const REACTION_EMOJI = ['👍', '❤️', '😂', '😮', '😢', '🔥'] as const;

interface Row {
  kind: 'dm' | 'world';
  message_id: string;
  user_id: string;
  emoji: string;
}

export interface ReactionSummary {
  emoji: string;
  count: number;
  mine: boolean;
}

/**
 * Emoji reactions for the messages on screen: one per player per message,
 * kept live while the chat is open. Tapping your own reaction again removes it.
 */
export function useReactions(kind: 'dm' | 'world', messageIds: string[], me: string | undefined) {
  const [rows, setRows] = useState<Row[]>([]);
  const idsKey = useMemo(() => messageIds.filter((id) => !id.startsWith('temp-')).sort().join(','), [messageIds]);
  const known = useRef(new Set<string>());

  useEffect(() => {
    const ids = idsKey ? idsKey.split(',') : [];
    known.current = new Set(ids);
    if (!me || ids.length === 0) {
      setRows([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const all: Row[] = [];
      for (let i = 0; i < ids.length; i += 100) {
        const { data } = await supabase
          .from('message_reactions')
          .select('kind, message_id, user_id, emoji')
          .eq('kind', kind)
          .in('message_id', ids.slice(i, i + 100));
        if (data) all.push(...(data as Row[]));
      }
      if (!cancelled) setRows(all);
    })();
    return () => {
      cancelled = true;
    };
  }, [kind, idsKey, me]);

  // Live updates while this chat is open (rows the player can't see are filtered out by the database)
  useEffect(() => {
    if (!me) return;
    const channel = supabase
      .channel(`reactions-${kind}-${me}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions', filter: `kind=eq.${kind}` }, (payload) => {
        const next = payload.new as Partial<Row>;
        const prev = payload.old as Partial<Row>;
        setRows((cur) => {
          let out = cur;
          if (prev?.message_id && prev.user_id) out = out.filter((r) => !(r.message_id === prev.message_id && r.user_id === prev.user_id));
          if (payload.eventType !== 'DELETE' && next?.message_id && next.user_id && known.current.has(next.message_id)) {
            out = out.filter((r) => !(r.message_id === next.message_id && r.user_id === next.user_id));
            out = [...out, next as Row];
          }
          return out;
        });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [kind, me]);

  const byMessage = useMemo(() => {
    const map: Record<string, ReactionSummary[]> = {};
    for (const r of rows) {
      const list = (map[r.message_id] ||= []);
      const hit = list.find((x) => x.emoji === r.emoji);
      if (hit) {
        hit.count++;
        hit.mine ||= r.user_id === me;
      } else {
        list.push({ emoji: r.emoji, count: 1, mine: r.user_id === me });
      }
    }
    for (const list of Object.values(map)) list.sort((a, b) => b.count - a.count);
    return map;
  }, [rows, me]);

  const myReaction = useCallback((messageId: string) => rows.find((r) => r.message_id === messageId && r.user_id === me)?.emoji, [rows, me]);

  const react = useCallback(
    async (messageId: string, emoji: string) => {
      if (!me || messageId.startsWith('temp-')) return;
      const current = rows.find((r) => r.message_id === messageId && r.user_id === me)?.emoji;
      const before = rows;
      // Optimistic
      setRows((cur) => {
        const rest = cur.filter((r) => !(r.message_id === messageId && r.user_id === me));
        return current === emoji ? rest : [...rest, { kind, message_id: messageId, user_id: me, emoji }];
      });
      const { error } =
        current === emoji
          ? await supabase.from('message_reactions').delete().eq('kind', kind).eq('message_id', messageId).eq('user_id', me)
          : await supabase.from('message_reactions').upsert({ kind, message_id: messageId, user_id: me, emoji }, { onConflict: 'kind,message_id,user_id' });
      if (error) {
        setRows(before);
        toast.error('Reaction not saved. Try again.');
      }
    },
    [kind, me, rows],
  );

  return { byMessage, myReaction, react };
}
