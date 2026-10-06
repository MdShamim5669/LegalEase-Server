import nodemailer, { Transporter, SendMailOptions, SentMessageInfo } from "nodemailer";
import ejs from "ejs";
import path from "path";
import fs from "fs";
import env from "../config/env";
import logger from "../lib/logger";
import { AppError } from "../errorHelpers/AppError";
import status from "http-status";

export type TemplateName = "otp" | "invitation" | "bookingConfirmed" | "googleRedirect";

export interface IOtpEmailData {
  name?: string;
  otp: string;
  expiresInMinutes?: number;
  appName?: string;
  supportEmail?: string;
}

export interface IInvitationEmailData {
  lawyerName?: string;
  name?: string;
  email: string;
  temporaryPassword: string;
  loginUrl: string;
  appName?: string;
  supportEmail?: string;
}

export interface IBookingConfirmedEmailData {
  clientName?: string;
  lawyerName: string;
  consultationId: string;
  appointmentDate: string;
  appointmentTime: string;
  consultationType?: string;
  amount: string | number;
  meetingLink?: string;
  portalUrl?: string;
  instructions?: string;
  appName?: string;
  supportEmail?: string;
}

export interface IGoogleRedirectData {
  token?: string;
  refreshToken?: string;
  redirectUrl?: string;
  error?: string;
  appName?: string;
  user?: any;
}

export interface TemplateDataMap {
  otp: IOtpEmailData;
  invitation: IInvitationEmailData;
  bookingConfirmed: IBookingConfirmedEmailData;
  googleRedirect: IGoogleRedirectData;
}

export interface ISendEmailOptions<T extends TemplateName = TemplateName> {
  to: string | string[];
  subject: string;
  template?: T;
  data?: TemplateDataMap[T];
  html?: string;
  text?: string;
  from?: string;
}

/**
 * Resolves the absolute directory path where EJS templates are stored.
 * Handles both runtime under src/ (tsx) and dist/ (compiled).
 */
export const getTemplatesDir = (): string => {
  const candidatePaths = [
    path.resolve(__dirname, "../templates"),
    path.resolve(process.cwd(), "src/app/templates"),
    path.resolve(process.cwd(), "dist/app/templates"),
  ];

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return path.resolve(__dirname, "../templates");
};

const DEFAULT_TEMPLATE_DATA: Record<TemplateName, Record<string, any>> = {
  otp: {
    name: "Valued User",
    expiresInMinutes: 10,
    appName: "LegalEase",
    supportEmail: "support@legalease.com",
  },
  invitation: {
    lawyerName: "",
    name: "",
    appName: "LegalEase",
    supportEmail: "support@legalease.com",
  },
  bookingConfirmed: {
    clientName: "Valued Client",
    consultationType: "Standard Video Consultation (30 mins)",
    meetingLink: "",
    portalUrl: "",
    instructions: "",
    appName: "LegalEase",
    supportEmail: "support@legalease.com",
  },
  googleRedirect: {
    token: null,
    refreshToken: null,
    redirectUrl: "/",
    error: null,
    appName: "LegalEase",
    user: null,
  },
};

/**
 * Compiles and renders an EJS template to an HTML string.
 */
export const renderTemplate = async <T extends TemplateName>(
  templateName: T,
  data: TemplateDataMap[T]
): Promise<string> => {
  const templatePath = path.join(getTemplatesDir(), `${templateName}.ejs`);

  if (!fs.existsSync(templatePath)) {
    throw new AppError(
      status.INTERNAL_SERVER_ERROR,
      `Email template '${templateName}.ejs' not found at ${templatePath}`,
      "TEMPLATE_NOT_FOUND"
    );
  }

  try {
    const mergedData = {
      ...(DEFAULT_TEMPLATE_DATA[templateName] || {}),
      ...data,
      appName: (data as any)?.appName || "LegalEase",
    };
    const rendered = await ejs.renderFile(templatePath, mergedData);
    return rendered;
  } catch (err: any) {
    logger.error({ err, templateName }, "Failed to render EJS email template");
    throw new AppError(
      status.INTERNAL_SERVER_ERROR,
      `Failed to render email template '${templateName}': ${err.message}`,
      "TEMPLATE_RENDER_ERROR"
    );
  }
};

/**
 * Creates and configures the Nodemailer transporter based on active environment.
 * In 'test' mode or when dummy host is detected, uses jsonTransport to prevent socket timeouts.
 */
export const createEmailTransporter = (): Transporter => {
  if (
    env.NODE_ENV === "test" ||
    env.EMAIL_SENDER_SMTP_HOST === "smtp.example.com"
  ) {
    return nodemailer.createTransport({
      jsonTransport: true,
    });
  }

  return nodemailer.createTransport({
    host: env.EMAIL_SENDER_SMTP_HOST,
    port: env.EMAIL_SENDER_SMTP_PORT,
    secure: env.EMAIL_SENDER_SMTP_PORT === 465,
    auth: {
      user: env.EMAIL_SENDER_SMTP_USER,
      pass: env.EMAIL_SENDER_SMTP_PASS,
    },
  });
};

export const mailTransporter = createEmailTransporter();

/**
 * Dispatches an email using Nodemailer.
 * MUST be invoked outside database transactions (PRD Rule BL-3).
 */
export const sendEmail = async <T extends TemplateName>(
  options: ISendEmailOptions<T>
): Promise<SentMessageInfo> => {
  let htmlContent = options.html;

  if (options.template && options.data) {
    htmlContent = await renderTemplate(options.template, options.data);
  }

  const mailOptions: SendMailOptions = {
    from: options.from || env.EMAIL_SENDER_SMTP_FROM,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: htmlContent,
  };

  try {
    const info = await mailTransporter.sendMail(mailOptions);
    logger.info(
      { to: options.to, subject: options.subject, messageId: info.messageId },
      "Email dispatched successfully"
    );
    return info;
  } catch (error: any) {
    logger.error(
      { to: options.to, subject: options.subject, error: error.message },
      "Failed to dispatch email"
    );
    throw new AppError(
      status.BAD_GATEWAY,
      `Email delivery failed: ${error.message || "Unknown SMTP error"}`,
      "EMAIL_DELIVERY_FAILED"
    );
  }
};

export default {
  renderTemplate,
  sendEmail,
  getTemplatesDir,
};
