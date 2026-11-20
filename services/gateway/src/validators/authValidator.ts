import { z } from 'zod';

export const registerSchema = z
  .object({
    email: z.string().email('Invalid email address format.'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long.')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter.')
      .regex(/[0-9]/, 'Password must contain at least one digit.'),
    firstName: z.string().min(1, 'First name is required.').max(50),
    lastName: z.string().min(1, 'Last name is required.').max(50),
    phoneNumber: z.string().optional(),
    role: z.enum(['PATIENT', 'DOCTOR'], {
      errorMap: () => ({ message: "Role must be either 'PATIENT' or 'DOCTOR'." }),
    }),
    // Patient profile fields
    dateOfBirth: z.string().datetime().optional(),
    gender: z.string().optional(),
    bloodGroup: z.string().optional(),
    emergencyContact: z.string().optional(),
    // Doctor profile fields
    specialization: z.string().optional(),
    licenseNumber: z.string().optional(),
    consultationFee: z.number().nonnegative().optional(),
    bio: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.role === 'DOCTOR') {
        return !!data.specialization && !!data.licenseNumber;
      }
      return true;
    },
    {
      message: 'Specialization and licenseNumber are required for DOCTOR registration.',
      path: ['specialization'],
    }
  );

export const loginSchema = z.object({
  email: z.string().email('Invalid email address format.'),
  password: z.string().min(1, 'Password is required.'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required.'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
