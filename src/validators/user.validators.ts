import { z } from "zod";
import { Role } from "@prisma/client";

export const createUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(
      /[!@#$%^&*(),.?":{}|<>]/,
      "Password must contain at least one special character"
    ),
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  role: z.nativeEnum(Role).optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  role: z.nativeEnum(Role).optional(),
  isActive: z.boolean().optional(),
});

export const userFilterSchema = z.object({
  role: z.nativeEnum(Role).optional(),
  isActive: z.enum(["true", "false"]).optional(),
  search: z.string().optional(),
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("20"),
  sort: z.string().optional(),
});

export type CreateUserDTO = z.infer<typeof createUserSchema>;
export type UpdateUserDTO = z.infer<typeof updateUserSchema>;
export type UserFilterDTO = z.infer<typeof userFilterSchema>;
