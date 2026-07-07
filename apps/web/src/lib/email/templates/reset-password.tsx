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

interface ResetPasswordEmailProps {
  username?: string;
  resetUrl: string;
  appName?: string;
}

export const ResetPasswordEmail = ({
  username = "المستخدم",
  resetUrl,
  appName = "Ibn Al-Azhar Docs",
}: ResetPasswordEmailProps) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>إعادة تعيين كلمة المرور لحسابك في {appName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={box}>
          <Heading style={heading}>مرحباً {username}!</Heading>
          <Text style={paragraph}>تلقينا طلباً لإعادة تعيين كلمة المرور لحسابك.</Text>
          <Text style={paragraph}>
            اضغط على الزر أدناه لإعادة تعيين كلمة المرور. ستُوجّه إلى صفحة آمنة لإدخال كلمة المرور
            الجديدة.
          </Text>
          <Section style={buttonSection}>
            <Button href={resetUrl} style={button}>
              إعادة تعيين كلمة المرور
            </Button>
          </Section>
          <Text style={paragraph}>أو انسخ هذا الرابط ولصقه في متصفحك:</Text>
          <Text style={linkText}>{resetUrl}</Text>
          <Text style={warning}>
            ⚠️ إذا لم تطلب إعادة تعيين كلمة المرور، تجاهل هذا البريد الإلكتروني. لن يتم تغيير كلمة
            المرور إلا إذا نقرت على الزر أعلاه.
          </Text>
          <Hr style={hr} />
          <Text style={footer}>أُرسل هذا البريد تلقائياً من {appName}. لا ترد على هذا البريد.</Text>
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
  backgroundColor: "#dc2626",
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

const warning = {
  fontSize: "14px",
  color: "#dc2626",
  textAlign: "right" as const,
  direction: "rtl" as const,
  marginTop: "20px",
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
