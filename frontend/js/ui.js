// Muestra u oculta la contraseña con el botón del ojo
function activarVerContrasena(raiz = document) {
  raiz.querySelectorAll('.campo-clave .ver').forEach((boton) => {
    boton.addEventListener('click', () => {
      const campo = boton.parentElement.querySelector('input');
      campo.type = campo.type === 'password' ? 'text' : 'password';
    });
  });
}
activarVerContrasena();