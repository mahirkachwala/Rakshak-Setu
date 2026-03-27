import { useState } from "react";
import { Layout } from "@/components/layout";
import { useGetPatients } from "@workspace/api-client-react";
import { getAuthHeaders } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Loader2, ChevronRight, Activity } from "lucide-react";
import { Link } from "wouter";

export default function Patients() {
  const [search, setSearch] = useState("");
  const { data: patients, isLoading } = useGetPatients(
    { search: search || undefined }, 
    { request: getAuthHeaders(), query: { refetchInterval: 5000 } }
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-display font-bold text-foreground">Patient Registry</h1>
        </div>

        <Card className="border-border/50 shadow-sm overflow-hidden bg-card">
          <div className="p-4 border-b border-border/50 bg-card/50">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search by child name, parent name, or phone..." 
                className="pl-9 bg-background"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-4">Child Details</th>
                  <th className="px-6 py-4">Parent / Guardian</th>
                  <th className="px-6 py-4">Age / DOB</th>
                  <th className="px-6 py-4">Vaccination Status</th>
                  <th className="px-6 py-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : patients?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      No patients found matching your search.
                    </td>
                  </tr>
                ) : (
                  patients?.map((patient) => {
                    const total = patient.totalVaccines || 1;
                    const completed = patient.completedVaccines || 0;
                    const percent = Math.round((completed / total) * 100);
                    
                    return (
                      <tr key={patient.id} className="hover:bg-muted/30 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-foreground text-base">{patient.name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{patient.gender || 'Not specified'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-foreground">{patient.parentName}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{patient.parentPhone}</div>
                        </td>
                        <td className="px-6 py-4 text-foreground">
                          {patient.dob}
                        </td>
                        <td className="px-6 py-4 w-48">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-medium text-foreground">{percent}% Complete</span>
                            <span className="text-muted-foreground">{completed}/{total}</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${percent === 100 ? 'bg-success' : 'bg-primary'}`} 
                              style={{ width: `${percent}%` }}
                            ></div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link href={`/patients/${patient.id}`}>
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all cursor-pointer">
                              <ChevronRight className="w-4 h-4" />
                            </span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
