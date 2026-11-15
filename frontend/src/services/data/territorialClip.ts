import earcut, {flatten} from 'earcut'
import type {MapCells} from './mapExploration'
type Geometry = MapCells['features'][number]['geometry']
type Point = [number, number]
type Triangle = Point[]
const STEP = .25
const bounds = (points: Point[]) => [Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))]
const cross = (a: Point,b: Point,p: Point) => (b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0])
function triangles(geometry: Geometry): Triangle[] {
 const result: Triangle[]=[]
 for(const polygon of geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates){
  const {vertices,holes,dimensions}=flatten(polygon)
  const indices=earcut(vertices,holes,dimensions)
  for(let i=0;i<indices.length;i+=3){
   const points=indices.slice(i,i+3).map(j=>[vertices[j*2],vertices[j*2+1]] as Point)
   if(cross(points[0],points[1],points[2])<0)points.reverse()
   result.push(points)
  }
 }
 return result
}
/** Sutherland–Hodgman intersection of convex triangles; boundaries have no assigned values. */
function intersect(subject: Triangle, clip: Triangle): Point[] {
 let output=subject
 for(let i=0;i<3&&output.length;i++){
  const a=clip[i],b=clip[(i+1)%3],input=output;output=[]
  let previous=input.at(-1)!,previousDistance=cross(a,b,previous)
  for(const current of input){
   const distance=cross(a,b,current)
   if((distance>=0)!==(previousDistance>=0)){
    const t=previousDistance/(previousDistance-distance)
    output.push([previous[0]+t*(current[0]-previous[0]),previous[1]+t*(current[1]-previous[1])])
   }
   if(distance>=0)output.push(current)
   previous=current;previousDistance=distance
  }
 }
 return output
}
/** Triangles partition the fill, including holes. Grid index avoids scanning every boundary edge per cell. */
export function territorialClip(boundary: Geometry):(geometry: Geometry)=>Geometry|null {
 const pieces=triangles(boundary),grid=new Map<string,number[]>()
 const keys=(box:number[])=>{const result:string[]=[];for(let x=Math.floor(box[0]/STEP);x<=Math.floor(box[2]/STEP);x++)for(let y=Math.floor(box[1]/STEP);y<=Math.floor(box[3]/STEP);y++)result.push(`${x},${y}`);return result}
 pieces.forEach((piece,id)=>{for(const key of keys(bounds(piece))){const list=grid.get(key)??[];list.push(id);grid.set(key,list)}})
 return geometry=>{
  const coordinates: Point[][][]=[]
  for(const triangle of triangles(geometry)){
   const candidates=new Set(keys(bounds(triangle)).flatMap(key=>grid.get(key)??[]))
   for(const id of candidates){
    const ring=intersect(triangle,pieces[id])
    if(ring.length<3)continue
    const area=ring.reduce((sum,p,i)=>{const q=ring[(i+1)%ring.length];return sum+p[0]*q[1]-q[0]*p[1]},0)
    if(Math.abs(area)<1e-14)continue
    coordinates.push([[...ring,ring[0]]])
   }
  }
  return coordinates.length?{type:'MultiPolygon',coordinates}:null
 }
}
