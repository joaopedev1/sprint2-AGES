const CARTA_MAP = {
    sol:        { img: 'Sun.jpeg',    nome: 'The Sun',    desc: 'Céu limpo'       },
    chuva:      { img: 'Rain.jpeg',   nome: 'The Rain',   desc: 'Chuva'           },
    tempestade: { img: 'Storm.jpeg',  nome: 'The Storm',  desc: 'Tempestade'      },
    nublado:    { img: 'Cloudy.jpeg', nome: 'The Cloudy', desc: 'Nublado'         },
    noite:      { img: 'Night.jpeg',  nome: 'The Night',  desc: 'Noite estrelada' },
};

function wmoParaCondicao(code, isDay) {
    if ([0,1].includes(code))                  return isDay ? 'sol' : 'noite';
    if ([2,3,45,48].includes(code))            return 'nublado';
    if ([51,53,55,61,63,80,81].includes(code)) return 'chuva';
    if ([65,82,95,96,99].includes(code))       return 'tempestade';
    return isDay ? 'sol' : 'noite';
}

const DIAS_PT  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const TOTAL    = 8;

let dadosDias    = [];
let dadosHorario = [];

async function buscarClima() {
    const cidade = document.getElementById('cidade-input').value.trim();
    if (!cidade){
        return;
    } 

    const erroEl = document.getElementById('erro');
    erroEl.textContent = 'Consultando os oráculos...';

    try {
        const geoRes  = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cidade)}&count=1&language=pt&format=json`);
        const geoData = await geoRes.json();
        if (!geoData.results?.length) { 
            erroEl.textContent = 'Cidade não encontrada.'; return; 
        }

        const { latitude, longitude } = geoData.results[0];

        const wRes = await fetch(
            `https://api.open-meteo.com/v1/forecast` +
            `?latitude=${latitude}&longitude=${longitude}` +
            `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max` +
            `&hourly=temperature_2m,weathercode` +
            `&current_weather=true` +
            `&timezone=auto&forecast_days=8`
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

function processarDiario(data) {
    const { daily, current_weather } = data;
    return daily.time.map((dateStr, i) => {
        const code = daily.weathercode[i];
        const isDay = i === 0 ? current_weather.is_day === 1 : true;
        const condicao = wmoParaCondicao(code, isDay);
        const date = new Date(dateStr + 'T12:00:00');
        return {
            data: dateStr,
            diaSem: i === 0 ? 'Hoje' : DIAS_PT[date.getDay()],
            dataFmt: `${date.getDate()} ${MESES_PT[date.getMonth()]}`,
            condicao,
            carta: CARTA_MAP[condicao],
            tMax: Math.round(daily.temperature_2m_max[i]),
            tMin: Math.round(daily.temperature_2m_min[i]),
            chuva: daily.precipitation_probability_max[i] ?? 0,
            vento: Math.round(daily.windspeed_10m_max[i]),
        };
    });
}

function iniciarCena() {
    document.getElementById('busca').style.display = 'none';
    document.getElementById('cena').style.display  = 'block';

    const brac = document.getElementById('brac');
    brac.getAnimations().forEach(a => a.cancel());

    criarBaralho();
    criarMesa();

    setTimeout(() => balancodobrac(), 300);
}

function criarBaralho() {
    const el = document.getElementById('baralho');
    el.innerHTML = '';
    for (let i = 0; i < TOTAL; i++) {
        const slot = document.createElement('div');
        slot.classList.add('carta-baralho');
        slot.id = `b${i}`;
        const img = document.createElement('img');
        img.src = 'BackCard.png'; // ← sempre o verso
        img.alt = '';
        slot.appendChild(img);
        el.appendChild(slot);
    }
}

function criarMesa() {
    const el = document.getElementById('mesa');
    el.innerHTML = '';

    dadosDias.forEach((dia, i) => {
        const slot = document.createElement('div');
        slot.classList.add('carta-mesa');
        slot.id = `m${i}`;
        slot.style.opacity    = '0';
        slot.style.visibility = 'hidden';

        const inner  = document.createElement('div');
        inner.classList.add('carta-inner');

        const verso  = document.createElement('div');
        verso.classList.add('carta-verso');
        const imgV   = document.createElement('img');
        imgV.src = dia.carta.img;
        imgV.alt = '';
        verso.appendChild(imgV);

        const frente = document.createElement('div');
        frente.classList.add('carta-frente');
        const imgF   = document.createElement('img');
        imgF.src = 'BackCard.png';
        imgF.alt = dia.carta.nome;
        frente.appendChild(imgF);

        inner.appendChild(frente);
        inner.appendChild(verso);
        slot.appendChild(inner);

        slot.addEventListener('click', () => {
            if (!slot.classList.contains('ativa')) return;
            slot.classList.toggle('virada');
            if (slot.classList.contains('virada')) setTimeout(() => abrirModal(i), 400);
        });

        el.appendChild(slot);
    });
}

function distribuir(i) {
    const cb = document.getElementById(`b${TOTAL - 1 - i}`);
    if (cb) {
        cb.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' });
        setTimeout(() => cb.remove(), 220);
    }

    const cm = document.getElementById(`m${i}`);
    if (!cm) return;

    const baralho  = document.getElementById('baralho');
    const origRect = baralho.getBoundingClientRect();
    const destRect = cm.getBoundingClientRect();

    const ox = origRect.left + origRect.width  / 2;
    const oy = origRect.top  + origRect.height / 2;
    const dx = destRect.left + destRect.width  / 2;
    const dy = destRect.top  + destRect.height / 2;

    const tx  = ox - dx;
    const ty  = oy - dy;
    const rot = tx > 0 ? 18 : -18;

    const arcX = tx * 0.5;
    const arcY = ty * 0.5 - Math.abs(tx) * 0.25 - 60;

    cm.style.visibility = 'visible';
    cm.style.opacity    = '1';

    const anim = cm.animate(
        [
            { transform: `translate(${tx}px, ${ty}px) rotate(${rot}deg) scale(1.08)`, opacity: 0,   offset: 0   },
            { transform: `translate(${arcX}px, ${arcY}px) rotate(${rot * 0.4}deg) scale(1.12)`, opacity: 1, offset: 0.4 },
            { transform: `translate(0px, 0px) rotate(0deg) scale(1)`, opacity: 1, offset: 1 },
        ],
        { duration: 600, easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)', fill: 'forwards' }
    );

        anim.onfinish = () => {
        anim.commitStyles();
        anim.cancel();
        cm.style.visibility = 'visible';
        cm.style.opacity    = '1';
        cm.classList.add('ativa');
    };
}


async function balancodobrac() {
    const objeto  = document.getElementById('brac');
    objeto.getAnimations().forEach(a => a.cancel());
    objeto.style.transform = 'rotate(0deg)';
    
    objeto.getBoundingClientRect();

    const dur     = 380;
    const batidas = [60, 50, 45, 38, 30, 22, 12, 6];

    for (let i = 0; i < batidas.length; i++) {
        const grau = batidas[i];
        
        await objeto.animate(
            [{ transform: 'rotate(0deg)' }, { transform: `rotate(${grau}deg)` }], { duration: dur, easing: 'ease-out', fill: 'forwards' }
        ).finished;

        if (i < dadosDias.length) distribuir(i);

        await objeto.animate(
            [{ transform: `rotate(${grau}deg)` }, { transform: 'rotate(0deg)' }], { duration: dur, easing: 'ease-in', fill: 'forwards' }
        ).finished;

        // Limpa o fill acumulado após cada batida completa
        objeto.getAnimations().forEach(a => a.cancel());
        objeto.style.transform = '';
    }
}

function abrirModal(i) {
    const dia = dadosDias[i];
    document.getElementById('modal-carta').src = dia.carta.img;
    document.getElementById('modal-titulo').textContent = dia.carta.nome;
    document.getElementById('modal-data').textContent = `${dia.diaSem} · ${dia.dataFmt}`;
    document.getElementById('modal-clima').textContent = dia.carta.desc;
    document.getElementById('modal-max').textContent = `${dia.tMax}°`;
    document.getElementById('modal-min').textContent = `${dia.tMin}°`;
    document.getElementById('modal-chuva').textContent = `${dia.chuva}% chance de chuva`;
    document.getElementById('modal-vento').textContent = `${dia.vento} km/h vento`;
    construirGrafico(dia.data);
    document.getElementById('modal-overlay').classList.add('aberto');
}

function fecharModal() {
    document.getElementById('modal-overlay').classList.remove('aberto');
}

function construirGrafico(dataStr) {
    const el = document.getElementById('grafico');
    el.innerHTML = '';

    const horas  = dadosHorario.time;
    const temps  = dadosHorario.temperature_2m;
    const pontos = [];

    horas.forEach((h, idx) => {
        if (!h.startsWith(dataStr)) return;
        const hora = parseInt(h.split('T')[1]);
        pontos.push({ hora: `${String(hora).padStart(2,'0')}h`, temp: Math.round(temps[idx]) });
    });

    if (!pontos.length) return;

    const maxT  = Math.max(...pontos.map(p => p.temp));
    const minT  = Math.min(...pontos.map(p => p.temp));
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

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('cidade-input').addEventListener('keydown', e => {
        if (e.key === 'Enter') buscarClima();
    });
});