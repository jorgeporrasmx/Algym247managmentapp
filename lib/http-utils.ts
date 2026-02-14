export class HTTPError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string
  ) {
    super(message);
    this.name = 'HTTPError';
  }
}

export async function fetchWithErrorHandling(
  url: string,
  options?: RequestInit
): Promise<Response> {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new HTTPError(
        `HTTP Error ${response.status}: ${response.statusText}`,
        response.status,
        response.statusText
      );
    }
    
    return response;
  } catch (error) {
    if (error instanceof HTTPError) {
      throw error;
    }
    
    if (error instanceof TypeError) {
      throw new Error('Error de red. Por favor, verifica tu conexión.');
    }
    
    throw new Error('Error inesperado al realizar la solicitud.');
  }
}

export async function fetchJSON<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetchWithErrorHandling(url, options);
  
  try {
    return await response.json();
  } catch (_error) {
    throw new Error('Error al procesar la respuesta del servidor.');
  }
}

export function handleAPIError(error: unknown): string {
  if (error instanceof HTTPError) {
    switch (error.status) {
      case 400:
        return 'Solicitud inválida. Por favor, verifica los datos ingresados.';
      case 401:
        return 'No autorizado. Por favor, inicia sesión nuevamente.';
      case 403:
        return 'Sin permisos para realizar esta acción.';
      case 404:
        return 'Recurso no encontrado.';
      case 500:
        return 'Error del servidor. Por favor, intenta más tarde.';
      default:
        return `Error: ${error.message}`;
    }
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'Error desconocido. Por favor, intenta nuevamente.';
}