# Archivos de prueba

Archivos para ejecutar las pruebas de sistema (`docs/pruebas-sistema.md`). No contienen información real.

| Archivo | Para qué se usa | Resultado esperado al subirlo |
|---|---|---|
| `apuntes-prueba-1.pdf`, `apuntes-prueba-2.pdf`, `apuntes-prueba-3.pdf` | Subidas correctas. Cada uno es distinto: la plataforma rechaza un archivo repetido (misma huella SHA-256). | Se aceptan y quedan pendientes de validación. |
| `falso.pdf` | Texto plano con extensión `.pdf`. | Se rechaza: el contenido no corresponde a la extensión. |
| `notas.txt` | Formato que la plataforma no admite. | Se rechaza por formato. |
| `grande-2mb.pdf` | PDF de unos 2 MB para probar el límite de tamaño. | Se acepta con el límite de 20 MB y se rechaza si el administrador lo baja a 1 MB. |
