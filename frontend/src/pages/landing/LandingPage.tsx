import { Link } from 'react-router-dom'

/**
 * Página de inicio. Describe lo que la aplicación muestra HOY; si cambia la cobertura publicada,
 * actualizar COBERTURA (única afirmación de alcance de esta página).
 */
const COBERTURA = 'Esta versión muestra el total de Perú y sus 25 departamentos, de enero de 2013 a julio de 2026. El mapa nacional agrupa las observaciones en bloques de 10 km.'

const preguntas = [
  { to: '/calendario', nombre: 'Calendario', pregunta: '¿Cuándo hubo más detecciones térmicas?', texto: 'Recorre mes a mes y año a año la actividad registrada, compara años y descarga la serie.' },
  { to: '/mapa', nombre: 'Mapa', pregunta: '¿Dónde se concentraron?', texto: 'Ubica en el territorio las celdas con detecciones, por año o por mes, y consulta una celda a la vez.' },
  { to: '/metodo', nombre: 'Método', pregunta: '¿Qué tan confiable es la comparación entre satélites?', texto: 'Entiende cómo se construye el indicador y cómo se evaluó la calibración entre MODIS y VIIRS.' },
]

export default function LandingPage() {
  return <article className="landing">
    <header className="landing-hero">
      <p className="landing-kicker">AllpaNina</p>
      <h1>Explora la historia de las detecciones térmicas desde el espacio</h1>
      <p className="landing-lead">AllpaNina reúne las anomalías térmicas que registran dos instrumentos satelitales de la NASA, MODIS y VIIRS, para ver cuándo y dónde varían y cómo se comparan entre sí.</p>
      <p className="landing-actions"><Link className="landing-button" to="/calendario">Empezar por el Calendario</Link><Link className="landing-link" to="/metodo">Cómo se calcula</Link></p>
    </header>

    <section className="landing-section" aria-labelledby="landing-preguntas">
      <h2 id="landing-preguntas">Qué puedes explorar</h2>
      <ul className="landing-cards">
        {preguntas.map(item => <li key={item.to}><Link to={item.to}><span className="landing-card-name">{item.nombre}</span><strong>{item.pregunta}</strong><span>{item.texto}</span></Link></li>)}
      </ul>
    </section>

    <section className="landing-section landing-two" aria-labelledby="landing-datos">
      <div>
        <h2 id="landing-datos">De dónde vienen los datos</h2>
        <p>Las detecciones provienen de NASA FIRMS (Fire Information for Resource Management System): MODIS, a bordo de los satélites Terra y Aqua, y VIIRS, a bordo del satélite Suomi NPP. Los límites departamentales son los oficiales del INEI.</p>
        <p className="landing-coverage">{COBERTURA}</p>
      </div>
      <div>
        <h2 id="landing-unidad">Qué se está contando</h2>
        <p>La unidad es el <strong>día-celda</strong>: un par formado por una celda del territorio y un día con al menos una detección utilizable. La suma describe actividad térmica registrada; no cuenta incendios ni mide superficie quemada.</p>
      </div>
    </section>

    <section className="landing-section landing-limits" aria-labelledby="landing-limites">
      <h2 id="landing-limites">Lo que estos datos no dicen</h2>
      <ul>
        <li>Una detección térmica no equivale a un incendio confirmado.</li>
        <li>No predice incendios futuros ni muestra datos en tiempo real: es una serie histórica.</li>
        <li>Que no haya detecciones no demuestra que no hubo fuego: los satélites no ven bajo las nubes ni en todo momento.</li>
        <li>Los datos de FIRMS se entregan «tal cual» y no deben usarse para decisiones tácticas ni para condiciones a escala local. AllpaNina es un prototipo científico.</li>
      </ul>
      <p><Link to="/metodo">Ver método, evaluación y limitaciones completas</Link></p>
    </section>
  </article>
}
