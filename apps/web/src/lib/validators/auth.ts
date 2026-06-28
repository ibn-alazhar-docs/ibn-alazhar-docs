import { z } from "zod";
import { ROLE } from "@/domain/auth";

export const loginSchema = z
  .object({
    email: z.string().min(1, "البريد الإلكتروني مطلوب").email("البريد الإلكتروني غير صالح"),
    password: z
      .string()
      .min(1, "كلمة المرور مطلوبة")
      .min(8, "يجب أن تكون كلمة المرور 8 أحرف على الأقل"),
  })
  .strip();

export const registerSchema = z
  .object({
    name: z
      .string()
      .min(1, "الاسم مطلوب")
      .min(2, "يجب أن يكون الاسم حرفين على الأقل")
      .max(100, "الاسم طويل جداً"),
    email: z.string().min(1, "البريد الإلكتروني مطلوب").email("البريد الإلكتروني غير صالح"),
    password: z
      .string()
      .min(1, "كلمة المرور مطلوبة")
      .min(8, "يجب أن تكون كلمة المرور 8 أحرف على الأقل")
      .max(128, "كلمة المرور طويلة جداً")
      .regex(/[A-Z]/, "يجب أن تحتوي كلمة المرور على حرف كبير واحد على الأقل")
      .regex(/[a-z]/, "يجب أن تحتوي كلمة المرور على حرف صغير واحد على الأقل")
      .regex(/[0-9]/, "يجب أن تحتوي كلمة المرور على رقم واحد على الأقل"),
    confirmPassword: z.string().min(1, "تأكيد كلمة المرور مطلوب"),
  })
  .strip()
  .refine((data) => data.password === data.confirmPassword, {
    message: "كلمتا المرور غير متطابقتين",
    path: ["confirmPassword"],
  });

export const profileUpdateSchema = z
  .object({
    name: z
      .string()
      .min(1, "الاسم مطلوب")
      .min(2, "يجب أن يكون الاسم حرفين على الأقل")
      .max(100, "الاسم طويل جداً")
      .transform((v) => v.trim()),
  })
  .strip();

export const adminUserUpdateSchema = z
  .object({
    userId: z.string().min(1, "معرف المستخدم مطلوب"),
    role: z.enum(Object.values(ROLE) as [string, ...string[]], {
      message: "دور المستخدم غير صالح",
    }),
  })
  .strip();

export const adminUserDeleteSchema = z
  .object({
    userId: z.string().min(1, "معرف المستخدم مطلوب"),
  })
  .strip();

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type AdminUserUpdateInput = z.infer<typeof adminUserUpdateSchema>;
export type AdminUserDeleteInput = z.infer<typeof adminUserDeleteSchema>;
