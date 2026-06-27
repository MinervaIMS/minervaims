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
      <AlertDialogContent className="max-w-md">
        <div className="flex flex-col items-center text-center">
          <Clock className="h-8 w-8 mb-4" style={{ color: AUTH_TOKENS.NAVY }} />
          <h2
            className="font-serif mb-3"
            style={{ fontSize: '24px', color: AUTH_TOKENS.INK, fontWeight: 400 }}
          >
            Session Expiring Soon
          </h2>
          <p
            className="font-body mb-2"
            style={{ fontSize: '14px', color: AUTH_TOKENS.MUTED }}
          >
            Your session will expire in{' '}
            <span style={{ color: AUTH_TOKENS.INK }}>{formatTime(countdown)}</span>.
          </p>
          <p
            className="font-body mb-6"
            style={{ fontSize: '14px', color: AUTH_TOKENS.MUTED }}
          >
            Would you like to extend your session or log out?
          </p>
          <div className="w-full space-y-3">
            <AuthButton variant="primary" onClick={handleLogout}>
              Log Out
            </AuthButton>
            <AuthButton variant="outline" onClick={handleExtendSession}>
              Extend Session
            </AuthButton>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};
