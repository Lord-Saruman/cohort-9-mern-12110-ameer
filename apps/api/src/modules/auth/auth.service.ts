import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { Pool } from 'mysql2/promise';

import { AppError } from '../../common/app-error';
import { createUser, findUserByEmail } from './auth.repository';
import type {
  AuthSessionPayload,
  LoginInput,
  RegisterInput,
  UserDto,
  UserRecord,
} from './auth.schemas';

export const toUserDto = (user: UserRecord): UserDto => ({
  id: user.id,
  name: user.name,
  email: user.email,
  createdAt: user.created_at.toISOString(),
});

export const createAuthToken = (
  payload: AuthSessionPayload,
  secret: string,
  expiresIn: string,
): string =>
  jwt.sign({ ...payload, sub: payload.userId }, secret, {
    expiresIn: expiresIn as SignOptions['expiresIn'],
  });

export const verifyAuthToken = (token: string, secret: string): AuthSessionPayload => {
  try {
    const decoded = jwt.verify(token, secret);
    if (typeof decoded !== 'object' || decoded === null) {
      throw new AppError({
        statusCode: 401,
        code: 'UNAUTHENTICATED',
        message: 'Invalid authentication token payload.',
      });
    }

    const payloadObj = decoded as Record<string, unknown>;
    const userId =
      typeof payloadObj.userId === 'string'
        ? payloadObj.userId
        : typeof payloadObj.sub === 'string'
          ? payloadObj.sub
          : undefined;
    const email = typeof payloadObj.email === 'string' ? payloadObj.email : undefined;

    if (!userId || !email) {
      throw new AppError({
        statusCode: 401,
        code: 'UNAUTHENTICATED',
        message: 'Invalid authentication token payload.',
      });
    }

    return { userId, email };
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    throw new AppError({
      statusCode: 401,
      code: 'UNAUTHENTICATED',
      message: 'Authentication session is invalid or has expired.',
    });
  }
};

const isDuplicateKeyError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  ('code' in error || 'errno' in error) &&
  ((error as { code?: string }).code === 'ER_DUP_ENTRY' ||
    (error as { errno?: number }).errno === 1062);

export const registerUser = async (
  pool: Pool,
  input: RegisterInput,
  jwtSecret: string,
  jwtExpiresIn: string,
): Promise<{ user: UserDto; token: string }> => {
  const existingUser = await findUserByEmail(pool, input.email);
  if (existingUser) {
    throw new AppError({
      statusCode: 409,
      code: 'CONFLICT',
      message: 'An account with this email address already exists.',
    });
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const id = randomUUID();

  try {
    const user = await createUser(pool, {
      id,
      name: input.name,
      email: input.email,
      passwordHash,
    });

    const token = createAuthToken({ userId: user.id, email: user.email }, jwtSecret, jwtExpiresIn);
    return { user: toUserDto(user), token };
  } catch (error: unknown) {
    if (isDuplicateKeyError(error)) {
      throw new AppError({
        statusCode: 409,
        code: 'CONFLICT',
        message: 'An account with this email address already exists.',
      });
    }
    throw error;
  }
};

export const loginUser = async (
  pool: Pool,
  input: LoginInput,
  jwtSecret: string,
  jwtExpiresIn: string,
): Promise<{ user: UserDto; token: string }> => {
  const user = await findUserByEmail(pool, input.email);
  if (!user) {
    throw new AppError({
      statusCode: 401,
      code: 'UNAUTHENTICATED',
      message: 'Invalid email or password.',
    });
  }

  const isPasswordValid = await bcrypt.compare(input.password, user.password_hash);
  if (!isPasswordValid) {
    throw new AppError({
      statusCode: 401,
      code: 'UNAUTHENTICATED',
      message: 'Invalid email or password.',
    });
  }

  const token = createAuthToken({ userId: user.id, email: user.email }, jwtSecret, jwtExpiresIn);
  return { user: toUserDto(user), token };
};
