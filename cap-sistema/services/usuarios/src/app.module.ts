import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { GuardJwt, GuardRoles, MiddlewareTraza } from '@cap/shared';
import { PrismaModule } from './prisma/prisma.module';
import { SaludModule } from './salud/salud.module';
import { CifradoModule } from './comun/cifrado.module';
import { EventosModule } from './eventos/eventos.module';
import { ComunidadesModule } from './comunidades/comunidades.module';
import { PacientesModule } from './pacientes/pacientes.module';
import { GruposModule } from './grupos/grupos.module';
import { ExpedientesModule } from './expedientes/expedientes.module';
import { AtencionesModule } from './atenciones/atenciones.module';
import { DigitalizacionModule } from './digitalizacion/digitalizacion.module';
import { FichasModule } from './fichas/fichas.module';
import { AntecedentesModule } from './antecedentes/antecedentes.module';
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
    EventosModule,
    PrismaModule,
    SaludModule,
    ComunidadesModule,
    PacientesModule,
    GruposModule,
    ExpedientesModule,
    AtencionesModule,
    DigitalizacionModule,
    FichasModule,
    AntecedentesModule,
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
