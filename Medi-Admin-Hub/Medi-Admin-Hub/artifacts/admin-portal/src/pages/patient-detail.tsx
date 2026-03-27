import { Layout } from "@/components/layout";
import { useGetPatient } from "@workspace/api-client-react";
import { getAuthHeaders } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useParams, Link } from "wouter";
import { ArrowLeft, User, Calendar, Phone, MapPin, Syringe, AlertCircle, CheckCircle2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { StatusBadge } from "@/components/status-badge";

export default function PatientDetail() {
  const { id } = useParams();
  const { data, isLoading, error } = useGetPatient(id || "", { request: getAuthHeaders(), query: { refetchInterval: 5000 } });

  if (isLoading) {
    return <Layout><div className="flex justify-center p-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div></Layout>;
  }

  if (error || !data) {
    return <Layout><div className="p-6 bg-destructive/10 text-destructive rounded-xl">Error loading patient data.</div></Layout>;
  }

  const { child, appointments, vaccinationHistory } = data;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/patients">
            <span className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors cursor-pointer inline-flex">
              <ArrowLeft className="w-5 h-5" />
            </span>
          </Link>
          <h1 className="text-2xl font-display font-bold text-foreground">Patient Profile</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Profile Card */}
          <Card className="border-border/50 shadow-sm md:col-span-1 h-fit">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center pb-6 border-b border-border/50">
                <div className="w-24 h-24 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4 ring-4 ring-background shadow-sm">
                  <User className="w-10 h-10" />
                </div>
                <h2 className="text-xl font-display font-bold text-foreground">{child.name}</h2>
                <p className="text-sm text-muted-foreground mt-1 capitalize">{child.gender || 'Unspecified'} • Born {child.dob}</p>
              </div>
              
              <div className="pt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Parent / Guardian</p>
                    <p className="text-sm font-medium text-foreground">{child.parentName}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Contact Number</p>
                    <p className="text-sm font-medium text-foreground">{child.parentPhone || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Address</p>
                    <p className="text-sm font-medium text-foreground">{child.address || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline & History */}
          <div className="md:col-span-2 space-y-6">
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="border-b border-border/50 bg-card/50">
                <CardTitle className="text-lg font-display flex items-center gap-2">
                  <Syringe className="w-5 h-5 text-primary" />
                  Vaccination Journey
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="relative border-l-2 border-muted ml-3 space-y-8 py-2">
                  {appointments?.length === 0 ? (
                    <p className="text-muted-foreground text-sm ml-6">No appointments scheduled yet.</p>
                  ) : (
                    appointments?.map((appt, i) => (
                      <div key={appt.id} className="relative pl-8">
                        {/* Timeline Dot */}
                        <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-card ${
                          appt.status === 'completed' ? 'bg-success' : 
                          appt.status === 'missed' ? 'bg-destructive' : 'bg-warning'
                        }`}></div>
                        
                        <div className="bg-muted/30 border border-border/50 rounded-xl p-4 shadow-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <h4 className="font-semibold text-foreground text-base">{appt.vaccine}</h4>
                            <StatusBadge status={appt.status} />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="w-4 h-4" />
                              <span>{format(parseISO(appt.date), 'MMM dd, yyyy')} at {appt.time}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="w-4 h-4" />
                              <span className="truncate">{appt.centerName}</span>
                            </div>
                          </div>
                          
                          {appt.status === 'completed' && vaccinationHistory?.find(v => v.appointmentId === appt.id) && (
                            <div className="mt-4 pt-3 border-t border-border/50 text-xs text-muted-foreground flex gap-4">
                               <span><strong className="text-foreground">Batch:</strong> {vaccinationHistory.find(v => v.appointmentId === appt.id)?.batchNumber || 'N/A'}</span>
                               <span><strong className="text-foreground">Administered By:</strong> {vaccinationHistory.find(v => v.appointmentId === appt.id)?.administeredBy || 'N/A'}</span>
                            </div>
                          )}
                        </div>
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
