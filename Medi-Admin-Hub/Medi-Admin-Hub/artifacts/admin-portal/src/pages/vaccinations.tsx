import { Layout } from "@/components/layout";
import { useGetVaccinations } from "@workspace/api-client-react";
import { getAuthHeaders } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import { Loader2, ShieldCheck } from "lucide-react";

export default function Vaccinations() {
  const { data: records, isLoading } = useGetVaccinations({}, { request: getAuthHeaders(), query: { refetchInterval: 5000 } });

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Vaccination Records</h1>
          <p className="text-muted-foreground text-sm mt-1">Official history of administered doses.</p>
        </div>

        <Card className="border-border/50 shadow-sm overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-primary/5 text-primary uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-4">Record ID</th>
                  <th className="px-6 py-4">Date Administered</th>
                  <th className="px-6 py-4">Patient</th>
                  <th className="px-6 py-4">Vaccine Details</th>
                  <th className="px-6 py-4">Facility & Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : records?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      No vaccination records found.
                    </td>
                  </tr>
                ) : (
                  records?.map((record) => (
                    <tr key={record.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-success" />
                        {record.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-6 py-4 font-medium">
                        {format(parseISO(record.date), 'MMMM dd, yyyy')}
                      </td>
                      <td className="px-6 py-4 font-semibold text-foreground">
                        {record.childName}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-primary">{record.vaccine}</div>
                        <div className="text-xs text-muted-foreground mt-1 font-mono">Batch: {record.batchNumber || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-foreground">{record.centerName}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">By: {record.administeredBy || 'Staff'}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
