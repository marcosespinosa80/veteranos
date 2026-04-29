export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      boletines_publicos: {
        Row: {
          archivo_url: string | null
          categoria_id: string
          creado_por: string
          created_at: string
          fecha_publicacion: string
          id: string
          temporada: number
          titulo: string
        }
        Insert: {
          archivo_url?: string | null
          categoria_id: string
          creado_por: string
          created_at?: string
          fecha_publicacion?: string
          id?: string
          temporada?: number
          titulo: string
        }
        Update: {
          archivo_url?: string | null
          categoria_id?: string
          creado_por?: string
          created_at?: string
          fecha_publicacion?: string
          id?: string
          temporada?: number
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "boletines_publicos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boletines_publicos_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      canchas: {
        Row: {
          club_asignado_id: string | null
          created_at: string
          direccion: string | null
          estado: string
          google_maps_url: string | null
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          club_asignado_id?: string | null
          created_at?: string
          direccion?: string | null
          estado?: string
          google_maps_url?: string | null
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          club_asignado_id?: string | null
          created_at?: string
          direccion?: string | null
          estado?: string
          google_maps_url?: string | null
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "canchas_club_asignado_id_fkey"
            columns: ["club_asignado_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
        ]
      }
      cargos: {
        Row: {
          created_at: string
          created_by: string
          descripcion: string | null
          equipo_id: string | null
          estado_pago: string
          fecha_emision: string
          fecha_vencimiento: string | null
          id: string
          jugador_id: string | null
          monto: number
          pase_id: string | null
          tarifa_id: string | null
          tipo: string
        }
        Insert: {
          created_at?: string
          created_by: string
          descripcion?: string | null
          equipo_id?: string | null
          estado_pago?: string
          fecha_emision?: string
          fecha_vencimiento?: string | null
          id?: string
          jugador_id?: string | null
          monto: number
          pase_id?: string | null
          tarifa_id?: string | null
          tipo: string
        }
        Update: {
          created_at?: string
          created_by?: string
          descripcion?: string | null
          equipo_id?: string | null
          estado_pago?: string
          fecha_emision?: string
          fecha_vencimiento?: string | null
          id?: string
          jugador_id?: string | null
          monto?: number
          pase_id?: string | null
          tarifa_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "cargos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargos_equipo_id_fkey"
            columns: ["equipo_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargos_jugador_id_fkey"
            columns: ["jugador_id"]
            isOneToOne: false
            referencedRelation: "jugadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargos_pase_id_fkey"
            columns: ["pase_id"]
            isOneToOne: false
            referencedRelation: "pases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargos_tarifa_id_fkey"
            columns: ["tarifa_id"]
            isOneToOne: false
            referencedRelation: "tarifas"
            referencedColumns: ["id"]
          },
        ]
      }
      carnets: {
        Row: {
          codigo: string
          created_at: string
          estado: Database["public"]["Enums"]["estado_carnet"]
          id: string
          jugador_id: string
          numero_carnet: number
          qr_token: string
          vigencia_desde: string | null
          vigencia_hasta: string | null
        }
        Insert: {
          codigo: string
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_carnet"]
          id?: string
          jugador_id: string
          numero_carnet?: number
          qr_token?: string
          vigencia_desde?: string | null
          vigencia_hasta?: string | null
        }
        Update: {
          codigo?: string
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_carnet"]
          id?: string
          jugador_id?: string
          numero_carnet?: number
          qr_token?: string
          vigencia_desde?: string | null
          vigencia_hasta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "carnets_jugador_id_fkey"
            columns: ["jugador_id"]
            isOneToOne: true
            referencedRelation: "jugadores"
            referencedColumns: ["id"]
          },
        ]
      }
      categoria_reglas_2026: {
        Row: {
          anio_nacimiento_desde: number
          anio_nacimiento_hasta: number
          categoria_id: string
          id: string
        }
        Insert: {
          anio_nacimiento_desde: number
          anio_nacimiento_hasta: number
          categoria_id: string
          id?: string
        }
        Update: {
          anio_nacimiento_desde?: number
          anio_nacimiento_hasta?: number
          categoria_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categoria_reglas_2026_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias: {
        Row: {
          id: string
          nombre_categoria: string
        }
        Insert: {
          id?: string
          nombre_categoria: string
        }
        Update: {
          id?: string
          nombre_categoria?: string
        }
        Relationships: []
      }
      equipo_categoria: {
        Row: {
          categoria_id: string
          equipo_id: string
          id: string
          temporada: number
        }
        Insert: {
          categoria_id: string
          equipo_id: string
          id?: string
          temporada?: number
        }
        Update: {
          categoria_id?: string
          equipo_id?: string
          id?: string
          temporada?: number
        }
        Relationships: [
          {
            foreignKeyName: "equipo_categoria_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipo_categoria_equipo_id_fkey"
            columns: ["equipo_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
        ]
      }
      equipos: {
        Row: {
          cancha: string | null
          created_at: string
          delegado_1: string | null
          delegado_2: string | null
          estado: Database["public"]["Enums"]["estado_equipo"]
          id: string
          nombre_equipo: string
          updated_at: string
        }
        Insert: {
          cancha?: string | null
          created_at?: string
          delegado_1?: string | null
          delegado_2?: string | null
          estado?: Database["public"]["Enums"]["estado_equipo"]
          id?: string
          nombre_equipo: string
          updated_at?: string
        }
        Update: {
          cancha?: string | null
          created_at?: string
          delegado_1?: string | null
          delegado_2?: string | null
          estado?: Database["public"]["Enums"]["estado_equipo"]
          id?: string
          nombre_equipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipos_delegado_1_jugador_fkey"
            columns: ["delegado_1"]
            isOneToOne: false
            referencedRelation: "jugadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipos_delegado_2_jugador_fkey"
            columns: ["delegado_2"]
            isOneToOne: false
            referencedRelation: "jugadores"
            referencedColumns: ["id"]
          },
        ]
      }
      fechas_torneo: {
        Row: {
          created_at: string
          fase: string
          fecha_calendario: string | null
          id: string
          nombre: string | null
          numero: number
          torneo_categoria_id: string
          zona_id: string | null
        }
        Insert: {
          created_at?: string
          fase?: string
          fecha_calendario?: string | null
          id?: string
          nombre?: string | null
          numero: number
          torneo_categoria_id: string
          zona_id?: string | null
        }
        Update: {
          created_at?: string
          fase?: string
          fecha_calendario?: string | null
          id?: string
          nombre?: string | null
          numero?: number
          torneo_categoria_id?: string
          zona_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fechas_torneo_torneo_categoria_id_fkey"
            columns: ["torneo_categoria_id"]
            isOneToOne: false
            referencedRelation: "torneo_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fechas_torneo_zona_id_fkey"
            columns: ["zona_id"]
            isOneToOne: false
            referencedRelation: "zonas"
            referencedColumns: ["id"]
          },
        ]
      }
      goles_jugador: {
        Row: {
          cantidad: number
          created_at: string
          equipo_id: string
          id: string
          jugador_id: string
          partido_id: string
        }
        Insert: {
          cantidad?: number
          created_at?: string
          equipo_id: string
          id?: string
          jugador_id: string
          partido_id: string
        }
        Update: {
          cantidad?: number
          created_at?: string
          equipo_id?: string
          id?: string
          jugador_id?: string
          partido_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goles_jugador_equipo_id_fkey"
            columns: ["equipo_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goles_jugador_jugador_id_fkey"
            columns: ["jugador_id"]
            isOneToOne: false
            referencedRelation: "jugadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goles_jugador_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "partidos"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_torneos: {
        Row: {
          campeon_equipo_id: string | null
          categoria_id: string
          created_at: string
          datos_finales: Json | null
          goleador_jugador_id: string | null
          id: string
          subcampeon_equipo_id: string | null
          torneo_id: string
        }
        Insert: {
          campeon_equipo_id?: string | null
          categoria_id: string
          created_at?: string
          datos_finales?: Json | null
          goleador_jugador_id?: string | null
          id?: string
          subcampeon_equipo_id?: string | null
          torneo_id: string
        }
        Update: {
          campeon_equipo_id?: string | null
          categoria_id?: string
          created_at?: string
          datos_finales?: Json | null
          goleador_jugador_id?: string | null
          id?: string
          subcampeon_equipo_id?: string | null
          torneo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_torneos_campeon_equipo_id_fkey"
            columns: ["campeon_equipo_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_torneos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_torneos_goleador_jugador_id_fkey"
            columns: ["goleador_jugador_id"]
            isOneToOne: false
            referencedRelation: "jugadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_torneos_subcampeon_equipo_id_fkey"
            columns: ["subcampeon_equipo_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_torneos_torneo_id_fkey"
            columns: ["torneo_id"]
            isOneToOne: false
            referencedRelation: "torneos"
            referencedColumns: ["id"]
          },
        ]
      }
      jugadores: {
        Row: {
          activo_club: boolean
          apellido: string
          apto_medico: boolean
          categoria_id: string | null
          created_at: string
          direccion: string | null
          dni: string
          equipo_id: string | null
          es_delegado: boolean
          estado: Database["public"]["Enums"]["estado_jugador"]
          fecha_nacimiento: string
          foto_url: string | null
          id: string
          nombre: string
          suspendido_fechas: number
          telefono: string | null
          updated_at: string
        }
        Insert: {
          activo_club?: boolean
          apellido: string
          apto_medico?: boolean
          categoria_id?: string | null
          created_at?: string
          direccion?: string | null
          dni: string
          equipo_id?: string | null
          es_delegado?: boolean
          estado?: Database["public"]["Enums"]["estado_jugador"]
          fecha_nacimiento: string
          foto_url?: string | null
          id?: string
          nombre: string
          suspendido_fechas?: number
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          activo_club?: boolean
          apellido?: string
          apto_medico?: boolean
          categoria_id?: string | null
          created_at?: string
          direccion?: string | null
          dni?: string
          equipo_id?: string | null
          es_delegado?: boolean
          estado?: Database["public"]["Enums"]["estado_jugador"]
          fecha_nacimiento?: string
          foto_url?: string | null
          id?: string
          nombre?: string
          suspendido_fechas?: number
          telefono?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jugadores_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jugadores_equipo_id_fkey"
            columns: ["equipo_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
        ]
      }
      lista_buena_fe_items: {
        Row: {
          estado_item: Database["public"]["Enums"]["estado_item_lista"]
          id: string
          jugador_id: string
          lista_id: string
        }
        Insert: {
          estado_item?: Database["public"]["Enums"]["estado_item_lista"]
          id?: string
          jugador_id: string
          lista_id: string
        }
        Update: {
          estado_item?: Database["public"]["Enums"]["estado_item_lista"]
          id?: string
          jugador_id?: string
          lista_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lista_buena_fe_items_jugador_id_fkey"
            columns: ["jugador_id"]
            isOneToOne: false
            referencedRelation: "jugadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lista_buena_fe_items_lista_id_fkey"
            columns: ["lista_id"]
            isOneToOne: false
            referencedRelation: "listas_buena_fe"
            referencedColumns: ["id"]
          },
        ]
      }
      listas_buena_fe: {
        Row: {
          aprobada_por: string | null
          categoria_id: string
          cerrada: boolean
          creada_por: string
          created_at: string
          equipo_id: string
          estado: Database["public"]["Enums"]["estado_lista"]
          fecha_aprobacion: string | null
          fecha_envio: string | null
          fecha_firma: string | null
          firmada: boolean
          id: string
          motivo_observacion: string | null
          motivo_rechazo: string | null
          temporada: number
          updated_at: string
        }
        Insert: {
          aprobada_por?: string | null
          categoria_id: string
          cerrada?: boolean
          creada_por: string
          created_at?: string
          equipo_id: string
          estado?: Database["public"]["Enums"]["estado_lista"]
          fecha_aprobacion?: string | null
          fecha_envio?: string | null
          fecha_firma?: string | null
          firmada?: boolean
          id?: string
          motivo_observacion?: string | null
          motivo_rechazo?: string | null
          temporada?: number
          updated_at?: string
        }
        Update: {
          aprobada_por?: string | null
          categoria_id?: string
          cerrada?: boolean
          creada_por?: string
          created_at?: string
          equipo_id?: string
          estado?: Database["public"]["Enums"]["estado_lista"]
          fecha_aprobacion?: string | null
          fecha_envio?: string | null
          fecha_firma?: string | null
          firmada?: boolean
          id?: string
          motivo_observacion?: string | null
          motivo_rechazo?: string | null
          temporada?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listas_buena_fe_aprobada_por_fkey"
            columns: ["aprobada_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listas_buena_fe_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listas_buena_fe_creada_por_fkey"
            columns: ["creada_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listas_buena_fe_equipo_id_fkey"
            columns: ["equipo_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
        ]
      }
      pago_items: {
        Row: {
          cargo_id: string
          id: string
          monto_aplicado: number
          pago_id: string
        }
        Insert: {
          cargo_id: string
          id?: string
          monto_aplicado: number
          pago_id: string
        }
        Update: {
          cargo_id?: string
          id?: string
          monto_aplicado?: number
          pago_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pago_items_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pago_items_pago_id_fkey"
            columns: ["pago_id"]
            isOneToOne: false
            referencedRelation: "pagos"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos: {
        Row: {
          created_at: string
          fecha_pago: string
          id: string
          medio_pago: string
          monto_total: number
          observaciones: string | null
          referencia: string | null
          registrado_por: string
        }
        Insert: {
          created_at?: string
          fecha_pago?: string
          id?: string
          medio_pago: string
          monto_total: number
          observaciones?: string | null
          referencia?: string | null
          registrado_por: string
        }
        Update: {
          created_at?: string
          fecha_pago?: string
          id?: string
          medio_pago?: string
          monto_total?: number
          observaciones?: string | null
          referencia?: string | null
          registrado_por?: string
        }
        Relationships: [
          {
            foreignKeyName: "pagos_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partido_auditoria: {
        Row: {
          accion: string
          cambiado_por: string | null
          created_at: string
          datos_anteriores: Json | null
          datos_nuevos: Json | null
          id: string
          motivo: string | null
          partido_id: string
        }
        Insert: {
          accion: string
          cambiado_por?: string | null
          created_at?: string
          datos_anteriores?: Json | null
          datos_nuevos?: Json | null
          id?: string
          motivo?: string | null
          partido_id: string
        }
        Update: {
          accion?: string
          cambiado_por?: string | null
          created_at?: string
          datos_anteriores?: Json | null
          datos_nuevos?: Json | null
          id?: string
          motivo?: string | null
          partido_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partido_auditoria_cambiado_por_fkey"
            columns: ["cambiado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partido_auditoria_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "partidos"
            referencedColumns: ["id"]
          },
        ]
      }
      partidos: {
        Row: {
          arbitro_user_id: string | null
          cancha_id: string | null
          cancha_texto: string | null
          categoria_id: string
          created_at: string
          dia: string | null
          equipo_libre_id: string | null
          equipo_local_id: string | null
          equipo_visitante_id: string | null
          estado: string
          fase: string
          fecha_numero: number | null
          fecha_torneo_id: string | null
          ganador_id: string | null
          goles_local: number | null
          goles_visitante: number | null
          hora: string | null
          hubo_penales: boolean
          id: string
          penales_local: number | null
          penales_visitante: number | null
          torneo_categoria_id: string
          torneo_id: string
          updated_at: string
          zona_id: string | null
        }
        Insert: {
          arbitro_user_id?: string | null
          cancha_id?: string | null
          cancha_texto?: string | null
          categoria_id: string
          created_at?: string
          dia?: string | null
          equipo_libre_id?: string | null
          equipo_local_id?: string | null
          equipo_visitante_id?: string | null
          estado?: string
          fase?: string
          fecha_numero?: number | null
          fecha_torneo_id?: string | null
          ganador_id?: string | null
          goles_local?: number | null
          goles_visitante?: number | null
          hora?: string | null
          hubo_penales?: boolean
          id?: string
          penales_local?: number | null
          penales_visitante?: number | null
          torneo_categoria_id: string
          torneo_id: string
          updated_at?: string
          zona_id?: string | null
        }
        Update: {
          arbitro_user_id?: string | null
          cancha_id?: string | null
          cancha_texto?: string | null
          categoria_id?: string
          created_at?: string
          dia?: string | null
          equipo_libre_id?: string | null
          equipo_local_id?: string | null
          equipo_visitante_id?: string | null
          estado?: string
          fase?: string
          fecha_numero?: number | null
          fecha_torneo_id?: string | null
          ganador_id?: string | null
          goles_local?: number | null
          goles_visitante?: number | null
          hora?: string | null
          hubo_penales?: boolean
          id?: string
          penales_local?: number | null
          penales_visitante?: number | null
          torneo_categoria_id?: string
          torneo_id?: string
          updated_at?: string
          zona_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partidos_arbitro_user_id_fkey"
            columns: ["arbitro_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partidos_cancha_id_fkey"
            columns: ["cancha_id"]
            isOneToOne: false
            referencedRelation: "canchas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partidos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partidos_equipo_libre_id_fkey"
            columns: ["equipo_libre_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partidos_equipo_local_id_fkey"
            columns: ["equipo_local_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partidos_equipo_visitante_id_fkey"
            columns: ["equipo_visitante_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partidos_fecha_torneo_id_fkey"
            columns: ["fecha_torneo_id"]
            isOneToOne: false
            referencedRelation: "fechas_torneo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partidos_ganador_id_fkey"
            columns: ["ganador_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partidos_torneo_categoria_id_fkey"
            columns: ["torneo_categoria_id"]
            isOneToOne: false
            referencedRelation: "torneo_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partidos_torneo_id_fkey"
            columns: ["torneo_id"]
            isOneToOne: false
            referencedRelation: "torneos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partidos_zona_id_fkey"
            columns: ["zona_id"]
            isOneToOne: false
            referencedRelation: "zonas"
            referencedColumns: ["id"]
          },
        ]
      }
      pases: {
        Row: {
          archivo_formulario_url: string | null
          categoria_id: string | null
          club_destino_id: string
          club_origen_id: string
          created_at: string
          estado: Database["public"]["Enums"]["estado_pase"]
          fecha_aprobacion: string | null
          fecha_habilitacion: string | null
          fecha_inicio: string
          id: string
          iniciado_por: string
          jugador_id: string
          monto: number | null
          motivo_observacion: string | null
          motivo_rechazo: string | null
          pago_registrado: boolean
          recibo_url: string | null
          revisado_por: string | null
          updated_at: string
        }
        Insert: {
          archivo_formulario_url?: string | null
          categoria_id?: string | null
          club_destino_id: string
          club_origen_id: string
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_pase"]
          fecha_aprobacion?: string | null
          fecha_habilitacion?: string | null
          fecha_inicio?: string
          id?: string
          iniciado_por: string
          jugador_id: string
          monto?: number | null
          motivo_observacion?: string | null
          motivo_rechazo?: string | null
          pago_registrado?: boolean
          recibo_url?: string | null
          revisado_por?: string | null
          updated_at?: string
        }
        Update: {
          archivo_formulario_url?: string | null
          categoria_id?: string | null
          club_destino_id?: string
          club_origen_id?: string
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_pase"]
          fecha_aprobacion?: string | null
          fecha_habilitacion?: string | null
          fecha_inicio?: string
          id?: string
          iniciado_por?: string
          jugador_id?: string
          monto?: number | null
          motivo_observacion?: string | null
          motivo_rechazo?: string | null
          pago_registrado?: boolean
          recibo_url?: string | null
          revisado_por?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pases_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pases_club_destino_id_fkey"
            columns: ["club_destino_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pases_club_origen_id_fkey"
            columns: ["club_origen_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pases_iniciado_por_fkey"
            columns: ["iniciado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pases_jugador_id_fkey"
            columns: ["jugador_id"]
            isOneToOne: false
            referencedRelation: "jugadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pases_revisado_por_fkey"
            columns: ["revisado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      planilla_arbitral: {
        Row: {
          arbitro_user_id: string | null
          created_at: string
          enviada: boolean
          fecha_envio: string | null
          id: string
          observaciones: string | null
          partido_id: string
          updated_at: string
        }
        Insert: {
          arbitro_user_id?: string | null
          created_at?: string
          enviada?: boolean
          fecha_envio?: string | null
          id?: string
          observaciones?: string | null
          partido_id: string
          updated_at?: string
        }
        Update: {
          arbitro_user_id?: string | null
          created_at?: string
          enviada?: boolean
          fecha_envio?: string | null
          id?: string
          observaciones?: string | null
          partido_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planilla_arbitral_arbitro_user_id_fkey"
            columns: ["arbitro_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planilla_arbitral_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: true
            referencedRelation: "partidos"
            referencedColumns: ["id"]
          },
        ]
      }
      planilla_arbitral_items: {
        Row: {
          amarillas: number
          created_at: string
          equipo_id: string
          expulsado: boolean
          goles: number
          id: string
          jugador_id: string
          observaciones: string | null
          planilla_id: string
          rojas: number
        }
        Insert: {
          amarillas?: number
          created_at?: string
          equipo_id: string
          expulsado?: boolean
          goles?: number
          id?: string
          jugador_id: string
          observaciones?: string | null
          planilla_id: string
          rojas?: number
        }
        Update: {
          amarillas?: number
          created_at?: string
          equipo_id?: string
          expulsado?: boolean
          goles?: number
          id?: string
          jugador_id?: string
          observaciones?: string | null
          planilla_id?: string
          rojas?: number
        }
        Relationships: [
          {
            foreignKeyName: "planilla_arbitral_items_equipo_id_fkey"
            columns: ["equipo_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planilla_arbitral_items_jugador_id_fkey"
            columns: ["jugador_id"]
            isOneToOne: false
            referencedRelation: "jugadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planilla_arbitral_items_planilla_id_fkey"
            columns: ["planilla_id"]
            isOneToOne: false
            referencedRelation: "planilla_arbitral"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          activo: boolean
          apellido: string
          created_at: string
          email: string | null
          equipo_id: string | null
          id: string
          nombre: string
          updated_at: string
          username: string | null
        }
        Insert: {
          activo?: boolean
          apellido?: string
          created_at?: string
          email?: string | null
          equipo_id?: string | null
          id: string
          nombre?: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          activo?: boolean
          apellido?: string
          created_at?: string
          email?: string | null
          equipo_id?: string | null
          id?: string
          nombre?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_equipo"
            columns: ["equipo_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
        ]
      }
      tabla_posiciones_snapshot: {
        Row: {
          created_at: string
          dg: number
          equipo_id: string
          gc: number
          gf: number
          id: string
          orden: number
          pe: number
          pg: number
          pj: number
          pp: number
          pts: number
          tipo: string
          torneo_categoria_id: string
          zona_id: string | null
        }
        Insert: {
          created_at?: string
          dg?: number
          equipo_id: string
          gc?: number
          gf?: number
          id?: string
          orden?: number
          pe?: number
          pg?: number
          pj?: number
          pp?: number
          pts?: number
          tipo: string
          torneo_categoria_id: string
          zona_id?: string | null
        }
        Update: {
          created_at?: string
          dg?: number
          equipo_id?: string
          gc?: number
          gf?: number
          id?: string
          orden?: number
          pe?: number
          pg?: number
          pj?: number
          pp?: number
          pts?: number
          tipo?: string
          torneo_categoria_id?: string
          zona_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tabla_posiciones_snapshot_equipo_id_fkey"
            columns: ["equipo_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tabla_posiciones_snapshot_torneo_categoria_id_fkey"
            columns: ["torneo_categoria_id"]
            isOneToOne: false
            referencedRelation: "torneo_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tabla_posiciones_snapshot_zona_id_fkey"
            columns: ["zona_id"]
            isOneToOne: false
            referencedRelation: "zonas"
            referencedColumns: ["id"]
          },
        ]
      }
      tarifas: {
        Row: {
          created_at: string
          descripcion: string | null
          estado: string
          fecha_fin: string | null
          fecha_inicio: string
          id: string
          monto: number
          temporada: number
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          estado?: string
          fecha_fin?: string | null
          fecha_inicio?: string
          id?: string
          monto: number
          temporada?: number
          tipo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          estado?: string
          fecha_fin?: string | null
          fecha_inicio?: string
          id?: string
          monto?: number
          temporada?: number
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      temporadas: {
        Row: {
          anio: number
          created_at: string
          estado: string
          id: string
        }
        Insert: {
          anio: number
          created_at?: string
          estado?: string
          id?: string
        }
        Update: {
          anio?: number
          created_at?: string
          estado?: string
          id?: string
        }
        Relationships: []
      }
      torneo_categorias: {
        Row: {
          cantidad_zonas: number | null
          categoria_id: string
          clasificacion_config: Json | null
          created_at: string
          estado: string
          id: string
          max_equipos_zona: number
          min_equipos_zona: number
          torneo_id: string
          updated_at: string
        }
        Insert: {
          cantidad_zonas?: number | null
          categoria_id: string
          clasificacion_config?: Json | null
          created_at?: string
          estado?: string
          id?: string
          max_equipos_zona?: number
          min_equipos_zona?: number
          torneo_id: string
          updated_at?: string
        }
        Update: {
          cantidad_zonas?: number | null
          categoria_id?: string
          clasificacion_config?: Json | null
          created_at?: string
          estado?: string
          id?: string
          max_equipos_zona?: number
          min_equipos_zona?: number
          torneo_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "torneo_categorias_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "torneo_categorias_torneo_id_fkey"
            columns: ["torneo_id"]
            isOneToOne: false
            referencedRelation: "torneos"
            referencedColumns: ["id"]
          },
        ]
      }
      torneo_equipos: {
        Row: {
          created_at: string
          equipo_id: string
          id: string
          origen_referencia: string | null
          posicion_referencia: number | null
          torneo_categoria_id: string
        }
        Insert: {
          created_at?: string
          equipo_id: string
          id?: string
          origen_referencia?: string | null
          posicion_referencia?: number | null
          torneo_categoria_id: string
        }
        Update: {
          created_at?: string
          equipo_id?: string
          id?: string
          origen_referencia?: string | null
          posicion_referencia?: number | null
          torneo_categoria_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "torneo_equipos_equipo_id_fkey"
            columns: ["equipo_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "torneo_equipos_torneo_categoria_id_fkey"
            columns: ["torneo_categoria_id"]
            isOneToOne: false
            referencedRelation: "torneo_categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      torneos: {
        Row: {
          created_at: string
          estado: string
          id: string
          nombre: string
          temporada_id: string
          torneo_referencia_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          estado?: string
          id?: string
          nombre: string
          temporada_id: string
          torneo_referencia_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          estado?: string
          id?: string
          nombre?: string
          temporada_id?: string
          torneo_referencia_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "torneos_temporada_id_fkey"
            columns: ["temporada_id"]
            isOneToOne: false
            referencedRelation: "temporadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "torneos_torneo_referencia_id_fkey"
            columns: ["torneo_referencia_id"]
            isOneToOne: false
            referencedRelation: "torneos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_module_permissions: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          module_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          module_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          module_key?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      zona_equipos: {
        Row: {
          created_at: string
          equipo_id: string
          id: string
          orden: number
          zona_id: string
        }
        Insert: {
          created_at?: string
          equipo_id: string
          id?: string
          orden?: number
          zona_id: string
        }
        Update: {
          created_at?: string
          equipo_id?: string
          id?: string
          orden?: number
          zona_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zona_equipos_equipo_id_fkey"
            columns: ["equipo_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zona_equipos_zona_id_fkey"
            columns: ["zona_id"]
            isOneToOne: false
            referencedRelation: "zonas"
            referencedColumns: ["id"]
          },
        ]
      }
      zonas: {
        Row: {
          created_at: string
          id: string
          nombre: string
          orden: number
          torneo_categoria_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nombre: string
          orden?: number
          torneo_categoria_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nombre?: string
          orden?: number
          torneo_categoria_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zonas_torneo_categoria_id_fkey"
            columns: ["torneo_categoria_id"]
            isOneToOne: false
            referencedRelation: "torneo_categorias"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      deuda_equipo: {
        Row: {
          cantidad_cargos: number | null
          deuda_pendiente: number | null
          equipo_id: string | null
          nombre_equipo: string | null
          total_cargos: number | null
          total_pagado: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cargos_equipo_id_fkey"
            columns: ["equipo_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
        ]
      }
      deuda_jugador: {
        Row: {
          apellido: string | null
          cantidad_cargos: number | null
          deuda_pendiente: number | null
          dni: string | null
          jugador_id: string | null
          nombre: string | null
          total_cargos: number | null
          total_pagado: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cargos_jugador_id_fkey"
            columns: ["jugador_id"]
            isOneToOne: false
            referencedRelation: "jugadores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      avanzar_temporada: { Args: never; Returns: undefined }
      calcular_categoria: {
        Args: { p_fecha_nacimiento: string }
        Returns: string
      }
      get_user_equipo_id: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin_general"
        | "admin_comun"
        | "delegado"
        | "arbitro"
        | "tribunal"
      estado_carnet: "activo" | "inactivo"
      estado_equipo: "activo" | "inactivo"
      estado_item_lista: "incluido" | "baja"
      estado_jugador: "habilitado" | "no_habilitado" | "expulsado"
      estado_lista:
        | "borrador"
        | "enviada"
        | "observada"
        | "aprobada"
        | "rechazada"
      estado_pase:
        | "iniciado"
        | "pendiente_firmas"
        | "revision_liga"
        | "observado"
        | "rechazado"
        | "aprobado"
        | "pendiente_pago"
        | "habilitado"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin_general",
        "admin_comun",
        "delegado",
        "arbitro",
        "tribunal",
      ],
      estado_carnet: ["activo", "inactivo"],
      estado_equipo: ["activo", "inactivo"],
      estado_item_lista: ["incluido", "baja"],
      estado_jugador: ["habilitado", "no_habilitado", "expulsado"],
      estado_lista: [
        "borrador",
        "enviada",
        "observada",
        "aprobada",
        "rechazada",
      ],
      estado_pase: [
        "iniciado",
        "pendiente_firmas",
        "revision_liga",
        "observado",
        "rechazado",
        "aprobado",
        "pendiente_pago",
        "habilitado",
      ],
    },
  },
} as const
