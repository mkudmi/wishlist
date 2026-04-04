import { useEffect, useState } from "react";
import { normalizeStorageDate, parseDdMmYyyyToStorageDate } from "../lib/helpers";

const MONTHS = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь"
];

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function parsePickerValue(value) {
  const storageDate = normalizeStorageDate(value) || parseDdMmYyyyToStorageDate(value);
  if (!storageDate) {
    return null;
  }

  const [year, month, day] = storageDate.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }

  return { day, month, year };
}

function formatDisplayDate(day, month, year) {
  return `${String(day).padStart(2, "0")}-${String(month).padStart(2, "0")}-${String(year)}`;
}

function formatStorageDate(day, month, year) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function BirthdayPickerModal({
  isOpen,
  value,
  onClose,
  onConfirm,
  kicker = "Дата рождения",
  title = "Выбери день, месяц и год",
  outputFormat = "display",
  defaultYearOffset = 25,
  minYear = 1900,
  maxYear
}) {
  const currentYear = new Date().getFullYear();
  const resolvedMaxYear = maxYear ?? currentYear;
  const defaultYear = resolvedMaxYear - defaultYearOffset;
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [selectedYear, setSelectedYear] = useState(defaultYear);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileStep, setMobileStep] = useState(1);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const syncIsMobile = () => setIsMobile(mediaQuery.matches);
    syncIsMobile();

    mediaQuery.addEventListener("change", syncIsMobile);
    return () => mediaQuery.removeEventListener("change", syncIsMobile);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const parsed = parsePickerValue(value);
    if (parsed) {
      setSelectedDay(parsed.day);
      setSelectedMonth(parsed.month);
      setSelectedYear(parsed.year);
    } else {
      const today = new Date();
      setSelectedDay(today.getDate());
      setSelectedMonth(today.getMonth() + 1);
      setSelectedYear(defaultYear);
    }

    setMobileStep(1);
  }, [defaultYear, isOpen, value]);

  useEffect(() => {
    const maxDay = getDaysInMonth(selectedYear, selectedMonth);
    if (selectedDay > maxDay) {
      setSelectedDay(maxDay);
    }
  }, [selectedDay, selectedMonth, selectedYear]);

  if (!isOpen) {
    return null;
  }

  const years = [];
  for (let year = resolvedMaxYear; year >= minYear; year -= 1) {
    years.push(year);
  }

  const days = [];
  for (let day = 1; day <= getDaysInMonth(selectedYear, selectedMonth); day += 1) {
    days.push(day);
  }

  function handleConfirm() {
    const formatted =
      outputFormat === "storage"
        ? formatStorageDate(selectedDay, selectedMonth, selectedYear)
        : formatDisplayDate(selectedDay, selectedMonth, selectedYear);
    onConfirm(formatted);
  }

  function renderDesktopColumns() {
    return (
      <div className="birthday-picker-columns">
        <label className="birthday-picker-column">
          <span className="birthday-picker-label">День</span>
          <select
            className="birthday-picker-select"
            size={6}
            value={String(selectedDay)}
            onChange={(event) => setSelectedDay(Number(event.target.value))}
          >
            {days.map((day) => (
              <option key={day} value={day}>
                {String(day).padStart(2, "0")}
              </option>
            ))}
          </select>
        </label>

        <label className="birthday-picker-column">
          <span className="birthday-picker-label">Месяц</span>
          <select
            className="birthday-picker-select"
            size={6}
            value={String(selectedMonth)}
            onChange={(event) => setSelectedMonth(Number(event.target.value))}
          >
            {MONTHS.map((month, index) => (
              <option key={month} value={index + 1}>
                {month}
              </option>
            ))}
          </select>
        </label>

        <label className="birthday-picker-column">
          <span className="birthday-picker-label">Год</span>
          <select
            className="birthday-picker-select"
            size={6}
            value={String(selectedYear)}
            onChange={(event) => setSelectedYear(Number(event.target.value))}
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
      </div>
    );
  }

  function renderMobileStep() {
    if (mobileStep === 1) {
      return (
        <label className="birthday-picker-column">
          <span className="birthday-picker-label">День</span>
          <select
            className="birthday-picker-select birthday-picker-select-mobile"
            size={7}
            value={String(selectedDay)}
            onChange={(event) => setSelectedDay(Number(event.target.value))}
          >
            {days.map((day) => (
              <option key={day} value={day}>
                {String(day).padStart(2, "0")}
              </option>
            ))}
          </select>
        </label>
      );
    }

    if (mobileStep === 2) {
      return (
        <label className="birthday-picker-column">
          <span className="birthday-picker-label">Месяц</span>
          <select
            className="birthday-picker-select birthday-picker-select-mobile"
            size={7}
            value={String(selectedMonth)}
            onChange={(event) => setSelectedMonth(Number(event.target.value))}
          >
            {MONTHS.map((month, index) => (
              <option key={month} value={index + 1}>
                {month}
              </option>
            ))}
          </select>
        </label>
      );
    }

    return (
      <label className="birthday-picker-column">
        <span className="birthday-picker-label">Год</span>
        <select
          className="birthday-picker-select birthday-picker-select-mobile"
          size={7}
          value={String(selectedYear)}
          onChange={(event) => setSelectedYear(Number(event.target.value))}
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <div className="birthday-picker-backdrop" onClick={onClose}>
      <div className="birthday-picker-modal" onClick={(event) => event.stopPropagation()}>
        <div className="birthday-picker-head">
          <div>
            <p className="birthday-picker-kicker">{kicker}</p>
            <h3>{title}</h3>
          </div>
        </div>

        {isMobile ? (
          <>
            <div className="birthday-picker-mobile-progress" aria-label={`Шаг ${mobileStep} из 3`}>
              <span className={mobileStep >= 1 ? "is-active" : ""} />
              <span className={mobileStep >= 2 ? "is-active" : ""} />
              <span className={mobileStep >= 3 ? "is-active" : ""} />
            </div>
            <p className="birthday-picker-mobile-label">Шаг {mobileStep} из 3</p>
            {renderMobileStep()}
          </>
        ) : (
          renderDesktopColumns()
        )}

        <p className="birthday-picker-preview">{formatDisplayDate(selectedDay, selectedMonth, selectedYear)}</p>

        <div className={`birthday-picker-actions${isMobile ? " birthday-picker-actions-mobile" : ""}`}>
          <button
            type="button"
            className="button-secondary"
            onClick={isMobile && mobileStep > 1 ? () => setMobileStep((prev) => prev - 1) : onClose}
          >
            {isMobile && mobileStep > 1 ? "Назад" : "Отмена"}
          </button>

          {isMobile && mobileStep < 3 ? (
            <button type="button" className="button-primary" onClick={() => setMobileStep((prev) => prev + 1)}>
              Далее
            </button>
          ) : (
            <button type="button" className="button-primary" onClick={handleConfirm}>
              Выбрать
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
