import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConsumidorService } from '../eventos/consumidor.service';
import { EmbarazoService } from './embarazo.service';

/** El evento que `usuarios` publica al guardar una hoja prenatal. */
export const FICHA_PRENATAL_REGISTRADA = 'ficha.prenatal.registrada';

/**
 * Apunta al seguimiento del embarazo como oyente de la ficha prenatal.
 *
 * Es solo el enganche: la decision de que hacer con cada evento —registrar el
 * control, o descartarlo y anotar por que— vive en `EmbarazoService`, junto
 * con el resto de reglas del programa, para que un control que entra por el
 * bus y uno que entra por la pantalla no puedan divergir.
 */
@Injectable()
export class ControlesDesdeFichas implements OnModuleInit {
  constructor(
    private readonly consumidor: ConsumidorService,
    private readonly embarazo: EmbarazoService,
  ) {}

  onModuleInit(): void {
    this.consumidor.escuchar(FICHA_PRENATAL_REGISTRADA, (evento) =>
      this.embarazo.registrarControlDesdeFicha(evento),
    );
  }
}
