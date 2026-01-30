document.addEventListener("DOMContentLoaded", () => {
  // =============================
  // CONFIGURAÇÕES
  // =============================


  const safraSalary = 5450;
  const itauSalary = 5148;
  const pepsiSalary = 20000;
  const genialSalary = 7000;
  const motzSalary = 8000;
  const groupSc = 8000;
  const as2Group = 5000;
  
  // Salário mensal
  const monthlySalary = safraSalary + itauSalary + pepsiSalary + genialSalary + motzSalary + groupSc + as2Group;

  // Dias úteis por mês (média)
  const workDaysPerMonthConfig = 21;

  // Horário de trabalho (hora + minuto)
  const startHour = 9;
  const startMinute = 0;

  const endHour = 18;
  const endMinute = 0;

  // Intervalo de almoço (ex.: 12:00–13:00)
  const breakStartHour = 12;
  const breakStartMinute = 0;
  const breakEndHour = 13;
  const breakEndMinute = 0;

  // Ignorar sábado e domingo?
  const ignoreWeekends = true;

  // Modo de início do ANO:
  // "month"    = começa no 1º dia do mês atual
  // "calendar" = começa no 1º de janeiro
  const yearStartMode = "month";

  // =============================
  // DERIVAÇÕES
  // =============================

  const dailySalary = monthlySalary / workDaysPerMonthConfig;

  let totalWorkSecondsPerDay;

  const startTotalSeconds = (startHour * 3600) + (startMinute * 60);
  const endTotalSeconds =
    (endHour === 24 ? 24 * 3600 : endHour * 3600) + (endMinute * 60);

  if (endTotalSeconds > startTotalSeconds) {
    totalWorkSecondsPerDay = endTotalSeconds - startTotalSeconds;
  } else {
    // Virada de dia
    totalWorkSecondsPerDay =
      (24 * 3600 - startTotalSeconds) + endTotalSeconds;
  }

  // Intervalo de almoço
  const breakStartSeconds =
    (breakStartHour * 3600) + (breakStartMinute * 60);
  const breakEndSeconds =
    (breakEndHour * 3600) + (breakEndMinute * 60);
  const breakDurationSeconds = breakEndSeconds - breakStartSeconds;

  // Desconta 1h (ou o intervalo definido) do total trabalhado
  totalWorkSecondsPerDay -= breakDurationSeconds;

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
    const d = date.getDay();
    if (!ignoreWeekends) return true;
    return d >= 1 && d <= 5;
  }

  function countWorkDaysBetween(startDate, endDate) {
    const d = new Date(startDate.getTime());
    let count = 0;

    while (d < endDate) {
      if (isWorkDay(d)) count++;
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

  startTimeLabelEl.textContent =
    `${String(startHour).padStart(2, "0")}:${String(startMinute).padStart(2, "0")}`;

  endTimeLabelEl.textContent =
    `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;

  perHourEl.textContent = formatCurrency(valuePerHour);
  perMinuteEl.textContent = formatCurrency(valuePerMinute);
  perSecondEl.textContent = formatCurrency(valuePerSecondDay);

  // =============================
  // LOOP PRINCIPAL
  // =============================

  function updateSalaryMeter() {
    const now = new Date();
    const dayOfWeek = now.getDay();

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

    const startSeconds = startTotalSeconds;
    const endSeconds = endTotalSeconds;

    let earnedToday = 0;
    let progressToday = 0;

    if (currentSeconds <= startSeconds) {
      statusEl.textContent = "Ainda não começou o expediente 🚦";
    } else if (currentSeconds >= endSeconds) {
      earnedToday = dailySalary;
      progressToday = 1;
      statusEl.textContent = "Expediente encerrado ✅";
    } else {
      const elapsed = currentSeconds - startSeconds;

      let workedSeconds;
      if (currentSeconds <= breakStartSeconds) {
        // Antes do almoço: conta normal
        workedSeconds = elapsed;
      } else if (currentSeconds <= breakEndSeconds) {
        // Durante o almoço: trava no que foi trabalhado até o início do intervalo
        workedSeconds = breakStartSeconds - startSeconds;
      } else {
        // Depois do almoço: desconta o intervalo
        workedSeconds = elapsed - breakDurationSeconds;
      }

      earnedToday = workedSeconds * valuePerSecondDay;
      progressToday = workedSeconds / totalWorkSecondsPerDay;

      statusEl.textContent =
        `Trabalho em andamento: ${(progressToday * 100).toFixed(2)}% do dia concluído`;
    }

    earnedTodayEl.textContent = formatCurrency(earnedToday);

    // ----- MÊS -----
    const year = now.getFullYear();
    const month = now.getMonth();
    const today = new Date(year, month, now.getDate());
    const monthStart = new Date(year, month, 1);
    const todayStart = new Date(year, month, now.getDate());

    const completedWorkDaysInMonth =
      countWorkDaysBetween(monthStart, todayStart);

    const totalWorkedSecondsMonth =
      completedWorkDaysInMonth * totalWorkSecondsPerDay +
      progressToday * totalWorkSecondsPerDay;

    const estimatedWorkDaysMonth = workDaysPerMonthConfig;
    const totalWorkSecondsMonth =
      estimatedWorkDaysMonth * totalWorkSecondsPerDay;

    const earnedMonth =
      (totalWorkedSecondsMonth / totalWorkSecondsMonth) *
      (dailySalary * estimatedWorkDaysMonth);

    earnedMonthEl.textContent = formatCurrency(earnedMonth);
    monthCaptionEl.textContent =
      `Aproximado com base em ${estimatedWorkDaysMonth} dias úteis/mês`;

    // ----- ANO -----

    const yearStart =
      yearStartMode === "month"
        ? new Date(year, month, 1)
        : new Date(year, 0, 1);

    const completedWorkDaysInYear =
      countWorkDaysBetween(yearStart, todayStart);

    const estimatedWorkDaysYear =
      yearStartMode === "month"
        ? workDaysPerMonthConfig * (12 - month)
        : workDaysPerMonthConfig * 12;

    const totalWorkedSecondsYear =
      completedWorkDaysInYear * totalWorkSecondsPerDay +
      progressToday * totalWorkSecondsPerDay;

    const totalWorkSecondsYear =
      estimatedWorkDaysYear * totalWorkSecondsPerDay;

    const earnedYear =
      (totalWorkedSecondsYear / totalWorkSecondsYear) *
      (dailySalary * estimatedWorkDaysYear);

    earnedYearEl.textContent = formatCurrency(earnedYear);

    yearCaptionEl.textContent =
      yearStartMode === "month"
        ? "Contando a partir do início deste mês"
        : "Contando a partir de janeiro";
  }

  updateSalaryMeter();
  setInterval(updateSalaryMeter, 1000);

  // =============================
  // TOGGLE DE TEMA (DARK / LIGHT)
  // =============================

  const toggleButton = document.getElementById("toggleTheme");
  const htmlEl = document.documentElement;

  // Carrega tema salvo
  const savedTheme = localStorage.getItem("theme");

  if (savedTheme) {
    htmlEl.setAttribute("data-theme", savedTheme);
    toggleButton.textContent =
      savedTheme === "light" ? "Dark Mode" : "Light Mode";
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
