
"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend as RechartsLegend, ResponsiveContainer } from 'recharts';
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
      <Card className="shadow-lg col-span-1 md:col-span-2">
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
    <Card className="shadow-lg col-span-1 md:col-span-2">
      <CardHeader>
        <CardTitle>Financial Overview</CardTitle>
        <CardDescription>Income vs. Expenses - Last 6 Months</CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        <ChartContainer config={chartConfig} className="h-[250px] sm:h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
              />
              <YAxis tickLine={false} axisLine={false} tickMargin={10} 
                tickFormatter={(value) => `₹${value.toLocaleString()}`}
              />
              <RechartsTooltip
                cursor={{ fill: "hsl(var(--muted))" }}
                content={<ChartTooltipContent 
                            indicator="dot" 
                            formatter={(value, name) => [`₹${Number(value).toLocaleString()}`, name === 'income' ? 'Income' : 'Expenses']}
                         />}
              />
              <RechartsLegend content={<ChartLegendContent />} />
              <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" fill="var(--color-expenses)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
