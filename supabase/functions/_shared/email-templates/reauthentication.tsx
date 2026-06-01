/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Minerva IMS verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>MINERVA IMS</Text>
        </Section>
        <Hr style={divider} />
        <Section style={content}>
          <Heading style={h1}>Confirm reauthentication</Heading>
          <Text style={text}>Use the verification code below to confirm your identity:</Text>
          <Section style={codeBox}>
            <Text style={codeStyle}>{token}</Text>
          </Section>
          <Text style={footer}>
            This code will expire shortly. If you did not request this, you can
            safely ignore this email.
          </Text>
        </Section>
        <Hr style={divider} />
        <Section style={footerSection}>
          <Text style={footerBrand}>Minerva Investment Management Society</Text>
          <Text style={footerMuted}>Via Röntgen 1, 20136 Milano, Italy</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'Calibri', 'Helvetica Neue', Arial, sans-serif",
}
const container = {
  margin: '40px auto',
  maxWidth: '560px',
  border: '1px solid #e0e0e0',
  backgroundColor: '#ffffff',
}
const header = { padding: '32px 40px 16px', textAlign: 'center' as const }
const brand = {
  fontFamily: "'EB Garamond', Georgia, serif",
  color: '#1F0F4D',
  fontSize: '14px',
  fontWeight: 600,
  letterSpacing: '3px',
  margin: 0,
}
const divider = { borderColor: '#e0e0e0', margin: '0 40px' }
const content = { padding: '28px 40px' }
const h1 = {
  fontFamily: "'EB Garamond', Georgia, serif",
  fontSize: '28px',
  fontWeight: 400,
  color: '#141414',
  margin: '0 0 20px',
  letterSpacing: '-0.5px',
}
const text = {
  fontSize: '15px',
  color: '#141414',
  lineHeight: '1.7',
  margin: '0 0 18px',
}
const codeBox = {
  backgroundColor: '#fafafa',
  border: '1px solid #e0e0e0',
  padding: '20px',
  textAlign: 'center' as const,
  margin: '20px 0',
}
const codeStyle = {
  fontFamily: "'SF Mono', Monaco, 'Courier New', monospace",
  fontSize: '28px',
  fontWeight: 500,
  color: '#1F0F4D',
  letterSpacing: '6px',
  margin: 0,
}
const footer = { fontSize: '12px', color: '#737373', margin: '24px 0 0', lineHeight: '1.6' }
const footerSection = { padding: '24px 40px 32px', textAlign: 'center' as const }
const footerBrand = {
  fontFamily: "'EB Garamond', Georgia, serif",
  color: '#141414',
  fontSize: '13px',
  fontWeight: 500,
  margin: '0 0 4px',
}
const footerMuted = { color: '#737373', fontSize: '11px', margin: 0 }
