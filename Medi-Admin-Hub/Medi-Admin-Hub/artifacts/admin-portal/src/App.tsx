import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuthStore } from "@/lib/auth";

import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Appointments from "@/pages/appointments";
import Patients from "@/pages/patients";
import PatientDetail from "@/pages/patient-detail";
import Slots from "@/pages/slots";
import Centers from "@/pages/centers";
import Vaccinations from "@/pages/vaccinations";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { token } = useAuthStore();
  if (!token) {
    return <Redirect to="/login" />;
  }
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/appointments">
        <ProtectedRoute component={Appointments} />
      </Route>
      <Route path="/patients/:id">
        <ProtectedRoute component={PatientDetail} />
      </Route>
      <Route path="/patients">
        <ProtectedRoute component={Patients} />
      </Route>
      <Route path="/slots">
        <ProtectedRoute component={Slots} />
      </Route>
      <Route path="/centers">
        <ProtectedRoute component={Centers} />
      </Route>
      <Route path="/vaccinations">
        <ProtectedRoute component={Vaccinations} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
