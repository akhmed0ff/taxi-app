import { Body, Controller, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { DevLoginDto } from './dto/dev-login.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a passenger or driver user' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with phone and password' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh an access token' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Revoke a refresh token' })
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto);
  }

  // Development-only shortcut for local/mobile integration. Replace with OTP/password auth before production.
  @Post('dev-login')
  @ApiOperation({ summary: 'Development-only login shortcut' })
  devLogin(@Body() dto: DevLoginDto, @Query('role') role?: string) {
    return this.authService.devLogin({
      ...dto,
      role: role ?? dto.role,
    });
  }
}
