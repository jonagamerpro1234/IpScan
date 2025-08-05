import express from 'express';
import ping from 'ping';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);


const app = express();
const port = process.argv[2] || 3000;


const cache = new Map();
const CACHE_TTL_ACTIVE = 1 * 60 * 1000;    // 1 minuto para activas
const CACHE_TTL_INACTIVE = 5 * 60 * 1000;  // 5 minutos para inactivas

const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, 'public')));

// Valida que una IP sea válida IPv4 (muy básico)
function validarIP(ip) {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    return parts.every(p => {
        const n = Number(p);
        return n >= 0 && n <= 255 && p === n.toString();
    });
}

// Convierte una IP a número para facilitar rangos
function ipToNumber(ip) {
    return ip.split('.').reduce((acc, oct) => acc * 256 + Number(oct), 0);
}

// Convierte número a IP
function numberToIp(num) {
    return [
        (num >> 24) & 0xFF,
        (num >> 16) & 0xFF,
        (num >> 8) & 0xFF,
        num & 0xFF,
    ].join('.');
}

// Genera un array de IPs desde startIP hasta endIP inclusive
function generarRangoIPs(startIP, endIP) {
    const startNum = ipToNumber(startIP);
    const endNum = ipToNumber(endIP);
    if (endNum < startNum) return [];
    const ips = [];
    for (let n = startNum; n <= endNum; n++) {
        ips.push(numberToIp(n));
    }
    return ips;
}

// Función que hace el escaneo real sin caché
async function doRealScan(ip) {
    try {
        // Considera aumentar timeout a 2-3 para redes lentas
        const resPing = await ping.promise.probe(ip, { timeout: 2 });
        let hostname = "Desconocido";

        if (resPing.alive) {
            try {
                // nbtstat solo para Windows, podría no funcionar en otros SO
                const { stdout } = await execAsync(`nbtstat -A ${ip}`);
                const lines = stdout.split('\n');
                const nameLine = lines.find(line => /<00>/i.test(line) && /UNIQUE/i.test(line));
                if (nameLine) {
                    hostname = nameLine.trim().split(/\s+/)[0];
                }
            } catch (error) {
                console.warn(`Error obteniendo hostname para ${ip}:`, error.message);
                // hostname queda como "Desconocido"
            }
        }

        return {
            ip,
            alive: resPing.alive,
            time: resPing.time,
            hostname
        };
    } catch (error) {
        console.error(`Error en doRealScan para ${ip}:`, error.message);
        return {
            ip,
            alive: false,
            time: null,
            hostname: "Desconocido"
        };
    }
}

// Función que usa la caché y controla TTL
async function scanIP(ip, force = false) {
    const now = Date.now();

    if (!force && cache.has(ip)) {
        const cached = cache.get(ip);
        const age = now - cached.timestamp;
        const wasAlive = cached.data.alive;
        const ttl = wasAlive ? CACHE_TTL_ACTIVE : CACHE_TTL_INACTIVE;

        if (age < ttl) {
            return { ...cached.data, fromCache: true };
        }
    }

    const result = await doRealScan(ip);

    const cached = cache.get(ip);
    const shouldUpdate =
        force || !cached ||
        cached.data.alive !== result.alive ||
        now - cached.timestamp > (cached.data.alive ? CACHE_TTL_ACTIVE : CACHE_TTL_INACTIVE);

    if (shouldUpdate) {
        cache.set(ip, { data: result, timestamp: now });
    }

    return { ...result, fromCache: false };
}

// API para escanear IPs con soporte de IP individual, rango y parámetro force
app.get('/scan', async (req, res) => {
    let ipsToScan = [];

    const { ip, startIP, endIP, force } = req.query;

    try {
        if (ip) {
            if (!validarIP(ip)) {
                return res.status(400).json({ error: "IP inválida" });
            }
            ipsToScan = [ip];
        } else if (startIP && endIP) {
            if (!validarIP(startIP) || !validarIP(endIP)) {
                return res.status(400).json({ error: "IP de rango inválida" });
            }
            ipsToScan = generarRangoIPs(startIP, endIP);
            if (ipsToScan.length === 0) {
                return res.status(400).json({ error: "Rango inválido: endIP debe ser mayor o igual que startIP" });
            }
        } else {
            // Por defecto escanear todo el rango típico
            ipsToScan = generarRangoIPs('192.168.1.1', '192.168.1.254');
        }

        const concurrencyLimit = 20;
        const results = [];
        let activeTasks = [];

        for (const ipScan of ipsToScan) {
            const task = scanIP(ipScan, force === 'true').then(r => results.push(r));
            activeTasks.push(task);

            if (activeTasks.length >= concurrencyLimit) {
                await Promise.all(activeTasks);
                activeTasks = [];
            }
        }
        await Promise.all(activeTasks);

        // Ordenar resultados por IP ascendente
        results.sort((a, b) => {
            const ipA = a.ip.split('.').map(Number);
            const ipB = b.ip.split('.').map(Number);
            for (let i = 0; i < 4; i++) {
                if (ipA[i] !== ipB[i]) return ipA[i] - ipB[i];
            }
            return 0;
        });

        res.json(results);

    } catch (err) {
        console.error('Error en /scan:', err.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
