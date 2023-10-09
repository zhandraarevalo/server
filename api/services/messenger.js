module.exports = {
  get: (code) => {
    return {
      internalCode: code,
      userMessage: list[code],
    };
  }
}

const list = {
  // GENERIC
  200: 'Éxito',
  201: 'Registro exitoso',
  400: 'Solicitud inválida',
  404: 'Servicio no encontrado',
  500: 'Error del servidor',

  // POLICIES
  1001: 'Solicitud de descifrado inválida',
  1002: 'Sesión activa',
  1003: 'Su sesión ha expirado',
  1004: 'Sesión no encontrada',

  // GENERAL 
  2001: 'Esquema inválido',

  // USER
  3001: 'Usuario no registrado',
  3002: 'Usuario inactivo',

  // FINANCE
  4001: 'Las transferencias deben tener misma moneda de ingreso y egreso',
}
