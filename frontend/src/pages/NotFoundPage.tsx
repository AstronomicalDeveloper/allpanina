import { Link } from 'react-router-dom'
export default function NotFoundPage(){return <div className='page'><h1>Página no encontrada</h1><p>La dirección solicitada no existe.</p><p><Link to='/'>Ir al inicio</Link> · <Link to='/calendario'>Volver al Calendario</Link></p></div>}
