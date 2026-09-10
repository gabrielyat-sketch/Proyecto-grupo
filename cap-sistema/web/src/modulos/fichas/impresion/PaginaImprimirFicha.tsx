import { useEffect, type ReactNode } from 'react';
import { Link as EnlaceRuta, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, CircularProgress, Stack, Typography } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { AvisoError } from '../../../componentes/AvisoError';
import { NOMBRE_FICHA, obtenerFicha } from '../../expedientes/servicio-expedientes';
import { obtenerAntecedentes, obtenerCatalogo, obtenerPaciente } from '../servicio-fichas';
import { obtenerCarnet, obtenerCatalogoCarnet } from '../ninez/servicio-carnet';
import { HojaAdulto } from './HojaAdulto';
import { HojaNeonato } from './HojaNeonato';
import { HojaNinez } from './HojaNinez';
import { HojaPosparto, HojaPrenatal } from './HojaPrenatal';
import './hoja.css';

/**
 * La ficha llena, lista para imprimir como la hoja oficial.
 *
 * Vive fuera del layout del panel: sin menu ni barra superior, porque lo que
 * se imprime es la hoja y nada mas. En pantalla se ve sobre una mesa gris con
 * un boton de imprimir; en papel sale la hoja sola, en oficio y en blanco y
 * negro. El navegador es quien imprime (`window.print`): no hay que generar
 * un PDF en el servidor para algo que Chrome y Edge ya hacen bien.
 *
 * Se piden cuatro cosas —la ficha, el paciente, el catalogo de esa hoja y los
 * antecedentes— y, si es de ninez, el carnet y su esquema de vacunas, porque
 * la primera hoja del papel es del nino y no de la consulta.
 */
export function PaginaImprimirFicha() {
  const { pacienteId = '', fichaId = '' } = useParams();

  const ficha = useQuery({
    queryKey: ['ficha', fichaId],
    queryFn: () => obtenerFicha(fichaId),
    enabled: fichaId !== '',
    staleTime: 5 * 60_000,
  });
  const paciente = useQuery({
    queryKey: ['paciente', pacienteId],
    queryFn: () => obtenerPaciente(pacienteId),
    enabled: pacienteId !== '',
  });
  const antecedentes = useQuery({
    queryKey: ['antecedentes', pacienteId],
    queryFn: () => obtenerAntecedentes(pacienteId),
    enabled: pacienteId !== '',
  });

  const tipo = ficha.data?.tipoFicha ?? null;
  const catalogo = useQuery({
    queryKey: ['catalogo-ficha', tipo],
    queryFn: () => obtenerCatalogo(tipo!),
    enabled: tipo !== null,
    staleTime: Infinity,
  });

  const esNinez = tipo === 'NINEZ';
  const carnet = useQuery({
    queryKey: ['carnet', pacienteId],
    queryFn: () => obtenerCarnet(pacienteId),
    enabled: esNinez && pacienteId !== '',
  });
  const catalogoCarnet = useQuery({
    queryKey: ['catalogo-carnet'],
    queryFn: obtenerCatalogoCarnet,
    enabled: esNinez,
    staleTime: Infinity,
  });

  // El titulo de la pestana es lo que el navegador propone como nombre del
  // PDF al «guardar como». «Ficha adulto - Caal, Juana» se encuentra; «CAP
  // Purulha» repetido treinta veces, no.
  useEffect(() => {
    if (!paciente.data || !tipo) return;
    const anterior = document.title;
    document.title =
      'Ficha ' + (NOMBRE_FICHA[tipo] ?? tipo) + ' - ' + paciente.data.apellidos + ', ' + paciente.data.nombres;
    return () => {
      document.title = anterior;
    };
  }, [paciente.data, tipo]);

  const volver = '/pacientes/' + pacienteId + '/expediente';

  const cargando =
    ficha.isPending ||
    paciente.isPending ||
    antecedentes.isPending ||
    (tipo !== null && catalogo.isPending) ||
    (esNinez && (carnet.isPending || catalogoCarnet.isPending));
  const error = ficha.error ?? paciente.error ?? catalogo.error ?? null;

  let contenido: ReactNode;
  if (error) {
    contenido = <AvisoError error={error} />;
  } else if (cargando) {
    contenido = (
      <Stack sx={{ alignItems: 'center', py: 8 }}>
        <CircularProgress />
      </Stack>
    );
  } else if (!ficha.data || !paciente.data) {
    contenido = null;
  } else if (!tipo || !catalogo.data) {
    contenido = (
      <Alert severity="info" sx={{ maxWidth: 640, mx: 'auto' }}>
        Esta atencion no se registro con una ficha oficial, asi que no hay hoja que imprimir.
      </Alert>
    );
  } else {
    // Los antecedentes y el carnet son del paciente, no de la consulta: si no
    // llegan, la hoja sale con esas rayas en blanco, no sin imprimirse.
    const ant = antecedentes.data ?? null;
    switch (tipo) {
      case 'ADULTO':
        contenido = <HojaAdulto ficha={ficha.data} catalogo={catalogo.data} paciente={paciente.data} antecedentes={ant} />;
        break;
      case 'NEONATO':
        contenido = <HojaNeonato ficha={ficha.data} catalogo={catalogo.data} paciente={paciente.data} antecedentes={ant} />;
        break;
      case 'NINEZ':
        contenido = (
          <HojaNinez
            ficha={ficha.data}
            catalogo={catalogo.data}
            paciente={paciente.data}
            antecedentes={ant}
            carnet={carnet.data ?? null}
            catalogoCarnet={catalogoCarnet.data ?? null}
          />
        );
        break;
      case 'PRENATAL':
        contenido = <HojaPrenatal ficha={ficha.data} catalogo={catalogo.data} paciente={paciente.data} antecedentes={ant} />;
        break;
      case 'POSPARTO':
        contenido = <HojaPosparto ficha={ficha.data} catalogo={catalogo.data} paciente={paciente.data} />;
        break;
    }
  }

  const listaParaImprimir = !error && !cargando && Boolean(tipo && catalogo.data);

  return (
    <div className="hoja-vista">
      <div className="hoja-barra-herramientas">
        <Button component={EnlaceRuta} to={volver} startIcon={<ArrowBackIcon />}>
          Expediente
        </Button>
        <Typography sx={{ fontWeight: 600, flex: 1, minWidth: 200 }}>
          {paciente.data ? paciente.data.apellidos + ', ' + paciente.data.nombres : ''}
          {tipo ? ' · Ficha ' + (NOMBRE_FICHA[tipo] ?? tipo) : ''}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Hoja oficio · blanco y negro
        </Typography>
        <Button
          variant="contained"
          startIcon={<PrintIcon />}
          onClick={() => window.print()}
          disabled={!listaParaImprimir}
        >
          Imprimir
        </Button>
      </div>
      {contenido}
    </div>
  );
}
