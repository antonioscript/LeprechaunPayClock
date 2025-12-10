document.addEventListener("DOMContentLoaded", () => {
  // =============================
  // CONFIGURAÇÕES
  // =============================

  // Salário mensal
  const monthlySalary = 20000; // ajusta aqui

  // Dias úteis por mês (média)
  const workDaysPerMonthConfig = 21;

  // Horário de trabalho (modo teste noturno)
  const startHour = 22;  // 21:00
  const endHour = 24;    // 24:00 (meia-noite)

  // Ignorar sábado e domingo?
  const ignoreWeekends = true;

  // Como o ano deve ser contado?
  // "calendar" = desde 1º de janeiro
  // "fromNow"  = começa a partir de hoje
  const yearStartMode = "fromNow";

  // =============================
  // DERIVAÇÕES
  // =============================

  const dailySalary = monthlySalary / workDaysPerMonthConfig;
  const yearlySalary = monthlySalary * 12; // se quiser usar depois

  // lida com virada de dia (ex.: 21 → 24, ou 22 → 6)
  let totalWorkHours;
  if (endHour > startHour) {
    totalWorkHours = endHour - startHour;
  } else {
    totalWorkHours = (24 - startHour) + endHour;
  }

  const totalWorkSecondsPerDay = totalWorkHours * 3600;
  const valuePerSecondDay = dailySalary / totalWorkSecondsPerDay;
  const valuePerMinute = valuePerSecondDay * 60;
  const valuePerHour = valuePerSecondDay * 3600;

  // =============================
  // HELPERS
  // =============================

  function formatCurrency(value) {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2
    });
  }

  function isWorkDay(date) {
    const d = date.getDay(); // 0 = dom, 6 = sáb
    if (!ignoreWeekends) return true;
    return d >= 1 && d <= 5;
  }

  function countWorkDaysBetween(startDate, endDate) {
    const d = new Date(startDate.getTime());
    let count = 0;

    while (d < endDate) {
      if (isWorkDay(d)) {
        count++;
      }
      d.setDate(d.getDate() + 1);
    }

    return count;
  }

  // =============================
  // ELEMENTOS DA TELA
  // =============================

  const startTimeLabelEl = document.getElementById("startTimeLabel");
  const endTimeLabelEl = document.getElementById("endTimeLabel");
  const perHourEl = document.getElementById("perHour");
  const perMinuteEl = document.getElementById("perMinute");
  const perSecondEl = document.getElementById("perSecond");
  const statusEl = document.getElementById("statusText");
  const earnedTodayEl = document.getElementById("earnedToday");
  const earnedMonthEl = document.getElementById("earnedMonth");
  const earnedYearEl = document.getElementById("earnedYear");
  const monthCaptionEl = document.getElementById("monthCaption");
  const yearCaptionEl = document.getElementById("yearCaption");

  // =============================
  // LABELS FIXOS
  // =============================

  startTimeLabelEl.textContent = `${String(startHour).padStart(2, "0")}:00`;
  endTimeLabelEl.textContent = `${String(endHour).padStart(2, "0")}:00`;

  perHourEl.textContent = formatCurrency(valuePerHour);
  perMinuteEl.textContent = formatCurrency(valuePerMinute);
  perSecondEl.textContent = formatCurrency(valuePerSecondDay);

  // =============================
  // LOOP PRINCIPAL
  // =============================

  function updateSalaryMeter() {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = dom, 6 = sáb

    if (ignoreWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
      earnedTodayEl.textContent = formatCurrency(0);
      earnedMonthEl.textContent = formatCurrency(0);
      earnedYearEl.textContent = formatCurrency(0);
      statusEl.textContent = "Hoje é fim de semana 💤";
      monthCaptionEl.textContent = "Sem contagem em fins de semana";
      yearCaptionEl.textContent = "Sem contagem em fins de semana";
      return;
    }

    const currentSeconds =
      now.getHours() * 3600 +
      now.getMinutes() * 60 +
      now.getSeconds();

    const startSeconds = startHour * 3600;
    const endSeconds =
      endHour === 24 ? 24 * 3600 : endHour * 3600;

    let earnedToday = 0;
    let progressToday = 0; // 0 a 1

    if (currentSeconds <= startSeconds) {
      earnedToday = 0;
      progressToday = 0;
      statusEl.textContent = "Ainda não começou o expediente 🚦";
    } else if (currentSeconds >= endSeconds) {
      earnedToday = dailySalary;
      progressToday = 1;
      statusEl.textContent = "Expediente encerrado ✅";
    } else {
      const elapsed = currentSeconds - startSeconds;
      earnedToday = elapsed * valuePerSecondDay;
      progressToday = elapsed / totalWorkSecondsPerDay;

      const percentage = (progressToday * 100).toFixed(2);
      statusEl.textContent =
        `Trabalho em andamento: ${percentage}% do dia concluído`;
    }

    earnedTodayEl.textContent = formatCurrency(earnedToday);

    // ----- MÊS -----
    const year = now.getFullYear();
    const month = now.getMonth();
    const today = new Date(year, month, now.getDate());

    const monthStart = new Date(year, month, 1);
    const todayStart = new Date(year, month, now.getDate());

    const completedWorkDaysInMonth =
      countWorkDaysBetween(monthStart, todayStart) - (isWorkDay(today) ? 0 : 1);

    const totalWorkedSecondsMonth =
      Math.max(completedWorkDaysInMonth, 0) * totalWorkSecondsPerDay +
      progressToday * totalWorkSecondsPerDay;

    const estimatedWorkDaysMonth = workDaysPerMonthConfig;
    const totalWorkSecondsMonth =
      estimatedWorkDaysMonth * totalWorkSecondsPerDay;

    const valuePerSecondMonth =
      (dailySalary * estimatedWorkDaysMonth) / totalWorkSecondsMonth;

    const earnedMonth = totalWorkedSecondsMonth * valuePerSecondMonth;

    earnedMonthEl.textContent = formatCurrency(earnedMonth);
    monthCaptionEl.textContent =
      `Aproximado com base em ${estimatedWorkDaysMonth} dias úteis/mês`;

    // ----- ANO -----
    // Se "fromNow", começa hoje; se "calendar", começa em 1º de janeiro
    const yearStart =
      yearStartMode === "fromNow"
        ? todayStart
        : new Date(year, 0, 1);

    const completedWorkDaysInYear =
      countWorkDaysBetween(yearStart, todayStart) - (isWorkDay(today) ? 0 : 1);

    const totalWorkedSecondsYear =
      Math.max(completedWorkDaysInYear, 0) * totalWorkSecondsPerDay +
      progressToday * totalWorkSecondsPerDay;

    const estimatedWorkDaysYear = workDaysPerMonthConfig * 12;
    const totalWorkSecondsYear =
      estimatedWorkDaysYear * totalWorkSecondsPerDay;

    const valuePerSecondYear =
      (dailySalary * estimatedWorkDaysYear) / totalWorkSecondsYear;

    const earnedYear = totalWorkedSecondsYear * valuePerSecondYear;

    earnedYearEl.textContent = formatCurrency(earnedYear);

    if (yearStartMode === "fromNow") {
      yearCaptionEl.textContent =
        `Contando a partir de hoje (projeção para ${estimatedWorkDaysYear} dias úteis)`;
    } else {
      yearCaptionEl.textContent =
        `Estimado para ${estimatedWorkDaysYear} dias úteis/ano`;
    }
  }

  // roda uma vez na entrada
  updateSalaryMeter();
  // e depois a cada segundo
  setInterval(updateSalaryMeter, 1000);
});
