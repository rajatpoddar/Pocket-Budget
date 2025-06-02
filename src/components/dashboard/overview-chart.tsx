
"use client";

import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend as RechartsLegend, ResponsiveContainer } from 'recharts';
import type { ChartConfig } from '@/components/ui/chart';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

interface OverviewChartProps {
  data: Array<{ month: string; income: number; expenses: number }>;
  chartConfig: ChartConfig;
}

export function OverviewChart({ data, chartConfig }: OverviewChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="shadow-lg lg:col-span-2">
        <CardHeader>
          <CardTitle>Financial Overview</CardTitle>
          <CardDescription>Income vs. Expenses - Last 6 Months</CardDescription>
        </CardHeader>
        <CardContent className="pl-2 h-[250px] sm:h-[300px] flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No data available for the chart.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg lg:col-span-2">
      <CardHeader>
        <CardTitle>Financial Overview</CardTitle>
        <CardDescription>Income vs. Expenses - Last 6 Months</CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        <ChartContainer config={chartConfig} className="h-[250px] sm:h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis tickLine={false} axisLine={false} tickMargin={10} 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickFormatter={(value) => `₹${value > 1000 ? `${(value/1000).toFixed(0)}k` : value.toLocaleString()}`}
              />
              <RechartsTooltip
                cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                content={<ChartTooltipContent 
                            indicator="dot" 
                            formatter={(value, name) => [`₹${Number(value).toLocaleString()}`, name === 'income' ? 'Income' : 'Expenses']}
                         />}
              />
              <RechartsLegend content={<ChartLegendContent />} />
              <Line 
                type="monotone" 
                dataKey="income" 
                stroke="var(--color-income)" 
                strokeWidth={2} 
                dot={{ r: 4, fill: "var(--color-income)", strokeWidth:0 }} 
                activeDot={{ r: 6, strokeWidth:0, style: {filter: `drop-shadow(0 0 3px hsl(var(--chart-1)))`} }} 
              />
              <Line 
                type="monotone" 
                dataKey="expenses" 
                stroke="var(--color-expenses)" 
                strokeWidth={2} 
                dot={{ r: 4, fill: "var(--color-expenses)", strokeWidth:0 }} 
                activeDot={{ r: 6, strokeWidth:0, style: {filter: `drop-shadow(0 0 3px hsl(var(--chart-2)))`} }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
