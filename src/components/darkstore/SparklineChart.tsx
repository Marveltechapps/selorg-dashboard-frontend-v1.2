import React from 'react';
import { Area, AreaChart } from 'recharts';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';
import { cn } from '@/lib/utils';

interface SparklineChartProps {
  data: number[];
  className?: string;
  color?: string;
  height?: number;
}

const chartConfig = {
  value: { label: 'Value', color: 'hsl(142, 71%, 45%)' },
} satisfies ChartConfig;

export function SparklineChart({ data, className, color, height = 32 }: SparklineChartProps) {
  if (!data.length) {
    return <div className={cn('text-xs text-slate-400 py-2', className)}>No data</div>;
  }

  const points = data.map((v, i) => ({ i, value: v }));

  return (
    <ChartContainer config={chartConfig} className={cn('w-full', className)} style={{ height }}>
      <AreaChart data={points} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="dsSparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color ?? 'hsl(142, 71%, 45%)'} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color ?? 'hsl(142, 71%, 45%)'} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color ?? 'hsl(142, 71%, 45%)'}
          fill="url(#dsSparkFill)"
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  );
}
