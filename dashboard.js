// ================= MQTT =================
const mqtt_server = "c54e67b060694c4aa2ef3f6b1707d2a2.s1.eu.hivemq.cloud";
const mqtt_port = 8884;
const mqtt_username = "Dog_mals";
const mqtt_password = "Jurema10";
const mqtt_topic = "HydroMonitor/Ultrassonico";

const client = mqtt.connect(`wss://${mqtt_server}:${mqtt_port}/mqtt`, {
    username: mqtt_username,
    password: mqtt_password,
    protocol: "wss",
    reconnectPeriod: 5000,
    clean: true
});

// ================= CONFIG =================
const TANK_HEIGHT_CM = 20;
const SENSOR_OFFSET_CM = 2;
const MAX_POINTS = 40;
const INTERVAL_MS = 1500;

// ================= STATE =================
let connected = true;
let soundOn = false;
let targetLevel = 60;
let prevLevel = 0;
let chartInstance = null;

function distanceToLevel(distance) {
  const usable = TANK_HEIGHT_CM - SENSOR_OFFSET_CM;
  const waterDepth = Math.max(0, Math.min(usable, TANK_HEIGHT_CM - distance));
  return Math.round((waterDepth / usable) * 100);
}

function levelToDistance(level) {
  const usable = TANK_HEIGHT_CM - SENSOR_OFFSET_CM;
  return TANK_HEIGHT_CM - (level / 100) * usable;
}

let readings = [{
    t: Date.now(),
    distance: 0,
    level: 0
}];

// ================= CHART =================
function initChart() {
  const ctx = document.getElementById('historyChart').getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 260);
  grad.addColorStop(0, 'rgba(14,165,233,0.4)');
  grad.addColorStop(1, 'rgba(14,165,233,0)');

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: readings.map(r => new Date(r.t).toLocaleTimeString('pt-BR')),
      datasets: [{
        label: 'Nível (%)',
        data: readings.map(r => r.level),
        borderColor: '#0284c7',
        backgroundColor: grad,
        borderWidth: 2.5,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(255,255,255,0.95)',
          titleColor: '#0f172a',
          bodyColor: '#0f172a',
          borderColor: '#e2e8f0',
          borderWidth: 1,
          cornerRadius: 12,
          padding: 12,
          titleFont: { size: 13, weight: 'bold' },
          bodyFont: { size: 13 },
          callbacks: {
            label: (ctx) => `${ctx.parsed.y}%`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#64748b', font: { size: 11 }, maxTicksLimit: 8 }
        },
        y: {
          min: 0, max: 100,
          grid: { color: '#f1f5f9' },
          ticks: { color: '#64748b', font: { size: 11 }, callback: v => v + '%' }
        }
      }
    }
  });
}

// ================= RENDER =================
const statusMeta = {
  low:  { label: 'Baixo',  dot: '#10b981', text: '#059669',  ring: '#a7f3d0', desc: 'Reservatório com nível baixo' },
  mid:  { label: 'Médio',  dot: '#f59e0b', text: '#d97706',  ring: '#fde68a', desc: 'Nível adequado' },
  high: { label: 'Alto',   dot: '#f43f5e', text: '#e11d48',  ring: '#fecdd3', desc: 'Próximo da capacidade máxima' },
};

function updateUI() {
  const latest = readings[readings.length - 1];
  const level = latest.level;
  const distance = latest.distance;

  // Bottle water level
  const waterGroup = document.getElementById('waterGroup');
  const translateY = 380 - (level / 100) * 360;
  waterGroup.style.transform = `translateY(${translateY}px)`;

  // Big percentage
  document.getElementById('levelBig').textContent = level + '%';

  // Status badge
  const status = level <= 30 ? 'low' : level <= 70 ? 'mid' : 'high';
  const meta = statusMeta[status];
  document.getElementById('statusText').textContent = meta.label;
  document.getElementById('statusText').style.color = meta.text;
  document.getElementById('statusDot').style.background = meta.dot;
  document.getElementById('statusBadge').style.borderColor = meta.ring;
  document.getElementById('statusDesc').textContent = meta.desc;

  // Alerts
  const alertBox = document.getElementById('alertBox');
  alertBox.innerHTML = '';
  if (level >= 85) {
    const isFull = level >= 100;
    alertBox.innerHTML = `
      <div class="alert-banner ${isFull ? 'alert-full' : 'alert-high'}">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <div>
          <p style="font-weight:800;font-size:1rem;">${isFull ? '🚨 Reservatório cheio!' : '⚠ Atenção: Reservatório próximo do limite máximo!'}</p>
          <p style="font-size:0.8rem;opacity:0.85;">Nível atual: ${level}% — ${isFull ? 'interromper bombeamento imediatamente.' : 'verificar fluxo de entrada.'}</p>
        </div>
      </div>`;
  }

  // Stats cards
  const levels = readings.map(r => r.level);
  const min = Math.min(...levels);
  const max = Math.max(...levels);
  const avg = Math.round(levels.reduce((a, b) => a + b, 0) / levels.length);

  const statsData = [
    { label: 'Nível Atual', value: level + '%', sub: 'Atualizado agora', tone: 'tone-sky', icon: 'gauge' },
    { label: 'Distância Medida', value: distance.toFixed(1) + ' cm', sub: 'Tanque: ' + TANK_HEIGHT_CM + ' cm', tone: 'tone-blue', icon: 'activity' },
    { label: 'Mínimo', value: min + '%', sub: 'Últimas leituras', tone: 'tone-emerald', icon: '' },
    { label: 'Máximo', value: max + '%', sub: 'Últimas leituras', tone: 'tone-rose', icon: '' },
    { label: 'Média', value: avg + '%', sub: 'Últimas leituras', tone: 'tone-indigo', icon: '' },
  ];

  const icons = {
    gauge: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 12h.01"/><path d="M12 20a8 8 0 0 0 8-8c0-3.185-1.64-6-4.136-7.762"/><path d="M12 20a8 8 0 0 1-8-8c0-3.185 1.64-6 4.136-7.762"/><path d="M9 10l3-3 3 3"/></svg>',
    activity: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
  };

  const grid = document.getElementById('statsGrid');
  grid.innerHTML = statsData.map((s, i) => `
    <div class="stat-card ${s.tone}" style="${i === 4 ? 'grid-column: span 2;' : ''}">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <span class="label">${s.label}</span>
        ${s.icon ? `<span style="color:#64748b;">${icons[s.icon]}</span>` : ''}
      </div>
      <span class="value">${s.value}</span>
      <span class="sub">${s.sub}</span>
    </div>
  `).join('');

  // Chart update
  if (chartInstance) {
    chartInstance.data.labels = readings.map(r => new Date(r.t).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit', second:'2-digit' }));
    chartInstance.data.datasets[0].data = readings.map(r => r.level);
    chartInstance.update('none');
  }

  // Footer
  const d = new Date(latest.t);
  document.getElementById('lastTime').textContent = d.toLocaleTimeString('pt-BR');
  document.getElementById('lastDate').textContent = d.toLocaleDateString('pt-BR');
  document.getElementById('sensorStatus').textContent = connected ? 'Online' : 'Sem sinal';
  document.getElementById('sensorStatus').style.color = connected ? '#059669' : '#e11d48';
  document.getElementById('readingsCount').textContent = readings.length + ' leituras';

  // Connection pill
  const connPill = document.getElementById('connPill');
  if (connected) {
    connPill.className = 'status-pill pill-online';
    connPill.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg> Conectado`;
  } else {
    connPill.className = 'status-pill pill-offline';
    connPill.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06a10.94 10.94 0 0 1 1.57 3.93"/><path d="M14.12 8.42a12.15 12.15 0 0 1 2.2 2.6"/><path d="M9.88 15.58a12.15 12.15 0 0 1-2.2-2.6"/><path d="M5.88 19.42a10.94 10.94 0 0 1-1.57-3.93"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/></svg> Offline`;
  }

  // Sound alert
  if (soundOn && prevLevel < 85 && level >= 85) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
      o.start(); o.stop(ctx.currentTime + 0.6);
    } catch(e) {}
  }
  prevLevel = level;
}

// ================= MQTT EVENTS =================
client.on("connect", () => {
    console.log("Conectado ao broker MQTT");

    connected = true;
    updateUI();

    client.subscribe(mqtt_topic, (erro) => {
        if (erro) {
            console.log("Erro ao se inscrever no tópico:", erro);
        } else {
            console.log("Inscrito no tópico:", mqtt_topic);
        }
    });
});

client.on("message", (topic, message) => {
    const texto = message.toString();

    console.log("Mensagem recebida:", texto);

    const distancia = parseFloat(texto);

    if (isNaN(distancia)) {
        console.log("Valor inválido recebido:", texto);
        return;
    }

    const nivel = distanceToLevel(distancia);

    readings.push({
        t: Date.now(),
        distance: distancia,
        level: nivel
    });

    if (readings.length > MAX_POINTS) {
        readings.shift();
    }

    connected = true;
    updateUI();
});

client.on("offline", () => {
    connected = false;
    updateUI();
});

client.on("error", (erro) => {
    console.log("Erro MQTT:", erro);
    connected = false;
    updateUI();
});

client.on("reconnect", () => {
    console.log("Tentando reconectar...");
});

// ================= CONTROLS =================
document.getElementById('soundBtn').addEventListener('click', () => {
  soundOn = !soundOn;
  document.getElementById('soundBtn').textContent = `🔔 Som: ${soundOn ? 'ON' : 'OFF'}`;
});

// ================= START =================
document.addEventListener('DOMContentLoaded', () => {
  initChart();
  updateUI();
});
