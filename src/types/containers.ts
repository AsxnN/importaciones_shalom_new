export type ContainerPhotoType =
  | 'LLEGADA_CAMION'
  | 'PRECINTO'
  | 'APERTURA_PUERTAS'
  | 'GUIA_REMISION'
  | 'CUADRILLA_LLEGADA'
  | 'CUADRILLA_SALIDA'
  | 'SALIDA_CAMION'
  | 'OTRO'

export interface ContainerPhoto {
  id: string
  url: string
  tipo: ContainerPhotoType
  caption: string
  timestamp: string
}

export type CrewType = 'PROPIO' | 'CUADRILLA_EXTERNA'

export type ContainerStatus = 'EN_PATIO' | 'EN_DESCARGA' | 'DESCARGADO' | 'DESPACHADO'

export interface ContainerRecord {
  id_contenedor: number
  numero_contenedor: string
  placa_camion: string
  empresa_transporte?: string
  nombre_conductor?: string
  telefono_conductor?: string
  hora_llegada_contenedor: string
  hora_salida_contenedor?: string | null
  tipo_personal: CrewType
  nombre_cuadrilla?: string
  num_estibadores?: number
  hora_llegada_cuadrilla?: string | null
  hora_salida_cuadrilla?: string | null
  fotos: ContainerPhoto[]
  estado: ContainerStatus
  observaciones?: string
  created_at?: string
  updated_at?: string
}

export interface NewContainerPayload {
  numero_contenedor: string
  placa_camion: string
  empresa_transporte?: string
  nombre_conductor?: string
  telefono_conductor?: string
  hora_llegada_contenedor?: string
  tipo_personal: CrewType
  nombre_cuadrilla?: string
  num_estibadores?: number
  hora_llegada_cuadrilla?: string | null
  fotos?: ContainerPhoto[]
  observaciones?: string
}

export interface UpdateContainerPayload {
  numero_contenedor?: string
  placa_camion?: string
  empresa_transporte?: string
  nombre_conductor?: string
  telefono_conductor?: string
  hora_llegada_contenedor?: string
  hora_salida_contenedor?: string | null
  tipo_personal?: CrewType
  nombre_cuadrilla?: string
  num_estibadores?: number
  hora_llegada_cuadrilla?: string | null
  hora_salida_cuadrilla?: string | null
  fotos?: ContainerPhoto[]
  estado?: ContainerStatus
  observaciones?: string
}
