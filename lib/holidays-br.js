/**
 * Calcula feriados brasileiros para um determinado ano
 */

function getEasterDate(year) {
  // Algoritmo de Computus
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

export function getBrazilianHolidays(year) {
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

  // Feriados móveis (baseados na Páscoa)
  const easter = getEasterDate(year);
  const easterTime = easter.getTime();

  // Sexta-feira Santa (2 dias antes da Páscoa)
  holidays.push(new Date(easterTime - 2 * 24 * 60 * 60 * 1000));

  // Corpus Christi (39 dias após a Páscoa)
  holidays.push(new Date(easterTime + 39 * 24 * 60 * 60 * 1000));

  // Carnaval (47 dias antes da Páscoa)
  const carnaval = new Date(easterTime - 47 * 24 * 60 * 60 * 1000);
  holidays.push(carnaval);
  holidays.push(new Date(carnaval.getTime() + 1 * 24 * 60 * 60 * 1000)); // Terça de carnaval

  return holidays;
}

export function getWorkDaysInMonth(year, month) {
  const holidays = getBrazilianHolidays(year);
  const holidaySet = new Set(holidays.map(d => d.toISOString().split('T')[0]));

  let workDays = 0;

  // Month é 1-12, Date usa 0-11
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

export function isWorkDay(date) {
  const year = date.getFullYear();
  const holidays = getBrazilianHolidays(year);
  const dateStr = date.toISOString().split('T')[0];
  const holidaySet = new Set(holidays.map(d => d.toISOString().split('T')[0]));

  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  const isHoliday = holidaySet.has(dateStr);

  return !isWeekend && !isHoliday;
}

export function getWorkdaysBetween(startDate, endDate) {
  let count = 0;
  const current = new Date(startDate);

  while (current <= endDate) {
    if (isWorkDay(current)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}
