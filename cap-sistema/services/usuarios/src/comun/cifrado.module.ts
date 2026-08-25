import { Global, Module } from '@nestjs/common';
import { ServicioCifrado } from '@cap/shared';
import { ENTORNO, Entorno, leerEntorno } from '../config/entorno';

export const SERVICIO_CIFRADO = 'SERVICIO_CIFRADO';

/**
 * Cifrado de campos sensibles.
 *
 * IMPORTANTE: LLAVE_DATOS y LLAVE_INDICE deben ser las mismas en todos los
 * servicios. Si difieren, un DPI cifrado por un servicio no lo puede descifrar
 * ni buscar el otro, y el dato queda inaccesible sin haber dado ningun error.
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
