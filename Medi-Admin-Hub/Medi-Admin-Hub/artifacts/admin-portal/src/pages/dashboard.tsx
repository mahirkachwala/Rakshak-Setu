import { Layout } from "@/components/layout";
import { useGetDashboardStats } from "@workspace/api-client-react";
import { getAuthHeaders } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarCheck, CheckCircle2, Clock, XCircle, Users } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Link } from "wouter";

export default function Dashboard() {
  const { data: stats, isLoading, error } = useGetDashboardStats({}, { request: getAuthHeaders(), query: { refetchInterval: 4000 } });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (error || !stats) {
    return (
      <Layout>
        <div className="p-6 bg-destructive/10 text-destructive rounded-xl">
          Failed to load dashboard statistics. Please try again later.
        </div>
      </Layout>
    );
  }

  const statCards = [
    { title: "Total Today", value: stats.totalToday, icon: CalendarCheck, color: "text-primary", bg: "bg-primary/10" },
    { title: "Completed", value: stats.completed, icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
    { title: "Pending", value: stats.pending, icon: Clock, color: "text-warning", bg: "bg-warning/10" },
    { title: "Missed", value: stats.missed, icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        {/* Stat Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, i) => (
            <Card key={i} className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">{stat.title}</p>
                  <h3 className="text-3xl font-display font-bold text-foreground">{stat.value}</h3>
                </div>
                <div className={`p-4 rounded-2xl ${stat.bg}`}>
                  <stat.icon className={`w-8 h-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card className="bg-primary border-none shadow-lg shadow-primary/20 text-primary-foreground overflow-hidden relative">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
              <CardContent className="p-8 relative z-10">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-medium opacity-90">Total Patients</h3>
                </div>
                <p className="text-5xl font-display font-bold">{stats.totalPatients.toLocaleString()}</p>
                <div className="mt-6 pt-6 border-t border-white/20">
                  <Link href="/patients" className="text-sm font-medium hover:underline flex items-center gap-2">
                    View Patient Registry &rarr;
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-border/50 shadow-sm flex-1">
              <CardHeader className="border-b border-border/50 pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-display">Upcoming Today</CardTitle>
                  <Link href="/appointments" className="text-sm text-primary hover:underline">View All</Link>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                  {stats.upcomingAppointments.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground text-sm">
                      No upcoming appointments for today.
                    </div>
                  ) : (
                    stats.upcomingAppointments.slice(0, 5).map(apt => (
                      <div key={apt.id} className="p-4 hover:bg-muted/50 transition-colors flex items-start justify-between group">
                        <div>
                          <p className="font-semibold text-foreground">{apt.childName}</p>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                            <span>{apt.vaccine}</span>
                            <span className="w-1 h-1 rounded-full bg-border"></span>
                            <span>{apt.time}</span>
                          </p>
                        </div>
                        <StatusBadge status={apt.status} />
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
