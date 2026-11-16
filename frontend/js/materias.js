const NOMBRES_SEMESTRE = ['Primero', 'Segundo', 'Tercero', 'Cuarto', 'Quinto', 'Sexto', 'Séptimo', 'Octavo'];

// Dibuja las tarjetas de materias dentro del contenedor
function dibujarMaterias(contenedor, materias) {
  contenedor.replaceChildren();
  if (materias.length === 0) {
    contenedor.appendChild(elemento('p', 'vacio', 'No hay materias para mostrar.'));
    return;
  }
  materias.forEach((materia) => {
    const tarjeta = elemento('div', 'materia');
    tarjeta.appendChild(elemento('h3', '', materia.nombre));
    tarjeta.appendChild(elemento('div', 'clave', `Clave: ${materia.clave}`));
    tarjeta.appendChild(elemento('div', 'cantidad', `📚 ${materia.archivos} archivo(s) disponible(s)`));
    contenedor.appendChild(tarjeta);
  });
}