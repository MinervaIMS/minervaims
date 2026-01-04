import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { z } from 'zod';
import authBg from '@/assets/auth-bg.webp';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

const Auth = () => {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; fullName?: string }>({});
  
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, isLoading, signIn, signUp } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (!isLoading && user) {
      const from = (location.state as { from?: string })?.from || '/';
      navigate(from, { replace: true });
    }
  }, [user, isLoading, navigate, location]);

  const validateForm = () => {
    const newErrors: typeof errors = {};

    try {
      emailSchema.parse(email);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.email = e.errors[0].message;
      }
    }

    try {
      passwordSchema.parse(password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.password = e.errors[0].message;
      }
    }

    if (activeTab === 'signup' && !fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      if (activeTab === 'login') {
        const { error } = await signIn(email, password, rememberMe);
        
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast({
              title: "Login Failed",
              description: "Email or password is incorrect. Please check your credentials.",
              variant: "destructive",
            });
          } else if (error.message.includes('Email not confirmed')) {
            toast({
              title: "Email Not Verified",
              description: "Please check your email and click the verification link before logging in.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Login Failed",
              description: error.message,
              variant: "destructive",
            });
          }
          return;
        }

        toast({
          title: "Welcome back!",
          description: "You have successfully logged in.",
        });
      } else {
        // Signup validation for email domain
        const isAdminEmail = email === 'as.minerva@unibocconi.it';
        const isStudentEmail = email.endsWith('@studbocconi.it');
        
        if (!isAdminEmail && !isStudentEmail) {
          toast({
            title: "Invalid Email",
            description: "Registration requires a @studbocconi.it email address.",
            variant: "destructive",
          });
          return;
        }

        const { error } = await signUp(email, password, fullName);
        
        if (error) {
          if (error.message.includes('already registered')) {
            toast({
              title: "Account Exists",
              description: "An account with this email already exists. Please log in instead.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Registration Failed",
              description: error.message,
              variant: "destructive",
            });
          }
          return;
        }

        toast({
          title: "Check Your Email",
          description: "We've sent you a verification link. Please check your inbox, and also the spam/junk folder.",
        });
        
        // Switch to login tab after successful signup
        setActiveTab('login');
        setPassword('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container py-section-sm md:py-section flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center py-section-sm md:py-section bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${authBg})` }}
    >
      <div className="container flex items-center justify-center">
        <Card className="w-full max-w-md shadow-elevated">
        <CardHeader className="text-center">
          <CardTitle className="font-serif text-heading text-accent">Welcome</CardTitle>
          <CardDescription className="font-body font-normal">
            {activeTab === 'login' 
              ? 'Sign in to access your account'
              : 'Create an account with your Bocconi email'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'login' | 'signup')}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login" className="font-body font-normal">Login</TabsTrigger>
              <TabsTrigger value="signup" className="font-body font-normal">Sign Up</TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit} className="space-y-4">
              <TabsContent value="signup" className="mt-0 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="font-body font-normal">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    disabled={isSubmitting}
                    className={errors.fullName ? 'border-destructive' : ''}
                  />
                  {errors.fullName && (
                    <p className="text-sm text-destructive">{errors.fullName}</p>
                  )}
                </div>
              </TabsContent>

              <div className="space-y-2">
                <Label htmlFor="email" className="font-body font-normal">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={activeTab === 'signup' ? 'your.name@studbocconi.it' : 'Enter your email'}
                  disabled={isSubmitting}
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
                {activeTab === 'signup' && (
                  <p className="text-xs text-muted-foreground">
                    Use your @studbocconi.it email to register
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="font-body font-normal">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    disabled={isSubmitting}
                    className={`pr-10 ${errors.password ? 'border-destructive' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
                {activeTab === 'login' && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="rememberMe" 
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(checked === true)}
                      />
                      <Label htmlFor="rememberMe" className="text-sm font-normal cursor-pointer text-muted-foreground">
                        Remember me
                      </Label>
                    </div>
                    <Link 
                      to="/reset-password" 
                      className="text-sm text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                )}
              </div>

              <Button
                type="submit" 
                className="w-full font-body text-lg px-10 py-4 mt-6"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {activeTab === 'login' ? 'Signing in...' : 'Creating account...'}
                  </>
                ) : (
                  activeTab === 'login' ? 'Sign In' : 'Create Account'
                )}
              </Button>
            </form>
          </Tabs>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default Auth;
