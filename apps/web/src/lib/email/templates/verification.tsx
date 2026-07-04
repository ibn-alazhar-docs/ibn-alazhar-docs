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
} from "@react-email/components";

interface VerificationEmailProps {
  username?: string;
  verificationUrl: string;
  appName?: string;
}

export const VerificationEmail = ({
  username = "المستخدم",
  verificationUrl,
  appName = "Ibn Al-Azhar Docs",
}: VerificationEmailProps) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>تأكيد البريد الإلكتروني لحسابك في {appName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={box}>
          <Heading style={heading}>مرحباً {username}!</Heading>
          <Text style={paragraph}>شكراً لإنشاء حسابك في {appName}.</Text>
          <Text style={paragraph}>
            للبدء في استخدام الخدمة، يرجى تأكيد بريد الإلكتروني بالنقر على الزر أدناه:
          </Text>
          <Section style={buttonSection}>
            <Button href={verificationUrl} style={button}>
              تأكيد البريد الإلكتروني
            </Button>
          </Section>
          <Text style={paragraph}>أو انسخ هذا الرابط ولصقه في متصفحك:</Text>
          <Text style={linkText}>{verificationUrl}</Text>
          <Hr style={hr} />
          <Text style={footer}>
            هذا البريد الإلكتروني تم إرساله تلقائياً من {appName}. لا ترد على هذا البريد.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "20px 0 48px",
};

const box = {
  padding: "0 48px",
};

const heading = {
  fontSize: "24px",
  fontWeight: "bold" as const,
  color: "#1a5c3a",
  textAlign: "right" as const,
  direction: "rtl" as const,
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "26px",
  color: "#333",
  textAlign: "right" as const,
  direction: "rtl" as const,
};

const buttonSection = {
  textAlign: "center" as const,
  margin: "30px 0",
};

const button = {
  backgroundColor: "#1a5c3a",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold" as const,
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
};

const linkText = {
  fontSize: "12px",
  color: "#666",
  wordBreak: "break-all" as const,
  direction: "ltr" as const,
  textAlign: "left" as const,
};

const hr = {
  borderColor: "#e6ebf1",
  margin: "20px 0",
};

const footer = {
  fontSize: "12px",
  color: "#999",
  textAlign: "center" as const,
};
