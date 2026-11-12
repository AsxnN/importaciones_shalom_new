import type { ModoManejoCodigo, Product } from '../products/types'

export type Warehouse = {
  id_almacen: number
  nombre: string
  tipo: 'PRINCIPAL' | 'TIENDA' | 'MERMA'
  capacidad_m3: number | null
  activo: boolean
  prefijo_rfid?: string | null
}

export type PalletCountSummary = {
  id_almacen: number
  almacen: string
  id_producto: number
  sku: string
  producto: string
  paletas_activas: number
  paletas_completas: number
  puchos: number
  unidades_en_paletas: number
}

export type SystemAlert = {
  id_alerta: number
  tipo: string
  id_almacen: number | null
  id_producto: number | null
  id_etiqueta: number | null
  mensaje: string
  resuelta: boolean
  created_at: string
}

export type ProductOption = {
  id_producto: number
  sku: string
  nombre: string
  modo_manejo: ModoManejoCodigo
  categoria_nombre?: string
  // Modo PALETIZADO
  unidades_por_caja: number
  cajas_por_paleta: number
  volumen_caja_m3: number | null
  // Modo SERIALIZADO (Maquinaria y Equipos)
  peso_unitario_kg?: number | null
  largo_cm?: number | null
  ancho_cm?: number | null
  alto_cm?: number | null
  requiere_equipo_izaje?: boolean
  ubicacion_permitida?: 'CAMPO' | 'RACK' | 'AMBAS'
  atributos?: Record<string, unknown>
}

export function mapProductToOption(p: Product): ProductOption {
  const r = Array.isArray(p.regla_empaque) ? p.regla_empaque[0] : p.regla_empaque
  const cCamada = (r as any)?.cajas_por_camada ?? (r as any)?.cajas_por_camita ?? 1
  const nCamadas = (r as any)?.numero_camadas ?? (r as any)?.camitas_por_paleta ?? 1

  const ps = Array.isArray(p.perfil_serializado) ? p.perfil_serializado[0] : p.perfil_serializado
  const cat = Array.isArray(p.categoria) ? p.categoria[0] : p.categoria
  const modo = p.modo_manejo || cat?.modo_manejo || (ps ? 'SERIALIZADO' : 'PALETIZADO')

  return {
    id_producto: Number(p.id_producto),
    sku: p.sku,
    nombre: p.nombre || '',
    modo_manejo: modo,
    categoria_nombre: cat?.nombre,
    unidades_por_caja: (r as any)?.unidades_por_caja ?? 1,
    cajas_por_paleta: Math.max(1, cCamada * nCamadas),
    volumen_caja_m3: (r as any)?.volumen_caja_m3 ?? null,
    peso_unitario_kg: ps?.peso_unitario_kg ?? p.peso_unitario_kg ?? null,
    largo_cm: ps?.largo_cm ?? null,
    ancho_cm: ps?.ancho_cm ?? null,
    alto_cm: ps?.alto_cm ?? null,
    requiere_equipo_izaje: ps?.requiere_equipo_izaje ?? false,
    ubicacion_permitida: ps?.ubicacion_permitida ?? 'AMBAS',
    atributos: ps?.atributos
  }
}

export type InventoryItem = {
  id_inventario: number
  id_producto: number
  id_almacen: number
  stock_real: number
  stock_minimo: number
  estado_semaforo: 'VERDE' | 'AMARILLO' | 'ROJO'
  producto: {
    sku: string
    nombre: string
    clasificacion_abc: string | null
    unidad_medida: string | null
    categoria?: { nombre: string; modo_manejo?: string } | null
    regla_empaque?: {
      unidades_por_caja: number
      cajas_por_camada?: number
      numero_camadas?: number
      cajas_por_camita?: number
      camitas_por_paleta?: number
      volumen_caja_m3?: number | null
      volumen_total_m3?: number | null
    }[] | {
      unidades_por_caja: number
      cajas_por_camada?: number
      numero_camadas?: number
      cajas_por_camita?: number
      camitas_por_paleta?: number
      volumen_caja_m3?: number | null
      volumen_total_m3?: number | null
    } | null
  }
}

export type Movement = {
  id_movimiento: number
  tipo: string
  cantidad_afectada: number
  fecha_hora: string
  motivo: string | null
  producto: { sku: string; nombre: string } | null
}
