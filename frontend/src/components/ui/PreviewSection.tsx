import type { ReactNode } from 'react'
export default function PreviewSection({title,children}:{title:string;children:ReactNode}) { return <section className="preview"><h2>{title}</h2>{children}<p className="status">Vista preliminar · pendiente de migración</p></section> }
