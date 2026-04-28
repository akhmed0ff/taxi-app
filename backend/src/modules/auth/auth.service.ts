import { JwtService } from '@nestjs/jwt';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Buffer } from 'node:buffer';
import { promisify } from 'node:util';
import { randomBytes, createHash, pbkdf2, timingSafeEqual } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { UserRole, UserRoleValue } from '../../common/roles';
import { PrismaService } from '../../infrastructure/db/prisma.service';
import { DevLoginDto } from './dto/dev-login.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';

const pbkdf2Async = promisify(pbkdf2);
const BCRYPT_SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly config?: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });

    if (existingUser) {
      throw new ConflictException('User with this phone already exists');
    }

    const role = dto.role as UserRole;
    const passwordHash = await this.hashPassword(dto.password);
    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        name: dto.name,
        passwordHash,
        role,
      },
    });
    const driver = await this.ensureDriverProfile(
      user.id,
      user.role as UserRole,
    );
    const tokens = await this.issueTokens({
      id: user.id,
      role: user.role as UserRole,
    });

    return {
      user: this.toPublicUser(user),
      driver,
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });

    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid phone or password');
    }

    const validPassword = await this.verifyPassword(
      dto.password,
      user.passwordHash,
    );

    if (!validPassword) {
      throw new UnauthorizedException('Invalid phone or password');
    }

    const driver = await this.ensureDriverProfile(
      user.id,
      user.role as UserRole,
    );
    const tokens = await this.issueTokens({
      id: user.id,
      role: user.role as UserRole,
    });

    return {
      user: this.toPublicUser(user),
      driver,
      ...tokens,
    };
  }

  async refresh(dto: RefreshTokenDto) {
    const tokenHash = this.hashToken(dto.refreshToken);
    const storedToken = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revoked: false,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true },
    });

    const driver = await this.ensureDriverProfile(
      storedToken.user.id,
      storedToken.user.role as UserRole,
    );
    const tokens = await this.issueTokens({
      id: storedToken.user.id,
      role: storedToken.user.role as UserRole,
    });

    return {
      user: this.toPublicUser(storedToken.user),
      driver,
      ...tokens,
    };
  }

  async logout(dto: RefreshTokenDto) {
    await this.prisma.refreshToken.updateMany({
      where: {
        tokenHash: this.hashToken(dto.refreshToken),
        revoked: false,
      },
      data: { revoked: true },
    });

    return { ok: true };
  }

  async issueTokens(user: { id: string; role: UserRole }) {
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      userId: user.id,
      role: user.role,
    });
    const refreshToken = randomBytes(48).toString('hex');

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async devLogin(dto: DevLoginDto) {
    // dev-login is intended only for local development and test builds.
    const isProduction =
      this.config?.get<string>('NODE_ENV') === 'production' ||
      process.env.NODE_ENV === 'production';
    const devLoginEnabled =
      this.config?.get<string>('ENABLE_DEV_LOGIN') === 'true' ||
      process.env.ENABLE_DEV_LOGIN === 'true';

    if (isProduction || !devLoginEnabled) {
      throw new ForbiddenException('dev-login is disabled');
    }

    const user = await this.prisma.user.upsert({
      where: { phone: dto.phone },
      update: {
        name: dto.name,
        role: dto.role,
      },
      create: {
        phone: dto.phone,
        name: dto.name,
        role: dto.role,
      },
    });
    const driver = await this.ensureDriverProfile(
      user.id,
      user.role as UserRole,
    );
    const tokens = await this.issueTokens({
      id: user.id,
      role: user.role as UserRole,
    });

    return {
      developmentOnly: true,
      warning: 'auth/dev-login is for local development and test builds only',
      user: this.toPublicUser(user),
      driver,
      ...tokens,
    };
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async ensureDriverProfile(userId: string, role: UserRole) {
    if (role !== UserRoleValue.DRIVER) {
      return undefined;
    }

    return this.prisma.driver.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  private async hashPassword(password: string) {
    return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  }

  private async verifyPassword(password: string, passwordHash: string) {
    if (passwordHash.startsWith('$2')) {
      return bcrypt.compare(password, passwordHash);
    }

    const [scheme, digest, iterations, salt, key] = passwordHash.split('$');

    if (scheme !== 'pbkdf2' || !digest || !iterations || !salt || !key) {
      return false;
    }

    const derivedKey = await pbkdf2Async(
      password,
      salt,
      Number(iterations),
      Buffer.from(key, 'hex').length,
      digest,
    );

    const storedKey = Buffer.from(key, 'hex');
    return (
      derivedKey.length === storedKey.length &&
      timingSafeEqual(derivedKey, storedKey)
    );
  }

  private toPublicUser<T extends { passwordHash?: string | null }>(user: T) {
    const publicUser = { ...user };
    delete publicUser.passwordHash;
    return publicUser;
  }
}
