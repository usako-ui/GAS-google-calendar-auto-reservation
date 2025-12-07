# GAS-google-calendar-auto-reservation

# 📘 Google カレンダー自動予約システム（GAS）

Google Apps Script（GAS）で開発した、  
**「空きスケジュールのみ選択できる自動予約フォーム」** です。

管理側の手間ゼロで、ユーザーが予約すると自動で Google カレンダーに予定が登録されます。

---

## ✨ 特長（できること）

- 🗓 **Googleカレンダーの予定をリアルタイム取得**
- 🔍 **空き枠だけを自動判定して表示**
- ⛔ **土日を自動的に予約不可に**
- ⏱ **前後15分バッファを自動付与し連続予約防止**
- 📩 **予約者へ自動メール送信**
- 👤 **管理者へも新規予約の通知**
- 🔒 **LockService による同時予約の競合防止**
- 🎨 **flatpickr を使用した直感的で見やすい予約カレンダー**

---

## 🖥️ 画面イメージ

 <!-- ![予約フォームUI](<img width="1920" height="720" alt="予約画面1" src="https://github.com/user-attachments/assets/f1d0e44a-af21-48bb-90e6-10bd342fec9c" />
) --> 
<!-- ![カレンダー選択画面](<img width="1920" height="716" alt="予約画面2" src="https://github.com/user-attachments/assets/7a319b12-bef5-4245-a22b-06146b0ff860" />
) -->

---

## 🧩 システム概要

### 【予約フロー】
1. ユーザーがフォームにアクセス  
2. flatpickr カレンダーで **空いている時間だけ** を選択  
3. GAS が Google カレンダーから予定を取得  
4. 前後バッファを考慮して空き枠を生成  
5. 予約完了後にメール通知  
6. Google カレンダーにイベント作成

---

## 🛠 使用技術

| 項目 | 使用技術 |
|------|----------|
| 言語 | Google Apps Script（JavaScript） |
| UI | flatpickr |
| データ | Google Calendar API（標準GASで使用） |
| 通知 | Gmail / MailApp |
| 予約排他制御 | LockService |
| デプロイ | GAS Webアプリとして公開 |

---

## 📂 プロジェクト構成

/src
├── main.gs // 本体ロジック（API, スロット生成, 予約処理）
└── README.md // この説明

---

## 🧠 実装の工夫ポイント

### ✔ ① カレンダーの既存予定＋バッファの重複判定を最適化
15分バッファを前後に付け、ユーザーが選んだ時間が既存予定と重複しないか判定。

```javascript
const bStart = new Date(ev.start.getTime() - BUFFER_MINUTES * 60000);
const bEnd = new Date(ev.end.getTime() + BUFFER_MINUTES * 60000);
const isOverlap = slotStart < bEnd && slotEnd > bStart;
これにより「ギュッと詰め込まれる予約」を防止。

✔ ② flatpickr の disable オプションで空き日だけ選択可能に
javascript
コードをコピーする
disable: [
  function(date) {
    const day = date.getDay();
    const formatted = date.toISOString().slice(0,10);
    return EXCLUDE_DAYS.includes(day) || !slots[formatted];
  }
]
土日・空き枠ゼロの日はカレンダーで選択できない。

✔ ③ LockService による同時予約競合の防止
javascript
コードをコピーする
const lock = LockService.getScriptLock();
lock.waitLock(30000);
複数ユーザーが同時に送信しても、二重予約を防ぐ。

📩 メール通知
ユーザー向け（自動返信メール）
予約日時

入力情報の確認

キャンセル方法（任意で追加可能）

管理者向け
新規予約者情報

予約確定時の通知

🚀 デプロイ方法（簡易版）
GAS プロジェクトを作成

main.gs を貼り付け

スクリプトプロパティを設定（CALENDAR_ID／メール等）

「デプロイ → 新しいデプロイ → Webアプリ」

発行された URL を予約フォームとして利用

✨ 今後のアップデート案
Google Meet URL の自動発行

LINE・Slack通知の追加

予約履歴をスプレッドシートに蓄積

キャンセル用リンク機能


👩‍💻 開発者
Misako

GAS × Web自動化が得意

予約管理・業務効率化システムの制作を中心に活動

📄 ライセンス
MIT License
