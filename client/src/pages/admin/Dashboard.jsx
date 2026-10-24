import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useGetPurchasedCoursesQuery } from "@/features/api/purchaseApi";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  BookOpen,
  IndianRupee,
  Minus,
  Receipt,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import React, { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState, PageHeader } from "./AdminUI";

const DAY_MS = 86400000;

const amountOf = (purchase) =>
  purchase?.amount ?? purchase?.courseId?.coursePrice ?? 0;

const inr = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;

// Short axis labels: ₹999, ₹1k, ₹1.5k — full values live in the tooltip.
const compactInr = (v) =>
  v >= 1000 ? `₹${parseFloat((v / 1000).toFixed(1))}k` : `₹${v}`;

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const timeOf = (purchase) => new Date(purchase?.createdAt).getTime();

// Percent change between two periods. Returns null when the earlier period
// has no data — a "+∞%" pill would be invented, so the card shows its
// last-30-days subtotal instead and the trend chart tells the story.
const pctChange = (current, previous) =>
  previous > 0 ? ((current - previous) / previous) * 100 : null;

// One bucket per calendar day for the last `days` days (oldest → today),
// revenue and sale count summed from the purchases' createdAt.
const buildDailySeries = (purchases, days) => {
  const todayStart = startOfDay(new Date()).getTime();
  const series = [];
  const buckets = new Map();
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(todayStart - i * DAY_MS);
    const entry = {
      label: day.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      fullLabel: day.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      revenue: 0,
      sales: 0,
    };
    buckets.set(day.getTime(), entry);
    series.push(entry);
  }
  for (const p of purchases) {
    const t = timeOf(p);
    if (Number.isNaN(t)) continue;
    const entry = buckets.get(startOfDay(t).getTime());
    if (entry) {
      entry.revenue += amountOf(p);
      entry.sales += 1;
    }
  }
  return series;
};

const saleDateLabel = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const dayStart = startOfDay(d).getTime();
  const todayStart = startOfDay(new Date()).getTime();
  if (dayStart === todayStart) return "Today";
  if (dayStart === todayStart - DAY_MS) return "Yesterday";
  return d.toLocaleDateString("en-IN");
};

const TOOLTIP_STYLE = {
  backgroundColor: "var(--popover)",
  color: "var(--popover-foreground)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  fontSize: "13px",
};

const TrendPill = ({ pct }) => {
  if (pct === null || pct === undefined) return null;
  const rounded = Math.round(pct);
  const Icon = rounded > 0 ? TrendingUp : rounded < 0 ? TrendingDown : Minus;
  const direction = rounded > 0 ? "Up" : rounded < 0 ? "Down" : "No change";
  return (
    <span
      title="Compared with the previous 30 days"
      aria-label={`${direction} ${Math.abs(rounded)} percent compared with the previous 30 days`}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
        rounded > 0 && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        rounded < 0 && "bg-rose-500/10 text-rose-700 dark:text-rose-400",
        rounded === 0 && "bg-muted text-muted-foreground"
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {rounded > 0 ? `+${rounded}%` : `${rounded}%`}
    </span>
  );
};

const StatCard = ({ icon, tint, label, value, hint, trend }) => {
  const Icon = icon;
  return (
    <Card className="shadow-sm">
      <CardContent className="flex h-full flex-col gap-4">
        <div className="flex items-start justify-between gap-2">
          <span
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg",
              tint
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          {trend}
        </div>
        <div className="min-w-0">
          <p className="text-3xl font-bold tabular-nums tracking-tight">{value}</p>
          <p className="mt-1 text-sm font-medium">{label}</p>
          {hint ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};

const Dashboard = () => {
  const { data, isError, isLoading, refetch } = useGetPurchasedCoursesQuery();
  const [reduceMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Sales overview for your courses." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Skeleton className="h-80 w-full lg:col-span-2" />
          <Skeleton className="h-80 w-full" />
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Sales overview for your courses." />
        <Card>
          <EmptyState
            icon={AlertCircle}
            title="Could not load sales data"
            description="Something went wrong while fetching your purchased courses."
            action={
              <Button variant="outline" className="h-11" onClick={() => refetch()}>
                Try again
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  const purchasedCourse = data?.purchasedCourse ?? [];
  const hasSales = purchasedCourse.length > 0;

  const totalSales = purchasedCourse.length;
  const totalRevenue = purchasedCourse.reduce((sum, p) => sum + amountOf(p), 0);
  const coursesSold = new Set(
    purchasedCourse.map((p) => p.courseId?._id).filter(Boolean)
  ).size;
  // userId arrives as a plain id (the endpoint populates only courseId),
  // so a distinct-buyer count is real data, not an estimate.
  const studentCount = new Set(
    purchasedCourse
      .map((p) => (typeof p.userId === "string" ? p.userId : p.userId?._id))
      .filter(Boolean)
  ).size;
  const averageOrder = totalSales ? Math.round(totalRevenue / totalSales) : 0;

  // 30-day windows anchored at the start of today: last 30 days (including
  // today) vs the 30 days before that.
  const todayStart = startOfDay(new Date()).getTime();
  const inRange = (p, from, to) => {
    const t = timeOf(p);
    return !Number.isNaN(t) && t >= from && t < to;
  };
  const last30 = purchasedCourse.filter((p) =>
    inRange(p, todayStart - 29 * DAY_MS, todayStart + DAY_MS)
  );
  const prev30 = purchasedCourse.filter((p) =>
    inRange(p, todayStart - 59 * DAY_MS, todayStart - 29 * DAY_MS)
  );
  const last30Revenue = last30.reduce((sum, p) => sum + amountOf(p), 0);
  const prev30Revenue = prev30.reduce((sum, p) => sum + amountOf(p), 0);
  const salesTrend = pctChange(last30.length, prev30.length);
  const revenueTrend = pctChange(last30Revenue, prev30Revenue);

  const dailySeries = buildDailySeries(purchasedCourse, 30);
  const hasRecentRevenue = dailySeries.some((d) => d.revenue > 0);

  // Revenue grouped per course for the chart (the old chart crashed when a
  // purchase pointed at a deleted course — courseId is null then).
  const byCourse = new Map();
  for (const p of purchasedCourse) {
    const name = p.courseId?.courseTitle || "Deleted course";
    const row = byCourse.get(name) || { name, revenue: 0, sales: 0 };
    row.revenue += amountOf(p);
    row.sales += 1;
    byCourse.set(name, row);
  }
  const chartData = [...byCourse.values()].sort((a, b) => b.revenue - a.revenue);

  const recentSales = [...purchasedCourse]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Sales overview for your courses."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          icon={ShoppingCart}
          tint="bg-chart-2/10 text-chart-2"
          label="Total Sales"
          value={totalSales}
          hint={
            hasSales
              ? `${last30.length} in the last 30 days`
              : "Completed orders"
          }
          trend={<TrendPill pct={salesTrend} />}
        />
        <StatCard
          icon={IndianRupee}
          tint="bg-chart-1/10 text-chart-1"
          label="Total Revenue"
          value={inr(totalRevenue)}
          hint={
            hasSales
              ? `${inr(last30Revenue)} in the last 30 days`
              : "From completed orders"
          }
          trend={<TrendPill pct={revenueTrend} />}
        />
        <StatCard
          icon={Users}
          tint="bg-chart-3/10 text-chart-3"
          label="Students"
          value={studentCount}
          hint="Distinct buyers"
        />
        <StatCard
          icon={BookOpen}
          tint="bg-chart-5/10 text-chart-5"
          label="Courses Sold"
          value={coursesSold}
          hint="Courses with at least one sale"
        />
        <StatCard
          icon={Receipt}
          tint="bg-primary/10 text-primary"
          label="Average Order"
          value={inr(averageOrder)}
          hint="Revenue per order"
        />
      </div>

      {!hasSales ? (
        <Card className="shadow-sm">
          <EmptyState
            icon={ShoppingCart}
            title="No sales yet"
            description="When a student buys one of your courses, your revenue trend, top courses and recent sales will appear here."
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="shadow-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Revenue trend</CardTitle>
                <CardDescription>
                  Daily revenue · {inr(last30Revenue)} in the last 30 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!hasRecentRevenue ? (
                  <EmptyState
                    icon={IndianRupee}
                    title="No revenue in the last 30 days"
                    description="All of your sales are older than 30 days — they still count in the totals above and in Revenue by course."
                  />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart
                      data={dailySeries}
                      margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                      accessibilityLayer
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--border)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                        axisLine={{ stroke: "var(--border)" }}
                        tickLine={false}
                        interval="preserveStartEnd"
                        minTickGap={32}
                      />
                      <YAxis
                        tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={compactInr}
                        width={56}
                      />
                      <Tooltip
                        cursor={{ stroke: "var(--border)" }}
                        contentStyle={TOOLTIP_STYLE}
                        labelFormatter={(label, payload) =>
                          payload?.[0]?.payload?.fullLabel || label
                        }
                        formatter={(value, name, item) => {
                          const sales = item?.payload?.sales ?? 0;
                          return [
                            `${inr(value)} · ${sales} sale${sales === 1 ? "" : "s"}`,
                            name,
                          ];
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        name="Revenue"
                        stroke="var(--chart-2)"
                        strokeWidth={2}
                        fill="var(--chart-2)"
                        fillOpacity={0.14}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                        isAnimationActive={!reduceMotion}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Revenue by course</CardTitle>
                <CardDescription>All completed orders</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 4, right: 12, left: 0, bottom: 0 }}
                    accessibilityLayer
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={compactInr}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={104}
                      tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) =>
                        v.length > 15 ? `${v.slice(0, 15)}…` : v
                      }
                    />
                    <Tooltip
                      cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(value, name, item) => {
                        const sales = item?.payload?.sales ?? 0;
                        return [
                          `${inr(value)} · ${sales} sale${sales === 1 ? "" : "s"}`,
                          name,
                        ];
                      }}
                    />
                    <Bar
                      dataKey="revenue"
                      name="Revenue"
                      fill="var(--chart-1)"
                      radius={[0, 4, 4, 0]}
                      maxBarSize={30}
                      isAnimationActive={!reduceMotion}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Recent sales</CardTitle>
              <CardDescription>Your latest completed orders</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentSales.map((p) => {
                      const title = p.courseId?.courseTitle || "Deleted course";
                      const deleted = !p.courseId?.courseTitle;
                      return (
                        <TableRow key={p._id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <span
                                aria-hidden
                                className={cn(
                                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-sm font-semibold",
                                  deleted
                                    ? "bg-muted text-muted-foreground"
                                    : "bg-primary/10 text-primary"
                                )}
                              >
                                {deleted ? "?" : title.charAt(0).toUpperCase()}
                              </span>
                              <span className="font-medium">{title}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {saleDateLabel(p.createdAt)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {inr(amountOf(p))}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default Dashboard;
