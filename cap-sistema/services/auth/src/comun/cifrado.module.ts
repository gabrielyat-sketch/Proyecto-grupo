import { Global, Module } from '@nestjs/common';
import { ServicioCifrado } from '@cap/shared';
import { ENTORNO, Entorno, leerEntorno } from '../config/entorno';

export const SERVICIO_CIFRADO = 'SERVICIO_CIFRADO';

/**
 * Provee el cifrado de campos sensibles. En este servicio lo usa una sola
 * cosa: el secreto TOTP de cada usuario.
 */
@Global()
@Module({
  providers: [
    { provide: ENTORNO, useFactory: leerEntorno },
    {
      provide: SERVICIO_CIFRADO,
      inject: [ENTORNO],
      useFactory: (env: Entorno) => new ServicioCifrado(env.LLAVE_DATOS, env.LLAVE_INDICE),
    },
  ],
  exports: [ENTORNO, SERVICIO_CIFRADO],
})
export class CifradoModule {}
