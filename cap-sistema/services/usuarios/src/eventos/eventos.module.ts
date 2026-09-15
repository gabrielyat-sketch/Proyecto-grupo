import { Global, Module } from '@nestjs/common';
import { OutboxService } from './outbox.service';
import { PublicadorService } from './publicador.service';

/**
 * Las dos mitades del patron outbox: `OutboxService` escribe el evento en la
 * transaccion del cambio de negocio, y `PublicadorService` lo lleva al bus
 * despues. Necesita `PrismaModule`, que es global.
 */
@Global()
@Module({ providers: [OutboxService, PublicadorService], exports: [OutboxService] })
export class EventosModule {}
