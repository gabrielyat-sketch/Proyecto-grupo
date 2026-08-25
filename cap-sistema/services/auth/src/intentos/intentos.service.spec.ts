import { IntentosService } from './intentos.service';
import { PrismaService } from '../prisma/prisma.service';
import { Entorno } from '../config/entorno';

const env = {
  MAX_INTENTOS_FALLIDOS: 5,
  VENTANA_INTENTOS_MINUTOS: 15,
  MINUTOS_BLOQUEO: 15,
} as Entorno;

describe('IntentosService', () => {
  const prisma = {
    intentoFallido: { create: jest.fn(), count: jest.fn(), deleteMany: jest.fn() },
    usuario: { updateMany: jest.fn() },
  } as unknown as PrismaService;

  const servicio = new IntentosService(prisma, env);

  beforeEach(() => jest.clearAllMocks());

  describe('minutosDeBloqueo', () => {
    it('devuelve 0 si la cuenta nunca fue bloqueada', () => {
      expect(servicio.minutosDeBloqueo(null)).toBe(0);
    });

    it('devuelve 0 si el bloqueo ya vencio', () => {
      expect(servicio.minutosDeBloqueo(new Date(Date.now() - 60_000))).toBe(0);
    });

    it('redondea hacia arriba los minutos que faltan', () => {
      expect(servicio.minutosDeBloqueo(new Date(Date.now() + 61_000))).toBe(2);
    });
  });

  describe('registrarFallo', () => {
    it('registra el intento en minusculas', async () => {
      (prisma.intentoFallido.count as jest.Mock).mockResolvedValue(1);
      await servicio.registrarFallo('JPerez', '10.0.0.5');
      expect((prisma.intentoFallido.create as jest.Mock).mock.calls[0][0].data.usuario).toBe('jperez');
    });

    it('no bloquea antes de llegar al limite', async () => {
      (prisma.intentoFallido.count as jest.Mock).mockResolvedValue(4);
      await servicio.registrarFallo('jperez');
      expect(prisma.usuario.updateMany).not.toHaveBeenCalled();
    });

    it('bloquea la cuenta al alcanzar el limite', async () => {
      (prisma.intentoFallido.count as jest.Mock).mockResolvedValue(5);
      await servicio.registrarFallo('jperez');
      const datos = (prisma.usuario.updateMany as jest.Mock).mock.calls[0][0].data;
      expect(datos.bloqueadoHasta.getTime()).toBeGreaterThan(Date.now());
    });

    it('usa updateMany, porque el usuario intentado puede no existir', async () => {
      (prisma.intentoFallido.count as jest.Mock).mockResolvedValue(5);
      await servicio.registrarFallo('cuenta-inventada');
      expect(prisma.usuario.updateMany).toHaveBeenCalled();
    });

    it('solo cuenta los intentos dentro de la ventana de tiempo', async () => {
      (prisma.intentoFallido.count as jest.Mock).mockResolvedValue(1);
      await servicio.registrarFallo('jperez');
      const desde = (prisma.intentoFallido.count as jest.Mock).mock.calls[0][0].where.fecha.gte;
      const minutos = (Date.now() - desde.getTime()) / 60_000;
      expect(minutos).toBeCloseTo(15, 0);
    });
  });

  it('limpiar borra el historial de esa cuenta', async () => {
    await servicio.limpiar('JPerez');
    expect((prisma.intentoFallido.deleteMany as jest.Mock).mock.calls[0][0].where.usuario).toBe('jperez');
  });
});
