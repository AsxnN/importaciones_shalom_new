import { supabase } from '../lib/supabase'
import { locationService } from './locationService'
import { containerService } from './containerService'
import { packingListService, type OrderPackingPlan } from './packingListService'
import { projectionService } from './projectionService'
import type { OrderReceptionState, ReceivedPalletLog } from '../types/receptions'

const RECEPTION_STORAGE_PREFIX = 'shalom_order_reception_'

export const orderReceptionService = {
  // 1. Obtener estado de recepción de una orden (memoria local + snapshot de respaldo)
  getOrderReceptionState(id_orden: number, snapshot?: any): OrderReceptionState {
    try {
      const raw = localStorage.getItem(`${RECEPTION_STORAGE_PREFIX}${id_orden}`)
      if (raw) {
        const parsed = JSON.parse(raw)
        return {
          id_contenedor_seleccionado: parsed.id_contenedor_seleccionado || null,
          numero_contenedor_seleccionado: parsed.numero_contenedor_seleccionado || '',
          placa_camion_seleccionado: parsed.placa_camion_seleccionado || '',
          contenedor_confirmado: Boolean(parsed.contenedor_confirmado),
          paletas_recibidas: Array.isArray(parsed.paletas_recibidas) ? parsed.paletas_recibidas : [],
          codigos_liberados: Array.isArray(parsed.codigos_liberados) ? parsed.codigos_liberados : [],
          estado_recepcion: parsed.estado_recepcion || 'PENDIENTE',
          dictamen: parsed.dictamen,
          observaciones_liquidacion: parsed.observaciones_liquidacion,
          fecha_liquidacion: parsed.fecha_liquidacion
        }
      }
    } catch (e) {
      console.warn('Error al leer recepción de storage:', e)
    }

    if (snapshot?.reception_state) {
      return snapshot.reception_state as OrderReceptionState
    }

    return {
      contenedor_confirmado: false,
      paletas_recibidas: [],
      codigos_liberados: [],
      estado_recepcion: 'PENDIENTE'
    }
  },

  // 2. Guardar estado de recepción
  saveOrderReceptionState(id_orden: number, state: OrderReceptionState, numero_orden?: string): void {
    try {
      localStorage.setItem(`${RECEPTION_STORAGE_PREFIX}${id_orden}`, JSON.stringify(state))
      if (numero_orden) {
        localStorage.setItem(`${RECEPTION_STORAGE_PREFIX}${numero_orden}`, JSON.stringify(state))
      }

      // Sincronizar dentro del snapshot dedicado de la orden
      const snap = projectionService.getSnapshotFromStorage(id_orden, numero_orden) || {}
      snap.reception_state = state
      projectionService.saveSnapshotToStorage(id_orden, numero_orden, snap)

      // Guardar también en Supabase de forma asíncrona sin bloquear la UI
      void (async () => {
        try {
          await supabase
            .from('orden_importacion')
            .update({ snapshot_proyeccion: snap })
            .eq('id_orden', id_orden)
        } catch {
          // Continuar con fallback local
        }
      })()
    } catch (e) {
      console.warn('Error saving order reception state:', e)
    }
  },

  // 3. Registrar físicamente una paleta en la base de datos (inventario + Kardex + Zona Campo)
  async recordPalletReception(params: {
    id_orden: number
    numero_orden: string
    id_almacen: number
    id_producto: number
    sku: string
    nombre: string
    uid_tag: string
    tipo: 'COMPLETO' | 'PUCHO'
    cajas: number
    unidades: number
    id_contenedor?: number | null
    numero_contenedor?: string
    currentState: OrderReceptionState
  }): Promise<OrderReceptionState> {
    const cleanTag = params.uid_tag.trim().toUpperCase()

    // Enrolar paleta en etiqueta_rfid, inventario y Kardex usando locationService
    await locationService.createPallet({
      id_producto: params.id_producto,
      id_almacen: params.id_almacen,
      uid_tag: cleanTag,
      tipo_paleta: params.tipo,
      cantidad_paquetes: params.cajas,
      unidades_totales: params.unidades,
      id_celda: 99999, // Marca para Zona Campo
      sku: params.sku,
      nombre: params.nombre
    })

    const newPalletLog: ReceivedPalletLog = {
      uid_tag: cleanTag,
      id_producto: params.id_producto,
      sku: params.sku,
      tipo: params.tipo,
      cajas: params.cajas,
      unidades: params.unidades,
      id_contenedor: params.id_contenedor,
      numero_contenedor: params.numero_contenedor,
      fecha_hora: new Date().toLocaleString('es-PE'),
      estado: 'EN_ALMACEN'
    }

    const updatedState: OrderReceptionState = {
      ...params.currentState,
      paletas_recibidas: [...params.currentState.paletas_recibidas, newPalletLog],
      estado_recepcion: 'EN_CURSO'
    }

    this.saveOrderReceptionState(params.id_orden, updatedState, params.numero_orden)
    return updatedState
  },

  // 4. Liquidación final de la orden y liberación de códigos
  async liquidateOrderReception(params: {
    id_orden: number
    numero_orden: string
    dictamen: 'COMPLETA' | 'FALTANTES' | 'SOBRANTES'
    observaciones: string
    codigosALiberar: string[]
    id_contenedor?: number | null
    packingPlan: OrderPackingPlan | null
    currentState: OrderReceptionState
  }): Promise<OrderReceptionState> {
    // A. Si hay códigos a liberar, actualizar el packing plan para que no los bloquee más
    if (params.packingPlan && params.codigosALiberar.length > 0) {
      const updatedPlan = packingListService.liberateCodesInPlan(params.packingPlan, params.codigosALiberar)
      await packingListService.savePackingPlanToOrder(params.numero_orden, updatedPlan)
    }

    // B. Actualizar estado de recepción
    const updatedState: OrderReceptionState = {
      ...params.currentState,
      estado_recepcion: 'LIQUIDADA',
      dictamen: params.dictamen,
      observaciones_liquidacion: params.observaciones,
      fecha_liquidacion: new Date().toLocaleString('es-PE'),
      codigos_liberados: params.codigosALiberar
    }

    this.saveOrderReceptionState(params.id_orden, updatedState, params.numero_orden)

    // C. Pasar la orden de importación a estado RECIBIDA en Supabase
    try {
      await supabase
        .from('orden_importacion')
        .update({ estado: 'RECIBIDA' })
        .eq('id_orden', params.id_orden)
    } catch (e) {
      console.warn('Error closing order in Supabase:', e)
    }

    // D. Actualizar el contenedor a DESCARGADO si está asociado
    if (params.id_contenedor) {
      try {
        await containerService.updateContainer(params.id_contenedor, { estado: 'DESCARGADO' })
      } catch (e) {
        console.warn('Error updating container status to DESCARGADO:', e)
      }
    }

    return updatedState
  }
}
