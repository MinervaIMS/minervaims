import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Mail, User, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PendingApproval = () => {
  const { user, profile, roles, signOut, isLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect if user has a role other than 'member'
  useEffect(() => {
    if (!isLoading && roles.length > 0) {
      const hasNonMemberRole = roles.some(r => r.role !== 'member');
      if (hasNonMemberRole) {
        navigate('/');
      }
    }
  }, [roles, isLoading, navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const displayName = profile?.full_name || user?.user_metadata?.full_name || 'User';
  const displayEmail = user?.email || '';

  // If user has non-member role, don't render the page
  const hasNonMemberRole = roles.some(r => r.role !== 'member');
  if (hasNonMemberRole) {
    return null;
  }

  return (
    <div className="container py-section-sm md:py-section flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-muted p-4">
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <CardTitle className="font-serif text-heading">Approval Pending</CardTitle>
          <CardDescription className="font-body text-base mt-2">
            Your account is awaiting approval
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{displayName}</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{displayEmail}</span>
            </div>
          </div>

          <p className="text-muted-foreground font-body">
            You need approval to access the dashboard to manage events, team members, alumni network and reports uploaded. 
            Please contact the current president of the MIMS.
          </p>

          <div className="pt-4">
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="w-full"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Log Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PendingApproval;
