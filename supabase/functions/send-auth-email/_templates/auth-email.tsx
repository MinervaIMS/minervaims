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
  Hr,
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
    if (isSignUp) return 'Welcome to Minerva Investment Management Society';
    if (isPasswordReset) return 'Reset Your MIMS Account Password';
    if (isMagicLink) return 'Your Secure Login Link - MIMS';
    return 'MIMS Account Verification';
  };

  const getHeading = () => {
    if (isSignUp) return 'Welcome to MIMS';
    if (isPasswordReset) return 'Password Reset Request';
    if (isMagicLink) return 'Secure Login';
    return 'Account Verification';
  };

  const getDescription = () => {
    if (isSignUp) {
      return 'Thank you for joining Minerva Investment Management Society, Bocconi University\'s premier student-led investment fund. Your membership gives you access to our exclusive research, events, and networking opportunities with finance professionals.';
    }
    if (isPasswordReset) {
      return 'We received a request to reset your MIMS account password. Click the button below to create a new secure password and regain access to your account.';
    }
    if (isMagicLink) {
      return 'Use the secure link below to access your MIMS member portal. This link will expire shortly for your security.';
    }
    return 'Please verify your email address to continue accessing your MIMS account.';
  };

  const getSecondaryDescription = () => {
    if (isSignUp) {
      return 'Please confirm your email address to complete your registration and unlock full access to our member resources, including market analyses, investment reports, and upcoming events.';
    }
    return null;
  };

  const getButtonText = () => {
    if (isSignUp) return 'Confirm My Email';
    if (isPasswordReset) return 'Reset Password';
    if (isMagicLink) return 'Access My Account';
    return 'Verify Email';
  };

  return (
    <Html>
      <Head />
      <Preview>{getSubject()}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header with Logo */}
          <Section style={headerSection}>
            <Img
              src="https://asjudzdgsccacpjbzsue.supabase.co/storage/v1/object/public/archive-files/mims-logo.png"
              width="72"
              height="72"
              alt="Minerva IMS"
              style={logo}
            />
            <Text style={brandName}>MINERVA IMS</Text>
          </Section>

          {/* Divider */}
          <Hr style={dividerTop} />

          {/* Main Content */}
          <Section style={contentSection}>
            <Heading style={h1}>{getHeading()}</Heading>
            
            <Text style={text}>
              {getDescription()}
            </Text>

            {getSecondaryDescription() && (
              <Text style={text}>
                {getSecondaryDescription()}
              </Text>
            )}

            {/* CTA Button */}
            <Section style={buttonSection}>
              <Link href={confirmationUrl} style={button}>
                {getButtonText()}
              </Link>
            </Section>

            {/* OTP Code */}
            {token && (
              <Section style={codeSection}>
                <Text style={codeLabel}>
                  Alternatively, enter this verification code:
                </Text>
                <code style={code}>{token}</code>
              </Section>
            )}
          </Section>

          {/* Divider */}
          <Hr style={dividerBottom} />

          {/* Footer */}
          <Section style={footerSection}>
            <Text style={footerBrand}>
              Minerva Investment Management Society
            </Text>
            <Text style={footerTagline}>
              Bocconi University's Premier Student Investment Fund
            </Text>
            <Text style={footerLocation}>
              Via Röntgen 1, 20136 Milano, Italy
            </Text>
            
            <Hr style={footerDivider} />
            
            <Text style={footerDisclaimer}>
              If you did not create an account with MIMS, please disregard this email. 
              This is an automated message—please do not reply directly to this email.
            </Text>
            
            <Text style={footerCopyright}>
              © {new Date().getFullYear()} Minerva Investment Management Society. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default AuthEmail

// Design tokens matching MIMS website
const primaryColor = '#1F0F4D'; // Deep navy (hsl 252 68% 18%)
const textColor = '#141414'; // Near black (hsl 0 0% 8%)
const mutedTextColor = '#737373'; // Muted (hsl 0 0% 45%)
const borderColor = '#E0E0E0'; // Light border
const backgroundColor = '#FFFFFF';

const main = {
  backgroundColor: '#F5F5F5',
  fontFamily: "'Calibri', 'Helvetica Neue', Arial, sans-serif",
}

const container = {
  margin: '40px auto',
  padding: '0',
  maxWidth: '560px',
  backgroundColor: backgroundColor,
  border: `1px solid ${borderColor}`,
}

const headerSection = {
  textAlign: 'center' as const,
  padding: '40px 40px 24px',
}

const logo = {
  margin: '0 auto 16px',
}

const brandName = {
  color: primaryColor,
  fontSize: '13px',
  fontWeight: '600',
  letterSpacing: '3px',
  margin: '0',
  fontFamily: "'EB Garamond', Georgia, serif",
}

const dividerTop = {
  borderColor: borderColor,
  margin: '0 40px',
}

const contentSection = {
  padding: '32px 40px',
}

const h1 = {
  color: textColor,
  fontSize: '28px',
  fontWeight: '400',
  letterSpacing: '-0.5px',
  lineHeight: '1.2',
  margin: '0 0 24px',
  padding: '0',
  textAlign: 'left' as const,
  fontFamily: "'EB Garamond', Georgia, serif",
}

const text = {
  color: textColor,
  fontSize: '15px',
  lineHeight: '1.7',
  margin: '0 0 20px',
  textAlign: 'left' as const,
}

const buttonSection = {
  textAlign: 'left' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: primaryColor,
  border: 'none',
  color: '#FFFFFF',
  display: 'inline-block',
  fontSize: '13px',
  fontWeight: '500',
  letterSpacing: '1.5px',
  padding: '16px 32px',
  textDecoration: 'none',
  textTransform: 'uppercase' as const,
  fontFamily: "'Calibri', 'Helvetica Neue', Arial, sans-serif",
}

const codeSection = {
  textAlign: 'center' as const,
  margin: '24px 0 0',
  padding: '24px',
  backgroundColor: '#FAFAFA',
  border: `1px solid ${borderColor}`,
}

const codeLabel = {
  color: mutedTextColor,
  fontSize: '13px',
  margin: '0 0 12px',
  textAlign: 'center' as const,
}

const code = {
  display: 'block',
  color: primaryColor,
  fontSize: '28px',
  letterSpacing: '6px',
  fontFamily: "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Mono', monospace",
  fontWeight: '500',
}

const dividerBottom = {
  borderColor: borderColor,
  margin: '0 40px',
}

const footerSection = {
  padding: '32px 40px',
  textAlign: 'center' as const,
}

const footerBrand = {
  color: textColor,
  fontSize: '14px',
  fontWeight: '500',
  margin: '0 0 4px',
  fontFamily: "'EB Garamond', Georgia, serif",
}

const footerTagline = {
  color: mutedTextColor,
  fontSize: '12px',
  fontStyle: 'italic' as const,
  margin: '0 0 4px',
}

const footerLocation = {
  color: mutedTextColor,
  fontSize: '12px',
  margin: '0',
}

const footerDivider = {
  borderColor: borderColor,
  margin: '20px 0',
}

const footerDisclaimer = {
  color: mutedTextColor,
  fontSize: '11px',
  lineHeight: '1.6',
  margin: '0 0 12px',
}

const footerCopyright = {
  color: mutedTextColor,
  fontSize: '11px',
  margin: '0',
}
