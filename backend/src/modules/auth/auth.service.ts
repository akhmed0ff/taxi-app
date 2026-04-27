import { JwtService } from '@nestjs/jwt';
import { Injectable } from '@nestjs/common';
import { randomBytes, createHash } from 'node:crypto';
import { UserRole } from '../../common/roles';
import { PrismaService } from '../../infrastructure/db/prisma.service';

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

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
