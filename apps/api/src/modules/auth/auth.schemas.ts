import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8)
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, {
    message: 'Password must not exceed 72 bytes.',
  });

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254).toLowerCase(),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(254).toLowerCase(),
  password: z
    .string()
    .min(1)
    .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, {
      message: 'Password must not exceed 72 bytes.',
    }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserDto {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface AuthSessionPayload {
  userId: string;
  email: string;
}
