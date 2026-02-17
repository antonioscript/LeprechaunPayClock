import { getWorkDaysInMonth, getWorkdaysBetween, isWorkDay } from './holidays-br.js';

export function calculateDailyRate(company, workDaysThisMonth) {
  if (company.type === 'CLT') {
    // Valor mensal ÷ dias úteis
    return company.salary_monthly / workDaysThisMonth;
  } else {
    // Valor/hora × 8 ÷ dias úteis
    return (company.hourly_rate * 8) / workDaysThisMonth;
  }
}

export function getCompletedWorkDaysThisMonth(now) {
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

export function getProgressTodayAsDecimal(now) {
  // Horário comercial: 9:00 - 18:00 (menos 1h de almoço)
  const startHour = 9;
  const endHour = 18;
  const breakStartHour = 12;
  const breakEndHour = 13;

  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  const currentSec = now.getSeconds();

  const currentSeconds = currentHour * 3600 + currentMin * 60 + currentSec;
  const startSeconds = startHour * 3600;
  const endSeconds = endHour * 3600;
  const breakStartSeconds = breakStartHour * 3600;
  const breakEndSeconds = breakEndHour * 3600;

  const totalWorkSeconds = (endSeconds - startSeconds) - (breakEndSeconds - breakStartSeconds);

  if (currentSeconds < startSeconds) {
    return 0; // Expediente não começou
  }

  if (currentSeconds >= endSeconds) {
    return 1; // Expediente terminou
  }

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

export function calculateCompanyEarnings(company, now, workDaysThisMonth) {
  const companyStartDate = new Date(company.start_date);

  // Se empresa ainda não começou, retorna 0
  if (companyStartDate > now) {
    return {
      today: 0,
      month: 0,
      year: 0,
      active: false
    };
  }

  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const dailyRate = calculateDailyRate(company, workDaysThisMonth);

  // Ganho de hoje
  const progressToday = getProgressTodayAsDecimal(now);
  const earningsToday = dailyRate * progressToday;

  // Ganho do mês
  const completedDaysThisMonth = getCompletedWorkDaysThisMonth(now);
  const earningsMonth = dailyRate * (completedDaysThisMonth + progressToday);

  // Ganho do ano (precisa calcular todos os meses desde start_date até agora)
  let earningsYear = 0;

  // Se empresa começou neste ano
  if (companyStartDate.getFullYear() >= year) {
    // Se começou neste ano ou depois, calcula apenas a partir do mês de início
    let currentDate = new Date(companyStartDate);

    // Primeiro: calcula o mês em que a empresa começou (pode ser parcial)
    const startYear = companyStartDate.getFullYear();
    const startMonth = companyStartDate.getMonth() + 1;
    const startMonthWorkDays = getWorkDaysInMonth(startYear, startMonth);
    const lastDayOfStartMonth = new Date(startYear, companyStartDate.getMonth() + 1, 0);
    const workDaysFromStartDate = getWorkdaysBetween(companyStartDate, lastDayOfStartMonth);

    if (startMonth === month && startYear === year) {
      // Primeira ocorrência é o mês atual (parcial)
      // Nada a fazer aqui, será computado em earningsMonth
    } else {
      // Primeira ocorrência é um mês anterior
      const dailyRateStartMonth = calculateDailyRate(company, startMonthWorkDays);
      earningsYear += dailyRateStartMonth * workDaysFromStartDate;
    }

    currentDate.setDate(1);
    currentDate.setMonth(currentDate.getMonth() + 1);

    // Depois: calcula os meses cheios
    while (currentDate < now) {
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      const workDaysCurrentMonth = getWorkDaysInMonth(currentYear, currentMonth);
      const dailyRateCurrentMonth = calculateDailyRate(company, workDaysCurrentMonth);

      if (currentMonth === month && currentYear === year) {
        // Chegou ao mês atual, não incluir aqui (será earningsMonth)
        break;
      }

      // Adiciona o mês inteiro
      earningsYear += dailyRateCurrentMonth * workDaysCurrentMonth;

      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    // Adiciona ganhos do mês atual (até hoje)
    earningsYear += earningsMonth;
  } else {
    // Se começou em ano anterior, calcula desde janeiro deste ano
    let currentDate = new Date(year, 0, 1);

    while (currentDate.getFullYear() < year || currentDate < now) {
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;

      if (currentYear > year) break;

      const workDaysCurrentMonth = getWorkDaysInMonth(currentYear, currentMonth);
      const dailyRateCurrentMonth = calculateDailyRate(company, workDaysCurrentMonth);

      if (currentMonth === month) {
        // Mês atual: parcial
        earningsYear += earningsMonth;
      } else {
        // Mês anterior: completo
        earningsYear += dailyRateCurrentMonth * workDaysCurrentMonth;
      }

      currentDate.setMonth(currentDate.getMonth() + 1);
    }
  }

  return {
    today: earningsToday,
    month: earningsMonth,
    year: earningsYear,
    active: true
  };
}

export function calculateTotalEarnings(companies, now, januaryEarnings = 0) {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const workDaysThisMonth = getWorkDaysInMonth(year, month);

  let totalToday = 0;
  let totalMonth = 0;
  let totalYear = januaryEarnings;

  const results = companies.map(company => {
    const earnings = calculateCompanyEarnings(company, now, workDaysThisMonth);
    totalToday += earnings.today;
    totalMonth += earnings.month;
    totalYear += earnings.year;

    return {
      ...company,
      earnings
    };
  });

  return {
    totalToday,
    totalMonth,
    totalYear,
    companies: results
  };
}
