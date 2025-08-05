let escaneando = false;
let resultadosEscaneo = [];
let abortController = null;  // Para cancelar fetch

function validarIP(ip) {
    const regex = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
    return regex.test(ip);
}

function validarYMarcar(inputEl, errorEl) {
  const val = inputEl.value.trim();
  if (!val) {
    inputEl.classList.remove('error', 'valid');
    errorEl.textContent = '';
    return;
  }
  if (validarIP(val)) {
    inputEl.classList.add('valid');
    inputEl.classList.remove('error');
    errorEl.textContent = '';
  } else {
    inputEl.classList.add('error');
    inputEl.classList.remove('valid');
    errorEl.textContent = 'IP inválida';
  }
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    // Remover el toast después de 3 segundos
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => container.removeChild(toast), 500);
    }, 3000);
}

function ipToNumber(ip) {
    return ip.split('.').reduce((acc, oct) => (acc << 8) + Number(oct), 0);
}

function numberToIp(num) {
    return [
        (num >> 24) & 0xff,
        (num >> 16) & 0xff,
        (num >> 8) & 0xff,
        num & 0xff,
    ].join('.');
}

async function startScan(force = false) {
    if (escaneando) {
        showToast('Ya hay un escaneo en curso. Espera a que termine.', 'error');
        return;
    }
    escaneando = true;

    const boton = document.getElementById('btnEscanear');
    const forceBtn = document.getElementById('force-scan');
    const spinner = document.getElementById('spinner');
    const statusMsg = document.getElementById('status-message');
    const tabla = document.querySelector('#resultados tbody');
    const resumen = document.getElementById('resumen');
    const btnExportar = document.getElementById('btnExportar');
    const btnCancelar = document.getElementById('btnCancelar');

    // Inputs
    const ip = document.getElementById('input-ip')?.value.trim() || '';
    const startIP = document.getElementById('input-start-ip')?.value.trim() || '';
    const endIP = document.getElementById('input-end-ip')?.value.trim() || '';

    // Validaciones básicas
    if (ip && !validarIP(ip)) {
        showToast('IP individual inválida.', 'error');
        escaneando = false;
        return;
    }
    if ((startIP && !validarIP(startIP)) || (endIP && !validarIP(endIP))) {
        showToast('IP de rango inválida.', 'error');
        escaneando = false;
        return;
    }
    if ((startIP && !endIP) || (!startIP && endIP)) {
        showToast('Debe completar ambos campos de rango (inicio y fin).', 'error');
        escaneando = false;
        return;
    }
    // Validar que startIP <= endIP si ambos existen
    if (startIP && endIP) {
        if (ipToNumber(startIP) > ipToNumber(endIP)) {
            showToast('El rango es inválido: IP inicio mayor que IP fin.', 'error');
            escaneando = false;
            return;
        }
    }

    boton.disabled = true;
    forceBtn.disabled = true;
    if(btnCancelar) btnCancelar.disabled = false;
    spinner.style.display = 'inline-block';
    statusMsg.textContent = force ? 'Forzando escaneo de red...' : 'Escaneando red...';

    tabla.innerHTML = '<tr><td colspan="4">Escaneando...</td></tr>';
    resumen.textContent = '';
    resumen.classList.remove('visible');
    btnExportar.disabled = true;

    const progresoContainer = document.getElementById('progreso-container');
    const barra = document.getElementById('barra-progreso');
    const textoProgreso = document.getElementById('progreso-text');
    progresoContainer.style.display = 'block';
    barra.style.width = '0%';
    textoProgreso.textContent = 'Preparando escaneo...';

    showToast(force ? 'Forzando escaneo de red...' : 'Escaneo iniciado', 'success');

    abortController = new AbortController();

    // Construir URL
    let url = '/scan';
    const params = [];
    if (ip) params.push(`ip=${encodeURIComponent(ip)}`);
    if (startIP && endIP) {
        params.push(`startIP=${encodeURIComponent(startIP)}`);
        params.push(`endIP=${encodeURIComponent(endIP)}`);
    }
    if (force) params.push('force=true');
    if (params.length) url += '?' + params.join('&');

    try {
        const res = await fetch(url, { signal: abortController.signal });
        const data = await res.json();
        resultadosEscaneo = data;

        renderizarTabla();
        btnExportar.disabled = data.length === 0;

        // Actualizar barra y texto progreso al final
        barra.style.width = '100%';
        textoProgreso.textContent = `Escaneo completo (${data.length} IPs).`;

        showToast(`Escaneo completado: ${data.length} IP(s) procesada(s).`, 'success');
        setTimeout(() => (progresoContainer.style.display = 'none'), 2000);

    } catch (error) {
        if (error.name === 'AbortError') {
            showToast('Escaneo cancelado por el usuario.', 'error');
        } else {
            tabla.innerHTML = '<tr><td colspan="4">Error durante el escaneo.</td></tr>';
            console.error('Error al escanear:', error);
            showToast('Error durante el escaneo.', 'error');
        }
        btnExportar.disabled = true;
        progresoContainer.style.display = 'none';
        resumen.textContent = '';
        resumen.classList.remove('visible');
    }

    spinner.style.display = 'none';
    statusMsg.textContent = '';
    boton.disabled = false;
    forceBtn.disabled = false;
    if(btnCancelar) btnCancelar.disabled = true;
    escaneando = false;
}

// Cancelar escaneo si hay controlador abort
function cancelarEscaneo() {
    if (abortController) {
        abortController.abort();
    }
    escaneando = false;
}

function exportarCSV(data) {
    if (!data || data.length === 0) {
        alert('No hay datos para exportar.');
        return;
    }

    const encabezado = ['Hostname', 'IP', 'Estado', 'Tiempo'];
    const filas = data.map(({ hostname, ip, alive, time }) => [
        hostname || '-',
        ip,
        alive ? 'Activa' : 'Inactiva',
        alive ? `${time} ms` : '-'
    ]);

    const csvContent = [encabezado, ...filas]
        .map(fila => fila.map(valor => `"${valor}"`).join(';'))
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const enlace = document.createElement('a');
    enlace.setAttribute('href', url);
    enlace.setAttribute('download', 'resultados_escaneo.csv');
    enlace.style.display = 'none';
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
}

// Variables y elementos para filtrado y orden
let filtroEstado = 'all';
let ordenColumna = 'hostname';
let ordenAscendente = true;

const filtroSelect = document.getElementById('filtro-estado');
const ordenSelect = document.getElementById('orden-columna');
const btnToggleOrden = document.getElementById('btn-toggle-orden');

filtroSelect.addEventListener('change', () => {
  filtroEstado = filtroSelect.value;
  renderizarTabla();
});

ordenSelect.addEventListener('change', () => {
  ordenColumna = ordenSelect.value;
  renderizarTabla();
});

btnToggleOrden.addEventListener('click', () => {
  ordenAscendente = !ordenAscendente;
  btnToggleOrden.textContent = ordenAscendente ? '⬆️' : '⬇️';
  renderizarTabla();
});

function renderizarTabla() {
  const tabla = document.querySelector('#resultados tbody');
  tabla.innerHTML = '';

  // Filtrar
  let datosFiltrados = resultadosEscaneo.filter(item => {
    if (filtroEstado === 'all') return true;
    if (filtroEstado === 'alive') return item.alive === true;
    if (filtroEstado === 'dead') return item.alive === false;
  });

  // Ordenar
  datosFiltrados.sort((a, b) => {
    let valA, valB;

    switch (ordenColumna) {
      case 'hostname':
        valA = (a.hostname || '').toLowerCase();
        valB = (b.hostname || '').toLowerCase();
        break;
      case 'ip':
        valA = a.ip;
        valB = b.ip;
        break;
      case 'estado':
        valA = a.alive ? 1 : 0;
        valB = b.alive ? 1 : 0;
        break;
      case 'time':
        valA = a.time || 0;
        valB = b.time || 0;
        break;
      default:
        valA = '';
        valB = '';
    }

    if (valA < valB) return ordenAscendente ? -1 : 1;
    if (valA > valB) return ordenAscendente ? 1 : -1;
    return 0;
  });

  // Render filas
  datosFiltrados.forEach(({ ip, alive, time, hostname, fromCache }) => {
    const fila = document.createElement('tr');
    fila.className = alive ? 'alive' : 'dead';
    fila.innerHTML = `
      <td>
        ${hostname || '-'}
        ${fromCache ? '<span title="Resultado cacheado" style="font-size:0.7em; color:#999;"> (cache)</span>' : ''}
      </td>
      <td>${ip}</td>
      <td>${alive ? '🟢 Activa' : '🔴 Inactiva'}</td>
      <td>${alive ? time + ' ms' : '-'}</td>
    `;
    tabla.appendChild(fila);
  });

  // Actualizar resumen
  const resumen = document.getElementById('resumen');
  const activas = datosFiltrados.filter(d => d.alive).length;
  const inactivas = datosFiltrados.length - activas;
  resumen.innerHTML = `Dispositivos activos: <span class="activas">${activas} 🟢</span> | Inactivos: <span class="inactivas">${inactivas} 🔴</span>`;
}

// Listeners para botones y inputs

document.getElementById('btnExportar').addEventListener('click', () => {
    exportarCSV(resultadosEscaneo);
});

const btnCancelar = document.getElementById('btnCancelar');
if (btnCancelar) {
  btnCancelar.addEventListener('click', () => {
      cancelarEscaneo();
  });
}

const btnModoOscuro = document.getElementById('btnModoOscuro');
btnModoOscuro.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    btnModoOscuro.textContent = document.body.classList.contains('dark-mode') ? '☀️ Modo Claro' : '🌙 Modo Oscuro';
});

document.getElementById('btnEscanear').addEventListener('click', () => startScan(false));
document.getElementById('force-scan').addEventListener('click', () => startScan(true));

const inputIp = document.getElementById('input-ip');
const errorIp = document.getElementById('error-ip');
inputIp.addEventListener('input', () => validarYMarcar(inputIp, errorIp));

const inputStartIp = document.getElementById('input-start-ip');
const errorStartIp = document.getElementById('error-start-ip');
inputStartIp.addEventListener('input', () => validarYMarcar(inputStartIp, errorStartIp));

const inputEndIp = document.getElementById('input-end-ip');
const errorEndIp = document.getElementById('error-end-ip');
inputEndIp.addEventListener('input', () => validarYMarcar(inputEndIp, errorEndIp));
