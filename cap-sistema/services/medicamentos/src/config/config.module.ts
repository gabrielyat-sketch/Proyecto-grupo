import { Global, Module } from '@nestjs/common';
import { ENTORNO, leerEntorno } from './entorno';

/**
 * Este servicio NO cifra nada.
 *
 * Un inventario de medicamentos no es un dato sensible del paciente: el
 * nombre de un medicamento no identifica a nadie. Lo unico ligado a una
 * persona es el `pacienteId` de la entrega, que ya es un identificador opaco.
 *
 * Por eso no se declaran LLAVE_DATOS ni LLAVE_INDICE: pedir llaves que no se
 * usan solo aumenta la superficie de configuracion que puede quedar mal.
 */
@Global()
@Module({
  providers: [{ provide: ENTORNO, useFactory: leerEntorno }],
  exports: [ENTORNO],
})
export class ConfigModule {}
