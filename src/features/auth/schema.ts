import { z } from "zod";

import { otpField, passwordField, phoneField, requiredText } from "@/lib/validation";

export const loginSchema = z.object({
  phone: phoneField,
  password: z.string().min(1, { error: "validation.required" }),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  orgName: requiredText(100),
  fullName: requiredText(100),
  phone: phoneField,
  password: passwordField,
});
export type RegisterValues = z.infer<typeof registerSchema>;

export const otpPurposeSchema = z.enum(["signup", "reset"]);
export type OtpPurpose = z.infer<typeof otpPurposeSchema>;

export const verifySchema = z.object({
  phone: phoneField,
  purpose: otpPurposeSchema,
  code: otpField,
});
export type VerifyValues = z.infer<typeof verifySchema>;

export const resetRequestSchema = z.object({ phone: phoneField });
export type ResetRequestValues = z.infer<typeof resetRequestSchema>;

export const newPasswordSchema = z
  .object({
    password: passwordField,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    error: "validation.passwordMismatch",
    path: ["confirm"],
  });
export type NewPasswordValues = z.infer<typeof newPasswordSchema>;

export const onboardingSchema = z.object({
  orgName: requiredText(100),
  fullName: requiredText(100),
  branchName: requiredText(100),
});
export type OnboardingValues = z.infer<typeof onboardingSchema>;
