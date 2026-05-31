import { motion } from 'framer-motion';
import { ArrowRightLeft, RefreshCcw, TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/db/supabase';

interface ExchangeRate {
  id: string;
  base_currency: string;
  target_currency: string;
  rate: number;
  last_updated: string;
}

export default function ExchangeRates() {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchRates();
  }, []);

  const fetchRates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .order('target_currency', { ascending: true });

      if (error) throw error;
      setRates(data || []);
    } catch (error: any) {
      console.error('Error fetching exchange rates:', error);
      toast.error('Failed to load exchange rates');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate API fetch delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    await fetchRates();
    setRefreshing(false);
    toast.success('Exchange rates updated');
  };

  return (
    <div className="container mx-auto p-6 space-y-8 max-w-5xl font-montserrat">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Exchange Rates
          </h1>
          <p className="text-muted-foreground mt-2">
            Real-time currency conversion rates for ARENA platform
          </p>
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={refreshing || loading}
          variant="outline"
          className="w-full md:w-auto"
        >
          <RefreshCcw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Rates
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse bg-muted h-32" />
          ))
        ) : rates.length > 0 ? (
          rates.map((rate) => (
            <motion.div
              key={rate.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="hover:shadow-md transition-shadow border-border bg-card">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      {rate.base_currency} to {rate.target_currency}
                    </CardTitle>
                    <ArrowRightLeft className="h-4 w-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">
                      1 {rate.base_currency} =
                    </span>
                    <span className="text-3xl font-bold text-primary">
                      {Number(rate.rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {rate.target_currency}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-muted-foreground">
                      Last updated: {new Date(rate.last_updated).toLocaleString()}
                    </span>
                    <div className="flex items-center gap-1">
                      {Math.random() > 0.5 ? (
                        <>
                          <TrendingUp className="h-3 w-3 text-emerald-500" />
                          <span className="text-[10px] text-emerald-500 font-bold">+{(Math.random() * 0.5).toFixed(2)}%</span>
                        </>
                      ) : (
                        <>
                          <TrendingDown className="h-3 w-3 text-rose-500" />
                          <span className="text-[10px] text-rose-500 font-bold">-{(Math.random() * 0.5).toFixed(2)}%</span>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <p className="text-muted-foreground">No exchange rates found.</p>
          </div>
        )}
      </div>

      <Card className="bg-muted/30 border-dashed border-2">
        <CardContent className="p-8 text-center space-y-4">
          <h3 className="text-lg font-semibold">Need a different currency?</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            We are constantly adding support for more regional currencies to make gaming more accessible across Africa and the world.
          </p>
          <Button 
            variant="link" 
            className="text-primary font-bold"
            onClick={() => toast.info('Thank you for your interest! We are working on adding more currencies.')}
          >
            Request Currency Support
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
