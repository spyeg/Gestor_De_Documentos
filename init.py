# __init__.py para vigilante_pdfs
from .vigilante import (
    extraer_texto,
    trocear_texto,
    generar_embedding,
    insertar_documento_supabase,
    borrar_documentos_supabase,
    obtener_ruta_wordpress,
    EXTENSIONES,
    LIMITE_MB,
    CARPETA_ORIGINALES,
    CARPETA_BORRADORES,
    CARPETA_HISTORICO,
    guardar_registro,
    cargar_registro,
    calcular_hash_archivo
)

__all__ = [
    'extraer_texto',
    'trocear_texto',
    'generar_embedding',
    'insertar_documento_supabase',
    'borrar_documentos_supabase',
    'obtener_ruta_wordpress',
    'EXTENSIONES',
    'LIMITE_MB',
    'CARPETA_ORIGINALES',
    'CARPETA_BORRADORES',
    'CARPETA_HISTORICO',
    'guardar_registro',
    'cargar_registro',
    'calcular_hash_archivo'
]