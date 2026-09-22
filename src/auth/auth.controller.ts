import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { OidcLoginDto } from './dto/oidc-login.dto';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthenticatedUser } from './decorators/current-user.decorator';
import { RequirePermission } from './decorators/require-permission.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() loginDto: LoginDto, @Headers('host') host?: string) {
    return this.authService.login(loginDto, host);
  }

  @Public()
  @Post('login/oidc')
  loginWithOidc(@Body() oidcLoginDto: OidcLoginDto) {
    return this.authService.loginWithOidc(oidcLoginDto);
  }

  @RequirePermission('auth.me.ver')
  @Get('oidc/providers')
  oidcProviders(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getOidcProviderStatus(user.empresaId);
  }

  @RequirePermission('auth.me.ver')
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getCurrentUser(user.userId, user.empresaId);
  }
}
