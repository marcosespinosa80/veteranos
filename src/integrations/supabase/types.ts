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
      carnets: {
        Row: {
          codigo: string
          created_at: string
          estado: Database["public"]["Enums"]["estado_carnet"]
          id: string
          jugador_id: string
          numero_carnet: number
          qr_token: string
          vigencia_desde: string
          vigencia_hasta: string
        }
        Insert: {
          codigo: string
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_carnet"]
          id?: string
          jugador_id: string
          numero_carnet?: number
          qr_token?: string
          vigencia_desde: string
          vigencia_hasta: string
        }
        Update: {
          codigo?: string
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_carnet"]
          id?: string
          jugador_id?: string
          numero_carnet?: number
          qr_token?: string
          vigencia_desde?: string
          vigencia_hasta?: string
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
      jugadores: {
        Row: {
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
