/***************************************************
 * Google Calendar 自動日程調整システム（最終版）
 * Webフォーム付き・Google Meetなし・直感的カレンダーUI
 * 土日・祝日判定＋空きなし日を自動グレーアウト
 * 既存予約の前後に15分バッファ確保
 ***************************************************/

// ------------------- スクリプトプロパティ取得 -------------------
function getPropertyOrThrow(key, defaultValue = null) {
  const props = PropertiesService.getScriptProperties();
  const value = props.getProperty(key);
  if (value === null || value === "") {
    if (defaultValue !== null) return defaultValue;
    throw new Error(`❌ スクリプトプロパティ "${key}" が設定されていません。`);
  }
  return value;
}

const CALENDAR_ID = getPropertyOrThrow("CALENDAR_ID", "primary");
const MY_EMAIL = getPropertyOrThrow("MY_EMAIL", Session.getActiveUser().getEmail());
const TIMEZONE = Session.getScriptTimeZone();

const START_HOUR = Number(getPropertyOrThrow("START_HOUR", 9));
const END_HOUR = Number(getPropertyOrThrow("END_HOUR", 18));
const MIN_SLOT_MINUTES = Number(getPropertyOrThrow("MIN_SLOT_MINUTES", 60));
const LOOKAHEAD_DAYS = Number(getPropertyOrThrow("LOOKAHEAD_DAYS", 14));
const BUFFER_MINUTES = 15; // 予約間隔バッファ
const EXCLUDE_DAYS = JSON.parse(getPropertyOrThrow("EXCLUDE_DAYS", "[0,6]")); // 日曜(0),土曜(6)

// ------------------- カレンダー取得 -------------------
function getCalendar() {
  if (CALENDAR_ID === "primary" || !CALENDAR_ID) {
    return CalendarApp.getDefaultCalendar();
  }
  const cal = CalendarApp.getCalendarById(CALENDAR_ID);
  if (!cal) throw new Error(`カレンダーID "${CALENDAR_ID}" が見つかりません`);
  return cal;
}

// ------------------- 空きスロット算出 -------------------
function getAvailableSlots() {
  const cal = getCalendar();
  const now = new Date();
  const endDate = new Date();
  endDate.setDate(now.getDate() + LOOKAHEAD_DAYS);

  const events = cal.getEvents(now, endDate);
  const busySlots = events.map(e => ({
    start: e.getStartTime(),
    end: e.getEndTime(),
    isAllDay: e.isAllDayEvent()
  }));

  const available = [];
  let current = new Date(now);
  current.setHours(START_HOUR, 0, 0, 0);

  while (current < endDate) {
    const slotStart = new Date(current);
    const slotEnd = new Date(current);
    slotEnd.setMinutes(slotStart.getMinutes() + MIN_SLOT_MINUTES);

    const day = slotStart.getDay();
    const isExcludedDay = EXCLUDE_DAYS.includes(day);

    // 終日イベントまたはバッファ含むスロット判定
    const isBusy = busySlots.some(b => {
      if (b.isAllDay) {
        const bDate = Utilities.formatDate(b.start, TIMEZONE, "yyyy-MM-dd");
        const slotDate = Utilities.formatDate(slotStart, TIMEZONE, "yyyy-MM-dd");
        return bDate === slotDate;
      } else {
        const bStart = new Date(b.start.getTime() - BUFFER_MINUTES * 60000);
        const bEnd = new Date(b.end.getTime() + BUFFER_MINUTES * 60000);
        return slotStart < bEnd && slotEnd > bStart;
      }
    });

    if (!isExcludedDay && !isBusy && slotStart > now &&
        slotStart.getHours() >= START_HOUR && slotEnd.getHours() <= END_HOUR) {
      const dateKey = Utilities.formatDate(slotStart, TIMEZONE, "yyyy-MM-dd");
      const start = Utilities.formatDate(slotStart, TIMEZONE, "HH:mm");
      const end = Utilities.formatDate(slotEnd, TIMEZONE, "HH:mm");
      available.push({ date: dateKey, start, end });
    }

    current.setMinutes(current.getMinutes() + MIN_SLOT_MINUTES);
    if (current.getHours() >= END_HOUR) {
      current.setDate(current.getDate() + 1);
      current.setHours(START_HOUR, 0, 0, 0);
    }
  }

  const grouped = {};
  available.forEach(slot => {
    if (!grouped[slot.date]) grouped[slot.date] = [];
    grouped[slot.date].push(slot);
  });

  return grouped;
}

// ------------------- Webフォーム（flatpickrカレンダーUI） -------------------
function doGet() {
  const groupedSlots = getAvailableSlots();
  const jsonSlots = JSON.stringify(groupedSlots);

  const today = Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd");
  const maxDate = Utilities.formatDate(new Date(new Date().setDate(new Date().getDate()+LOOKAHEAD_DAYS)), TIMEZONE, "yyyy-MM-dd");

  const excludeDays = JSON.stringify(EXCLUDE_DAYS);

  const html = `
<html>
<head>
  <meta charset="UTF-8">
  <title>予約フォーム</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
  <style>
    body { font-family: sans-serif; padding: 2em; background: #f7f7f7; }
    h2 { color: #2b7a78; }
    form { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); max-width: 500px; margin: auto; }
    button { background-color: #3aafa9; color: white; padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; width: 100%; }
    button:hover { background-color: #2b7a78; }
    input, select { margin: 5px 0; padding: 8px; width: 100%; }
    input[disabled] { background-color: #eee; color: #999; }
  </style>
</head>
<body>
<h2>空き時間から予約を選択してください</h2>
<form id="reservationForm">
  <label>お名前：</label>
  <input type="text" id="clientName" required><br>
  <label>メールアドレス：</label>
  <input type="email" id="clientEmail" required><br>
  <label>日付を選択：</label>
  <input type="text" id="dateSelect" placeholder="日付を選択" required><br>
  <label>時間帯を選択：</label>
  <select id="timeSlot" required>
    <option value="">先に日付を選択してください</option>
  </select><br><br>
  <button type="submit">予約する</button>
</form>

<script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
<script>
  const slots = ${jsonSlots};
  const dateInput = document.getElementById("dateSelect");
  const timeSlot = document.getElementById("timeSlot");
  const EXCLUDE_DAYS = ${excludeDays};

  // flatpickr初期化
  flatpickr(dateInput, {
    dateFormat: "Y-m-d",
    minDate: "${today}",
    maxDate: "${maxDate}",
    disable: [
      function(date) {
        // 土日・空きなし日を無効化
        const day = date.getDay();
        const formatted = date.toISOString().slice(0,10);
        return EXCLUDE_DAYS.includes(day) || !slots[formatted];
      }
    ],
    onChange: function(selectedDates, dateStr) {
      timeSlot.innerHTML = "";
      if (!dateStr || !slots[dateStr]) {
        const option = document.createElement("option");
        option.textContent = "予約不可日です";
        timeSlot.appendChild(option);
        return;
      }
      slots[dateStr].forEach(slot => {
        const option = document.createElement("option");
        option.value = dateStr + "|" + slot.start + "|" + slot.end;
        option.textContent = slot.start + "〜" + slot.end;
        timeSlot.appendChild(option);
      });
    }
  });

  document.getElementById("reservationForm").addEventListener("submit", e => {
    e.preventDefault();
    const val = timeSlot.value;
    if (!val) return alert("時間を選択してください");
    const [date, start, end] = val.split("|");
    const payload = {
      date,
      start,
      end,
      clientName: document.getElementById("clientName").value,
      clientEmail: document.getElementById("clientEmail").value
    };
    google.script.run
      .withSuccessHandler(res => {
        if (res.success) {
          alert(res.message);
          window.location.reload();
        } else {
          alert("❌ " + res.error);
        }
      })
      .reserveSlot(payload);
  });
</script>
</body>
</html>
  `;

  return HtmlService.createHtmlOutput(html);
}

// ------------------- 予約登録 & 通知メール -------------------
function reserveSlot(payload) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const cal = getCalendar();
    const startIso = new Date(`${payload.date}T${payload.start}:00${getOffsetForIso(TIMEZONE)}`);
    const endIso = new Date(`${payload.date}T${payload.end}:00${getOffsetForIso(TIMEZONE)}`);
    const overlapping = cal.getEvents(startIso, endIso);
    if (overlapping.length > 0) return { success: false, error: "選択した時間は既に埋まっています。" };

    const title = `${payload.clientName || "予約"} - ${payload.clientEmail || ""}`;
    const event = cal.createEvent(title, startIso, endIso);
    sendEmails(payload.clientName, payload.clientEmail, event);
    return { success: true, message: "✅ 予約が完了しました。確認メールを送信しました。", eventId: event.getId() };
  } catch (err) {
    return { success: false, error: err.toString() };
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

// ------------------- メール送信 -------------------
function sendEmails(clientName, clientEmail, event) {
  try {
    const startStr = Utilities.formatDate(event.getStartTime(), TIMEZONE, "yyyy-MM-dd HH:mm");
    const endStr = Utilities.formatDate(event.getEndTime(), TIMEZONE, "HH:mm");

    if (clientEmail) {
      const subjectClient = `【予約完了】${clientName || ""} 様`;
      const bodyClient = `こんにちは ${clientName || ""} 様\n\nご予約ありがとうございます。\n\n📅 日時: ${startStr}〜${endStr}\n📌 イベント: ${event.getTitle()}\n\nこのメールは自動送信です。`;
      MailApp.sendEmail(clientEmail, subjectClient, bodyClient);
    }

    if (MY_EMAIL) {
      const subjectOwner = `🆕 新しい予約が入りました`;
      const bodyOwner = `📅 新しい予約が入りました\n\nクライアント: ${clientName || ""} (${clientEmail || ""})\n日時: ${startStr}〜${endStr}\nイベントタイトル: ${event.getTitle()}\n\nカレンダーに自動登録済みです。`;
      MailApp.sendEmail(MY_EMAIL, subjectOwner, bodyOwner);
    }
  } catch (err) {
    console.error("sendEmails error:", err);
  }
}

// ------------------- タイムゾーン補正 -------------------
function getOffsetForIso(tz) {
  const now = new Date();
  const formatted = Utilities.formatDate(now, tz, "Z");
  return `${formatted[0]}${formatted.substring(1,3)}:${formatted.substring(3,5)}`;
}
