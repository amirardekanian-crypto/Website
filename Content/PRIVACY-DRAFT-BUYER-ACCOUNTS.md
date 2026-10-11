# Draft: what the privacy notices should say about course and testing-app accounts

**Status (2026-10-11): the English text is PUBLISHED in `privacy.html`** (section 2.10, short-version lines 1 and 2, the retention line
and the erasure-receipt paragraph; last updated 11 October 2026). You decided the legal point below: the buyer decides why the players'
data is collected and you only host it, so the text says the buyer is responsible for having the right to record their players and that
you store it for them. **`privacy-fa.html` shipped too, the same day:** you read the Farsi lines at the end of this file and said "ship as written" (it has line 1 and line 2 changed, one new line 8, and the date 11 October 2026). It answers coach.html audit finding MKT-16 (the notices said nothing about the course app, the testing app, their accounts
or the testing app's players) and is the text the **Erase…** button (stage54) keeps true. Nothing in the notices needs to change for
athletes: the existing promises (delete on request, gone from backups within about three months) are exactly what *Erase completely…* now does.

The published words differ from the draft below in four places: the "Who decides about the players" paragraph (your decision), a sentence
that removing a player in the testing app only hides it (true today; the erasure takes the hidden ones too), one line in the short version
that the players are the buyer's to decide about, and no dash in the lawful-basis line (the notice is waiting for its plain-words pass).

## What is true today (checked against the database, 2026-10-11)

- **Course app (`/tennis/app/`):** an account is a username and a password, made by me. The server stores the username, a
  private note I type about who bought it (since stage53 only I can read it), when the account was made, and whether it
  was revoked. The password is held by the sign-in service as a hash. A first password I generate is also kept in plain text
  until the buyer first signs in with it (or I mark it sent), then the database clears it. The lessons are downloaded to the
  device; **no progress, answers or reading history are sent to the server.**
- **Testing app (`/tennis-testing/app/`):** the same kind of account, plus whatever the buyer enters: **players** (name, birth
  year and month, sex, hand, squad), **notes** on a player and **test results**. They are often children, and the buyer is
  often an academy or a coach, not the player. They are stored in my database. Since stage50 I can read them, only so that
  the weekly backup is complete; I do not look at them, and the app says it does not monitor.
- Both accounts are erased in one step by the dashboard (account, note, and for the testing app every player, note and
  result, including the ones the buyer had "removed", which the app only hides).

## Proposed new section 2.10 (English)

> **2.10 Course and testing-app accounts**
>
> If you buy the Tennis Performance System course or the tennis testing app, I create a sign-in for you: a username and a
> password. I keep the username, the date it was made, whether it is active, and a short private note of my own about who
> bought it, which only I can read. Your password is stored by the sign-in service as a one-way hash; the first password I
> generate for you is also held in my database until you sign in with it, and then it is deleted.
>
> The **course** is downloaded to your device when you sign in. It does not send me your progress.
>
> The **testing app** stores what you enter in it in my database: the players you add (their name, birth year and month,
> sex, handedness and squad), your notes about them and their test results. You are choosing to put that information in,
> and it should only be about people you are allowed to record. It is kept so that you can use the app from any device. I do
> not read it or use it for anything else; it is included in my weekly backup, which I can technically open, and I do not.
> If your players include children, you are responsible for having the right to record their details.
>
> Ask me and I delete your account and everything stored under it, in one step. There is no notice period.
>
> **Lawful basis:** performance of a contract (Article 6(1)(b)): you bought the product and it cannot work without the account.

## Proposed additions elsewhere

- **Short version, item 2:** add "your sign-in for the course or the testing app, and any players you enter in it".
- **Section 4 (Retention):** "Course and testing-app accounts are kept while the account is active and deleted on request:
  the sign-in, my note about it and, for the testing app, every player, note and result you entered. They leave my weekly
  backups within about three months."
- **Section 4 (Retention), one more line (from the independent review):** "When I erase an account, I keep a receipt: the date, the kind of
  record, how many rows were removed and a one-way hash of the username or id. It holds no name, email or contact. It lets me check, if I ever
  restore an old backup, that I do not bring back someone I already erased."
- **Section 3 (What I do not do):** nothing to add.

## The one decision for you (decided 2026-10-11: the buyer decides, you host)

For the testing app's players, are you the **controller** of that data (you decide why it is collected) or a **processor** for
the academy that is the controller? The text above avoids the word by saying the buyer is responsible for having the right to
record people, which is true either way, but a lawyer (or the ICO's controller/processor checklist) should say which it is
before you sell the app to organisations: a processor has to be bound by a written agreement.

## Farsi text for `privacy-fa.html` (PUBLISHED 2026-10-11, exactly as you approved it)

`privacy-fa.html` is a one-page summary, so it gets two changed lines and one new line, not a section. Your voice, colloquial.

**Line 1 (changed):** من امیر اردکانی‌ام و توی بریتانیا، به‌صورتِ شخصی (نه شرکت)، کار می‌کنم. من تصمیم می‌گیرم اطلاعاتِ تو چطور استفاده بشه، به‌جز بازیکن‌هایی که خریدار توی اپِ تست وارد می‌کنه: دربارهٔ اون‌ها خریدار تصمیم می‌گیره و من فقط نگهشون می‌دارم. ایمیلم: amirardekanian@gmail.com

**Line 2 (changed):** اطلاعاتی رو نگه می‌دارم که خودت بهم می‌دی: فرمِ درخواست (با آسیب‌دیدگی‌هایی که می‌نویسی)، تمرین‌ها و تیکِ عادت‌هات توی اپ، اسم و ایمیل و شماره‌ی واتساپت اگه ردیابِ رایگان بخوای، و اگه دوره یا اپِ تست رو بخری، نام‌کاربری‌ت و بازیکن‌هایی که توی اپِ تست وارد می‌کنی.

**New line (after line 7):** اگه دوره‌ی تنیس یا اپِ تست رو بخری، یه نام‌کاربری و رمز برات می‌سازم. نام‌کاربری، تاریخِ ساخت و یه یادداشتِ خصوصیِ خودم رو نگه می‌دارم که فقط خودم می‌بینمش. دوره روی گوشی‌ت دانلود می‌شه و پیشرفتت رو برام نمی‌فرسته. اپِ تست چیزهایی که توش وارد می‌کنی (بازیکن‌ها، یادداشت‌ها، نتیجه‌ها) رو توی پایگاه‌داده‌م نگه می‌داره. نمی‌خونمشون و برای کارِ دیگه‌ای ازشون استفاده نمی‌کنم. این‌که چرا و چطور ثبتشون می‌کنی با خودته، و باید حقِ ثبتِ اطلاعاتِ اون آدم‌ها رو داشته باشی (به‌خصوص بچه‌ها). «حذفِ بازیکن» توی اپ فقط پنهونش می‌کنه؛ بخوای، حسابت و همه‌چیزِ زیرش، حتی پنهون‌شده‌ها، رو یه‌جا پاک می‌کنم. این بخش در متنِ کامل بخشِ ۲٫۱۰ ـه.

The date line becomes «آخرین به‌روزرسانی: ۱۱ اکتبرِ ۲۰۲۶». The only addition to the approved words: *بخشِ ۲٫۱۰* in the last sentence is a link to the English section.
