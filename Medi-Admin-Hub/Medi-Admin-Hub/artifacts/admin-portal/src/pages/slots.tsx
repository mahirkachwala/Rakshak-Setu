import { useState } from "react";
import { Layout } from "@/components/layout";
import { useGetSlots, useCreateSlot, useDeleteSlot } from "@workspace/api-client-react";
import { getAuthHeaders } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, CalendarClock, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function Slots() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isAddOpen, setIsAddOpen] = useState(false);
  const { toast } = useToast();

  const { data: slots, isLoading, refetch } = useGetSlots({ date }, { request: getAuthHeaders() });

  const createMutation = useCreateSlot({
    mutation: {
      onSuccess: () => {
        toast({ title: "Success", description: "Slot created successfully." });
        setIsAddOpen(false);
        refetch();
      },
      onError: () => toast({ variant: "destructive", title: "Error", description: "Failed to create slot." })
    },
    request: getAuthHeaders()
  });

  const deleteMutation = useDeleteSlot({
    mutation: {
      onSuccess: () => {
        toast({ title: "Deleted", description: "Slot removed successfully." });
        refetch();
      }
    },
    request: getAuthHeaders()
  });

  const handleAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createMutation.mutate({
      data: {
        centerId: fd.get("centerId") as string, // Real app would use context/select
        date: fd.get("date") as string,
        startTime: fd.get("startTime") as string,
        endTime: fd.get("endTime") as string,
        capacity: parseInt(fd.get("capacity") as string, 10),
      }
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Slot Management</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage daily vaccination capacities.</p>
          </div>
          <Button onClick={() => setIsAddOpen(true)} className="shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4 mr-2" /> Add New Slot
          </Button>
        </div>

        <Card className="border-border/50 shadow-sm p-4 bg-card/50 flex items-center gap-4">
          <Label className="whitespace-nowrap font-medium">Select Date:</Label>
          <Input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)}
            className="w-auto bg-background"
          />
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full flex justify-center py-12">
               <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : slots?.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground bg-card border border-dashed rounded-xl">
              No slots configured for {format(new Date(date), 'MMM dd, yyyy')}.
            </div>
          ) : (
            slots?.map((slot) => {
              const percentFull = Math.round((slot.booked / slot.capacity) * 100);
              return (
                <Card key={slot.id} className="border-border/50 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-1 h-full ${percentFull >= 100 ? 'bg-destructive' : percentFull > 80 ? 'bg-warning' : 'bg-success'}`}></div>
                  <div className="p-5 pl-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2 text-primary font-semibold">
                        <CalendarClock className="w-5 h-5" />
                        {slot.startTime} - {slot.endTime}
                      </div>
                      <button 
                        onClick={() => deleteMutation.mutate({ id: slot.id })}
                        className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 p-1"
                        title="Delete slot"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <h4 className="text-sm font-medium text-foreground mb-4 truncate" title={slot.centerName}>
                      {slot.centerName || 'Primary Center'}
                    </h4>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-muted-foreground">Booked: <span className="text-foreground">{slot.booked}</span></span>
                        <span className="text-muted-foreground">Capacity: <span className="text-foreground">{slot.capacity}</span></span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className={`h-full rounded-full ${percentFull >= 100 ? 'bg-destructive' : 'bg-primary'}`} 
                          style={{ width: `${Math.min(percentFull, 100)}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-right mt-1 font-semibold text-primary">{slot.available} available</p>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <form onSubmit={handleAddSubmit}>
            <DialogHeader>
              <DialogTitle>Add Vaccination Slot</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="centerId">Center ID</Label>
                <Input id="centerId" name="centerId" defaultValue="center-1" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" name="date" type="date" defaultValue={date} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input id="startTime" name="startTime" type="time" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <Input id="endTime" name="endTime" type="time" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity (Max Patients)</Label>
                <Input id="capacity" name="capacity" type="number" min="1" required />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save Slot
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
