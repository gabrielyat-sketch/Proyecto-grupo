/**
 * Verificacion de la bitacora de trazabilidad (RF-09, arquitectura §9.5).
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  PARA QUIEN ES ESTE SCRIPT
 * ─────────────────────────────────────────────────────────────────────────
 * Para el CAP, no para el equipo de desarrollo. Responde una sola pregunta:
 * ¿alguien altero la bitacora? Se ejecuta asi, desde `cap-sistema/`:
 *
 *     npm run verificar-cadena
 *
 * Termina con codigo 0 si la bitacora esta intacta y 1 si no. Eso permite
 * programarlo y que avise solo, sin que nadie tenga que leer la salida.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  QUE COMPRUEBA, Y POR QUE SON DOS COMPROBACIONES Y NO UNA
 * ─────────────────────────────────────────────────────────────────────────
 * 1. La CADENA: que cada registro corresponda a su hash y enlace con el
 *    anterior. Detecta que se altero o desaparecio un registro.
 *
 * 2. Las FIRMAS DIARIAS: que cada raiz siga validando con LLAVE_RAIZ_TRAZA.
 *    Detecta lo que la cadena por si sola no puede: que alguien con control
 *    total de PostgreSQL borrara la bitacora y la reescribiera entera. Una
 *    cadena reescrita desde cero es coherente consigo misma; lo que no puede
 *    es volver a firmar los dias anteriores, porque la llave no esta en la
 *    base de datos.
 *
 * No necesita las llaves de descifrado: el hash cubre el texto CIFRADO, tal
 * como se guarda. El CAP puede auditar su bitacora sin que nadie tenga que
 * exponer un solo dato de paciente.
 */
import { config as cargarDotenv } from 'dotenv';
import { resolve } from 'node:path';
import { PrismaClient } from '../../services/trazabilidad/prisma/generado';
import {
  firmaRaizValida,
  RegistroVerificable,
  verificarCadena,
  HASH_GENESIS,
} from '../../services/trazabilidad/src/dominio/cadena';

cargarDotenv({ path: resolve(__dirname, '..', '..', 'services', 'trazabilidad', '.env'), quiet: true });

/** Cuantos registros se traen por vuelta. La bitacora no cabe en memoria. */
const TAMANO_LOTE = 1000;

function exigir(variable: string): string {
  const valor = process.env[variable];
  if (!valor) {
    console.error('Falta ' + variable + '. Se lee de services/trazabilidad/.env');
    process.exit(2);
  }
  return valor;
}

async function main(): Promise<void> {
  const llaveRaiz = exigir('LLAVE_RAIZ_TRAZA');
  const prisma = new PrismaClient({ datasources: { db: { url: exigir('DATABASE_URL') } } });

  console.log('');
  console.log('  Verificacion de la bitacora de trazabilidad');
  console.log('  ' + '─'.repeat(60));

  let problemas = 0;

  try {
    // ─── 1. La cadena ────────────────────────────────────────────────────
    let desde = 0n;
    let esperado = HASH_GENESIS;
    let revisados = 0;
    let rotura: { numero: bigint; motivo: string } | null = null;

    for (;;) {
      const lote = await prisma.registro.findMany({
        where: { numero: { gt: desde } },
        orderBy: { numero: 'asc' },
        take: TAMANO_LOTE,
      });
      if (lote.length === 0) break;

      const verificables: RegistroVerificable[] = lote.map((r) => ({
        numero: r.numero,
        hashPrevio: r.hashPrevio,
        hash: r.hash,
        servicio: r.servicio,
        accion: r.accion,
        entidad: r.entidad,
        entidadId: r.entidadId,
        usuarioId: r.usuarioId,
        usuarioRol: r.usuarioRol,
        motivo: r.motivo,
        valorAnterior: r.valorAnterior ? Buffer.from(r.valorAnterior).toString('base64') : null,
        valorNuevo: r.valorNuevo ? Buffer.from(r.valorNuevo).toString('base64') : null,
        trazaId: r.trazaId,
        ip: r.ip,
        ocurridoEn: r.ocurridoEn,
        registradoEn: r.registradoEn,
      }));

      const resultado = verificarCadena(verificables, esperado);
      revisados += resultado.revisados;

      if (!resultado.intacta) {
        rotura = { numero: resultado.rotoEn!, motivo: resultado.motivo! };
        break;
      }

      esperado = lote[lote.length - 1].hash;
      desde = lote[lote.length - 1].numero;
    }

    if (rotura) {
      problemas++;
      console.log('');
      console.log('  ✕  LA CADENA ESTA ROTA');
      console.log('');
      console.log('     Primer registro que no cuadra: ' + rotura.numero);
      console.log('     ' + rotura.motivo);
      console.log('');
      console.log('     Se revisaron ' + revisados + ' registros antes de encontrarlo.');
      console.log('     Todo lo posterior es consecuencia de esta alteracion.');
    } else {
      console.log('  ✓  Cadena intacta: ' + revisados + ' registros encadenados correctamente.');
    }

    // ─── 2. Las firmas diarias ───────────────────────────────────────────
    const raices = await prisma.raizDiaria.findMany({ orderBy: { dia: 'asc' } });

    if (raices.length === 0) {
      console.log('  •  No hay raices diarias firmadas todavia.');
    } else {
      const rotas = raices.filter(
        (r) =>
          !firmaRaizValida(
            llaveRaiz,
            {
              dia: r.dia.toISOString().slice(0, 10),
              numeroDesde: r.numeroDesde,
              numeroHasta: r.numeroHasta,
              cantidad: r.cantidad,
              hashFinal: r.hashFinal,
            },
            r.firma,
          ),
      );

      if (rotas.length > 0) {
        problemas++;
        console.log('');
        console.log('  ✕  ' + rotas.length + ' RAIZ(CES) DIARIA(S) CON LA FIRMA ROTA');
        console.log('');
        for (const r of rotas) {
          console.log('     ' + r.dia.toISOString().slice(0, 10));
        }
        console.log('');
        console.log('     Una firma que ya no valida significa que ese dia se reescribio');
        console.log('     despues de haberse cerrado. Comparar con la copia de la raiz');
        console.log('     guardada en el almacenamiento de respaldos.');
      } else {
        console.log('  ✓  ' + raices.length + ' raiz(ces) diaria(s) con firma valida.');
      }
    }

    console.log('  ' + '─'.repeat(60));
    if (problemas === 0) {
      console.log('  La bitacora esta intacta.');
      console.log('');
    } else {
      console.log('  LA BITACORA FUE ALTERADA. Avisar a la direccion del CAP.');
      console.log('');
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('');
  console.error('  No se pudo verificar la bitacora:');
  console.error('  ' + (e instanceof Error ? e.message : String(e)));
  console.error('');
  console.error('  Esto NO significa que la bitacora este bien ni mal: significa que la');
  console.error('  comprobacion no llego a hacerse. Revisar la conexion a la base de datos.');
  console.error('');
  process.exitCode = 2;
});
