import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { GuardJwt, GuardRoles, MiddlewareTraza } from '@cap/shared';
import { PrismaModule } from './prisma/prisma.module';
import { SaludModule } from './salud/salud.module';
import { RegistrosModule } from './registros/registros.module';
import { RaicesModule } from './raices/raices.module';
import { CifradoModule } from './comun/cifrado.module';
import { ENTORNO, leerEntorno } from './config/entorno';

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      useFactory: () => {
        const env = leerEntorno();
        return {
          secret: env.JWT_SECRET,
          // JWT_EXPIRACION llega como texto ('15m'). @nestjs/jwt espera el tipo
          // literal de la libreria 'ms'; el valor ya fue validado por zod.
          signOptions: { expiresIn: env.JWT_EXPIRACION } as JwtModuleOptions['signOptions'],
        };
      },
    }),
    CifradoModule,
    PrismaModule,
    SaludModule,
    RegistrosModule,
    RaicesModule,
  ],
  providers: [
    { provide: ENTORNO, useFactory: leerEntorno },
    // Autenticacion y autorizacion GLOBALES: todo endpoint es privado salvo
    // que se marque con @Publico(). Si alguien olvida el guard en un
    // controlador nuevo, el endpoint queda cerrado, no abierto.
    { provide: APP_GUARD, useClass: GuardJwt },
    { provide: APP_GUARD, useClass: GuardRoles },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // '{*path}': sintaxis de comodin de Express 5. Un '*' suelto ya no es valido.
    consumer.apply(MiddlewareTraza).forRoutes('{*path}');
  }
}
