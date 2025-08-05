# IP Scanner

**IP Scanner** es una aplicación web ligera para escanear rangos de IP en redes locales y detectar dispositivos activos. Muestra el estado de cada IP, tiempo de respuesta y nombre de host cuando está disponible. Utiliza caché para optimizar el rendimiento y ofrece una interfaz fácil de usar accesible desde cualquier navegador.

---

## Características

- Escaneo configurable de IP individual o rango completo.  
- Indicador de estado (activa/inactiva) con tiempo de respuesta en milisegundos.  
- Resolución del nombre del host en entornos Windows.  
- Caché inteligente con diferentes tiempos de actualización según el estado.  
- Interfaz web simple y responsive.  
- Fácil de desplegar y portable con Node.js portable.

---

## Instalación

1. Clona o descarga este repositorio.

2. Instala las dependencias (requiere Node.js instalado):

```bash
npm install
```

3. Para ejecutar la aplicación:

- Con Node.js instalado globalmente:

```bash
node server.js
```

- Con Node.js portable:

  - Descarga y descomprime Node portable en la carpeta `node-portable`.  
  - Ejecuta el archivo `start.bat` para iniciar el servidor y abrir el navegador.

4. Abre tu navegador y visita:

```
http://localhost:3000
```

---

## Uso

1. En la interfaz web, haz clic en “Iniciar escaneo” para detectar dispositivos activos en el rango predeterminado.

2. Puedes escanear IP individual o rangos usando parámetros en la URL, por ejemplo:

```
/scan?startIP=192.168.1.10&endIP=192.168.1.20
```

3. Para forzar un escaneo sin usar caché, añade el parámetro `force=true`:

```
/scan?ip=192.168.1.5&force=true
```

4. Los resultados mostrarán IP, estado, tiempo de respuesta y nombre del host.

---

## Estructura del proyecto

```
/
├─ server.js  
├─ package.json  
├─ public/  
│  ├─ index.html  
│  ├─ style.css  
│  └─ script.js  
├─ node-portable/       (opcional para distribución portable)  
└─ start.bat            (opcional para ejecución portable)  
```

---

## Requisitos

- Node.js 18+ (para características modernas y compatibilidad)  
- Windows, ( Linux o macOS - por el momento no disponible )

---

## Contacto

Para dudas, sugerencias o contribuciones, abre un issue o contacta directamente.

---

¡Gracias por usar IP Scanner! 🚀
