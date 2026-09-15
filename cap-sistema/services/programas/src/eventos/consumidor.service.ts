import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  BUS_EVENTOS,
  ConsumidorEventos,
  EventoBus,
  IBusEventos,
  ManejadorEvento,
} from '@cap/shared';

/**
 * Lo que este servicio escucha del bus.
 *
 * El bucle vive en `@cap/shared`; aqui solo se decide que hacer con cada tipo
 * de evento. Los modulos que quieran reaccionar a uno se apuntan con
 * `escuchar` durante su `onModuleInit`, y el bucle arranca despues, cuando
 * la aplicacion entera esta montada: asi ningun evento llega antes de que
 * exista quien lo atienda.
 *
 * Un tipo sin manejador se confirma y se olvida. El stream lo comparten
 * todos los servicios, y la mayor parte de lo que pasa por el —pacientes
 * creados, medicamentos entregados— no es asunto de Programas.
 *
 * La idempotencia NO esta aqui: el bus entrega «al menos una vez», y
 * reconocer la segunda entrega solo se puede hacer en la misma transaccion
 * que el cambio de negocio, que es del manejador. Ver `EventoProcesado`.
 */
@Injectable()
export class ConsumidorService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(ConsumidorService.name);
  private readonly manejadores = new Map<string, ManejadorEvento>();
  private consumidor: ConsumidorEventos | null = null;

  constructor(@Inject(BUS_EVENTOS) private readonly bus: IBusEventos) {}

  escuchar(tipo: string, manejador: ManejadorEvento): void {
    if (this.manejadores.has(tipo)) {
      throw new Error('Ya hay quien escuche ' + tipo + ': un evento tiene un solo manejador.');
    }
    this.manejadores.set(tipo, manejador);
  }

  async onApplicationBootstrap(): Promise<void> {
    if (!this.bus.disponible) {
      this.logger.warn('Sin bus: este servicio no se entera de lo que pasa en los demas.');
      return;
    }
    this.consumidor = new ConsumidorEventos(this.bus.conectar(), {
      grupo: 'programas',
      manejar: (evento) => this.manejar(evento),
      logger: this.logger,
    });
    await this.consumidor.arrancar();
    this.logger.log('Escuchando el bus: ' + [...this.manejadores.keys()].join(', '));
  }

  async onModuleDestroy(): Promise<void> {
    await this.consumidor?.detener();
  }

  private async manejar(evento: EventoBus): Promise<void> {
    const manejador = this.manejadores.get(evento.tipo);
    if (!manejador) return;
    await manejador(evento);
  }
}
