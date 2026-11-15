import type {CellsData} from './data'
export type NavigationBounds = [[number,number],[number,number]]
export interface DepartmentFeature {
 type:'Feature'; properties:{region_id:string;nombre:string;bounds:[number,number,number,number]}
 geometry:CellsData['features'][number]['geometry']
}
export interface DepartmentNavigation {
 type:'FeatureCollection';source:string;source_sha256:string;tolerance_metres:number;purpose:'navigation_only';features:DepartmentFeature[]
}
