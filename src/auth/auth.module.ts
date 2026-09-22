import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { SignOptions } from 'jsonwebtoken';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { LicenciasEmpresaModule } from '../licencias-empresa/licencias-empresa.module';
import { UsuarioIdentidad } from './entities/usuario-identidad.entity';
import { DominiosEmpresa } from '../dominios-empresa/entities/dominios-empresa.entity';
import { UsuarioRol } from '../usuario-roles/entities/usuario-role.entity';
import { RolPermiso } from '../rol-permisos/entities/rol-permiso.entity';
import { Permiso } from '../permisos/entities/permiso.entity';
import { PermissionsGuard } from './permissions.guard';
import { APP_GUARD } from '@nestjs/core';
import { Empresa } from '../empresas/entities/empresa.entity';
import { OidcConfigService } from './oidc-config.service';
import { ConfiguracionOperativaTenant } from '../configuracion-operativa-tenant/entities/configuracion-operativa-tenant.entity';
import { PermissionsEvaluatorService } from './permissions-evaluator.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Usuario,
      Empresa,
      UsuarioIdentidad,
      DominiosEmpresa,
      UsuarioRol,
      RolPermiso,
      Permiso,
      ConfiguracionOperativaTenant,
    ]),
    LicenciasEmpresaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET is required');
        }

        return {
          secret,
          signOptions: {
            expiresIn: configService.get<string>(
              'JWT_EXPIRES_IN',
              '8h',
            ) as SignOptions['expiresIn'],
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    OidcConfigService,
    PermissionsEvaluatorService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
  exports: [AuthService, PermissionsEvaluatorService],
})
export class AuthModule {}
