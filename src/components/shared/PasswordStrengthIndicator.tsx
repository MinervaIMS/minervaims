import { useMemo } from 'react';
import { Check, X } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface PasswordStrengthIndicatorProps {
  password: string;
}

interface Requirement {
  label: string;
  met: boolean;
}

export const PasswordStrengthIndicator = ({ password }: PasswordStrengthIndicatorProps) => {
  const requirements: Requirement[] = useMemo(() => [
    { label: 'At least 6 characters', met: password.length >= 6 },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Contains lowercase letter', met: /[a-z]/.test(password) },
    { label: 'Contains number', met: /\d/.test(password) },
    { label: 'Contains special character', met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ], [password]);

  const strength = useMemo(() => {
    const metCount = requirements.filter(r => r.met).length;
    return Math.round((metCount / requirements.length) * 100);
  }, [requirements]);

  const strengthLabel = useMemo(() => {
    if (strength === 0) return { text: '', color: '' };
    if (strength <= 20) return { text: 'Very Weak', color: 'text-destructive' };
    if (strength <= 40) return { text: 'Weak', color: 'text-destructive' };
    if (strength <= 60) return { text: 'Fair', color: 'text-amber-500' };
    if (strength <= 80) return { text: 'Good', color: 'text-primary' };
    return { text: 'Strong', color: 'text-green-600' };
  }, [strength]);

  const progressColor = useMemo(() => {
    if (strength <= 20) return 'bg-destructive';
    if (strength <= 40) return 'bg-destructive';
    if (strength <= 60) return 'bg-amber-500';
    if (strength <= 80) return 'bg-primary';
    return 'bg-green-600';
  }, [strength]);

  if (!password) return null;

  return (
    <div className="space-y-3 mt-2">
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-body text-muted-foreground">Password strength</span>
          <span className={`font-body font-medium ${strengthLabel.color}`}>
            {strengthLabel.text}
          </span>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${progressColor}`}
            style={{ width: `${strength}%` }}
          />
        </div>
      </div>
      
      <ul className="space-y-1">
        {requirements.map((req, idx) => (
          <li key={idx} className="flex items-center gap-2 text-xs">
            {req.met ? (
              <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
            ) : (
              <X className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            )}
            <span className={`font-body ${req.met ? 'text-foreground' : 'text-muted-foreground'}`}>
              {req.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
