import { prisma } from "../utils/prisma";
import { hashPassword } from "../utils/password";
import { AppError } from "../middleware/errorHandler.middleware";
import { Role, Prisma } from "@prisma/client";

interface CreateUserData {
  email: string;
  password: string;
  name?: string;
  role?: Role;
}

interface UpdateUserData {
  name?: string;
  role?: Role;
  isActive?: boolean;
}

interface UserFilters {
  role?: Role;
  isActive?: boolean;
  search?: string;
}

interface PaginationParams {
  page: number;
  limit: number;
  sort?: string;
}

export class UserService {
  /**
   * Create a new user (ADMIN only)
   */
  async createUser(data: CreateUserData) {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new AppError(
        409,
        "USER_EXISTS",
        "User with this email already exists"
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(data.password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: data.role || "AGENT",
      },
    });

    return this.sanitizeUser(user);
  }

  /**
   * Get users with filters and pagination
   */
  async getUsers(filters: UserFilters, pagination: PaginationParams) {
    const { page, limit, sort } = pagination;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.UserWhereInput = {};

    if (filters.role) {
      where.role = filters.role;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search, mode: "insensitive" } },
        { name: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    // Get total count
    const total = await prisma.user.count({ where });

    // Get users
    const users = await prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: this.parseSort(sort),
    });

    return {
      items: users.map(this.sanitizeUser),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(404, "USER_NOT_FOUND", "User not found");
    }

    return this.sanitizeUser(user);
  }

  /**
   * Update user
   */
  async updateUser(userId: string, data: UpdateUserData) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(404, "USER_NOT_FOUND", "User not found");
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
    });

    return this.sanitizeUser(updated);
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(404, "USER_NOT_FOUND", "User not found");
    }

    await prisma.user.delete({
      where: { id: userId },
    });
  }

  /**
   * Toggle user status
   */
  async toggleUserStatus(userId: string, isActive: boolean) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(404, "USER_NOT_FOUND", "User not found");
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
    });

    return this.sanitizeUser(updated);
  }

  /**
   * Parse sort parameter
   */
  private parseSort(sort?: string): Prisma.UserOrderByWithRelationInput {
    if (!sort) {
      return { createdAt: "desc" };
    }

    const [field, order] = sort.split(":");
    return { [field]: order === "asc" ? "asc" : "desc" };
  }

  /**
   * Remove sensitive data from user object
   */
  private sanitizeUser(user: any) {
    const { password, ...sanitized } = user;
    return {
      ...sanitized,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}

export const userService = new UserService();
