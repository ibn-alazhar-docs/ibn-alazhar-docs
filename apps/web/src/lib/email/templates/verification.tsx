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
import { BRAND_COLORS, BRAND_NAME } from "@/ui/brand";

const APP_BASE_URL = process.env.APP_URL || "https://ibnalazhar-docs.vercel.app";

interface VerificationEmailProps {
  username?: string;
  verificationUrl: string;
  appName?: string;
  /** Absolute URL — email clients cannot resolve relative asset paths. */
  logoUrl?: string;
}

export const VerificationEmail = ({
  username = "المستخدم",
  verificationUrl,
  appName = BRAND_NAME.ar,
  logoUrl = `${APP_BASE_URL}/brand/lockup-on-dark.png`,
}: VerificationEmailProps) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>تأكيد البريد الإلكتروني لحسابك في {appName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <img src={logoUrl} alt={appName} height={56} style={logo} />
        </Section>
        <Section style={box}>
          <Heading style={heading}>مرحباً {username}!</Heading>
          <Text style={paragraph}>شكراً لإنشاء حسابك في {appName}.</Text>
          <Text style={paragraph}>
            للبدء في استخدام الخدمة، أكّد بريدك الإلكتروني بالنقر على الزر أدناه:
          </Text>
          <Section style={buttonSection}>
            <Button href={verificationUrl} style={button}>
              تأكيد البريد الإلكتروني
            </Button>
          </Section>
          <Text style={paragraph}>أو انسخ هذا الرابط ولصقه في متصفحك:</Text>
          <Text style={linkText}>{verificationUrl}</Text>
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

const linkText = {
  fontSize: "12px",
  color: "#4b5c5e",
  wordBreak: "break-all" as const,
  direction: "ltr" as const,
  textAlign: "left" as const,
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
