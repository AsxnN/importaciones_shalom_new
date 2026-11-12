export type { PalletRecord } from '../../types/locations'

export interface Warehouse {
  id_almacen: number
  nombre: string
  tipo: 'PRINCIPAL' | 'TIENDA' | 'MERMA' | string
  capacidad_m3: number | null
  activo: boolean
  prefijo_rfid?: string | null
}

export interface MovementLog {
  id_movimiento: number
  tipo: string
  cantidad_afectada: number
  fecha_hora: string
  motivo: string | null
  destino_almacen: number | null
  producto: {
    sku: string
    nombre: string
    clasificacion_abc?: string | null
    unidad_medida?: string | null
  } | null
  destino?: { nombre: string } | null
  etiqueta_rfid?: { uid_tag: string } | null
}

export interface MovementsSummary {
  totalPaletas: number
  totalTransferencias: number
  totalSalidas: number
  totalUnidadesMovidas: number
}

export type MovementTab = 'operar' | 'paletas' | 'historial'

export type DestinationMode = 'INTERNAL' | 'OUTSIDE'

export type TipoSalida =
  | 'VENTA_CLIENTE'
  | 'DISTRIBUCION_EXTERNA'
  | 'MERMA_EXTERNA'
  | 'DEVOLUCION_PROVEEDOR'
  | 'OTRO'

export type PalletFilterType = 'ALL' | 'COMPLETO' | 'PUCHO' | 'SERIALIZADO'

export type HistoryFilterType = 'ALL' | 'INTERNAL' | 'OUTSIDE'
