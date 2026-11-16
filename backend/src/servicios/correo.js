// Servicio de correo SIMULADO: imprime el mensaje en la consola del servidor.
// En producción se sustituiría por un envío SMTP con la misma función enviar().
function crearServicioCorreo() {
  return {
    async enviar({ para, asunto, texto }) {
      console.log('\n----- CORREO SIMULADO -----');
      console.log(`Para: ${para}`);
      console.log(`Asunto: ${asunto}`);
      console.log(texto);
      console.log('---------------------------\n');
    },
  };
}

module.exports = { crearServicioCorreo };