import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useThreatStore } from '@/stores/threatStore';
import { AlertTriangle, TrendingUp, Clock, CheckCircle2, ArrowUpRight, Minus } from 'lucide-react';
import { useMemo } from 'react';

export const ThreatKPICards = () => {
  const { threats, stats } = useThreatStore();

  // Calculate threats in last hour
  const threatsLastHour = useMemo(() => {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return threats.filter(threat => new Date(threat.timestamp) >= hourAgo).length;
  }, [threats]);

  // Prepare time series data (last 24 hours)
  const timeSeriesData = useMemo(() => {
    const now = new Date();
    const data = [];
    
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourStart = new Date(hour);
      hourStart.setMinutes(0, 0, 0);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
      
      const hourThreats = threats.filter(threat => {
        const threatTime = new Date(threat.timestamp);
        return threatTime >= hourStart && threatTime < hourEnd;
      });

      const critical = hourThreats.filter(t => t.severity === 'critical').length;
      const high = hourThreats.filter(t => t.severity === 'high').length;
      const medium = hourThreats.filter(t => t.severity === 'medium').length;
      const low = hourThreats.filter(t => t.severity === 'low').length;

      data.push({
        time: hourStart.getHours().toString().padStart(2, '0') + ':00',
        timestamp: hourStart.getTime(),
        total: hourThreats.length,
        critical,
        high,
        medium,
        low
      });
    }
    
    return data;
  }, [threats]);

  const kpiCards = [
    {
      title: 'Total Threats',
      value: stats.total,
      icon: AlertTriangle,
      trend: threatsLastHour > 0 ? `+${threatsLastHour} last hour` : 'No new threats',
      trendUp: threatsLastHour > 0,
      borderClass: 'border-l-primary',
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      trendColor: threatsLastHour > 0 ? 'text-warning' : 'text-muted-foreground',
    },
    {
      title: 'Last Hour',
      value: threatsLastHour,
      icon: Clock,
      trend: 'Real-time monitoring',
      trendUp: null,
      borderClass: 'border-l-warning',
      iconBg: 'bg-warning/10',
      iconColor: 'text-warning',
      trendColor: 'text-muted-foreground',
    },
    {
      title: 'Critical Threats',
      value: stats.critical,
      icon: AlertTriangle,
      trend: stats.critical > 0 ? 'Action required' : 'All clear',
      trendUp: stats.critical > 0,
      borderClass: 'border-l-destructive',
      iconBg: 'bg-destructive/10',
      iconColor: 'text-destructive',
      trendColor: stats.critical > 0 ? 'text-destructive' : 'text-success',
    },
    {
      title: 'Resolved',
      value: stats.resolved,
      icon: CheckCircle2,
      trend: `${((stats.resolved / Math.max(stats.total, 1)) * 100).toFixed(1)}% resolution rate`,
      trendUp: null,
      borderClass: 'border-l-success',
      iconBg: 'bg-success/10',
      iconColor: 'text-success',
      trendColor: 'text-success',
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className={`relative bg-card rounded-lg border border-border border-l-4 ${card.borderClass} p-5 shadow-sm`}
            >
              {/* Top row: label + icon */}
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {card.title}
                </p>
                <div className={`w-8 h-8 rounded-full ${card.iconBg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${card.iconColor}`} />
                </div>
              </div>

              {/* Value */}
              <p className="text-3xl font-bold text-foreground mb-2 tabular-nums">
                {card.value}
              </p>

              {/* Trend */}
              <div className={`flex items-center gap-1 text-xs font-medium ${card.trendColor}`}>
                {card.trendUp === true && <ArrowUpRight className="w-3.5 h-3.5" />}
                {card.trendUp === null && <Minus className="w-3.5 h-3.5 opacity-50" />}
                <span>{card.trend}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Time Series Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-base">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span>Threat Activity (24h)</span>
          </CardTitle>
          <CardDescription>
            Threat detections over the last 24 hours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                <XAxis 
                  dataKey="time" 
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-xs">
                          <p className="font-semibold text-foreground mb-1">{label}</p>
                          {payload.map((entry, index) => (
                            <p key={index} className="text-muted-foreground" style={{ color: entry.color }}>
                              {entry.name}: {entry.value}
                            </p>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="critical" 
                  stroke="hsl(var(--destructive))" 
                  strokeWidth={2}
                  name="Critical"
                  dot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="high" 
                  stroke="hsl(var(--warning))" 
                  strokeWidth={2}
                  name="High"
                  dot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="medium" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Medium"
                  dot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="low" 
                  stroke="hsl(var(--muted-foreground))" 
                  strokeWidth={2}
                  name="Low"
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};