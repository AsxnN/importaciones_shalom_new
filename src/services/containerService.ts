import { supabase } from '../lib/supabase'
import type {
  ContainerPhoto,
  ContainerRecord,
  NewContainerPayload,
  UpdateContainerPayload
} from '../types/containers'

const STORAGE_KEY = 'shalom_control_contenedores_v1'

const SEED_CONTAINERS: ContainerRecord[] = [
  {
    id_contenedor: 101,
    numero_contenedor: 'MSCU-982145-2',
    placa_camion: 'D3F-821',
    empresa_transporte: 'Transportes TransMarítimo Perú SAC',
    nombre_conductor: 'Carlos Mendoza Paredes',
    telefono_conductor: '+51 984 123 456',
    hora_llegada_contenedor: new Date(Date.now() - 3.5 * 3600 * 1000).toISOString(),
    hora_salida_contenedor: null,
    tipo_personal: 'CUADRILLA_EXTERNA',
    nombre_cuadrilla: 'Estibas y Logística Rápida SAC',
    num_estibadores: 6,
    hora_llegada_cuadrilla: new Date(Date.now() - 2.8 * 3600 * 1000).toISOString(),
    hora_salida_cuadrilla: null,
    fotos: [
      {
        id: 'foto-1',
        url: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=600&auto=format&fit=crop&q=60',
        tipo: 'LLEGADA_CAMION',
        caption: 'Fachada del camión con placa D3F-821 en garita',
        timestamp: new Date(Date.now() - 3.5 * 3600 * 1000).toISOString()
      },
      {
        id: 'foto-2',
        url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=60',
        tipo: 'PRECINTO',
        caption: 'Precinto de aduanas intacto #ML-88412',
        timestamp: new Date(Date.now() - 3.4 * 3600 * 1000).toISOString()
      },
      {
        id: 'foto-3',
        url: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=600&auto=format&fit=crop&q=60',
        tipo: 'GUIA_REMISION',
        caption: 'Guía de remisión del transportista remitente 001-09412',
        timestamp: new Date(Date.now() - 3.3 * 3600 * 1000).toISOString()
      },
      {
        id: 'foto-4',
        url: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=600&auto=format&fit=crop&q=60',
        tipo: 'CUADRILLA_LLEGADA',
        caption: 'Ingreso de cuadrilla externa (6 estibadores con EPP)',
        timestamp: new Date(Date.now() - 2.8 * 3600 * 1000).toISOString()
      }
    ],
    estado: 'EN_PATIO',
    observaciones: 'Contenedor de 40 pies procedente de puerto Callao. En rampa 2.',
    created_at: new Date(Date.now() - 3.5 * 3600 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id_contenedor: 102,
    numero_contenedor: 'TGHU-401928-1',
    placa_camion: 'B4V-712',
    empresa_transporte: 'Logística Continental Andina',
    nombre_conductor: 'Jorge Luis Huamán',
    telefono_conductor: '+51 971 882 109',
    hora_llegada_contenedor: new Date(Date.now() - 1.2 * 3600 * 1000).toISOString(),
    hora_salida_contenedor: null,
    tipo_personal: 'PROPIO',
    nombre_cuadrilla: 'Equipo Almacén Shalom Turno Mañana',
    num_estibadores: 4,
    hora_llegada_cuadrilla: new Date(Date.now() - 1.1 * 3600 * 1000).toISOString(),
    hora_salida_cuadrilla: null,
    fotos: [
      {
        id: 'foto-5',
        url: 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=600&auto=format&fit=crop&q=60',
        tipo: 'LLEGADA_CAMION',
        caption: 'Camión B4V-712 ingresando a patio de maniobras',
        timestamp: new Date(Date.now() - 1.2 * 3600 * 1000).toISOString()
      },
      {
        id: 'foto-6',
        url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=60',
        tipo: 'GUIA_REMISION',
        caption: 'Guía de remisión electrónica #T002-3910',
        timestamp: new Date(Date.now() - 1.2 * 3600 * 1000).toISOString()
      }
    ],
    estado: 'EN_PATIO',
    observaciones: 'Descarga con personal propio en rampa 1.',
    created_at: new Date(Date.now() - 1.2 * 3600 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id_contenedor: 100,
    numero_contenedor: 'CMAU-110293-8',
    placa_camion: 'F9R-331',
    empresa_transporte: 'Transportes Shalom Express SAC',
    nombre_conductor: 'Manuel Ramos Quispe',
    telefono_conductor: '+51 955 432 100',
    hora_llegada_contenedor: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
    hora_salida_contenedor: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
    tipo_personal: 'CUADRILLA_EXTERNA',
    nombre_cuadrilla: 'Servicios Logísticos del Callao',
    num_estibadores: 8,
    hora_llegada_cuadrilla: new Date(Date.now() - 25.5 * 3600 * 1000).toISOString(),
    hora_salida_cuadrilla: new Date(Date.now() - 21 * 3600 * 1000).toISOString(),
    fotos: [
      {
        id: 'foto-7',
        url: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=600&auto=format&fit=crop&q=60',
        tipo: 'LLEGADA_CAMION',
        caption: 'Camión F9R-331 llegada ayer',
        timestamp: new Date(Date.now() - 26 * 3600 * 1000).toISOString()
      },
      {
        id: 'foto-8',
        url: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=600&auto=format&fit=crop&q=60',
        tipo: 'SALIDA_CAMION',
        caption: 'Contenedor completamente vacío y barrido',
        timestamp: new Date(Date.now() - 20 * 3600 * 1000).toISOString()
      }
    ],
    estado: 'DESPACHADO',
    observaciones: 'Descarga completada sin novedades. Cuadrilla laboró 4h 30m.',
    created_at: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 20 * 3600 * 1000).toISOString()
  }
]

function getLocalContainers(): ContainerRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch (err) {
    console.warn('Error leyendo contenedores de localStorage:', err)
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_CONTAINERS))
  return SEED_CONTAINERS
}

function saveLocalContainers(containers: ContainerRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(containers))
  } catch (err) {
    console.warn('Error guardando contenedores en localStorage:', err)
  }
}

export const containerService = {
  // 1. Obtener lista de contenedores con filtro
  async getContainers(filter: 'ALL' | 'ACTIVE_IN_YARD' | 'DEPARTED' = 'ALL'): Promise<ContainerRecord[]> {
    try {
      let query = supabase.from('control_contenedor').select('*').order('hora_llegada_contenedor', { ascending: false })

      if (filter === 'ACTIVE_IN_YARD') {
        query = query.is('hora_salida_contenedor', null).neq('estado', 'DESPACHADO')
      } else if (filter === 'DEPARTED') {
        query = query.not('hora_salida_contenedor', 'is', null)
      }

      const { data, error } = await query

      if (!error && data && data.length > 0) {
        return (data as any[]).map((r) => ({
          id_contenedor: Number(r.id_contenedor),
          numero_contenedor: r.numero_contenedor,
          placa_camion: r.placa_camion,
          empresa_transporte: r.empresa_transporte || '',
          nombre_conductor: r.nombre_conductor || '',
          telefono_conductor: r.telefono_conductor || '',
          hora_llegada_contenedor: r.hora_llegada_contenedor,
          hora_salida_contenedor: r.hora_salida_contenedor,
          tipo_personal: r.tipo_personal || 'PROPIO',
          nombre_cuadrilla: r.nombre_cuadrilla || '',
          num_estibadores: Number(r.num_estibadores || 0),
          hora_llegada_cuadrilla: r.hora_llegada_cuadrilla,
          hora_salida_cuadrilla: r.hora_salida_cuadrilla,
          fotos: Array.isArray(r.fotos) ? r.fotos : [],
          estado: r.estado || 'EN_PATIO',
          observaciones: r.observaciones || '',
          created_at: r.created_at,
          updated_at: r.updated_at
        }))
      }
    } catch (err) {
      console.warn('Fallo Supabase en control_contenedor, usando almacenamiento local resiliente:', err)
    }

    // Fallback local
    const local = getLocalContainers()
    if (filter === 'ACTIVE_IN_YARD') {
      return local.filter((c) => !c.hora_salida_contenedor && c.estado !== 'DESPACHADO')
    } else if (filter === 'DEPARTED') {
      return local.filter((c) => !!c.hora_salida_contenedor || c.estado === 'DESPACHADO')
    }
    return local
  },

  // 2. Obtener contenedores activos para el desplegable de Recepciones RFID (Módulo 4)
  async getActiveContainersInYard(): Promise<ContainerRecord[]> {
    return this.getContainers('ACTIVE_IN_YARD')
  },

  // 3. Registrar llegada de contenedor en garita / patio
  async createContainer(payload: NewContainerPayload): Promise<{ success: boolean; data?: ContainerRecord; error?: string }> {
    if (!payload.numero_contenedor.trim()) {
      return { success: false, error: 'El número de contenedor es obligatorio.' }
    }
    if (!payload.placa_camion.trim()) {
      return { success: false, error: 'La placa del camión es obligatoria.' }
    }

    const fotosLimitadas = (payload.fotos || []).slice(0, 10)
    const horaLlegada = payload.hora_llegada_contenedor || new Date().toISOString()

    const newRecord: ContainerRecord = {
      id_contenedor: Date.now(),
      numero_contenedor: payload.numero_contenedor.trim().toUpperCase(),
      placa_camion: payload.placa_camion.trim().toUpperCase(),
      empresa_transporte: payload.empresa_transporte?.trim() || '',
      nombre_conductor: payload.nombre_conductor?.trim() || '',
      telefono_conductor: payload.telefono_conductor?.trim() || '',
      hora_llegada_contenedor: horaLlegada,
      hora_salida_contenedor: null,
      tipo_personal: payload.tipo_personal || 'PROPIO',
      nombre_cuadrilla: payload.nombre_cuadrilla?.trim() || '',
      num_estibadores: payload.num_estibadores || 0,
      hora_llegada_cuadrilla: payload.hora_llegada_cuadrilla || null,
      hora_salida_cuadrilla: null,
      fotos: fotosLimitadas,
      estado: 'EN_PATIO',
      observaciones: payload.observaciones?.trim() || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Guardar en Supabase si está disponible
    try {
      const { data, error } = await supabase
        .from('control_contenedor')
        .insert({
          numero_contenedor: newRecord.numero_contenedor,
          placa_camion: newRecord.placa_camion,
          empresa_transporte: newRecord.empresa_transporte,
          nombre_conductor: newRecord.nombre_conductor,
          telefono_conductor: newRecord.telefono_conductor,
          hora_llegada_contenedor: newRecord.hora_llegada_contenedor,
          tipo_personal: newRecord.tipo_personal,
          nombre_cuadrilla: newRecord.nombre_cuadrilla,
          num_estibadores: newRecord.num_estibadores,
          hora_llegada_cuadrilla: newRecord.hora_llegada_cuadrilla,
          fotos: newRecord.fotos,
          estado: newRecord.estado,
          observaciones: newRecord.observaciones
        })
        .select()
        .single()

      if (!error && data) {
        newRecord.id_contenedor = Number(data.id_contenedor)
      }
    } catch (err) {
      console.warn('Advertencia insertando en Supabase, guardando en fallback local:', err)
    }

    // Actualizar almacenamiento local
    const local = getLocalContainers()
    local.unshift(newRecord)
    saveLocalContainers(local)

    return { success: true, data: newRecord }
  },

  // 4. Actualizar datos de un contenedor
  async updateContainer(id_contenedor: number, payload: UpdateContainerPayload): Promise<{ success: boolean; data?: ContainerRecord; error?: string }> {
    try {
      await supabase
        .from('control_contenedor')
        .update({
          ...payload,
          updated_at: new Date().toISOString()
        })
        .eq('id_contenedor', id_contenedor)
    } catch (err) {
      console.warn('Error en Supabase updateContainer:', err)
    }

    const local = getLocalContainers()
    const idx = local.findIndex((c) => c.id_contenedor === id_contenedor)
    if (idx !== -1) {
      local[idx] = {
        ...local[idx],
        ...payload,
        updated_at: new Date().toISOString()
      }
      saveLocalContainers(local)
      return { success: true, data: local[idx] }
    }

    return { success: false, error: 'Contenedor no encontrado.' }
  },

  // 5. Registrar llegada de cuadrilla (cuando llega después del contenedor)
  async registerCrewArrival(id_contenedor: number, hora?: string, foto?: ContainerPhoto): Promise<{ success: boolean; error?: string }> {
    const horaRegistro = hora || new Date().toISOString()
    const local = getLocalContainers()
    const item = local.find((c) => c.id_contenedor === id_contenedor)
    if (!item) return { success: false, error: 'Contenedor no encontrado.' }

    const updatedFotos = [...item.fotos]
    if (foto && updatedFotos.length < 10) {
      updatedFotos.push(foto)
    }

    return this.updateContainer(id_contenedor, {
      hora_llegada_cuadrilla: horaRegistro,
      fotos: updatedFotos
    })
  },

  // 6. Registrar salida de cuadrilla (para liquidación de horas)
  async registerCrewDeparture(id_contenedor: number, hora?: string, foto?: ContainerPhoto): Promise<{ success: boolean; error?: string }> {
    const horaRegistro = hora || new Date().toISOString()
    const local = getLocalContainers()
    const item = local.find((c) => c.id_contenedor === id_contenedor)
    if (!item) return { success: false, error: 'Contenedor no encontrado.' }

    const updatedFotos = [...item.fotos]
    if (foto && updatedFotos.length < 10) {
      updatedFotos.push(foto)
    }

    return this.updateContainer(id_contenedor, {
      hora_salida_cuadrilla: horaRegistro,
      fotos: updatedFotos
    })
  },

  // 7. Registrar salida del camión / contenedor (termina permanencia en patio)
  async registerContainerDeparture(id_contenedor: number, hora?: string, foto?: ContainerPhoto): Promise<{ success: boolean; error?: string }> {
    const horaRegistro = hora || new Date().toISOString()
    const local = getLocalContainers()
    const item = local.find((c) => c.id_contenedor === id_contenedor)
    if (!item) return { success: false, error: 'Contenedor no encontrado.' }

    const updatedFotos = [...item.fotos]
    if (foto && updatedFotos.length < 10) {
      updatedFotos.push(foto)
    }

    return this.updateContainer(id_contenedor, {
      hora_salida_contenedor: horaRegistro,
      estado: 'DESPACHADO',
      fotos: updatedFotos
    })
  },

  // 8. Agregar foto individual (hasta máx 10 fotos)
  async addPhoto(id_contenedor: number, photo: ContainerPhoto): Promise<{ success: boolean; error?: string }> {
    const local = getLocalContainers()
    const item = local.find((c) => c.id_contenedor === id_contenedor)
    if (!item) return { success: false, error: 'Contenedor no encontrado.' }

    if (item.fotos.length >= 10) {
      return { success: false, error: 'Se ha alcanzado el límite máximo permitido de 10 fotos por contenedor.' }
    }

    const updatedFotos = [...item.fotos, photo]
    return this.updateContainer(id_contenedor, { fotos: updatedFotos })
  },

  // 9. Eliminar contenedor
  async deleteContainer(id_contenedor: number): Promise<{ success: boolean; error?: string }> {
    try {
      await supabase.from('control_contenedor').delete().eq('id_contenedor', id_contenedor)
    } catch (err) {
      console.warn('Error en Supabase deleteContainer:', err)
    }

    const local = getLocalContainers().filter((c) => c.id_contenedor !== id_contenedor)
    saveLocalContainers(local)
    return { success: true }
  }
}
