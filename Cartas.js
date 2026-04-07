/* MAPEAMENTO clima - carta */
const CARTA_MAP = {
    sol:        { img: 'Sun.jpeg',    nome: 'The Sun',           desc: 'Céu limpo'           },
    chuva:      { img: 'Rain.jpeg',   nome: 'The Rain',          desc: 'Chuva'                },
    tempestade: { img: 'Storm.jpeg',  nome: 'The Storm',         desc: 'Tempestade'           },
    nublado:    { img: 'Cloudy.jpeg', nome: 'The Cloudy',        desc: 'Nublado'              },
    noite:      { img: 'Night.jpeg',  nome: 'The Night',         desc: 'Noite estrelada'      },
};

/* WMO codes - condição */
function wmoParaCondicao(code, isDay) {
    if ([0,1].includes(code))                    return isDay ? 'sol' : 'noite';
    if ([2,3,45,48].includes(code))              return 'nublado';
    if ([51,53,55,61,63,80,81].includes(code))   return 'chuva';
    if ([65,82,95,96,99].includes(code))         return 'tempestade';
    return isDay ? 'sol' : 'noite';
}

const DIAS_PT  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

const TOTAL   = 8;
const DURACAO = 4000;
const PICOS   = [6, 18, 30, 42, 54, 66, 78, 90];

let dadosDias    = [];  /* previsão diária */
let dadosHorario = [];  /* previsão horária */

/* BUSCA */
async function buscarClima() {
    const cidade = document.getElementById('cidade-input').value.trim();
    if (!cidade) return;

    const erroEl = document.getElementById('erro');
    erroEl.textContent = 'Consultando os oráculos...';

    try {
        /* 1. Geocoding */
        const geoRes  = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cidade)}&count=1&language=pt&format=json`);
        const geoData = await geoRes.json();
        if (!geoData.results?.length) { erroEl.textContent = 'Cidade não encontrada.'; return; }

        const { latitude, longitude } = geoData.results[0];

        /* 2. Previsão diária (8 dias) + horária */
        const wRes  = await fetch(
            `https://api.open-meteo.com/v1/forecast` +
            `?latitude=${latitude}&longitude=${longitude}` +
            `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max` + `&hourly=temperature_2m,weathercode` + `&current_weather=true` + `&timezone=auto&forecast_days=8`
        );
        const wData = await wRes.json();

        dadosDias = processarDiario(wData);
        dadosHorario = wData.hourly;

        erroEl.textContent = '';
        iniciarCena();

    } catch(e) {
        erroEl.textContent = 'Erro ao buscar dados. Tente novamente.';
    }
}

/* PROCESSA DADOS DIÁRIOS */
function processarDiario(data) {
    const { daily, current_weather } = data;
    return daily.time.map((dateStr, i) => {
        const code    = daily.weathercode[i];
        const isDay   = i === 0 ? current_weather.is_day === 1 : true;
        const condicao = wmoParaCondicao(code, isDay);
        const date    = new Date(dateStr + 'T12:00:00');
        return {
            data:    dateStr,
            diaSem:  i === 0 ? 'Hoje' : DIAS_PT[date.getDay()],
            dataFmt: `${date.getDate()} ${MESES_PT[date.getMonth()]}`,
            condicao,
            carta:   CARTA_MAP[condicao],
            tMax:    Math.round(daily.temperature_2m_max[i]),
            tMin:    Math.round(daily.temperature_2m_min[i]),
            chuva:   daily.precipitation_probability_max[i] ?? 0,
            vento:   Math.round(daily.windspeed_10m_max[i]),
        };
    });
}

/* INICIA CENA */
function iniciarCena() {
    document.getElementById('busca').style.display = 'none';
    document.getElementById('cena').style.display  = 'block';

    criarBaralho();
    criarMesa();

    setTimeout(() => {
        const brac = document.getElementById('brac');
        brac.style.animation = `lancar ${DURACAO}ms ease-in-out forwards`;

        PICOS.forEach((pico, i) => {
            const delay = (pico / 100) * DURACAO;
            setTimeout(() => distribuir(i), delay);
        });
    }, 600);
}

/* BARALHO */
function criarBaralho() {
    const el = document.getElementById('baralho');
    el.innerHTML = '';
    for (let i = 0; i < TOTAL; i++) {
        const slot = document.createElement('div');
        slot.classList.add('carta-baralho');
        slot.id = `b${i}`;
        const img  = document.createElement('img');
        img.src = dadosDias[i % dadosDias.length].carta.img;
        img.alt = '';
        slot.appendChild(img);
        el.appendChild(slot);
    }
}

/* MESA */
function criarMesa() {
    const el = document.getElementById('mesa');
    el.innerHTML = '';
    dadosDias.forEach((dia, i) => {
        const slot  = document.createElement('div');
        slot.classList.add('carta-mesa');
        slot.id = `m${i}`;

        const inner = document.createElement('div');
        inner.classList.add('carta-inner');

        /* verso carta */
        const verso  = document.createElement('div');
        verso.classList.add('carta-verso');
        const imgV   = document.createElement('img');
        imgV.src = dia.carta.img;
        imgV.alt = '';
        verso.appendChild(imgV);

        /* frente carta */
        const frente = document.createElement('div');
        frente.classList.add('carta-frente');
        const imgF   = document.createElement('img');
        imgF.src = 'BackCard.png';
        imgF.alt = dia.carta.nome;
        frente.appendChild(imgF);

        inner.appendChild(frente);
        inner.appendChild(verso);
        slot.appendChild(inner);

        /* clique = vira e abre modal */
        slot.addEventListener('click', () => {
            if (!slot.classList.contains('ativa')) return;
            slot.classList.toggle('virada');
            if (slot.classList.contains('virada')) {
                setTimeout(() => abrirModal(i), 400);
            }
        });

        el.appendChild(slot);
    });
}

/* posição do braço (ponto de lançamento) */
function getPosicaoBrac() {
    const brac = document.getElementById('brac');
    const rect = brac.getBoundingClientRect();
    return {
        x: rect.left + rect.width * 0.20,
        y: rect.top  + rect.height * 0.50,
    };
}

function distribuir(i) {
    /* some a carta do topo do baralho */
    const cb = document.getElementById(`b${TOTAL - 1 - i}`);
    if (cb) { cb.style.opacity = '0'; setTimeout(() => cb.remove(), 300); }

    const cm = document.getElementById(`m${i}`);
    if (!cm) return;

    /* posição destino (slot na mesa) */
    const destRect = cm.getBoundingClientRect();
    const destX    = destRect.left + destRect.width  / 2;
    const destY    = destRect.top  + destRect.height / 2;

    /* posição origem: o baralho empilhado */
    const baralho  = document.getElementById('baralho');
    const origRect = baralho.getBoundingClientRect();
    const origX    = origRect.left + origRect.width  / 2;
    const origY    = origRect.top  + origRect.height / 2;

    /* delta: de onde a carta VEM em relação ao destino */
    const dx  = origX - destX;
    const dy  = origY - destY;
    const rot = dx > 0 ? 25 : -25;

    cm.style.setProperty('--dx-start', `${dx}px`);
    cm.style.setProperty('--dy-start', `${dy}px`);
    cm.style.setProperty('--rot-start', `${rot}deg`);

    cm.classList.add('voando');

    cm.addEventListener('animationend', () => {
        cm.classList.remove('voando');
        cm.classList.add('ativa');
    }, { once: true });
}

/* MODAL */
function abrirModal(i) {
    const dia = dadosDias[i];

    document.getElementById('modal-carta').src   = dia.carta.img;
    document.getElementById('modal-titulo').textContent = dia.carta.nome;
    document.getElementById('modal-data').textContent   = `${dia.diaSem} · ${dia.dataFmt}`;
    document.getElementById('modal-clima').textContent  = dia.carta.desc;
    document.getElementById('modal-max').textContent    = `${dia.tMax}°`;
    document.getElementById('modal-min').textContent    = `${dia.tMin}°`;
    document.getElementById('modal-chuva').textContent  = `${dia.chuva}% chance de chuva`;
    document.getElementById('modal-vento').textContent  = `${dia.vento} km/h vento`;

    construirGrafico(dia.data);

    document.getElementById('modal-overlay').classList.add('aberto');
}

function fecharModal() {
    document.getElementById('modal-overlay').classList.remove('aberto');
}

/* GRÁFICO 1H */
function construirGrafico(dataStr) {
    const el = document.getElementById('grafico');
    el.innerHTML = '';

    /* filtra as horas do dia selecionado de 1 em 1 */
    const horas  = dadosHorario.time;
    const temps  = dadosHorario.temperature_2m;

    const pontos = [];
    horas.forEach((h, idx) => {
        if (!h.startsWith(dataStr)) return;
        const hora = parseInt(h.split('T')[1]);
        if (hora % 1 === 0) pontos.push({ hora: `${String(hora).padStart(2,'0')}h`, temp: Math.round(temps[idx]) });
    });

    if (!pontos.length) return;

    const maxT = Math.max(...pontos.map(p => p.temp));
    const minT = Math.min(...pontos.map(p => p.temp));
    const range = maxT - minT || 1;

    pontos.forEach(p => {
        const col   = document.createElement('div');
        col.classList.add('grafico-col');

        const altura = Math.round(((p.temp - minT) / range) * 70 + 20);

        const temp  = document.createElement('div');
        temp.classList.add('grafico-temp');
        temp.textContent = `${p.temp}°`;

        const barra = document.createElement('div');
        barra.classList.add('grafico-barra');
        barra.style.height = `${altura}px`;

        const hora  = document.createElement('div');
        hora.classList.add('grafico-hora');
        hora.textContent = p.hora;

        col.appendChild(temp);
        col.appendChild(barra);
        col.appendChild(hora);
        el.appendChild(col);
    });
}

/* Enter para buscar */
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('cidade-input').addEventListener('keydown', e => {
        if (e.key === 'Enter') buscarClima();
    });
});

const objeto = document.querySelector('.brac');
const graus = [60, 0, 50, 0 , 40, 0 ,32, 0, 24, 0, 18, 0, 12, 0, 6];
const duracao = 400;

async function balancodobrac() {
  for (const grau of graus) { 
    await objeto.animate(
      [
        { transform: 'rotate(0deg)' },
        { transform: `rotate(${grau}deg)` }, 
        { transform: 'rotate(0deg)' }
      ],
      {
        duration: duracao,
        easing: 'ease-in-out',
        fill: 'forwards'
      }
    ).finished;
  }
}

async function loop() {
  while (true) {
    await balancodobrac();
    await new Promise(r => setTimeout(r, 1000)); // pausa entre ciclos
  }
}

loop();
