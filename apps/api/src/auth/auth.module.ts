import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { ApiAccessTokenService } from './api-access-token.service';
import { ApiAccessTokensController } from './api-access-tokens.controller';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'change_this_secret',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController, ApiAccessTokensController],
  providers: [AuthService, ApiAccessTokenService, JwtStrategy],
  exports: [AuthService, ApiAccessTokenService, JwtModule],
})
export class AuthModule {}
