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
import { BRAND_COLORS, BRAND_NAME } from "@/ui/brand";

const APP_BASE_URL = process.env.APP_URL || "https://ibnalazhar-docs.vercel.app";

interface WelcomeEmailProps {
  username?: string;
  loginUrl?: string;
  appName?: string;
  /** Absolute URL — email clients cannot resolve relative asset paths. */
  logoUrl?: string;
}

export const WelcomeEmail = ({
  username: _username = "المستخدم",
  loginUrl = `${APP_BASE_URL}/ar/login`,
  appName = BRAND_NAME.ar,
  logoUrl = `${APP_BASE_URL}/brand/lockup-on-dark.png`,
}: WelcomeEmailProps) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>مرحباً بك في {appName}!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <img src={logoUrl} alt={appName} height={56} style={logo} />
        </Section>
        <Section style={box}>
          <Heading style={heading}>مرحباً بك في {appName}! 🎉</Heading>
          <Text style={paragraph}>أُكّد الحساب. أنت الآن جاهز لاستخدام جميع ميزات التطبيق.</Text>
          <Section style={featuresSection}>
            <Text style={featuresTitle}>ما يمكنك فعله الآن:</Text>
            <Text style={feature}>
              <span style={check}>✓</span> رفع ومعالجة المستندات بالعربية
            </Text>
            <Text style={feature}>
              <span style={check}>✓</span> البحث النصي المتقدم مع PGroonga
            </Text>
            <Text style={feature}>
              <span style={check}>✓</span> تصدير المستندات بصيغ متعددة
            </Text>
            <Text style={feature}>
              <span style={check}>✓</span> إدارة الملفات والتصنيفات
            </Text>
          </Section>
          <Section style={buttonSection}>
            <a href={loginUrl} style={button}>
              الدخول إلى التطبيق
            </a>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>أُرسل هذا البريد تلقائياً من {appName}. لا ترد على هذا البريد.</Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

const main = {
  backgroundColor: BRAND_COLORS.paper,
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "0 0 48px",
};

const header = {
  backgroundColor: BRAND_COLORS.prussian,
  padding: "24px 0",
};

const logo = {
  margin: "0 auto",
};

const box = {
  padding: "0 48px",
};

const heading = {
  fontSize: "24px",
  fontWeight: "bold" as const,
  color: BRAND_COLORS.prussian,
  textAlign: "right" as const,
  direction: "rtl" as const,
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "26px",
  color: "#12282b",
  textAlign: "right" as const,
  direction: "rtl" as const,
};

const featuresSection = {
  backgroundColor: "#fcf7ee",
  border: `1px solid #f2ddb5`,
  borderRadius: "8px",
  padding: "16px",
  margin: "20px 0",
};

const featuresTitle = {
  fontSize: "16px",
  fontWeight: "bold" as const,
  color: BRAND_COLORS.prussian,
  textAlign: "right" as const,
  direction: "rtl" as const,
  marginBottom: "8px",
};

const feature = {
  fontSize: "14px",
  lineHeight: "24px",
  color: "#12282b",
  textAlign: "right" as const,
  direction: "rtl" as const,
  margin: "4px 0",
};

const check = {
  color: BRAND_COLORS.gold,
  fontWeight: "bold" as const,
};

const buttonSection = {
  textAlign: "center" as const,
  margin: "30px 0",
};

const button = {
  backgroundColor: BRAND_COLORS.teal,
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "bold" as const,
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
};

const hr = {
  borderColor: BRAND_COLORS.gold,
  margin: "20px 0",
};

const footer = {
  fontSize: "12px",
  color: "#6f7e80",
  textAlign: "center" as const,
};
