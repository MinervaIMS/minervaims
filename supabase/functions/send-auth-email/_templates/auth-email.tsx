import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'https://esm.sh/@react-email/components@0.0.22'
import * as React from 'https://esm.sh/react@18.3.1'

interface AuthEmailProps {
  supabase_url: string
  email_action_type: string
  redirect_to: string
  token_hash: string
  token: string
}

export const AuthEmail = ({
  token,
  supabase_url,
  email_action_type,
  redirect_to,
  token_hash,
}: AuthEmailProps) => {
  const confirmationUrl = `${supabase_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`;
  
  const isSignUp = email_action_type === 'signup' || email_action_type === 'email';
  const isPasswordReset = email_action_type === 'recovery';
  const isMagicLink = email_action_type === 'magiclink';

  const getSubject = () => {
    if (isSignUp) return 'Confirm your MIMS membership';
    if (isPasswordReset) return 'Reset your MIMS password';
    if (isMagicLink) return 'Your MIMS login link';
    return 'MIMS Authentication';
  };

  const getHeading = () => {
    if (isSignUp) return 'Welcome to Minerva IMS';
    if (isPasswordReset) return 'Reset Your Password';
    if (isMagicLink) return 'Login to MIMS';
    return 'Authentication Required';
  };

  const getDescription = () => {
    if (isSignUp) {
      return 'Thank you for registering with Minerva Investment Management Society. Please confirm your email address to complete your registration and join our community of finance enthusiasts.';
    }
    if (isPasswordReset) {
      return 'We received a request to reset your password. Click the button below to choose a new password.';
    }
    if (isMagicLink) {
      return 'Use the link below to securely log in to your MIMS account.';
    }
    return 'Please click the button below to continue.';
  };

  const getButtonText = () => {
    if (isSignUp) return 'Confirm Email';
    if (isPasswordReset) return 'Reset Password';
    if (isMagicLink) return 'Log In';
    return 'Continue';
  };

  return (
    <Html>
      <Head />
      <Preview>{getSubject()}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Logo */}
          <Section style={logoSection}>
            <Img
              src="https://asjudzdgsccacpjbzsue.supabase.co/storage/v1/object/public/archive-files/mims-logo.png"
              width="80"
              height="80"
              alt="Minerva IMS"
              style={logo}
            />
          </Section>

          {/* Header */}
          <Heading style={h1}>{getHeading()}</Heading>

          {/* Description */}
          <Text style={text}>
            {getDescription()}
          </Text>

          {/* CTA Button */}
          <Section style={buttonSection}>
            <Link href={confirmationUrl} style={button}>
              {getButtonText()}
            </Link>
          </Section>

          {/* OTP Code */}
          {token && (
            <>
              <Text style={textSmall}>
                Or use this verification code:
              </Text>
              <code style={code}>{token}</code>
            </>
          )}

          {/* Divider */}
          <Section style={divider} />

          {/* Footer */}
          <Text style={footer}>
            Minerva Investment Management Society
          </Text>
          <Text style={footerSmall}>
            Bocconi University, Milan
          </Text>
          <Text style={footerSmall}>
            If you didn't request this email, you can safely ignore it.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default AuthEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'Times New Roman', Georgia, serif",
}

const container = {
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '560px',
}

const logoSection = {
  textAlign: 'center' as const,
  marginBottom: '32px',
}

const logo = {
  margin: '0 auto',
}

const h1 = {
  color: '#1a1a1a',
  fontSize: '28px',
  fontWeight: '400',
  letterSpacing: '-0.5px',
  lineHeight: '1.3',
  margin: '0 0 24px',
  padding: '0',
  textAlign: 'center' as const,
  fontFamily: "'Times New Roman', Georgia, serif",
}

const text = {
  color: '#4a4a4a',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 24px',
  fontFamily: "Calibri, Arial, sans-serif",
}

const textSmall = {
  color: '#6a6a6a',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '24px 0 8px',
  textAlign: 'center' as const,
  fontFamily: "Calibri, Arial, sans-serif",
}

const buttonSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#1a1a1a',
  border: '1px solid #1a1a1a',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: '400',
  letterSpacing: '1px',
  padding: '16px 40px',
  textDecoration: 'none',
  textTransform: 'uppercase' as const,
  fontFamily: "'Times New Roman', Georgia, serif",
}

const code = {
  display: 'block',
  textAlign: 'center' as const,
  padding: '16px',
  margin: '0 auto',
  backgroundColor: '#f5f5f5',
  border: '1px solid #e0e0e0',
  color: '#1a1a1a',
  fontSize: '24px',
  letterSpacing: '4px',
  fontFamily: "monospace",
}

const divider = {
  borderTop: '1px solid #e0e0e0',
  margin: '40px 0 24px',
}

const footer = {
  color: '#1a1a1a',
  fontSize: '14px',
  margin: '0',
  textAlign: 'center' as const,
  fontFamily: "'Times New Roman', Georgia, serif",
}

const footerSmall = {
  color: '#8a8a8a',
  fontSize: '12px',
  margin: '8px 0 0',
  textAlign: 'center' as const,
  fontFamily: "Calibri, Arial, sans-serif",
}
