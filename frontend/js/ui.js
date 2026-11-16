// Muestra u oculta la contraseña con el botón del ojo
document.querySelectorAll('.campo-clave .ver').forEach((boton) => {
  boton.addEventListener('click', () => {
    const campo = boton.parentElement.querySelector('input');
    campo.type = campo.type === 'password' ? 'text' : 'password';
  });
});