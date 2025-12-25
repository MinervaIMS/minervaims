import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      toast({
        title: "Error",
        description: "Please enter both username and password",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('admin-auth', {
        body: { username: username.trim(), password: password.trim() },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        toast({
          title: "Login Failed",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      // Store token in sessionStorage (cleared when browser closes)
      sessionStorage.setItem('adminToken', data.token);
      sessionStorage.setItem('adminUsername', data.username);

      toast({
        title: "Success",
        description: "Logged in successfully",
      });

      navigate('/admin/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Error",
        description: "An error occurred during login",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container py-section-sm md:py-section flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="font-serif text-heading">Admin Login</CardTitle>
          <CardDescription className="font-body">
            Enter your credentials to access the admin panel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username" className="font-body">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-body">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                disabled={isLoading}
              />
            </div>
            <Button 
              type="submit" 
              className="w-full font-body text-lg px-10 py-4"
              disabled={isLoading}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;