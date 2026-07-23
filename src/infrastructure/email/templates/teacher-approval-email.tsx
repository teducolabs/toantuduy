import { Body, Button, Container, Head, Html, Preview, Section, Text } from '@react-email/components'
import { emails } from '@/locales/vi/emails'

// Email clients won't load webfonts — the system fallback stack is what renders.
const fontFamily = "'Be Vietnam Pro', -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

const body = { backgroundColor: '#ffffff', fontFamily }
const container = { padding: '24px', maxWidth: '480px' }
const text = { fontSize: '16px', lineHeight: '24px', color: '#1f2937' }
const button = {
  backgroundColor: '#F97316',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 600,
  padding: '12px 24px',
  textDecoration: 'none',
}

export function TeacherApprovalEmail(props: { name: string; loginUrl: string }) {
  const greeting = props.name.trim() === '' ? emails.greetingFallback : emails.greeting(props.name.trim())

  return (
    <Html lang="vi">
      <Head />
      <Preview>{emails.teacherApprovalSubject}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Text style={text}>{greeting}</Text>
          <Text style={text}>{emails.teacherApprovalBody}</Text>
          <Section style={{ padding: '8px 0 16px' }}>
            <Button href={props.loginUrl} style={button}>
              {emails.teacherApprovalCta}
            </Button>
          </Section>
          <Text style={text}>
            {emails.signOff}
            <br />
            {emails.signOffTeam}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
