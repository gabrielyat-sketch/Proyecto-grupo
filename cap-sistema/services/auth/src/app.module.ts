import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { GuardJwt, GuardRoles, MiddlewareTraza } from '@cap/shared';
import { PrismaModule } from './prisma/prisma.module';
import { SaludModule } from './salud/salud.module';
import { CifradoModule } from './comun/cifrado.module';
import { TokensModule } from './tokens/tokens.module';
import { IntentosModule } from './intentos/intentos.module';
import { MfaModule } from './mfa/mfa.module';
import { AutenticacionModule } from './autenticacion/autenticacion.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { leerEntorno } from './config/entorno';

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      useFactory: () => {
        const env = leerEntorno();
        return {
          secret: env.JWT_SECRET,
          signOptions: { expiresIn: env.JWT_EXPIRACION } as JwtModuleOptions['signOptions'],
        };
      },
    }),
    CifradoModule,
    PrismaModule,
    SaludModule,
    TokensModule,
    IntentosModule,
    MfaModule,
    AutenticacionModule,
    UsuariosModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: GuardJwt },
    { provide: APP_GUARD, useClass: GuardRoles },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(MiddlewareTraza).forRoutes('{*path}');
  }
}
