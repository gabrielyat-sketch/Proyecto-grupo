import { Global, Module } from '@nestjs/common';
import { ConsumidorService } from './consumidor.service';
import { OutboxService } from './outbox.service';

/**
 * Lo que sale y lo que entra: `OutboxService` escribe los eventos de este
 * servicio en su transaccion, y `ConsumidorService` lee los de los demas.
 *
 * El publicador que lleve el outbox de Programas al bus —para que Reportes
 * lo lea— es el mismo `PublicadorOutbox` de `@cap/shared` que ya usa
 * `usuarios`; se conecta cuando exista quien lo consuma.
 */
@Global()
@Module({
  providers: [OutboxService, ConsumidorService],
  exports: [OutboxService, ConsumidorService],
})
export class EventosModule {}
