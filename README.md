# GAS-google-calendar-auto-reservation

# 📘 Google カレンダー自動予約システム（GAS）

Google Apps Script（GAS）で開発した  
**「空きスケジュールのみ選択できる自動予約フォーム」** です。
Web予約フォーム × カレンダー連携 × バッファ管理 × 自動メール通知

ユーザーが予約すると、自動で Google カレンダーに登録され、管理者・予約者へ即時メール通知を行います。

日程調整の手間をなくし、Googleカレンダーへ確実に予約を登録します。

---

## ✨ 特長（できること）

- 🗓 **Googleカレンダーの予定をリアルタイム取得**
- 🔍 **空き枠だけを自動判定して表示**
- ⛔ **土日を自動的に予約不可に**
- ⏱ **前後15分バッファを自動付与し連続予約防止**
- 📩 **予約者へ自動メール送信**
- 👤 **管理者にも新規予約メール通知**
- 🔒 **LockService による同時予約の競合防止**
- 🎨 **flatpickr による直感的で見やすい UI**

---

## 🖥️ 画面イメージ


![予約フォームUI](予約画面1.png 
)
![カレンダー選択画面](予約画面2.png
)


---

## 🧩 システム概要

### 【予約フロー】
1. ユーザーが予約フォームへアクセス  
2. flatpickr で **空いている日・時間だけ** を選択  
3. GAS が Google カレンダー予定を取得  
4. バッファ（15分）を考慮して空き枠を生成  
5. ユーザー・管理者へ自動メール通知  
6. Google カレンダーにイベント作成  

---

## 🛠 使用技術

| 項目 | 使用技術 |
|------|----------|
| 言語 | Google Apps Script（JavaScript） |
| UI | flatpickr |
| データ | Google Calendar API（標準GAS） |
| メール通知 | Gmail / MailApp |
| 予約排他制御 | LockService |
| デプロイ | GAS Web アプリ |

---

## 📂 プロジェクト構成

/src
├── main.gs      // 本体ロジック（API・空き枠生成・予約処理）
└── README.md    // プロジェクト説明

🧠 実装の工夫ポイント

✔ ① 既存予定＋バッファの重複判定を最適化

前後15分のバッファを付けて、予定が詰まりすぎないよう調整。

const bStart = new Date(ev.start.getTime() - BUFFER_MINUTES * 60000);
const bEnd   = new Date(ev.end.getTime() + BUFFER_MINUTES * 60000);
const isOverlap = slotStart < bEnd && slotEnd > bStart;


→ 重複予約を確実に防止

✔ ② flatpickr の disable で「空き日だけ」選択可能に
disable: [
  function(date) {
    const day = date.getDay();
    const formatted = date.toISOString().slice(0,10);
    return EXCLUDE_DAYS.includes(day) || !slots[formatted];
  }
]


→ 土日・空きがゼロの日は GUI で選択不可

✔ ③ LockService による同時アクセスの競合防止
const lock = LockService.getScriptLock();
lock.waitLock(30000);


→ 同時送信でも 二重予約を完全防止。

📩 メール通知（自動送信）
● ユーザー向け（予約完了メール）

予約日時
入力内容の確認
任意でキャンセル案内も追加可能

● 管理者向け

新規予約通知
氏名・メールアドレス
予約日時

🚀 デプロイ方法（手順）

Google Apps Script プロジェクトを作成
main.gs のコードを貼り付け
スクリプトプロパティを設定
CALENDAR_ID
START_HOUR / END_HOUR
など運用に合わせて変更可能
メニュー → デプロイ → 新しいデプロイ → Webアプリ
発行された URL を予約フォームとして公開

✨ 今後のアップデート案

Google Meet URL の自動発行
LINE 通知・Slack 通知の追加
予約履歴の自動スプレッドシート保存
キャンセル用リンクの自動発行

👩‍💻 開発者

Misako

ノーコード × GAS × Web 自動化

業務効率化ツールの開発が得意

予約管理 / 自動化システムを中心に活動

📄 ライセンス

MIT License
