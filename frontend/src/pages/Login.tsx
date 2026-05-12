import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Loader2, AlertCircle, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const { login, isLoading, isAuthenticated, role, seedAdmin } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (isAuthenticated) {
      if (role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, role, navigate]);

  useEffect(() => {
    const initializeAdmin = async () => {
      try {
        await seedAdmin();
      } catch (error) {
        console.error('Failed to seed admin:', error);
      }
    };
    initializeAdmin();
  }, [seedAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      await login({ username, password });
      toast({
        title: 'Login successful',
        description: `Welcome back, ${username}!`,
      });

      if (role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      toast({
        title: 'Login failed',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const fillCredentials = (type: 'admin' | 'analyst') => {
    switch (type) {
      case 'admin':
        setUsername('admin');
        setPassword('PrimalGuard@123');
        break;
      case 'analyst':
        setUsername('analyst');
        setPassword('analyst123');
        break;
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left column — indigo brand panel */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-1/2 flex-col justify-center px-14 py-12 bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 relative overflow-hidden">
        {/* Subtle radial highlight */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(255,255,255,0.07)_0%,transparent_65%)] pointer-events-none" />

        <div className="relative z-10 max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-14">
            <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center border border-white/20">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">PrimalGuard</span>
          </div>

          <h2 className="text-4xl font-bold text-white mb-4 leading-snug">
            Intelligent Cyber<br />Threat Detection
          </h2>
          <p className="text-indigo-200 text-base mb-12 leading-relaxed">
            Powered by AutoML for real-time threat intelligence across your entire network.
          </p>

          {/* Feature bullets */}
          <div className="space-y-4">
            {[
              'Real-time threat monitoring',
              'AutoML-powered detection',
              'Chrome extension integration',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-4">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 border border-white/15">
                  <Check className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-white/90 font-medium text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right column — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-background">
        <div className="w-full max-w-[380px]">
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-2 mb-10 lg:hidden">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">PrimalGuard</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
            <p className="text-muted-foreground mt-1 text-sm">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                autoComplete="username"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          {/* Quick access */}
          <div className="mt-8">
            <p className="text-xs text-muted-foreground text-center mb-3">Quick access</p>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => fillCredentials('admin')}
                className="text-xs px-4 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('analyst')}
                className="text-xs px-4 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors"
              >
                Analyst
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;