document.addEventListener("DOMContentLoaded", async () => {
  // =============================
  // ESTADO GLOBAL
  // =============================

  const state = {
    companies: [],
    januaryEarnings: 0,
    clockStart: Date.now(),
    isWorkingDay: false
  };

  // =============================
  // CONFIGURAÇÕES FIXAS
  // =============================

  const WORK_HOURS = { start: 9, end: 18 };
  const LUNCH_BREAK = { start: 12, end: 13 };

  // =============================
  // FUNÇÕES AUXILIARES
  // =============================

  function formatCurrency(value) {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2
    });
  }

  function calculateWorkSecondsPerDay() {
    // 9:00 - 18:00 (9h) menos 1h de almoço = 8h = 28.800s
    return 8 * 3600;
  }

  // =============================
  // CARREGAR DADOS DO BACKEND
  // =============================

  async function loadCompanies() {
    try {
      const response = await fetch('/api/companies');
      const data = await response.json();
      state.companies = data.data;
      console.log('✅ Empresas carregadas:', state.companies);
    } catch (error) {
      console.error('❌ Erro ao carregar empresas:', error);
      alert('Erro ao carregar dados das empresas');
    }
  }

  async function loadJanuaryEarnings() {
    try {
      const response = await fetch('/api/earnings');
      const data = await response.json();
      state.januaryEarnings = data.total_earned || 0;
      console.log('✅ Ganho de Janeiro:', state.januaryEarnings);
    } catch (error) {
      console.error('❌ Erro ao carregar ganho de Janeiro:', error);
    }
  }

  // =============================
  // CÁLCULO DE FERIADOS (Front-end)
  // =============================

  function getEasterDate(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;

    return new Date(year, month - 1, day);
  }

  function getBrazilianHolidays(year) {
    const holidays = [];

    // Feriados fixos
    holidays.push(new Date(year, 0, 1)); // Ano Novo
    holidays.push(new Date(year, 3, 21)); // Tiradentes
    holidays.push(new Date(year, 4, 1)); // Dia do Trabalho
    holidays.push(new Date(year, 8, 7)); // Independência
    holidays.push(new Date(year, 9, 12)); // Nossa Senhora Aparecida
    holidays.push(new Date(year, 10, 2)); // Finados
    holidays.push(new Date(year, 10, 15)); // Proclamação da República
    holidays.push(new Date(year, 10, 20)); // Consciência Negra
    holidays.push(new Date(year, 11, 25)); // Natal

    const easter = getEasterDate(year);
    const easterTime = easter.getTime();

    // Sexta-feira Santa (2 dias antes)
    holidays.push(new Date(easterTime - 2 * 24 * 60 * 60 * 1000));

    // Corpus Christi (39 dias após)
    holidays.push(new Date(easterTime + 39 * 24 * 60 * 60 * 1000));

    // Carnaval (47 dias antes)
    const carnaval = new Date(easterTime - 47 * 24 * 60 * 60 * 1000);
    holidays.push(carnaval);
    holidays.push(new Date(carnaval.getTime() + 1 * 24 * 60 * 60 * 1000));

    return holidays;
  }

  function isWorkDay(date) {
    const year = date.getFullYear();
    const holidays = getBrazilianHolidays(year);
    const dateStr = date.toISOString().split('T')[0];
    const holidaySet = new Set(holidays.map(d => d.toISOString().split('T')[0]));

    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const isHoliday = holidaySet.has(dateStr);

    return !isWeekend && !isHoliday;
  }

  function getWorkDaysInMonth(year, month) {
    const holidays = getBrazilianHolidays(year);
    const holidaySet = new Set(holidays.map(d => d.toISOString().split('T')[0]));

    let workDays = 0;
    const lastDay = new Date(year, month, 0).getDate();

    for (let day = 1; day <= lastDay; day++) {
      const date = new Date(year, month - 1, day);
      const dateStr = date.toISOString().split('T')[0];

      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const isHoliday = holidaySet.has(dateStr);

      if (!isWeekend && !isHoliday) {
        workDays++;
      }
    }

    return workDays;
  }

  // =============================
  // CÁLCULO DE GANHOS (Front-end)
  // =============================

  function calculateDailyRate(company, workDaysThisMonth) {
    if (company.type === 'CLT') {
      return company.salary_monthly / workDaysThisMonth;
    } else {
      return (company.hourly_rate * 8) / workDaysThisMonth;
    }
  }

  function calculateHourlyRate(company, workDaysThisMonth) {
    if (company.type === 'CLT') {
      // Para CLT: salary_monthly / (dias_úteis × 8)
      return company.salary_monthly / (workDaysThisMonth * 8);
    } else {
      // Para PJ: usar o valor hourly_rate direto
      return company.hourly_rate;
    }
  }

  function calculateEarningsToday(company, hoursWorked, workDaysThisMonth) {
    if (company.type === 'PJ') {
      // Para PJ: hourly_rate × horas_trabalhadas
      return company.hourly_rate * hoursWorked;
    } else {
      // Para CLT: daily_rate × (horas_trabalhadas / 8)
      const dailyRate = company.salary_monthly / workDaysThisMonth;
      return dailyRate * (hoursWorked / 8);
    }
  }

  function getProgressTodayAsDecimal(now) {
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    const currentSec = now.getSeconds();

    const currentSeconds = currentHour * 3600 + currentMin * 60 + currentSec;
    const startSeconds = WORK_HOURS.start * 3600;
    const endSeconds = WORK_HOURS.end * 3600;
    const breakStartSeconds = LUNCH_BREAK.start * 3600;
    const breakEndSeconds = LUNCH_BREAK.end * 3600;

    const totalWorkSeconds = (endSeconds - startSeconds) - (breakEndSeconds - breakStartSeconds);

    if (currentSeconds < startSeconds) return 0;
    if (currentSeconds >= endSeconds) return 1;

    let workedSeconds;
    if (currentSeconds < breakStartSeconds) {
      workedSeconds = currentSeconds - startSeconds;
    } else if (currentSeconds < breakEndSeconds) {
      workedSeconds = breakStartSeconds - startSeconds;
    } else {
      workedSeconds = currentSeconds - startSeconds - (breakEndSeconds - breakStartSeconds);
    }

    return Math.min(workedSeconds / totalWorkSeconds, 1);
  }

  function getHoursWorkedToday(now) {
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    const currentSec = now.getSeconds();

    const currentSeconds = currentHour * 3600 + currentMin * 60 + currentSec;
    const startSeconds = WORK_HOURS.start * 3600;
    const endSeconds = WORK_HOURS.end * 3600;
    const breakStartSeconds = LUNCH_BREAK.start * 3600;
    const breakEndSeconds = LUNCH_BREAK.end * 3600;

    if (currentSeconds < startSeconds) return 0;
    if (currentSeconds >= endSeconds) return 8; // 8 horas de trabalho

    let workedSeconds;
    if (currentSeconds < breakStartSeconds) {
      workedSeconds = currentSeconds - startSeconds;
    } else if (currentSeconds < breakEndSeconds) {
      workedSeconds = breakStartSeconds - startSeconds;
    } else {
      workedSeconds = currentSeconds - startSeconds - (breakEndSeconds - breakStartSeconds);
    }

    return workedSeconds / 3600; // convertendo para horas
  }

  function getCompletedWorkDaysThisMonth(now) {
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const monthStart = new Date(year, month - 1, 1);
    const today = new Date(year, month - 1, now.getDate());

    let count = 0;
    const current = new Date(monthStart);

    while (current < today) {
      if (isWorkDay(current)) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }

  function calculateEarnings(now) {
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const workDaysThisMonth = getWorkDaysInMonth(year, month);
    const hoursWorked = getHoursWorkedToday(now);

    state.isWorkingDay = isWorkDay(now);

    if (!state.isWorkingDay) {
      return {
        totalToday: 0,
        totalMonth: 0,
        totalYear: state.januaryEarnings,
        generalHourlyRate: 0,
        companies: state.companies.map(c => ({
          ...c,
          earningsToday: 0,
          earningsMonth: 0,
          earningsYear: 0,
          hourlyRate: calculateHourlyRate(c, workDaysThisMonth),
          active: false
        }))
      };
    }

    let totalToday = 0;
    let totalMonth = 0;
    let totalYear = state.januaryEarnings;

    const results = state.companies.map(company => {
      const companyStartDate = new Date(company.start_date);

      if (companyStartDate > now) {
        return {
          ...company,
          earningsToday: 0,
          earningsMonth: 0,
          earningsYear: 0,
          hourlyRate: calculateHourlyRate(company, workDaysThisMonth),
          active: false
        };
      }

      // Ganho de hoje (correto com horas trabalhadas)
      const earningsToday = calculateEarningsToday(company, hoursWorked, workDaysThisMonth);

      // Ganho do mês
      const dailyRate = calculateDailyRate(company, workDaysThisMonth);
      const completedDaysThisMonth = getCompletedWorkDaysThisMonth(now);
      const progressToday = getProgressTodayAsDecimal(now);
      const earningsMonth = dailyRate * (completedDaysThisMonth + progressToday);

      // Ganho do ano (exclui janeiro, que já está em state.januaryEarnings)
      let earningsYear = 0;

      // Se começou em 2026, calcular meses APÓS janeiro
      if (company.start_date.startsWith(year.toString())) {
        const startDate = new Date(company.start_date);

        // Loop APENAS para fevereiro em diante
        let currentDate = new Date(year, 1, 1);  // Começa em fevereiro (mês 1 = fevereiro)

        while (currentDate <= now) {
          const currentYear = currentDate.getFullYear();
          const currentMonth = currentDate.getMonth() + 1;

          // Verificar se empresa já havia começado neste mês
          if (startDate > new Date(currentYear, currentMonth - 1, 1)) {
            currentDate.setMonth(currentDate.getMonth() + 1);
            continue;
          }

          const workDaysCurrentMonth = getWorkDaysInMonth(currentYear, currentMonth);
          const dailyRateCurrentMonth = calculateDailyRate(company, workDaysCurrentMonth);

          if (currentMonth === month) {
            // Mês atual: usar ganho calculado (parcial)
            earningsYear += earningsMonth;
          } else {
            // Meses completos após janeiro
            earningsYear += dailyRateCurrentMonth * workDaysCurrentMonth;
          }

          currentDate.setMonth(currentDate.getMonth() + 1);
        }
      }

      totalToday += earningsToday;
      totalMonth += earningsMonth;
      totalYear += earningsYear;

      return {
        ...company,
        earningsToday,
        earningsMonth,
        earningsYear,
        hourlyRate: calculateHourlyRate(company, workDaysThisMonth),
        active: true
      };
    });

    return {
      totalToday,
      totalMonth,
      totalYear,
      generalHourlyRate: hoursWorked > 0 ? totalToday / hoursWorked : 0,
      companies: results
        .sort((a, b) => {
          // Ordenar por maior ganho primeiro
          if (b.earningsToday !== a.earningsToday) {
            return b.earningsToday - a.earningsToday;
          }
          // Se empatar, ordenar alfabeticamente
          return a.name.localeCompare(b.name);
        })
    };
  }

  // =============================
  // ATUALIZAÇÃO DA TELA
  // =============================

  function updateDisplay(earnings) {
    const now = new Date();

    // Relógio principal
    document.getElementById('earnedToday').textContent = formatCurrency(earnings.totalToday);
    document.getElementById('earnedMonth').textContent = formatCurrency(earnings.totalMonth);
    document.getElementById('earnedYear').textContent = formatCurrency(earnings.totalYear);

    // Status
    const statusEl = document.getElementById('statusText');
    if (!state.isWorkingDay) {
      statusEl.textContent = 'Hoje é fim de semana ou feriado 💤';
    } else {
      const progress = getProgressTodayAsDecimal(now);
      statusEl.textContent = `Trabalho em andamento: ${(progress * 100).toFixed(2)}% do dia concluído`;
    }

    // Valores por hora/minuto/segundo (fixo baseado no ganho de hoje)
    const hourlyRate = earnings.generalHourlyRate;

    document.getElementById('perHour').textContent = formatCurrency(hourlyRate);
    document.getElementById('perMinute').textContent = formatCurrency(hourlyRate / 60);
    document.getElementById('perSecond').textContent = formatCurrency(hourlyRate / 3600);


    // Atualizar cards de empresas
    updateCompanyCards(earnings.companies);
  }

  // Mapa de logos/imagens das empresas
  const companyImages = {
    'pepsi': '/assets/pepsi.png',
    'pepsico': '/assets/pepsi.png',
    'itaú': '/assets/itau.svg',
    'safra': '/assets/safra.svg',
    'genial': '/assets/2.%20Genial.png',
    'genial investimentos': '/assets/2.%20Genial.png',
    'grupo sc': '/assets/logo.webp',
    'motz': '/assets/3.%20Motz.png',
    'founday': '/assets/founday.png'
  };

  // Fallback emojis para empresas sem imagem
  const companyEmojis = {
    'pepsi': '🥤',
    'pepsico': '🥤',
    'itaú': '🏦',
    'safra': '💳',
    'genial': '💼',
    'genial investimentos': '💼',
    'grupo sc': '🚀',
    'motz': '📱',
    'founday': '⚙️'
  };

  function getCompanyImage(companyName) {
    const name = companyName.toLowerCase();
    for (const [key, imagePath] of Object.entries(companyImages)) {
      if (name.includes(key)) {
        return imagePath;
      }
    }
    return null;
  }

  function getCompanyEmoji(companyName) {
    const name = companyName.toLowerCase();
    for (const [key, emoji] of Object.entries(companyEmojis)) {
      if (name.includes(key)) {
        return emoji;
      }
    }
    return '💰';
  }

  function updateCompanyCards(companies) {
    const container = document.getElementById('companiesContainer');

    if (!container) return;

    container.innerHTML = '';

    companies.forEach(company => {
      const card = document.createElement('div');
      card.className = `company-card ${!company.active ? 'inactive' : ''}`;

      const imagePath = getCompanyImage(company.name);
      const emoji = getCompanyEmoji(company.name);

      let logoHTML;
      if (imagePath) {
        logoHTML = `<img src="${imagePath}" alt="${company.name}" />`;
      } else {
        logoHTML = `${emoji}`;
      }

      card.innerHTML = `
        <div class="company-logo">${logoHTML}</div>
        <div class="company-name">${company.name}</div>
        <div class="company-earnings-today">${formatCurrency(company.earningsToday)}</div>
        <div class="company-hourly-rate">R$/h: ${formatCurrency(company.hourlyRate)}</div>
        <div class="company-status">${company.active ? 'Ativo' : 'Inicia em ' + new Date(company.start_date).toLocaleDateString('pt-BR')}</div>
      `;

      container.appendChild(card);
    });
  }

  // =============================
  // LOOP PRINCIPAL (1x por segundo)
  // =============================

  function mainLoop() {
    const now = new Date();
    const earnings = calculateEarnings(now);
    updateDisplay(earnings);
  }

  // =============================
  // INICIALIZAÇÃO
  // =============================

  await loadCompanies();
  await loadJanuaryEarnings();

  // Primeira atualização imediata
  mainLoop();

  // Atualizar a cada segundo
  setInterval(mainLoop, 1000);

  // =============================
  // TOGGLE DE TEMA
  // =============================

  const toggleButton = document.getElementById("toggleTheme");
  const htmlEl = document.documentElement;

  const savedTheme = localStorage.getItem("theme");
  if (savedTheme) {
    htmlEl.setAttribute("data-theme", savedTheme);
    toggleButton.textContent = savedTheme === "light" ? "Dark Mode" : "Light Mode";
  }

  toggleButton.addEventListener("click", () => {
    const currentTheme = htmlEl.getAttribute("data-theme");

    if (currentTheme === "light") {
      htmlEl.removeAttribute("data-theme");
      localStorage.setItem("theme", "dark");
      toggleButton.textContent = "Light Mode";
    } else {
      htmlEl.setAttribute("data-theme", "light");
      localStorage.setItem("theme", "light");
      toggleButton.textContent = "Dark Mode";
    }
  });
});
