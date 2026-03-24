# Importar y Exportar Clientes - Guía de Uso

## Importar Clientes

### ¿Cómo funciona?

La aplicación permite importar clientes desde archivos en los siguientes formatos:

- **CSV** (.csv)
- **Excel** (.xlsx, .xls)

### Pasos para importar

1. Haz clic en el botón **"Importar clientes"** en la página de clientes
2. Selecciona el archivo que contiene la información de tus clientes
3. La aplicación automáticamente:
   - Detecta el formato del archivo
   - Extrae los datos
   - Intenta mapear columnas automáticamente
4. Revisa el mapeo de columnas en la ventana emergente:
   - **Nombre*** (obligatorio): Nombre del cliente
   - **Teléfono**: Número de teléfono
   - **Cédula**: Documento de identidad
   - **Dirección**: Dirección del cliente
5. Si el mapeo automático no es correcto, ajusta usando los selectores
6. Haz clic en **"Importar"** para guardar los clientes en la base de datos

## Formato de archivo recomendado

### CSV

```csv
Nombre,Teléfono,Cédula,Dirección
Juan Pérez,0999123456,1234567890,Calle Principal 123
María García,0998234567,0987654321,Av. Amazonas 456
```

### Excel

Crea una hoja de cálculo con columnas: Nombre, Teléfono, Cédula, Dirección

## Validaciones

- **Campo Nombre es obligatorio**: Sin nombre no se importará el cliente
- **Otros campos son opcionales**: Teléfono, cédula y dirección son opcionales
- **Duplicados**: El sistema no previene duplicados automáticamente
- **Máximo de filas**: Puedes importar cientos de clientes en una sola operación

## Archivo de ejemplo

Se incluye un archivo `ejemplo_clientes.csv` que puedes usar como referencia para preparar tus datos.

## Soporte

Si encuentras problemas al importar:

- Verifica que el archivo no esté dañado
- Asegúrate de que tenga datos en las columnas
- Prueba con el archivo de ejemplo primero

---

## Exportar Clientes

La aplicación permite exportar todos tus clientes a diferentes formatos para hacer respaldos o trabajar con ellos en otras aplicaciones:

- **CSV** (.csv) - Formato de texto simple, compatible con Excel y otros
- **Excel** (.xlsx) - Libro de Excel con formato profesional

### Pasos para exportar

1. Ve a la página de **Clientes**
2. Haz clic en el botón **"Exportar clientes"**
3. Se abrirá una ventana modal mostrando los 2 formatos disponibles
4. Elige el formato que deseas:
   - Haz clic en **"Exportar como CSV"** para un archivo de texto separado por comas
   - Haz clic en **"Exportar como Excel"** para un libro de Excel
5. El archivo se descargará automáticamente con la fecha en el nombre

### Información exportada

Cada archivo exportado contiene los siguientes campos de tus clientes:

- **Nombre**: Nombre completo del cliente
- **Teléfono**: Número de teléfono
- **Cédula**: Documento de identidad
- **Dirección**: Dirección del cliente

### Nombres de archivo

Los archivos exportados se guardan con el siguiente formato de nombre:

```text
clientes_YYYY-MM-DD.csv
clientes_YYYY-MM-DD.xlsx
```

Por ejemplo: `clientes_2026-03-24.csv`

### Casos de uso

**CSV**:

- Importar a otros sistemas
- Análisis de datos
- Backup simple de texto

**Excel**:

- Análisis avanzado
- Filtrado y ordenamiento
- Cálculos adicionales
- Formato profesional

### Recomendaciones

- **Realiza respaldos regularmente** exportando tus clientes
- **Usa Excel** para análisis y gestión de datos
- **Usa CSV** para integración con otros sistemas
- **Guarda los archivos** en un lugar seguro como backup

### Tamaño máximo

No hay límite de clientes para exportar. Puedes exportar cientos o miles de clientes en un solo archivo.

---

## Preguntas frecuentes

**P: ¿Puedo exportar solo algunos clientes?**
R: Actualmente se exportan todos los clientes. Si necesitas seleccionar específicos, puedes editar el archivo después de exportarlo.

**P: ¿Los datos de clientes eliminados se incluyen en la exportación?**
R: No, solo se exportan los clientes activos en la aplicación.

**P: ¿Qué pasa si tengo muchos clientes?**
R: Puedes exportar cualquier cantidad de clientes sin problemas. El archivo se generará según el formato elegido.

**P: ¿Dónde se guardan los archivos descargados?**
R: Los archivos se guardan en tu carpeta de Descargas del navegador, según tu configuración habitual de descargas.
