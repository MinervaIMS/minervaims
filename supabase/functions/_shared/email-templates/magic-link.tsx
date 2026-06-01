/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your secure login link for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>MINERVA IMS</Text>
        </Section>
        <Hr style={divider} />
        <Section style={content}>
          <Heading style={h1}>Your login link</Heading>
          <Text style={text}>
            Use the secure link below to access your {siteName} account. This
            link will expire shortly for your security.
          </Text>
          <Section style={buttonWrap}>
            <Button style={button} href={confirmationUrl}>
              Access My Account
            </Button>
          </Section>
          <Text style={footer}>
            If you did not request this link, you can safely ignore this email.
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

export default MagicLinkEmail

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
const buttonWrap = { margin: '28px 0' }
const button = {
  backgroundColor: '#1F0F4D',
  color: '#ffffff',
  fontSize: '13px',
  fontWeight: 500,
  letterSpacing: '1.5px',
  textTransform: 'uppercase' as const,
  borderRadius: '0',
  padding: '16px 32px',
  textDecoration: 'none',
  display: 'inline-block',
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
