import { Body, Container, Head, Html, Preview, Text } from '@react-email/components'
import { emails } from '@/locales/vi/emails'

// Email clients won't load webfonts — the system fallback stack is what renders.
const fontFamily = "'Be Vietnam Pro', -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

const body = { backgroundColor: '#ffffff', fontFamily }
const container = { padding: '24px', maxWidth: '480px' }
const text = { fontSize: '16px', lineHeight: '24px', color: '#1f2937' }

export function TeacherRejectionEmail(props: { name: string; reason: string }) {
  const greeting = props.name.trim() === '' ? emails.greetingFallback : emails.greeting(props.name.trim())

  return (
    <Html lang="vi">
      <Head />
      <Preview>{emails.teacherRejectionSubject}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Text style={text}>{greeting}</Text>
          <Text style={text}>{emails.teacherRejectionBody}</Text>
          {props.reason.trim() !== '' && <Text style={text}>{emails.teacherRejectionReason(props.reason)}</Text>}
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
