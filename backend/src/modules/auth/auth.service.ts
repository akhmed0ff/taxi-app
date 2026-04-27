import { JwtService } from '@nestjs/jwt';
import { Injectable } from '@nestjs/common';
import { randomBytes, createHash } from 'node:crypto';
import { UserRole } from '../../common/roles';
import { PrismaService } from '../../infrastructure/db/prisma.service';
import { DevLoginDto } from './dto/dev-login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

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
    const driver =
      user.role === 'DRIVER'
        ? await this.prisma.driver.upsert({
            where: { userId: user.id },
            update: {},
            create: { userId: user.id },
          })
        : undefined;
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

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
