import { Layout } from "@/components/layout";
import { useGetCenters } from "@workspace/api-client-react";
import { getAuthHeaders, useAuthStore } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Phone, MapPin, Loader2 } from "lucide-react";
import { Redirect } from "wouter";

export default function Centers() {
  const { user } = useAuthStore();
  const { data: centers, isLoading } = useGetCenters({ request: getAuthHeaders() });

  // Simple RBAC check on client side
  if (user && user.role !== 'admin') {
    return <Redirect to="/" />;
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Registered Centers</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage healthcare facilities and capabilities.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full flex justify-center py-12">
               <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : centers?.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground bg-card border border-dashed rounded-xl">
              No centers registered yet.
            </div>
          ) : (
            centers?.map((center) => (
              <Card key={center.id} className="border-border/50 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
                <CardContent className="p-0 flex-1 flex flex-col">
                  <div className="p-6 border-b border-border/50 bg-primary/5 flex items-start gap-4">
                    <div className="bg-primary/20 p-3 rounded-xl text-primary">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-lg text-foreground">{center.name}</h3>
                      <span className="inline-block mt-1 px-2.5 py-0.5 bg-background border border-border rounded text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {center.type}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-6 space-y-4 flex-1">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                      <p className="text-sm text-foreground">{center.address}, {center.district}, {center.state}</p>
                    </div>
                    {center.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5 text-muted-foreground shrink-0" />
                        <p className="text-sm text-foreground">{center.phone}</p>
                      </div>
                    )}
                    
                    <div className="pt-4 border-t border-border/50">
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Services Available</p>
                      <div className="flex flex-wrap gap-2">
                        {center.services.map((service, idx) => (
                          <span key={idx} className="bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded-md">
                            {service}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
