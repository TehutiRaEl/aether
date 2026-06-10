import { Html, Head, Preview, Body, Container, Heading, Text, Button } from '@react-email/components'

interface WelcomeEmailProps {
  name: string
}

export function WelcomeEmail({ name }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to the platform</Preview>
      <Body style={{ backgroundColor: '#f6f9fc', fontFamily: 'sans-serif' }}>
        <Container style={{ backgroundColor: '#ffffff', padding: '40px', borderRadius: '8px' }}>
          <Heading style={{ color: '#0c4a6e', fontSize: '24px' }}>
            Welcome, {name}!
          </Heading>
          <Text style={{ fontSize: '16px', lineHeight: '24px', color: '#333' }}>
            Thank you for joining our waitlist. You will be among the first to know when we launch.
          </Text>
          <Button
            href={process.env.NEXT_PUBLIC_APP_URL}
            style={{
              backgroundColor: '#0ea5e9',
              color: '#ffffff',
              padding: '12px 24px',
              borderRadius: '6px',
              textDecoration: 'none',
              display: 'inline-block',
              marginTop: '16px',
            }}
          >
            Visit Platform
          </Button>
        </Container>
      </Body>
    </Html>
  )
}

export default WelcomeEmail
