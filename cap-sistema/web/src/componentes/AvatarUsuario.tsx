import { Avatar, Badge, Tooltip } from '@mui/material';

/**
 * Verde de presencia.
 *
 * No sale de la paleta: el `success.main` del tema (#1b5e20) esta pensado para
 * texto sobre blanco y, en un punto de 12 px sobre la barra teal, se pierde. El
 * indicador tiene que leerse de reojo desde el otro lado del escritorio.
 */
const VERDE_CONECTADO = '#22c55e';

/** Gris de ausencia. Sin color, no compite con nada. */
const GRIS_DESCONECTADO = '#9aa5ab';

/**
 * Colores de los avatares.
 *
 * Se elige uno por el nombre de usuario, no al azar: la misma persona tiene
 * siempre el mismo color, en la barra y en la lista de cuentas. Asi el avatar
 * sirve para reconocerla de un vistazo, que es lo unico que justifica que este
 * ahi. Todos son oscuros para que las iniciales blancas se lean.
 */
const COLORES = ['#15607a', '#4a6572', '#2f6b4f', '#7a4a15', '#5b3a6b', '#8a5a00'];

function colorDe(semilla: string): string {
  let suma = 0;
  for (let i = 0; i < semilla.length; i++) suma = (suma + semilla.charCodeAt(i)) % 9973;
  return COLORES[suma % COLORES.length];
}

/**
 * Iniciales de la persona.
 *
 * Con nombre y apellido se usa la inicial de cada uno. Cuando no los hay
 * —el perfil de la sesion solo trae el nombre de usuario— se toman las dos
 * primeras letras del usuario, que en la convencion del CAP son la inicial del
 * nombre y el principio del apellido: "jperez" da "JP".
 */
function inicialesDe(usuario: string, nombres?: string, apellidos?: string): string {
  const n = nombres?.trim();
  const a = apellidos?.trim();
  if (n && a) return (n[0] + a[0]).toUpperCase();
  if (n) return n.slice(0, 2).toUpperCase();
  return usuario.slice(0, 2).toUpperCase();
}

export interface AvatarUsuarioProps {
  usuario: string;
  nombres?: string;
  apellidos?: string;
  /**
   * Si se omite, el avatar va sin punto de presencia. Es a proposito: un punto
   * gris permanente afirma "esta desconectado", y afirmar eso sin saberlo es
   * peor que no decir nada.
   */
  conectado?: boolean;
  tamano?: number;
  /** Texto del tooltip. Sin el, el avatar no dice nada a quien no reconoce las iniciales. */
  descripcion?: string;
}

export function AvatarUsuario({
  usuario,
  nombres,
  apellidos,
  conectado,
  tamano = 36,
  descripcion,
}: AvatarUsuarioProps) {
  const iniciales = inicialesDe(usuario, nombres, apellidos);
  const estado = conectado === undefined ? '' : conectado ? ', conectado' : ', desconectado';
  const etiqueta = descripcion ?? usuario + estado;

  const avatar = (
    <Avatar
      sx={{
        width: tamano,
        height: tamano,
        bgcolor: colorDe(usuario),
        color: '#fff',
        // La proporcion la marca el tamano: un avatar de 24 px con la letra de
        // uno de 40 se ve roto.
        fontSize: Math.round(tamano * 0.4),
        fontWeight: 600,
      }}
    >
      {iniciales}
    </Avatar>
  );

  return (
    <Tooltip title={etiqueta}>
      {/*
        El estado va tambien en `aria-label`: el color por si solo no comunica
        nada a quien no lo distingue, y el punto no tiene texto.
      */}
      <span role="img" aria-label={etiqueta} style={{ display: 'inline-flex' }}>
        {conectado === undefined ? (
          avatar
        ) : (
          <Badge
            overlap="circular"
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            variant="dot"
            sx={{
              '& .MuiBadge-badge': {
                width: Math.max(10, Math.round(tamano * 0.28)),
                height: Math.max(10, Math.round(tamano * 0.28)),
                minWidth: 0,
                borderRadius: '50%',
                backgroundColor: conectado ? VERDE_CONECTADO : GRIS_DESCONECTADO,
                // El anillo separa el punto del avatar y de la barra teal.
                // Sin el, sobre ciertos colores el punto desaparece.
                boxShadow: '0 0 0 2px #fff',
              },
            }}
          >
            {avatar}
          </Badge>
        )}
      </span>
    </Tooltip>
  );
}
