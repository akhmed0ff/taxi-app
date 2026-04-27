import { JwtService } from '@nestjs/jwt';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Buffer } from 'node:buffer';
import { promisify } from 'node:util';
import { randomBytes, createHash, pbkdf2, timingSafeEqual } from 'node:crypto';
import { UserRole, UserRoleValue } from '../../common/roles';
import { PrismaService } from '../../infrastructure/db/prisma.service';
import { DevLoginDto } from './dto/dev-login.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';

const pbkdf2Async = promisify(pbkdf2);
const PASSWORD_ITERATIONS = 120000;
const PASSWORD_KEY_LENGTH = 64;
const PASSWORD_DIGEST = 'sha512';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    const role = (dto.role ?? UserRoleValue.PASSENGER) as UserRole;
    const passwordHash = await this.hashPassword(dto.password);
    const user =
      existingUser && !existingUser.passwordHash
        ? await this.prisma.user.update({
            where: { id: existingUser.id },
            data: {
              name: dto.name,
              passwordHash,
              role,
            },
          })
        : existingUser
          ? undefined
          : await this.prisma.user.create({
              data: {
                phone: dto.phone,
                name: dto.name,
                passwordHash,
                role,
              },
            });

    if (!user) {
      throw new ConflictException('User with this phone already exists');
    }

    const driver = await this.ensureDriverProfile(user.id, user.role as UserRole);
    const tokens = await this.issueTokens({
      id: user.id,
      role: user.role as UserRole,
    });

    return {
      user,
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

    const driver = await this.ensureDriverProfile(user.id, user.role as UserRole);
    const tokens = await this.issueTokens({
      id: user.id,
      role: user.role as UserRole,
    });

    return {
      user,
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
      user: storedToken.user,
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
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('dev-login is disabled in production');
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
    const driver = await this.ensureDriverProfile(user.id, user.role as UserRole);
    const tokens = await this.issueTokens({
      id: user.id,
      role: user.role as UserRole,
    });

    return {
      developmentOnly: true,
      warning: 'auth/dev-login is for local development and test builds only',
      user,
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
    const salt = randomBytes(16).toString('hex');
    const derivedKey = await pbkdf2Async(
      password,
      salt,
      PASSWORD_ITERATIONS,
      PASSWORD_KEY_LENGTH,
      PASSWORD_DIGEST,
    );

    return [
      'pbkdf2',
      PASSWORD_DIGEST,
      PASSWORD_ITERATIONS,
      salt,
      derivedKey.toString('hex'),
    ].join('$');
  }

  private async verifyPassword(password: string, passwordHash: string) {
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
    return derivedKey.length === storedKey.length && timingSafeEqual(derivedKey, storedKey);
  }
}
