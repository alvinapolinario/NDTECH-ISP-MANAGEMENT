import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { ApiAccessTokenService } from './api-access-token.service';
import { AuthService } from './auth.service';
import { CurrentUser, type AuthenticatedUser } from './current-user.decorator';
import { CreateApiTokenDto } from './dto/create-api-token.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly apiAccessTokens: ApiAccessTokenService,
  ) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('api-token')
  issueApiToken(@Body() dto: CreateApiTokenDto) {
    return this.apiAccessTokens.issueForCollector({
      email: dto.email,
      password: dto.password,
      label: dto.label,
      deviceId: dto.deviceId,
    });
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getProfile(user.id);
  }

  @Patch('me')
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(user.id, dto);
  }
}
