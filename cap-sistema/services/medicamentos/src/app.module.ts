import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { GuardJwt, GuardRoles, MiddlewareTraza } from '@cap/shared';
import { PrismaModule } from './prisma/prisma.module';
import { SaludModule } from './salud/salud.module';
import { ConfigModule } from './config/config.module';
import { EventosModule } from './eventos/eventos.module';
import { PacientesModule } from './pacientes/pacientes.module';
import { CatalogoModule } from './catalogo/catalogo.module';
import { LotesModule } from './lotes/lotes.module';
import { EntregasModule } from './entregas/entregas.module';
import { InventarioModule } from './inventario/inventario.module';
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
    ConfigModule,
    EventosModule,
    PacientesModule,
    PrismaModule,
    SaludModule,
    CatalogoModule,
    LotesModule,
    EntregasModule,
    InventarioModule,
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
