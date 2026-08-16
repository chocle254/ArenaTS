import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  eachYearOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subWeeks,
  subYears,
} from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface Bucket {
  label: string;
  rangeStart: Date;
  rangeEnd: Date;
  revenue: number;
  deposits: number;
  withdrawals: number;
  floatTopups: number;
}

const PERIODS: { key: Period; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
];

function getRange(period: Period): { start: Date; end: Date; buckets: Date[] } {
  const now = new Date();
  switch (period) {
    case 'daily': {
      const start = startOfDay(subDays(now, 13));
      return { start, end: endOfDay(now), buckets: eachDayOfInterval({ start, end: now }) };
    }
    case 'weekly': {
      const start = startOfWeek(subWeeks(now, 11));
      return { start, end: endOfWeek(now), buckets: eachWeekOfInterval({ start, end: now }) };
    }
    case 'monthly': {
      const start = startOfMonth(subMonths(now, 11));
      return { start, end: endOfMonth(now), buckets: eachMonthOfInterval({ start, end: now }) };
    }
    case 'yearly': {
      const start = startOfYear(subYears(now, 4));
      return { start, end: endOfYear(now), buckets: eachYearOfInterval({ start, end: now }) };
    }
  }
}

function bucketLabel(period: Period, d: Date): string {
  switch (period) {
    case 'daily':
      return format(d, 'MMM d');
    case 'weekly':
      return format(d, "'w/o' MMM d");
    case 'monthly':
      return format(d, 'MMM yyyy');
    case 'yearly':
      return format(d, 'yyyy');
  }
}

function bucketEnd(period: Period, d: Date): Date {
  switch (period) {
    case 'daily':
      return endOfDay(d);
    case 'weekly':
      return endOfWeek(d);
    case 'monthly':
      return endOfMonth(d);
    case 'yearly':
      return endOfYear(d);
  }
}

export default function FinanceAnalytics() {
  const [period, setPeriod] = useState<Period>('daily');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<{
    challenges: { platform_fee: number; completed_at: string }[];
    tournaments: { prize_pool: number; platform_fee_percentage: number; start_time: string }[];
    transactions: { type: string; amount: number; currency: string; status: string; created_at: string }[];
    floatTopups: { amount: number; status: string; created_at: string }[];
  }>({ challenges: [], tournaments: [], transactions: [], floatTopups: [] });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [challengesRes, tournamentsRes, transactionsRes, floatRes] = await Promise.all([
        supabase
          .from('challenges')
          .select('platform_fee, completed_at')
          .eq('status', 'completed'),
        supabase
          .from('tournaments')
          .select('prize_pool, platform_fee_percentage, start_time')
          .eq('status', 'completed'),
        supabase
          .from('transactions')
          .select('type, amount, currency, status, created_at')
          .eq('status', 'completed'),
        supabase
          .from('platform_float_topups')
          .select('amount, status, created_at'),
      ]);

      if (cancelled) return;

      setRows({
        challenges: (challengesRes.data || []).map(c => ({
          platform_fee: Number(c.platform_fee || 0),
          completed_at: c.completed_at,
        })),
        tournaments: (tournamentsRes.data || []).map(t => ({
          prize_pool: Number(t.prize_pool || 0),
          platform_fee_percentage: Number(t.platform_fee_percentage || 0),
          start_time: t.start_time,
        })),
        transactions: (transactionsRes.data || []).map(t => ({
          type: t.type,
          amount: Number(t.amount || 0),
          currency: t.currency,
          status: t.status,
          created_at: t.created_at,
        })),
        floatTopups: (floatRes.data || []).map(f => ({
          amount: Number(f.amount || 0),
          status: f.status,
          created_at: f.created_at,
        })),
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const { buckets, totals } = useMemo(() => {
    const { buckets: rawBuckets } = getRange(period);

    const built: Bucket[] = rawBuckets.map(d => ({
      label: bucketLabel(period, d),
      rangeStart: d,
      rangeEnd: bucketEnd(period, d),
      revenue: 0,
      deposits: 0,
      withdrawals: 0,
      floatTopups: 0,
    }));

    const findBucket = (dateStr: string) => {
      const t = new Date(dateStr).getTime();
      return built.find(b => t >= b.rangeStart.getTime() && t <= b.rangeEnd.getTime());
    };

    rows.challenges.forEach(c => {
      const b = findBucket(c.completed_at);
      if (b) b.revenue += c.platform_fee;
    });
    rows.tournaments.forEach(t => {
      const b = findBucket(t.start_time);
      if (b) b.revenue += t.prize_pool * (t.platform_fee_percentage / 100);
    });
    rows.transactions.forEach(tx => {
      const b = findBucket(tx.created_at);
      if (!b) return;
      // AC deposits are stored in AC units (100 AC = $1); everything else USD.
      const usd = tx.currency === 'AC' ? tx.amount / 100 : tx.amount;
      if (tx.type === 'deposit') b.deposits += usd;
      if (tx.type === 'withdrawal') b.withdrawals += usd;
    });
    rows.floatTopups
      .filter(f => f.status === 'completed')
      .forEach(f => {
        const b = findBucket(f.created_at);
        if (b) b.floatTopups += f.amount;
      });

    built.forEach(b => {
      b.revenue = Math.round(b.revenue * 100) / 100;
      b.deposits = Math.round(b.deposits * 100) / 100;
      b.withdrawals = Math.round(b.withdrawals * 100) / 100;
      b.floatTopups = Math.round(b.floatTopups * 100) / 100;
    });

    const totals = built.reduce(
      (acc, b) => ({
        revenue: acc.revenue + b.revenue,
        deposits: acc.deposits + b.deposits,
        withdrawals: acc.withdrawals + b.withdrawals,
        floatTopups: acc.floatTopups + b.floatTopups,
      }),
      { revenue: 0, deposits: 0, withdrawals: 0, floatTopups: 0 }
    );

    return { buckets: built, totals };
  }, [rows, period]);

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-xs text-muted-foreground max-w-md">
          Platform fee revenue, Arena Currency deposits, cash withdrawals, and float top-ups —
          all pulled from the same account, bucketed over time.
        </p>
        <div className="flex gap-1 bg-muted/40 p-1 rounded-lg">
          {PERIODS.map(p => (
            <Button
              key={p.key}
              size="sm"
              variant={period === p.key ? 'default' : 'ghost'}
              className="h-7 px-3 text-xs"
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading analytics…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-border bg-card/50">
              <CardContent className="pt-6">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Revenue (period)</div>
                <div className="text-2xl font-bold mt-1">{fmt(totals.revenue)}</div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card/50">
              <CardContent className="pt-6">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Deposits (period)</div>
                <div className="text-2xl font-bold mt-1">{fmt(totals.deposits)}</div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card/50">
              <CardContent className="pt-6">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Withdrawals (period)</div>
                <div className="text-2xl font-bold mt-1">{fmt(totals.withdrawals)}</div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card/50">
              <CardContent className="pt-6">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Float top-ups (period)</div>
                <div className="text-2xl font-bold mt-1">{fmt(totals.floatTopups)}</div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border bg-card/50">
            <CardHeader>
              <CardTitle className="text-base">Platform revenue over time</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={buckets} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                    formatter={(value: number) => [fmt(value), 'Revenue']}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    fill="url(#revenueFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-border bg-card/50">
            <CardHeader>
              <CardTitle className="text-base">Cash flow: deposits vs. withdrawals</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={buckets} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                    formatter={(value: number, name: string) => [fmt(value), name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="deposits" name="Deposits" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="withdrawals" name="Withdrawals" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-border bg-card/50">
            <CardHeader>
              <CardTitle className="text-base">Platform float top-ups</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={buckets} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                    formatter={(value: number) => [fmt(value), 'Float deposited']}
                  />
                  <Bar dataKey="floatTopups" name="Float top-ups" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
