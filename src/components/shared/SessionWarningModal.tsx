import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { Clock } from 'lucide-react';
import { AuthButton, AUTH_TOKENS } from '@/components/shared/AuthUI';

interface SessionWarningModalProps {
  warningThresholdMinutes?: number;
}

export const SessionWarningModal = ({ warningThresholdMinutes = 2 }: SessionWarningModalProps) => {
  const { session, refreshSession, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!session?.expires_at) return;

    const checkExpiry = () => {
      const expiresAt = session.expires_at * 1000;
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;
      const warningThreshold = warningThresholdMinutes * 60 * 1000;

      if (timeUntilExpiry <= warningThreshold && timeUntilExpiry > 0) {
        setIsOpen(true);
        setCountdown(Math.ceil(timeUntilExpiry / 1000));
      } else if (timeUntilExpiry <= 0) {
        setIsOpen(false);
        signOut();
      }
    };

    // Check immediately
    checkExpiry();

    // Check every second when modal might be needed
    const intervalId = setInterval(checkExpiry, 1000);

    return () => clearInterval(intervalId);
  }, [session, warningThresholdMinutes, signOut]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || countdown <= 0) return;

    const timerId = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setIsOpen(false);
          signOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [isOpen, signOut]);

  const handleExtendSession = async () => {
    const success = await refreshSession();
    if (success) {
      setIsOpen(false);
    }
  };

  const handleLogout = async () => {
    setIsOpen(false);
    await signOut();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-warning" />
            Session Expiring Soon
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>Your session will expire in <span className="font-semibold text-foreground">{formatTime(countdown)}</span>.</p>
            <p>Would you like to extend your session or log out?</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleLogout}>Log Out</AlertDialogCancel>
          <AlertDialogAction onClick={handleExtendSession}>
            Extend Session
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
