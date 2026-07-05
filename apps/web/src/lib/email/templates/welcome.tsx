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
} from "@react-email/components";

interface WelcomeEmailProps {
  username?: string;
  loginUrl?: string;
  appName?: string;
}

export const WelcomeEmail = ({
  username: _username = "المستخدم",
  loginUrl = "https://ibnalazhar-docs.vercel.app/ar/login",
  appName = "Ibn Al-Azhar Docs",
}: WelcomeEmailProps) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>مرحباً بك في {appName}!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={box}>
          <Heading style={heading}>مرحباً بك في {appName}! 🎉</Heading>
          <Text style={paragraph}>
            تم تأكيد حسابك بنجاح. أنت الآن جاهز لاستخدام جميع ميزات التطبيق.
          </Text>
          <Section style={featuresSection}>
            <Text style={featuresTitle}>ما يمكنك فعله الآن:</Text>
            <Text style={feature}>✓ رفع ومعالجة المستندات بالعربية</Text>
            <Text style={feature}>✓ البحث النصي المتقدم مع PGroonga</Text>
            <Text style={feature}>✓ تصدير المستندات بصيغ متعددة</Text>
            <Text style={feature}>✓ إدارة الملفات والتصنيفات</Text>
          </Section>
          <Section style={buttonSection}>
            <a href={loginUrl} style={button}>
              الدخول إلى التطبيق
            </a>
          </Section>
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

const featuresSection = {
  backgroundColor: "#f0fdf4",
  borderRadius: "8px",
  padding: "16px",
  margin: "20px 0",
};

const featuresTitle = {
  fontSize: "16px",
  fontWeight: "bold" as const,
  color: "#1a5c3a",
  textAlign: "right" as const,
  direction: "rtl" as const,
  marginBottom: "8px",
};

const feature = {
  fontSize: "14px",
  lineHeight: "24px",
  color: "#333",
  textAlign: "right" as const,
  direction: "rtl" as const,
  margin: "4px 0",
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

const hr = {
  borderColor: "#e6ebf1",
  margin: "20px 0",
};

const footer = {
  fontSize: "12px",
  color: "#999",
  textAlign: "center" as const,
};
