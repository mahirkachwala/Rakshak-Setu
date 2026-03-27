import { useState } from "react";
import { useLocation } from "wouter";
import { useAuthStore } from "@/lib/auth";
import { useLogin } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, CheckCircle2, MapPin, Syringe } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();
  const { setAuth } = useAuthStore();
  const { toast } = useToast();

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        setAuth(data.token, data.user);
        toast({
          title: "Welcome back!",
          description: "Successfully logged into the portal.",
        });
        setLocation("/");
      },
      onError: (error: any) => {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: error?.response?.data?.error || "Invalid credentials provided.",
        });
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    loginMutation.mutate({ data: { email, password } });
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-background">
      {/* Left side — Raksha Setu brand panel */}
      <div className="hidden md:flex md:w-1/2 relative items-center justify-center overflow-hidden"
        style={{ background: "linear-gradient(145deg, #4338CA 0%, #4F46E5 45%, #7C3AED 100%)" }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #ffffff 0%, transparent 70%)" }} />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #c4b5fd 0%, transparent 70%)" }} />
        <div className="absolute top-1/2 right-0 w-64 h-64 rounded-full opacity-[0.07]"
          style={{ background: "radial-gradient(circle, #a5b4fc 0%, transparent 70%)" }} />

        <div className="relative z-10 p-12 text-white max-w-xl w-full">
          {/* Logo */}
          <div className="flex items-center gap-4 mb-12">
            <div className="w-14 h-14 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center font-bold text-2xl text-white border border-white/25 shadow-xl">
              SS
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-white leading-none">Raksha Setu</h1>
              <p className="text-white/60 text-xs mt-0.5 font-medium tracking-widest uppercase">Admin Portal</p>
            </div>
          </div>

          {/* Headline */}
          <h2 className="text-4xl font-display font-bold leading-tight mb-4">
            Empowering Vaccination,<br/>Across Every Centre.
          </h2>
          <p className="text-white/70 text-base leading-relaxed mb-10">
            Manage appointments, track immunization schedules, and protect every child — following India's National Immunization Schedule.
          </p>

          {/* Feature pills */}
          <div className="space-y-3">
            {[
              { icon: CheckCircle2, text: "Full Vaccination Workflow — Booked to Completed" },
              { icon: MapPin,        text: "651+ Health Facilities across India" },
              { icon: Syringe,       text: "NIS-aligned immunization tracking" },
              { icon: ShieldCheck,   text: "Secure, role-based access control" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm text-white/85">
                <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-3.5 h-3.5 text-white" />
                </div>
                {text}
              </div>
            ))}
          </div>

          {/* Ministry tag */}
          <div className="mt-12 pt-6 border-t border-white/15">
            <p className="text-white/40 text-xs">
              Following National Immunization Schedule (NIS) · Ministry of Health & Family Welfare, India
            </p>
          </div>
        </div>
      </div>

      {/* Right side — Login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="md:hidden text-center">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="w-10 h-10 ss-gradient rounded-xl flex items-center justify-center text-white font-bold text-base shadow-lg shadow-primary/30">
                SS
              </div>
              <span className="font-display font-bold text-xl ss-gradient-text">Raksha Setu</span>
            </div>
          </div>

          <div className="text-center md:text-left">
            <h2 className="text-3xl font-display font-bold text-foreground">Provider Login</h2>
            <p className="text-muted-foreground mt-2 text-sm">Enter your credentials to access the portal.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-foreground">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="doctor@swasthyasetu.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 bg-card border-border focus:border-primary focus:ring-primary/15 rounded-xl"
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-semibold text-foreground">Password</Label>
                <a href="#" className="text-sm text-primary hover:underline font-medium">Forgot password?</a>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 bg-card border-border focus:border-primary focus:ring-primary/15 rounded-xl"
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-base font-semibold rounded-xl ss-gradient border-0 shadow-lg shadow-primary/25 hover:opacity-90 transition-opacity"
              style={{ background: "linear-gradient(135deg, #4338CA, #7C3AED)" }}
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Authenticating...</>
              ) : (
                "Sign In →"
              )}
            </Button>
          </form>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Having trouble logging in?<br />
              Contact your centre administrator.
            </p>
          </div>

          {/* NIS badge */}
          <div className="flex items-center justify-center gap-2 pt-4 border-t border-border/50">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            <p className="text-[11px] text-muted-foreground text-center">
              NIS-aligned · Ministry of Health & Family Welfare, India
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
