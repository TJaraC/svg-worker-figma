# SVG Worker - Figma Plugin

## 🇪🇸 Español

**SVG Worker** es un plugin para Figma diseñado para importar fácil y rápidamente archivos SVG directamente a tus diseños a través de una URL externa.

### 🚀 Características
- **Importación por URL**: Copia y pega la URL de cualquier archivo SVG público (por ejemplo, desde repositorios como SVGRepo o cualquier servidor web) y el plugin se encargará de insertarlo en el lienzo de Figma de inmediato.
- **Bypass de CORS**: El plugin está optimizado para lidiar con las restricciones de CORS (Cross-Origin Resource Sharing) mediante un sistema propio de proxy. Si un servidor bloquea la descarga, el plugin intentará usar vías alternativas para garantizar que consigues tu SVG.
- **Rápido y Dinámico**: Al estar integrado directamente en Figma, no necesitas descargar los archivos SVG a tu disco duro local primero.

### 🛠️ Cómo Funciona
1. Abre Figma y ejecuta el plugin **SVG Worker**.
2. Aparecerá una interfaz de usuario donde podrás introducir la URL del SVG que deseas importar.
3. Haz clic en el botón de importar.
4. El plugin realiza la petición de forma segura. Si el dominio origen tiene reglas estrictas de acceso, la red configurada en el plugin se encarga de resolverlo.
5. Una vez descargado, el SVG se decodifica y se inserta automáticamente como un nuevo nodo en tu documento de Figma actual.

---

## 🇬🇧 English

**SVG Worker** is a Figma plugin designed to easily and quickly import SVG files directly into your designs via external URLs.

### 🚀 Features
- **URL Import**: Copy and paste the URL of any public SVG file (e.g., from repositories like SVGRepo or any web server), and the plugin will immediately insert it into your Figma canvas.
- **CORS Bypass**: The plugin is optimized to handle CORS (Cross-Origin Resource Sharing) restrictions through a proxy fallback system. If a server blocks the direct download, the plugin tries alternative routes to ensure you get your SVG.
- **Fast and Dynamic**: By being directly integrated into Figma, you do not need to download the SVG files to your local hard drive first.

### 🛠️ How It Works
1. Open Figma and run the **SVG Worker** plugin.
2. A UI will appear where you can input the URL of the SVG you want to import.
3. Click the import button.
4. The plugin makes the request securely. If the originating domain has strict access rules, the plugin's configured network handles it.
5. Once downloaded, the SVG is decoded and automatically inserted as a new node in your current Figma document.
